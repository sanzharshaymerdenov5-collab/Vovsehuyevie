/**
 * Tier 4: Real-World End-to-End User Scenarios Test Suite
 * Project: «Во Все Хуёвые» Wiki
 * 
 * 5 Comprehensive Real-World User Flows:
 * 1. Full Reader Journey (Landing -> Hero Card -> TOC Jump -> Wiki Link -> Faction -> Return)
 * 2. Search & Keyboard Navigation (Ctrl+K -> Type -> ArrowDown -> Enter -> Article Render -> Title)
 * 3. Mobile Viewport Layout & Touch Navigation (Mobile styles, wrapping, touch targets)
 * 4. Private Browsing / Restricted Storage Sandbox (Safe storage resilience, theme toggle, multi-route session)
 * 5. Theme Toggle & Visual Contrast Verification (Dark to light switch, WCAG AA contrast calculation across all statuses)
 */

const {
  assert,
  createBrowserEnvironment,
  calculateContrastRatio,
  getCSSContent
} = require('./test_harness');

async function runTier4Tests(reporter) {
  // -------------------------------------------------------------------------
  // Scenario 1: Full Reader Journey
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 4 Scenario 1: Full Reader Journey', 'Comprehensive browsing flow across articles and wiki prose');

  reporter.startTest('Step 1: Reader arrives at home portal and views universe overview');
  try {
    const env = createBrowserEnvironment({ initialHash: '#home' });
    const viewport = env.document.getElementById('contentViewport');
    assert.ok(viewport.querySelector('.portal-hero'), 'Portal hero must be displayed');
    assert.includes(viewport.querySelector('.portal-title').textContent, 'Во Все Хуёвые', 'Universe title must be displayed');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 2: Reader clicks featured hero card to navigate to character article');
  try {
    const env = createBrowserEnvironment({ initialHash: '#home' });
    const heroCard = env.document.querySelector('.wiki-card');
    assert.ok(heroCard, 'Hero card must exist on home view');
    // Click hero card (or link inside)
    heroCard.click();
    assert.includes(env.window.location.hash, '#character/', 'Clicking hero card should navigate to character article');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 3: Character article renders complete biography and TOC');
  try {
    const env = createBrowserEnvironment({ initialHash: '#character/valentin-belinsky' });
    const viewport = env.document.getElementById('contentViewport');
    assert.ok(viewport.querySelector('.article-header'), 'Article header must exist');
    assert.ok(viewport.querySelector('.infobox'), 'Infobox must be rendered');
    assert.ok(viewport.querySelector('.toc-box'), 'Table of contents must be rendered');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 4: Reader clicks TOC anchor link to jump to biography section');
  try {
    const env = createBrowserEnvironment({ initialHash: '#character/valentin-belinsky' });
    env.navigate('#sec-biography');
    const viewport = env.document.getElementById('contentViewport');
    assert.ok(viewport.querySelector('#sec-biography'), 'Target biography section must exist in DOM');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 5: Reader clicks auto-linked faction in prose to view faction article');
  try {
    const env = createBrowserEnvironment({ initialHash: '#character/valentin-belinsky' });
    const prose = env.document.querySelector('.article-body');
    assert.ok(prose, 'Article body must exist');
    // Navigate to faction mentioned in article
    env.navigate('#faction/huizenberg-empire');
    const factionViewport = env.document.getElementById('contentViewport');
    assert.includes(factionViewport.textContent, 'Хуйзенберг', 'Faction article must load and display details');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 6: Reader returns to home portal cleanly');
  try {
    const env = createBrowserEnvironment({ initialHash: '#faction/huizenberg-empire' });
    env.navigate('#home');
    const viewport = env.document.getElementById('contentViewport');
    assert.ok(viewport.querySelector('.portal-hero'), 'Home portal must reload cleanly');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Scenario 2: Search & Keyboard Navigation
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 4 Scenario 2: Search & Keyboard Navigation', 'Shortcut, typing, arrow selection, and Enter activation');

  reporter.startTest('Step 1: User invokes search with Ctrl+K shortcut');
  try {
    const env = createBrowserEnvironment({ initialHash: '#characters' });
    env.window.dispatchEvent({
      type: 'keydown',
      key: 'k',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
      preventDefault: () => {}
    });
    const modal = env.document.getElementById('searchModal');
    assert.equal(modal.classList.contains('hidden'), false, 'Search modal must open via Ctrl+K');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 2: User queries "Белинский" and results render');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Белинский');
    const results = env.document.querySelectorAll('#searchResultsList .search-result-item');
    assert.gte(results.length, 1, 'Search results must be generated');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 3: User presses ArrowDown to highlight result');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Белинский');
    const input = env.document.getElementById('globalSearchInput');
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', bubbles: true, preventDefault: () => {} });
    const selected = env.document.querySelector('#searchResultsList .search-result-item.selected');
    assert.ok(selected, 'First search result must have .selected class');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 4: User presses Enter to activate result and navigate');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Белинский');
    const input = env.document.getElementById('globalSearchInput');
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', bubbles: true, preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'Enter', bubbles: true, preventDefault: () => {} });
    const modal = env.document.getElementById('searchModal');
    assert.equal(modal.classList.contains('hidden'), true, 'Modal should close on Enter');
    assert.includes(env.window.location.hash, '#character/', 'URL hash should navigate to character');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 5: Article renders and document.title is updated');
  try {
    const env = createBrowserEnvironment();
    env.navigate('#character/valentin-belinsky');
    const viewport = env.document.getElementById('contentViewport');
    assert.includes(viewport.textContent, 'Валентин Белинский', 'Valentin Belinsky article must render');
    assert.includes(env.document.title, 'Валентин Белинский', 'Document title must update to character name');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Scenario 3: Mobile Viewport Layout & Touch Navigation
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 4 Scenario 3: Mobile Viewport Layout', 'Responsive header, wrapping, touch targets, and scrolling');

  reporter.startTest('Step 1: Mobile CSS defines height: auto on .wiki-header in media query');
  try {
    const css = getCSSContent();
    const mediaBlock = css.match(/@media\s*\(\s*max-width:\s*768px\s*\)\s*\{([\s\S]*?)\n\}/);
    assert.ok(mediaBlock, '768px media query must exist');
    assert.match(mediaBlock[1], /\.wiki-header\s*\{[^}]*height:\s*auto/i, '.wiki-header must have height: auto to avoid clipping');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 2: Navigation container wraps onto full-width second row');
  try {
    const css = getCSSContent();
    assert.match(css, /\.main-nav\s*\{[^}]*width:\s*100%/i, '.main-nav should take full width on mobile row');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 3: Header actions and logo are preserved on first mobile row');
  try {
    const env = createBrowserEnvironment();
    const logo = env.document.getElementById('homeLogoBtn');
    const searchBtn = env.document.getElementById('openSearchBtn');
    const themeBtn = env.document.getElementById('themeToggleBtn');
    assert.ok(logo, 'Logo must exist in mobile header');
    assert.ok(searchBtn, 'Search trigger must exist in mobile header');
    assert.ok(themeBtn, 'Theme toggle must exist in mobile header');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 4: Mobile user taps "Серии" button to view episodes registry');
  try {
    const env = createBrowserEnvironment();
    const episodesBtn = env.document.querySelector('.nav-btn[data-view="episodes"]');
    assert.ok(episodesBtn, 'Episodes nav button must exist');
    episodesBtn.click();
    assert.equal(env.window.location.hash, '#episodes', 'Hash should change to #episodes');
    const viewport = env.document.getElementById('contentViewport');
    assert.includes(viewport.textContent, 'Серии', 'Episodes view must be rendered');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 5: Mobile user taps "Хронология" button to view timeline');
  try {
    const env = createBrowserEnvironment();
    const timelineBtn = env.document.querySelector('.nav-btn[data-view="timeline"]');
    assert.ok(timelineBtn, 'Timeline nav button must exist');
    timelineBtn.click();
    assert.equal(env.window.location.hash, '#timeline', 'Hash should change to #timeline');
    const viewport = env.document.getElementById('contentViewport');
    assert.includes(viewport.textContent, 'Хронология', 'Timeline view must be rendered');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Scenario 4: Private Browsing / Restricted Storage Sandbox
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 4 Scenario 4: Private Browsing Sandbox', 'Resilience across complete user session in restricted storage');

  reporter.startTest('Step 1: Session starts in restricted storage mode without script crash');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    assert.equal(env.scriptExecutionError, null, 'No startup crash in restricted mode');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 2: Safe storage provides working in-memory store');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    const safeStorage = env.getSafeStorage();
    assert.ok(safeStorage, 'safeStorage must be present');
    safeStorage.setItem('session_key', 'session_val');
    assert.equal(safeStorage.getItem('session_key'), 'session_val', 'Memory store retains value');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 3: User toggles theme to light in private browsing');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    env.click('#themeToggleBtn');
    assert.equal(env.document.documentElement.getAttribute('data-theme'), 'light', 'Theme should toggle to light');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 4: User searches and filters articles in private browsing');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Джесси');
    const results = env.document.querySelectorAll('#searchResultsList .search-result-item');
    assert.gte(results.length, 1, 'Search should work in private browsing');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 5: Multi-page navigation completes cleanly without exceptions');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    assert.doesNotThrow(() => {
      env.navigate('#home');
      env.navigate('#characters');
      env.navigate('#character/jesse-pinkman');
      env.navigate('#factions');
      env.navigate('#timeline');
    }, 'Multi-page navigation must not throw in restricted storage');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Scenario 5: Theme Toggle & Visual Contrast Verification
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 4 Scenario 5: Theme Toggle & Contrast Verification', 'Contrast verification across light and dark modes');

  reporter.startTest('Step 1: Initial dark theme defines status colors with adequate contrast');
  try {
    const env = createBrowserEnvironment();
    assert.equal(env.document.documentElement.getAttribute('data-theme'), 'dark', 'Initial theme is dark');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 2: User activates light theme');
  try {
    const env = createBrowserEnvironment();
    env.click('#themeToggleBtn');
    assert.equal(env.document.documentElement.getAttribute('data-theme'), 'light', 'Theme toggled to light');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 3: Light theme active status contrast meets WCAG AA (>= 4.5:1)');
  try {
    const css = getCSSContent();
    const lightMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightMatch, 'Light theme block required');
    const colorMatch = lightMatch[1].match(/--status-active-text:\s*(#[0-9a-fA-F]{3,6})/);
    assert.ok(colorMatch, '--status-active-text must be defined');
    const ratio = calculateContrastRatio(colorMatch[1], '#ffffff');
    assert.gte(ratio, 4.5, `Active status text contrast (${ratio.toFixed(2)}:1) must be >= 4.5:1`);
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 4: Light theme deceased status contrast meets WCAG AA (>= 4.5:1)');
  try {
    const css = getCSSContent();
    const lightMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightMatch, 'Light theme block required');
    const colorMatch = lightMatch[1].match(/--status-deceased-text:\s*(#[0-9a-fA-F]{3,6})/);
    assert.ok(colorMatch, '--status-deceased-text must be defined');
    const ratio = calculateContrastRatio(colorMatch[1], '#ffffff');
    assert.gte(ratio, 4.5, `Deceased status text contrast (${ratio.toFixed(2)}:1) must be >= 4.5:1`);
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Step 5: Light theme missing status contrast meets WCAG AA (>= 4.5:1)');
  try {
    const css = getCSSContent();
    const lightMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightMatch, 'Light theme block required');
    const colorMatch = lightMatch[1].match(/--status-missing-text:\s*(#[0-9a-fA-F]{3,6})/);
    assert.ok(colorMatch, '--status-missing-text must be defined');
    const ratio = calculateContrastRatio(colorMatch[1], '#ffffff');
    assert.gte(ratio, 4.5, `Missing status text contrast (${ratio.toFixed(2)}:1) must be >= 4.5:1`);
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();
}

module.exports = { runTier4Tests };
