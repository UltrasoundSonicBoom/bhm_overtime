import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'

export interface ChunkOptions {
  chunkSize: number
  overlap: number
}

export async function chunkText(text: string, opts: ChunkOptions): Promise<string[]> {
  const trimmed = text.trim()
  if (trimmed.length <= opts.chunkSize) return [trimmed]
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: opts.chunkSize,
    chunkOverlap: opts.overlap,
    separators: ['\n\n', '\n', '。', '.', ' ', ''],
  })
  return splitter.splitText(trimmed)
}

export interface ArticleLike {
  title: string
  content: string
  clauses?: string[]
}

export async function chunkArticle(
  article: ArticleLike,
  threshold = 1200,
): Promise<string[]> {
  const parts: string[] = [article.title]
  if (article.content) parts.push(article.content)
  if (article.clauses?.length) parts.push(article.clauses.join('\n'))
  const combined = parts.filter(Boolean).join('\n')
  return chunkText(combined, { chunkSize: threshold, overlap: 120 })
}
