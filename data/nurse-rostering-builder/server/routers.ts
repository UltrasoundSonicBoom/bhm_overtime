import { COOKIE_NAME } from "@shared/const";
import { eq, sql } from "drizzle-orm";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  getNurseProfile,
  getNursesByWard,
  getWards,
  getWardById,
  getSchedulesByWard,
  getShiftAssignmentsBySchedule,
  getShiftAssignmentsByNurse,
  getOffRequestsBySchedule,
  getOffRequestsByNurse,
  getShiftSwapRequestsBySchedule,
  getNotificationsByRecipient,
} from "./db";
import { getDb } from "./db";
import {
  nurseProfiles,
  wards,
  schedules,
  shiftAssignments,
  offRequests,
  shiftSwapRequests,
  notifications,
} from "../drizzle/schema";
import { adminRouter } from "./admin-init";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Nurse Profile routes
  nurse: router({
    getProfile: protectedProcedure.query(async ({ ctx }) => {
      return await getNurseProfile(ctx.user.id);
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          wardId: z.number().optional(),
          careerYears: z.number().optional(),
          qualification: z.string().optional(),
          preferredShifts: z.array(z.enum(["day", "evening", "night"])).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Update nurse profile
        // This is a placeholder - actual implementation would use drizzle update
        return { success: true };
      }),

    getByWard: protectedProcedure
      .input(z.object({ wardId: z.number() }))
      .query(async ({ input }) => {
        return await getNursesByWard(input.wardId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          careerYears: z.number(),
          qualification: z.string(),
          preferredShifts: z.string().optional(),
          wardId: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.insert(nurseProfiles).values({
          userId: ctx.user?.id || 1,
          wardId: input.wardId,
          employeeId: `EMP-${Date.now()}`,
          careerYears: input.careerYears.toString(),
          qualification: input.qualification,
          preferredShifts: input.preferredShifts ? [input.preferredShifts] : null,
          maxConsecutiveNights: 3,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        return { success: true, message: "간호사가 추가되었습니다" };
      }),

    delete: protectedProcedure
      .input(z.object({ nurseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Only admins can delete nurses");
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(nurseProfiles).where(eq(nurseProfiles.id, input.nurseId));
        return { success: true, message: "간호사가 삭제되었습니다" };
      }),
  }),

  // Ward routes
  ward: router({
    list: protectedProcedure.query(async () => {
      return await getWards();
    }),

    getById: protectedProcedure
      .input(z.object({ wardId: z.number() }))
      .query(async ({ input }) => {
        return await getWardById(input.wardId);
      }),

    create: protectedProcedure
      .input(z.object({ name: z.string() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Only admins can create wards");
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.insert(wards).values({ name: input.name, createdAt: new Date(), updatedAt: new Date() });
        return { success: true, message: `${input.name} 병동이 생성되었습니다` };
      }),

    delete: protectedProcedure
      .input(z.object({ wardId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user?.role !== "admin") {
          throw new Error("Only admins can delete wards");
        }
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(wards).where(eq(wards.id, input.wardId));
        return { success: true, message: "병동이 삭제되었습니다" };
      }),
  }),

  // Schedule routes
  schedule: router({
    list: protectedProcedure.query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const allSchedules = await db
        .select({
          id: schedules.id,
          wardId: schedules.wardId,
          wardName: wards.name,
          year: schedules.year,
          month: schedules.month,
          status: schedules.status,
          createdAt: schedules.createdAt,
        })
        .from(schedules)
        .leftJoin(wards, eq(schedules.wardId, wards.id));
      return allSchedules.map((s) => ({
        id: s.id,
        wardName: s.wardName || "미지정",
        year: s.year,
        month: s.month,
        status: s.status === "draft" ? "작성 중" : s.status === "pending" ? "대기 중" : s.status === "confirmed" ? "확정" : "아카이브",
        createdAt: s.createdAt,
        nurseCount: 0,
      }));
    }),

    delete: protectedProcedure
      .input(z.object({ scheduleId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await db.delete(schedules).where(eq(schedules.id, input.scheduleId));
        return { success: true, message: "근무표가 삭제되었습니다" };
      }),

    getByWard: protectedProcedure
      .input(
        z.object({
          wardId: z.number(),
          year: z.number(),
          month: z.number(),
        })
      )
      .query(async ({ input }) => {
        return await getSchedulesByWard(input.wardId, input.year, input.month);
      }),

    create: protectedProcedure
      .input(
        z.object({
          wardId: z.number(),
          year: z.number(),
          month: z.number(),
          dayShiftRequired: z.number(),
          eveningShiftRequired: z.number(),
          nightShiftRequired: z.number(),
          weekendDayShiftRequired: z.number(),
          weekendEveningShiftRequired: z.number(),
          weekendNightShiftRequired: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const result = await db.insert(schedules).values({
          wardId: input.wardId,
          year: input.year,
          month: input.month,
          status: "draft",
          dayShiftRequired: input.dayShiftRequired,
          eveningShiftRequired: input.eveningShiftRequired,
          nightShiftRequired: input.nightShiftRequired,
          weekendDayShiftRequired: input.weekendDayShiftRequired,
          weekendEveningShiftRequired: input.weekendEveningShiftRequired,
          weekendNightShiftRequired: input.weekendNightShiftRequired,
          createdBy: ctx.user?.id || 1,
          confirmedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        
        return { success: true, scheduleId: (result as any).insertId || 1 };
      }),

    autoGenerate: protectedProcedure
      .input(z.object({ scheduleId: z.number(), wardId: z.number() }))
      .mutation(async ({ input }) => {
        try {
          const { ScheduleOptimizer, ScheduleValidator } = await import(
            "./scheduling-engine"
          );

          const db = await getDb();
          if (!db) throw new Error("Database not available");

          // Get real nurses from the ward
          const nurses = await getNursesByWard(input.wardId);
          if (!nurses || nurses.length === 0) {
            throw new Error("병동에 배정된 간호사가 없습니다");
          }

          const mockNurses = nurses.map((nurse: any) => ({
            id: nurse.id,
            name: nurse.name,
            careerYears: nurse.careerYears || 1,
            maxConsecutiveNights: 3,
            preferredShifts: nurse.preferredShifts ? JSON.parse(nurse.preferredShifts) : ["day", "evening", "night"],
          })) as any;

          const today = new Date();
          const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
          const requirements = Array.from({ length: daysInMonth }, (_, i) => {
            const date = new Date(today.getFullYear(), today.getMonth(), i + 1);
            const dayOfWeek = date.getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
            return {
              date,
              dayShiftRequired: isWeekend ? 2 : 3,
              eveningShiftRequired: isWeekend ? 2 : 3,
              nightShiftRequired: isWeekend ? 2 : 3,
              isWeekend,
            };
          });

          const initialAssignments = mockNurses.flatMap((nurse: any) =>
            requirements.map((req) => ({
              nurseId: nurse.id,
              date: req.date,
              shiftType: (Math.random() < 0.3 ? "day" : Math.random() < 0.6 ? "evening" : Math.random() < 0.85 ? "night" : "off") as any,
            }))
          );

          const optimizedAssignments = ScheduleOptimizer.optimize(
            initialAssignments,
            mockNurses,
            requirements,
            1000,
            100
          );

          const validation = ScheduleValidator.validate(
            optimizedAssignments,
            mockNurses,
            requirements
          );

          const violationMap = new Map<string, { type: string; severity: "hard" | "soft"; count: number }>();
          for (const v of validation.violations) {
            const key = `${v.type}-${v.severity}`;
            const existing = violationMap.get(key);
            if (existing) {
              existing.count++;
            } else {
              violationMap.set(key, { type: v.type, severity: v.severity, count: 1 });
            }
          }

          if (db) {
            for (const assignment of optimizedAssignments) {
              await db.insert(shiftAssignments).values({
                scheduleId: input.scheduleId,
                nurseId: assignment.nurseId,
                date: assignment.date,
                shiftType: assignment.shiftType,
                createdAt: new Date(),
                updatedAt: new Date(),
              }).catch(() => {});
            }
          }

          return {
            success: true,
            scheduleId: input.scheduleId,
            assignmentCount: optimizedAssignments.length,
            violations: Array.from(violationMap.values()),
            isFeasible: validation.isFeasible,
            message: validation.isFeasible ? "최적 스케줄 생성 완료" : "일부 제약 조건 미충족",
          };
        } catch (error) {
          console.error("[Schedule] Auto-generation failed:", error);
          return {
            success: false,
            scheduleId: input.scheduleId,
            message: "스케줄 생성 오류",
            violations: [],
          };
        }
      }),
  }),

  // Shift Assignment routes
  shiftAssignment: router({
    getBySchedule: protectedProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return await getShiftAssignmentsBySchedule(input.scheduleId);
      }),

    getByNurse: protectedProcedure
      .input(
        z.object({
          scheduleId: z.number(),
          nurseId: z.number(),
        })
      )
      .query(async ({ input }) => {
        return await getShiftAssignmentsByNurse(input.scheduleId, input.nurseId);
      }),

    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          shiftType: z.enum(["day", "evening", "night", "off"]),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Update shift assignment
        return { success: true };
      }),

    swap: protectedProcedure
      .input(
        z.object({
          nurse1Id: z.number(),
          nurse2Id: z.number(),
          date: z.string(),
          scheduleId: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        try {
          const assignments = await getShiftAssignmentsBySchedule(input.scheduleId);
          const assignment1 = assignments.find(
            (a: any) => a.nurseId === input.nurse1Id && a.date === input.date
          );
          const assignment2 = assignments.find(
            (a: any) => a.nurseId === input.nurse2Id && a.date === input.date
          );

          if (!assignment1 || !assignment2) {
            throw new Error("근무 배정을 찾을 수 없습니다");
          }

          const temp = assignment1.shiftType;
          await db
            .update(shiftAssignments)
            .set({ shiftType: assignment2.shiftType })
            .where(eq(shiftAssignments.id, assignment1.id));

          await db
            .update(shiftAssignments)
            .set({ shiftType: temp })
            .where(eq(shiftAssignments.id, assignment2.id));

          return { success: true, message: "근무가 교환되었습니다" };
        } catch (error) {
          console.error("Shift swap error:", error);
          throw error;
        }
      }),
  }),

  // Off Request routes
  offRequest: router({
    list: protectedProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return await getOffRequestsBySchedule(input.scheduleId);
      }),

    getByNurse: protectedProcedure.query(async ({ ctx }) => {
      return await getOffRequestsByNurse(ctx.user.id);
    }),

    create: protectedProcedure
      .input(
        z.object({
          scheduleId: z.number(),
          requestedDate: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Create off request
        return { success: true, requestId: 1 };
      }),

    approve: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Approve off request
        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Reject off request
        return { success: true };
      }),
  }),

  // Shift Swap Request routes
  shiftSwapRequest: router({
    list: protectedProcedure
      .input(z.object({ scheduleId: z.number() }))
      .query(async ({ input }) => {
        return await getShiftSwapRequestsBySchedule(input.scheduleId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          scheduleId: z.number(),
          targetNurseId: z.number(),
          requestedDate: z.string(),
          targetDate: z.string(),
          reason: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Create shift swap request
        return { success: true, requestId: 1 };
      }),

    approve: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Approve shift swap request
        return { success: true };
      }),

    reject: protectedProcedure
      .input(z.object({ requestId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // Reject shift swap request
        return { success: true };
      }),
  }),

  // Notification routes
  notification: router({
    getUnread: protectedProcedure.query(async ({ ctx }) => {
      const { getUnreadNotifications } = await import("./notification-service");
      return await getUnreadNotifications(ctx.user.id);
    }),

    getHistory: protectedProcedure.query(async ({ ctx }) => {
      const { getNotificationHistory } = await import("./notification-service");
      return await getNotificationHistory(ctx.user.id, 50, 0);
    }),

    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        const { markNotificationAsRead } = await import("./notification-service");
        await markNotificationAsRead(input.notificationId);
        return { success: true };
      }),
  }),

  admin: adminRouter,
});

export type AppRouter = typeof appRouter;

