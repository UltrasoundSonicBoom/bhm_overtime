import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  nurseProfiles,
  wards,
  schedules,
  shiftAssignments,
  offRequests,
  shiftSwapRequests,
  notifications,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Nurse Profile queries
export async function getNurseProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(nurseProfiles)
    .where(eq(nurseProfiles.userId, userId))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getNursesByWard(wardId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(nurseProfiles).where(eq(nurseProfiles.wardId, wardId));
}

// Ward queries
export async function getWards() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(wards);
}

export async function getWardById(wardId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(wards).where(eq(wards.id, wardId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Schedule queries
export async function getSchedulesByWard(wardId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(schedules)
    .where(
      and(
        eq(schedules.wardId, wardId),
        eq(schedules.year, year),
        eq(schedules.month, month)
      )
    );
}

// Shift Assignment queries
export async function getShiftAssignmentsBySchedule(scheduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(shiftAssignments).where(eq(shiftAssignments.scheduleId, scheduleId));
}

export async function getShiftAssignmentsByNurse(scheduleId: number, nurseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(shiftAssignments)
    .where(
      and(
        eq(shiftAssignments.scheduleId, scheduleId),
        eq(shiftAssignments.nurseId, nurseId)
      )
    );
}

// Off Request queries
export async function getOffRequestsBySchedule(scheduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(offRequests).where(eq(offRequests.scheduleId, scheduleId));
}

export async function getOffRequestsByNurse(nurseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(offRequests).where(eq(offRequests.nurseId, nurseId));
}

// Shift Swap Request queries
export async function getShiftSwapRequestsBySchedule(scheduleId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(shiftSwapRequests).where(eq(shiftSwapRequests.scheduleId, scheduleId));
}

// Notification queries
export async function getNotificationsByRecipient(recipientId: number, limit: number = 20) {
  const db = await getDb();
  if (!db) return [];
  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, recipientId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function createWard(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(wards).values({
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  
  return result;
}

export async function addNurseToWard(nurseId: number, wardId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(nurseProfiles)
    .set({ wardId, updatedAt: new Date() })
    .where(eq(nurseProfiles.id, nurseId));
  
  return { success: true };
}
