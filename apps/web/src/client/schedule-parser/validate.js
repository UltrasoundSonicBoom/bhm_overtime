// validate.js — Zod schema (백엔드 Pydantic의 1:1 미러).
// 모든 파서의 출력은 이 스키마 통과 후 schedule-tab.js로 전달.

import { z } from 'zod';

export const DutyCodeSchema = z.enum(['D', 'E', 'N', 'O', 'OFF', 'AL', 'RD', '9A', '']);

export const ScheduleRowSchema = z.object({
  name: z.string().min(1).max(20),
  days: z.record(z.string(), DutyCodeSchema),
});

export const DutyGridSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/).nullable().optional(),
  dept: z.string().nullable().optional(),
  rows: z.array(ScheduleRowSchema),
  confidence: z.number().min(0).max(1),
  notes: z.string().default(''),
  parser_version: z.string().default('v1.0'),
  source: z.string().default(''),
});

/**
 * 파서 출력 검증 + 정규화.
 * 실패 시 throw — 호출자는 try/catch로 사용자에게 에러 표시.
 * @param {unknown} raw
 * @returns {DutyGrid}
 */
export function validateDutyGrid(raw) {
  return DutyGridSchema.parse(raw);
}

/**
 * 안전 검증 — 실패 시 null 반환 + 콘솔 경고.
 * @param {unknown} raw
 * @returns {DutyGrid | null}
 */
export function safeValidateDutyGrid(raw) {
  const result = DutyGridSchema.safeParse(raw);
  if (!result.success) {
    console.warn('[validate] DutyGrid 검증 실패', result.error?.issues);
    return null;
  }
  return result.data;
}

/**
 * 정확도 등급 판정.
 * @param {number} confidence
 * @returns {'auto' | 'review-required' | 'manual-fallback'}
 */
export function accuracyTier(confidence) {
  if (confidence >= 0.9) return 'auto';
  if (confidence >= 0.7) return 'review-required';
  return 'manual-fallback';
}
