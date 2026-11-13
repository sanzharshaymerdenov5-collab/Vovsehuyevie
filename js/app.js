/**
 * ВО ВСЕ ХУЁВЫЕ - ОСНОВНАЯ ЛОГИКА ВИКИПЕДИИ
 * Чистая маршрутизация без # (History API), интерактивный поиск с подсветкой,
 * граф связей, каталог серий, генерация инфобоксов и доступный интерфейс.
 */

// Отказоустойчивое хранилище с fallback в оперативную память при SecurityError / QuotaExceededError
const safeStorage = {
  _memory: new Map(),
  getItem(key, defaultValue = null) {
    if (this._memory.has(key)) {
      const val = this._memory.get(key);
      return val !== null ? val : defaultValue;
    }
    try {
      if (typeof localStorage !== 'undefined') {
        const val = localStorage.getItem(key);
        if (val !== null) {
          this._memory.set(key, val);
          return val;
        }
      }
    } catch (e) {}
    return defaultValue;
  },
  setItem(key, value) {
    const strVal = String(value);
    this._memory.set(key, strVal);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, strVal);
      }
    } catch (e) {}
  },
  removeItem(key) {
    this._memory.set(key, null);
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(key);
      }
    } catch (e) {}
  },
  clear() {
    this._memory.clear();
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
    } catch (e) {}
  }
};

// Контекст маршрутизации (поддержка GitHub Pages /Vovsehuyevie/, корня localhost / и локального file://)
const ROUTING = {
  isFile: false,
  fileRoot: '',
  basePath: '',
  virtualRoute: 'home',
  virtualQuery: '',
  initialized: false
};

function ensureRoutingContext() {
  if (ROUTING.initialized) return;
  ROUTING.initialized = true;

  const loc = window.location || {};
  ROUTING.isFile = (loc.protocol || '') === 'file:';

  const metaDepth = document.querySelector('meta[name="wiki-depth"]');
  const depth = metaDepth ? parseInt(metaDepth.getAttribute('content') || '0', 10) : 0;
  ROUTING.fileRoot = depth > 0 ? '../'.repeat(depth) : '';

  const metaRoute = document.querySelector('meta[name="wiki-route"]');
  const initialMetaRoute = metaRoute ? metaRoute.getAttribute('content') : 'home';

  if (ROUTING.isFile) {
    ROUTING.virtualRoute = initialMetaRoute || 'home';
    ROUTING.basePath = '';
  } else {
    const p = (loc.pathname || '/').replace(/\/index\.html$/i, '');
    const host = loc.hostname || loc.host || '';
    if (p === '/Vovsehuyevie' || p.startsWith('/Vovsehuyevie/')) {
      ROUTING.basePath = '/Vovsehuyevie';
    } else if (initialMetaRoute !== '404' && depth > 0) {
      const segs = p.split('/').filter(Boolean);
      const routeSegs = initialMetaRoute && initialMetaRoute !== 'home' ? initialMetaRoute.split('/').filter(Boolean) : [];
      if (segs.length >= depth && routeSegs.every((s, idx) => segs[segs.length - depth + idx] === s)) {
        const baseSegs = segs.slice(0, Math.max(0, segs.length - depth));
        ROUTING.basePath = baseSegs.length ? `/${baseSegs.join('/')}` : '';
      } else {
        ROUTING.basePath = '';
      }
    } else if (host.endsWith('.github.io')) {
      const segs = p.split('/').filter(Boolean);
      const knownTopRoutes = new Set(['characters', 'character', 'factions', 'faction', 'episodes', 'episode', 'timeline', 'graph']);
      ROUTING.basePath = (segs.length > 0 && !knownTopRoutes.has(segs[0])) ? `/${segs[0]}` : '';
    } else {
      ROUTING.basePath = '';
    }
  }
}

function normalizeRouteTarget(rawTarget) {
  ensureRoutingContext();
  let str = String(rawTarget || '').trim();
  if (str.startsWith('#')) {
    str = str.replace(/^#+/, '');
  }
  let query = '';
  const qIdx = str.indexOf('?');
  if (qIdx !== -1) {
    query = str.slice(qIdx + 1);
    str = str.slice(0, qIdx);
  }
  if (ROUTING.basePath && (str === ROUTING.basePath || str.startsWith(`${ROUTING.basePath}/`))) {
    str = str.slice(ROUTING.basePath.length);
  }
  str = str.replace(/\/index\.html$/i, '').replace(/^\/+|\/+$/g, '');
  if (!str || str === 'home') str = '';
  return { path: str, query };
}

function routeToHref(target) {
  ensureRoutingContext();
  const { path, query } = normalizeRouteTarget(target);
  if (ROUTING.isFile) {
    const base = path ? `${ROUTING.fileRoot}${path}/` : (ROUTING.fileRoot || './');
    return query ? `${base}?${query}` : base;
  }
  const base = path ? `${ROUTING.basePath}/${path}/` : `${ROUTING.basePath}/`;
  return query ? `${base}?${query}` : base;
}

function assetUrl(relPath) {
  ensureRoutingContext();
  if (!relPath) return '';
  if (/^(https?:|data:|\/)/i.test(relPath)) return relPath;
  const clean = relPath.replace(/^\.\//, '');
  if (!clean.includes('/')) return clean;
  return ROUTING.isFile ? `${ROUTING.fileRoot}${clean}` : `${ROUTING.basePath}/${clean}`;
}

function navigateTo(target, { replace = false } = {}) {
  ensureRoutingContext();
  const trimmed = String(target || '').trim();

  if (trimmed.startsWith('#sec-') || trimmed.startsWith('sec-')) {
    const secId = trimmed.replace(/^#/, '');
    const viewport = document.getElementById('contentViewport');
    if (viewport && (!viewport.children || viewport.children.length === 0)) {
      renderHomeView(viewport);
    }
    const secEl = document.getElementById(secId);
    if (secEl && typeof secEl.scrollIntoView === 'function') {
      secEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

  const { path, query } = normalizeRouteTarget(trimmed);
  const routeKey = path || 'home';

  if (ROUTING.isFile) {
    ROUTING.virtualRoute = routeKey;
    ROUTING.virtualQuery = query;
  } else {
    const nextUrl = routeToHref(query ? `${routeKey}?${query}` : routeKey);
    const currentFull = `${window.location.pathname || '/'}${window.location.search || ''}`;
    try {
      if (replace && window.history && typeof window.history.replaceState === 'function') {
        window.history.replaceState({ route: routeKey, query }, '', nextUrl);
      } else if (nextUrl !== currentFull && window.history && typeof window.history.pushState === 'function') {
        window.history.pushState({ route: routeKey, query }, '', nextUrl);
      } else {
        ROUTING.virtualRoute = routeKey;
        ROUTING.virtualQuery = query;
      }
    } catch (e) {
      ROUTING.virtualRoute = routeKey;
      ROUTING.virtualQuery = query;
    }
  }

  handleRoute();
}
window.navigateTo = navigateTo;

// Утилита дебаунсинга для поисковых инпутов (150ms, без двойного срабатывания на одном нажатии)
function debounce(func, wait = 150, immediate = true) {
  let timeout;
  let hasTrailingArgs = false;
  let lastArgs = null;
  let lastContext = null;

  return function(...args) {
    lastContext = this;
    lastArgs = args;
    const callNow = immediate && !timeout;
    if (timeout) {
      hasTrailingArgs = true;
    }
    clearTimeout(timeout);
    timeout = setTimeout(() => {
      timeout = null;
      if (!immediate || hasTrailingArgs) {
        hasTrailingArgs = false;
        func.apply(lastContext, lastArgs);
      }
    }, wait);
    if (callNow) {
      hasTrailingArgs = false;
      func.apply(lastContext, lastArgs);
    }
  };
}

// Предкомпилированные сущности для энциклопедической викификации текста
// ВАЖНО: все внутренние группы должны быть незахватывающими (?:...) для точного индексирования!
const WIKI_ENTITIES = [
  { pattern: /Валентин(?:а|у|ом|е)?\s+(?:«Белый»\s+)?Белинск(?:ий|ого|ому|им|ом)\s+Агафонович/, route: 'character/valentin-belinsky', id: 'valentin-belinsky' },
  { pattern: /Валентин(?:а|у|ом|е)?\s+Белинск(?:ий|ого|ому|им|ом)/, route: 'character/valentin-belinsky', id: 'valentin-belinsky' },
  { pattern: /Наркоимпери(?:я|и|ю|ей)\s+Хуйзенберга/, route: 'faction/huizenberg-empire', id: 'huizenberg-empire' },
  { pattern: /Наркоимпери(?:я|и|ю|ей)\s+Гусева\s+Ферангия/, route: 'faction/gusev-empire', id: 'gusev-empire' },
  { pattern: /Хуйзенберг(?:а|у|ом|е)?/, route: 'character/valentin-belinsky', id: 'valentin-belinsky' },
  { pattern: /Валентин(?:а|у|ом|е)?(?![а-яёА-ЯЁ])/, route: 'character/valentin-belinsky', id: 'valentin-belinsky' },
  { pattern: /Стояк(?:а|у|ом|е)?\s+Геннадьевич(?:а)?\s+Шрейдеров(?:а)?/, route: 'character/stoyak-belinsky', id: 'stoyak-belinsky' },
  { pattern: /Стояк(?:а|у|ом|е)?\s+Белинск(?:ий|ого|ому|им|ом)/, route: 'character/stoyak-belinsky', id: 'stoyak-belinsky' },
  { pattern: /(?:агент(?:а|у|ом)?\s+)?Стояк(?:а|у|ом|е)?(?![а-яёА-ЯЁ])/, route: 'character/stoyak-belinsky', id: 'stoyak-belinsky' },
  { pattern: /Скулер\s+Белинск(?:ая|ой|ую)/, route: 'character/skyler-belinskaya', id: 'skyler-belinskaya' },
  { pattern: /Скулер(?![а-яёА-ЯЁ])/, route: 'character/skyler-belinskaya', id: 'skyler-belinskaya' },
  { pattern: /Сосик(?:а|у|ом|е)?\s+\(Джимми\)\s+Гудманов(?:а)?(?:\s+Михайлович)?/, route: 'character/sosik-goodman', id: 'sosik-goodman' },
  { pattern: /Сосик(?:а|у|ом|е)?\s+Гудман(?:а|у|ом|е)?/, route: 'character/sosik-goodman', id: 'sosik-goodman' },
  { pattern: /Сосик(?:а|у|ом|е)?(?![а-яёА-ЯЁ])/, route: 'character/sosik-goodman', id: 'sosik-goodman' },
  { pattern: /Гусев(?:а|у|ым|ом|е)?\s+Феранги(?:й|я|ю|ем|е)/, route: 'character/gusev-ferangiy', id: 'gusev-ferangiy' },
  { pattern: /Гусь\s+Феранги(?:й|я|ю|ем|е)/, route: 'character/gusev-ferangiy', id: 'gusev-ferangiy' },
  { pattern: /(?<![а-яёА-ЯЁ])(?:Гусев(?:а|у|ым|ом|е)?|Гусь)(?![а-яёА-ЯЁ])/, route: 'character/gusev-ferangiy', id: 'gusev-ferangiy' },
  { pattern: /Голубо(?:й|го|м)\s+шампур(?:а|у|ом|е)?/, route: 'faction/gusev-empire', id: 'gusev-empire' },
  { pattern: /Гей\s+Анальн(?:ый|ого)\s+Химбиович(?:а)?/, route: 'character/gey-himbiovech', id: 'gey-himbiovech' },
  { pattern: /(?:Гей|Гея|Гею|Геем)\s+Химбиович(?:а|у|ем|е)?/, route: 'character/gey-himbiovech', id: 'gey-himbiovech' },
  { pattern: /(?:Гей|Гея|Гею|Геем)\s+Химирович(?:а|у|ем|е)?/, route: 'character/gey-himbiovech', id: 'gey-himbiovech' },
  { pattern: /Химбиович(?:а|у|ем|е)?/, route: 'character/gey-himbiovech', id: 'gey-himbiovech' },
  { pattern: /Хербиович(?:а|у|ем|е)?/, route: 'character/gey-himbiovech', id: 'gey-himbiovech' },
  { pattern: /Жесси\s+рiзiв(?:ым|ого|ому|ый)\s+пiрн(?:ем|я|ю|ь)/, route: 'character/jesse-pinkman', id: 'jesse-pinkman' },
  { pattern: /(?:Джесси|Жесси)\s+Розов(?:ый|ого|ому|ым|ом)/, route: 'character/jesse-pinkman', id: 'jesse-pinkman' },
  { pattern: /(?:Джесси|Жесси)(?![а-яёА-ЯЁ])/, route: 'character/jesse-pinkman', id: 'jesse-pinkman' },
  { pattern: /ОБН\s+Подзалупинска/, route: 'faction/obn-podzalupinsk', id: 'obn-podzalupinsk' },
  { pattern: /ОБН(?![а-яёА-ЯЁ])/, route: 'faction/obn-podzalupinsk', id: 'obn-podzalupinsk' },
  { pattern: /«Пилот\s+Мефедрона»|«Пилот\s+мефедрона»/, route: 'episode/pilot-mefedrona', id: 'pilot-mefedrona' },
  { pattern: /«Попандос\s+Хуендос»/, route: 'episode/popandos-huendos', id: 'popandos-huendos' },
  { pattern: /«Лучше\s+нюхайте\s+соль»/, route: 'episode/luchshe-nyuhayte-sol', id: 'luchshe-nyuhayte-sol' },
  { pattern: /«Полная\s+и\s+жирная\s+мера»/, route: 'episode/polnaya-i-zhirnaya-mera', id: 'polnaya-i-zhirnaya-mera' },
  { pattern: /«Без\s+яйца»/, route: 'episode/bez-yaytsa', id: 'bez-yaytsa' },
  { pattern: /«Скажи\s+мои\s+сиськи»/, route: 'episode/skazhi-moi-siski', id: 'skazhi-moi-siski' },
  { pattern: /«Хуелина»/, route: 'episode/huelina', id: 'huelina' },
  { pattern: /«Путь\s+розового\?»/, route: 'episode/put-rozovogo', id: 'put-rozovogo' },
  { pattern: /г\.\s+Подзалупинск(?:а|у|ом|е)?|Подзалупинск(?:а|у|ом|е)?/, route: null, isPlace: true }
];

const WIKI_PATTERN = new RegExp(WIKI_ENTITIES.map(e => `(${e.pattern.source})`).join('|'), 'gi');

// Состояние приложения
const STATE = {
  data: null,
  currentView: 'home',
  currentId: null,
  theme: 'dark',
  searchQuery: '',
  searchFilter: 'all',
  selectedSearchIndex: -1,
  lastFocusedElement: null
};

function getInitialTheme() {
  const saved = safeStorage.getItem('wiki_theme', null);
  if (saved === 'light' || saved === 'dark') return saved;
  try {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  } catch (e) {}
  return 'dark';
}
STATE.theme = getInitialTheme();

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
  ensureRoutingContext();
  initData();
  initTheme();
  initNavigation();
  initSearch();
  initArchitectureModal();
  initExportReset();
  initBackToTop();

  // Слушатели истории браузера (History API без #) и совместимость со старыми #-ссылками
  window.addEventListener('popstate', handleRoute);
  window.addEventListener('hashchange', handleRoute);

  handleRoute();

  // Регистрация Service Worker только по HTTP(S) от корня сайта
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    const proto = (window.location && window.location.protocol) || '';
    if (proto === 'https:' || proto === 'http:') {
      const swUrl = `${ROUTING.basePath}/sw.js`;
      const swScope = `${ROUTING.basePath}/`;
      navigator.serviceWorker.register(swUrl, { scope: swScope }).catch(() => {});
    }
  }
});

/* ==========================================================================
   ДАННЫЕ И СТАТИСТИКА
   ========================================================================== */

function initData() {
  STATE.data = DEFAULT_WIKI_DATA;
  updateStats();
}

function saveData() {
  updateStats();
}

function updateStats() {
  const charsCount = (STATE.data.characters || []).length;
  const factionsCount = (STATE.data.factions || []).length;
  const episodesCount = (STATE.data.episodes || []).length;
  const totalPages = charsCount + factionsCount + episodesCount + 2; // + Хронология и Граф связей

  const elChar = document.getElementById('statCharCount');
  const elFac = document.getElementById('statFactionCount');
  const elArt = document.getElementById('statArticleCount');
  if (elChar) elChar.textContent = charsCount;
  if (elFac) elFac.textContent = factionsCount;
  if (elArt) elArt.textContent = totalPages;

  const headerSuper = document.getElementById('wikiUniverseTitle');
  const headerMain = document.getElementById('wikiMainTitle');
  if (headerSuper) headerSuper.textContent = STATE.data.universe.headerBadge || 'ПАРОДИЙНАЯ ВИКИПЕДИЯ';
  if (headerMain) headerMain.textContent = STATE.data.universe.title || 'Во Все Хуёвые';
}

function characterBelongsToFaction(char, faction) {
  if (!char || !faction) return false;
  if (char.factionId === faction.id) return true;
  return Array.isArray(faction.notableMembers) && faction.notableMembers.includes(char.id);
}

function getFactionMembers(faction) {
  if (!faction || !STATE.data || !STATE.data.characters) return [];
  return STATE.data.characters.filter(c => characterBelongsToFaction(c, faction));
}

/* ==========================================================================
   ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ (СВЕТЛАЯ / ТЁМНАЯ)
   ========================================================================== */

function applyTheme() {
  document.documentElement.setAttribute('data-theme', STATE.theme);
  updateThemeIcon();

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', STATE.theme === 'dark' ? '#0f1117' : '#f8f9fa');
  }

  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.setAttribute('aria-pressed', STATE.theme === 'light' ? 'true' : 'false');
  }
}

