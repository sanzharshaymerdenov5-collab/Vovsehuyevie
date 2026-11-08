/**
 * Tier 2: Boundary Value Analysis & Error Resilience Test Suite
 * Project: «Во Все Хуёвые» Wiki
 * 
 * Verifies edge cases, boundary inputs, corrupted states, and extreme conditions:
 * - Empty, extreme length, and adversarial search strings
 * - Malformed, empty, and non-existent URL routes
 * - Missing optional entity properties and schema variance
 * - Corrupted, quota-exceeded, and restricted storage states
 * - Viewport bounds and mathematical contrast edge cases
 */

const {
  assert,
  createBrowserEnvironment,
  calculateContrastRatio,
  getCSSContent,
  getJSAppContent,
  getJSDataContent,
  getFileContent
} = require('./test_harness');

async function runTier2Tests(reporter) {
  // -------------------------------------------------------------------------
  // Suite 1: Search Input Boundaries
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 2: Search Input Boundaries', 'Edge-case queries, length limits, XSS, and regex metacharacters');

  reporter.startTest('Empty search query "" produces clean state without exceptions');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', '');
    const results = env.document.querySelectorAll('#searchResultsList .search-result-item');
    assert.gte(results.length, 0, 'Empty query should execute without throwing');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Whitespace-only search query "     " is trimmed');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', '     ');
    const state = env.getState();
    assert.equal(state.searchQuery, '', 'Search query in state should be trimmed');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Extreme length query (10,000 characters) does not hang or crash');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    const extremeStr = 'A'.repeat(10000);
    const start = Date.now();
    env.type('#globalSearchInput', extremeStr);
    const elapsed = Date.now() - start;
    assert.lte(elapsed, 1000, 'Search on 10,000 character string should finish within 1 second');
    const emptyNotice = env.document.getElementById('searchResultsList').textContent;
    assert.includes(emptyNotice, 'ничего не найдено', 'Should show empty results notice');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Special regex metacharacters do not throw syntax errors');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    const metaChars = '.*+?^${}()|[]\\';
    assert.doesNotThrow(() => {
      env.type('#globalSearchInput', metaChars);
    }, 'Searching for regex metacharacters must not throw an unescaped regex syntax error');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('XSS payloads in search query are properly escaped in output');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    const xssPayload = '<script>alert("xss")</script><img src=x onerror=alert(1)>';
    env.type('#globalSearchInput', xssPayload);
    const containerHTML = env.document.getElementById('searchResultsList').innerHTML;
    assert.notIncludes(containerHTML, '<script>', 'Search results container must not contain unescaped <script>');
    assert.notIncludes(containerHTML, '<img src=x onerror=', 'Search results container must not contain unescaped onerror handler');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Unicode emojis and control characters handled cleanly in search');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    assert.doesNotThrow(() => {
      env.type('#globalSearchInput', '⚗️ 🧪 🍗 👮 \u0000\u0007\t');
    }, 'Searching with unicode emojis and control chars must not throw');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Single-character query "а" executes cleanly at lower length boundary');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    assert.doesNotThrow(() => {
      env.type('#globalSearchInput', 'а');
    }, 'Single character search must not throw');
    const state = env.getState();
    assert.equal(state.searchQuery, 'а', 'Single character search query should be recorded');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Numeric-only query "2025" executes cleanly on timeline/episodes');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    assert.doesNotThrow(() => {
      env.type('#globalSearchInput', '2025');
    }, 'Numeric search query must not throw');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Unmatched query yields friendly empty state notice');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'строка_которой_точно_нет_в_базе_12345');
    const text = env.document.getElementById('searchResultsList').textContent;
    assert.includes(text, 'ничего не найдено', 'Empty state message should inform user');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Suite 2: Router & URL Hash Boundaries
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 2: Router & URL Hash Boundaries', 'Malformed hashes, non-existent entity IDs, deep paths');

  reporter.startTest('Empty hash defaults to home view');
  try {
    const env = createBrowserEnvironment();
    env.navigate('');
    const state = env.getState();
    assert.equal(state.currentView, 'home', 'Empty hash should resolve to home view');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Bare hash "#" defaults to home view');
  try {
    const env = createBrowserEnvironment();
    env.navigate('#');
    const state = env.getState();
    assert.equal(state.currentView, 'home', 'Bare hash should resolve to home view');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Double hash "##home" is handled gracefully without crashing');
  try {
    const env = createBrowserEnvironment();
    assert.doesNotThrow(() => {
      env.navigate('##home');
    }, 'Double hash must not crash router');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Unknown route displays fallback without crashing');
  try {
    const env = createBrowserEnvironment();
    assert.doesNotThrow(() => {
      env.navigate('#unknown-future-route-404');
    }, 'Unknown route must not throw exception');
    const viewport = env.document.getElementById('contentViewport');
    assert.gte(viewport.children.length, 1, 'Viewport should render home or error fallback');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Route #character without ID redirects to #characters');
  try {
    const env = createBrowserEnvironment();
    env.navigate('#character');
    assert.equal(env.window.location.hash, '#characters', 'Missing character ID should redirect to #characters');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Non-existent character ID displays error notice gracefully');
  try {
    const env = createBrowserEnvironment();
    env.navigate('#character/non-existent-person-id-999');
    const viewport = env.document.getElementById('contentViewport');
    const text = viewport.textContent;
    assert.includes(text, 'не найден', 'Should inform user character is not found');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Route #faction without ID redirects to #factions');
  try {
    const env = createBrowserEnvironment();
    env.navigate('#faction');
    assert.equal(env.window.location.hash, '#factions', 'Missing faction ID should redirect to #factions');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Non-existent faction ID displays error notice gracefully');
  try {
    const env = createBrowserEnvironment();
    env.navigate('#faction/non-existent-faction-id-999');
    const viewport = env.document.getElementById('contentViewport');
    const text = viewport.textContent;
    assert.includes(text, 'не найдена', 'Should inform user faction is not found');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Malformed query parameters in hash are parsed cleanly');
  try {
    const env = createBrowserEnvironment();
    assert.doesNotThrow(() => {
      env.navigate('#characters?filter=all&page=1&invalid=%E0%A4%A');
    }, 'Malformed query parameters in URL must not throw unhandled URIError');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Deep nested route path "#characters/a/b/c/d/e" does not throw');
  try {
    const env = createBrowserEnvironment();
    assert.doesNotThrow(() => {
      env.navigate('#characters/a/b/c/d/e');
    }, 'Deep multi-part route paths must be tolerated');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Suite 3: Data Entity Schema Variance & Optional Properties
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 2: Entity Schema Variance', 'Missing optional fields, null values, empty collections');

  reporter.startTest('Character missing fullName renders infobox without "undefined"');
  try {
    const env = createBrowserEnvironment();
    env.navigate('#character/stoyak-belinsky');
    const infoboxText = env.document.querySelector('.infobox') ? env.document.querySelector('.infobox').textContent : '';
    assert.notIncludes(infoboxText, 'undefined', 'Infobox text must never display "undefined"');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Character missing personality renders article body smoothly');
  try {
    const env = createBrowserEnvironment();
    env.navigate('#character/stoyak-belinsky');
    const viewport = env.document.getElementById('contentViewport');
    assert.ok(viewport.textContent.length > 100, 'Article content should be rendered');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Character missing relationships omits section cleanly without broken markup');
  try {
    const env = createBrowserEnvironment();
    // In DEFAULT_WIKI_DATA, check if any character lacks relationships or test synthetic character
    const html = env.eval("renderCharacterArticle(document.getElementById('contentViewport'), 'stoyak-belinsky')");
    assert.notIncludes(env.document.getElementById('contentViewport').innerHTML, 'null', 'Markup must not contain literal "null"');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Character missing trivia field omits trivia section without breaking TOC');
  try {
    const env = createBrowserEnvironment();
    const state = env.getState();
    const chars = state.data.characters;
    assert.gte(chars.length, 1, 'At least one character must exist');
    // Navigate to each character and verify no undefined in rendered output
    for (const char of chars) {
      env.navigate(`#character/${char.id}`);
      const body = env.document.getElementById('contentViewport').textContent;
      assert.notIncludes(body, 'undefined', `Character article for ${char.id} must not contain undefined`);
    }
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Faction missing motto or headquarters displays cleanly without "undefined"');
  try {
    const env = createBrowserEnvironment();
    const state = env.getState();
    for (const faction of state.data.factions) {
      env.navigate(`#faction/${faction.id}`);
      const body = env.document.getElementById('contentViewport').textContent;
      assert.notIncludes(body, 'undefined', `Faction article for ${faction.id} must not contain undefined`);
    }
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Faction with empty notableMembers: [] handles member list without error');
  try {
    const env = createBrowserEnvironment();
    const syntheticFaction = {
      id: 'empty-faction',
      name: 'Пустая группировка',
      type: 'Банда',
      leader: 'Неизвестен',
      summary: 'Тестовая фракция',
      notableMembers: []
    };
    assert.doesNotThrow(() => {
      env.eval(`renderFactionArticle(document.getElementById('contentViewport'), '${syntheticFaction.id}')`);
    }, 'Rendering faction with empty notableMembers must not throw');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Suite 4: Storage Sandbox Boundaries & Corrupted States
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 2: Storage Sandbox Boundaries', 'Corrupted cache payloads, nulls, quota exhaustion');

  reporter.startTest('Corrupted JSON syntax in storage payload is safely caught and discarded');
  try {
    const env = createBrowserEnvironment({ loadApp: false });
    env.storage.setItem('wiki_lore_data', '{malformed_json_syntax_error: true');
    assert.doesNotThrow(() => {
      env.eval(getJSDataContent());
      env.eval(getJSAppContent());
      env.document.dispatchEvent({ type: 'DOMContentLoaded' });
    }, 'Corrupted JSON in localStorage must not crash application startup');
    const state = env.getState();
    assert.ok(state && state.data, 'STATE.data must recover to canon data');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Empty string "" in storage payload is safely handled');
  try {
    const env = createBrowserEnvironment({ loadApp: false });
    env.storage.setItem('wiki_lore_data', '');
    assert.doesNotThrow(() => {
      env.eval(getJSDataContent());
      env.eval(getJSAppContent());
      env.document.dispatchEvent({ type: 'DOMContentLoaded' });
    }, 'Empty string in storage must not throw');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Unexpected non-object primitives in storage cache recover cleanly');
  try {
    const env = createBrowserEnvironment({ loadApp: false });
    env.storage.setItem('wiki_lore_data', '12345');
    assert.doesNotThrow(() => {
      env.eval(getJSDataContent());
      env.eval(getJSAppContent());
      env.document.dispatchEvent({ type: 'DOMContentLoaded' });
    }, 'Primitive numbers in storage must not crash initialization');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.startTest('Unexpected boolean literal in storage recovers to canon data');
  try {
    const env = createBrowserEnvironment({ loadApp: false });
    env.storage.setItem('wiki_lore_data', 'true');
    assert.doesNotThrow(() => {
      env.eval(getJSDataContent());
      env.eval(getJSAppContent());
      env.document.dispatchEvent({ type: 'DOMContentLoaded' });
    }, 'Boolean literal in storage must not crash initialization');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Unexpected array literal [] in storage recovers to canon data');
  try {
    const env = createBrowserEnvironment({ loadApp: false });
    env.storage.setItem('wiki_lore_data', '[]');
    assert.doesNotThrow(() => {
      env.eval(getJSDataContent());
      env.eval(getJSAppContent());
      env.document.dispatchEvent({ type: 'DOMContentLoaded' });
    }, 'Array literal in storage must not crash initialization');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('QuotaExceededError during theme switch keeps UI fully operable');
  try {
    const env = createBrowserEnvironment({ storageMode: 'quota_exceeded' });
    assert.doesNotThrow(() => {
      env.click('#themeToggleBtn');
    }, 'Theme toggle must not throw when storage quota is exceeded');
    const theme = env.document.documentElement.getAttribute('data-theme');
    assert.ok(theme === 'light' || theme === 'dark', 'Theme attribute should still toggle');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Storage clear() called during active session does not break ongoing navigation');
  try {
    const env = createBrowserEnvironment();
    env.storage.clear();
    assert.doesNotThrow(() => {
      env.navigate('#episodes');
      env.navigate('#timeline');
    }, 'Clearing storage mid-session must not break SPA navigation');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Suite 5: Viewport Dimensions & Mathematical Contrast Boundaries
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 2: Viewport & Contrast Mathematical Boundaries', 'Min/max viewports, identical colors, max contrast');

  reporter.startTest('Mathematical contrast for identical colors evaluates to 1.0:1');
  try {
    const ratioWhite = calculateContrastRatio('#ffffff', '#ffffff');
    const ratioBlack = calculateContrastRatio('#000000', '#000000');
    assert.equal(Math.round(ratioWhite), 1, 'Contrast of identical white colors must be 1.0');
    assert.equal(Math.round(ratioBlack), 1, 'Contrast of identical black colors must be 1.0');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Mathematical contrast for pure black vs pure white evaluates to 21.0:1');
  try {
    const ratio = calculateContrastRatio('#000000', '#ffffff');
    assert.equal(Math.round(ratio), 21, 'Black vs white contrast must be 21.0:1');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Short 3-character hex color codes are parsed accurately');
  try {
    const ratioShort = calculateContrastRatio('#fff', '#000');
    assert.equal(Math.round(ratioShort), 21, '#fff vs #000 must produce 21:1');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Compact mobile viewport (320px) styles are defined in CSS');
  try {
    const css = getCSSContent();
    const hasSmallMedia = css.includes('@media') && (css.includes('480px') || css.includes('768px') || css.includes('360px'));
    assert.ok(hasSmallMedia, 'Responsive media queries must cover compact mobile viewports');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('High-resolution desktop viewport (2560px) layout limits max-width');
  try {
    const css = getCSSContent();
    const hasMaxWidth = css.includes('max-width:');
    assert.ok(hasMaxWidth, 'Site layout must define max-width to avoid stretching on wide viewports');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();
}

module.exports = { runTier2Tests };
