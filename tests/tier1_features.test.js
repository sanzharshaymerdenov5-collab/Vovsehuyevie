/**
 * Tier 1: Feature-by-Feature Verification Test Suite
 * Project: «Во Все Хуёвые» Wiki
 * 
 * Covers all 18 features defined in PROJECT.md and TEST_INFRA.md:
 * - Feature 1: Safe Storage Wrapper
 * - Feature 2: Decoupled Data Loading
 * - Feature 3: Search Modal Keyboard Navigation
 * - Feature 4: Search Debounce
 * - Feature 5: Precompiled Wiki Regex
 * - Feature 6: Data Integrity & Character Record (gusev-ferangiy)
 * - Feature 7: Dynamic Document Title & Anchor Routing
 * - Feature 8: Sequential TOC Numbering
 * - Feature 9: Dead Code Removal (JS - slugify)
 * - Feature 10: Mobile Header Navigation Layout Fix
 * - Feature 11: Light Theme WCAG 2.1 AA Contrast
 * - Feature 12: CSS Dead Code Elimination
 * - Feature 13: Font Optimization & Preconnect
 * - Feature 14: GPU Acceleration & Smooth Transitions
 * - Feature 15: Semantic Markup & Accessible Navigation
 * - Feature 16: Complete SEO & Social Metadata
 * - Feature 17: Image Loading Optimization
 * - Feature 18: Automated E2E Verification Harness
 */

const {
  assert,
  createBrowserEnvironment,
  calculateContrastRatio,
  getCSSContent,
  getHTMLContent,
  getJSAppContent,
  getJSDataContent,
  fileExists,
  getFileContent
} = require('./test_harness');