function initTheme() {
  applyTheme();

  const toggleBtn = document.getElementById('themeToggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
      applyTheme();
      safeStorage.setItem('wiki_theme', STATE.theme);
    });
  }
}

function updateThemeIcon() {
  const iconSpan = document.getElementById('themeIcon');
  if (iconSpan) {
    iconSpan.textContent = STATE.theme === 'dark' ? '🌙' : '☀️';
  }
}

/* ==========================================================================
   НАВИГАЦИЯ И МАРШРУТИЗАЦИЯ БЕЗ #
   ========================================================================== */

function initNavigation() {
  const logoBtn = document.getElementById('homeLogoBtn');
  if (logoBtn) {
    logoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      navigateTo('home');
    });
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const view = btn.getAttribute('data-view');
      if (view) navigateTo(view);
    });
  });

  document.querySelectorAll('.quick-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      if (view) navigateTo(view);
    });
  });

  const randomBtn = document.getElementById('randomArticleBtn');
  if (randomBtn) {
    randomBtn.addEventListener('click', openRandomArticle);
  }

  // Делегированный обработчик для всех внутренних ссылок и карточек
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e.button !== undefined && e.button !== 0)) {
      return;
    }

    const link = e.target && typeof e.target.closest === 'function' ? e.target.closest('a[href]') : null;
    if (link) {
      handleAnchorNavigation(e, link);
      return;
    }

    const card = e.target && typeof e.target.closest === 'function' ? e.target.closest('[data-card-link]') : null;
    if (card && (!e.target.closest || !e.target.closest('button, a'))) {
      e.preventDefault();
      navigateTo(card.getAttribute('data-card-link'));
    }
  });
}

function resolveAndNavigateHref(href) {
  ensureRoutingContext();
  const str = String(href || '').trim();
  if (!str) return;
  if (str.startsWith('#')) {
    navigateTo(str);
    return;
  }
  if (/^https?:/i.test(str)) {
    try {
      const parsed = new URL(str);
      if (window.location && window.location.origin && parsed.origin !== window.location.origin) return;
      const clean = normalizeRouteTarget(`${parsed.pathname}${parsed.search}`);
      navigateTo(clean.query ? `${clean.path || 'home'}?${clean.query}` : (clean.path || 'home'));
    } catch (err) {}
    return;
  }
  if (ROUTING.isFile) {
    const cleanFileHref = str
      .replace(/^(?:\.\.\/)+/, '')
      .replace(/^\.\//, '')
      .replace(/\/index\.html$/i, '');
    navigateTo(cleanFileHref || 'home');
    return;
  }
  try {
    const baseHref = (window.location && window.location.href) || `https://example.com${ROUTING.basePath}/`;
    const resolved = new URL(str, baseHref);
    const clean = normalizeRouteTarget(`${resolved.pathname}${resolved.search}`);
    navigateTo(clean.query ? `${clean.path || 'home'}?${clean.query}` : (clean.path || 'home'));
  } catch (err) {
    navigateTo(str.replace(/^(?:\.\.\/)+/, '').replace(/^\.\//, '') || 'home');
  }
}

function handleAnchorNavigation(e, link) {
  const href = link.getAttribute('href') || '';
  if (
    link.hasAttribute('download') ||
    link.getAttribute('target') === '_blank' ||
    link.id === 'exportDataBtn' ||
    link.id === 'resetDataBtn' ||
    href.startsWith('mailto:') ||
    href.startsWith('javascript:')
  ) {
    return;
  }

  if (href === '#contentViewport') {
    e.preventDefault();
    const vp = document.getElementById('contentViewport');
    if (vp) {
      vp.focus();
      if (typeof vp.scrollIntoView === 'function') {
        vp.scrollIntoView({ behavior: 'smooth' });
      }
    }
    return;
  }

  if (link.hasAttribute('data-scroll-target')) {
    e.preventDefault();
    scrollToArticleSection(link.getAttribute('data-scroll-target'));
    return;
  }

  const explicitView = link.getAttribute('data-view') || link.getAttribute('data-route');
  if (explicitView) {
    e.preventDefault();
    navigateTo(explicitView);
    return;
  }

  if (/^https?:/i.test(href)) {
    try {
      const parsed = new URL(href);
      if (window.location && window.location.origin && parsed.origin !== window.location.origin) {
        return;
      }
    } catch (err) {
      return;
    }
  }

  e.preventDefault();
  resolveAndNavigateHref(href);
}

function scrollToArticleSection(secId) {
  if (!secId) return;
  const targetEl = document.getElementById(secId);
  if (targetEl && typeof targetEl.scrollIntoView === 'function') {
    targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function parseCurrentRoute() {
  ensureRoutingContext();
  const loc = window.location || {};

  // Обратная совместимость со старыми #-ссылками
  const rawHash = (loc.hash || '').trim();
  if (rawHash && rawHash !== '#' && rawHash !== '#contentViewport') {
    const cleanHash = rawHash.replace(/^#+/, '');
    if (cleanHash.startsWith('sec-')) {
      return { isAnchorOnly: true, anchorId: cleanHash };
    }
    const [hPath, hQuery = ''] = cleanHash.split('?');
    if (!ROUTING.isFile && window.history && typeof window.history.replaceState === 'function') {
      try {
        window.history.replaceState({}, '', routeToHref(hQuery ? `${hPath}?${hQuery}` : hPath));
      } catch (e) {}
    }
    const parts = hPath.replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
    return {
      isAnchorOnly: false,
      route: parts[0] || 'home',
      id: parts[1] || null,
      extraParts: parts.slice(2),
      queryString: hQuery
    };
  }

  let relPath = '';
  let queryString = '';

  if (ROUTING.isFile) {
    relPath = ROUTING.virtualRoute || 'home';
    queryString = ROUTING.virtualQuery || '';
  } else {
    let p = loc.pathname || '/';
    if (ROUTING.basePath && (p === ROUTING.basePath || p.startsWith(`${ROUTING.basePath}/`))) {
      p = p.slice(ROUTING.basePath.length);
    }
    p = p.replace(/\/index\.html$/i, '').replace(/^\/+|\/+$/g, '');
    relPath = p || 'home';
    queryString = (loc.search || '').replace(/^\?/, '');
  }

  const parts = relPath === 'home' ? ['home'] : relPath.split('/').filter(Boolean);
  return {
    isAnchorOnly: false,
    route: parts[0] || 'home',
    id: parts[1] || null,
    extraParts: parts.slice(2),
    queryString
  };
}

function safeParseQueryParams(queryString) {
  try {
    return new URLSearchParams(queryString || '');
  } catch (e) {
    return new URLSearchParams();
  }
}

function handleRoute() {
  ensureRoutingContext();
  const parsed = parseCurrentRoute();
  const viewport = document.getElementById('contentViewport');

  const sModal = document.getElementById('searchModal');
  if (sModal && !sModal.classList.contains('hidden')) sModal.classList.add('hidden');
  const aModal = document.getElementById('architectureModal');
  if (aModal && !aModal.classList.contains('hidden')) aModal.classList.add('hidden');

  if (parsed.isAnchorOnly) {
    if (viewport && (!viewport.children || viewport.children.length === 0)) {
      renderHomeView(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: routeToHref('home') },
        { title: 'Главная страница' }
      ]);
      document.title = '«Во Все Хуёвые» — Энциклопедия криминального Подзалупинска';
    }
    scrollToArticleSection(parsed.anchorId);
    return;
  }

  const { route, id, extraParts, queryString } = parsed;
  const params = safeParseQueryParams(queryString);

  STATE.currentView = route;
  STATE.currentId = id;

  // Подсветка активной вкладки верхнего меню (включая родительский раздел для статей)
  const navMap = {
    character: 'characters',
    faction: 'factions',
    episode: 'episodes'
  };
  const activeNav = navMap[route] || route;
  document.querySelectorAll('.nav-btn').forEach(btn => {
    const view = btn.getAttribute('data-view');
    const isActive = view === activeNav;
    btn.classList.toggle('active', isActive);
    if (isActive) {
      btn.setAttribute('aria-current', 'page');
    } else {
      btn.removeAttribute('aria-current');
    }
  });

  if (typeof window.scrollTo === 'function') {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  if (extraParts && extraParts.length > 0) {
    document.title = 'Страница не найдена — «Во Все Хуёвые» Wiki';
    renderNotFoundView(viewport, `${route}/${id}/${extraParts.join('/')}`);
    return;
  }

  switch (route) {
    case 'characters':
      document.title = 'Персонажи — «Во Все Хуёвые» Wiki';
      renderCharactersDirectory(viewport, params);
      updateBreadcrumbs([
        { title: 'Вики', link: routeToHref('home') },
        { title: 'Персонажи' }
      ]);
      break;

    case 'character':
      if (id) {
        const char = STATE.data.characters.find(c => c.id === id);
        document.title = `${char ? char.name : 'Персонаж'} — «Во Все Хуёвые» Wiki`;
        renderCharacterArticle(viewport, id);
      } else {
        navigateTo('characters', { replace: true });
        return;
      }
      break;

    case 'factions':
      document.title = 'Группировки — «Во Все Хуёвые» Wiki';
      renderFactionsDirectory(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: routeToHref('home') },
        { title: 'Группировки' }
      ]);
      break;

    case 'faction':
      if (id) {
        const faction = STATE.data.factions.find(f => f.id === id);
        document.title = `${faction ? faction.name : 'Группировка'} — «Во Все Хуёвые» Wiki`;
        renderFactionArticle(viewport, id);
      } else {
        navigateTo('factions', { replace: true });
        return;
      }
      break;

    case 'episodes':
      document.title = 'Серии — «Во Все Хуёвые» Wiki';
      renderEpisodesDirectory(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: routeToHref('home') },
        { title: 'Серии' }
      ]);
      break;

    case 'episode':
      if (id) {
        const ep = (STATE.data.episodes || []).find(e => e.id === id);
        document.title = `${ep ? ep.title : 'Эпизод'} — «Во Все Хуёвые» Wiki`;
        renderEpisodeStub(viewport, id);
      } else {
        navigateTo('episodes', { replace: true });
        return;
      }
      break;

    case 'timeline':
      document.title = 'Хронология — «Во Все Хуёвые» Wiki';
      renderTimelineView(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: routeToHref('home') },
        { title: 'Хронология серий' }
      ]);
      break;

    case 'graph':
      document.title = 'Граф связей — «Во Все Хуёвые» Wiki';
      renderRelationshipGraph(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: routeToHref('home') },
        { title: 'Граф связей' }
      ]);
      break;

    case 'home':
      document.title = '«Во Все Хуёвые» — Энциклопедия криминального Подзалупинска';
      renderHomeView(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: routeToHref('home') },
        { title: 'Главная страница' }
      ]);
      break;

    default:
      document.title = 'Страница не найдена — «Во Все Хуёвые» Wiki';
      renderNotFoundView(viewport, route);
      break;
  }

  const targetSec = params.get('section');
  if (targetSec) {
    scrollToArticleSection(targetSec);
  }
}

