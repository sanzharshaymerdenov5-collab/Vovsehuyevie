/**
 * Milestone 4 Adversarial Challenger 1 Test Suite
 * Project: «Во Все Хуёвые» Wiki
 * 
 * Aggressive White-Box Stress Testing, Edge-Case Discovery, and Empirical Verification:
 * 1. Storage resilience (safeStorage): extreme sizes, data types, corruption, quota errors, memory cache eviction/consistency.
 * 2. Search input attacks: Regex injection characters in #globalSearchInput and #dirSearchInput, empty/space queries, HTML injection, XSS attempts.
 * 3. Search modal keyboard interaction: Rapid ArrowUp/ArrowDown wrapping, navigation when 0 results match, Enter key on empty/filtered results, Escape key behavior, selection state retention.
 * 4. Wiki Auto-linking (renderWikiProse): Special chars, overlapping entity aliases, nested links, self-link rendering, XSS escaping in link titles.
 * 5. Routing: Malformed hash routes (#unknown, #character/does-not-exist, #sec-nonexistent), hashchange race conditions, document.title stability.
 * 6. Data integrity: Missing entity cross-references, faction members, timeline order, canon attribute completeness.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const { createBrowserEnvironment } = require('./test_harness.js');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let totalAssertions = 0;
let passedAssertions = 0;
let failedAssertions = 0;
const defects = [];

function check(condition, message, details = {}) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
  } else {
    failedAssertions++;
    const err = new Error(`Assertion Failed: ${message}`);
    err.details = details;
    throw err;
  }
}

async function searchInput(env, text, delayMs = 160) {
  const input = env.document.getElementById('globalSearchInput');
  input.value = text;
  input.dispatchEvent({ type: 'input' });
  await new Promise(r => setTimeout(r, delayMs));
}

async function test(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  \x1b[31m✗\x1b[0m ${name}`);
    console.error(`    \x1b[31mError:\x1b[0m ${err.message}`);
    if (err.details && Object.keys(err.details).length > 0) {
      console.error(`    \x1b[33mDetails:\x1b[0m`, JSON.stringify(err.details, null, 2));
    }
    failedTests++;
    defects.push({ name, error: err.message, stack: err.stack, details: err.details });
  }
}

async function runAdversarialSuite() {
  console.log('\n\x1b[1m\x1b[35m========================================================================\x1b[0m');
  console.log('\x1b[1m  MILESTONE 4: ADVERSARIAL CHALLENGER 1 STRESS TEST SUITE\x1b[0m');
  console.log('\x1b[1m  Scope: JavaScript Logic, Storage, Search, Auto-linking, Routing & Data\x1b[0m');
  console.log('\x1b[1m\x1b[35m========================================================================\x1b[0m\n');

  // ==========================================================================
  // PART 1: STORAGE RESILIENCE (safeStorage)
  // ==========================================================================
  console.log('\x1b[1m\x1b[34m▶ Part 1: Storage Resilience & Sandboxing (safeStorage)...\x1b[0m');

  await test('1.1 Extreme Payload Sizes (1MB and 5MB string storage and retrieval)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const storage = env.getSafeStorage();

    const payload1MB = 'X'.repeat(1024 * 1024);
    storage.setItem('stress_1mb', payload1MB);
    const read1MB = storage.getItem('stress_1mb');
    check(read1MB === payload1MB, '1MB payload must be retrieved intact without truncation');

    const payload5MB = 'Y'.repeat(5 * 1024 * 1024);
    storage.setItem('stress_5mb', payload5MB);
    const read5MB = storage.getItem('stress_5mb');
    check(read5MB === payload5MB, '5MB payload must be retrieved intact without truncation');

    // Clean up
    storage.removeItem('stress_1mb');
    storage.removeItem('stress_5mb');
    check(storage.getItem('stress_1mb') === null, '1MB item removed cleanly');
    check(storage.getItem('stress_5mb') === null, '5MB item removed cleanly');
  });

  await test('1.2 Empty 0-byte Key and Value Handling', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const storage = env.getSafeStorage();

    storage.setItem('', '');
    check(storage.getItem('') === '', 'Empty string key stores empty string value');
    check(storage.getItem('', 'fallback') === '', 'Empty string value does not trigger default fallback');

    storage.removeItem('');
    check(storage.getItem('', 'fallback') === 'fallback', 'Removed empty key triggers default fallback');
  });

  await test('1.3 Type Coercion & Unusual Primitives (null, undefined, number, boolean, object, NaN)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const storage = env.getSafeStorage();

    storage.setItem('k_null', null);
    check(storage.getItem('k_null') === 'null', 'null coerces to "null" string');

    storage.setItem('k_undef', undefined);
    check(storage.getItem('k_undef') === 'undefined', 'undefined coerces to "undefined" string');

    storage.setItem('k_num', 12345);
    check(storage.getItem('k_num') === '12345', 'Number 12345 coerces to "12345" string');

    storage.setItem('k_bool_true', true);
    check(storage.getItem('k_bool_true') === 'true', 'Boolean true coerces to "true" string');

    storage.setItem('k_bool_false', false);
    check(storage.getItem('k_bool_false') === 'false', 'Boolean false coerces to "false" string');

    storage.setItem('k_nan', NaN);
    check(storage.getItem('k_nan') === 'NaN', 'NaN coerces to "NaN" string');

    storage.setItem('k_obj', { secret: 'belinsky' });
    check(storage.getItem('k_obj') === '[object Object]', 'Object coerces to "[object Object]" string');
  });

  await test('1.4 QuotaExceededError Resilience & In-Memory Fallback', async () => {
    const env = createBrowserEnvironment({ loadApp: true, storageMode: 'quota_exceeded' });
    const storage = env.getSafeStorage();

    let threw = false;
    try {
      storage.setItem('quota_key', 'should_persist_in_memory');
    } catch (e) {
      threw = true;
    }
    check(!threw, 'setItem must not throw when localStorage raises QuotaExceededError');

    const retrieved = storage.getItem('quota_key');
    check(retrieved === 'should_persist_in_memory', 'In-memory fallback preserves value during quota error');

    // Verify deletion under quota exceeded
    storage.removeItem('quota_key');
    check(storage.getItem('quota_key') === null, 'removeItem clears in-memory store during quota mode');

    // Verify clear() under quota exceeded
    storage.setItem('quota_1', 'val1');
    storage.setItem('quota_2', 'val2');
    storage.clear();
    check(storage.getItem('quota_1') === null, 'clear() wipes in-memory store during quota mode');
    check(storage.getItem('quota_2') === null, 'clear() wipes in-memory store during quota mode');
  });

  await test('1.5 SecurityError Resilience (Restricted / Private Browsing Sandbox)', async () => {
    const env = createBrowserEnvironment({ loadApp: true, storageMode: 'restricted' });
    const storage = env.getSafeStorage();

    check(storage.getItem('wiki_theme', 'dark') === 'dark', 'getItem does not throw SecurityError in restricted mode');

    let threw = false;
    try {
      storage.setItem('wiki_theme', 'light');
    } catch (e) {
      threw = true;
    }
    check(!threw, 'setItem does not throw SecurityError in restricted mode');
    check(storage.getItem('wiki_theme') === 'light', 'In-memory fallback works across reads in restricted mode');

    storage.removeItem('wiki_theme');
    check(storage.getItem('wiki_theme', 'dark') === 'dark', 'removeItem works in restricted mode');
  });

  await test('1.6 Memory Cache Eviction, Deletion, and Fallback Semantics', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const storage = env.getSafeStorage();

    check(storage.getItem('nonexistent_key') === null, 'Nonexistent key without fallback returns null');
    check(storage.getItem('nonexistent_key', 'default_val') === 'default_val', 'Nonexistent key returns fallback');

    storage.setItem('cycle_key', 'initial');
    check(storage.getItem('cycle_key') === 'initial', 'Initial write succeeds');

    storage.removeItem('cycle_key');
    check(storage.getItem('cycle_key', 'fallback') === 'fallback', 'Removed key returns fallback');

    storage.setItem('cycle_key', 'recreated');
    check(storage.getItem('cycle_key') === 'recreated', 'Re-creating removed key succeeds');

    storage.clear();
    check(storage.getItem('cycle_key', 'cleared') === 'cleared', 'clear() invalidates cache');
  });

  // ==========================================================================
  // PART 2: SEARCH INPUT ATTACKS & REGEX INJECTION RESILIENCE
  // ==========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Part 2: Search Input Attacks & Regex Injection Resilience...\x1b[0m');

  await test('2.1 Regex Injection Characters in #globalSearchInput (No SyntaxError crash)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();

    const dangerousQueries = [
      '[', '[[[', ']', '(', '(()', '(?=', '*', '+', '?', '*+?', '{1,3}',
      '^', '$', '\\', '\\.', '\\w+', '|', '(?!)', '(?(?=',
      '^[a-z]+$', '(', ')', '^*+?[\\]|{}',
      '\\u0000', '\\x00', '.*'
    ];

    for (const q of dangerousQueries) {
      let threw = false;
      try {
        await searchInput(env, q);
      } catch (err) {
        threw = true;
      }
      check(!threw, `Regex input "${q}" must not throw SyntaxError in global search`, { query: q });
      check(resultsContainer !== null, 'Results container remains intact');
    }
  });

  await test('2.2 Regex Injection Characters in #dirSearchInput (Character Directory Filter)', async () => {
    const env = createBrowserEnvironment({ loadApp: true, initialHash: '#characters' });
    const input = env.document.getElementById('dirSearchInput');
    const grid = env.document.getElementById('directoryCardsGrid');

    check(input !== null, '#dirSearchInput must exist');
    check(grid !== null, '#directoryCardsGrid must exist');

    const dangerousQueries = [
      '[', '[[[', ']', '(', '(()', '(?=', '*', '+', '?', '*+?', '{1,3}',
      '^', '$', '\\', '\\.', '\\w+', '|', '(?!)', '(?(?='
    ];

    for (const q of dangerousQueries) {
      input.value = q;
      let threw = false;
      try {
        input.dispatchEvent({ type: 'input' });
        await new Promise(r => setTimeout(r, 160));
      } catch (err) {
        threw = true;
      }
      check(!threw, `Regex input "${q}" must not throw in directory filter`, { query: q });
    }
  });

  await test('2.3 Boundary Queries (Empty, Whitespace-only, Control Chars)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();

    const blanks = ['', '   ', '\t', '\n\r', ' \t \n '];
    for (const b of blanks) {
      await searchInput(env, b);
      const items = resultsContainer.querySelectorAll('.search-result-item');
      check(items.length > 0, `Whitespace query "${b.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t')}" defaults to showing all available records`);
    }
  });

  await test('2.4 HTML Injection and XSS Attacks in Search Query', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();

    const xssPayloads = [
      '<script>alert("pwned")</script>',
      '<img src=x onerror=alert(1)>',
      '"><svg onload=alert(1)>',
      '\' onfocus=\'alert(1)',
      '<iframe src="javascript:alert(1)"></iframe>'
    ];

    for (const payload of xssPayloads) {
      await searchInput(env, payload);
      const html = resultsContainer.innerHTML;
      check(!html.includes('<script>'), `Payload must be escaped, no raw <script> in HTML: ${payload}`);
      check(!html.includes('<img src=x onerror'), `Payload must be escaped, no raw <img onerror> in HTML: ${payload}`);
      check(!html.includes('<svg onload'), `Payload must be escaped, no raw <svg onload> in HTML: ${payload}`);
      check(!html.includes('<iframe'), `Payload must be escaped, no raw <iframe in HTML: ${payload}`);
      check(html.includes('&lt;') || html.includes('&quot;') || html.includes('&#039;'), 'HTML characters must be HTML-entity escaped');
    }
  });

  await test('2.5 Extremely Long Search Queries (Stress testing substring search)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();

    const lengths = [1000, 5000, 10000];
    for (const len of lengths) {
      const hugeQuery = 'Белинский_' + 'Z'.repeat(len);
      const startTime = Date.now();
      await searchInput(env, hugeQuery);
      const duration = Date.now() - startTime;
      check(duration < 250, `Search with ${len} characters must execute rapidly, took ${duration}ms`);
      check(resultsContainer.innerHTML.includes('ничего не найдено'), `Long non-matching query cleanly displays not-found message`);
    }
  });

  await test('2.6 Search Filter Chips Strict Type Isolation', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();

    // 1. Filter: characters only
    const charChip = env.document.querySelector('.filter-chip[data-filter="character"]');
    charChip.click();
    check(env.getState().searchFilter === 'character', 'Filter state is character');
    let items = resultsContainer.querySelectorAll('.search-result-item');
    check(items.length === 7, `Character filter returns exactly 7 characters, got ${items.length}`);
    for (const it of items) {
      check(it.innerHTML.includes('Персонаж'), 'All items in character filter must have type Персонаж');
      check(!it.innerHTML.includes('Группировка'), 'No factions present in character filter');
    }

    // 2. Filter: factions only
    const facChip = env.document.querySelector('.filter-chip[data-filter="faction"]');
    facChip.click();
    check(env.getState().searchFilter === 'faction', 'Filter state is faction');
    items = resultsContainer.querySelectorAll('.search-result-item');
    check(items.length === 3, `Faction filter returns exactly 3 factions, got ${items.length}`);
    for (const it of items) {
      check(it.innerHTML.includes('Группировка'), 'All items in faction filter must have type Группировка');
      check(!it.innerHTML.includes('Персонаж'), 'No characters present in faction filter');
    }

    // 3. Filter: all
    const allChip = env.document.querySelector('.filter-chip[data-filter="all"]');
    allChip.click();
    check(env.getState().searchFilter === 'all', 'Filter state is all');
    items = resultsContainer.querySelectorAll('.search-result-item');
    check(items.length >= 10, 'All filter returns at least 10 entries (7 chars + 3 factions)');
  });

  // ==========================================================================
  // PART 3: SEARCH MODAL KEYBOARD INTERACTIONS & BOUNDARIES
  // ==========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Part 3: Search Modal Keyboard Interactions & State Boundaries...\x1b[0m');

  await test('3.1 Rapid ArrowDown Navigation & Bottom Clamping', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const input = env.document.getElementById('globalSearchInput');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();
    await searchInput(env, 'Белинский');

    const items = resultsContainer.querySelectorAll('.search-result-item');
    check(items.length > 0, 'Results must exist for Белинский');
    const maxIndex = items.length - 1;

    // First ArrowDown selects index 0
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    check(env.getState().selectedSearchIndex === 0, 'First ArrowDown selects index 0');

    // Rapid ArrowDown 50 times
    for (let i = 0; i < 50; i++) {
      input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    }
    check(env.getState().selectedSearchIndex === maxIndex, `ArrowDown clamps at maxIndex (${maxIndex}), does not overflow`);

    const selectedItems = resultsContainer.querySelectorAll('.search-result-item.selected');
    check(selectedItems.length === 1, 'Exactly 1 item has .selected class');
  });

  await test('3.2 Rapid ArrowUp Navigation & Top Clamping', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const input = env.document.getElementById('globalSearchInput');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();
    await searchInput(env, 'Белинский');

    // Set index to 2
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    check(env.getState().selectedSearchIndex === 2, 'Selected index is 2');

    // Rapid ArrowUp 30 times
    for (let i = 0; i < 30; i++) {
      input.dispatchEvent({ type: 'keydown', key: 'ArrowUp', preventDefault: () => {} });
    }
    check(env.getState().selectedSearchIndex === 0, 'ArrowUp clamps at index 0, does not go negative');

    const selectedItems = resultsContainer.querySelectorAll('.search-result-item.selected');
    check(selectedItems.length === 1, 'Exactly 1 item has .selected class');
  });

  await test('3.3 Alternating ArrowUp / ArrowDown Rapid Hammering (100 times)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const input = env.document.getElementById('globalSearchInput');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();
    await searchInput(env, 'Белинский');

    const items = resultsContainer.querySelectorAll('.search-result-item');
    const maxIndex = items.length - 1;

    for (let i = 0; i < 100; i++) {
      const key = (i % 2 === 0) ? 'ArrowDown' : 'ArrowUp';
      input.dispatchEvent({ type: 'keydown', key, preventDefault: () => {} });
      const curr = env.getState().selectedSearchIndex;
      check(curr >= 0 && curr <= maxIndex, `Index (${curr}) must remain within [0, ${maxIndex}] during alternating keys`);
    }
  });

  await test('3.4 Zero Results Keyboard Navigation (No unhandled exceptions)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const input = env.document.getElementById('globalSearchInput');
    const modal = env.document.getElementById('searchModal');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();
    await searchInput(env, 'совершенно_несуществующий_запрос_12345');

    const items = resultsContainer.querySelectorAll('.search-result-item');
    check(items.length === 0, 'No search result items match');

    const initialHash = env.window.location.hash;

    // Trigger ArrowDown, ArrowUp, Enter on 0 results
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'ArrowUp', preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault: () => {} });

    check(env.getState().selectedSearchIndex === -1, 'selectedSearchIndex stays -1 on zero results');
    check(env.window.location.hash === initialHash, 'Hash does not change on Enter with 0 results');
    check(!modal.classList.contains('hidden'), 'Modal stays open on Enter with 0 results');
  });

  await test('3.5 Enter Key on Results without Explicit Selection (Defaults to index 0)', async () => {
    const env = createBrowserEnvironment({ loadApp: true, initialHash: '#home' });
    const openBtn = env.document.getElementById('openSearchBtn');
    const input = env.document.getElementById('globalSearchInput');
    const modal = env.document.getElementById('searchModal');

    openBtn.click();
    await searchInput(env, 'Валентин');

    check(env.getState().selectedSearchIndex === -1, 'Index starts at -1 before arrow navigation');

    input.dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault: () => {} });

    check(env.window.location.hash === '#character/valentin-belinsky', 'Enter on -1 navigates to top matching result');
    check(modal.classList.contains('hidden'), 'Search modal is closed after Enter navigation');
  });

  await test('3.6 Enter Key on Explicitly Highlighted Item (Index 1)', async () => {
    const env = createBrowserEnvironment({ loadApp: true, initialHash: '#home' });
    const openBtn = env.document.getElementById('openSearchBtn');
    const input = env.document.getElementById('globalSearchInput');
    const modal = env.document.getElementById('searchModal');
    const resultsContainer = env.document.getElementById('searchResultsList');

    openBtn.click();
    await searchInput(env, 'Белинский');

    const items = resultsContainer.querySelectorAll('.search-result-item');
    check(items.length >= 2, 'At least 2 items found');
    const expectedLink = items[1].getAttribute('data-link');

    // Arrow down twice to reach index 1
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    check(env.getState().selectedSearchIndex === 1, 'Index is 1');

    input.dispatchEvent({ type: 'keydown', key: 'Enter', preventDefault: () => {} });

    check(env.window.location.hash === expectedLink, `Navigated to highlighted item's link: ${expectedLink}`);
    check(modal.classList.contains('hidden'), 'Modal is closed after navigation');
  });

  await test('3.7 Escape Key and Keyboard Shortcuts (/ and Ctrl+K)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const modal = env.document.getElementById('searchModal');

    // 1. Shortcut: /
    env.window.dispatchEvent({ type: 'keydown', key: '/', preventDefault: () => {} });
    check(!modal.classList.contains('hidden'), '/ shortcut opens search modal');

    // 2. Dismiss: Escape
    env.window.dispatchEvent({ type: 'keydown', key: 'Escape' });
    check(modal.classList.contains('hidden'), 'Escape closes search modal');
    check(env.getState().selectedSearchIndex === -1, 'Escape resets selectedSearchIndex to -1');

    // 3. Shortcut: Ctrl+K
    env.window.dispatchEvent({ type: 'keydown', key: 'k', ctrlKey: true, preventDefault: () => {} });
    check(!modal.classList.contains('hidden'), 'Ctrl+K opens search modal');

    // Dismiss again
    env.window.dispatchEvent({ type: 'keydown', key: 'Escape' });
    check(modal.classList.contains('hidden'), 'Escape closes search modal again');
  });

  await test('3.8 Selection State Reset on Search Query Change', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const openBtn = env.document.getElementById('openSearchBtn');
    const input = env.document.getElementById('globalSearchInput');

    openBtn.click();
    await searchInput(env, 'Белинский');

    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', preventDefault: () => {} });
    check(env.getState().selectedSearchIndex === 1, 'Index was moved to 1');

    // Change query
    await searchInput(env, 'Гусев');
    check(env.getState().selectedSearchIndex === -1, 'selectedSearchIndex resets to -1 when search re-executes');
  });

  // ==========================================================================
  // PART 4: WIKI AUTO-LINKING (renderWikiProse) WHITE-BOX STRESS
  // ==========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Part 4: Wiki Auto-linking (renderWikiProse) White-Box Stress...\x1b[0m');

  await test('4.1 Overlapping Entity Resolution (Longer vs Shorter Precedence)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });

    // "Наркоимперия Хуйзенберга" vs "Хуйзенберг"
    const html1 = env.eval('renderWikiProse("Наркоимперия Хуйзенберга процветала")');
    check(html1.includes('href="#faction/huizenberg-empire"'), 'Matches faction link rather than individual character');
    check(!html1.includes('href="#character/valentin-belinsky"'), 'Does not match Valentin Belinsky sub-regex inside faction name');

    // "Валентин «Белый» Белинский Агафонович" vs "Валентин Белинский"
    const html2 = env.eval('renderWikiProse("Валентин «Белый» Белинский Агафонович прибыл в город")');
    check(html2.includes('<a href="#character/valentin-belinsky" class="wiki-link wiki-inline-link">Валентин «Белый» Белинский Агафонович</a>'), 'Full title matched as single unbroken link');

    // "Сосик (Джимми) Гудманов" vs "Сосик Гудман"
    const html3 = env.eval('renderWikiProse("Его адвокат Сосик (Джимми) Гудманов помог")');
    check(html3.includes('href="#character/sosik-goodman"'), 'Matches Sosik Goodman full alias');

    // "Стояк Геннадьевич Шрейдеров" vs "Стояк Белинский"
    const html4 = env.eval('renderWikiProse("Агент Стояк Геннадьевич Шрейдеров начал расследование")');
    check(html4.includes('href="#character/stoyak-belinsky"'), 'Matches Stoyak full legal name');
  });

  await test('4.2 Self-Linking MediaWiki Canon (mw-selflink on currentId match)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });

    // When viewing Valentin Belinsky article, references to him must render as strong.mw-selflink, NOT <a>
    const selfHtml = env.eval('renderWikiProse("Валентин Белинский встретил Хуйзенберга", "valentin-belinsky")');
    check(selfHtml.includes('<strong class="mw-selflink">Валентин Белинский</strong>'), 'Self-link renders as <strong class="mw-selflink">');
    check(selfHtml.includes('<strong class="mw-selflink">Хуйзенберга</strong>'), 'Alias self-link renders as <strong class="mw-selflink">');
    check(!selfHtml.includes('<a href="#character/valentin-belinsky"'), 'No clickable <a> self-links generated on own article');

    // When viewing Stoyak article, Valentin references MUST be standard <a> links
    const crossHtml = env.eval('renderWikiProse("Валентин Белинский встретил Стояка Белинского", "stoyak-belinsky")');
    check(crossHtml.includes('<a href="#character/valentin-belinsky" class="wiki-link wiki-inline-link">Валентин Белинский</a>'), 'Other character is clickable link');
    check(crossHtml.includes('<strong class="mw-selflink">Стояка Белинского</strong>'), 'Current character is strong.mw-selflink');
  });

  await test('4.3 Geographic Place Tagging (isPlace: true -> span.wiki-place-tag)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });

    const html1 = env.eval('renderWikiProse("Прибыл в г. Подзалупинск вчера")');
    check(html1.includes('<span class="wiki-place-tag">г. Подзалупинск</span>'), 'Renders span.wiki-place-tag for г. Подзалупинск');
    check(!html1.includes('href="null"'), 'Does not generate invalid href="null" link');

    const html2 = env.eval('renderWikiProse("Жители Подзалупинска в шоке")');
    check(html2.includes('<span class="wiki-place-tag">Подзалупинска</span>'), 'Renders span.wiki-place-tag for Подзалупинска inflected');
  });

  await test('4.4 XSS Sanitization & HTML Tag Safety in Prose', async () => {
    const env = createBrowserEnvironment({ loadApp: true });

    const dangerousProse = '<script>alert("hack")</script> Валентин Белинский <img src=x onerror=alert(2)>';
    const result = env.eval(`renderWikiProse(${JSON.stringify(dangerousProse)})`);

    check(!result.includes('<script>'), 'Prose must not contain unescaped <script>');
    check(!result.includes('<img src=x'), 'Prose must not contain unescaped <img>');
    check(result.includes('&lt;script&gt;'), '<script> is escaped to &lt;script&gt;');
    check(result.includes('&lt;img src=x'), '<img> is escaped to &lt;img');
    check(result.includes('<a href="#character/valentin-belinsky"'), 'Wiki entity inside sanitized prose is still properly linked');
  });

  await test('4.5 Boundary Primitive Inputs to renderWikiProse', async () => {
    const env = createBrowserEnvironment({ loadApp: true });

    check(env.eval('renderWikiProse(null)') === '', 'null returns empty string');
    check(env.eval('renderWikiProse(undefined)') === '', 'undefined returns empty string');
    check(env.eval('renderWikiProse("")') === '', 'empty string returns empty string');
    check(env.eval('renderWikiProse(0)') === '', 'number 0 returns empty string');
    check(env.eval('renderWikiProse(false)') === '', 'boolean false returns empty string');

    const numResult = env.eval('renderWikiProse(12345)');
    check(numResult === '12345', 'non-zero number converted to string');
  });

  await test('4.6 Ukrainian & Parody Slang Entity Auto-linking', async () => {
    const env = createBrowserEnvironment({ loadApp: true });

    const ukrProse = 'Жесси рiзiвым пiрнем варил мефедрон';
    const res = env.eval(`renderWikiProse(${JSON.stringify(ukrProse)})`);
    check(res.includes('href="#character/jesse-pinkman"'), 'Ukrainian transliteration alias links to Jesse Pinkman');
  });

  // ==========================================================================
  // PART 5: CLIENT-SIDE ROUTING, RACE CONDITIONS & TITLE STABILITY
  // ==========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Part 5: Client-Side Routing, Race Conditions & Title Stability...\x1b[0m');

  await test('5.1 Malformed and Nonexistent Routes Error Handling', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const viewport = env.document.getElementById('contentViewport');

    // 1. #unknown_route -> falls back to home view cleanly
    env.window.location.hash = '#unknown_route_xyz_123';
    check(env.document.title.includes('«Во Все Хуёвые»'), 'Falls back to default home title');
    check(viewport.innerHTML.includes('portal-hero'), 'Renders portal hero on unknown route');

    // 2. #character/nonexistent-char-404 -> renders not-found card
    env.window.location.hash = '#character/nonexistent-char-404';
    check(viewport.innerHTML.includes('Персонаж не найден'), 'Renders "Персонаж не найден" message');
    check(env.document.title.includes('Персонаж — «Во Все Хуёвые» Wiki'), 'Title set to "Персонаж — «Во Все Хуёвые» Wiki"');

    // 3. #faction/nonexistent-fac-404 -> renders not-found card
    env.window.location.hash = '#faction/nonexistent-fac-404';
    check(viewport.innerHTML.includes('Группировка не найдена'), 'Renders "Группировка не найдена" message');

    // 4. #sec-biography anchor link does not destroy article DOM
    env.window.location.hash = '#character/valentin-belinsky';
    const initialChildCount = viewport.children.length;
    env.window.location.hash = '#sec-biography';
    check(viewport.children.length === initialChildCount, 'Anchor link does not destroy or wipe article container');
  });

  await test('5.2 Missing ID Route Redirects (#character and #faction)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });

    env.window.location.hash = '#character';
    check(env.window.location.hash === '#characters', '#character redirects to #characters');

    env.window.location.hash = '#faction';
    check(env.window.location.hash === '#factions', '#faction redirects to #factions');
  });

  await test('5.3 Document Title Stability Across All Canonical Routes', async () => {
    const env = createBrowserEnvironment({ loadApp: true });

    const routeTitles = [
      { hash: '#home', expected: '«Во Все Хуёвые» — Энциклопедия криминального Подзалупинска' },
      { hash: '#characters', expected: 'Персонажи — «Во Все Хуёвые» Wiki' },
      { hash: '#character/valentin-belinsky', expected: 'Валентин Белинский — «Во Все Хуёвые» Wiki' },
      { hash: '#character/jesse-pinkman', expected: 'Джесси Розовый — «Во Все Хуёвые» Wiki' },
      { hash: '#character/stoyak-belinsky', expected: 'Стояк Белинский — «Во Все Хуёвые» Wiki' },
      { hash: '#character/gusev-ferangiy', expected: 'Гусев Ферангий — «Во Все Хуёвые» Wiki' },
      { hash: '#factions', expected: 'Группировки — «Во Все Хуёвые» Wiki' },
      { hash: '#faction/huizenberg-empire', expected: 'Наркоимперия Хуйзенберга — «Во Все Хуёвые» Wiki' },
      { hash: '#faction/gusev-empire', expected: 'Наркоимперия Гусева Ферангия — «Во Все Хуёвые» Wiki' },
      { hash: '#faction/obn-podzalupinsk', expected: 'ОБН Подзалупинска (ГНК) — «Во Все Хуёвые» Wiki' },
      { hash: '#episodes', expected: 'Серии — «Во Все Хуёвые» Wiki' },
      { hash: '#timeline', expected: 'Хронология — «Во Все Хуёвые» Wiki' }
    ];

    for (const item of routeTitles) {
      env.window.location.hash = item.hash;
      check(env.document.title === item.expected, `Title for ${item.hash} must be "${item.expected}", got "${env.document.title}"`);
    }
  });

  await test('5.4 Rapid Hashchange Race Condition Stress Test (60 Route Changes)', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const routes = [
      '#home', '#characters', '#character/valentin-belinsky', '#factions',
      '#faction/gusev-empire', '#episodes', '#timeline', '#characters?status=жив',
      '#character/does-not-exist', '#unknown', '#home'
    ];

    let cycleErrors = 0;
    for (let c = 0; c < 6; c++) {
      for (const r of routes) {
        try {
          env.window.location.hash = r;
          if (!env.document.title || env.document.title.length === 0) {
            cycleErrors++;
          }
        } catch (err) {
          cycleErrors++;
        }
      }
    }

    check(cycleErrors === 0, `All 66 rapid route changes must complete without errors, got ${cycleErrors} errors`);
    const viewport = env.document.getElementById('contentViewport');
    check(viewport.children.length > 0, 'Viewport remains populated and non-empty after route hammering');
  });

  await test('5.5 Breadcrumb Hierarchy Consistency Across Routes', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const bc = env.document.getElementById('wikiBreadcrumbs');

    // Home
    env.window.location.hash = '#home';
    check(bc.innerHTML.includes('Главная страница'), 'Home breadcrumb contains Главная страница');

    // Characters Directory
    env.window.location.hash = '#characters';
    check(bc.innerHTML.includes('Персонажи'), 'Characters breadcrumb contains Персонажи');

    // Character Detail
    env.window.location.hash = '#character/valentin-belinsky';
    check(bc.innerHTML.includes('href="#characters"'), 'Character detail breadcrumb links back to #characters');
    check(bc.innerHTML.includes('Валентин Белинский'), 'Character detail breadcrumb contains character name');

    // Faction Detail
    env.window.location.hash = '#faction/huizenberg-empire';
    check(bc.innerHTML.includes('href="#factions"'), 'Faction detail breadcrumb links back to #factions');
    check(bc.innerHTML.includes('Наркоимперия Хуйзенберга'), 'Faction detail breadcrumb contains faction name');

    // Timeline
    env.window.location.hash = '#timeline';
    check(bc.innerHTML.includes('Хронология серий'), 'Timeline breadcrumb contains Хронология серий');
  });

  // ==========================================================================
  // PART 6: KNOWLEDGE BASE DATA INTEGRITY & CANON VALIDATION
  // ==========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Part 6: Knowledge Base Data Integrity & Canon Validation...\x1b[0m');

  await test('6.1 Character to Faction Referential Integrity', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const data = env.getData();
    const factionIds = new Set(data.factions.map(f => f.id));

    for (const char of data.characters) {
      check(factionIds.has(char.factionId), `Character ${char.id} references invalid factionId: ${char.factionId}`);
    }
  });

  await test('6.2 Faction notableMembers Referential Integrity', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const data = env.getData();
    const characterIds = new Set(data.characters.map(c => c.id));

    for (const faction of data.factions) {
      if (faction.notableMembers) {
        for (const mId of faction.notableMembers) {
          check(characterIds.has(mId), `Faction ${faction.id} notableMember references invalid characterId: ${mId}`);
        }
      }
    }
  });

  await test('6.3 Inter-Character Relationships Referential Integrity', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const data = env.getData();
    const characterIds = new Set(data.characters.map(c => c.id));

    for (const char of data.characters) {
      if (char.relationships) {
        for (const rel of char.relationships) {
          check(characterIds.has(rel.charId), `Character ${char.id} relationship references invalid charId: ${rel.charId}`);
          check(typeof rel.type === 'string' && rel.type.length > 0, `Character ${char.id} relationship has valid description`);
        }
      }
    }
  });

  await test('6.4 Chronological Timeline Completeness and Ordering', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const data = env.getData();

    check(Array.isArray(data.timeline) && data.timeline.length >= 7, 'Timeline must contain at least 7 canon events');

    for (const ev of data.timeline) {
      check(typeof ev.year === 'string' && ev.year.length > 0, 'Event has valid year string');
      check(typeof ev.title === 'string' && ev.title.length > 0, 'Event has valid title');
      check(typeof ev.desc === 'string' && ev.desc.length > 0, 'Event has valid description');
    }

    // Verify chronological progression (1954 birth -> 2022 pilot -> 2023 heisenberg -> 2024 death -> 2025 movie)
    const expectedYearOrder = [1954, 2022, 2023, 2023, 2024, 2024, 2025];
    const extractedYears = data.timeline.map(ev => {
      const match = ev.year.match(/\b(19\d\d|20\d\d)\b/);
      return match ? parseInt(match[1], 10) : 0;
    });

    for (let i = 0; i < extractedYears.length - 1; i++) {
      check(extractedYears[i] <= extractedYears[i + 1], `Timeline ordering preserved: ${extractedYears[i]} <= ${extractedYears[i + 1]}`);
    }
  });

  await test('6.5 Mandatory Canon Attributes Completeness for All Characters', async () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const data = env.getData();

    check(data.characters.length === 7, `Expected exactly 7 canonical characters, found ${data.characters.length}`);

    const requiredFields = ['id', 'name', 'status', 'role', 'origin', 'overview', 'biography', 'quote', 'weapon', 'actor'];
    for (const char of data.characters) {
      for (const field of requiredFields) {
        const val = char[field];
        const isPresent = val !== undefined && val !== null && (typeof val === 'string' ? val.trim().length > 0 : Array.isArray(val) ? val.length > 0 : true);
        check(isPresent, `Character "${char.name || char.id}" missing required field "${field}"`);
      }
    }
  });

  // ==========================================================================
  // FINAL SUMMARY
  // ==========================================================================
  console.log('\n\x1b[1m\x1b[35m========================================================================\x1b[0m');
  console.log('\x1b[1m  ADVERSARIAL CHALLENGER 1 EXECUTION SUMMARY\x1b[0m');
  console.log('\x1b[1m\x1b[35m========================================================================\x1b[0m');
  console.log(`  Total Tests:       ${totalTests}`);
  console.log(`  Passed Tests:      \x1b[32m${passedTests}\x1b[0m`);
  console.log(`  Failed Tests:      ${failedTests > 0 ? `\x1b[31m${failedTests}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);
  console.log(`  Total Assertions:  ${totalAssertions}`);
  console.log(`  Passed Assertions: \x1b[32m${passedAssertions}\x1b[0m`);
  console.log(`  Failed Assertions: ${failedAssertions > 0 ? `\x1b[31m${failedAssertions}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);
  console.log('------------------------------------------------------------------------');

  if (defects.length === 0) {
    console.log('\x1b[1m\x1b[32mVERDICT: CONFIRMED CORRECT (Zero Defects Found Under Adversarial Stress)\x1b[0m\n');
    return { verdict: 'CONFIRMED CORRECT', totalTests, passedTests, failedTests, totalAssertions, passedAssertions, failedAssertions, defects };
  } else {
    console.log('\x1b[1m\x1b[31mVERDICT: FOUND DEFECT\x1b[0m\n');
    return { verdict: 'FOUND DEFECT', totalTests, passedTests, failedTests, totalAssertions, passedAssertions, failedAssertions, defects };
  }
}

if (require.main === module) {
  runAdversarialSuite().then(res => {
    process.exit(res.failedTests > 0 ? 1 : 0);
  });
}

module.exports = { runAdversarialSuite };
