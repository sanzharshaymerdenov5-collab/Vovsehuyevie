/**
 * Tier 3: Cross-Feature Pairwise Interactions Test Suite
 * Project: «Во Все Хуёвые» Wiki
 * 
 * Tests combinatorial feature interactions:
 * - Search + Keyboard Selection + SPA Routing + Document Title
 * - Theme Switcher + Restricted Storage + In-Memory Fallback
 * - Light Theme + Status Badges + WCAG 2.1 AA Contrast Ratios
 * - Deep Link Routing + Breadcrumb Synchronization + Anchor Jumps
 * - Search Filter Chips + Debounced Text Input Querying
 */

const {
  assert,
  createBrowserEnvironment,
  calculateContrastRatio,
  getCSSContent
} = require('./test_harness');

async function runTier3Tests(reporter) {
  // -------------------------------------------------------------------------
  // Interaction 1: Search + Keyboard Navigation + SPA Routing
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 3: Search + Keyboard + Routing', 'Modal query, arrow selection, enter activation, and route change');

  reporter.startTest('Modal opens, filters query, and renders matching items');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Стояк');
    const items = env.document.querySelectorAll('#searchResultsList .search-result-item');
    assert.gte(items.length, 1, 'Should find at least 1 item for Стояк');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('ArrowDown key assigns .selected class to active item');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Стояк');
    const input = env.document.getElementById('globalSearchInput');
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', bubbles: true, preventDefault: () => {} });
    const selected = env.document.querySelector('#searchResultsList .search-result-item.selected');
    assert.ok(selected, 'Selected item must receive .selected class');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Enter key on selected item closes modal and navigates via History API without #');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.type('#globalSearchInput', 'Стояк');
    const input = env.document.getElementById('globalSearchInput');
    input.dispatchEvent({ type: 'keydown', key: 'ArrowDown', bubbles: true, preventDefault: () => {} });
    input.dispatchEvent({ type: 'keydown', key: 'Enter', bubbles: true, preventDefault: () => {} });

    const modal = env.document.getElementById('searchModal');
    assert.equal(modal.classList.contains('hidden'), true, 'Modal must close on Enter');
    assert.equal(env.window.location.pathname, '/Vovsehuyevie/character/stoyak-belinsky/', 'Pathname must navigate to character without #');
    assert.equal(env.window.location.hash, '', 'URL must not contain # fragment');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Target article is rendered into contentViewport');
  try {
    const env = createBrowserEnvironment();
    env.navigate('character/stoyak-belinsky');
    const viewport = env.document.getElementById('contentViewport');
    assert.includes(viewport.textContent, 'Стояк Белинский', 'Article header must match selected character');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Document title is synchronized with navigated character');
  try {
    const env = createBrowserEnvironment();
    env.navigate('character/stoyak-belinsky');
    assert.includes(env.document.title, 'Стояк Белинский', 'Document title must reflect navigated entity');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Interaction 2: Theme Switching + Restricted Storage
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 3: Theme Toggle + Restricted Storage', 'Private browsing resilience during theme toggles');

  reporter.startTest('Initial theme defaults to dark without throw in restricted storage');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    const theme = env.document.documentElement.getAttribute('data-theme');
    assert.equal(theme, 'dark', 'Default theme must be dark');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Clicking themeToggleBtn switches data-theme attribute to light');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    env.click('#themeToggleBtn');
    const theme = env.document.documentElement.getAttribute('data-theme');
    assert.equal(theme, 'light', 'Theme should switch to light');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Theme icon updates to sun indicator');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    env.click('#themeToggleBtn');
    const icon = env.document.getElementById('themeIcon').textContent;
    assert.equal(icon, '☀️', 'Theme icon should be sun in light mode');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Theme persists across route changes in restricted storage');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    env.click('#themeToggleBtn');
    env.navigate('characters');
    env.navigate('factions');
    const theme = env.document.documentElement.getAttribute('data-theme');
    assert.equal(theme, 'light', 'Light theme should persist across routing');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Toggling theme back switches to dark and restores moon icon');
  try {
    const env = createBrowserEnvironment({ storageMode: 'restricted' });
    env.click('#themeToggleBtn'); // to light
    env.click('#themeToggleBtn'); // back to dark
    const theme = env.document.documentElement.getAttribute('data-theme');
    const icon = env.document.getElementById('themeIcon').textContent;
    assert.equal(theme, 'dark', 'Theme should revert to dark');
    assert.equal(icon, '🌙', 'Theme icon should revert to moon');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Interaction 3: Light Theme + Status Badges + WCAG 2.1 AA Contrast
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 3: Light Theme + Status Badges + Contrast', 'Verification of status badges under light theme mode');

  reporter.startTest('Switching to light theme activates [data-theme="light"] rules');
  try {
    const env = createBrowserEnvironment();
    env.click('#themeToggleBtn');
    assert.equal(env.document.documentElement.getAttribute('data-theme'), 'light', 'HTML element should have data-theme="light"');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Rendered characters cards have status-badge elements');
  try {
    const env = createBrowserEnvironment();
    env.click('#themeToggleBtn');
    env.navigate('characters');
    const badges = env.document.querySelectorAll('#contentViewport .status-badge');
    assert.gte(badges.length, 3, 'Should render status badges on character cards');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Light theme active status badge meets contrast ratio >= 4.5:1');
  try {
    const css = getCSSContent();
    const lightMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightMatch, 'Light theme CSS block required');
    const activeColorMatch = lightMatch[1].match(/--status-active-text:\s*(#[0-9a-fA-F]{3,6})/);
    assert.ok(activeColorMatch, '--status-active-text must be defined in light theme');
    const ratio = calculateContrastRatio(activeColorMatch[1], '#ffffff');
    assert.gte(ratio, 4.5, `Active status color must meet WCAG AA (current: ${ratio.toFixed(2)}:1)`);
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Light theme deceased status badge meets contrast ratio >= 4.5:1');
  try {
    const css = getCSSContent();
    const lightMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightMatch, 'Light theme CSS block required');
    const deceasedColorMatch = lightMatch[1].match(/--status-deceased-text:\s*(#[0-9a-fA-F]{3,6})/);
    assert.ok(deceasedColorMatch, '--status-deceased-text must be defined in light theme');
    const ratio = calculateContrastRatio(deceasedColorMatch[1], '#ffffff');
    assert.gte(ratio, 4.5, `Deceased status color must meet WCAG AA (current: ${ratio.toFixed(2)}:1)`);
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Light theme missing status badge meets contrast ratio >= 4.5:1');
  try {
    const css = getCSSContent();
    const lightMatch = css.match(/\[data-theme=["']?light["']?\]\s*\{([\s\S]*?)\}/);
    assert.ok(lightMatch, 'Light theme CSS block required');
    const missingColorMatch = lightMatch[1].match(/--status-missing-text:\s*(#[0-9a-fA-F]{3,6})/);
    assert.ok(missingColorMatch, '--status-missing-text must be defined in light theme');
    const ratio = calculateContrastRatio(missingColorMatch[1], '#ffffff');
    assert.gte(ratio, 4.5, `Missing status color must meet WCAG AA (current: ${ratio.toFixed(2)}:1)`);
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Interaction 4: Deep Link Routing + Breadcrumb Sync + Anchor Jumps
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 3: Deep Link Routing + Breadcrumbs + Anchors', 'Deep article landing, breadcrumbs hierarchy, and section jumps without #');

  reporter.startTest('Deep landing on character article renders complete article structure');
  try {
    const env = createBrowserEnvironment({ initialPath: '/Vovsehuyevie/character/valentin-belinsky/' });
    const viewport = env.document.getElementById('contentViewport');
    assert.ok(viewport.querySelector('.article-header'), 'Article header should exist');
    assert.ok(viewport.querySelector('.infobox'), 'Infobox should exist');
    assert.ok(viewport.querySelector('.toc-box'), 'TOC should exist');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Breadcrumbs reflect correct hierarchy for character article');
  try {
    const env = createBrowserEnvironment({ initialPath: '/Vovsehuyevie/character/valentin-belinsky/' });
    const breadcrumbs = env.document.getElementById('wikiBreadcrumbs').textContent;
    assert.includes(breadcrumbs, 'Вики', 'Breadcrumbs should include root link');
    assert.includes(breadcrumbs, 'Валентин Белинский', 'Breadcrumbs should include current character name');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Clicking TOC section link scrolls smoothly without # and keeps article intact');
  try {
    const env = createBrowserEnvironment({ initialPath: '/Vovsehuyevie/character/valentin-belinsky/' });
    const tocLink = env.document.querySelector('.toc-link[data-scroll-target="sec-biography"]');
    assert.ok(tocLink, 'TOC link for sec-biography must exist');
    assert.notIncludes(tocLink.getAttribute('href'), '#', 'TOC link href must not contain #');
    tocLink.click();
    const viewport = env.document.getElementById('contentViewport');
    assert.ok(viewport.querySelector('.infobox'), 'Infobox should remain intact after TOC scroll click');
    assert.equal(env.window.location.hash, '', 'TOC click must not mutate URL hash');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Navigating to home restores breadcrumbs and root URL pathname');
  try {
    const env = createBrowserEnvironment({ initialPath: '/Vovsehuyevie/character/valentin-belinsky/' });
    env.navigate('home');
    const breadcrumbs = env.document.getElementById('wikiBreadcrumbs').textContent;
    assert.includes(breadcrumbs, 'Главная', 'Breadcrumbs should restore to Главная');
    assert.equal(env.window.location.pathname, '/Vovsehuyevie/', 'Pathname should return to root /Vovsehuyevie/');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Document title syncs on return to home');
  try {
    const env = createBrowserEnvironment({ initialPath: '/Vovsehuyevie/character/valentin-belinsky/' });
    env.navigate('home');
    assert.includes(env.document.title, 'Во Все Хуёвые', 'Title should return to home portal title');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Interaction 5: Search Filter Chips + Match Highlighting + Debounced Text Input
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 3: Search Filter Chips + Highlighting', 'Filter chips toggle between characters, factions, episodes, and highlight matches');

  reporter.startTest('Clicking "Персонажи" filter chip activates chip and sets STATE.searchFilter');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    const charChip = env.document.querySelector('.filter-chip[data-filter="character"]');
    assert.ok(charChip, 'Character filter chip must exist');
    charChip.click();
    assert.ok(charChip.classList.contains('active'), 'Character filter chip should have active class');
    const state = env.getState();
    assert.equal(state.searchFilter, 'character', 'STATE.searchFilter must be "character"');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Character filter restricts search output exclusively to characters');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.click('.filter-chip[data-filter="character"]');
    env.type('#globalSearchInput', 'Хуйзенберг');
    const results = env.document.querySelectorAll('#searchResultsList .search-result-item');
    assert.gte(results.length, 1, 'Should find characters');
    const content = env.document.getElementById('searchResultsList').textContent;
    assert.includes(content, 'Персонаж', 'Results should indicate type Персонаж');
    assert.notIncludes(content, 'Группировка', 'Faction results should be filtered out');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Switching filter to "Группировки" switches results to factions');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.click('.filter-chip[data-filter="faction"]');
    env.type('#globalSearchInput', 'Империя');
    const results = env.document.querySelectorAll('#searchResultsList .search-result-item');
    assert.gte(results.length, 1, 'Should find factions');
    const content = env.document.getElementById('searchResultsList').textContent;
    assert.includes(content, 'Группировка', 'Results should indicate type Группировка');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Switching filter to "Серии" displays canon episodes and film');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    const epChip = env.document.querySelector('.filter-chip[data-filter="episode"]');
    assert.ok(epChip, 'Episode filter chip must exist');
    epChip.click();
    env.type('#globalSearchInput', 'Пилот');
    const results = env.document.querySelectorAll('#searchResultsList .search-result-item');
    assert.gte(results.length, 1, 'Should find Пилот Мефедрона episode');
    const content = env.document.getElementById('searchResultsList').textContent;
    assert.includes(content, 'Серия', 'Results should indicate type Серия');
    assert.notIncludes(content, 'Персонаж', 'Character results should be excluded under episode filter');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Search results safely highlight matched query fragments with <mark class="search-highlight">');
  try {
    const env = createBrowserEnvironment();
    env.click('#openSearchBtn');
    env.click('.filter-chip[data-filter="all"]');
    env.type('#globalSearchInput', 'Хуйзенберг');
    const marks = env.document.querySelectorAll('#searchResultsList mark.search-highlight');
    assert.gte(marks.length, 1, 'Matched substrings must be wrapped in mark.search-highlight');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();

  // -------------------------------------------------------------------------
  // Interaction 6: Interactive Relationship Graph Filtering + Selection
  // -------------------------------------------------------------------------
  reporter.startSuite('Tier 3: Relationship Graph', 'SVG graph nodes, faction filter chips, and detail panel synchronization');

  reporter.startTest('Graph route renders SVG map with all canon characters and edges');
  try {
    const env = createBrowserEnvironment();
    env.navigate('graph');
    const svg = env.document.getElementById('relationshipGraphSvg');
    assert.ok(svg, 'Relationship graph SVG must render');
    const nodes = env.document.querySelectorAll('.graph-node');
    const edges = env.document.querySelectorAll('.graph-edge');
    assert.equal(nodes.length, 7, 'Graph must display 7 character nodes');
    assert.gte(edges.length, 5, 'Graph must display relationship edges');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Clicking graph node updates detail sidebar panel with character relations');
  try {
    const env = createBrowserEnvironment();
    env.navigate('graph');
    const gusevNode = env.document.querySelector('.graph-node[data-node-id="gusev-ferangiy"]');
    assert.ok(gusevNode, 'Gusev graph node must exist');
    gusevNode.click();
    const panel = env.document.getElementById('graphDetailPanel');
    assert.ok(panel, 'Graph detail panel must exist');
    assert.includes(panel.textContent, 'Гусев Ферангий', 'Detail panel must update to clicked character');
    assert.includes(panel.innerHTML, 'character/gusev-ferangiy/', 'Detail panel CTA must link hash-free to dossier');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.startTest('Clicking graph faction filter chip toggles active state and dims unrelated nodes');
  try {
    const env = createBrowserEnvironment();
    env.navigate('graph');
    const obnChip = env.document.querySelector('.filter-chip[data-graph-faction="obn-podzalupinsk"]');
    assert.ok(obnChip, 'OBN faction filter chip must exist on graph page');
    obnChip.click();
    assert.ok(obnChip.classList.contains('active'), 'Clicked faction chip must become active');
    const gusevNode = env.document.querySelector('.graph-node[data-node-id="gusev-ferangiy"]');
    assert.ok(gusevNode.classList.contains('dimmed'), 'Unrelated node outside OBN filter should be dimmed');
  } catch (e) {
    if (e.name !== 'AssertionError') throw e;
  }
  reporter.endTest();

  reporter.endSuite();
}

module.exports = { runTier3Tests };