function updateBreadcrumbs(crumbs) {
  const container = document.getElementById('wikiBreadcrumbs');
  if (!container) return;
  container.innerHTML = crumbs.map((crumb, idx) => {
    const isLast = idx === crumbs.length - 1;
    if (isLast) {
      return `<span class="bc-current">${escapeHtml(crumb.title)}</span>`;
    }
    return `<a href="${escapeHtml(crumb.link)}">${escapeHtml(crumb.title)}</a><span class="bc-sep">/</span>`;
  }).join('');

  container.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      handleAnchorNavigation(e, link);
    });
  });
}

function bindDynamicLinks(container) {
  if (!container) return;

  container.querySelectorAll('a[href]').forEach(link => {
    if (link._wikiBound) return;
    link._wikiBound = true;
    link.addEventListener('click', (e) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      handleAnchorNavigation(e, link);
    });
  });

  container.querySelectorAll('[data-card-link]').forEach(card => {
    if (card._wikiCardBound) return;
    card._wikiCardBound = true;
    card.addEventListener('click', (e) => {
      if (e.defaultPrevented) return;
      if (e.target && typeof e.target.closest === 'function' && e.target.closest('a, button')) return;
      e.preventDefault();
      navigateTo(card.getAttribute('data-card-link'));
    });
  });

  container.querySelectorAll('[data-random-article]').forEach(btn => {
    if (btn._wikiBound) return;
    btn._wikiBound = true;
    btn.addEventListener('click', openRandomArticle);
  });

  container.querySelectorAll('[data-redlink-name]').forEach(btn => {
    if (btn._wikiBound) return;
    btn._wikiBound = true;
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-redlink-name');
      showWikiToast(`Статья «${name}» ещё не написана и ожидает добавления в архивы.`);
    });
  });

  container.querySelectorAll('[data-open-arch]').forEach(btn => {
    if (btn._wikiBound) return;
    btn._wikiBound = true;
    btn.addEventListener('click', () => {
      openArchitectureModal(btn.getAttribute('data-open-arch') || 'character');
    });
  });

  container.querySelectorAll('[data-copy-link]').forEach(btn => {
    if (btn._wikiBound) return;
    btn._wikiBound = true;
    btn.addEventListener('click', () => {
      copyCurrentUrl();
    });
  });

  container.querySelectorAll('[data-copy-section]').forEach(btn => {
    if (btn._wikiBound) return;
    btn._wikiBound = true;
    btn.addEventListener('click', () => {
      const secId = btn.getAttribute('data-copy-section');
      copyCurrentUrl(secId);
    });
  });
}

function openRandomArticle() {
  const pool = [
    ...(STATE.data.characters || []).map(c => `character/${c.id}`),
    ...(STATE.data.factions || []).map(f => `faction/${f.id}`),
    ...(STATE.data.episodes || []).map(e => `episode/${e.id}`)
  ];
  if (pool.length === 0) return;

  const currentPath = STATE.currentId ? `${STATE.currentView}/${STATE.currentId}` : STATE.currentView;
  const candidates = pool.filter(r => r !== currentPath);
  const chosenPool = candidates.length > 0 ? candidates : pool;
  const target = chosenPool[Math.floor(Math.random() * chosenPool.length)];
  navigateTo(target);
}
window.openRandomArticle = openRandomArticle;

function copyCurrentUrl(sectionId = null) {
  ensureRoutingContext();
  const base = window.location && window.location.origin && !ROUTING.isFile
    ? `${window.location.origin}${routeToHref(STATE.currentId ? `${STATE.currentView}/${STATE.currentId}` : STATE.currentView)}`
    : `https://sanzharshaymerdenov5-collab.github.io/Vovsehuyevie/${STATE.currentId ? `${STATE.currentView}/${STATE.currentId}/` : ''}`;
  const fullUrl = sectionId ? `${base}?section=${encodeURIComponent(sectionId)}` : base;

  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    navigator.clipboard.writeText(fullUrl).then(() => {
      showWikiToast(sectionId ? 'Ссылка на раздел скопирована в буфер обмена.' : 'Ссылка на статью скопирована в буфер обмена.');
    }).catch(() => {
      showWikiToast(`Скопируйте адрес вручную: ${fullUrl}`);
    });
  } else {
    showWikiToast(`Ссылка: ${fullUrl}`);
  }
}

/* ==========================================================================
   ОТОБРАЖЕНИЕ СТРАНИЦ (VIEWS)
   ========================================================================== */

function renderNotFoundView(container, missingPath) {
  updateBreadcrumbs([
    { title: 'Вики', link: routeToHref('home') },
    { title: '404 — Не найдено' }
  ]);
  const showCodePath = missingPath && missingPath !== '404' && missingPath !== '404.html';
  container.innerHTML = `
    <div class="article-container error-article-box">
      <h1 class="error-article-title">404 — Страница не найдена</h1>
      <p class="error-article-desc">
        ${showCodePath ? `Запрошенный архив <code>${escapeHtml(missingPath)}</code> отсутствует в базе знаний Подзалупинска.` : 'Запрошенная страница отсутствует в базе знаний Подзалупинска.'}
      </p>
      <div class="episodes-placeholder-actions">
        <a href="${routeToHref('home')}" class="btn btn-primary">На главную</a>
        <a href="${routeToHref('characters')}" class="btn btn-secondary">Список персонажей</a>
        <a href="${routeToHref('episodes')}" class="btn btn-secondary">Список серий</a>
      </div>
    </div>
  `;
  bindDynamicLinks(container);
}

/** 1. Главная страница (Портал) **/
function renderHomeView(container) {
  const u = STATE.data.universe;
  const valentin = STATE.data.characters.find(c => c.id === 'valentin-belinsky') || STATE.data.characters[0];
  const allChars = STATE.data.characters;
  const factions = STATE.data.factions;
  const episodesCount = (STATE.data.episodes || []).length;

  container.innerHTML = `
    <div class="portal-hero">
      <div class="portal-tag">${escapeHtml(u.superTitle || 'ОФИЦИАЛЬНАЯ ПАРОДИЙНАЯ ВИКИ')}</div>
      <h1 class="portal-title">${escapeHtml(u.title)}</h1>
      ${u.tagline ? `<p class="portal-tagline">${escapeHtml(u.tagline)}</p>` : ''}
      <p class="portal-desc">${escapeHtml(u.description)}</p>
      <div class="portal-actions">
        <a href="${routeToHref('characters')}" class="btn btn-primary">Все персонажи (${allChars.length})</a>
        <a href="${routeToHref('factions')}" class="btn btn-secondary">Группировки (${factions.length})</a>
        <a href="${routeToHref('episodes')}" class="btn btn-secondary">Серии (${episodesCount})</a>
        <a href="${routeToHref('timeline')}" class="btn btn-secondary">Хронология</a>
        <a href="${routeToHref('graph')}" class="btn btn-secondary">🕸️ Граф связей</a>
        <button type="button" class="btn btn-secondary" data-random-article>🎲 Случайная статья</button>
      </div>
    </div>

    ${valentin ? `
      <div class="portal-grid-header">
        <h2 class="portal-grid-title"><span class="icon">★</span> Главный криминальный авторитет Подзалупинска</h2>
        <a href="${routeToHref('characters')}">Вся база досье →</a>
      </div>
      <div class="wiki-card featured-hero-card" data-card-link="character/${valentin.id}">
        <div class="featured-hero-inner">
          <div class="card-avatar featured-hero-avatar">
            ${renderAvatarHtml(valentin, { eager: true })}
          </div>
          <div class="featured-hero-body">
            <div class="featured-hero-header">
              <h3 class="featured-hero-title"><a href="${routeToHref(`character/${valentin.id}`)}" class="card-title-link">${escapeHtml(valentin.name)}</a></h3>
              <span class="status-badge status-${getStatusClass(valentin.status)}">${escapeHtml(valentin.status)}</span>
            </div>
            <div class="featured-hero-meta">
              ${escapeHtml(valentin.alias || '')} • ${escapeHtml(valentin.role || '')}
            </div>
            <p class="featured-hero-overview">${escapeHtml(valentin.overview)}</p>
            ${valentin.quote ? `<div class="featured-hero-quote">«${escapeHtml(valentin.quote)}»</div>` : ''}
          </div>
        </div>
      </div>
    ` : ''}

    <div class="portal-grid-header">
      <h2 class="portal-grid-title"><span class="icon">👥</span> Действующие лица</h2>
      <a href="${routeToHref('characters')}">Смотреть всех (${allChars.length}) →</a>
    </div>
    <div class="cards-grid">
      ${allChars.map(char => renderCharacterCardHtml(char)).join('')}
    </div>

    <div class="portal-grid-header">
      <h2 class="portal-grid-title"><span class="icon">⚗️</span> Группировки и организации</h2>
      <a href="${routeToHref('factions')}">Все организации (${factions.length}) →</a>
    </div>
    <div class="cards-grid">
      ${factions.map(faction => renderFactionCardHtml(faction)).join('')}
    </div>
  `;

  bindDynamicLinks(container);
}

/** 2. Каталог персонажей **/
function renderCharactersDirectory(container, params = null) {
  const characters = STATE.data.characters;
  const factions = STATE.data.factions;

  container.innerHTML = `
    <div class="portal-grid-header directory-header">
      <div>
        <h1 class="portal-title directory-title">Картотека персонажей</h1>
        <div class="article-subheading">Полный каноничный реестр действующих лиц Подзалупинска</div>
      </div>
      <div class="wiki-counter-badge"><span class="badge-dot">●</span> <strong>${characters.length}</strong> персонажей задокументировано</div>
    </div>

    <div class="dir-toolbar">
      <div class="dir-search-wrap">
        <input type="text" id="dirSearchInput" class="dir-search-input" placeholder="Поиск по имени, кличке или роли..." aria-label="Поиск персонажей по имени, кличке или роли">
      </div>

      <div class="dir-filters">
        <label for="dirFactionFilter" class="dir-filter-label">Группировка:</label>
        <select id="dirFactionFilter" class="dir-select">
          <option value="all">Все группировки</option>
          ${factions.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}
        </select>

        <label for="dirStatusFilter" class="dir-filter-label">Статус:</label>
        <select id="dirStatusFilter" class="dir-select">
          <option value="all">Все статусы</option>
          <option value="Жив">Жив</option>
          <option value="Мёртв">Мёртв</option>
          <option value="Пропал">Пропал без вести</option>
          <option value="Отбывает срок">Отбывает срок</option>
        </select>
      </div>
    </div>

    <h2 class="visually-hidden">Список персонажей</h2>
    <div class="cards-grid" id="directoryCardsGrid">
      ${characters.map(char => renderCharacterCardHtml(char)).join('')}
    </div>
  `;

  const input = document.getElementById('dirSearchInput');
  const factionSelect = document.getElementById('dirFactionFilter');
  const statusSelect = document.getElementById('dirStatusFilter');
  const grid = document.getElementById('directoryCardsGrid');

  if (params) {
    if (params.get('faction')) {
      factionSelect.value = params.get('faction');
    }
    if (params.get('status')) {
      const pStat = params.get('status').toLowerCase();
      if (pStat.includes('жив')) statusSelect.value = 'Жив';
      else if (pStat.includes('мертв') || pStat.includes('мёртв') || pStat.includes('погиб')) statusSelect.value = 'Мёртв';
      else if (pStat.includes('срок') || pStat.includes('колони') || pStat.includes('тюрьм')) statusSelect.value = 'Отбывает срок';
      else if (pStat.includes('пропал')) statusSelect.value = 'Пропал';
      else statusSelect.value = params.get('status');
    }
    if (params.get('q')) {
      input.value = params.get('q');
    }
  }

  function applyFilter() {
    const q = input.value.toLowerCase().trim();
    const fac = factionSelect.value || 'all';
    const stat = statusSelect.value || 'all';
    const targetFaction = fac === 'all' ? null : STATE.data.factions.find(f => f.id === fac);

    const filtered = STATE.data.characters.filter(c => {
      const searchPool = [
        c.name, c.alias, c.role, c.fullName,
        ...(c.aliasesList || []),
        ...(c.rolesList || []),
        ...(c.categories || [])
      ].join(' ').toLowerCase();
      const matchText = !q || searchPool.includes(q);
      const matchFac = fac === 'all' || (targetFaction ? characterBelongsToFaction(c, targetFaction) : c.factionId === fac);

      const cStat = (c.status || '').toLowerCase();
      let matchStat = stat === 'all';
      if (!matchStat) {
        if (stat === 'Жив') matchStat = cStat.includes('жив');
        else if (stat === 'Мёртв') matchStat = cStat.includes('мертв') || cStat.includes('мёртв') || cStat.includes('погиб');
        else if (stat === 'Отбывает срок') matchStat = cStat.includes('срок') || cStat.includes('колони') || cStat.includes('тюрьм');
        else if (stat === 'Пропал') matchStat = cStat.includes('пропал');
        else matchStat = cStat === stat.toLowerCase();
      }
      return matchText && matchFac && matchStat;
    });

    if (filtered.length === 0) {
      grid.innerHTML = `<div class="empty-state-box">Персонажи по заданным критериям не найдены.</div>`;
    } else {
      grid.innerHTML = filtered.map(c => renderCharacterCardHtml(c)).join('');
      bindDynamicLinks(grid);
    }
  }

  input.addEventListener('input', debounce(applyFilter, 150));
  factionSelect.addEventListener('change', applyFilter);
  statusSelect.addEventListener('change', applyFilter);

  if (params && (params.get('faction') || params.get('status') || params.get('q'))) {
    applyFilter();
  }

  bindDynamicLinks(container);
}

