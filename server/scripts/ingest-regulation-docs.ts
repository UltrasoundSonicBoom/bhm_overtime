import 'dotenv/config'
import postgres from 'postgres'
import { readFileSync } from 'node:fs'
import { basename, extname, relative, resolve } from 'node:path'
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

type CliOptions = {
  versionId?: number
  sources: string[]
  write: boolean
  replace: boolean
  maxChars: number
  sampleCount: number
  allowActiveVersionWrite: boolean
}

type VersionRow = {
  id: number
  year: number
  title: string
  status: string
  source_files: string[] | null
}

type ChunkMetadata = {
  source_type: 'pdf' | 'md'
  source_scope?: 'repo' | 'external'
  original_source_path?: string
  article_ref?: string
  article_refs?: string[]
  version_markers?: string[]
  page?: number
  page_start?: number
  page_end?: number
  heading_path?: string[]
  source_title?: string
}

type Section = {
  sourceFile: string
  sectionTitle: string
  content: string
  metadata: ChunkMetadata
}

type Chunk = Section & {
  chunkIndex: number
  tokenCount: number
}

type PdfLine = {
  page: number
  text: string
}

const sql = postgres(process.env.DATABASE_URL!, { prepare: false })
const repoRoot = resolve(import.meta.dirname, '..', '..')
const defaultSources = [
  'data/2026_handbook.pdf',
  'data/hospital_guidelines_2026.md',
]

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = {
    sources: [],
    write: false,
    replace: false,
    maxChars: 1200,
    sampleCount: 5,
    allowActiveVersionWrite: false,
  }

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]

    if (arg === '--write') {
      options.write = true
      continue
    }
    if (arg === '--replace') {
      options.replace = true
      continue
    }
    if (arg === '--allow-active-version-write') {
      options.allowActiveVersionWrite = true
      continue
    }
    if (arg.startsWith('--version-id=')) {
      options.versionId = Number(arg.split('=')[1])
      continue
    }
    if (arg === '--version-id') {
      options.versionId = Number(argv[++index])
      continue
    }
    if (arg.startsWith('--source=')) {
      options.sources.push(arg.split('=')[1])
      continue
    }
    if (arg === '--source') {
      options.sources.push(argv[++index])
      continue
    }
    if (arg.startsWith('--max-chars=')) {
      options.maxChars = Number(arg.split('=')[1])
      continue
    }
    if (arg === '--max-chars') {
      options.maxChars = Number(argv[++index])
      continue
    }
    if (arg.startsWith('--sample-count=')) {
      options.sampleCount = Number(arg.split('=')[1])
      continue
    }
    if (arg === '--sample-count') {
      options.sampleCount = Number(argv[++index])
    }
  }

  if (options.sources.length === 0) {
    options.sources = [...defaultSources]
  }

  return options
}

async function resolveVersion(versionId?: number): Promise<VersionRow> {
  if (versionId) {
    const rows = await sql<VersionRow[]>`
      select id, year, title, status, source_files
      from regulation_versions
      where id = ${versionId}
      limit 1
    `
    if (rows.length === 0) {
      throw new Error(`Version ${versionId} not found`)
    }
    return rows[0]
  }

  const rows = await sql<VersionRow[]>`
    select id, year, title, status, source_files
    from regulation_versions
    where status = 'active'
    order by year desc, id desc
    limit 1
  `

  if (rows.length === 0) {
    throw new Error('No active regulation version found')
  }

  return rows[0]
}

function normalizeWhitespace(value: string): string {
  return value
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4)
}

function extractArticleRefs(text: string): string[] {
  const matches = text.match(/제\s*\d+\s*조(?:의\s*\d+)?/g) || []
  return Array.from(new Set(matches.map((match) => match.replace(/\s+/g, ''))))
}

function extractVersionMarkers(text: string): string[] {
  const matches = text.match(
    /<\d{4}\.\d{2}>|\d{4}\.\d{2}\.\d{2}|\d{4}\.\d{2}|\d{4}년\s*\d{1,2}월(?:\s*\d{1,2}일)?/g,
  ) || []
  return Array.from(new Set(matches))
}

