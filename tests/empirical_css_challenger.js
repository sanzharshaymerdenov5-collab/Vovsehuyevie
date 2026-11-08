/**
 * Empirical Stress Test Suite for Milestone 2: CSS Architecture & Visual Performance
 * Challenger 1 Verification Runner
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = 3456;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8'
};

function createStaticServer() {
  return http.createServer((req, res) => {
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
    // allow layout repaint
    await new Promise((r) => setTimeout(r, 60));
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function runEmpiricalQASuite() {
  console.log('\n========================================================================');
  console.log('  CHALLENGER 1: EMPIRICAL STRESS TEST & VISUAL PERFORMANCE (M2)');
  console.log('========================================================================\n');

  const server = createStaticServer();
  await new Promise((r) => server.listen(PORT, r));
  console.log(`[INIT] Local HTTP server active on http://localhost:${PORT}`);

  const chrome = spawn('chromium', [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--hide-scrollbars=false'
  ]);

  // wait for chrome remote port
  let connected = false;
  let targetWs = null;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://localhost:9222/json');
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
    throw new Error('Could not connect to Chromium CDP on port 9222');
  }

  console.log(`[INIT] Connected to Chromium CDP: ${targetWs}`);
  const client = new CDPClient(targetWs);
  await client.connect();

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('DOM.enable');
  await client.send('CSS.enable');

  const testResults = {
    total: 0,
    passed: 0,
    failed: 0,
    measurements: []
  };

  function record(category, testName, passed, details) {
    testResults.total++;
    if (passed) {
      testResults.passed++;
      console.log(`  \x1b[32m✓ PASS\x1b[0m [${category}] ${testName}`);
    } else {
      testResults.failed++;
      console.log(`  \x1b[31m✗ FAIL\x1b[0m [${category}] ${testName}`);
    }
    if (details) {
      console.log(`    \x1b[90m↳ ${JSON.stringify(details)}\x1b[0m`);
    }
    testResults.measurements.push({ category, testName, passed, details });
  }

  try {
    // -----------------------------------------------------------------------
    // TEST SECTION 1: Viewport Stress Across Breakpoints (320, 375, 480, 768, 1024)
    // -----------------------------------------------------------------------
    console.log('\n--- 1. Testing Viewports Across Standard Breakpoints ---');
    const viewports = [
      { name: 'Mobile Extra Small (320px)', width: 320, height: 568 },
      { name: 'Mobile iPhone SE (375px)', width: 375, height: 667 },
      { name: 'Mobile Boundary Breakpoint (480px)', width: 480, height: 800 },
      { name: 'Tablet Boundary Breakpoint (768px)', width: 768, height: 1024 },
      { name: 'Desktop Small (1024px)', width: 1024, height: 768 }
    ];

    const routes = [
      '#home',
      '#characters',
      '#character/valentin-belinsky',
      '#factions',
      '#faction/belinsky-clan',
      '#episodes',
      '#timeline'
    ];

    for (const vp of viewports) {
      await client.setViewport(vp.width, vp.height);
      console.log(`\n  [Viewport ${vp.width}x${vp.height} - ${vp.name}]`);

      for (const route of routes) {
        await client.send('Page.navigate', { url: `http://localhost:${PORT}/${route}` });
        await new Promise((r) => setTimeout(r, 120));

        const metrics = await client.evaluate(`(() => {
          const docEl = document.documentElement;
          const body = document.body;
          const winWidth = window.innerWidth;
          const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
          const hasHorizontalOverflow = scrollWidth > winWidth;
          
          // find any elements that overflow horizontally
          const allEls = document.querySelectorAll('*');
          const overflowing = [];
          for (let el of allEls) {
            // ignore svg paths or elements with intentional scroll
            const style = window.getComputedStyle(el);
            if (style.overflowX === 'auto' || style.overflowX === 'scroll' || el.tagName.toLowerCase() === 'svg' || el.closest('.main-nav, .wiki-page-tabs-left, .wiki-page-tabs-right, .arch-code-block')) continue;
            const rect = el.getBoundingClientRect();
            if (rect.right > winWidth + 1.5 && rect.width > 0 && rect.height > 0) {
              overflowing.push({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                rectRight: Math.round(rect.right),
                rectWidth: Math.round(rect.width)
              });
            }
          }

          return {
            winWidth,
            scrollWidth,
            hasHorizontalOverflow,
            overflowingCount: overflowing.length,
            overflowing: overflowing.slice(0, 3)
          };
        })()`);

        const isOk = !metrics.hasHorizontalOverflow && metrics.overflowingCount === 0;
        record(
          `Viewport ${vp.width}px`,
          `No horizontal scroll on route "${route}"`,
          isOk,
          {
            innerWidth: metrics.winWidth,
            scrollWidth: metrics.scrollWidth,
            overflowDiff: metrics.scrollWidth - metrics.winWidth,
            overflowingElements: metrics.overflowing
          }
        );
      }
    }

    // -----------------------------------------------------------------------
    // TEST SECTION 2: Header Layout Fix (F10) & Sub-banner Clearance Stress Test
    // -----------------------------------------------------------------------
    console.log('\n--- 2. Stress Testing Header Layout Fix (F10) & Sub-Banner Clearance ---');

    for (const mobileWidth of [320, 375, 480, 768]) {
      await client.setViewport(mobileWidth, 600);
      await client.send('Page.navigate', { url: `http://localhost:${PORT}/#home` });
      await new Promise((r) => setTimeout(r, 100));

      const headerData = await client.evaluate(`(() => {
        const header = document.querySelector('.wiki-header');
        const headerContainer = document.querySelector('.header-container');
        const mainNav = document.querySelector('.main-nav');
        const subBanner = document.querySelector('.sub-banner');
        
        const headerRect = header.getBoundingClientRect();
        const navRect = mainNav.getBoundingClientRect();
        const bannerRect = subBanner.getBoundingClientRect();
        const headerStyle = window.getComputedStyle(header);
        const navStyle = window.getComputedStyle(mainNav);
        const containerStyle = window.getComputedStyle(headerContainer);

        return {
          headerHeight: Math.round(headerRect.height),
          headerBottom: Math.round(headerRect.bottom),
          bannerTop: Math.round(bannerRect.top),
          bannerHeight: Math.round(bannerRect.height),
          navOrder: navStyle.order,
          navWidth: Math.round(navRect.width),
          containerFlexWrap: containerStyle.flexWrap,
          clearanceGap: Math.round(bannerRect.top - headerRect.bottom),
          headerOverflow: headerStyle.overflow
        };
      })()`);

      // Clearance gap should be >= 0 (meaning banner starts at or after header bottom)
      const noOverlap = headerData.clearanceGap >= 0;
      const heightExpanded = headerData.headerHeight > 56; // expanded past old desktop fixed 56px!
      const navSecondRow = headerData.navOrder === '3' && headerData.containerFlexWrap === 'wrap';

      record(
        `Header Layout F10 (${mobileWidth}px)`,
        `.wiki-header height expands naturally (${headerData.headerHeight}px > 56px)`,
        heightExpanded,
        {
          headerHeight: headerData.headerHeight,
          bannerTop: headerData.bannerTop,
          clearanceGap: headerData.clearanceGap
        }
      );

      record(
        `Header Layout F10 (${mobileWidth}px)`,
        `.sub-banner is not occluded (clearance gap >= 0)`,
        noOverlap,
        {
          headerBottom: headerData.headerBottom,
          bannerTop: headerData.bannerTop,
          clearanceGap: headerData.clearanceGap
        }
      );

      record(
        `Header Layout F10 (${mobileWidth}px)`,
        `.main-nav wraps to row 2 with flex-wrap and order: 3`,
        navSecondRow,
        {
          flexWrap: headerData.containerFlexWrap,
          navOrder: headerData.navOrder,
          navWidth: headerData.navWidth
        }
      );
    }

    // MULTI-ROW STRESS TEST: Inject 8 additional nav buttons to force multi-row wrapping
    console.log('\n  [Multi-Row Extreme Wrapping Stress Test]');
    await client.setViewport(375, 667);
    await client.send('Page.navigate', { url: `http://localhost:${PORT}/#home` });
    await new Promise((r) => setTimeout(r, 100));

    const extremeWrapResult = await client.evaluate(`(() => {
      const header = document.querySelector('.wiki-header');
      const subBanner = document.querySelector('.sub-banner');
      const mainNav = document.querySelector('.main-nav');
      
      // Inject extra buttons and allow nav to flex-wrap
      mainNav.style.flexWrap = 'wrap';
      for (let i = 1; i <= 8; i++) {
        const btn = document.createElement('button');
        btn.className = 'nav-btn';
        btn.textContent = 'Тест Кнопка ' + i;
        mainNav.appendChild(btn);
      }

      const hRect = header.getBoundingClientRect();
      const bRect = subBanner.getBoundingClientRect();
      return {
        headerHeight: Math.round(hRect.height),
        headerBottom: Math.round(hRect.bottom),
        bannerTop: Math.round(bRect.top),
        clearanceGap: Math.round(bRect.top - hRect.bottom)
      };
    })()`);

    record(
      'Header Layout Multi-Row Stress',
      'Massive wrapped nav (8 extra buttons) pushes .sub-banner without clipping',
      extremeWrapResult.clearanceGap >= 0 && extremeWrapResult.headerHeight > 100,
      extremeWrapResult
    );

    // -----------------------------------------------------------------------
    // TEST SECTION 3: Narrow Mobile Media Query (F14) Rules (< 480px)
    // -----------------------------------------------------------------------
    console.log('\n--- 3. Stress Testing Narrow Mobile Query (F14) @media (max-width: 480px) ---');

    for (const testWidth of [320, 375, 480]) {
      await client.setViewport(testWidth, 667);

      // Test Portal Hero & Cards Grid on #home
      await client.send('Page.navigate', { url: `http://localhost:${PORT}/#home` });
      await new Promise((r) => setTimeout(r, 100));

      const homeRules = await client.evaluate(`(() => {
        const portalHero = document.querySelector('.portal-hero');
        const portalTitle = document.querySelector('.portal-title');
        const cardsGrid = document.querySelector('.cards-grid');

        const heroStyle = portalHero ? window.getComputedStyle(portalHero) : null;
        const titleStyle = portalTitle ? window.getComputedStyle(portalTitle) : null;
        const gridStyle = cardsGrid ? window.getComputedStyle(cardsGrid) : null;

        // Count number of computed columns
        const cols = gridStyle ? gridStyle.gridTemplateColumns.split(' ').length : 0;

        return {
          heroPadding: heroStyle ? heroStyle.padding : null,
          titleFontSize: titleStyle ? titleStyle.fontSize : null,
          gridTemplateColumns: gridStyle ? gridStyle.gridTemplateColumns : null,
          gridColumnCount: cols
        };
      })()`);

      record(
        `F14 Mobile Rules (${testWidth}px)`,
        `.cards-grid renders single 1fr column`,
        homeRules.gridColumnCount === 1,
        { columns: homeRules.gridTemplateColumns, count: homeRules.gridColumnCount }
      );

      record(
        `F14 Mobile Rules (${testWidth}px)`,
        `.portal-hero padding equals 24px 16px`,
        homeRules.heroPadding === '24px 16px',
        { heroPadding: homeRules.heroPadding }
      );

      record(
        `F14 Mobile Rules (${testWidth}px)`,
        `.portal-title font-size equals 24px`,
        homeRules.titleFontSize === '24px',
        { titleFontSize: homeRules.titleFontSize }
      );

      // Test Article View (.article-title, .article-container, .wiki-status-stamp)
      await client.send('Page.navigate', { url: `http://localhost:${PORT}/#character/valentin-belinsky` });
      await new Promise((r) => setTimeout(r, 100));

      const articleRules = await client.evaluate(`(() => {
        const title = document.querySelector('.article-title');
        const container = document.querySelector('.article-container');
        const stamp = document.querySelector('.wiki-status-stamp');

        const tStyle = title ? window.getComputedStyle(title) : null;
        const cStyle = container ? window.getComputedStyle(container) : null;
        const sStyle = stamp ? window.getComputedStyle(stamp) : null;

        return {
          articleTitleFontSize: tStyle ? tStyle.fontSize : null,
          articleContainerPadding: cStyle ? cStyle.padding : null,
          stampFontSize: sStyle ? sStyle.fontSize : null,
          stampPadding: sStyle ? sStyle.padding : null,
          stampLetterSpacing: sStyle ? sStyle.letterSpacing : null,
          stampBorderWidth: sStyle ? sStyle.borderWidth : null
        };
      })()`);

      record(
        `F14 Mobile Rules (${testWidth}px)`,
        `.article-title font-size equals 24px`,
        articleRules.articleTitleFontSize === '24px',
        { fontSize: articleRules.articleTitleFontSize }
      );

      record(
        `F14 Mobile Rules (${testWidth}px)`,
        `.article-container padding equals 16px 10px`,
        articleRules.articleContainerPadding === '16px 10px',
        { padding: articleRules.articleContainerPadding }
      );

      record(
        `F14 Mobile Rules (${testWidth}px)`,
        `.wiki-status-stamp conforms to 480px rules (11px, 2px border, 1.8px letter-spacing)`,
        articleRules.stampFontSize === '11px' &&
        articleRules.stampBorderWidth === '2px' &&
        articleRules.stampLetterSpacing === '1.8px',
        articleRules
      );

      // Test Toast notification rules
      const toastRules = await client.evaluate(`(() => {
        if (typeof window.showWikiToast === 'function') {
          window.showWikiToast('Тестовое уведомление');
        }
        const toast = document.getElementById('wikiToast');
        if (!toast) return null;
        const style = window.getComputedStyle(toast);
        return {
          left: style.left,
          right: style.right,
          bottom: style.bottom,
          maxWidth: style.maxWidth
        };
      })()`);

      record(
        `F14 Mobile Rules (${testWidth}px)`,
        `.wiki-toast bounds conform to full-width mobile inset (16px)`,
        toastRules && toastRules.left === '16px' && toastRules.right === '16px' && toastRules.bottom === '16px',
        toastRules
      );
    }

    // Boundary check right at 481px (verifying breakpoint switches back to desktop/tablet styles)
    console.log('\n  [Breakpoint Boundary Transition Check at 481px]');
    await client.setViewport(481, 667);
    await client.send('Page.navigate', { url: `http://localhost:${PORT}/#home` });
    await new Promise((r) => setTimeout(r, 100));

    const boundary481 = await client.evaluate(`(() => {
      const hero = document.querySelector('.portal-hero');
      const title = document.querySelector('.portal-title');
      return {
        heroPadding: window.getComputedStyle(hero).padding,
        titleFontSize: window.getComputedStyle(title).fontSize
      };
    })()`);

    record(
      'F14 Boundary Transition (481px)',
      'Breakpoint correctly deactivates at 481px (> 480px)',
      boundary481.titleFontSize !== '24px' && boundary481.heroPadding !== '24px 16px',
      boundary481
    );

    // -----------------------------------------------------------------------
    // TEST SECTION 4: WCAG 2.1 AA Contrast Verification in Browser Environment
    // -----------------------------------------------------------------------
    console.log('\n--- 4. Visual Contrast & WCAG 2.1 AA Verification ---');

    await client.setViewport(1024, 768);
    await client.send('Page.navigate', { url: `http://localhost:${PORT}/#characters` });
    await new Promise((r) => setTimeout(r, 100));

    // Evaluate light mode status badges
    const lightModeBadges = await client.evaluate(`(() => {
      document.documentElement.setAttribute('data-theme', 'light');

      function parseRgb(colorStr) {
        const m = colorStr.match(/rgba?\\((\\d+),\\s*(\\d+),\\s*(\\d+)/);
        return m ? [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])] : [0, 0, 0];
      }

      function lum([r, g, b]) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }

      function contrast(c1, c2) {
        const l1 = lum(c1);
        const l2 = lum(c2);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
      }

      const activeBadge = document.querySelector('.status-badge.status-жив, .status-active');
      const deceasedBadge = document.querySelector('.status-badge.status-мёртв, .status-deceased');
      const missingBadge = document.querySelector('.status-badge.status-отбывает-срок, .status-badge.status-пропал, .status-missing');

      const card = document.querySelector('.wiki-card');
      const cardBg = card ? window.getComputedStyle(card).backgroundColor : 'rgb(255, 255, 255)';
      const cardRgb = parseRgb(cardBg);

      return {
        active: activeBadge ? {
          color: window.getComputedStyle(activeBadge).color,
          contrast: contrast(parseRgb(window.getComputedStyle(activeBadge).color), cardRgb)
        } : null,
        deceased: deceasedBadge ? {
          color: window.getComputedStyle(deceasedBadge).color,
          contrast: contrast(parseRgb(window.getComputedStyle(deceasedBadge).color), cardRgb)
        } : null,
        missing: missingBadge ? {
          color: window.getComputedStyle(missingBadge).color,
          contrast: contrast(parseRgb(window.getComputedStyle(missingBadge).color), cardRgb)
        } : null,
        cardBg
      };
    })()`);

    record(
      'WCAG Contrast (Light Mode)',
      'Active status badge text contrast >= 4.5:1 against card background',
      lightModeBadges.active && lightModeBadges.active.contrast >= 4.5,
      lightModeBadges.active
    );

    record(
      'WCAG Contrast (Light Mode)',
      'Deceased status badge text contrast >= 4.5:1 against card background',
      lightModeBadges.deceased && lightModeBadges.deceased.contrast >= 4.5,
      lightModeBadges.deceased
    );

    record(
      'WCAG Contrast (Light Mode)',
      'Missing status badge text contrast >= 4.5:1 against card background',
      lightModeBadges.missing && lightModeBadges.missing.contrast >= 4.5,
      lightModeBadges.missing
    );

    // -----------------------------------------------------------------------
    // TEST SECTION 5: GPU Acceleration & Composite Transitions Verification
    // -----------------------------------------------------------------------
    console.log('\n--- 5. GPU Acceleration & Smooth Transitions Verification ---');

    const perfMetrics = await client.evaluate(`(() => {
      const card = document.querySelector('.wiki-card');
      const btn = document.querySelector('.nav-btn');
      const stamp = document.querySelector('.wiki-status-stamp');
      const modal = document.getElementById('searchModal');

      const cardStyle = card ? window.getComputedStyle(card) : null;
      const btnStyle = btn ? window.getComputedStyle(btn) : null;
      const stampStyle = stamp ? window.getComputedStyle(stamp) : null;
      const modalStyle = modal ? window.getComputedStyle(modal) : null;

      return {
        cardTransition: cardStyle ? cardStyle.transition : null,
        cardWillChange: cardStyle ? cardStyle.willChange : null,
        btnTransition: btnStyle ? btnStyle.transition : null,
        modalBackdropFilter: modalStyle ? (modalStyle.backdropFilter || modalStyle.webkitBackdropFilter) : null
      };
    })()`);

    const cardTransitionsSpecific = perfMetrics.cardTransition && !perfMetrics.cardTransition.includes('all 0');
    const cardHasWillChange = perfMetrics.cardWillChange && perfMetrics.cardWillChange.includes('transform');
    const btnTransitionsSpecific = perfMetrics.btnTransition && !perfMetrics.btnTransition.includes('all 0');

    record(
      'GPU & Performance',
      '.wiki-card uses specific composite transitions (transform, box-shadow)',
      cardTransitionsSpecific,
      { cardTransition: perfMetrics.cardTransition }
    );

    record(
      'GPU & Performance',
      '.wiki-card declares will-change: transform',
      cardHasWillChange,
      { willChange: perfMetrics.cardWillChange }
    );

    record(
      'GPU & Performance',
      '.nav-btn uses specific transition properties instead of transition: all',
      btnTransitionsSpecific,
      { btnTransition: perfMetrics.btnTransition }
    );

  } catch (err) {
    console.error('Fatal error during test run:', err);
    testResults.failed++;
  } finally {
    client.close();
    chrome.kill();
    server.close();
  }

  // -----------------------------------------------------------------------
  // SUMMARY & VERDICT
  // -----------------------------------------------------------------------
  console.log('\n========================================================================');
  console.log('  CHALLENGER 1 SUMMARY & VERDICT');
  console.log('========================================================================');
  console.log(`  Total Empirical Checks: ${testResults.total}`);
  console.log(`  Passed Checks:          \x1b[32m${testResults.passed}\x1b[0m`);
  console.log(`  Failed Checks:          \x1b[31m${testResults.failed}\x1b[0m`);
  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(1);
  console.log(`  Pass Rate:              ${passRate}%`);

  const verdict = testResults.failed === 0 ? 'APPROVE' : 'REJECT';
  console.log(`\n  FINAL VERDICT: \x1b[1m${verdict === 'APPROVE' ? '\x1b[32mAPPROVE' : '\x1b[31mREJECT'}\x1b[0m\n`);

  return {
    verdict,
    passRate,
    total: testResults.total,
    passed: testResults.passed,
    failed: testResults.failed,
    measurements: testResults.measurements
  };
}

if (require.main === module) {
  runEmpiricalQASuite().then(res => {
    process.exit(res.failed === 0 ? 0 : 1);
  });
}

module.exports = { runEmpiricalQASuite };