/** 3. Полная статья персонажа (Классический Fandom-инфобокс) **/
function renderCharacterArticle(container, charId) {
  const char = STATE.data.characters.find(c => c.id === charId);
  if (!char) {
    container.innerHTML = `
      <div class="article-container error-article-box">
        <h1 class="error-article-title">Персонаж не найден</h1>
        <p class="error-article-desc">Запись о данном персонаже отсутствует в архивах Подзалупинска.</p>
        <a href="${routeToHref('characters')}" class="btn btn-primary">Вернуться к списку</a>
      </div>
    `;
    bindDynamicLinks(container);
    return;
  }

  const faction = STATE.data.factions.find(f => f.id === char.factionId);
  const statusCls = getStatusClass(char.status);
  updateBreadcrumbs([
    { title: 'Вики', link: routeToHref('home') },
    { title: 'Персонажи', link: routeToHref('characters') },
    { title: char.name }
  ]);

  const bioArray = char.biography
    ? (Array.isArray(char.biography) ? char.biography : char.biography.split('\n\n'))
    : [];
  const bioParagraphs = bioArray.length > 0
    ? bioArray.filter(p => p.trim().length > 0).map(p => `<p>${renderWikiProse(p, char.id)}</p>`).join('')
    : '<p>Подробная биография еще не задокументирована архивариусами Подзалупинска.</p>';

  let sectionIndex = 1;
  const tocItems = [];

  const overviewNum = sectionIndex++;
  tocItems.push({ id: 'sec-overview', num: overviewNum, title: 'Общие сведения' });

  const bioNum = sectionIndex++;
  tocItems.push({ id: 'sec-biography', num: bioNum, title: 'Биография' });

  let personalityNum = null;
  if (char.personality) {
    personalityNum = sectionIndex++;
    tocItems.push({ id: 'sec-personality', num: personalityNum, title: 'Личность и характер' });
  }

  let relationshipsNum = null;
  if (char.relationships && char.relationships.length) {
    relationshipsNum = sectionIndex++;
    tocItems.push({ id: 'sec-relationships', num: relationshipsNum, title: 'Связи и отношения' });
  }

  let triviaNum = null;
  if (char.trivia && char.trivia.length) {
    triviaNum = sectionIndex++;
    tocItems.push({ id: 'sec-trivia', num: triviaNum, title: 'Интересные факты' });
  }

  const categoriesNum = sectionIndex++;
  tocItems.push({ id: 'sec-categories', num: categoriesNum, title: 'Категории' });

  // Сборка категорий с учётом пользовательских char.categories без дублей
  const categoryItems = [];
  const seenCatLabels = new Set();
  const pushCategory = (label, route) => {
    const clean = String(label || '').trim();
    if (!clean || seenCatLabels.has(clean.toLowerCase())) return;
    seenCatLabels.add(clean.toLowerCase());
    categoryItems.push({ label: clean, route });
  };

  if (Array.isArray(char.categories)) {
    char.categories.forEach(cat => {
      const matchedFaction = STATE.data.factions.find(f => f.name.toLowerCase() === String(cat).toLowerCase());
      if (matchedFaction) {
        pushCategory(cat, `faction/${matchedFaction.id}`);
      } else {
        pushCategory(cat, `characters?q=${encodeURIComponent(cat)}`);
      }
    });
  }
  pushCategory('Персонажи сериала', 'characters');
  pushCategory('Жители Подзалупинска', 'characters');
  pushCategory(`Статус: ${char.status}`, `characters?status=${encodeURIComponent(char.status)}`);
  if (faction) {
    pushCategory(`Организация: ${faction.name}`, `faction/${faction.id}`);
  } else {
    pushCategory('Одиночки', 'characters');
  }
  if (char.deathDate && char.deathDate !== '—') {
    pushCategory('Умершие персонажи', `characters?status=${encodeURIComponent('Мёртв')}`);
  }
  if (char.inMovie === 'Да' || (char.inMovie && char.inMovie.startsWith('Да'))) {
    pushCategory('Фильм «Путь розового?»', 'episode/put-rozovogo');
  }
  if (char.role) {
    pushCategory(char.role, `characters?q=${encodeURIComponent(char.role)}`);
  }
  pushCategory('Канон «Во Все Хуёвые»', 'home');

  container.innerHTML = `
    <article class="article-container">
      <div class="wiki-page-bar">
        <div class="wiki-page-tabs-left">
          <span class="wiki-page-tab active">📄 Статья</span>
          <button type="button" class="wiki-page-tab-btn" data-open-arch="character" title="Посмотреть каноничную структуру этой статьи">📐 Архитектура статьи</button>
        </div>
        <div class="wiki-page-tabs-right">
          <span class="wiki-page-tab active">Читать</span>
          <button type="button" class="article-action-btn" data-copy-link aria-label="Скопировать ссылку на статью">🔗 Ссылка</button>
          <span class="wiki-badge-canon">Канон v${escapeHtml(STATE.data.version || '2.6')}</span>
        </div>
      </div>

      <header class="article-header">
        <div class="article-heading-group">
          <h1 class="article-title">${escapeHtml(char.name)}</h1>
          <div class="article-subheading">Материал из «Во Все Хуёвые Вики» — свободной энциклопедии Подзалупинска</div>
          ${char.alias ? `<div class="article-subtitle">${escapeHtml(char.alias)}</div>` : ''}
        </div>
        <div class="article-header-stamp-box">
          ${renderStatusStamp(char.status)}
        </div>
      </header>

      <div class="wiki-notice-box">
        <div class="notice-icon">🛡️</div>
        <div class="notice-body">
          <div class="notice-title">Официальный канон вселенной «Во Все Хуёвые»</div>
          <div class="notice-text">
            Материал проверен архивариусами Подзалупинска. Статус: <strong class="status-badge status-${statusCls} status-badge-inline">${escapeHtml(char.status)}</strong>${char.actor ? ` • Исполнитель роли: <strong>${escapeHtml(char.actor)}</strong>` : ''}${char.origin ? ` • Происхождение: <strong>${escapeHtml(char.origin)}</strong>` : ''}.
          </div>
        </div>
      </div>

      <div class="article-main-wrapper article-body">
        <aside class="wiki-infobox infobox">
          <div class="infobox-title">${escapeHtml(char.fullName || char.name)}</div>

          <div class="infobox-image-wrapper">
            <div class="infobox-avatar">${renderAvatarHtml(char, { eager: true, size: 'full' })}</div>
            <div class="infobox-caption">${escapeHtml(char.role || 'Персонаж')}</div>
            <div style="margin-top: 8px;">
              <span class="status-badge status-${statusCls}">${escapeHtml(char.status)}</span>
            </div>
          </div>

          <div class="infobox-section-header">Информация о персонаже</div>
          ${char.fullName ? `
            <div class="infobox-row">
              <div class="infobox-label">Полное имя</div>
              <div class="infobox-value">${escapeHtml(char.fullName)}</div>
            </div>
          ` : ''}
          ${char.aliasesList && char.aliasesList.length > 0 ? `
            <div class="infobox-row">
              <div class="infobox-label">Псевдонимы</div>
              <div class="infobox-value">
                <ul class="infobox-list">
                  ${char.aliasesList.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
                </ul>
              </div>
            </div>
          ` : (char.alias ? `
            <div class="infobox-row">
              <div class="infobox-label">Псевдонимы</div>
              <div class="infobox-value">${escapeHtml(char.alias)}</div>
            </div>
          ` : '')}
          ${char.birthDate ? `
            <div class="infobox-row">
              <div class="infobox-label">Дата рождения</div>
              <div class="infobox-value">${escapeHtml(char.birthDate)}</div>
            </div>
          ` : ''}
          ${char.origin ? `
            <div class="infobox-row">
              <div class="infobox-label">Место рождения</div>
              <div class="infobox-value">${escapeHtml(char.origin)}</div>
            </div>
          ` : ''}
          ${char.ageTimeline || char.age ? `
            <div class="infobox-row">
              <div class="infobox-label">Возраст</div>
              <div class="infobox-value">${escapeHtml(char.ageTimeline || char.age)}</div>
            </div>
          ` : ''}

          <div class="infobox-section-header">Судьба</div>
          <div class="infobox-row">
            <div class="infobox-label">Статус</div>
            <div class="infobox-value"><strong class="infobox-status-text-${statusCls}">${escapeHtml(char.status)}</strong></div>
          </div>
          ${char.deathDate && char.deathDate !== '—' ? `
            <div class="infobox-row">
              <div class="infobox-label">Дата смерти</div>
              <div class="infobox-value">${escapeHtml(char.deathDate)}</div>
            </div>
          ` : ''}
          ${char.deathPlace && char.deathPlace !== '—' ? `
            <div class="infobox-row">
              <div class="infobox-label">Место смерти</div>
              <div class="infobox-value">${escapeHtml(char.deathPlace)}</div>
            </div>
          ` : ''}
          ${char.causeOfDeath && char.causeOfDeath !== '—' ? `
            <div class="infobox-row">
              <div class="infobox-label">Причина смерти</div>
              <div class="infobox-value">${renderWikiProse(char.causeOfDeath, char.id)}</div>
            </div>
          ` : ''}

          <div class="infobox-section-header">Личная жизнь</div>
          ${char.maritalStatus ? `
            <div class="infobox-row">
              <div class="infobox-label">Семья</div>
              <div class="infobox-value">${escapeHtml(char.maritalStatus)}</div>
            </div>
          ` : ''}
          ${char.children !== undefined ? `
            <div class="infobox-row">
              <div class="infobox-label">Дети</div>
              <div class="infobox-value">${escapeHtml(char.children)}</div>
            </div>
          ` : ''}
          ${char.orientation ? `
            <div class="infobox-row">
              <div class="infobox-label">Ориентация</div>
              <div class="infobox-value">${escapeHtml(char.orientation)}</div>
            </div>
          ` : ''}
          ${char.residence ? `
            <div class="infobox-row">
              <div class="infobox-label">Адрес</div>
              <div class="infobox-value">${escapeHtml(char.residence)}</div>
            </div>
          ` : ''}
          ${char.parents ? `
            <div class="infobox-row">
              <div class="infobox-label">Родители</div>
              <div class="infobox-value">${escapeHtml(char.parents)}</div>
            </div>
          ` : ''}

          <div class="infobox-section-header">Появления в сериале</div>
          ${char.firstAppearance ? `
            <div class="infobox-row">
              <div class="infobox-label">Первое</div>
              <div class="infobox-value">${renderWikiProse(char.firstAppearance, char.id)}</div>
            </div>
          ` : ''}
          ${char.lastAppearance ? `
            <div class="infobox-row">
              <div class="infobox-label">Последнее</div>
              <div class="infobox-value">${renderWikiProse(char.lastAppearance, char.id)}</div>
            </div>
          ` : ''}
          ${char.inMovie ? `
            <div class="infobox-row">
              <div class="infobox-label">Фильм «Путь розового?»</div>
              <div class="infobox-value">${renderWikiProse(char.inMovie, char.id)}</div>
            </div>
          ` : ''}

          <div class="infobox-section-header">Деятельность и связи</div>

          ${char.rolesList && char.rolesList.length > 0 ? `
            <div class="infobox-row">
              <div class="infobox-label">Род деятельности</div>
              <div class="infobox-value">
                <ul class="infobox-list">
                  ${char.rolesList.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
                </ul>
              </div>
            </div>
          ` : (char.role ? `
            <div class="infobox-row">
              <div class="infobox-label">Род деятельности</div>
              <div class="infobox-value">${escapeHtml(char.role)}</div>
            </div>
          ` : '')}

          ${char.affiliationsList && char.affiliationsList.length > 0 ? `
            <div class="infobox-row">
              <div class="infobox-label">Принадлежность</div>
              <div class="infobox-value">
                <ul class="infobox-list">
                  ${char.affiliationsList.map(a => `<li>${renderWikiProse(a, char.id)}</li>`).join('')}
                </ul>
              </div>
            </div>
          ` : `
            <div class="infobox-row">
              <div class="infobox-label">Принадлежность</div>
              <div class="infobox-value">
                ${faction ? `<a href="${routeToHref(`faction/${faction.id}`)}">${escapeHtml(faction.name)}</a>` : 'Одиночка / Не состоит'}
              </div>
            </div>
          `}

          ${char.weapon ? `
            <div class="infobox-row">
              <div class="infobox-label">Арсенал / Навыки</div>
              <div class="infobox-value">${escapeHtml(char.weapon)}</div>
            </div>
          ` : ''}

          ${char.actor ? `
            <div class="infobox-row">
              <div class="infobox-label">Исполнитель роли</div>
              <div class="infobox-value"><strong>${escapeHtml(char.actor)}</strong></div>
            </div>
          ` : ''}
        </aside>

        ${char.quote ? `
          <blockquote class="wiki-quote">
            «${escapeHtml(char.quote)}»
            <span class="wiki-quote-author">— ${escapeHtml(char.name)}</span>
          </blockquote>
        ` : ''}

        <nav class="wiki-toc toc-box" aria-label="Содержание статьи">
          <div class="toc-header">
            <span class="toc-title">Содержание</span>
            <button type="button" class="toc-toggle-btn" id="tocToggleBtn" aria-expanded="true" aria-controls="tocList">[скрыть]</button>
          </div>
          <ol class="toc-list" id="tocList">
            ${tocItems.map(item => `<li><a href="${routeToHref(`character/${char.id}?section=${item.id}`)}" class="toc-link" data-scroll-target="${item.id}"><span class="toc-num">${item.num}</span>${escapeHtml(item.title)}</a></li>`).join('')}
          </ol>
        </nav>

        <section class="wiki-section" id="sec-overview">
          <h2 class="wiki-section-heading">
            <span><span class="mw-headline-number">${overviewNum}.</span> Общие сведения</span>
            <span class="mw-editsection">
              <button type="button" class="section-copy-btn" data-copy-section="sec-overview" aria-label="Скопировать ссылку на раздел Общие сведения" title="Скопировать ссылку на раздел">🔗</button>
              <span class="mw-editsection-bracket">[</span><button type="button" class="mw-editsection-btn" data-open-arch="character">архитектура</button><span class="mw-editsection-bracket">]</span>
            </span>
          </h2>
          <div class="wiki-section-body">
            <p>${renderWikiProse(char.overview, char.id)}</p>
          </div>
        </section>

        <section class="wiki-section" id="sec-biography">
          <h2 class="wiki-section-heading">
            <span><span class="mw-headline-number">${bioNum}.</span> Биография</span>
            <span class="mw-editsection">
              <button type="button" class="section-copy-btn" data-copy-section="sec-biography" aria-label="Скопировать ссылку на раздел Биография" title="Скопировать ссылку на раздел">🔗</button>
              <span class="mw-editsection-bracket">[</span><button type="button" class="mw-editsection-btn" data-open-arch="character">архитектура</button><span class="mw-editsection-bracket">]</span>
            </span>
          </h2>
          <div class="wiki-section-body">
            ${bioParagraphs}
          </div>
        </section>

        ${char.personality ? `
          <section class="wiki-section" id="sec-personality">
            <h2 class="wiki-section-heading">
              <span><span class="mw-headline-number">${personalityNum}.</span> Личность и характер</span>
              <span class="mw-editsection">
                <button type="button" class="section-copy-btn" data-copy-section="sec-personality" aria-label="Скопировать ссылку на раздел Личность и характер" title="Скопировать ссылку на раздел">🔗</button>
                <span class="mw-editsection-bracket">[</span><button type="button" class="mw-editsection-btn" data-open-arch="character">архитектура</button><span class="mw-editsection-bracket">]</span>
              </span>
            </h2>
            <div class="wiki-section-body">
              <p>${renderWikiProse(char.personality, char.id)}</p>
            </div>
          </section>
        ` : ''}

        ${char.relationships && char.relationships.length ? `
          <section class="wiki-section" id="sec-relationships">
            <h2 class="wiki-section-heading">
              <span><span class="mw-headline-number">${relationshipsNum}.</span> Связи и отношения</span>
              <span class="mw-editsection">
                <button type="button" class="section-copy-btn" data-copy-section="sec-relationships" aria-label="Скопировать ссылку на раздел Связи и отношения" title="Скопировать ссылку на раздел">🔗</button>
                <span class="mw-editsection-bracket">[</span><button type="button" class="mw-editsection-btn" data-open-arch="character">архитектура</button><span class="mw-editsection-bracket">]</span>
              </span>
            </h2>
            <div class="relationships-list">
              ${char.relationships.map(rel => {
                const targetChar = STATE.data.characters.find(c => c.id === rel.charId);
                const targetFaction = STATE.data.factions.find(f => f.id === rel.charId);
                const targetName = targetChar ? targetChar.name : (targetFaction ? targetFaction.name : (rel.charName || rel.charId));
                let targetControlHtml = '';
                if (targetChar) {
                  targetControlHtml = `<a href="${routeToHref(`character/${targetChar.id}`)}" class="rel-name">${escapeHtml(targetName)}</a>`;
                } else if (targetFaction) {
                  targetControlHtml = `<a href="${routeToHref(`faction/${targetFaction.id}`)}" class="rel-name">${escapeHtml(targetName)}</a>`;
                } else {
                  targetControlHtml = `<button type="button" class="mw-redlink" data-redlink-name="${escapeHtml(targetName)}" title="Статья ещё не написана архивариусами Подзалупинска"><span>${escapeHtml(targetName)}</span><span class="mw-redlink-badge">в разработке</span></button>`;
                }
                return `
                  <div class="rel-item">
                    ${targetControlHtml}
                    <span class="rel-type">${escapeHtml(rel.type)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </section>
        ` : ''}

        ${char.trivia && char.trivia.length ? `
          <section class="wiki-section" id="sec-trivia">
            <h2 class="wiki-section-heading">
              <span><span class="mw-headline-number">${triviaNum}.</span> Интересные факты</span>
              <span class="mw-editsection">
                <button type="button" class="section-copy-btn" data-copy-section="sec-trivia" aria-label="Скопировать ссылку на раздел Интересные факты" title="Скопировать ссылку на раздел">🔗</button>
                <span class="mw-editsection-bracket">[</span><button type="button" class="mw-editsection-btn" data-open-arch="character">архитектура</button><span class="mw-editsection-bracket">]</span>
              </span>
            </h2>
            <div class="wiki-section-body">
              <ul>
                ${char.trivia.map(item => `<li>${renderWikiProse(item, char.id)}</li>`).join('')}
              </ul>
            </div>
          </section>
        ` : ''}

        <div class="wiki-categories-box" id="sec-categories">
          <span class="cat-label"><span class="cat-icon">🏷️</span> Категории:</span>
          <ul class="cat-list">
            ${categoryItems.map(cat => `<li><a href="${routeToHref(cat.route)}" class="cat-link">${escapeHtml(cat.label)}</a></li>`).join('')}
          </ul>
        </div>
      </div>
    </article>
  `;

  const tocBtn = document.getElementById('tocToggleBtn');
  const tocList = document.getElementById('tocList');
  if (tocBtn && tocList) {
    tocBtn.addEventListener('click', () => {
      const isHidden = tocList.style.display === 'none';
      tocList.style.display = isHidden ? 'block' : 'none';
      tocBtn.textContent = isHidden ? '[скрыть]' : '[показать]';
      tocBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
  }

  bindDynamicLinks(container);
}

/** 4. Каталог группировок **/
function renderFactionsDirectory(container) {
  const factions = STATE.data.factions;

  container.innerHTML = `
    <div class="portal-grid-header directory-header">
      <div>
        <h1 class="portal-title directory-title">Группировки и организации</h1>
        <div class="article-subheading">Синдикаты, правоохранительные органы и картели Подзалупинска</div>
      </div>
      <div class="wiki-counter-badge"><span class="badge-dot">●</span> <strong>${factions.length}</strong> организации в архиве</div>
    </div>

    <h2 class="visually-hidden">Список группировок</h2>
    <div class="cards-grid">
      ${factions.map(faction => renderFactionCardHtml(faction)).join('')}
    </div>
  `;

  bindDynamicLinks(container);
}

/** 5. Статья группировки **/
function renderFactionArticle(container, factionId) {
  const faction = STATE.data.factions.find(f => f.id === factionId);
  if (!faction) {
    container.innerHTML = `
      <div class="article-container error-article-box">
        <h1 class="error-article-title">Группировка не найдена</h1>
        <p class="error-article-desc">Организация отсутствует в реестре Подзалупинска.</p>
        <a href="${routeToHref('factions')}" class="btn btn-primary">Вернуться к списку</a>
      </div>
    `;
    bindDynamicLinks(container);
    return;
  }

  const members = getFactionMembers(faction);

  updateBreadcrumbs([
    { title: 'Вики', link: routeToHref('home') },
    { title: 'Группировки', link: routeToHref('factions') },
    { title: faction.name }
  ]);

  container.innerHTML = `
    <article class="article-container faction-article-accent" style="--faction-accent: ${escapeHtml(faction.color || 'var(--accent-primary)')};">
      <div class="wiki-page-bar">
        <div class="wiki-page-tabs-left">
          <span class="wiki-page-tab active">🏛️ Организация</span>
          <button type="button" class="wiki-page-tab clickable" id="factionDiscussBtn">💬 Обсуждение</button>
          <button type="button" class="wiki-page-tab-btn" data-open-arch="faction" title="Посмотреть структуру этой группировки">📐 Архитектура статьи</button>
        </div>
        <div class="wiki-page-tabs-right">
          <span class="wiki-page-tab active">Читать</span>
          <a href="${routeToHref('timeline')}" class="wiki-page-tab clickable">📜 Хронология</a>
          <button type="button" class="article-action-btn" data-copy-link aria-label="Скопировать ссылку на статью">🔗 Ссылка</button>
          <span class="wiki-badge-canon">Канон v${escapeHtml(STATE.data.version || '2.6')}</span>
        </div>
      </div>

      <header class="article-header">
        <div class="article-heading-group">
          <h1 class="article-title">${escapeHtml(faction.name)}</h1>
          <div class="article-subheading">Материал из «Во Все Хуёвые Вики» — свободной энциклопедии Подзалупинска</div>
          <div class="article-subtitle">${escapeHtml(faction.type || '')}</div>
        </div>
        ${faction.alignment ? `<span class="alignment-badge">${escapeHtml(faction.alignment)}</span>` : ''}
      </header>

      <div class="wiki-notice-box">
        <div class="notice-icon">🏛️</div>
        <div class="notice-body">
          <div class="notice-title">Официальный реестр организаций Подзалупинска</div>
          <div class="notice-text">
            Группировка зафиксирована в базе знаний. Лидер: <strong>${renderWikiProse(faction.leader || 'Неизвестен', faction.id)}</strong> • Влияние: <strong>${escapeHtml(faction.influenceLevel || 'Локальный')}</strong> • Участников в базе: <strong>${members.length}</strong>.
          </div>
        </div>
      </div>

      <div class="article-main-wrapper article-body">
        <aside class="wiki-infobox infobox">
          <div class="infobox-title">${escapeHtml(faction.name)}</div>
          <div class="infobox-image-wrapper">
            <div class="infobox-avatar">${faction.avatar || '🏛️'}</div>
            <div class="infobox-caption">${escapeHtml(faction.motto || '')}</div>
          </div>

          <div class="infobox-section-header">Сведения об организации</div>
          <div class="infobox-row">
            <div class="infobox-label">Тип</div>
            <div class="infobox-value">${escapeHtml(faction.type || 'Н/Д')}</div>
          </div>
          ${faction.alignment ? `
            <div class="infobox-row">
              <div class="infobox-label">Мировоззрение</div>
              <div class="infobox-value">${escapeHtml(faction.alignment)}</div>
            </div>
          ` : ''}
          <div class="infobox-row">
            <div class="infobox-label">Главарь</div>
            <div class="infobox-value">${renderWikiProse(faction.leader || 'Неизвестен', faction.id)}</div>
          </div>
          <div class="infobox-row">
            <div class="infobox-label">Штаб</div>
            <div class="infobox-value">${renderWikiProse(faction.headquarters || 'Засекречен', faction.id)}</div>
          </div>
          <div class="infobox-row">
            <div class="infobox-label">Статус влияния</div>
            <div class="infobox-value">${renderWikiProse(faction.influenceLevel || 'Локальный', faction.id)}</div>
          </div>
          <div class="infobox-row">
            <div class="infobox-label">Участников</div>
            <div class="infobox-value">${members.length} задокументировано</div>
          </div>
        </aside>

        ${faction.motto ? `
          <blockquote class="wiki-quote">
            «${escapeHtml(faction.motto)}»
            <span class="wiki-quote-author">— Девиз организации</span>
          </blockquote>
        ` : ''}

        <nav class="wiki-toc" aria-label="Содержание статьи">
          <div class="toc-header">
            <span class="toc-title">Содержание</span>
            <button type="button" class="toc-toggle-btn" id="factionTocToggleBtn" aria-expanded="true" aria-controls="factionTocList">[скрыть]</button>
          </div>
          <ol class="toc-list" id="factionTocList">
            <li><a href="${routeToHref(`faction/${faction.id}?section=sec-fac-summary`)}" data-scroll-target="sec-fac-summary"><span class="toc-num">1</span>Деятельность и цели</a></li>
            ${faction.history ? `<li><a href="${routeToHref(`faction/${faction.id}?section=sec-fac-history`)}" data-scroll-target="sec-fac-history"><span class="toc-num">2</span>История основания</a></li>` : ''}
            <li><a href="${routeToHref(`faction/${faction.id}?section=sec-fac-members`)}" data-scroll-target="sec-fac-members"><span class="toc-num">${faction.history ? '3' : '2'}</span>Известные участники</a></li>
            <li><a href="${routeToHref(`faction/${faction.id}?section=sec-fac-categories`)}" data-scroll-target="sec-fac-categories"><span class="toc-num">${faction.history ? '4' : '3'}</span>Категории</a></li>
          </ol>
        </nav>

        <section class="wiki-section" id="sec-fac-summary">
          <h2 class="wiki-section-heading">
            <span><span class="mw-headline-number">1.</span> Деятельность и цели</span>
            <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><button type="button" class="mw-editsection-btn" data-open-arch="faction">архитектура</button><span class="mw-editsection-bracket">]</span></span>
          </h2>
          <div class="wiki-section-body">
            <p>${renderWikiProse(faction.summary, faction.id)}</p>
          </div>
        </section>

        ${faction.history ? `
          <section class="wiki-section" id="sec-fac-history">
            <h2 class="wiki-section-heading">
              <span><span class="mw-headline-number">2.</span> История основания</span>
              <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><button type="button" class="mw-editsection-btn" data-open-arch="faction">архитектура</button><span class="mw-editsection-bracket">]</span></span>
            </h2>
            <div class="wiki-section-body">
              <p>${renderWikiProse(faction.history, faction.id)}</p>
            </div>
          </section>
        ` : ''}

        <section class="wiki-section" id="sec-fac-members">
          <h2 class="wiki-section-heading">
            <span><span class="mw-headline-number">${faction.history ? '3.' : '2.'}</span> Известные участники (${members.length})</span>
            <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><button type="button" class="mw-editsection-btn" data-open-arch="faction">архитектура</button><span class="mw-editsection-bracket">]</span></span>
          </h2>
          <div class="cards-grid" style="margin-top: 18px;">
            ${members.length > 0 ? members.map(m => renderCharacterCardHtml(m)).join('') : '<p class="empty-state-box">В базе пока нет записей об участниках этой организации.</p>'}
          </div>
        </section>

        <div class="wiki-categories-box" id="sec-fac-categories">
          <span class="cat-label"><span class="cat-icon">🏷️</span> Категории:</span>
          <ul class="cat-list">
            <li><a href="${routeToHref('factions')}" class="cat-link">Группировки Подзалупинска</a></li>
            <li><a href="${routeToHref('factions')}" class="cat-link">${escapeHtml(faction.type || 'Организации')}</a></li>
            <li><a href="${routeToHref(`characters?faction=${faction.id}`)}" class="cat-link">Участники синдиката (${members.length})</a></li>
            <li><a href="${routeToHref('home')}" class="cat-link">Канон «Во Все Хуёвые»</a></li>
          </ul>
        </div>
      </div>
    </article>
  `;

  const discussBtn = document.getElementById('factionDiscussBtn');
  if (discussBtn) {
    discussBtn.addEventListener('click', () => {
      showWikiToast('Архив обсуждения группировки зафиксирован архивариусами Подзалупинска.');
    });
  }

  const fTocBtn = document.getElementById('factionTocToggleBtn');
  const fTocList = document.getElementById('factionTocList');
  if (fTocBtn && fTocList) {
    fTocBtn.addEventListener('click', () => {
      const isHidden = fTocList.style.display === 'none';
      fTocList.style.display = isHidden ? 'block' : 'none';
      fTocBtn.textContent = isHidden ? '[скрыть]' : '[показать]';
      fTocBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });
  }

  bindDynamicLinks(container);
}

/** 6. Хронология серий и событий **/
function renderTimelineView(container) {
  const events = STATE.data.timeline || [];

  container.innerHTML = `
    <div class="article-container">
      <div class="wiki-page-bar">
        <div class="wiki-page-tabs-left">
          <span class="wiki-page-tab active">⏱️ Хронология серий</span>
          <a href="${routeToHref('episodes')}" class="wiki-page-tab clickable">🎬 Список серий</a>
        </div>
        <div class="wiki-page-tabs-right">
          <span class="wiki-page-tab active">Каноничный таймлайн</span>
          <span class="wiki-badge-canon">Канон v${escapeHtml(STATE.data.version || '2.6')}</span>
        </div>
      </div>

      <header class="article-header">
        <div class="article-heading-group">
          <h1 class="article-title">Каноничная хронология Подзалупинска</h1>
          <div class="article-subheading">Материал из «Во Все Хуёвые Вики» — свободной энциклопедии Подзалупинска</div>
          <div class="article-subtitle">Хронологический список серий, ключевых дат и судьбоносных событий</div>
        </div>
      </header>

      <div class="wiki-notice-box">
        <div class="notice-icon">⚗️</div>
        <div class="notice-body">
          <div class="notice-title">Официальный хронологический реестр Подзалупинска</div>
          <div class="notice-text">
            События охватывают временной отрезок с 1954 года по 2025 год (включая полнометражный фильм «Путь розового?»). Все даты согласованы архивариусами.
          </div>
        </div>
      </div>

      <div class="timeline-wrapper">
        <div class="timeline-track"></div>
        ${events.map(ev => `
          <div class="timeline-item">
            <div class="timeline-node">⚗️</div>
            <div class="timeline-card">
              <div class="timeline-card-header">
                <h2 class="timeline-card-title">${renderWikiProse(ev.title)}</h2>
                <span class="timeline-year-badge">${escapeHtml(ev.year)}</span>
              </div>
              <p class="timeline-desc">${renderWikiProse(ev.desc)}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <div class="wiki-categories-box" id="sec-categories">
        <span class="cat-label"><span class="cat-icon">🏷️</span> Категории:</span>
        <ul class="cat-list">
          <li><a href="${routeToHref('timeline')}" class="cat-link">Хронология Подзалупинска</a></li>
          <li><a href="${routeToHref('episodes')}" class="cat-link">Каноничные серии</a></li>
          <li><a href="${routeToHref('characters')}" class="cat-link">Персонажи</a></li>
          <li><a href="${routeToHref('home')}" class="cat-link">Канон «Во Все Хуёвые»</a></li>
        </ul>
      </div>
    </div>
  `;

  bindDynamicLinks(container);
}

/** 6.1. Каталог серий (рабочий список каноничных серий с заглушками внутри) **/
function renderEpisodesDirectory(container) {
  const episodes = STATE.data.episodes || [];

  container.innerHTML = `
    <div class="portal-grid-header directory-header">
      <div>
        <h1 class="portal-title directory-title">Серии сериала</h1>
        <div class="article-subheading">Список каноничных эпизодов сериала «Во Все Хуёвые» и фильма «Путь розового?»</div>
      </div>
      <div class="wiki-counter-badge"><span class="badge-dot">●</span> <strong>${episodes.length}</strong> выпусков в списке</div>
    </div>

    <div class="wiki-notice-box">
      <div class="notice-icon">🎬</div>
      <div class="notice-body">
        <div class="notice-title">Реестр серий и фильмов вселенной</div>
        <div class="notice-text">
          Ниже собраны все подтверждённые серии и фильм из архивов Подзалупинска. Страницы отдельных серий сейчас находятся в статусе заглушек и будут дополняться позже.
        </div>
      </div>
    </div>

    <h2 class="visually-hidden">Список серий и фильмов</h2>
    <div class="episodes-grid">
      ${episodes.map((ep, idx) => `
        <div class="episode-card" data-card-link="episode/${ep.id}">
          <div class="episode-card-top">
            <span class="episode-card-num">${ep.kind === 'Фильм' ? 'Полнометражный фильм' : `Эпизод #${idx + 1}`}</span>
            <span class="status-badge status-missing">${escapeHtml(ep.status || 'В разработке')}</span>
          </div>
          <h3 class="episode-card-title">
            <a href="${routeToHref(`episode/${ep.id}`)}" class="card-title-link">«${escapeHtml(ep.title)}»</a>
          </h3>
          <div class="episode-card-footer">
            <span>Тип: ${escapeHtml(ep.kind || 'Серия')}</span>
            <span>Страница-заглушка →</span>
          </div>
        </div>
      `).join('')}
    </div>

    <div class="episodes-placeholder-actions" style="justify-content: flex-start;">
      <a href="${routeToHref('timeline')}" class="btn btn-primary">Хронология событий</a>
      <a href="${routeToHref('characters')}" class="btn btn-secondary">Персонажи</a>
    </div>
  `;

  bindDynamicLinks(container);
}

/** 6.2. Отдельная страница серии — заглушка **/
function renderEpisodeStub(container, episodeId) {
  const episodes = STATE.data.episodes || [];
  const epIndex = episodes.findIndex(e => e.id === episodeId);
  const ep = epIndex >= 0 ? episodes[epIndex] : null;

  if (!ep) {
    updateBreadcrumbs([
      { title: 'Вики', link: routeToHref('home') },
      { title: 'Серии', link: routeToHref('episodes') },
      { title: 'Не найдено' }
    ]);
    container.innerHTML = `
      <div class="article-container error-article-box">
        <h1 class="error-article-title">Выпуск не найден</h1>
        <p class="error-article-desc">Такая серия отсутствует в списке эпизодов «Во Все Хуёвые».</p>
        <a href="${routeToHref('episodes')}" class="btn btn-primary">К списку серий</a>
      </div>
    `;
    bindDynamicLinks(container);
    return;
  }

  updateBreadcrumbs([
    { title: 'Вики', link: routeToHref('home') },
    { title: 'Серии', link: routeToHref('episodes') },
    { title: `«${ep.title}»` }
  ]);

  const prevEp = epIndex > 0 ? episodes[epIndex - 1] : null;
  const nextEp = epIndex < episodes.length - 1 ? episodes[epIndex + 1] : null;

  container.innerHTML = `
    <article class="article-container">
      <div class="wiki-page-bar">
        <div class="wiki-page-tabs-left">
          <span class="wiki-page-tab active">🎬 ${escapeHtml(ep.kind || 'Серия')}</span>
          <a href="${routeToHref('episodes')}" class="wiki-page-tab clickable">📋 Все серии</a>
        </div>
        <div class="wiki-page-tabs-right">
          <span class="wiki-page-tab active">Заглушка</span>
          <button type="button" class="article-action-btn" data-copy-link aria-label="Скопировать ссылку на серию">🔗 Ссылка</button>
          <span class="wiki-badge-canon">Канон v${escapeHtml(STATE.data.version || '2.6')}</span>
        </div>
      </div>

      <header class="article-header">
        <div class="article-heading-group">
          <h1 class="article-title">«${escapeHtml(ep.title)}»</h1>
          <div class="article-subheading">Материал из «Во Все Хуёвые Вики» — раздел серий</div>
          <div class="article-subtitle">${escapeHtml(ep.kind || 'Серия')} • ${escapeHtml(ep.status || 'В разработке')}</div>
        </div>
      </header>

      <div class="episode-stub-card">
        <div class="episodes-placeholder-icon">${ep.kind === 'Фильм' ? '🎞️' : '🎬'}</div>
        <h2 class="episodes-placeholder-title">Страница «${escapeHtml(ep.title)}» в разработке</h2>
        <p class="episodes-placeholder-desc">
          Статья об этом выпуске пока оформлена как заглушка. Подробный сюжет и разбор сцен будут добавлены позже.
        </p>
        <div class="episodes-placeholder-actions">
          ${prevEp ? `<a href="${routeToHref(`episode/${prevEp.id}`)}" class="btn btn-secondary">← «${escapeHtml(prevEp.title)}»</a>` : ''}
          <a href="${routeToHref('episodes')}" class="btn btn-primary">Вернуться к списку серий</a>
          ${nextEp ? `<a href="${routeToHref(`episode/${nextEp.id}`)}" class="btn btn-secondary">«${escapeHtml(nextEp.title)}» →</a>` : ''}
        </div>
      </div>

      <div class="wiki-categories-box">
        <span class="cat-label"><span class="cat-icon">🏷️</span> Категории:</span>
        <ul class="cat-list">
          <li><a href="${routeToHref('episodes')}" class="cat-link">Серии сериала</a></li>
          <li><a href="${routeToHref('timeline')}" class="cat-link">Хронология Подзалупинска</a></li>
          <li><a href="${routeToHref('home')}" class="cat-link">Канон «Во Все Хуёвые»</a></li>
        </ul>
      </div>
    </article>
  `;

  bindDynamicLinks(container);
}

/** 7. Интерактивный граф связей персонажей **/
function renderRelationshipGraph(container) {
  const chars = STATE.data.characters || [];
  const factions = STATE.data.factions || [];
  const factionColorMap = new Map();
  factions.forEach(f => factionColorMap.set(f.id, f.color || '#3b82f6'));

  // Построение координат вершин по гармоничной схеме
  const width = 820;
  const height = 500;
  const cx = width / 2;
  const cy = height / 2;
  const rx = 265;
  const ry = 170;

  const nodes = chars.map((c, idx) => {
    const isCenter = c.id === 'valentin-belinsky';
    const others = chars.filter(x => x.id !== 'valentin-belinsky');
    const otherIdx = others.findIndex(x => x.id === c.id);
    const angle = isCenter ? 0 : ((otherIdx / Math.max(1, others.length)) * Math.PI * 2 - Math.PI / 2);
    return {
      id: c.id,
      char: c,
      x: isCenter ? cx : Math.round(cx + Math.cos(angle) * rx),
      y: isCenter ? cy : Math.round(cy + Math.sin(angle) * ry),
      color: factionColorMap.get(c.factionId) || '#3b82f6'
    };
  });

  const nodeMap = new Map(nodes.map(n => [n.id, n]));
  const edges = [];
  const seenPairs = new Set();

  chars.forEach(c => {
    (c.relationships || []).forEach(rel => {
      if (nodeMap.has(rel.charId)) {
        const pairKey = [c.id, rel.charId].sort().join('__');
        if (!seenPairs.has(pairKey)) {
          seenPairs.add(pairKey);
          edges.push({
            from: c.id,
            to: rel.charId,
            label: rel.type
          });
        }
      }
    });
  });

  const defaultId = (chars.find(c => c.id === 'valentin-belinsky') || chars[0] || {}).id;
  let activeCharId = defaultId;
  let activeFactionFilter = 'all';

  container.innerHTML = `
    <div class="article-container">
      <div class="wiki-page-bar">
        <div class="wiki-page-tabs-left">
          <span class="wiki-page-tab active">🕸️ Граф связей</span>
          <a href="${routeToHref('characters')}" class="wiki-page-tab clickable">👥 Персонажи</a>
        </div>
        <div class="wiki-page-tabs-right">
          <span class="wiki-badge-canon">${chars.length} героев • ${edges.length} связей</span>
        </div>
      </div>

      <header class="article-header">
        <div class="article-heading-group">
          <h1 class="article-title">Интерактивная карта связей Подзалупинска</h1>
          <div class="article-subheading">Выберите персонажа на схеме или отфильтруйте по группировке, чтобы увидеть все связи</div>
        </div>
      </header>

      <div class="graph-toolbar">
        <div class="graph-filter-group">
          <span class="dir-filter-label">Фильтр:</span>
          <button type="button" class="filter-chip active" data-graph-faction="all">Все группировки</button>
          ${factions.map(f => `<button type="button" class="filter-chip" data-graph-faction="${f.id}">${escapeHtml(f.name)}</button>`).join('')}
        </div>
        <div class="graph-legend">
          ${factions.map(f => `
            <span class="graph-legend-item">
              <span class="graph-legend-dot" style="background: ${escapeHtml(f.color || '#3b82f6')};"></span>
              <span>${escapeHtml(f.name)}</span>
            </span>
          `).join('')}
        </div>
      </div>

      <div class="graph-layout-grid">
        <div class="graph-canvas-wrap">
          <svg id="relationshipGraphSvg" class="graph-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Схема связей персонажей сериала Во Все Хуёвые">
            <g class="graph-edges-layer">
              ${edges.map(e => {
                const n1 = nodeMap.get(e.from);
                const n2 = nodeMap.get(e.to);
                return `<line class="graph-edge" data-from="${e.from}" data-to="${e.to}" x1="${n1.x}" y1="${n1.y}" x2="${n2.x}" y2="${n2.y}" />`;
              }).join('')}
            </g>
            <g class="graph-nodes-layer">
              ${nodes.map(n => `
                <g class="graph-node" data-node-id="${n.id}" data-faction-id="${n.char.factionId || ''}" role="button" tabindex="0" aria-label="Выбрать персонажа: ${escapeHtml(n.char.name)}">
                  <circle class="graph-node-circle" cx="${n.x}" cy="${n.y}" r="${n.id === 'valentin-belinsky' ? 30 : 24}" fill="var(--bg-secondary)" stroke="${escapeHtml(n.color)}" />
                  <text x="${n.x}" y="${n.y + 6}" text-anchor="middle" font-size="20" pointer-events="none">${n.char.isImage ? '👤' : escapeHtml(n.char.avatar || '👤')}</text>
                  <text class="graph-node-label" x="${n.x}" y="${n.y + (n.id === 'valentin-belinsky' ? 48 : 42)}">${escapeHtml(n.char.name)}</text>
                  <text class="graph-node-sublabel" x="${n.x}" y="${n.y + (n.id === 'valentin-belinsky' ? 61 : 55)}">${escapeHtml(n.char.status || '')}</text>
                </g>
              `).join('')}
            </g>
          </svg>
        </div>

        <aside class="graph-detail-panel" id="graphDetailPanel" aria-live="polite"></aside>
      </div>
    </div>
  `;

  function updateGraphView() {
    const selectedChar = chars.find(c => c.id === activeCharId) || chars[0];
    const connectedIds = new Set([activeCharId]);
    edges.forEach(e => {
      if (e.from === activeCharId) connectedIds.add(e.to);
      if (e.to === activeCharId) connectedIds.add(e.from);
    });

    const targetFactionObj = activeFactionFilter === 'all' ? null : factions.find(f => f.id === activeFactionFilter);

    container.querySelectorAll('.graph-edge').forEach(line => {
      const from = line.getAttribute('data-from');
      const to = line.getAttribute('data-to');
      const touchesActive = (from === activeCharId || to === activeCharId);
      const matchesFac = !targetFactionObj || (
        characterBelongsToFaction(nodeMap.get(from).char, targetFactionObj) ||
        characterBelongsToFaction(nodeMap.get(to).char, targetFactionObj)
      );
      line.classList.toggle('active', touchesActive && matchesFac);
      line.classList.toggle('dimmed', !matchesFac || (!touchesActive && Boolean(activeCharId)));
    });

    container.querySelectorAll('.graph-node').forEach(gNode => {
      const nId = gNode.getAttribute('data-node-id');
      const charObj = nodeMap.get(nId).char;
      const matchesFac = !targetFactionObj || characterBelongsToFaction(charObj, targetFactionObj);
      const isHighlighted = connectedIds.has(nId);
      gNode.classList.toggle('dimmed', !matchesFac || !isHighlighted);
      const circle = gNode.querySelector('.graph-node-circle');
      if (circle) {
        circle.setAttribute('stroke-width', nId === activeCharId ? '5' : '3');
      }
    });

    const panel = document.getElementById('graphDetailPanel');
    if (panel && selectedChar) {
      const fac = factions.find(f => f.id === selectedChar.factionId);
      const rels = selectedChar.relationships || [];
      panel.innerHTML = `
        <h2 class="graph-detail-title">${escapeHtml(selectedChar.name)}</h2>
        <div style="margin-bottom: 10px;">
          <span class="status-badge status-${getStatusClass(selectedChar.status)}">${escapeHtml(selectedChar.status)}</span>
          ${fac ? `<span class="meta-pill" style="margin-left: 6px;">${escapeHtml(fac.name)}</span>` : ''}
        </div>
        <p style="font-size: 13px; color: var(--text-secondary);">${escapeHtml(selectedChar.overview || '')}</p>
        <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 14px; color: var(--text-muted);">Связи (${rels.length})</h3>
        <ul class="graph-detail-list">
          ${rels.map(rel => {
            const target = chars.find(c => c.id === rel.charId);
            if (target) {
              return `<li class="graph-detail-rel"><strong><button type="button" class="mw-editsection-btn" data-select-node="${target.id}">${escapeHtml(target.name)}</button></strong><div class="rel-type">${escapeHtml(rel.type)}</div></li>`;
            }
            const name = rel.charName || rel.charId;
            return `<li class="graph-detail-rel"><span class="mw-redlink" style="cursor:default;">${escapeHtml(name)} <span class="mw-redlink-badge">без статьи</span></span><div class="rel-type">${escapeHtml(rel.type)}</div></li>`;
          }).join('')}
        </ul>
        <a href="${routeToHref(`character/${selectedChar.id}`)}" class="btn btn-primary" style="width: 100%;">Открыть досье →</a>
      `;

      panel.querySelectorAll('[data-select-node]').forEach(btn => {
        btn.addEventListener('click', () => {
          activeCharId = btn.getAttribute('data-select-node');
          updateGraphView();
        });
      });
      bindDynamicLinks(panel);
    }
  }

  container.querySelectorAll('.graph-node').forEach(gNode => {
    const selectNode = () => {
      activeCharId = gNode.getAttribute('data-node-id');
      updateGraphView();
    };
    gNode.addEventListener('click', selectNode);
    gNode.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        selectNode();
      }
    });
  });

  container.querySelectorAll('[data-graph-faction]').forEach(chip => {
    chip.addEventListener('click', () => {
      container.querySelectorAll('[data-graph-faction]').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      activeFactionFilter = chip.getAttribute('data-graph-faction');
      updateGraphView();
    });
  });

  updateGraphView();
  bindDynamicLinks(container);
}

/* ==========================================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ КАРТОЧЕК
   ========================================================================== */

function renderAvatarHtml(char, options = {}) {
  if (char.isImage || (char.avatar && (char.avatar.includes('/') || char.avatar.includes('.')))) {
    const isEager = Boolean(options && options.eager);
    const loadingAttrs = isEager ? 'loading="eager" fetchpriority="high"' : 'loading="lazy" decoding="async"';
    const isFull = options && options.size === 'full';
    const w = isFull ? 260 : 96;
    const h = isFull ? 240 : 96;
    const rawAvatar = String(char.avatar);
    const localMatch = rawAvatar.match(/^assets\/(valentin|gusev|gey-himbiovech)\.jpg$/i);

    if (localMatch) {
      const slug = localMatch[1];
      const webpRel = isFull ? `assets/${slug}.webp` : `assets/${slug}-thumb.webp`;
      return `<picture><source srcset="${escapeHtml(assetUrl(webpRel))}" type="image/webp"><img src="${escapeHtml(assetUrl(rawAvatar))}" alt="${escapeHtml(char.name)}" ${loadingAttrs} width="${w}" height="${h}"></picture>`;
    }

    return `<img src="${escapeHtml(assetUrl(rawAvatar))}" alt="${escapeHtml(char.name)}" ${loadingAttrs} width="${w}" height="${h}">`;
  }
  return char.avatar || '👤';
}

function getStatusClass(status) {
  if (!status) return 'unknown';
  const s = status.toLowerCase();
  if (s.includes('жив')) return 'жив';
  if (s.includes('мертв') || s.includes('мёртв')) return 'мёртв';
  if (s.includes('пропал')) return 'пропал';
  if (s.includes('срок')) return 'отбывает-срок';
  return 'unknown';
}

function renderStatusStamp(status) {
  const s = (status || '').trim().toLowerCase();
  let cls = 'status-stamp-other';
  let label = (status || 'НЕИЗВЕСТНО').trim().toUpperCase();

  if (s.includes('мертв') || s.includes('мёртв') || s.includes('погиб') || s.includes('убит')) {
    cls = 'status-stamp-dead';
    label = s.includes('мертва') ? 'МЁРТВА' : 'МЁРТВ';
  } else if (s.includes('жив')) {
    cls = 'status-stamp-alive';
    label = s.includes('жива') ? 'ЖИВА' : 'ЖИВ';
  } else if (s.includes('срок') || s.includes('колони') || s.includes('тюрьм') || s.includes('арест') || s.includes('заключ')) {
    cls = 'status-stamp-prison';
    label = 'ОТБЫВАЕТ СРОК';
  } else if (s.includes('розыск')) {
    cls = 'status-stamp-prison';
    label = 'В РОЗЫСКЕ';
  } else if (s.includes('пропал')) {
    cls = 'status-stamp-other';
    label = 'ПРОПАЛ БЕЗ ВЕСТИ';
  }

  const queryStatus = (cls === 'status-stamp-dead') ? 'Мёртв' :
                      (cls === 'status-stamp-alive') ? 'Жив' :
                      (cls === 'status-stamp-prison') ? 'Отбывает срок' : (status || '');

  return `<a href="${routeToHref(`characters?status=${encodeURIComponent(queryStatus)}`)}" class="wiki-status-stamp ${cls}" title="Статус персонажа: ${escapeHtml(status || '')} (нажмите для фильтрации)">${escapeHtml(label)}</a>`;
}

function renderCharacterCardHtml(char) {
  const faction = STATE.data.factions.find(f => f.id === char.factionId);
  const href = routeToHref(`character/${char.id}`);
  return `
    <div class="wiki-card" data-card-link="character/${char.id}">
      <div class="card-banner">
        <span class="status-badge status-${getStatusClass(char.status)}">${escapeHtml(char.status)}</span>
        <div class="card-avatar">${renderAvatarHtml(char)}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="${href}" class="card-title-link">${escapeHtml(char.name)}</a></h3>
        <div class="card-alias">${escapeHtml(char.alias || char.role || '')}</div>
        <p class="card-overview">${escapeHtml(char.overview)}</p>
        <div class="card-meta-pills">
          ${faction ? `<span class="meta-pill">⚗️ ${escapeHtml(faction.name)}</span>` : ''}
          ${char.role ? `<span class="meta-pill">💼 ${escapeHtml(char.role)}</span>` : ''}
        </div>
      </div>
    </div>
  `;
}

function renderFactionCardHtml(faction) {
  const memberCount = getFactionMembers(faction).length;
  const href = routeToHref(`faction/${faction.id}`);
  return `
    <div class="wiki-card faction-card" style="--faction-accent: ${escapeHtml(faction.color || 'var(--accent-primary)')};" data-card-link="faction/${faction.id}">
      <div class="card-banner faction-card-banner">
        ${faction.alignment ? `<span class="status-badge alignment-badge">${escapeHtml(faction.alignment)}</span>` : ''}
        <div class="card-avatar faction-avatar-box">${faction.avatar || '🏛️'}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="${href}" class="card-title-link">${escapeHtml(faction.name)}</a></h3>
        <div class="card-alias">${escapeHtml(faction.type || '')}</div>
        <p class="card-overview">${escapeHtml(faction.summary)}</p>
        <div class="card-meta-pills">
          <span class="meta-pill">👑 ${escapeHtml(faction.leader || 'Неизвестен')}</span>
          <span class="meta-pill">👥 ${memberCount} участников</span>
        </div>
      </div>
    </div>
  `;
}

/* ==========================================================================
   ПОИСКОВОЕ ОКНО (QUICK SEARCH + ПОДСВЕТКА СОВПАДЕНИЙ)
   ========================================================================== */

function highlightSearchMatch(text, query) {
  const raw = String(text || '');
  const q = String(query || '').trim().toLowerCase();
  if (!q) return escapeHtml(raw);

  const lower = raw.toLowerCase();
  let out = '';
  let cursor = 0;
  let matchIdx = lower.indexOf(q, cursor);

  while (matchIdx !== -1) {
    out += escapeHtml(raw.slice(cursor, matchIdx));
    out += `<mark class="search-highlight">${escapeHtml(raw.slice(matchIdx, matchIdx + q.length))}</mark>`;
    cursor = matchIdx + q.length;
    matchIdx = lower.indexOf(q, cursor);
  }
  out += escapeHtml(raw.slice(cursor));
  return out;
}

function initSearch() {
  const modal = document.getElementById('searchModal');
  const openBtn = document.getElementById('openSearchBtn');
  const closeBtn = document.getElementById('closeSearchBtn');
  const input = document.getElementById('globalSearchInput');
  const resultsContainer = document.getElementById('searchResultsList');

  if (!modal || !openBtn || !closeBtn || !input || !resultsContainer) return;

  openBtn.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSearch();
  });

  window.addEventListener('keydown', (e) => {
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    const isTypingInField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if ((e.key === '/' && !isTypingInField) || (e.ctrlKey && e.key && e.key.toLowerCase() === 'k')) {
      if (document.activeElement !== input) {
        if (typeof e.preventDefault === 'function') e.preventDefault();
        openSearch();
      }
    } else if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeSearch();
    }
  });

  // Focus trap внутри модального окна поиска
  modal.addEventListener('keydown', (e) => {
    if (e.key !== 'Tab' || modal.classList.contains('hidden')) return;
    const focusables = modal.querySelectorAll('button, input, a[href], [tabindex]:not([tabindex="-1"])');
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  input.addEventListener('keydown', (e) => {
    const items = resultsContainer.querySelectorAll('.search-result-item');
    if (e.key === 'ArrowDown') {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (items.length > 0) {
        if (STATE.selectedSearchIndex < items.length - 1) {
          STATE.selectedSearchIndex++;
        }
        updateSelectedResult(items);
      }
    } else if (e.key === 'ArrowUp') {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (items.length > 0) {
        if (STATE.selectedSearchIndex > 0) {
          STATE.selectedSearchIndex--;
        } else {
          STATE.selectedSearchIndex = 0;
        }
        updateSelectedResult(items);
      }
    } else if (e.key === 'Enter') {
      if (typeof e.preventDefault === 'function') e.preventDefault();
      if (items.length > 0) {
        const targetIndex = STATE.selectedSearchIndex >= 0 ? STATE.selectedSearchIndex : 0;
        const targetItem = items[targetIndex];
        if (targetItem) {
          const targetRoute = targetItem.getAttribute('data-route') || targetItem.getAttribute('data-link');
          if (targetRoute) {
            closeSearch();
            navigateTo(targetRoute);
          }
        }
      }
    }
  });

  document.querySelectorAll('.filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      STATE.searchFilter = chip.getAttribute('data-filter');
      executeSearch();
    });
  });

  input.addEventListener('input', debounce(executeSearch, 150));

  function updateSelectedResult(items) {
    if (!items) items = resultsContainer.querySelectorAll('.search-result-item');
    let activeId = '';
    items.forEach((item, idx) => {
      const isSelected = idx === STATE.selectedSearchIndex;
      item.classList.toggle('selected', isSelected);
      item.setAttribute('aria-selected', isSelected ? 'true' : 'false');
      if (isSelected) {
        activeId = item.id || '';
        if (typeof item.scrollIntoView === 'function') {
          item.scrollIntoView({ block: 'nearest' });
        }
      }
    });
    if (activeId) {
      input.setAttribute('aria-activedescendant', activeId);
    } else {
      input.removeAttribute('aria-activedescendant');
    }
  }

  function openSearch() {
    STATE.lastFocusedElement = document.activeElement;
    modal.classList.remove('hidden');
    input.value = '';
    input.setAttribute('aria-expanded', 'true');
    STATE.searchQuery = '';
    STATE.selectedSearchIndex = -1;
    executeSearch();
    setTimeout(() => input.focus(), 50);
  }

  function closeSearch() {
    modal.classList.add('hidden');
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
    STATE.selectedSearchIndex = -1;
    if (STATE.lastFocusedElement && typeof STATE.lastFocusedElement.focus === 'function') {
      STATE.lastFocusedElement.focus();
      STATE.lastFocusedElement = null;
    }
  }

  function executeSearch() {
    let results = [];
    const q = (input ? input.value : STATE.searchQuery || '').trim().toLowerCase();
    STATE.searchQuery = q;
    STATE.selectedSearchIndex = -1;

    // Поиск персонажей (включая биографию, характер, факты и категории)
    if (STATE.searchFilter === 'all' || STATE.searchFilter === 'character') {
      STATE.data.characters.forEach(c => {
        const bioStr = Array.isArray(c.biography) ? c.biography.join(' ') : (c.biography || '');
        const text = [
          c.name, c.fullName, c.alias, ...(c.aliasesList || []),
          c.role, ...(c.rolesList || []), c.overview, bioStr,
          c.personality, ...(c.trivia || []), ...(c.categories || []),
          c.quote, c.actor, c.weapon
        ].filter(Boolean).join(' ').toLowerCase();
        if (!q || text.includes(q)) {
          results.push({
            type: 'Персонаж',
            id: c.id,
            title: c.name,
            sub: c.alias || c.role || 'Персонаж',
            avatarHtml: renderAvatarHtml(c),
            route: `character/${c.id}`,
            href: routeToHref(`character/${c.id}`)
          });
        }
      });
    }

    // Поиск группировок
    if (STATE.searchFilter === 'all' || STATE.searchFilter === 'faction') {
      STATE.data.factions.forEach(f => {
        const text = [
          f.name, f.type, f.alignment, f.leader, f.summary, f.history, f.motto, f.headquarters
        ].filter(Boolean).join(' ').toLowerCase();
        if (!q || text.includes(q)) {
          results.push({
            type: 'Группировка',
            id: f.id,
            title: f.name,
            sub: f.type || 'Организация',
            avatarHtml: f.avatar || '🏛️',
            route: `faction/${f.id}`,
            href: routeToHref(`faction/${f.id}`)
          });
        }
      });
    }

    // Поиск серий и фильма
    if (STATE.searchFilter === 'all' || STATE.searchFilter === 'episode') {
      (STATE.data.episodes || []).forEach(ep => {
        const text = `${ep.title} ${ep.kind || ''} ${ep.status || ''}`.toLowerCase();
        if (!q || text.includes(q)) {
          results.push({
            type: ep.kind === 'Фильм' ? 'Фильм' : 'Серия',
            id: ep.id,
            title: ep.title,
            sub: `${ep.kind || 'Серия'} • ${ep.status || 'В разработке'}`,
            avatarHtml: ep.kind === 'Фильм' ? '🎞️' : '🎬',
            route: `episode/${ep.id}`,
            href: routeToHref(`episode/${ep.id}`)
          });
        }
      });
    }

    // Поиск служебных разделов
    if (STATE.searchFilter === 'all' && q) {
      if ('хронология серий'.includes(q) || 'таймлайн'.includes(q) || 'даты'.includes(q) || 'события'.includes(q)) {
        results.push({
          type: 'Раздел',
          id: 'timeline',
          title: 'Каноничная хронология',
          sub: 'Таймлайн событий и эпизодов с 1954 по 2025 год',
          avatarHtml: '⏱️',
          route: 'timeline',
          href: routeToHref('timeline')
        });
      }
      if ('граф связей'.includes(q) || 'карта'.includes(q) || 'отношения'.includes(q) || 'связи'.includes(q)) {
        results.push({
          type: 'Раздел',
          id: 'graph',
          title: 'Граф связей персонажей',
          sub: 'Интерактивная карта отношений между персонажами',
          avatarHtml: '🕸️',
          route: 'graph',
          href: routeToHref('graph')
        });
      }
    }

    if (q) {
      results.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();
        const aExact = aTitle === q;
        const bExact = bTitle === q;
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;

        const aStarts = aTitle.startsWith(q);
        const bStarts = bTitle.startsWith(q);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;

        const aIncludes = aTitle.includes(q);
        const bIncludes = bTitle.includes(q);
        if (aIncludes && !bIncludes) return -1;
        if (!aIncludes && bIncludes) return 1;

        return 0;
      });
    }

    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--text-muted);">
          По запросу «${escapeHtml(q)}» ничего не найдено в архивах.
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = results.map((r, idx) => `
      <div class="search-result-item" id="searchOpt_${idx}" role="option" aria-selected="false" data-route="${escapeHtml(r.route)}" data-link="${escapeHtml(r.href)}">
        <span class="search-res-icon">${r.avatarHtml}</span>
        <div class="search-res-content">
          <div class="search-res-title"><a href="${escapeHtml(r.href)}" style="color:inherit; text-decoration:none;">${highlightSearchMatch(r.title, q)}</a></div>
          <div class="search-res-sub">${highlightSearchMatch(r.sub, q)} • <span class="search-res-type">${escapeHtml(r.type)}</span></div>
        </div>
        <span style="color: var(--text-muted); font-size: 13px;">Открыть →</span>
      </div>
    `).join('');

    resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const target = item.getAttribute('data-route');
        closeSearch();
        if (target) navigateTo(target);
      });
    });
  }
}

