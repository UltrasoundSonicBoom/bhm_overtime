import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeKeywords,
  parseGoogleNewsRss,
  rebuildAbstractText,
} from '../src/services/cardNews'

test('normalizeKeywords splits comma-separated input and removes duplicates', () => {
  const result = normalizeKeywords([
    '퇴직금, 삼성전자 주식',
    '서울대병원',
    '퇴직금',
  ])

  assert.deepEqual(result, ['퇴직금', '삼성전자 주식', '서울대병원'])
})

test('parseGoogleNewsRss extracts title, source, link, and date from rss items', () => {
  const rss = `<?xml version="1.0" encoding="UTF-8"?>
  <rss version="2.0">
    <channel>
      <item>
        <title>의료 AI가 커지는 이유 - 예시신문</title>
        <link>https://news.google.com/rss/articles/example-1</link>
        <pubDate>Sun, 12 Apr 2026 10:36:36 GMT</pubDate>
        <description><![CDATA[<a href="https://news.google.com/rss/articles/example-1">의료 AI가 커지는 이유</a> <font color="#6f6f6f">예시신문</font>]]></description>
        <source url="https://example.com">예시신문</source>
      </item>
    </channel>
  </rss>`

  const [item] = parseGoogleNewsRss(rss, 'demo-news')

  assert.equal(item.id, 'demo-news-1')
  assert.equal(item.title, '의료 AI가 커지는 이유')
  assert.equal(item.source, '예시신문')
  assert.equal(item.url, 'https://news.google.com/rss/articles/example-1')
  assert.equal(item.publishedAt, '2026-04-12T10:36:36.000Z')
  assert.match(item.summary, /의료 AI가 커지는 이유/)
})

test('rebuildAbstractText restores an abstract from OpenAlex inverted index order', () => {
  const text = rebuildAbstractText({
    Medical: [0],
    AI: [1],
    improves: [2],
    triage: [3],
  })

  assert.equal(text, 'Medical AI improves triage')
})