function splitOversizedParagraph(paragraph: string, maxChars: number): string[] {
  const normalized = normalizeWhitespace(paragraph)
  if (normalized.length <= maxChars) {
    return [normalized]
  }

  const lines = normalized
    .split(/\n+/)
    .map((line) => normalizeWhitespace(line))
    .filter(Boolean)

  if (lines.length > 1) {
    const pieces: string[] = []
    let buffer = ''

    for (const line of lines) {
      const nextValue = buffer ? `${buffer}\n${line}` : line
      if (nextValue.length > maxChars && buffer) {
        pieces.push(buffer)
        buffer = line
        continue
      }
      buffer = nextValue
    }

    if (buffer) {
      pieces.push(buffer)
    }

    return pieces.flatMap((piece) => splitOversizedParagraph(piece, maxChars))
  }

  const sentences = normalized
    .split(/(?<=[.!?])\s+|(?<=다\.)\s+|(?<=요\.)\s+/)
    .map((sentence) => normalizeWhitespace(sentence))
    .filter(Boolean)

  if (sentences.length > 1) {
    const pieces: string[] = []
    let buffer = ''

    for (const sentence of sentences) {
      const nextValue = buffer ? `${buffer} ${sentence}` : sentence
      if (nextValue.length > maxChars && buffer) {
        pieces.push(buffer)
        buffer = sentence
        continue
      }
      buffer = nextValue
    }

    if (buffer) {
      pieces.push(buffer)
    }

    return pieces.flatMap((piece) => splitOversizedParagraph(piece, maxChars))
  }

  const pieces: string[] = []
  for (let index = 0; index < normalized.length; index += maxChars) {
    pieces.push(normalized.slice(index, index + maxChars))
  }
  return pieces
}

function splitIntoChunks(section: Section, maxChars: number): Section[] {
  const paragraphs = section.content
    .split(/\n{2,}/)
    .flatMap((part) => splitOversizedParagraph(part, maxChars))
    .map((part) => normalizeWhitespace(part))
    .filter(Boolean)

  const chunks: Section[] = []
  let buffer = ''

  const pushChunk = () => {
    const content = normalizeWhitespace(buffer)
    if (!content) {
      return
    }

    const articleRefs = extractArticleRefs(`${section.sectionTitle}\n${content}`)
    const versionMarkers = extractVersionMarkers(content)
    chunks.push({
      sourceFile: section.sourceFile,
      sectionTitle: section.sectionTitle,
      content,
      metadata: {
        ...section.metadata,
        article_ref: articleRefs[0] || section.metadata.article_ref,
        article_refs: articleRefs,
        version_markers: versionMarkers,
      },
    })
    buffer = ''
  }

  for (const paragraph of paragraphs) {
    const nextValue = buffer ? `${buffer}\n\n${paragraph}` : paragraph
    if (nextValue.length > maxChars && buffer) {
      pushChunk()
      buffer = paragraph
      continue
    }
    buffer = nextValue
  }

  pushChunk()
  return chunks
}

function resolveSourcePath(inputPath: string) {
  const absolutePath = inputPath.startsWith('/')
    ? inputPath
    : resolve(repoRoot, inputPath)

  const isInsideRepo = absolutePath.startsWith(`${repoRoot}/`) || absolutePath === repoRoot
  const sourceFile = isInsideRepo
    ? relative(repoRoot, absolutePath)
    : `external/${basename(absolutePath)}`

  return {
    absolutePath,
    relativePath: sourceFile,
    sourceScope: isInsideRepo ? 'repo' : 'external' as const,
    originalSourcePath: absolutePath,
  }
}