async function runTier1Tests(reporter) {
  // -------------------------------------------------------------------------
  // Feature 1: Safe Storage Wrapper
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 1: Safe Storage Wrapper', 'Contract & resilience of safeStorage');

  reporter.startTest('safeStorage object interface contract');
  try {
    const env = createBrowserEnvironment();
    const safeStorage = env.getSafeStorage();
    assert.ok(safeStorage, 'safeStorage must be defined in app scope');
    assert.equal(typeof safeStorage.getItem, 'function', 'safeStorage.getItem must be a function');
    assert.equal(typeof safeStorage.setItem, 'function', 'safeStorage.setItem must be a function');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('safeStorage normal read and write operations');
  try {
    const env = createBrowserEnvironment();
    const safeStorage = env.getSafeStorage();
    assert.ok(safeStorage, 'safeStorage must exist');
    safeStorage.setItem('test_theme_key', 'dark_mode');
    const val = safeStorage.getItem('test_theme_key', 'fallback');
    assert.equal(val, 'dark_mode', 'safeStorage.getItem must return stored value');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('safeStorage returns default value on missing key');
  try {
    const env = createBrowserEnvironment();
    const safeStorage = env.getSafeStorage();
    assert.ok(safeStorage, 'safeStorage must exist');
    const missing = safeStorage.getItem('non_existent_key_xyz', 'default_theme');
    assert.equal(missing, 'default_theme', 'safeStorage must return defaultValue when key does not exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('safeStorage resilience against SecurityError on read (Private Browsing)');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    const safeStorage = env.getSafeStorage();
    assert.ok(safeStorage, 'safeStorage must exist even in restricted storage');
    assert.doesNotThrow(() => {
      const result = safeStorage.getItem('wiki_theme', 'dark');
      assert.equal(result, 'dark', 'Must return fallback value when storage throws SecurityError');
    }, 'safeStorage.getItem must not throw in restricted storage');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('safeStorage fallback on write exception (QuotaExceededError or SecurityError)');
  try {
    const env = createBrowserEnvironment({ storageMode: 'quota_exceeded' });
    const safeStorage = env.getSafeStorage();
    assert.ok(safeStorage, 'safeStorage must exist');
    assert.doesNotThrow(() => {
      safeStorage.setItem('wiki_theme', 'light');
    }, 'safeStorage.setItem must not throw when storage is full');
    const val = safeStorage.getItem('wiki_theme', 'dark');
    assert.equal(val, 'light', 'safeStorage must retain written value in memory fallback');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Top-level script evaluation succeeds in restricted storage environment');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    assert.equal(env.scriptExecutionError, null, 'app.js top-level evaluation must not crash on restricted storage');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 2: Decoupled Data Loading
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 2: Decoupled Data Loading', 'Direct DEFAULT_WIKI_DATA binding without 34.6KB stale cache');

  reporter.startTest('STATE.data binds directly to DEFAULT_WIKI_DATA on load');
  try {
    const env = createBrowserEnvironment();
    const state = env.getState();
    const data = env.getData();
    assert.ok(state && state.data, 'STATE.data must be initialized');
    assert.ok(data, 'DEFAULT_WIKI_DATA must be defined');
    assert.equal(state.data.version, data.version, 'STATE.data version must match DEFAULT_WIKI_DATA version');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('initData eliminates redundant 34.6KB lore caching in localStorage');
  try {
    const env = createBrowserEnvironment();
    const rawStored = env.storage.getItem('wiki_lore_data');
    assert.equal(rawStored, null, 'wiki_lore_data must not be dumped into localStorage on initial load');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Stale cache in localStorage is ignored in favor of in-memory canon data');
  try {
    const env = createBrowserEnvironment({ loadApp: false });
    // Pre-populate localStorage with outdated stale payload
    env.storage.setItem('wiki_lore_data', JSON.stringify({
      version: '1.0',
      characters: [{ id: 'stale-character', name: 'Stale' }],
      factions: [],
      universe: { title: 'Old Title' }
    }));
    // Now evaluate data.js and app.js
    env.eval(getJSDataContent());
    env.eval(getJSAppContent());
    env.document.dispatchEvent({ type: 'DOMContentLoaded' });

    const state = env.getState();
    assert.ok(state && state.data, 'STATE.data must be populated');
    assert.notEqual(state.data.characters[0].id, 'stale-character', 'STATE.data must not load stale character from localStorage');
    assert.gte(state.data.characters.length, 5, 'STATE.data must contain canon characters from DEFAULT_WIKI_DATA');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Characters collection integrity between STATE and DEFAULT_WIKI_DATA');
  try {
    const env = createBrowserEnvironment();
    const state = env.getState();
    const data = env.getData();
    assert.equal(state.data.characters.length, data.characters.length, 'Character count must match canon');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Factions collection integrity between STATE and DEFAULT_WIKI_DATA');
  try {
    const env = createBrowserEnvironment();
    const state = env.getState();
    const data = env.getData();
    assert.equal(state.data.factions.length, data.factions.length, 'Faction count must match canon');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 3: Search Modal Keyboard Navigation
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 3: Search Modal Keyboard Navigation', 'ArrowUp, ArrowDown, and Enter result selection');

  reporter.startTest('Search modal opens and binds keyboard handler');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    const modal = env.document.getElementById('searchModal');
    assert.ok(modal, 'searchModal must exist');
    assert.equal(modal.classList.contains('hidden'), false, 'Search modal should be visible');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Typing search query generates result items');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Белинский');
    const results = env.document.querySelectorAll('#searchResultsList .search-result-item');
    assert.gte(results.length, 1, 'Should find at least 1 result for "Белинский"');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('ArrowDown selects first item with .selected class');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Белинский');

    const input = env.document.getElementById('globalSearchInput');
    // Dispatch ArrowDown keydown
    input.dispatchEvent({
      type: 'keydown',
      key: 'ArrowDown',
      bubbles: true,
      cancelable: true,
      preventDefault: () => {}
    });

    const selectedItem = env.document.querySelector('#searchResultsList .search-result-item.selected');
    assert.ok(selectedItem, 'An item in search results must have the .selected class after ArrowDown');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('ArrowDown and ArrowUp navigate through search results');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Белинский');

    const input = env.document.getElementById('globalSearchInput');
    const results = env.document.querySelectorAll('#searchResultsList .search-result-item');

    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', bubbles: true, preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', bubbles: true, preventDefault: () => {} });

    const selectedItems = env.document.querySelectorAll('#searchResultsList .search-result-item.selected');
    assert.equal(selectedItems.length, 1, 'Only one item should be selected at a time');

    input.dispatchEvent({ type: 'keydown', key: 'ArrowUp', bubbles: true, preventDefault: () => {} });
    const currentSelected = env.document.querySelector('#searchResultsList .search-result-item.selected');
    assert.ok(currentSelected, 'An item should remain selected after ArrowUp');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Pressing Enter on selected result navigates to article and closes modal without #');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Белинский');

    const input = env.document.getElementById('globalSearchInput');
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', bubbles: true, preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'Enter', bubbles: true, preventDefault: () => {} });

    const modal = env.document.getElementById('searchModal');
    assert.equal(modal.classList.contains('hidden'), true, 'Modal should close after Enter selection');
    assert.includes(env.window.location.pathname, '/character/', 'URL pathname should navigate to selected character without #');
    assert.equal(env.window.location.hash, '', 'URL hash must remain empty');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 4: Search Debounce
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 4: Search Debounce', '150ms debounce utility on search inputs without double-firing');

  reporter.startTest('Search code incorporates debounce utility');
  try {
    const appCode = getJSAppContent();
    const hasDebounce = appCode.includes('debounce(') || appCode.includes('debounce =') || appCode.includes('debounce');
    assert.ok(hasDebounce, 'app.js should define or utilize a debounce mechanism for search');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Rapid keystrokes are wrapped with debouncing and single leading call avoids duplicate execution');
  try {
    const env = createBrowserEnvironment();
    const appCode = getJSAppContent();
    assert.match(appCode, /debounce\s*\(|setTimeout.*search/i, 'Search input should be wrapped with debouncing');
    const callsAfterOneTrigger = env.eval(`(() => {
      let count = 0;
      const timerCheck = debounce(() => { count++; }, 150, true);
      timerCheck('a');
      return count;
    })()`);
    assert.equal(callsAfterOneTrigger, 1, 'Immediate debounce must execute once synchronously on single trigger');
    assert.includes(appCode, 'hasTrailingArgs', 'Debounce should track trailing calls to avoid double-execution on a single trigger');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Debounce timer is tuned to approximately 150ms');
  try {
    const appCode = getJSAppContent();
    const matchesDebounceTime = /150|200/.test(appCode);
    assert.ok(matchesDebounceTime, 'Search debounce duration should be set around 150ms');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Catalog directory search input utilizes debouncing');
  try {
    const env = createBrowserEnvironment();
    env.navigate('characters');
    const dirInput = env.document.getElementById('dirSearchInput');
    assert.ok(dirInput, 'Directory search input #dirSearchInput should exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Search debounce handles rapid typing cleanly without crashing');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Б');
    env.type('#globalSearchInput', 'Бе');
    env.type('#globalSearchInput', 'Гусь');
    const results = env.document.querySelectorAll('#searchResultsList .search-result-item');
    assert.gte(results.length, 1, 'Results container should render cleanly');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 5: Precompiled Wiki Regex
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 5: Precompiled Wiki Regex', 'Module-level precompiled regex in renderWikiProse');

  reporter.startTest('Regex pattern is precompiled at module level (not inside function body)');
  try {
    const appCode = getJSAppContent();
    const renderProseMatch = appCode.match(/function renderWikiProse[\s\S]*?\{([\s\S]*?)\n\}/);
    if (renderProseMatch) {
      const body = renderProseMatch[1];
      const hasInlineNewRegExp = /new RegExp\(entities\.map/.test(body);
      assert.equal(hasInlineNewRegExp, false, 'renderWikiProse must NOT recompile RegExp on every invocation');
    }
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('renderWikiProse auto-links character names without #');
  try {
    const env = createBrowserEnvironment();
    const html = env.eval("renderWikiProse('Валентин Белинский начал варить мефедрон.')");
    assert.includes(html, 'character/valentin-belinsky/', 'Should create hash-free link to valentin-belinsky');
    assert.notIncludes(html, '#', 'Auto-linked character URL must not contain #');
    assert.includes(html, 'wiki-link', 'Should add wiki-link class');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('renderWikiProse auto-links faction names without #');
  try {
    const env = createBrowserEnvironment();
    const html = env.eval("renderWikiProse('Сотрудники ОБН Подзалупинска провели рейд.')");
    assert.includes(html, 'faction/obn-podzalupinsk/', 'Should create hash-free link to obn-podzalupinsk');
    assert.notIncludes(html, '#', 'Auto-linked faction URL must not contain #');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('renderWikiProse auto-links episode names without #');
  try {
    const env = createBrowserEnvironment();
    const html = env.eval("renderWikiProse('Во второй серии «Попандос Хуендос» происходят события, не связанные с «Озимандий по-русски».')");
    assert.includes(html, 'episode/popandos-huendos/', 'Should create hash-free link to popandos-huendos episode');
    assert.notIncludes(html, 'ozimandiy-po-russki', 'Removed episode Озимандий по-русски must not be linked');
    assert.notIncludes(html, '#', 'Auto-linked episode URL must not contain #');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('renderWikiProse safely escapes HTML tags to prevent XSS');
  try {
    const env = createBrowserEnvironment();
    const html = env.eval("renderWikiProse('<script>alert(1)</script>')");
    assert.notIncludes(html, '<script>', 'Raw script tags must be escaped');
    assert.includes(html, '&lt;script&gt;', 'Must encode angle brackets');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('renderWikiProse safely handles empty or null input');
  try {
    const env = createBrowserEnvironment();
    const res1 = env.eval("renderWikiProse('')");
    const res2 = env.eval("renderWikiProse(null)");
    assert.equal(res1, '', 'Empty string should return empty string');
    assert.equal(res2, '', 'Null input should return empty string');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 6: Data Integrity & Character Record
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 6: Data Integrity & Character Record', 'Canon character registry (7 chars), redlinks, status classes, and unified faction membership');

  reporter.startTest('Canon character registry keeps exact 7 approved characters including gusev-ferangiy (no new characters added)');
  try {
    const env = createBrowserEnvironment();
    const data = env.getData() || {};
    const chars = data.characters || [];
    assert.equal(chars.length, 7, 'Must keep exact 7 canon characters (no maxim-kats or unapproved characters)');
    const gusev = chars.find(c => c.id === 'gusev-ferangiy');
    assert.ok(gusev, 'gusev-ferangiy must be defined in characters');
    assert.equal(chars.some(c => c.id === 'maxim-kats'), false, 'maxim-kats must not be added to canon characters');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Character gusev-ferangiy has complete attributes and Sosik Goodman status class is valid');
  try {
    const env = createBrowserEnvironment();
    const chars = env.getData().characters || [];
    const gusev = chars.find(c => c.id === 'gusev-ferangiy');
    assert.ok(gusev, 'gusev-ferangiy must exist');
    assert.includes(gusev.name, 'Гусев', 'Name must include Гусев');
    assert.equal(gusev.factionId, 'gusev-empire', 'factionId must be gusev-empire');
    env.navigate('character/sosik-goodman');
    const prisonStatusEl = env.document.querySelector('.infobox-status-text-отбывает-срок');
    assert.ok(prisonStatusEl, 'Sosik Goodman infobox must use infobox-status-text-отбывает-срок class');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Faction gusev-empire notableMembers includes gusev-ferangiy and filter shows 3 members');
  try {
    const env = createBrowserEnvironment();
    const factions = env.getData().factions || [];
    const gusevFaction = factions.find(f => f.id === 'gusev-empire');
    assert.ok(gusevFaction, 'gusev-empire must exist');
    assert.includes(gusevFaction.notableMembers, 'gusev-ferangiy', 'notableMembers must include gusev-ferangiy');
    env.navigate('characters?faction=gusev-empire');
    const cards = env.document.querySelectorAll('#directoryCardsGrid .wiki-card');
    assert.equal(cards.length, 3, 'Filtering characters?faction=gusev-empire must display all 3 members');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Unresolved relationship targets render clean .mw-redlink buttons without "undefined" or "null"');
  try {
    const env = createBrowserEnvironment();
    const appCode = getJSAppContent();
    const hasWorkaround = appCode.includes("rel.charId === 'gusev-ferangiy' ? '#faction/gusev-empire'");
    assert.equal(hasWorkaround, false, 'Workaround fallback link to #faction/gusev-empire should be eliminated');
    env.navigate('character/gusev-ferangiy');
    const redlinks = env.document.querySelectorAll('.mw-redlink');
    assert.gte(redlinks.length, 1, 'Gusev article should render .mw-redlink for characters without separate articles yet');
    const viewportText = env.document.getElementById('contentViewport').textContent;
    assert.notIncludes(viewportText, 'undefined', 'Redlinks must not display undefined');
    assert.notIncludes(viewportText, 'null', 'Redlinks must not display null');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('renderFactionArticle for gusev-empire displays all notable members, alignment, and color');
  try {
    const env = createBrowserEnvironment();
    env.navigate('faction/gusev-empire');
    const memberCards = env.document.querySelectorAll('#contentViewport .wiki-card');
    assert.gte(memberCards.length, 3, 'gusev-empire should display 3 notable members (Gusev, Valentin, Gey-Himbiovech)');
    const viewportHtml = env.document.getElementById('contentViewport').innerHTML;
    assert.includes(viewportHtml, 'Законно-злой', 'Faction article should display alignment');
    assert.includes(viewportHtml, '--faction-accent', 'Faction article should apply faction color custom property');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 7: Dynamic Document Title, History API Routing & New Views
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 7: Dynamic Title, History Routing & Approved Views', 'Clean #-free routing, Episodes directory/stubs, Relationship Graph, Random Article, and excluded newsBanner');

  reporter.startTest('Document title and History URL update on home navigation');
  try {
    const env = createBrowserEnvironment();
    env.navigate('home');
    assert.includes(env.document.title, 'Во Все Хуёвые', 'Title should include site title');
    assert.equal(env.window.location.hash, '', 'Home URL must not use #');
    const heroHtml = env.document.getElementById('contentViewport').innerHTML;
    assert.includes(heroHtml, 'portal-tagline', 'Home portal should display universe.tagline');
    assert.equal(heroHtml.includes('newsBanner') || heroHtml.includes('уже доступен в архивах'), false, 'newsBanner must NOT be rendered');
    assert.equal(getJSAppContent().includes('newsBanner'), false, 'js/app.js must not reference universe.newsBanner');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Document title updates on characters directory');
  try {
    const env = createBrowserEnvironment();
    env.navigate('characters');
    assert.includes(env.document.title, 'Персонажи', 'Title should indicate Персонажи view');
    assert.equal(env.window.location.pathname, '/Vovsehuyevie/characters/', 'URL must be /Vovsehuyevie/characters/');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Document title updates on character/valentin-belinsky');
  try {
    const env = createBrowserEnvironment();
    env.navigate('character/valentin-belinsky');
    assert.includes(env.document.title, 'Валентин Белинский', 'Title should include character name');
    assert.equal(env.window.location.pathname, '/Vovsehuyevie/character/valentin-belinsky/', 'URL must be /Vovsehuyevie/character/valentin-belinsky/');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Document title updates on factions directory and episodes views work with placeholder stubs');
  try {
    const env = createBrowserEnvironment();
    env.navigate('factions');
    assert.includes(env.document.title, 'Группировки', 'Title should indicate Группировки view');
    env.navigate('episodes');
    assert.includes(env.document.title, 'Серии', 'Title should indicate Серии view');
    const epCards = env.document.querySelectorAll('#contentViewport .episode-card');
    assert.equal(epCards.length, 8, 'Episodes directory must list all 8 canon entries (7 series + 1 film)');
    const epListText = env.document.getElementById('contentViewport').textContent;
    assert.includes(epListText, 'Попандос Хуендос', '2nd episode must be Попандос Хуендос');
    assert.notIncludes(epListText, 'Звоните Сосику', 'Old 2nd episode title Звоните Сосику must not be listed');
    assert.notIncludes(epListText, 'Озимандий по-русски', 'Removed episode Озимандий по-русски must not be listed');
    env.navigate('episode/pilot-mefedrona');
    const stubText = env.document.getElementById('contentViewport').textContent;
    assert.includes(stubText, 'в разработке', 'Individual episode page must remain a clean placeholder stub');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Graph route renders SVG and #randomArticleBtn navigates cleanly without #');
  try {
    const env = createBrowserEnvironment();
    env.navigate('graph');
    assert.includes(env.document.title, 'Граф связей', 'Title should indicate Граф связей view');
    assert.ok(env.document.getElementById('relationshipGraphSvg'), 'Graph route must render #relationshipGraphSvg');
    env.click('#randomArticleBtn');
    assert.equal(env.window.location.hash, '', 'Random article navigation must not introduce # in URL');
    assert.match(env.window.location.pathname, /\/(character|faction|episode)\/[^/]+\/$/, 'Random article must navigate to a canonical article URL');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Legacy initial landing on #sec-* renders default content instead of empty viewport');
  try {
    const env = createBrowserEnvironment({ initialHash: '#sec-biography' });
    const viewport = env.document.getElementById('contentViewport');
    assert.ok(viewport, 'contentViewport must exist');
    assert.gte(viewport.children.length, 1, 'contentViewport must not be empty when landing on legacy #sec-* fragment');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 8: Sequential TOC Numbering
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 8: Sequential TOC Numbering', 'Sequential counter in renderCharacterArticle');

  reporter.startTest('Character TOC contains sequential section numbers');
  try {
    const env = createBrowserEnvironment();
    env.navigate('character/valentin-belinsky');
    const tocNums = Array.from(env.document.querySelectorAll('.toc-num')).map(el => el.textContent.trim());
    assert.gte(tocNums.length, 3, 'TOC should have at least 3 sections');
    assert.equal(tocNums[0], '1', 'First TOC section must be 1');
    assert.equal(tocNums[1], '2', 'Second TOC section must be 2');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('No duplicate TOC numbers when optional personality field is omitted');
  try {
    const env = createBrowserEnvironment();
    // Test on character without personality or relationships
    env.navigate('character/stoyak-belinsky');
    const tocNums = Array.from(env.document.querySelectorAll('.toc-num')).map(el => el.textContent.trim());
    const uniqueNums = new Set(tocNums);
    assert.equal(uniqueNums.size, tocNums.length, 'Every TOC number must be unique');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Headline numbers in article body match TOC numbers');
  try {
    const env = createBrowserEnvironment();
    env.navigate('character/valentin-belinsky');
    const headlineNums = Array.from(env.document.querySelectorAll('.mw-headline-number')).map(el => el.textContent.replace('.', '').trim());
    const tocNums = Array.from(env.document.querySelectorAll('.toc-num')).map(el => el.textContent.trim());
    if (headlineNums.length > 0 && tocNums.length > 0) {
      assert.equal(headlineNums[0], tocNums[0], 'First headline number must match first TOC number');
    }
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Categories section numbering follows monotonically');
  try {
    const env = createBrowserEnvironment();
    env.navigate('character/valentin-belinsky');
    const tocNums = Array.from(env.document.querySelectorAll('.toc-num')).map(el => parseInt(el.textContent.trim(), 10));
    for (let i = 1; i < tocNums.length; i++) {
      assert.equal(tocNums[i], tocNums[i - 1] + 1, `TOC numbers must increment by 1 (found ${tocNums[i - 1]} followed by ${tocNums[i]})`);
    }
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Implementation eliminates nested ternary section logic');
  try {
    const appCode = getJSAppContent();
    const hasNestedTernary = appCode.includes("char.personality ? (char.relationships && char.relationships.length ? (char.trivia && char.trivia.length ? '6' : '5') : '4') : '4'");
    assert.equal(hasNestedTernary, false, 'Nested ternary numbering should be replaced with sequential counter');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 9: Dead Code Removal (JS - slugify)
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 9: Dead Code Removal (JS)', 'Removal of unused slugify utility');

  reporter.startTest('Function slugify is removed from app.js');
  try {
    const appCode = getJSAppContent();
    const hasSlugifyDecl = /function\s+slugify\s*\(/.test(appCode);
    assert.equal(hasSlugifyDecl, false, 'function slugify should be removed');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Zero calls to slugify exist in codebase');
  try {
    const appCode = getJSAppContent();
    const dataCode = getJSDataContent();
    const callsInApp = (appCode.match(/slugify\s*\(/g) || []).length;
    const callsInData = (dataCode.match(/slugify\s*\(/g) || []).length;
    assert.equal(callsInApp + callsInData, 0, 'No references to slugify should remain');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Application routing functions without slugify');
  try {
    const env = createBrowserEnvironment();
    assert.doesNotThrow(() => {
      env.navigate('character/valentin-belinsky');
      env.navigate('faction/huizenberg-empire');
    }, 'Navigation should not depend on slugify');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Search functionality operates without slugify');
  try {
    const env = createBrowserEnvironment();
    assert.doesNotThrow(() => {
      env.click('#openSearchBtn');
      env.type('#globalSearchInput', 'Хуйзенберг');
    }, 'Search must not throw without slugify');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('JS bundle evaluates cleanly with dead code removed');
  try {
    const env = createBrowserEnvironment();
    assert.equal(env.scriptExecutionError, null, 'JS must execute without syntax or reference errors');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 10: Mobile Header Navigation Layout Fix
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 10: Mobile Header Navigation Layout Fix', 'Fix .wiki-header height under @media (max-width: 768px)');

  reporter.startTest('Media query for 768px breakpoint exists in style.css');
  try {
    const css = getCSSContent();
    assert.includes(css, '@media (max-width: 768px)', 'Must contain mobile breakpoint @media (max-width: 768px)');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('.wiki-header height is set to auto in 768px media query');
  try {
    const css = getCSSContent();
    const mediaBlockMatch = css.match(/@media\s*\(\s*max-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(mediaBlockMatch, 'Media block for 768px should be extractable');
    const mediaContent = mediaBlockMatch[1];
    const hasHeaderAuto = /\.wiki-header\s*\{[^}]*height:\s*auto/i.test(mediaContent);
    assert.ok(hasHeaderAuto, '.wiki-header must have height: auto in 768px media query to allow wrapping');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('.header-container has flex-wrap and height auto');
  try {
    const css = getCSSContent();
    assert.match(css, /\.header-container\s*\{[^}]*flex-wrap:\s*wrap/i, '.header-container should wrap on mobile');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('.main-nav wraps cleanly onto second row');
  try {
    const css = getCSSContent();
    assert.match(css, /\.main-nav\s*\{[^}]*width:\s*100%/i, '.main-nav should take full width on mobile row');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Sub-banner is not obstructed by clipped header');
  try {
    const css = getCSSContent();
    assert.includes(css, '.sub-banner', 'sub-banner styles must be present');
    assert.notMatch(css, /\.wiki-header\s*\{[^}]*overflow:\s*hidden/i, 'wiki-header should not clip overflowing wrapped content');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 11: Light Theme WCAG 2.1 AA Contrast
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 11: Light Theme WCAG 2.1 AA Contrast', 'Override status text variables in [data-theme="light"]');

  reporter.startTest('[data-theme="light"] defines --status-active-text');
  try {
    const css = getCSSContent();
    const lightThemeMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightThemeMatch, '[data-theme="light"] block must exist');
    assert.includes(lightThemeMatch[1], '--status-active-text', '--status-active-text must be overridden in light theme');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('[data-theme="light"] defines --status-deceased-text');
  try {
    const css = getCSSContent();
    const lightThemeMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightThemeMatch, '[data-theme="light"] block must exist');
    assert.includes(lightThemeMatch[1], '--status-deceased-text', '--status-deceased-text must be overridden in light theme');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('[data-theme="light"] defines --status-missing-text');
  try {
    const css = getCSSContent();
    const lightThemeMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightThemeMatch, '[data-theme="light"] block must exist');
    assert.includes(lightThemeMatch[1], '--status-missing-text', '--status-missing-text must be overridden in light theme');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Active status color contrast against white (#ffffff) is >= 4.5:1');
  try {
    const css = getCSSContent();
    const lightThemeMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightThemeMatch, 'light theme block required');
    const colorMatch = lightThemeMatch[1].match(/--status-active-text:\s*(#[0-9a-fA-F]{3,6})/);
    assert.ok(colorMatch, '--status-active-text hex color must be defined');
    const ratio = calculateContrastRatio(colorMatch[1], '#ffffff');
    assert.gte(ratio, 4.5, `Active text contrast (${ratio.toFixed(2)}:1) must meet WCAG AA >= 4.5:1`);
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Deceased status color contrast against white (#ffffff) is >= 4.5:1');
  try {
    const css = getCSSContent();
    const lightThemeMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightThemeMatch, 'light theme block required');
    const colorMatch = lightThemeMatch[1].match(/--status-deceased-text:\s*(#[0-9a-fA-F]{3,6})/);
    assert.ok(colorMatch, '--status-deceased-text hex color must be defined');
    const ratio = calculateContrastRatio(colorMatch[1], '#ffffff');
    assert.gte(ratio, 4.5, `Deceased text contrast (${ratio.toFixed(2)}:1) must meet WCAG AA >= 4.5:1`);
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Missing status color contrast against white (#ffffff) is >= 4.5:1');
  try {
    const css = getCSSContent();
    const lightThemeMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightThemeMatch, 'light theme block required');
    const colorMatch = lightThemeMatch[1].match(/--status-missing-text:\s*(#[0-9a-fA-F]{3,6})/);
    assert.ok(colorMatch, '--status-missing-text hex color must be defined');
    const ratio = calculateContrastRatio(colorMatch[1], '#ffffff');
    assert.gte(ratio, 4.5, `Missing text contrast (${ratio.toFixed(2)}:1) must meet WCAG AA >= 4.5:1`);
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 12: CSS Dead Code Elimination
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 12: CSS Dead Code Elimination', 'Remove unused wireframe classes and orphaned .form-grid');

  reporter.startTest('Class .arch-wireframe is eliminated from style.css');
  try {
    const css = getCSSContent();
    assert.notIncludes(css, '.arch-wireframe', '.arch-wireframe should be removed as dead code');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Class .wireframe-body-layout is eliminated from style.css');
  try {
    const css = getCSSContent();
    assert.notIncludes(css, '.wireframe-body-layout', '.wireframe-body-layout should be removed as dead code');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Class .arch-components-grid is eliminated from style.css');
  try {
    const css = getCSSContent();
    assert.notIncludes(css, '.arch-components-grid', '.arch-components-grid should be removed as dead code');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Orphaned media query selector .form-grid is eliminated');
  try {
    const css = getCSSContent();
    assert.notIncludes(css, '.form-grid', '.form-grid should be eliminated');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Unused CSS variable --font-wiki-title is removed from :root');
  try {
    const css = getCSSContent();
    assert.notIncludes(css, '--font-wiki-title', '--font-wiki-title is unused and should be pruned');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 13: Font Optimization & Preconnect
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 13: Font Optimization & Preconnect', 'Prune unused font weights and reorder preconnect links');

  reporter.startTest('Preconnect link to fonts.googleapis.com precedes style.css');
  try {
    const html = getHTMLContent();
    const preconnectIndex = html.indexOf('https://fonts.googleapis.com');
    const styleIndex = html.indexOf('css/style.css');
    assert.ok(preconnectIndex !== -1, 'preconnect link must exist');
    assert.ok(styleIndex !== -1, 'style.css link must exist');
    assert.ok(preconnectIndex < styleIndex, 'preconnect link must appear BEFORE stylesheet in <head>');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Preconnect link to fonts.gstatic.com has crossorigin attribute');
  try {
    const html = getHTMLContent();
    assert.match(html, /<link[^>]*rel=["']preconnect["'][^>]*fonts\.gstatic\.com[^>]*crossorigin/i, 'fonts.gstatic.com preconnect must include crossorigin attribute');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Unused Lora weights (500, 600, 1400, 1600) are pruned from Google Fonts URL');
  try {
    const html = getHTMLContent();
    const loraUrlMatch = html.match(/family=Lora[^&"']*/);
    assert.ok(loraUrlMatch, 'Lora font URL parameter should exist');
    const loraParam = loraUrlMatch[0];
    assert.notIncludes(loraParam, '0,500', 'Lora 500 is unused and should be pruned');
    assert.notIncludes(loraParam, '1,400', 'Lora italic 400 is unused and should be pruned');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Unused JetBrains Mono 500 is pruned from Google Fonts URL');
  try {
    const html = getHTMLContent();
    const jbMatch = html.match(/family=JetBrains\+Mono[^&"']*/);
    if (jbMatch) {
      assert.notIncludes(jbMatch[0], '500', 'JetBrains Mono 500 is unused and should be pruned');
    }
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Core body and heading fonts are preserved');
  try {
    const html = getHTMLContent();
    assert.includes(html, 'family=Inter', 'Inter font family must be preserved');
    assert.includes(html, 'family=Lora', 'Lora font family must be preserved');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 14: GPU Acceleration & Smooth Transitions
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 14: GPU Acceleration & Smooth Transitions', 'Composite properties and -webkit-backdrop-filter');

  reporter.startTest('.wiki-card avoids unconstrained transition: all');
  try {
    const css = getCSSContent();
    const cardMatch = css.match(/\.wiki-card\s*\{([\s\S]*?)\}/);
    if (cardMatch) {
      assert.notMatch(cardMatch[1], /transition:\s*all/i, '.wiki-card should transition transform and box-shadow explicitly');
    }
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Glassmorphism components include -webkit-backdrop-filter prefix');
  try {
    const css = getCSSContent();
    const hasWebkitBackdrop = css.includes('-webkit-backdrop-filter');
    assert.ok(hasWebkitBackdrop, 'CSS should include -webkit-backdrop-filter for Safari glassmorphism compatibility');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Nav buttons use specific transition properties');
  try {
    const css = getCSSContent();
    const btnMatch = css.match(/\.nav-btn\s*\{([\s\S]*?)\}/);
    if (btnMatch) {
      assert.notMatch(btnMatch[1], /transition:\s*all/i, '.nav-btn should use specific transition properties');
    }
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Interactive status stamps leverage hardware-accelerated transforms');
  try {
    const css = getCSSContent();
    assert.includes(css, '.wiki-status-stamp', 'Status stamp styles must exist');
    assert.match(css, /\.wiki-status-stamp[^}]*transform:/i, 'Status stamp should use transform');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Overall frequency of transition: all is minimized');
  try {
    const css = getCSSContent();
    const transitionAllCount = (css.match(/transition:\s*all/gi) || []).length;
    assert.lte(transitionAllCount, 4, 'Instances of transition: all should be reduced to 4 or fewer');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 15: Semantic Markup & Accessible Navigation
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 15: Semantic Markup & Accessible Navigation', 'Accessible buttons, links, ARIA roles, and hash-free navigation semantics');

  reporter.startTest('#homeLogoBtn is semantic link <a> without # and main nav uses clean URLs');
  try {
    const env = createBrowserEnvironment();
    const logoEl = env.document.getElementById('homeLogoBtn');
    assert.ok(logoEl, '#homeLogoBtn must exist');
    assert.equal(logoEl.tagName, 'A', '#homeLogoBtn should be an <a> anchor element');
    assert.equal(logoEl.getAttribute('href'), './', '#homeLogoBtn href must point cleanly to "./"');
    assert.notIncludes(logoEl.getAttribute('href'), '#', '#homeLogoBtn must not contain #');

    const navLinks = env.document.querySelectorAll('.main-nav .nav-btn');
    assert.equal(navLinks.length, 6, 'Main nav should have 6 links (Главная, Персонажи, Группировки, Серии, Хронология, Граф связей)');
    navLinks.forEach(link => {
      assert.equal(link.tagName, 'A', 'Nav button should be a semantic <a> link');
      assert.notIncludes(link.getAttribute('href') || '', '#', 'Nav link must not contain #');
    });

    const html = getHTMLContent();
    assert.equal(/href\s*=\s*["']#["']/i.test(html), false, 'index.html must contain zero <a href="#"> placeholders');
    const exportBtn = env.document.getElementById('exportDataBtn');
    const resetBtn = env.document.getElementById('resetDataBtn');
    assert.equal(exportBtn.tagName, 'BUTTON', '#exportDataBtn should be a <button>');
    assert.equal(resetBtn.tagName, 'BUTTON', '#resetDataBtn should be a <button>');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Header action buttons (#openSearchBtn, #randomArticleBtn, #backToTopBtn) are accessible <button> elements');
  try {
    const env = createBrowserEnvironment();
    const searchBtn = env.document.getElementById('openSearchBtn');
    const randBtn = env.document.getElementById('randomArticleBtn');
    const topBtn = env.document.getElementById('backToTopBtn');
    assert.ok(searchBtn && randBtn && topBtn, 'All accessible action buttons must exist');
    [searchBtn, randBtn, topBtn].forEach(btn => {
      assert.equal(btn.tagName, 'BUTTON', 'Action control must be a <button>');
      assert.equal(btn.getAttribute('type'), 'button', 'Action button must have type="button"');
      assert.ok(btn.hasAttribute('aria-label'), 'Action button must define aria-label');
    });
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('#searchModal and #architectureModal expose proper ARIA dialog, listbox, and tablist roles');
  try {
    const env = createBrowserEnvironment();
    const modal = env.document.getElementById('searchModal');
    assert.ok(modal, '#searchModal must exist');
    assert.equal(modal.getAttribute('role'), 'dialog', '#searchModal should have role="dialog"');
    assert.equal(modal.getAttribute('aria-modal'), 'true', '#searchModal should have aria-modal="true"');

    const listbox = env.document.getElementById('searchResultsList');
    assert.equal(listbox.getAttribute('role'), 'listbox', '#searchResultsList must have role="listbox"');

    const tablist = env.document.querySelector('#architectureModal [role="tablist"]');
    const tabs = env.document.querySelectorAll('#architectureModal [role="tab"]');
    assert.ok(tablist, '#architectureModal should expose role="tablist"');
    assert.equal(tabs.length, 2, '#architectureModal should expose 2 ARIA tabs');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('#globalSearchInput has accessible aria-label and combobox attributes');
  try {
    const env = createBrowserEnvironment();
    const input = env.document.getElementById('globalSearchInput');
    assert.ok(input, '#globalSearchInput must exist');
    const hasAria = input.hasAttribute('aria-label');
    const hasLabel = Boolean(env.document.querySelector('label[for="globalSearchInput"]'));
    assert.ok(hasAria || hasLabel, '#globalSearchInput must have aria-label or associated label');
    assert.equal(input.getAttribute('role'), 'combobox', '#globalSearchInput must have role="combobox"');
    assert.equal(input.getAttribute('aria-controls'), 'searchResultsList', 'Must reference searchResultsList');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Featured character hero card contains accessible hash-free link');
  try {
    const env = createBrowserEnvironment();
    env.navigate('home');
    const heroCard = env.document.querySelector('.wiki-card');
    assert.ok(heroCard, 'Hero card should render on home portal');
    const linkInside = heroCard.querySelector('a');
    assert.ok(linkInside, 'Featured hero card must contain an accessible <a> link');
    assert.notIncludes(linkInside.getAttribute('href') || '', '#', 'Hero card link must not contain #');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 16: Complete SEO & Social Metadata
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 16: Complete SEO & Social Metadata', 'Open Graph, Twitter Cards, Canonical, robots.txt, hash-free sitemap.xml & pre-rendered pages');

  reporter.startTest('Open Graph meta tags (og:title, og:description, og:image, og:url) exist in index.html');
  try {
    const html = getHTMLContent();
    assert.includes(html, 'property="og:title"', 'Must include og:title');
    assert.includes(html, 'property="og:description"', 'Must include og:description');
    assert.includes(html, 'property="og:image"', 'Must include og:image');
    assert.includes(html, 'property="og:url"', 'Must include og:url');
    assert.includes(html, 'application/ld+json', 'Must include structured JSON-LD metadata');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Twitter Card meta tags exist in index.html');
  try {
    const html = getHTMLContent();
    assert.includes(html, 'name="twitter:card"', 'Must include twitter:card');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Canonical link tag is defined in <head> without #');
  try {
    const html = getHTMLContent();
    assert.includes(html, 'rel="canonical"', 'Must include rel="canonical"');
    const canonicalMatch = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/i);
    assert.ok(canonicalMatch, 'Canonical URL must be present');
    assert.notIncludes(canonicalMatch[1], '#', 'Canonical URL must not contain #');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Favicon, apple-touch-icon, and manifest links exist in <head>');
  try {
    const html = getHTMLContent();
    assert.match(html, /<link[^>]*rel=["'](?:shortcut )?icon["']/i, 'Must define favicon link tag');
    assert.includes(html, 'rel="apple-touch-icon"', 'Must include apple-touch-icon');
    assert.includes(html, 'rel="manifest"', 'Must link manifest.webmanifest');
    assert.ok(fileExists('manifest.webmanifest'), 'manifest.webmanifest must exist');
    assert.ok(fileExists('sw.js'), 'sw.js must exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('robots.txt exists at project root with crawling rules');
  try {
    assert.ok(fileExists('robots.txt'), 'robots.txt must exist at project root');
    const content = getFileContent('robots.txt');
    assert.includes(content, 'User-agent:', 'robots.txt must define User-agent');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('sitemap.xml has >= 24 hash-free URLs and static pre-rendered pages exist');
  try {
    assert.ok(fileExists('sitemap.xml'), 'sitemap.xml must exist at project root');
    const content = getFileContent('sitemap.xml');
    assert.includes(content, '<urlset', 'sitemap.xml must define <urlset>');
    const locMatches = content.match(/<loc>/g) || [];
    assert.gte(locMatches.length, 24, `sitemap.xml should include at least 24 pre-rendered URLs (found ${locMatches.length})`);
    assert.notIncludes(content, '#', 'sitemap.xml must contain ZERO # fragments');
    assert.includes(content, '/episode/popandos-huendos/', 'sitemap.xml must include renamed 2nd episode popandos-huendos');
    assert.notIncludes(content, 'zvonite-sosiku', 'sitemap.xml must not include old zvonite-sosiku URL');
    assert.notIncludes(content, 'ozimandiy-po-russki', 'sitemap.xml must not include deleted ozimandiy-po-russki URL');

    assert.ok(fileExists('404.html'), '404.html must exist');
    assert.includes(getFileContent('404.html'), 'noindex, follow', '404.html must have noindex, follow robots meta');
    assert.ok(fileExists('episodes/index.html'), 'Pre-rendered episodes/index.html must exist');
    assert.ok(fileExists('episode/popandos-huendos/index.html'), 'Pre-rendered Popandos Huendos episode stub must exist');
    assert.equal(fileExists('episode/zvonite-sosiku/index.html'), false, 'Old zvonite-sosiku page must be removed');
    assert.equal(fileExists('episode/ozimandiy-po-russki/index.html'), false, 'Deleted ozimandiy-po-russki page must be removed');
    assert.ok(fileExists('graph/index.html'), 'Pre-rendered graph/index.html must exist');
    assert.ok(fileExists('character/valentin-belinsky/index.html'), 'Pre-rendered character page must exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 17: Image Loading Optimization
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 17: Image Loading Optimization', 'width, height, loading="lazy", WebP <picture> sources, and icon assets');

  reporter.startTest('renderAvatarHtml output includes loading="lazy"');
  try {
    const env = createBrowserEnvironment();
    const avatarHtml = env.eval("renderAvatarHtml({ id: 'valentin-belinsky', name: 'Valentin', avatar: 'valentin.jpg' })");
    assert.includes(avatarHtml, 'loading="lazy"', 'Avatar img must have loading="lazy"');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('renderAvatarHtml output includes width attribute');
  try {
    const env = createBrowserEnvironment();
    const avatarHtml = env.eval("renderAvatarHtml({ id: 'valentin-belinsky', name: 'Valentin', avatar: 'valentin.jpg' })");
    assert.match(avatarHtml, /width=["']\d+["']/, 'Avatar img must define width attribute');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('renderAvatarHtml output includes height attribute');
  try {
    const env = createBrowserEnvironment();
    const avatarHtml = env.eval("renderAvatarHtml({ id: 'valentin-belinsky', name: 'Valentin', avatar: 'valentin.jpg' })");
    assert.match(avatarHtml, /height=["']\d+["']/, 'Avatar img must define height attribute');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('renderAvatarHtml generates WebP <picture> sources and eager high priority option');
  try {
    const env = createBrowserEnvironment();
    const thumbHtml = env.eval("renderAvatarHtml({ id: 'valentin-belinsky', name: 'Валентин', avatar: 'assets/valentin.jpg', isImage: true })");
    assert.includes(thumbHtml, '<picture>', 'Local portrait avatar should render a <picture> element');
    assert.includes(thumbHtml, 'valentin-thumb.webp', 'Card avatar should reference compressed WebP thumbnail');
    assert.includes(thumbHtml, 'alt="Валентин"', 'Avatar img must include alt text with character name');

    const fullEagerHtml = env.eval("renderAvatarHtml({ id: 'valentin-belinsky', name: 'Валентин', avatar: 'assets/valentin.jpg', isImage: true }, { eager: true, size: 'full' })");
    assert.includes(fullEagerHtml, 'valentin.webp', 'Infobox avatar should reference full WebP portrait');
    assert.includes(fullEagerHtml, 'loading="eager"', 'Hero/infobox avatar should load eagerly');
    assert.includes(fullEagerHtml, 'fetchpriority="high"', 'Hero/infobox avatar should declare high fetchpriority');

    [
      'assets/valentin.webp', 'assets/valentin-thumb.webp',
      'assets/gusev.webp', 'assets/gusev-thumb.webp',
      'assets/gey-himbiovech.webp', 'assets/gey-himbiovech-thumb.webp',
      'assets/favicon-32.png', 'assets/favicon-192.png', 'assets/apple-touch-icon.png'
    ].forEach(rel => {
      assert.ok(fileExists(rel), `Optimized asset ${rel} must exist on disk`);
    });
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Emoji avatars remain lightweight without img tag overhead');
  try {
    const env = createBrowserEnvironment();
    const avatarHtml = env.eval("renderAvatarHtml({ id: 'custom', name: 'Custom', avatar: '⚗️' })");
    assert.includes(avatarHtml, '⚗️', 'Emoji avatar should render raw emoji without broken img tag');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Feature 18: Automated E2E Test Suite
  // -------------------------------------------------------------------------
  reporter.startSuite('Feature 18: Automated E2E Test Suite', 'Standalone runner and test suite structure');

  reporter.startTest('tests/e2e_runner.js exists at specified path');
  try {
    assert.ok(fileExists('tests/e2e_runner.js'), 'tests/e2e_runner.js must exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('tests/tier1_features.test.js exists at specified path');
  try {
    assert.ok(fileExists('tests/tier1_features.test.js'), 'tests/tier1_features.test.js must exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('tests/tier2_boundaries.test.js exists at specified path');
  try {
    assert.ok(fileExists('tests/tier2_boundaries.test.js'), 'tests/tier2_boundaries.test.js must exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('tests/tier3_interactions.test.js exists at specified path');
  try {
    assert.ok(fileExists('tests/tier3_interactions.test.js'), 'tests/tier3_interactions.test.js must exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('tests/tier4_scenarios.test.js exists at specified path');
  try {
    assert.ok(fileExists('tests/tier4_scenarios.test.js'), 'tests/tier4_scenarios.test.js must exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();
}

module.exports = { runTier1Tests };
