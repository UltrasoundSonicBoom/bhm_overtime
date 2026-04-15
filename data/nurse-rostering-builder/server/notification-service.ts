import { getDb } from "./db";
import { notifications } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";

export interface NotificationPayload {
  recipientId: number;
  title: string;
  content: string;
  type: "schedule_confirmed" | "off_approved" | "off_rejected" | "swap_approved" | "swap_rejected";
  relatedId?: string;
  channels: ("email" | "sms")[];
}

/**
 * Send notification to a recipient via multiple channels
 */
export async function sendNotification(payload: NotificationPayload) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert notification into database
  await db.insert(notifications).values({
    recipientId: payload.recipientId,
    title: payload.title,
    content: payload.content,
    type: payload.type,
    relatedScheduleId: payload.relatedId ? parseInt(payload.relatedId) : undefined,
    isRead: false,
    createdAt: new Date(),
  });

  // Send via email if requested
  if (payload.channels.includes("email")) {
    await sendEmailNotification(payload);
  }

  // Send via SMS if requested
  if (payload.channels.includes("sms")) {
    await sendSmsNotification(payload);
  }

  return { success: true };
}

/**
 * Send email notification
 */
async function sendEmailNotification(payload: NotificationPayload) {
  try {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`[EMAIL] To: recipient_${payload.recipientId}`);
    console.log(`[EMAIL] Subject: ${payload.title}`);
    console.log(`[EMAIL] Body: ${payload.content}`);
    
    // Placeholder for actual email sending
    return { success: true };
  } catch (error) {
    console.error("Email notification failed:", error);
    return { success: false, error };
  }
}

/**
 * Send SMS notification
 */
async function sendSmsNotification(payload: NotificationPayload) {
  try {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    console.log(`[SMS] To: recipient_${payload.recipientId}`);
    console.log(`[SMS] Message: ${payload.title} - ${payload.content}`);
    
    // Placeholder for actual SMS sending
    return { success: true };
  } catch (error) {
    console.error("SMS notification failed:", error);
    return { success: false, error };
  }
}

/**
 * Get unread notifications for a user
 */
export async function getUnreadNotifications(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), eq(notifications.isRead, false)))
    .orderBy(desc(notifications.createdAt))
    .limit(10);
}

/**
 * Get notification history for a user
 */
export async function getNotificationHistory(
  userId: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .select()
    .from(notifications)
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId));
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.delete(notifications).where(eq(notifications.id, notificationId));
}
