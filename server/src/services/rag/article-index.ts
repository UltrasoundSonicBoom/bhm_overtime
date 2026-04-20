// 서버 기동 시 union_regulation_2026.json 을 메모리에 로드해서
// doc_id(청크 id 의 base) → 원문 구조 lookup 맵을 제공한다.
// RAG 응답의 sources 에 원문(content/clauses/tables/related_agreements)을 붙여
// 프론트가 인라인 확장 패널로 렌더할 수 있도록 한다.

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export interface RegulationTable {
  title?: string
  headers: string[]
  rows: string[][]
}

export interface RegulationHistory {
  date?: string
  type?: string
  note?: string
}

export interface RegulationRelatedAgreement {
  date: string
  title: string
  content: string
}

export interface RegulationArticle {
  id: string
  chapter: string
  title: string
  content: string
  clauses: string[]
  tables: RegulationTable[]
  history: RegulationHistory[]
  related_agreements: RegulationRelatedAgreement[]
}

interface RegulationJson {
  articles: RegulationArticle[]
  side_agreements: RegulationArticle[]
  appendix: RegulationArticle[]
  computation_refs: Record<string, unknown>
}

let byId: Map<string, RegulationArticle> | null = null
let loadPromise: Promise<void> | null = null

async function loadOnce(): Promise<void> {
  if (byId) return
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const path = resolve(process.cwd(), '..', 'data', 'union_regulation_2026.json')
    // fallback: if cwd is project root
    const altPath = resolve(process.cwd(), 'data', 'union_regulation_2026.json')
    let raw: string
    try {
      raw = await readFile(path, 'utf-8')
    } catch {
      raw = await readFile(altPath, 'utf-8')
    }
    const reg: RegulationJson = JSON.parse(raw)
    const map = new Map<string, RegulationArticle>()
    for (const a of reg.articles ?? []) {
      map.set(a.id, normalize(a))
    }
    for (const a of reg.side_agreements ?? []) {
      map.set(a.id, normalize(a))
    }
    for (const a of reg.appendix ?? []) {
      map.set(a.id, normalize(a))
    }
    byId = map
    console.log(`[article-index] Loaded ${map.size} items from JSON`)
  })()
  return loadPromise
}

function normalize(a: Partial<RegulationArticle> & { id: string }): RegulationArticle {
  return {
    id: a.id,
    chapter: a.chapter ?? '',
    title: a.title ?? '',
    content: a.content ?? '',
    clauses: a.clauses ?? [],
    tables: a.tables ?? [],
    history: a.history ?? [],
    related_agreements: a.related_agreements ?? [],
  }
}

// doc_id 에서 base article id 추출.
// 예:
//   art_36 → art_36
//   art_36__p1 → art_36 (긴 조항 분할 청크)
//   agreement_medical_public__ra2 → agreement_medical_public
//   app_wage__2025_ilban__r3 → app_wage
//   app_wage__2025_ilban__header → app_wage
//   computation_refs__p0 → (null, 계산 상수는 원문 구조 없음)
export function docIdToArticleId(docId: string | null): string | null {
  if (!docId) return null
  if (docId.startsWith('computation_refs')) return null
  // Split on double underscore, keep first segment(s) until known prefix
  const parts = docId.split('__')
  return parts[0]
}

export async function getArticleById(id: string): Promise<RegulationArticle | null> {
  await loadOnce()
  return byId?.get(id) ?? null
}

export async function getArticleByDocId(docId: string | null): Promise<RegulationArticle | null> {
  const id = docIdToArticleId(docId)
  if (!id) return null
  return getArticleById(id)
}