/* ==========================================================================
   СПЕЦИФИКАЦИЯ И АРХИТЕКТУРА СТАТЬИ
   ========================================================================== */

function initArchitectureModal() {
  const modal = document.getElementById('architectureModal');
  const openFooterBtn = document.getElementById('openArchitectureBtn');
  const closeBtn = document.getElementById('closeArchModalBtn');
  const closeBtn2 = document.getElementById('closeArchModalBtn2');

  if (openFooterBtn) {
    openFooterBtn.addEventListener('click', (e) => {
      e.preventDefault();
      openArchitectureModal('character');
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', closeArchitectureModal);
  if (closeBtn2) closeBtn2.addEventListener('click', closeArchitectureModal);

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeArchitectureModal();
    });

    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || modal.classList.contains('hidden')) return;
      const focusables = modal.querySelectorAll('button, a[href], [tabindex]:not([tabindex="-1"])');
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeArchitectureModal();
    }
  });

  document.querySelectorAll('.arch-modal-box .modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabKey = tab.getAttribute('data-arch-tab');
      switchArchTab(tabKey);
    });
  });

  const copyPlanBtn = document.getElementById('copyArchPlanBtn');
  if (copyPlanBtn) {
    copyPlanBtn.addEventListener('click', () => {
      const activeTab = document.querySelector('.arch-modal-box .modal-tab.active');
      const isFaction = activeTab && activeTab.getAttribute('data-arch-tab') === 'faction';
      const panelId = isFaction ? 'archTabFaction' : 'archTabCharacter';
      const items = Array.from(document.querySelectorAll(`#${panelId} .arch-plan-item`)).map(item => {
        const num = item.querySelector('.arch-plan-num')?.textContent.trim() || '';
        const title = item.querySelector('.arch-plan-title')?.textContent.trim() || '';
        const desc = item.querySelector('.arch-plan-desc')?.textContent.trim() || '';
        return `${num}. ${title} — ${desc}`;
      }).join('\n');

      const header = isFaction
        ? 'Каноничный пошаговый план статьи об организации / группировке:'
        : 'Каноничный пошаговый план статьи о персонаже:';
      const textToCopy = `${header}\n\n${items}`;

      if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(textToCopy).then(() => {
          const originalText = copyPlanBtn.innerHTML;
          copyPlanBtn.innerHTML = '✅ План скопирован!';
          copyPlanBtn.classList.add('btn-primary');
          copyPlanBtn.classList.remove('btn-secondary');
          showWikiToast('Пошаговый план структуры статьи скопирован в буфер обмена.');
          setTimeout(() => {
            copyPlanBtn.innerHTML = originalText;
            copyPlanBtn.classList.remove('btn-primary');
            copyPlanBtn.classList.add('btn-secondary');
          }, 2200);
        }).catch(() => {
          showWikiToast('Не удалось скопировать план. Выделите пункты вручную.');
        });
      }
    });
  }
}

