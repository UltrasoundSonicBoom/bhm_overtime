import { publicProcedure, router } from "./_core/trpc";
import { getDb } from "./db";
import { wards, schedules, shiftAssignments, offRequests, shiftSwapRequests } from "../drizzle/schema";

export const adminRouter = router({
  initializeDatabase: publicProcedure.mutation(async ({ ctx }) => {

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const { nurses: nursesTable } = await import("../drizzle/schema");

      try {
        // Clear existing data - skip if tables don't exist yet
        try { await db.delete(shiftAssignments); } catch (e) {}
        try { await db.delete(offRequests); } catch (e) {}
        try { await db.delete(shiftSwapRequests); } catch (e) {}
        try { await db.delete(schedules); } catch (e) {}
        try { await db.delete(nursesTable); } catch (e) {}
        try { await db.delete(wards); } catch (e) {}

      // Insert wards
      const wardData = [
        { id: 101, name: "101 병동 (내과)" },
        { id: 102, name: "102 병동 (외과)" },
        { id: 103, name: "103 병동 (정형외과)" },
      ];

      for (const ward of wardData) {
        await db.insert(wards).values({
          id: ward.id,
          name: ward.name,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Insert nurses
      const nurseNames = [
        "김영희", "이순신", "박민준", "정수현", "최민지",
        "홍길동", "이순애", "박지은", "정민철", "최준호"
      ];

      let nurseId = 1;
      for (const ward of wardData) {
        for (let i = 0; i < 10; i++) {
          await db.insert(nursesTable).values({
            id: nurseId,
            name: nurseNames[i],
            wardId: ward.id,
            careerYears: i + 1,
            position: i === 0 ? "수간호사" : "간호사",
            email: `nurse${nurseId}@hospital.com`,
            phone: `010-${1000 + nurseId}-${2000 + nurseId}`,
            preferredShifts: "day",
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          nurseId++;
        }
      }

      // Insert schedules
      let scheduleId = 1;
      for (const ward of wardData) {
        await db.insert(schedules).values({
          id: scheduleId,
          wardId: ward.id,
          year: 2026,
          month: 4,
          status: "draft",
          dayShiftRequired: 8,
          eveningShiftRequired: 8,
          nightShiftRequired: 8,
          weekendDayShiftRequired: 4,
          weekendEveningShiftRequired: 4,
          weekendNightShiftRequired: 4,
            createdBy: ctx.user?.id || 1,
          confirmedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        scheduleId++;
      }

      return {
        success: true,
        message: "Database initialized successfully",
        summary: {
          wards: wardData.length,
          nurses: nurseId - 1,
          schedules: scheduleId - 1,
        },
      };
    } catch (error) {
      console.error("Database initialization error:", error);
      throw new Error(`Database initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }),
});
