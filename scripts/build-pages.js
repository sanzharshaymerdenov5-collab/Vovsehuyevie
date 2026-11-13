#!/usr/bin/env node
/**
 * Static Pre-Renderer & Sitemap Generator for «Во Все Хуёвые» Wiki
 *
 * Generates `#`-free static HTML entry points for all canon routes:
 * - index.html (Home Portal)
 * - characters/index.html, factions/index.html, episodes/index.html, timeline/index.html, graph/index.html
 * - character/<id>/index.html (all canon characters)
 * - faction/<id>/index.html (all canon factions)
 * - episode/<id>/index.html (all canon episode/film stubs)
 * - 404.html (GitHub Pages custom fallback with dynamic <base> asset recovery)
 * - sitemap.xml (100% clean `#`-free canonical URLs)
 *
 * Usage:
 *   node scripts/build-pages.js          # build/overwrite all static HTML files and sitemap.xml
 *   node scripts/build-pages.js --check  # verify existing files are up to date (for CI)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createBrowserEnvironment } = require('../tests/test_harness');

const ROOT_DIR = path.resolve(__dirname, '..');
const SITE_ORIGIN = 'https://sanzharshaymerdenov5-collab.github.io/Vovsehuyevie';
const DATA_VERSION = '2.6';
const LASTMOD = '2026-11-13';

const FAVICON_SVG_DATA = "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚗️</text></svg>";

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function loadCanonData() {
  const dataPath = path.join(ROOT_DIR, 'js', 'data.js');
  const code = fs.readFileSync(dataPath, 'utf8');
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(`${code}\nthis.__DATA__ = DEFAULT_WIKI_DATA;`, sandbox);
  return sandbox.__DATA__;
}

function renderArchModalHtml() {
  return `  <!-- Модальное окно: Архитектура статьи (Спецификация и стандарты Вики) -->
  <div class="modal-overlay hidden" id="architectureModal" role="dialog" aria-modal="true" aria-labelledby="archModalTitle">
    <div class="arch-modal-box">
      <div class="modal-header">
        <div class="modal-header-info">
          <div class="modal-badge">📐 Архитектура вики-статьи</div>
          <h3 id="archModalTitle">Пошаговый план структуры статьи</h3>
        </div>
        <button type="button" class="modal-close-btn" id="closeArchModalBtn" title="Закрыть" aria-label="Закрыть модальное окно">&times;</button>
      </div>

      <div class="modal-tabs" role="tablist" aria-label="Выбор типа статьи">
        <button type="button" class="modal-tab active" data-arch-tab="character" role="tab" aria-selected="true" aria-controls="archTabCharacter">👤 План персонажа (20 пунктов)</button>
        <button type="button" class="modal-tab" data-arch-tab="faction" role="tab" aria-selected="false" aria-controls="archTabFaction">🏛️ План группировки (8 пунктов)</button>
      </div>

      <div class="arch-modal-body">
        <div class="arch-tab-panel" id="archTabCharacter" role="tabpanel">
          <div class="arch-intro-card">
            <h4>Каноничный пошаговый план статьи о персонаже</h4>
            <p>Простая и приземлённая структура: от шапки инфобокса до финальных категорий статьи.</p>
          </div>
          <div class="arch-plan-grid">
            <div class="arch-plan-item"><span class="arch-plan-num">1</span><div class="arch-plan-content"><div class="arch-plan-title">Аватар</div><div class="arch-plan-desc">Фото героя из архива (JPG/WebP) или тематический эмодзи в инфобоксе.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">2</span><div class="arch-plan-content"><div class="arch-plan-title">Имя персонажа</div><div class="arch-plan-desc">Общеизвестное имя персонажа и заголовок статьи (например, Валентин Белинский).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">3</span><div class="arch-plan-content"><div class="arch-plan-title">Полное имя</div><div class="arch-plan-desc">Паспортное ФИО (например, Валентин "Белый" Белинский Агафонович).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">4</span><div class="arch-plan-content"><div class="arch-plan-title">Псевдонимы и клички</div><div class="arch-plan-desc">Криминальные клички, прозвища и обращения героев (Хуйзенберг, Свояк, Дорогой).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">5</span><div class="arch-plan-content"><div class="arch-plan-title">Статус</div><div class="arch-plan-desc">Текущее положение (Жив / Мёртв / Отбывает срок) со штампом в верхнем правом углу статьи.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">6</span><div class="arch-plan-content"><div class="arch-plan-title">Род деятельности</div><div class="arch-plan-desc">Основная профессия (варщик мефедрона, учитель, адвокат, опер ОБН).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">7</span><div class="arch-plan-content"><div class="arch-plan-title">Дата и место рождения</div><div class="arch-plan-desc">Точная дата рождения и родной город героя (г. Подзалупинск).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">8</span><div class="arch-plan-content"><div class="arch-plan-title">Судьба</div><div class="arch-plan-desc">Дата, место и причина смерти персонажа (если персонаж мёртв).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">9</span><div class="arch-plan-content"><div class="arch-plan-title">Личная жизнь</div><div class="arch-plan-desc">Семейное положение, дети, каноничный адрес проживания и ориентация.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">10</span><div class="arch-plan-content"><div class="arch-plan-title">Появления в сериале</div><div class="arch-plan-desc">Хронология эпизодов: первое появление («Пилот»), последнее («Хуелина»), фильм («Путь розового?»).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">11</span><div class="arch-plan-content"><div class="arch-plan-title">Принадлежность</div><div class="arch-plan-desc">Группировка, организация или картель (Наркоимперия Хуйзенберга, ОБН и др.).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">12</span><div class="arch-plan-content"><div class="arch-plan-title">Арсенал и навыки</div><div class="arch-plan-desc">Оружие, химический гений, турели в багажнике, знание лазеек в законе.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">13</span><div class="arch-plan-content"><div class="arch-plan-title">Исполнитель роли</div><div class="arch-plan-desc">Актёр или создатель, сыгравший роль в сериале (Родион Маракулин и др.).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">14</span><div class="arch-plan-content"><div class="arch-plan-title">Коронная цитата</div><div class="arch-plan-desc">Главная узнаваемая фраза («Я не в пизде Скулер, я и есть пизда Скулер»).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">15</span><div class="arch-plan-content"><div class="arch-plan-title">Общие сведения</div><div class="arch-plan-desc">Краткий синопсис о роли персонажа в сюжете Подзалупинска.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">16</span><div class="arch-plan-content"><div class="arch-plan-title">Биография</div><div class="arch-plan-desc">Подробная хроника жизни, разбитая на абзацы по ключевым сериям сериала.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">17</span><div class="arch-plan-content"><div class="arch-plan-title">Личность и характер</div><div class="arch-plan-desc">Психологический портрет, повадки, привычки и моральные ориентиры.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">18</span><div class="arch-plan-content"><div class="arch-plan-title">Связи и отношения</div><div class="arch-plan-desc">Взаимоотношения с персонажами: напарник, свояк, адвокат, враг, любовник, убийца.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">19</span><div class="arch-plan-content"><div class="arch-plan-title">Интересные факты</div><div class="arch-plan-desc">Детали съёмок, пасхалки, скрытые детали сюжета и лора.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">20</span><div class="arch-plan-content"><div class="arch-plan-title">Категории</div><div class="arch-plan-desc">Энциклопедические теги классификации для удобной навигации по вики.</div></div></div>
          </div>
        </div>

        <div class="arch-tab-panel hidden" id="archTabFaction" role="tabpanel">
          <div class="arch-intro-card">
            <h4>Каноничный пошаговый план статьи об организации / группировке</h4>
            <p>Чёткая 8-шаговая структура описания синдикатов, картелей и правоохранительных органов.</p>
          </div>
          <div class="arch-plan-grid">
            <div class="arch-plan-item"><span class="arch-plan-num">1</span><div class="arch-plan-content"><div class="arch-plan-title">Название</div><div class="arch-plan-desc">Официальное наименование организации или синдиката.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">2</span><div class="arch-plan-content"><div class="arch-plan-title">Лидер</div><div class="arch-plan-desc">Текущий или исторический главарь группировки.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">3</span><div class="arch-plan-content"><div class="arch-plan-title">Тип</div><div class="arch-plan-desc">Классификация (наркокартель, спецслужба, фастфуд-прикрытие, уличная банда).</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">4</span><div class="arch-plan-content"><div class="arch-plan-title">Штаб-квартира</div><div class="arch-plan-desc">База операций, лаборатория или штаб в Подзалупинске.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">5</span><div class="arch-plan-content"><div class="arch-plan-title">Девиз</div><div class="arch-plan-desc">Официальный или негласный лозунг организации.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">6</span><div class="arch-plan-content"><div class="arch-plan-title">Деятельность и цели</div><div class="arch-plan-desc">Профиль операций, криминальные схемы и основные цели группировки.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">7</span><div class="arch-plan-content"><div class="arch-plan-title">История основания</div><div class="arch-plan-desc">Зарождение, ключевые войны за влияние, расцвет и крах синдиката.</div></div></div>
            <div class="arch-plan-item"><span class="arch-plan-num">8</span><div class="arch-plan-content"><div class="arch-plan-title">Известные участники</div><div class="arch-plan-desc">Карточки причастных персонажей, входящих в состав организации.</div></div></div>
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" id="copyArchPlanBtn">
          <span class="btn-icon">📋</span> Скопировать план
        </button>
        <button type="button" class="btn btn-primary" id="closeArchModalBtn2">Понятно, закрыть</button>
      </div>
    </div>
  </div>`;
}

function buildShellHtml(spec, stats, preRendered = null) {
  const prefix = spec.depth > 0 ? '../'.repeat(spec.depth) : '';
  const homeHref = prefix || './';
  const is404 = spec.route === '404';
  const robotsContent = is404 ? 'noindex, follow' : 'index, follow';

  const navItems = [
    { view: 'home', href: homeHref, label: 'Главная' },
    { view: 'characters', href: `${prefix}characters/`, label: 'Персонажи' },
    { view: 'factions', href: `${prefix}factions/`, label: 'Группировки' },
    { view: 'episodes', href: `${prefix}episodes/`, label: 'Серии' },
    { view: 'timeline', href: `${prefix}timeline/`, label: 'Хронология' },
    { view: 'graph', href: `${prefix}graph/`, label: 'Граф связей' }
  ];

  const baseRecoveryScript = is404 ? `
  <script>
    if (location.protocol !== 'file:' && !/\\/404\\.html$/i.test(location.pathname)) {
      var baseEl = document.createElement('base');
      baseEl.href = location.pathname.indexOf('/Vovsehuyevie/') === 0 ? '/Vovsehuyevie/' : '/';
      document.head.appendChild(baseEl);
    }
  </script>` : '';

  const structuredData = is404 ? '' : `
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': spec.schemaType || 'WebPage',
    name: spec.title,
    description: spec.description,
    url: spec.canonicalUrl,
    inLanguage: 'ru',
    isPartOf: {
      '@type': 'WebSite',
      name: 'Во Все Хуёвые — Википедия',
      url: `${SITE_ORIGIN}/`
    }
  }).replace(/<\//g, '<\\/')}</script>`;

  const ogImage = spec.ogImage || `${SITE_ORIGIN}/assets/valentin.jpg`;
  const breadcrumbsHtml = preRendered ? preRendered.breadcrumbsHtml : `<a href="${escapeHtml(homeHref)}">Вики</a><span class="bc-sep">/</span><span class="bc-current">${escapeHtml(spec.breadcrumbLabel || 'Главная')}</span>`;
  const viewportHtml = preRendered ? preRendered.viewportHtml : '';

  return `<!DOCTYPE html>
<html lang="ru" data-theme="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="wiki-depth" content="${spec.depth}">
  <meta name="wiki-route" content="${escapeHtml(spec.route)}">
  <title>${escapeHtml(spec.title)}</title>
  <meta name="description" content="${escapeHtml(spec.description)}">
  <meta name="keywords" content="Во Все Хуёвые, Хуйзенберг, Валентин Белинский, Джесси Розовый, Стояк, Подзалупинск, вики, энциклопедия, сериал">
  <meta name="robots" content="${robotsContent}">
  <meta name="theme-color" content="#0f1117">${baseRecoveryScript}

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="${spec.ogType || 'website'}">
  <meta property="og:site_name" content="Во Все Хуёвые — Википедия">
  <meta property="og:title" content="${escapeHtml(spec.title)}">
  <meta property="og:description" content="${escapeHtml(spec.description)}">
  <meta property="og:url" content="${escapeHtml(spec.canonicalUrl)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:width" content="1024">
  <meta property="og:image:height" content="649">
  <meta property="og:locale" content="ru_RU">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${escapeHtml(spec.title)}">
  <meta name="twitter:description" content="${escapeHtml(spec.description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">

  <!-- Canonical, Manifest & Icons -->
  ${is404 ? '' : `<link rel="canonical" href="${escapeHtml(spec.canonicalUrl)}">`}
  <link rel="manifest" href="${prefix}manifest.webmanifest">
  <link rel="icon" type="image/png" sizes="32x32" href="${prefix}assets/favicon-32.png">
  <link rel="icon" type="image/svg+xml" href="${FAVICON_SVG_DATA}">
  <link rel="apple-touch-icon" sizes="180x180" href="${prefix}assets/apple-touch-icon.png">

  <!-- Resource & Font Preconnects -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600;700&family=Lora:wght@700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="${prefix}css/style.css?v=${DATA_VERSION}">${structuredData}
</head>
<body>
  <!-- Skip Link for Accessibility (WCAG 2.1 AA) -->
  <a href="#contentViewport" class="skip-link">Перейти к основному содержанию</a>

  <!-- Верхняя панель навигации -->
  <header class="wiki-header">
    <div class="header-container">
      <a href="${escapeHtml(homeHref)}" class="logo-area" id="homeLogoBtn" data-view="home" aria-label="Во Все Хуёвые — Главная страница">
        <div class="logo-icon">⚗️</div>
        <div class="logo-text">
          <span class="wiki-super" id="wikiUniverseTitle">ПАРОДИЙНАЯ ВИКИПЕДИЯ</span>
          <span class="wiki-main" id="wikiMainTitle">Во Все Хуёвые</span>
        </div>
      </a>

      <nav class="main-nav" aria-label="Основная навигация">
${navItems.map(item => {
  const isActive = spec.activeNav === item.view;
  return `        <a href="${escapeHtml(item.href)}" class="nav-btn${isActive ? ' active' : ''}" data-view="${item.view}"${isActive ? ' aria-current="page"' : ''}>${escapeHtml(item.label)}</a>`;
}).join('\n')}
      </nav>

      <div class="header-actions">
        <button type="button" class="header-icon-btn" id="randomArticleBtn" title="Случайная статья" aria-label="Открыть случайную статью">🎲</button>

        <button type="button" class="search-trigger" id="openSearchBtn" aria-label="Открыть быстрый поиск">
          <span class="search-icon">🔍</span>
          <span class="search-placeholder">Быстрый поиск...</span>
          <kbd class="kbd-shortcut">/</kbd>
        </button>

        <button type="button" class="theme-toggle-btn" id="themeToggleBtn" title="Сменить тему (Светлая / Тёмная)" aria-label="Сменить тему (Светлая / Тёмная)" aria-pressed="false">
          <span id="themeIcon">🌙</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Подпанель: Хлебные крошки и статистика -->
  <div class="sub-banner">
    <div class="sub-banner-container">
      <nav class="wiki-breadcrumbs" id="wikiBreadcrumbs" aria-label="Хлебные крошки">${breadcrumbsHtml}</nav>
      <div class="wiki-quick-stats" id="quickStats">
        <span class="stat-pill"><strong id="statCharCount">${stats.charsCount}</strong> Персонажей</span>
        <span class="stat-pill"><strong id="statFactionCount">${stats.factionsCount}</strong> Группировок</span>
        <span class="stat-pill"><strong id="statArticleCount">${stats.totalArticles}</strong> Статей</span>
      </div>
    </div>
  </div>

  <!-- Основной контент страницы -->
  <main class="wiki-layout" id="mainLayout">
    <div class="content-viewport" id="contentViewport" tabindex="-1">${viewportHtml}</div>
  </main>

  <!-- Модальное окно глобального мгновенного поиска -->
  <div class="modal-overlay hidden" id="searchModal" role="dialog" aria-modal="true" aria-labelledby="searchModalTitle">
    <div class="search-modal-box">
      <h2 id="searchModalTitle" class="visually-hidden">Поиск по энциклопедии</h2>
      <div class="search-input-wrapper">
        <span class="search-box-icon">🔍</span>
        <input type="text" id="globalSearchInput" placeholder="Поиск персонажей, псевдонимов, цитат, серий..." autocomplete="off" aria-label="Поиск по энциклопедии" role="combobox" aria-autocomplete="list" aria-controls="searchResultsList" aria-expanded="false">
        <button type="button" class="modal-close-btn" id="closeSearchBtn" aria-label="Закрыть поиск">&times;</button>
      </div>
      <div class="search-filters-row">
        <span class="filter-label">Фильтр:</span>
        <button type="button" class="filter-chip active" data-filter="all">Все</button>
        <button type="button" class="filter-chip" data-filter="character">Персонажи</button>
        <button type="button" class="filter-chip" data-filter="faction">Группировки</button>
        <button type="button" class="filter-chip" data-filter="episode">Серии</button>
      </div>
      <div class="search-results-list" id="searchResultsList" role="listbox" aria-live="polite">
        <!-- Результаты генерируются динамически -->
      </div>
      <div class="search-footer">
        <span>Клавиши: <kbd>↑</kbd> <kbd>↓</kbd> выбор, <kbd>Enter</kbd> перейти, <kbd>ESC</kbd> закрыть</span>
      </div>
    </div>
  </div>

${renderArchModalHtml()}

  <!-- Подвал сайта (Footer) -->
  <footer class="wiki-footer">
    <div class="footer-container">
      <div class="footer-col">
        <h4>О сериале и Вики</h4>
        <p>Неофициальная база знаний и энциклопедия культового пародийного сериала «Во Все Хуёвые». Все персонажи, цитаты и события Подзалупинска бережно задокументированы.</p>
      </div>
      <div class="footer-col">
        <h4>Навигация</h4>
        <ul>
          <li><a href="${prefix}characters/" class="quick-link" data-view="characters">Список всех персонажей</a></li>
          <li><a href="${prefix}factions/" class="quick-link" data-view="factions">Группировки и картели</a></li>
          <li><a href="${prefix}episodes/" class="quick-link" data-view="episodes">Серии</a></li>
          <li><a href="${prefix}timeline/" class="quick-link" data-view="timeline">Хронология серий</a></li>
          <li><a href="${prefix}graph/" class="quick-link" data-view="graph">Граф связей персонажей</a></li>
          <li><button type="button" class="footer-action-link" id="exportDataBtn">Скачать архив базы (JSON)</button></li>
          <li><button type="button" class="footer-action-link" id="resetDataBtn">Сбросить настройки</button></li>
        </ul>
      </div>
      <div class="footer-col" id="footerEditingCol">
        <h4>Редактирование</h4>
        <p>Каноничная база знаний защищена от произвольных правок. Для ознакомления со стандартом оформления и структурой страниц используйте спецификацию:</p>
        <button type="button" class="btn btn-secondary btn-arch-footer" id="openArchitectureBtn">
          <span class="btn-icon">📐</span>
          <span>Архитектура статьи</span>
        </button>
      </div>
    </div>
    <div class="footer-bottom">
      <p>&copy; Энциклопедия «Во Все Хуёвые». Версия базы v${DATA_VERSION}.</p>
    </div>
  </footer>

  <button type="button" class="back-to-top-btn" id="backToTopBtn" aria-label="Наверх">↑ Наверх</button>

  <!-- Скрипты приложения -->
  <script src="${prefix}js/data.js?v=${DATA_VERSION}"></script>
  <script src="${prefix}js/app.js?v=${DATA_VERSION}"></script>
</body>
</html>
`;
}

function preRenderRoute(spec, stats) {
  const shellHtml = buildShellHtml(spec, stats, null);
  const env = createBrowserEnvironment({
    htmlContent: shellHtml,
    protocol: 'file:',
    initialPath: spec.route === 'home' ? '/' : `/${spec.route}/`
  });
  if (env.scriptExecutionError) {
    throw env.scriptExecutionError;
  }
  const viewportEl = env.document.getElementById('contentViewport');
  const breadcrumbsEl = env.document.getElementById('wikiBreadcrumbs');
  return buildShellHtml(spec, stats, {
    viewportHtml: viewportEl ? viewportEl.innerHTML : '',
    breadcrumbsHtml: breadcrumbsEl ? breadcrumbsEl.innerHTML : ''
  });
}

function getAllRouteSpecs(data) {
  const specs = [
    {
      outRelPath: 'index.html',
      route: 'home',
      depth: 0,
      activeNav: 'home',
      title: 'Во Все Хуёвые — Официальная Энциклопедия и База Знаний',
      description: 'Официальная вики пародийного сериала «Во Все Хуёвые». Биографии Валентина Белинского (Хуйзенберга), Стояка, Джесси Розового, группировки и хронология серий.',
      canonicalUrl: `${SITE_ORIGIN}/`,
      ogType: 'website',
      schemaType: 'WebSite',
      priority: '1.0',
      changefreq: 'weekly',
      breadcrumbLabel: 'Главная'
    },
    {
      outRelPath: 'characters/index.html',
      route: 'characters',
      depth: 1,
      activeNav: 'characters',
      title: 'Персонажи — «Во Все Хуёвые» Wiki',
      description: 'Полная картотека персонажей сериала «Во Все Хуёвые»: Валентин Белинский, Джесси Розовый, Стояк Белинский, Гусев Ферангий, Сосик Гудман и другие.',
      canonicalUrl: `${SITE_ORIGIN}/characters/`,
      ogType: 'website',
      schemaType: 'CollectionPage',
      priority: '0.9',
      changefreq: 'weekly',
      breadcrumbLabel: 'Персонажи'
    },
    {
      outRelPath: 'factions/index.html',
      route: 'factions',
      depth: 1,
      activeNav: 'factions',
      title: 'Группировки — «Во Все Хуёвые» Wiki',
      description: 'Все группировки и синдикаты Подзалупинска: Наркоимперия Хуйзенберга, Наркоимперия Гусева Ферангия, ОБН Подзалупинска (ГНК).',
      canonicalUrl: `${SITE_ORIGIN}/factions/`,
      ogType: 'website',
      schemaType: 'CollectionPage',
      priority: '0.8',
      changefreq: 'weekly',
      breadcrumbLabel: 'Группировки'
    },
    {
      outRelPath: 'episodes/index.html',
      route: 'episodes',
      depth: 1,
      activeNav: 'episodes',
      title: 'Серии — «Во Все Хуёвые» Wiki',
      description: 'Список каноничных серий сериала «Во Все Хуёвые» и полнометражного фильма «Путь розового?».',
      canonicalUrl: `${SITE_ORIGIN}/episodes/`,
      ogType: 'website',
      schemaType: 'CollectionPage',
      priority: '0.8',
      changefreq: 'weekly',
      breadcrumbLabel: 'Серии'
    },
    {
      outRelPath: 'timeline/index.html',
      route: 'timeline',
      depth: 1,
      activeNav: 'timeline',
      title: 'Хронология — «Во Все Хуёвые» Wiki',
      description: 'Каноничная хронология ключевых дат, серий и событий вселенной «Во Все Хуёвые» с 1954 по 2025 год.',
      canonicalUrl: `${SITE_ORIGIN}/timeline/`,
      ogType: 'website',
      schemaType: 'CollectionPage',
      priority: '0.8',
      changefreq: 'weekly',
      breadcrumbLabel: 'Хронология серий'
    },
    {
      outRelPath: 'graph/index.html',
      route: 'graph',
      depth: 1,
      activeNav: 'graph',
      title: 'Граф связей — «Во Все Хуёвые» Wiki',
      description: 'Интерактивная карта отношений между персонажами и группировками Подзалупинска.',
      canonicalUrl: `${SITE_ORIGIN}/graph/`,
      ogType: 'website',
      schemaType: 'WebPage',
      priority: '0.8',
      changefreq: 'weekly',
      breadcrumbLabel: 'Граф связей'
    }
  ];

  (data.characters || []).forEach(c => {
    specs.push({
      outRelPath: `character/${c.id}/index.html`,
      route: `character/${c.id}`,
      depth: 2,
      activeNav: 'characters',
      title: `${c.name} — «Во Все Хуёвые» Wiki`,
      description: c.overview || `${c.name} — персонаж энциклопедии «Во Все Хуёвые».`,
      canonicalUrl: `${SITE_ORIGIN}/character/${c.id}/`,
      ogImage: c.isImage && c.avatar ? `${SITE_ORIGIN}/${c.avatar}` : undefined,
      ogType: 'article',
      schemaType: 'ProfilePage',
      priority: '0.8',
      changefreq: 'monthly',
      breadcrumbLabel: c.name
    });
  });

  (data.factions || []).forEach(f => {
    specs.push({
      outRelPath: `faction/${f.id}/index.html`,
      route: `faction/${f.id}`,
      depth: 2,
      activeNav: 'factions',
      title: `${f.name} — «Во Все Хуёвые» Wiki`,
      description: f.summary || `${f.name} — группировка вселенной «Во Все Хуёвые».`,
      canonicalUrl: `${SITE_ORIGIN}/faction/${f.id}/`,
      ogType: 'article',
      schemaType: 'Article',
      priority: '0.7',
      changefreq: 'monthly',
      breadcrumbLabel: f.name
    });
  });

  (data.episodes || []).forEach(ep => {
    specs.push({
      outRelPath: `episode/${ep.id}/index.html`,
      route: `episode/${ep.id}`,
      depth: 2,
      activeNav: 'episodes',
      title: `«${ep.title}» — «Во Все Хуёвые» Wiki`,
      description: `${ep.kind || 'Серия'} «${ep.title}» в базе знаний «Во Все Хуёвые». Статус страницы: ${ep.status || 'В разработке'}.`,
      canonicalUrl: `${SITE_ORIGIN}/episode/${ep.id}/`,
      ogType: 'article',
      schemaType: 'Article',
      priority: '0.6',
      changefreq: 'monthly',
      breadcrumbLabel: `«${ep.title}»`
    });
  });

  specs.push({
    outRelPath: '404.html',
    route: '404',
    depth: 0,
    activeNav: '',
    title: 'Страница не найдена — «Во Все Хуёвые» Wiki',
    description: 'Запрошенный архив не найден в базе знаний «Во Все Хуёвые».',
    canonicalUrl: `${SITE_ORIGIN}/`,
    ogType: 'website',
    schemaType: 'WebPage',
    excludeFromSitemap: true,
    breadcrumbLabel: '404'
  });

  return specs;
}

function buildSitemapXml(specs) {
  const urls = specs.filter(s => !s.excludeFromSitemap);
  const urlBlocks = urls.map(u => `  <url>
    <loc>${escapeHtml(u.canonicalUrl)}</loc>
    <lastmod>${LASTMOD}</lastmod>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlBlocks}
</urlset>
`;
}

function findOrphanEntityDirs(data) {
  const expectedByRoot = {
    character: new Set((data.characters || []).map(c => c.id)),
    faction: new Set((data.factions || []).map(f => f.id)),
    episode: new Set((data.episodes || []).map(e => e.id))
  };
  const orphans = [];
  for (const [dirName, validIds] of Object.entries(expectedByRoot)) {
    const parentDir = path.join(ROOT_DIR, dirName);
    if (!fs.existsSync(parentDir)) continue;
    for (const entry of fs.readdirSync(parentDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !validIds.has(entry.name)) {
        orphans.push(`${dirName}/${entry.name}`);
      }
    }
  }
  return orphans;
}

function main() {
  const isCheckOnly = process.argv.includes('--check');
  const data = loadCanonData();
  const stats = {
    charsCount: (data.characters || []).length,
    factionsCount: (data.factions || []).length,
    totalArticles: (data.characters || []).length + (data.factions || []).length + (data.episodes || []).length + 2
  };

  const specs = getAllRouteSpecs(data);
  const outputs = specs.map(spec => ({
    relPath: spec.outRelPath,
    content: preRenderRoute(spec, stats)
  }));

  outputs.push({
    relPath: 'sitemap.xml',
    content: buildSitemapXml(specs)
  });

  const orphanDirs = findOrphanEntityDirs(data);

  if (isCheckOnly) {
    const stale = [...orphanDirs.map(d => `${d}/ (orphaned)`)];
    for (const file of outputs) {
      const absPath = path.join(ROOT_DIR, file.relPath);
      if (!fs.existsSync(absPath) || fs.readFileSync(absPath, 'utf8') !== file.content) {
        stale.push(file.relPath);
      }
    }
    if (stale.length > 0) {
      console.error(`Build check failed: stale or missing files (${stale.length}):\n- ${stale.join('\n- ')}`);
      process.exit(1);
    }
    console.log(`Build check passed: all ${outputs.length} pre-rendered files and sitemap.xml are up to date.`);
    return;
  }

  for (const orphanRel of orphanDirs) {
    fs.rmSync(path.join(ROOT_DIR, orphanRel), { recursive: true, force: true });
    console.log(`Removed orphaned directory: ${orphanRel}/`);
  }

  for (const file of outputs) {
    const absPath = path.join(ROOT_DIR, file.relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, file.content, 'utf8');
  }

  console.log(`Generated ${outputs.length} files (${outputs.length - 1} HTML pages + sitemap.xml).`);
}

if (require.main === module) {
  main();
}

module.exports = { buildShellHtml, buildSitemapXml, getAllRouteSpecs };