function extractMarkdownSections(
  relativePath: string,
  absolutePath: string,
  sourceScope: 'repo' | 'external',
  originalSourcePath: string,
): Section[] {
  const content = readFileSync(absolutePath, 'utf8')
  const lines = content.split(/\r?\n/)
  const sections: Section[] = []
  const headingPath: string[] = []
  let currentTitle = basename(relativePath)
  let body: string[] = []

  const flush = () => {
    const text = normalizeWhitespace(body.join('\n'))
    if (!text) {
      return
    }
    const articleRefs = extractArticleRefs(`${currentTitle}\n${text}`)
    const versionMarkers = extractVersionMarkers(text)
    sections.push({
      sourceFile: relativePath,
      sectionTitle: currentTitle,
      content: text,
      metadata: {
        source_type: 'md',
        source_scope: sourceScope,
        original_source_path: originalSourcePath,
        heading_path: [...headingPath],
        article_ref: articleRefs[0],
        article_refs: articleRefs,
        version_markers: versionMarkers,
        source_title: basename(relativePath),
      },
    })
    body = []
  }

  for (const line of lines) {
    const heading = line.match(/^(#{1,6})\s+(.+)$/)
    if (heading) {
      flush()
      const level = heading[1].length
      const title = normalizeWhitespace(heading[2])
      headingPath.splice(level - 1)
      headingPath[level - 1] = title
      currentTitle = headingPath.filter(Boolean).join(' > ')
      continue
    }

    if (line.trim()) {
      body.push(line.trim())
    } else if (body.length > 0) {
      body.push('')
    }
  }

  flush()
  return sections
}

async function extractPdfLines(absolutePath: string): Promise<PdfLine[]> {
  const data = new Uint8Array(readFileSync(absolutePath))
  const pdf = await getDocument({ data, useSystemFonts: true }).promise
  const lines: PdfLine[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const items = (content.items as Array<any>)
      .filter((item) => item.str && item.str.trim())
      .map((item) => ({
        text: String(item.str).trim(),
        x: Number(item.transform[4]),
        y: Number(viewport.height - item.transform[5]),
        width: Number(item.width || 0),
      }))
      .sort((left, right) => left.y - right.y || left.x - right.x)

    const rows: Array<Array<typeof items[number]>> = []
    for (const item of items) {
      const currentRow = rows.at(-1)
      if (!currentRow || Math.abs(item.y - currentRow[0].y) > 5) {
        rows.push([item])
        continue
      }
      currentRow.push(item)
    }

    for (const row of rows) {
      row.sort((left, right) => left.x - right.x)
      let text = row[0].text
      let previousEnd = row[0].x + row[0].width

      for (let index = 1; index < row.length; index++) {
        const item = row[index]
        const gap = item.x - previousEnd
        text += gap > 2 ? ` ${item.text}` : item.text
        previousEnd = item.x + item.width
      }

      const normalized = normalizeWhitespace(text)
      if (normalized) {
        lines.push({ page: pageNumber, text: normalized })
      }
    }
  }

  return lines
}

function isPdfHeading(line: string): boolean {
  return /^(제\s*\d+\s*장|제\s*\d+\s*조(?:의\s*\d+)?(?:\([^)]*\))?|부칙|별표|\[[^\]]+\])/.test(line)
}

async function extractPdfSections(
  relativePath: string,
  absolutePath: string,
  sourceScope: 'repo' | 'external',
  originalSourcePath: string,
): Promise<Section[]> {
  const lines = await extractPdfLines(absolutePath)
  const sections: Section[] = []
  let currentTitle = basename(relativePath)
  let currentBody: string[] = []
  let pageStart = lines[0]?.page
  let pageEnd = lines[0]?.page

  const flush = () => {
    const text = normalizeWhitespace(currentBody.join('\n'))
    if (!text) {
      return
    }

    const articleRefs = extractArticleRefs(`${currentTitle}\n${text}`)
    const versionMarkers = extractVersionMarkers(text)
    sections.push({
      sourceFile: relativePath,
      sectionTitle: currentTitle,
      content: text,
      metadata: {
        source_type: 'pdf',
        source_scope: sourceScope,
        original_source_path: originalSourcePath,
        article_ref: articleRefs[0],
        article_refs: articleRefs,
        version_markers: versionMarkers,
        page: pageStart,
        page_start: pageStart,
        page_end: pageEnd,
        source_title: basename(relativePath),
      },
    })
    currentBody = []
  }

  for (const line of lines) {
    const articleWithBody = line.text.match(/^(제\s*\d+\s*조(?:의\s*\d+)?(?:\([^)]*\))?)\s*[:：]\s*(.+)$/)
    if (articleWithBody) {
      flush()
      currentTitle = normalizeWhitespace(articleWithBody[1])
      currentBody = [line.text]
      pageStart = line.page
      pageEnd = line.page
      continue
    }

    if (isPdfHeading(line.text)) {
      flush()
      currentTitle = line.text
      currentBody = []
      pageStart = line.page
      pageEnd = line.page
      continue
    }

    if (currentBody.length === 0) {
      pageStart = line.page
    }
    pageEnd = line.page
    currentBody.push(line.text)
  }

  flush()
  return sections
}

