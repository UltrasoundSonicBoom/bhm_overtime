import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, date, decimal, boolean, json } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// 간호사 프로필 테이블
export const nurseProfiles = mysqlTable("nurse_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  wardId: int("ward_id"),
  employeeId: varchar("employee_id", { length: 50 }).notNull().unique(),
  careerYears: decimal("career_years", { precision: 3, scale: 1 }),
  qualification: varchar("qualification", { length: 100 }),
  preferredShifts: json("preferred_shifts"), // ["day", "evening", "night"]
  maxConsecutiveNights: int("max_consecutive_nights").default(3),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NurseProfile = typeof nurseProfiles.$inferSelect;
export type InsertNurseProfile = typeof nurseProfiles.$inferInsert;

// 간호사 테이블
export const nurses = mysqlTable("nurses", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  wardId: int("ward_id").notNull(),
  careerYears: int("career_years").default(0),
  position: varchar("position", { length: 50 }).default("간호사"),
  email: varchar("email", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  preferredShifts: json("preferred_shifts"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Nurse = typeof nurses.$inferSelect;
export type InsertNurse = typeof nurses.$inferInsert;

// 병동 관리 테이블
export const wards = mysqlTable("wards", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  totalNurses: int("total_nurses"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ward = typeof wards.$inferSelect;
export type InsertWard = typeof wards.$inferInsert;

// 근무표 마스터 테이블
export const schedules = mysqlTable("schedules", {
  id: int("id").autoincrement().primaryKey(),
  wardId: int("ward_id").notNull(),
  year: int("year").notNull(),
  month: int("month").notNull(),
  status: mysqlEnum("status", ["draft", "pending", "confirmed", "archived"]).default("draft").notNull(),
  dayShiftRequired: int("day_shift_required").notNull(),
  eveningShiftRequired: int("evening_shift_required").notNull(),
  nightShiftRequired: int("night_shift_required").notNull(),
  weekendDayShiftRequired: int("weekend_day_shift_required").notNull(),
  weekendEveningShiftRequired: int("weekend_evening_shift_required").notNull(),
  weekendNightShiftRequired: int("weekend_night_shift_required").notNull(),
  createdBy: int("created_by").notNull(),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Schedule = typeof schedules.$inferSelect;
export type InsertSchedule = typeof schedules.$inferInsert;

// 근무 배정 상세 테이블
export const shiftAssignments = mysqlTable("shift_assignments", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id").notNull(),
  nurseId: int("nurse_id").notNull(),
  date: date("date").notNull(),
  shiftType: mysqlEnum("shift_type", ["day", "evening", "night", "off"]).notNull(),
  isWeekend: boolean("is_weekend").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftAssignment = typeof shiftAssignments.$inferSelect;
export type InsertShiftAssignment = typeof shiftAssignments.$inferInsert;

// 오프 신청 테이블
export const offRequests = mysqlTable("off_requests", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id").notNull(),
  nurseId: int("nurse_id").notNull(),
  requestedDate: date("requested_date").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OffRequest = typeof offRequests.$inferSelect;
export type InsertOffRequest = typeof offRequests.$inferInsert;

// 근무 교환 요청 테이블
export const shiftSwapRequests = mysqlTable("shift_swap_requests", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id").notNull(),
  requestingNurseId: int("requesting_nurse_id").notNull(),
  targetNurseId: int("target_nurse_id").notNull(),
  requestedDate: date("requested_date").notNull(),
  targetDate: date("target_date").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftSwapRequest = typeof shiftSwapRequests.$inferSelect;
export type InsertShiftSwapRequest = typeof shiftSwapRequests.$inferInsert;

// 알림 로그 테이블
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  recipientId: int("recipient_id").notNull(),
  type: mysqlEnum("type", ["schedule_confirmed", "off_approved", "off_rejected", "swap_approved", "swap_rejected"]).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  content: text("content").notNull(),
  relatedScheduleId: int("related_schedule_id"),
  relatedRequestId: int("related_request_id"),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// 근무 불가능 날짜 테이블
export const nurseUnavailableDates = mysqlTable("nurse_unavailable_dates", {
  id: int("id").autoincrement().primaryKey(),
  nurseId: int("nurse_id").notNull(),
  scheduleId: int("schedule_id").notNull(),
  date: date("date").notNull(),
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NurseUnavailableDate = typeof nurseUnavailableDates.$inferSelect;
export type InsertNurseUnavailableDate = typeof nurseUnavailableDates.$inferInsert;

// 근무표 개인 컨펌 테이블
export const scheduleConfirmations = mysqlTable("schedule_confirmations", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id").notNull(),
  nurseId: int("nurse_id").notNull(),
  status: mysqlEnum("status", ["pending", "confirmed", "auto_confirmed"]).default("pending").notNull(),
  confirmedAt: timestamp("confirmed_at"),
  confirmDeadline: timestamp("confirm_deadline"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleConfirmation = typeof scheduleConfirmations.$inferSelect;
export type InsertScheduleConfirmation = typeof scheduleConfirmations.$inferInsert;

// 근무 교환 로그 테이블
export const shiftSwapLogs = mysqlTable("shift_swap_logs", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id").notNull(),
  requestingNurseId: int("requesting_nurse_id").notNull(),
  targetNurseId: int("target_nurse_id").notNull(),
  requestedDate: date("requested_date").notNull(),
  targetDate: date("target_date").notNull(),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  approvedBy: int("approved_by"),
  approvedAt: timestamp("approved_at"),
  notificationSent: boolean("notification_sent").default(false),
  notificationMethod: mysqlEnum("notification_method", ["email", "sms", "both"]),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ShiftSwapLog = typeof shiftSwapLogs.$inferSelect;
export type InsertShiftSwapLog = typeof shiftSwapLogs.$inferInsert;

// 근무표 배포 이력 테이블
export const scheduleDeployments = mysqlTable("schedule_deployments", {
  id: int("id").autoincrement().primaryKey(),
  scheduleId: int("schedule_id").notNull(),
  deployedBy: int("deployed_by").notNull(),
  status: mysqlEnum("status", ["draft", "pending_confirmation", "confirmed", "deployed", "archived"]).default("draft").notNull(),
  totalNurses: int("total_nurses"),
  confirmedNurses: int("confirmed_nurses").default(0),
  autoConfirmedNurses: int("auto_confirmed_nurses").default(0),
  deployedAt: timestamp("deployed_at"),
  deployDeadline: timestamp("deploy_deadline"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ScheduleDeployment = typeof scheduleDeployments.$inferSelect;
export type InsertScheduleDeployment = typeof scheduleDeployments.$inferInsert;
