#!/usr/bin/env node
// 기존 union_regulation_2026.json (array of 68 items) 을 새 스키마로 변환.
// Array → { meta, articles[], side_agreements[], appendix[], computation_refs }
// 기존 데이터는 100% 보존. 새 필드만 추가.

import { readFile, writeFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = resolve(ROOT, 'data/union_regulation_2026.json')

const raw = JSON.parse(await readFile(SRC, 'utf-8'))

if (!Array.isArray(raw)) {
  console.error('Already restructured or unexpected format. Aborting.')
  process.exit(0)
}

const articles = []
const side_agreements = []
const appendix = []

for (const item of raw) {
  if (item.id.startsWith('art_')) articles.push(item)
  else if (item.id.startsWith('agreement_')) side_agreements.push(item)
  else if (item.id.startsWith('app_')) appendix.push(item)
  else articles.push(item) // fallback
}

// 주요 계산 상수 — data.js 와 연동하기 위한 refs.
// 각 ref 는 { value, source_article, clause?, note? } 구조.
const computation_refs = {
  'annual_leave.base_days': {
    value: 15,
    source_article: 'art_36',
    clause: 1,
    note: '1년간 8할 이상 출근 시 15일의 연차유급휴가',
  },
  'annual_leave.add_per_2years': {
    value: 1,
    source_article: 'art_36',
    clause: 1,
    note: '2년마다 1일 가산',
  },
  'annual_leave.max_days': {
    value: 25,
    source_article: 'art_36',
    clause: 1,
    note: '휴가일수 한도 25일',
  },
  'overtime.rate_multiplier': {
    value: 1.5,
    source_article: 'art_47',
    note: '연장/야간/휴일근로수당 = 통상임금 × 1.5',
  },
  'overtime.night_start_hour': {
    value: 22,
    source_article: 'art_47',
    note: '야간근무수당 적용 시작 시각',
  },
  'overtime.night_end_hour': {
    value: 6,
    source_article: 'art_47',
    note: '야간근무수당 적용 종료 시각',
  },
  'overtime.night_bonus_won': {
    value: 10000,
    source_article: 'art_47',
    note: '야간근무가산금 1회당 10,000원 (교대근무자)',
  },
  'ordinary_wage.hours_per_month': {
    value: 209,
    source_article: 'art_47',
    note: '시급 계산: 통상임금 × 1/209',
  },
  'work_hours.daily': {
    value: 8,
    source_article: 'art_32',
    note: '기준근로시간 1일 8시간',
  },
  'work_hours.weekly': {
    value: 40,
    source_article: 'art_32',
    note: '기준근로시간 1주 40시간',
  },
  'meal_subsidy.monthly_won': {
    value: 150000,
    source_article: 'art_58',
    note: '급식보조비 월 150,000원 (2019.12.1 이후)',
  },
  'transport_subsidy.monthly_won': {
    value: 150000,
    source_article: 'art_58',
    note: '교통보조비 월 150,000원',
  },
  'family_support.base_points_manwon': {
    value: 50,
    source_article: 'art_58',
    clause: '1-1',
    note: '맞춤형 복지 기본 포인트 50만원 (2025년 기준)',
  },
  'family_support.seniority_max_manwon': {
    value: 30,
    source_article: 'art_58',
    clause: '1-1',
    note: '근속 포인트 최대 30만원 (1년당 1만원)',
  },
  'family_allowance.spouse_won': {
    value: 40000,
    source_article: 'art_49',
    note: '가족수당 배우자 40,000원',
  },
  'family_allowance.dependent_won': {
    value: 20000,
    source_article: 'art_49',
    note: '가족수당 기타 가족 20,000원',
  },
  'family_allowance.third_child_extra_won': {
    value: 30000,
    source_article: 'art_49',
    note: '셋째자녀부터 월 30,000원 추가',
  },
  'health_checkup.annual_frequency': {
    value: 1,
    source_article: 'art_65',
    clause: 1,
    note: '전 직원 연 1회 이상 정기 건강진단',
  },
  'ceremony_leave.self_marriage_days': {
    value: 5,
    source_article: 'art_41',
    clause: 1,
    note: '본인결혼 청원유급휴가 5일',
  },
  'ceremony_leave.spouse_birth_days': {
    value: 10,
    source_article: 'art_41',
    clause: 3,
    note: '배우자 출산 청원유급휴가 10일',
  },
  'ceremony_leave.parent_death_days': {
    value: 5,
    source_article: 'art_41',
    clause: 4,
    note: '본인/배우자 부모 사망 5일',
  },
  'childcare_leave.max_years': {
    value: 3,
    source_article: 'art_28',
    clause: 5,
    note: '육아휴직 최대 3년 (만 8세 이하 또는 초2 이하 자녀)',
  },
  'childcare_leave.accrual_first_year': {
    value: true,
    source_article: 'art_28',
    clause: 5,
    note: '최초 1년 근속연수 산입',
  },
  'retirement_age': {
    value: 60,
    source_article: 'art_24',
    note: '정년 만 60세 (12월 말일 퇴직)',
  },
  'refresh_allowance.annual_won': {
    value: 360000,
    source_article: 'art_58',
    note: '리프레시지원비 연 36만원 (2026.01.01 부터, 본인 건강관리/능력개발)',
  },
}

const output = {
  meta: {
    version: '2026.1.0',
    effective_date: '2026-01-01',
    last_updated: new Date().toISOString().slice(0, 10),
    source_files: [
      'data/2026_handbook.pdf',
      'data/2026_nojo.md',
      'data/2026_nojo_clean.md',
    ],
    total_counts: {
      articles: articles.length,
      side_agreements: side_agreements.length,
      appendix: appendix.length,
      computation_refs: Object.keys(computation_refs).length,
    },
  },
  articles,
  side_agreements,
  appendix,
  computation_refs,
}

await writeFile(SRC, JSON.stringify(output, null, 2) + '\n', 'utf-8')
console.log('Restructured:', SRC)
console.log('  articles:', articles.length)
console.log('  side_agreements:', side_agreements.length)
console.log('  appendix:', appendix.length)
console.log('  computation_refs:', Object.keys(computation_refs).length)