async function collectSections(
  relativePath: string,
  absolutePath: string,
  sourceScope: 'repo' | 'external',
  originalSourcePath: string,
): Promise<Section[]> {
  const extension = extname(absolutePath).toLowerCase()
  if (extension === '.md') {
    return extractMarkdownSections(
      relativePath,
      absolutePath,
      sourceScope,
      originalSourcePath,
    )
  }
  if (extension === '.pdf') {
    return extractPdfSections(
      relativePath,
      absolutePath,
      sourceScope,
      originalSourcePath,
    )
  }
  throw new Error(`Unsupported source type: ${relativePath}`)
}

function buildChunks(sections: Section[], maxChars: number): Chunk[] {
  const chunkSections = sections.flatMap((section) => splitIntoChunks(section, maxChars))
  return chunkSections.map((section, index) => ({
    ...section,
    chunkIndex: index,
    tokenCount: estimateTokenCount(section.content),
  }))
}

async function main() {
  const options = parseArgs(process.argv.slice(2))
  const version = await resolveVersion(options.versionId)

  if (options.write && version.status === 'active' && !options.allowActiveVersionWrite) {
    throw new Error(
      `Version ${version.id} is active. Re-run with --allow-active-version-write if you intentionally want to affect live retrieval.`,
    )
  }

  const sections: Section[] = []
  for (const sourcePath of options.sources) {
    const resolvedSource = resolveSourcePath(sourcePath)
    const parsedSections = await collectSections(
      resolvedSource.relativePath,
      resolvedSource.absolutePath,
      resolvedSource.sourceScope,
      resolvedSource.originalSourcePath,
    )
    sections.push(...parsedSections)
  }

  const chunks = buildChunks(sections, options.maxChars)
  const sourceSummary = chunks.reduce<Record<string, number>>((accumulator, chunk) => {
    accumulator[chunk.sourceFile] = (accumulator[chunk.sourceFile] || 0) + 1
    return accumulator
  }, {})

  console.log(JSON.stringify({
    mode: options.write ? 'write' : 'dry-run',
    version,
    sourceSummary,
    chunkCount: chunks.length,
    sample: chunks.slice(0, options.sampleCount).map((chunk) => ({
      chunkIndex: chunk.chunkIndex,
      sourceFile: chunk.sourceFile,
      sectionTitle: chunk.sectionTitle,
      tokenCount: chunk.tokenCount,
      articleRef: chunk.metadata.article_ref,
      preview: chunk.content.slice(0, 200),
    })),
  }, null, 2))

  if (!options.write) {
    console.log('\nDry run only. Re-run with --write to insert chunks.')
    return
  }

  await sql.begin(async (tx) => {
    if (options.replace) {
      for (const sourceFile of Object.keys(sourceSummary)) {
        await tx`
          delete from regulation_documents
          where version_id = ${version.id}
            and source_file = ${sourceFile}
        `
      }
    }

    for (const chunk of chunks) {
      await tx`
        insert into regulation_documents (
          version_id,
          chunk_index,
          source_file,
          section_title,
          content,
          token_count,
          metadata
        )
        values (
          ${version.id},
          ${chunk.chunkIndex},
          ${chunk.sourceFile},
          ${chunk.sectionTitle},
          ${chunk.content},
          ${chunk.tokenCount},
          ${tx.json(chunk.metadata)}
        )
      `
    }

    const mergedSourceFiles = Array.from(
      new Set([...(version.source_files || []), ...Object.keys(sourceSummary)]),
    )
    await tx`
      update regulation_versions
      set source_files = ${tx.json(mergedSourceFiles)}
      where id = ${version.id}
    `
  })

  console.log(`\nInserted ${chunks.length} chunks into regulation_documents for version ${version.id}.`)
}

main()
  .catch((error) => {
    console.error(error?.stack || error?.message || error)
    process.exitCode = 1
  })
  .finally(async () => {
    await sql.end({ timeout: 1 })
  })
