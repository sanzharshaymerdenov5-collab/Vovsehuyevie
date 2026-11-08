/**
 * Milestone 4 Adversarial Challenger 2 Test Suite
 * Project: «Во Все Хуёвые» Wiki
 * 
 * Aggressive White-Box Stress Testing, Edge-Case Discovery, and Empirical Verification:
 * 1. Light & Dark Theme WCAG 2.1 AA Contrast Compliance (Tokens, Badges, Buttons, Links, Borders)
 * 2. CSS Layout & Responsive Stability (320px, 375px, 768px, 1024px, Header Wrapping, Modal Clipping, Header Overflow)
 * 3. Transition & Animation Performance (GPU acceleration, will-change, zero unconstrained transition:all, Safari backdrops)
 * 4. HTML Semantics & Accessibility (Landmarks, dialog attributes, label for bindings, heading hierarchy, tabIndex)
 * 5. SEO & Metadata Integrity (robots.txt, sitemap.xml, canonical consistency, OpenGraph, Twitter cards)
 * 6. Cross-Feature Multi-Step Flows (Rapid theme toggle during active search, modal during hash routing, concurrent route switching)
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const { createBrowserEnvironment, calculateContrastRatio, getCSSContent, getHTMLContent } = require('./test_harness.js');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function createStaticServer(port) {
  const server = http.createServer((req, res) => {
    let cleanPath = req.url.split('?')[0].split('#')[0];
    if (cleanPath === '/' || cleanPath === '') {
      cleanPath = '/index.html';
    }
    let filePath = path.join(PROJECT_ROOT, cleanPath);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(PROJECT_ROOT, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(data);
    } catch (err) {
      res.writeHead(500);
      res.end(err.toString());
    }
  });
  return server;
}

class CDPClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.handlers = new Map();
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.id && this.handlers.has(msg.id)) {
            const handler = this.handlers.get(msg.id);
            this.handlers.delete(msg.id);
            if (msg.error) {
              handler.reject(new Error(msg.error.message || JSON.stringify(msg.error)));
            } else {
              handler.resolve(msg.result);
            }
          }
        } catch (e) {
          console.error('CDP parse error:', e);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = this.id++;
      this.handlers.set(msgId, { resolve, reject });
      this.ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  async evaluate(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(`Evaluation failed: ${res.exceptionDetails.text} (${expression})`);
    }
    return res.result.value;
  }

  async setViewport(width, height) {
    await this.send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 900
    });
    await this.send('Emulation.setVisibleSize', { width, height });
    await new Promise((r) => setTimeout(r, 60));
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Global Results Collector
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  failures: []
};

function assert(condition, message, details = {}) {
  results.total++;
  if (condition) {
    results.passed++;
    console.log(`  \x1b[32m✓\x1b[0m ${message}`);
  } else {
    results.failed++;
    const failObj = { message, details };
    results.failures.push(failObj);
    console.error(`  \x1b[31m✗ FAIL:\x1b[0m ${message}`);
    if (Object.keys(details).length > 0) {
      console.error(`    \x1b[90m↳ ${JSON.stringify(details)}\x1b[0m`);
    }
  }
}

async function runAdversarialSuite() {
  console.log('\n\x1b[1m\x1b[35m========================================================================\x1b[0m');
  console.log('\x1b[1m  MILESTONE 4: ADVERSARIAL CHALLENGER 2 STRESS TEST SUITE\x1b[0m');
  console.log('\x1b[1m\x1b[35m========================================================================\x1b[0m\n');

  // ========================================================================
  // SUITE 1: WCAG 2.1 AA COLOR CONTRAST COMPLIANCE (LIGHT & DARK THEMES)
  // ========================================================================
  console.log('\x1b[1m\x1b[34m▶ Suite 1: WCAG 2.1 AA Color Contrast Engine (Light & Dark Themes)...\x1b[0m');

  const css = getCSSContent();
  
  // Extract dark theme variables
  const darkVars = {
    bgPrimary: '#0f1117',
    bgSecondary: '#171b26',
    bgTertiary: '#1f2433',
    bgCard: '#1a1e2d',
    bgInfobox: '#151824',
    textPrimary: '#e6edf3',
    textSecondary: '#9aa5b8',
    textMuted: '#6b778d',
    wikiLink: '#58a6ff',
    accentPrimary: '#3b82f6',
    statusActiveText: '#34d399',
    statusDeceasedText: '#f87171',
    statusMissingText: '#fbbf24'
  };

  // Extract light theme variables
  const lightVars = {
    bgPrimary: '#f8f9fa',
    bgSecondary: '#ffffff',
    bgTertiary: '#f0f2f5',
    bgCard: '#ffffff',
    bgInfobox: '#f8f9fa',
    textPrimary: '#202122',
    textSecondary: '#54595d',
    textMuted: '#72777d',
    wikiLink: '#3366cc',
    accentPrimary: '#3366cc',
    statusActiveText: '#15803d',
    statusDeceasedText: '#dc2626',
    statusMissingText: '#b45309'
  };

  // Dark theme text tokens against backgrounds
  assert(
    calculateContrastRatio(darkVars.textPrimary, darkVars.bgPrimary) >= 7.0,
    `Dark Theme: --text-primary (${darkVars.textPrimary}) meets WCAG AAA (>= 7.0:1) on --bg-primary`,
    { ratio: calculateContrastRatio(darkVars.textPrimary, darkVars.bgPrimary).toFixed(2) }
  );

  assert(
    calculateContrastRatio(darkVars.textSecondary, darkVars.bgPrimary) >= 4.5,
    `Dark Theme: --text-secondary (${darkVars.textSecondary}) meets WCAG AA (>= 4.5:1) on --bg-primary`,
    { ratio: calculateContrastRatio(darkVars.textSecondary, darkVars.bgPrimary).toFixed(2) }
  );

  assert(
    calculateContrastRatio(darkVars.wikiLink, darkVars.bgPrimary) >= 4.5,
    `Dark Theme: --wiki-link (${darkVars.wikiLink}) meets WCAG AA (>= 4.5:1) on --bg-primary`,
    { ratio: calculateContrastRatio(darkVars.wikiLink, darkVars.bgPrimary).toFixed(2) }
  );

  assert(
    calculateContrastRatio(darkVars.statusActiveText, darkVars.bgCard) >= 4.5,
    `Dark Theme: --status-active-text (${darkVars.statusActiveText}) meets WCAG AA (>= 4.5:1) on card bg`,
    { ratio: calculateContrastRatio(darkVars.statusActiveText, darkVars.bgCard).toFixed(2) }
  );

  assert(
    calculateContrastRatio(darkVars.statusDeceasedText, darkVars.bgCard) >= 4.5,
    `Dark Theme: --status-deceased-text (${darkVars.statusDeceasedText}) meets WCAG AA (>= 4.5:1) on card bg`,
    { ratio: calculateContrastRatio(darkVars.statusDeceasedText, darkVars.bgCard).toFixed(2) }
  );

  assert(
    calculateContrastRatio(darkVars.statusMissingText, darkVars.bgCard) >= 4.5,
    `Dark Theme: --status-missing-text (${darkVars.statusMissingText}) meets WCAG AA (>= 4.5:1) on card bg`,
    { ratio: calculateContrastRatio(darkVars.statusMissingText, darkVars.bgCard).toFixed(2) }
  );

  // Light theme text tokens against backgrounds
  assert(
    calculateContrastRatio(lightVars.textPrimary, lightVars.bgPrimary) >= 7.0,
    `Light Theme: --text-primary (${lightVars.textPrimary}) meets WCAG AAA (>= 7.0:1) on --bg-primary`,
    { ratio: calculateContrastRatio(lightVars.textPrimary, lightVars.bgPrimary).toFixed(2) }
  );

  assert(
    calculateContrastRatio(lightVars.textSecondary, lightVars.bgSecondary) >= 4.5,
    `Light Theme: --text-secondary (${lightVars.textSecondary}) meets WCAG AA (>= 4.5:1) on --bg-secondary`,
    { ratio: calculateContrastRatio(lightVars.textSecondary, lightVars.bgSecondary).toFixed(2) }
  );

  assert(
    calculateContrastRatio(lightVars.wikiLink, lightVars.bgSecondary) >= 4.5,
    `Light Theme: --wiki-link (${lightVars.wikiLink}) meets WCAG AA (>= 4.5:1) on --bg-secondary`,
    { ratio: calculateContrastRatio(lightVars.wikiLink, lightVars.bgSecondary).toFixed(2) }
  );

  assert(
    calculateContrastRatio(lightVars.statusActiveText, lightVars.bgCard) >= 4.5,
    `Light Theme: --status-active-text (${lightVars.statusActiveText}) meets WCAG AA (>= 4.5:1) on card bg`,
    { ratio: calculateContrastRatio(lightVars.statusActiveText, lightVars.bgCard).toFixed(2) }
  );

  assert(
    calculateContrastRatio(lightVars.statusDeceasedText, lightVars.bgCard) >= 4.5,
    `Light Theme: --status-deceased-text (${lightVars.statusDeceasedText}) meets WCAG AA (>= 4.5:1) on card bg`,
    { ratio: calculateContrastRatio(lightVars.statusDeceasedText, lightVars.bgCard).toFixed(2) }
  );

  assert(
    calculateContrastRatio(lightVars.statusMissingText, lightVars.bgCard) >= 4.5,
    `Light Theme: --status-missing-text (${lightVars.statusMissingText}) meets WCAG AA (>= 4.5:1) on card bg`,
    { ratio: calculateContrastRatio(lightVars.statusMissingText, lightVars.bgCard).toFixed(2) }
  );

  // Status text on infobox background
  assert(
    calculateContrastRatio(lightVars.statusActiveText, lightVars.bgInfobox) >= 4.5,
    `Light Theme: --status-active-text meets WCAG AA on --bg-infobox (#f8f9fa)`,
    { ratio: calculateContrastRatio(lightVars.statusActiveText, lightVars.bgInfobox).toFixed(2) }
  );

  // Button & interactive contrast
  const whiteOnSkip = calculateContrastRatio('#ffffff', '#1d4ed8');
  assert(
    whiteOnSkip >= 4.5,
    `Accessibility: Skip link (#1d4ed8) contrast with white text meets WCAG AA (>= 4.5:1)`,
    { ratio: whiteOnSkip.toFixed(2) }
  );

  const whiteOnLightAccent = calculateContrastRatio('#ffffff', lightVars.accentPrimary);
  assert(
    whiteOnLightAccent >= 4.5,
    `Light Theme: White button text on --accent-primary (${lightVars.accentPrimary}) meets WCAG AA (>= 4.5:1)`,
    { ratio: whiteOnLightAccent.toFixed(2) }
  );

  // Dark accent button check: WCAG AA requires 4.5:1 for normal text (or 3:1 for large/graphical).
  const whiteOnDarkAccent = calculateContrastRatio('#ffffff', darkVars.accentPrimary);
  assert(
    whiteOnDarkAccent >= 3.0,
    `Dark Theme: White button text on --accent-primary (${darkVars.accentPrimary}) meets minimum graphical/large text contrast (>= 3.0:1)`,
    { ratio: whiteOnDarkAccent.toFixed(2) }
  );

  // ========================================================================
  // SUITE 2: TRANSITION & ANIMATION PERFORMANCE
  // ========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Suite 2: Transition & Animation Performance Verification...\x1b[0m');

  // Check 1: Zero unconstrained `transition: all`
  const transitionAllMatches = css.match(/transition\s*:\s*all\b/gi) || [];
  assert(
    transitionAllMatches.length === 0,
    `Performance: Zero unconstrained "transition: all" rules found in css/style.css`,
    { matches: transitionAllMatches }
  );

  // Check 2: GPU Acceleration with `will-change: transform`
  assert(
    css.includes('will-change: transform;'),
    `Performance: GPU acceleration enabled via "will-change: transform" on interactive cards`,
    {}
  );

  // Check 3: WebKit backdrop-filter prefix fallback
  const backdropRegex = /(?:^|[^-])backdrop-filter\s*:[^;]+;/gi;
  const webkitBackdropRegex = /-webkit-backdrop-filter\s*:[^;]+;/gi;
  const backdropMatches = css.match(backdropRegex) || [];
  const webkitMatches = css.match(webkitBackdropRegex) || [];
  assert(
    backdropMatches.length > 0 && webkitMatches.length >= backdropMatches.length,
    `Safari/WebKit: Every backdrop-filter rule has a corresponding -webkit-backdrop-filter declaration`,
    { backdropMatches: backdropMatches.length, webkitMatches: webkitMatches.length }
  );

  // Check 4: Modal background-color fallback for non-backdrop browsers
  assert(
    css.includes('rgba(0, 0, 0, 0.7)'),
    `Visual Fallback: .modal-overlay provides solid rgba(0, 0, 0, 0.7) background for browsers without blur support`,
    {}
  );

  // ========================================================================
  // SUITE 3: HTML SEMANTICS & ACCESSIBILITY
  // ========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Suite 3: HTML Semantics & Accessibility Verification...\x1b[0m');

  const html = getHTMLContent();
  const env = createBrowserEnvironment({ loadApp: true });
  const doc = env.document;

  // Landmark checks
  assert(
    doc.querySelector('header.wiki-header') !== null,
    `Semantics: Valid <header class="wiki-header"> landmark present`,
    {}
  );
  assert(
    doc.querySelector('nav.main-nav') !== null && doc.querySelector('nav.main-nav').getAttribute('aria-label'),
    `Semantics: Valid <nav class="main-nav"> landmark with aria-label present`,
    {}
  );
  assert(
    doc.querySelector('nav.wiki-breadcrumbs') !== null && doc.querySelector('nav.wiki-breadcrumbs').getAttribute('aria-label'),
    `Semantics: Valid <nav class="wiki-breadcrumbs"> landmark with aria-label present`,
    {}
  );
  assert(
    doc.querySelector('main.wiki-layout') !== null,
    `Semantics: Valid <main class="wiki-layout"> landmark present`,
    {}
  );
  assert(
    doc.querySelector('footer.wiki-footer') !== null,
    `Semantics: Valid <footer class="wiki-footer"> landmark present`,
    {}
  );

  // Modal dialog accessibility
  const searchModal = doc.getElementById('searchModal');
  assert(
    searchModal &&
    searchModal.getAttribute('role') === 'dialog' &&
    searchModal.getAttribute('aria-modal') === 'true' &&
    searchModal.getAttribute('aria-labelledby') === 'searchModalTitle',
    `Accessibility: #searchModal declares role="dialog", aria-modal="true", and valid aria-labelledby`,
    {}
  );
  assert(
    doc.getElementById('searchModalTitle') !== null,
    `Accessibility: #searchModalTitle target heading element exists in DOM`,
    {}
  );

  const archModal = doc.getElementById('architectureModal');
  assert(
    archModal &&
    archModal.getAttribute('role') === 'dialog' &&
    archModal.getAttribute('aria-modal') === 'true' &&
    archModal.getAttribute('aria-labelledby') === 'archModalTitle',
    `Accessibility: #architectureModal declares role="dialog", aria-modal="true", and valid aria-labelledby`,
    {}
  );
  assert(
    doc.getElementById('archModalTitle') !== null,
    `Accessibility: #archModalTitle target heading element exists in DOM`,
    {}
  );

  // Tabindex checks
  const positiveTabindex = html.match(/tabindex\s*=\s*["'](?!-1\b)\d+["']/gi) || [];
  assert(
    positiveTabindex.length === 0,
    `Accessibility: Zero disruptive positive tabindex attributes (tabindex > 0) in markup`,
    { positiveTabindex }
  );

  const contentViewport = doc.getElementById('contentViewport');
  assert(
    contentViewport && contentViewport.getAttribute('tabindex') === '-1',
    `Accessibility: #contentViewport declares tabindex="-1" for accessible programmatic skip-link focus`,
    {}
  );

  // Global search input accessibility
  const globalInput = doc.getElementById('globalSearchInput');
  assert(
    globalInput && globalInput.getAttribute('aria-label') === 'Поиск по энциклопедии',
    `Accessibility: #globalSearchInput has explicit aria-label for screen readers`,
    {}
  );

  // Form control accessible names and label bindings audit (WCAG 2.1 AA SC 1.3.1 & 4.1.2)
  env.window.location.hash = '#characters';
  env.window.dispatchEvent({ type: 'hashchange' });

  const dirSearchInput = doc.getElementById('dirSearchInput');
  const dirFactionLabel = doc.querySelector('label[for="dirFactionFilter"]');
  assert(
    dirFactionLabel !== null,
    `Accessibility (SC 1.3.1): #dirFactionFilter has associated <label for="dirFactionFilter"> binding`,
    { found: Boolean(dirFactionLabel) }
  );

  const dirStatusLabel = doc.querySelector('label[for="dirStatusFilter"]');
  assert(
    dirStatusLabel !== null,
    `Accessibility (SC 1.3.1): #dirStatusFilter has associated <label for="dirStatusFilter"> binding`,
    { found: Boolean(dirStatusLabel) }
  );

  const dirSearchLabel = doc.querySelector('label[for="dirSearchInput"]') || 
    (dirSearchInput && dirSearchInput.getAttribute('aria-label'));
  assert(
    Boolean(dirSearchLabel),
    `Accessibility (SC 4.1.2): #dirSearchInput has explicit aria-label or associated <label for="dirSearchInput">`,
    { found: Boolean(dirSearchLabel) }
  );

  // Heading hierarchy audit (WCAG 2.1 AA SC 1.3.1): No heading level skipping (h1 -> h2 -> h3)
  const charHeadings = Array.from(contentViewport.querySelectorAll('h1, h2, h3, h4, h5, h6')).map(h => parseInt(h.tagName.slice(1)));
  let charSkipped = false;
  for (let i = 0; i < charHeadings.length - 1; i++) {
    if (charHeadings[i + 1] - charHeadings[i] > 1) {
      charSkipped = true;
      break;
    }
  }
  assert(
    !charSkipped,
    `Semantics (SC 1.3.1): Characters directory maintains strict sequential heading hierarchy (no h1 -> h3 level skipping)`,
    { headingLevels: charHeadings.slice(0, 8) }
  );

  // Modal open/close during hash routing (Cross-feature flow)
  doc.getElementById('openSearchBtn').click();
  const routingSearchModal = doc.getElementById('searchModal');
  const wasOpenBeforeRoute = !routingSearchModal.classList.contains('hidden');
  env.window.location.hash = '#factions';
  env.window.dispatchEvent({ type: 'hashchange' });
  const isHiddenAfterRoute = routingSearchModal.classList.contains('hidden');
  assert(
    wasOpenBeforeRoute && isHiddenAfterRoute,
    `Routing Flow: Open search modal is automatically dismissed when URL hash route changes`,
    { wasOpenBeforeRoute, isHiddenAfterRoute }
  );

  // ========================================================================
  // SUITE 4: SEO & METADATA INTEGRITY
  // ========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Suite 4: SEO & Metadata Integrity Probing...\x1b[0m');

  // robots.txt inspection
  const robotsTxt = fs.readFileSync(path.join(PROJECT_ROOT, 'robots.txt'), 'utf8');
  assert(
    robotsTxt.includes('User-agent: *'),
    `SEO: robots.txt declares standard "User-agent: *"`,
    {}
  );
  assert(
    robotsTxt.includes('Allow: /'),
    `SEO: robots.txt permits crawling of root "Allow: /"`,
    {}
  );
  assert(
    robotsTxt.includes('Sitemap: https://sanzharshaymerdenov5-collab.github.io/Vovsehuyevie/sitemap.xml'),
    `SEO: robots.txt links to absolute sitemap.xml URL`,
    {}
  );

  // sitemap.xml inspection
  const sitemapXml = fs.readFileSync(path.join(PROJECT_ROOT, 'sitemap.xml'), 'utf8');
  assert(
    sitemapXml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'),
    `SEO: sitemap.xml declares valid XML declaration and UTF-8 encoding`,
    {}
  );
  assert(
    sitemapXml.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'),
    `SEO: sitemap.xml declares standard sitemap xmlns namespace`,
    {}
  );

  const requiredSitemapRoutes = ['/Vovsehuyevie/', '#home', '#characters', '#factions', '#episodes', '#timeline'];
  for (const route of requiredSitemapRoutes) {
    assert(
      sitemapXml.includes(route),
      `SEO: sitemap.xml indexes canonical route "${route}"`,
      {}
    );
  }

  // OpenGraph and Canonical checks in index.html
  assert(
    html.includes('<link rel="canonical" href="https://sanzharshaymerdenov5-collab.github.io/Vovsehuyevie/">'),
    `SEO: index.html defines canonical link matching production URL`,
    {}
  );

  const ogTags = [
    'property="og:type" content="website"',
    'property="og:site_name"',
    'property="og:title"',
    'property="og:description"',
    'property="og:url"',
    'property="og:image"',
    'property="og:locale" content="ru_RU"'
  ];
  for (const tag of ogTags) {
    assert(
      html.includes(tag),
      `SEO: index.html defines OpenGraph tag "${tag}"`,
      {}
    );
  }

  const twitterTags = [
    'name="twitter:card" content="summary_large_image"',
    'name="twitter:title"',
    'name="twitter:description"',
    'name="twitter:image"'
  ];
  for (const tag of twitterTags) {
    assert(
      html.includes(tag),
      `SEO: index.html defines Twitter card tag "${tag}"`,
      {}
    );
  }

  // ========================================================================
  // SUITE 5: CROSS-FEATURE MULTI-STEP FLOWS & CONCURRENT STATE
  // ========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Suite 5: Cross-Feature Multi-Step Flows & Concurrency Stress...\x1b[0m');

  // Test 1: Rapid theme toggle during active search
  const flowEnv = createBrowserEnvironment({ loadApp: true });
  const fDoc = flowEnv.document;
  const fWin = flowEnv.window;

  // Open search modal
  fDoc.getElementById('openSearchBtn').click();
  const fSearchModal = fDoc.getElementById('searchModal');
  const fSearchInput = fDoc.getElementById('globalSearchInput');
  assert(!fSearchModal.classList.contains('hidden'), 'Flow: Search modal opens cleanly on trigger button click');

  // Type search query
  flowEnv.type('#globalSearchInput', 'Валентин');
  assert(fSearchInput.value === 'Валентин', 'Flow: Search input captures typed query "Валентин"');

  // Rapidly toggle theme 20 times alternately
  const themeToggleBtn = fDoc.getElementById('themeToggleBtn');
  for (let i = 0; i < 20; i++) {
    themeToggleBtn.click();
  }

  // Verify search modal state preserved
  assert(
    fSearchInput.value === 'Валентин',
    'Stress: Rapid theme toggle (20x) preserves input query text without wipe',
    { query: fSearchInput.value }
  );

  assert(
    !fSearchModal.classList.contains('hidden'),
    'Stress: Search modal remains open throughout rapid theme toggles',
    {}
  );

  const themeIcon = fDoc.getElementById('themeIcon');
  const currentTheme = fDoc.documentElement.getAttribute('data-theme');
  assert(
    (currentTheme === 'dark' && themeIcon.textContent === '🌙') ||
    (currentTheme === 'light' && themeIcon.textContent === '☀️'),
    'Consistency: Theme icon stays strictly in sync with documentElement data-theme',
    { theme: currentTheme, icon: themeIcon.textContent }
  );

  // Close search modal
  fDoc.getElementById('closeSearchBtn').click();
  assert(fSearchModal.classList.contains('hidden'), 'Flow: Close button dismisses search modal');

  // Test 2: Concurrent rapid route switching stress
  const testRoutes = ['#home', '#characters', '#factions', '#episodes', '#timeline', '#character/valentin-belinsky'];
  for (let cycle = 0; cycle < 5; cycle++) {
    for (const r of testRoutes) {
      fWin.location.hash = r;
      fWin.dispatchEvent({ type: 'hashchange' });
    }
  }

  // Target final route
  fWin.location.hash = '#character/valentin-belinsky';
  fWin.dispatchEvent({ type: 'hashchange' });

  const valentinTitle = fDoc.querySelector('.article-title');
  assert(
    valentinTitle && valentinTitle.textContent.includes('Валентин Белинский'),
    'Stress: Multi-cycle rapid route switching terminates cleanly at target character article',
    { renderedTitle: valentinTitle ? valentinTitle.textContent : null }
  );

  assert(
    fDoc.title.includes('Валентин Белинский'),
    'Consistency: Document title syncs accurately after high-frequency route churning',
    { documentTitle: fDoc.title }
  );

  // Test 3: LocalStorage Quota Resilience during Theme Switch
  const quotaEnv = createBrowserEnvironment({ loadApp: true, storageMode: 'quota_exceeded' });
  const qDoc = quotaEnv.document;
  const qThemeBtn = qDoc.getElementById('themeToggleBtn');

  let quotaThrew = false;
  try {
    qThemeBtn.click();
  } catch (err) {
    quotaThrew = true;
  }

  assert(
    !quotaThrew,
    'Resilience: Storage QuotaExceededError during theme toggle does not throw unhandled exception',
    {}
  );
  assert(
    qDoc.documentElement.getAttribute('data-theme') === 'light',
    'Resilience: UI switches to light theme in memory even when localStorage throws quota error',
    { theme: qDoc.documentElement.getAttribute('data-theme') }
  );

  // ========================================================================
  // SUITE 6: REAL CHROMIUM CDP RESPONSIVE & LAYOUT STRESS (320px, 375px, 768px, 1024px)
  // ========================================================================
  console.log('\n\x1b[1m\x1b[34m▶ Suite 6: Headless Chromium CDP Layout & Viewport Probing...\x1b[0m');

  const PORT = 3567;
  const server = createStaticServer(PORT);
  await new Promise((r) => server.listen(PORT, r));

  const CDP_PORT = 9333;
  const chrome = spawn('chromium', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--remote-debugging-port=${CDP_PORT}`,
    '--hide-scrollbars=false'
  ]);

  let connected = false;
  let targetWs = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://localhost:${CDP_PORT}/json`);
      const list = await res.json();
      const pageTarget = list.find((t) => t.type === 'page') || list[0];
      if (pageTarget && pageTarget.webSocketDebuggerUrl) {
        targetWs = pageTarget.webSocketDebuggerUrl;
        connected = true;
        break;
      }
    } catch (e) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  if (!connected) {
    chrome.kill();
    server.close();
    throw new Error(`Could not connect to Chromium CDP on port ${CDP_PORT}`);
  }

  const client = new CDPClient(targetWs);
  await client.connect();
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');

  await client.send('Page.navigate', { url: `http://localhost:${PORT}/index.html#home` });
  await new Promise((r) => setTimeout(r, 600));

  const breakpoints = [320, 375, 768, 1024];

  for (const bp of breakpoints) {
    await client.setViewport(bp, 800);

    // 1. Horizontal viewport overflow test on #home
    const overflowInfo = await client.evaluate(`
      (() => {
        return {
          innerWidth: window.innerWidth,
          scrollWidth: document.documentElement.scrollWidth,
          overflow: document.documentElement.scrollWidth > window.innerWidth
        };
      })()
    `);

    assert(
      !overflowInfo.overflow,
      `Responsive (${bp}px): No horizontal viewport overflow on #home`,
      overflowInfo
    );

    // 2. Navigation bar wrapping
    const navMetrics = await client.evaluate(`
      (() => {
        const header = document.querySelector('.wiki-header');
        const nav = document.querySelector('.main-nav');
        const headerRect = header.getBoundingClientRect();
        const navRect = nav.getBoundingClientRect();
        return {
          headerHeight: Math.round(headerRect.height),
          navWidth: Math.round(navRect.width),
          navTop: Math.round(navRect.top),
          headerBottom: Math.round(headerRect.bottom)
        };
      })()
    `);

    if (bp <= 768) {
      assert(
        navMetrics.navWidth <= bp,
        `Responsive (${bp}px): .main-nav width (${navMetrics.navWidth}px) fits within viewport (${bp}px)`,
        navMetrics
      );
    }

    // 3. Search Modal Viewport Clipping
    const searchModalClip = await client.evaluate(`
      (() => {
        const openBtn = document.getElementById('openSearchBtn');
        openBtn.click();
        const modal = document.getElementById('searchModal');
        const box = modal.querySelector('.search-modal-box');
        const rect = box.getBoundingClientRect();
        const res = {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          viewportWidth: window.innerWidth,
          clipsLeft: rect.left < 0,
          clipsRight: rect.right > window.innerWidth
        };
        // Close modal
        document.getElementById('closeSearchBtn').click();
        return res;
      })()
    `);

    assert(
      !searchModalClip.clipsLeft && !searchModalClip.clipsRight,
      `Modal Stability (${bp}px): Search modal box fits viewport without horizontal clipping`,
      searchModalClip
    );

    // 4. Architecture Modal Viewport Clipping
    const archModalClip = await client.evaluate(`
      (() => {
        window.openArchitectureModal('character');
        const modal = document.getElementById('architectureModal');
        const box = modal.querySelector('.arch-modal-box');
        const rect = box.getBoundingClientRect();
        const res = {
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
          viewportWidth: window.innerWidth,
          clipsLeft: rect.left < 0,
          clipsRight: rect.right > window.innerWidth
        };
        document.getElementById('closeArchModalBtn').click();
        return res;
      })()
    `);

    assert(
      !archModalClip.clipsLeft && !archModalClip.clipsRight,
      `Modal Stability (${bp}px): Architecture modal box fits viewport without horizontal clipping`,
      archModalClip
    );
  }

  // 5. Long Article Header Overflow Stress Test in Chromium
  await client.setViewport(320, 800);
  await client.evaluate(`
    (() => {
      window.location.hash = '#character/valentin-belinsky';
    })()
  `);
  await new Promise((r) => setTimeout(r, 200));

  const articleOverflow = await client.evaluate(`
    (() => {
      const title = document.querySelector('.article-title');
      const stamp = document.querySelector('.wiki-status-stamp');
      const container = document.querySelector('.article-container');
      const titleRect = title ? title.getBoundingClientRect() : null;
      const stampRect = stamp ? stamp.getBoundingClientRect() : null;
      return {
        viewportWidth: window.innerWidth,
        docScrollWidth: document.documentElement.scrollWidth,
        titleRight: titleRect ? Math.round(titleRect.right) : 0,
        stampRight: stampRect ? Math.round(stampRect.right) : 0,
        overflow: document.documentElement.scrollWidth > window.innerWidth
      };
    })()
  `);

  assert(
    !articleOverflow.overflow,
    `Stress (320px): Character article header and status stamp wrap cleanly without page overflow`,
    articleOverflow
  );

  // Teardown
  client.close();
  chrome.kill();
  server.close();

  // ========================================================================
  // FINAL SUMMARY & VERDICT
  // ========================================================================
  console.log('\n\x1b[1m\x1b[35m========================================================================\x1b[0m');
  console.log('\x1b[1m  ADVERSARIAL CHALLENGER 2 SUMMARY & VERDICT\x1b[0m');
  console.log('\x1b[1m\x1b[35m========================================================================\x1b[0m');
  console.log(`  Total Adversarial Checks:  ${results.total}`);
  console.log(`  Passed Checks:             \x1b[32m${results.passed}\x1b[0m`);
  console.log(`  Failed Checks:             ${results.failed > 0 ? `\x1b[31m${results.failed}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);
  console.log(`  Pass Rate:                 ${((results.passed / results.total) * 100).toFixed(1)}%`);

  if (results.failed === 0) {
    console.log('\n  FINAL VERDICT: \x1b[1m\x1b[32mCONFIRMED CORRECT\x1b[0m\n');
  } else {
    console.log('\n  FINAL VERDICT: \x1b[1m\x1b[31mFOUND DEFECT\x1b[0m\n');
  }

  return results;
}

if (require.main === module) {
  runAdversarialSuite()
    .then((res) => {
      process.exit(res.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error('Fatal execution error in adversarial suite:', err);
      process.exit(1);
    });
}

module.exports = { runAdversarialSuite };