function openArchitectureModal(initialTab = 'character') {
  const modal = document.getElementById('architectureModal');
  if (!modal) return;
  STATE.lastFocusedElement = document.activeElement;
  modal.classList.remove('hidden');
  const targetTab = (initialTab === 'faction') ? 'faction' : 'character';
  switchArchTab(targetTab);
  const closeBtn = document.getElementById('closeArchModalBtn');
  if (closeBtn && typeof closeBtn.focus === 'function') {
    setTimeout(() => closeBtn.focus(), 30);
  }
}

function closeArchitectureModal() {
  const modal = document.getElementById('architectureModal');
  if (modal) modal.classList.add('hidden');
  if (STATE.lastFocusedElement && typeof STATE.lastFocusedElement.focus === 'function') {
    STATE.lastFocusedElement.focus();
    STATE.lastFocusedElement = null;
  }
}

function switchArchTab(tabKey) {
  const targetKey = (tabKey === 'faction') ? 'faction' : 'character';

  document.querySelectorAll('.arch-modal-box .modal-tab').forEach(tab => {
    const isActive = tab.getAttribute('data-arch-tab') === targetKey;
    tab.classList.toggle('active', isActive);
    tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
  });

  const panels = {
    character: document.getElementById('archTabCharacter'),
    faction: document.getElementById('archTabFaction')
  };

  Object.keys(panels).forEach(k => {
    if (panels[k]) {
      panels[k].classList.toggle('hidden', k !== targetKey);
    }
  });
}

