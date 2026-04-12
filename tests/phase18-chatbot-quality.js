/**
 * Phase 18: A4 Chatbot Answer Quality Verification
 *
 * Validates that the chatbot quality evaluation pipeline exists
 * with question sets, classification, and citation tracking.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let pass = 0;
let fail = 0;

function assert(condition, label) {
  if (condition) {
    pass++;
    console.log(`  PASS: ${label}`);
  } else {
    fail++;
    console.log(`  FAIL: ${label}`);
  }
}

// ── Test 1: Quality verification script ──
console.log('\n=== Phase 18.1: Quality verification script ===');
const verifyPath = path.join(ROOT, 'server/scripts/verify-rag-quality.ts');
assert(fs.existsSync(verifyPath), 'verify-rag-quality.ts exists');

const verifyContent = fs.existsSync(verifyPath)
  ? fs.readFileSync(verifyPath, 'utf8')
  : '';

// ── Test 2: Representative question set ──
console.log('\n=== Phase 18.2: Question set ===');
assert(
  verifyContent.includes('evaluationQuestions') || verifyContent.includes('questions'),
  'Has evaluation question set defined'
);
// Check for diverse question types
assert(verifyContent.includes('온콜'), 'Questions cover 온콜 (on-call)');
assert(verifyContent.includes('휴가') || verifyContent.includes('출산'), 'Questions cover leave/maternity');
assert(verifyContent.includes('연차'), 'Questions cover 연차 (annual leave)');
assert(verifyContent.includes('가산') || verifyContent.includes('공휴일'), 'Questions cover overtime/holiday premium');

// Count questions (rough check)
const questionMatches = verifyContent.match(/['"`].*\?['"`]/g);
const questionCount = questionMatches ? questionMatches.length : 0;
assert(questionCount >= 4, `Has at least 4 evaluation questions (found ~${questionCount})`);

// ── Test 3: Classification (FAQ direct / regulation / fallback) ──
console.log('\n=== Phase 18.3: Answer classification ===');
assert(
  verifyContent.includes('classifyRagMode') || verifyContent.includes('classification'),
  'Uses RAG mode classification'
);

const rankingPath = path.join(ROOT, 'server/src/services/rag-ranking.ts');
const rankingContent = fs.readFileSync(rankingPath, 'utf8');
assert(rankingContent.includes('faq-direct'), 'Classification has faq-direct mode');
assert(rankingContent.includes('regulation-doc'), 'Classification has regulation-doc mode');
assert(rankingContent.includes('fallback'), 'Classification has fallback mode');

// ── Test 4: FAQ vs regulation scoring ──
console.log('\n=== Phase 18.4: Scoring comparison ===');
assert(
  verifyContent.includes('topFaqScore') || verifyContent.includes('faqScore'),
  'Tracks top FAQ match score'
);
assert(
  verifyContent.includes('topDocScore') || verifyContent.includes('docScore'),
  'Tracks top document match score'
);
assert(
  verifyContent.includes('rerankedScore') || verifyContent.includes('rerankMatches'),
  'Uses reranking for quality assessment'
);

// ── Test 5: Citation quality tracking ──
console.log('\n=== Phase 18.5: Citation tracking ===');
assert(
  verifyContent.includes('article_ref') || verifyContent.includes('articleRef'),
  'Tracks article references in results'
);
assert(
  verifyContent.includes('section_title') || verifyContent.includes('sectionTitle'),
  'Tracks section titles for citations'
);

// ── Test 6: RAG pipeline completeness ──
console.log('\n=== Phase 18.6: RAG pipeline ===');
const ragPath = path.join(ROOT, 'server/src/services/rag.ts');
const ragContent = fs.readFileSync(ragPath, 'utf8');

assert(ragContent.includes('ragAnswer'), 'RAG service has ragAnswer function');
assert(ragContent.includes('faq_entries'), 'RAG searches FAQ entries');
assert(ragContent.includes('regulation_documents'), 'RAG searches regulation documents');
assert(ragContent.includes('sources'), 'RAG returns source citations');
assert(ragContent.includes('isFaqMatch'), 'RAG distinguishes FAQ direct matches');

// ── Test 7: Chat route exposes RAG ──
console.log('\n=== Phase 18.7: Chat route ===');
const chatPath = path.join(ROOT, 'server/src/routes/chat.ts');
const chatContent = fs.readFileSync(chatPath, 'utf8');

assert(chatContent.includes('ragAnswer'), 'Chat route uses ragAnswer');
assert(chatContent.includes('/api/chat') || chatContent.includes("'/'"), 'Chat has POST endpoint');
assert(chatContent.includes('source_docs'), 'Chat stores source documents');
assert(chatContent.includes('chat_history'), 'Chat stores conversation history');

// ── Test 8: Reranking quality ──
console.log('\n=== Phase 18.8: Reranking quality ===');
assert(rankingContent.includes('lexicalOverlap'), 'Reranking uses lexical overlap');
assert(rankingContent.includes('phraseBoost'), 'Reranking uses phrase boosting');
assert(rankingContent.includes('conceptBoost'), 'Reranking uses concept boosting');
assert(rankingContent.includes('intentBoost'), 'Reranking uses intent boosting');
assert(
  rankingContent.includes('FAQ_DIRECT_THRESHOLD'),
  'Has configurable FAQ direct match threshold'
);
assert(
  rankingContent.includes('DOC_RETRIEVAL_THRESHOLD'),
  'Has configurable doc retrieval threshold'
);

// ── Test 9: Output format ──
console.log('\n=== Phase 18.9: Output format ===');
assert(
  verifyContent.includes('JSON.stringify') || verifyContent.includes('console.log'),
  'Outputs structured results'
);
assert(
  verifyContent.includes('faqMatches') && verifyContent.includes('docMatches'),
  'Reports both FAQ and doc match details'
);

// ── Summary ──
console.log(`\n${'='.repeat(50)}`);
console.log(`Phase 18 Results: ${pass} PASS / ${fail} FAIL`);
console.log(`${'='.repeat(50)}\n`);

process.exitCode = fail > 0 ? 1 : 0;