window.openArchitectureModal = openArchitectureModal;

/* ==========================================================================
   WIKI УВЕДОМЛЕНИЯ, КНОПКА «НАВЕРХ» И АВТО-ВИКИФИКАЦИЯ
   ========================================================================== */

function initBackToTop() {
  const btn = document.getElementById('backToTopBtn');
  if (!btn) return;
  btn.addEventListener('click', () => {
    if (typeof window.scrollTo === 'function') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  });
  window.addEventListener('scroll', () => {
    const y = window.scrollY || document.documentElement.scrollTop || 0;
    btn.classList.toggle('visible', y > 320);
  });
}

function showWikiToast(message) {
  let toast = document.getElementById('wikiToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wikiToast';
    toast.className = 'wiki-toast';
    toast.setAttribute('role', 'status');
    toast.setAttribute('aria-live', 'polite');
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('visible');
  }, 2800);
}
window.showWikiToast = showWikiToast;

function renderWikiProse(text, currentId) {
  if (!text) return '';
  const escaped = escapeHtml(text);

  return escaped.replace(WIKI_PATTERN, (...matchArgs) => {
    const matchedText = matchArgs[0];
    for (let i = 0; i < WIKI_ENTITIES.length; i++) {
      if (matchArgs[i + 1] !== undefined) {
        const entity = WIKI_ENTITIES[i];
        if (entity.isPlace) {
          return `<span class="wiki-place-tag">${matchedText}</span>`;
        }
        if (entity.id && entity.id === currentId) {
          return `<strong class="mw-selflink">${matchedText}</strong>`;
        }
        return `<a href="${routeToHref(entity.route)}" class="wiki-link wiki-inline-link">${matchedText}</a>`;
      }
    }
    return matchedText;
  });
}

/* ==========================================================================
   ЭКСПОРТ БАЗЫ И СБРОС НАСТРОЕК ИНТЕРФЕЙСА
   ========================================================================== */

function initExportReset() {
  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', (e) => {
      e.preventDefault();
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(STATE.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', 'Во_Все_Хуевые_база_знаний.json');
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showWikiToast('Архив базы знаний (JSON) подготовлен к скачиванию.');
    });
  }

  const resetBtn = document.getElementById('resetDataBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      safeStorage.removeItem('wiki_theme');
      safeStorage.removeItem('wiki_lore_data');
      STATE.theme = getInitialTheme();
      applyTheme();
      STATE.searchQuery = '';
      STATE.searchFilter = 'all';
      initData();
      navigateTo('home');
      showWikiToast('Настройки интерфейса (тема и фильтры) сброшены к значениям по умолчанию.');
    });
  }
}

/* ==========================================================================
   УТИЛИТЫ
   ========================================================================== */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
