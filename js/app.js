/**
 * ВО ВСЕ ХУЁВЫЕ - ОСНОВНАЯ ЛОГИКА ВИКИПЕДИИ
 * Интерактивная навигация, маршрутизация, поиск, генерация инфобоксов и локальное сохранение.
 */

// Состояние приложения
const STATE = {
  data: null,
  currentView: 'home',
  currentId: null,
  theme: localStorage.getItem('wiki_theme') || 'dark',
  searchQuery: '',
  searchFilter: 'all',
  selectedSearchIndex: -1
};

// Запуск приложения
document.addEventListener('DOMContentLoaded', () => {
  initData();
  initTheme();
  initNavigation();
  initSearch();
  initArchitectureModal();
  initExportReset();
  
  // Слушатель хэша в URL для роутинга
  window.addEventListener('hashchange', handleRoute);
  
  // Стартовый роут
  handleRoute();
});

/* ==========================================================================
   ДАННЫЕ И ЛОКАЛЬНОЕ ХРАНИЛИЩЕ
   ========================================================================== */

function initData() {
  const savedData = localStorage.getItem('wiki_lore_data');
  if (savedData) {
    try {
      const parsed = JSON.parse(savedData);
      // Проверяем версию или старые тестовые данные
      if (!parsed.version || parsed.version !== DEFAULT_WIKI_DATA.version || (parsed.universe && parsed.universe.title === "Aethelgard Chronicles")) {
        console.log("Обновление базы до актуальной версии " + DEFAULT_WIKI_DATA.version + "...");
        STATE.data = JSON.parse(JSON.stringify(DEFAULT_WIKI_DATA));
        saveData();
      } else {
        STATE.data = parsed;
      }
    } catch (e) {
      console.warn('Ошибка чтения localStorage. Возврат к дефолту.', e);
      STATE.data = JSON.parse(JSON.stringify(DEFAULT_WIKI_DATA));
      saveData();
    }
  } else {
    STATE.data = JSON.parse(JSON.stringify(DEFAULT_WIKI_DATA));
    saveData();
  }
  updateStats();
}

function saveData() {
  localStorage.setItem('wiki_lore_data', JSON.stringify(STATE.data));
  updateStats();
}

function updateStats() {
  document.getElementById('statCharCount').textContent = STATE.data.characters.length;
  document.getElementById('statFactionCount').textContent = STATE.data.factions.length;
  document.getElementById('statArticleCount').textContent = STATE.data.characters.length + STATE.data.factions.length + (STATE.data.timeline ? STATE.data.timeline.length : 1);

  // Заголовки в шапке
  document.getElementById('wikiUniverseTitle').textContent = STATE.data.universe.superTitle || "ВО ВСЕ ХУЁВЫЕ";
  document.getElementById('wikiMainTitle').textContent = STATE.data.universe.title || "Официальная Вики";
}

/* ==========================================================================
   ПЕРЕКЛЮЧАТЕЛЬ ТЕМЫ (СВЕТЛАЯ / ТЕМНАЯ)
   ========================================================================== */

function initTheme() {
  document.documentElement.setAttribute('data-theme', STATE.theme);
  updateThemeIcon();

  const toggleBtn = document.getElementById('themeToggleBtn');
  toggleBtn.addEventListener('click', () => {
    STATE.theme = STATE.theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', STATE.theme);
    localStorage.setItem('wiki_theme', STATE.theme);
    updateThemeIcon();
  });
}

function updateThemeIcon() {
  const iconSpan = document.getElementById('themeIcon');
  iconSpan.textContent = STATE.theme === 'dark' ? '🌙' : '☀️';
}

/* ==========================================================================
   НАВИГАЦИЯ И КЛИЕНТСКИЙ РОУТИНГ
   ========================================================================== */

function initNavigation() {
  // Клик по логотипу -> на главную
  document.getElementById('homeLogoBtn').addEventListener('click', () => {
    window.location.hash = '#home';
  });

  // Кнопки главного меню
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      window.location.hash = `#${view}`;
    });
  });

  // Ссылки в футере
  document.querySelectorAll('.quick-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const view = link.getAttribute('data-view');
      window.location.hash = `#${view}`;
    });
  });
}

function handleRoute() {
  const hash = window.location.hash.slice(1) || 'home';
  const [path, queryString] = hash.split('?');
  const params = new URLSearchParams(queryString || '');
  const parts = path.split('/');
  const route = parts[0];
  const id = parts[1] || null;

  // Если это якорная ссылка содержания (например, #sec-biography), скроллим к разделу и не перерисовываем страницу
  if (route.startsWith('sec-')) {
    const targetSection = document.getElementById(route);
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return;
  }

  STATE.currentView = route;
  STATE.currentId = id;

  // Подсветка активной вкладки
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-view') === route);
  });

  const viewport = document.getElementById('contentViewport');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  switch (route) {
    case 'characters':
      renderCharactersDirectory(viewport, params);
      updateBreadcrumbs([
        { title: 'Вики', link: '#home' },
        { title: 'Персонажи' }
      ]);
      break;

    case 'character':
      if (id) {
        renderCharacterArticle(viewport, id);
      } else {
        window.location.hash = '#characters';
      }
      break;

    case 'factions':
      renderFactionsDirectory(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: '#home' },
        { title: 'Группировки' }
      ]);
      break;

    case 'faction':
      if (id) {
        renderFactionArticle(viewport, id);
      } else {
        window.location.hash = '#factions';
      }
      break;

    case 'episodes':
      renderEpisodesPlaceholder(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: '#home' },
        { title: 'Серии' }
      ]);
      break;

    case 'timeline':
      renderTimelineView(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: '#home' },
        { title: 'Хронология серий' }
      ]);
      break;

    case 'home':
    default:
      renderHomeView(viewport);
      updateBreadcrumbs([
        { title: 'Вики', link: '#home' },
        { title: 'Главная страница' }
      ]);
      break;
  }
}

function updateBreadcrumbs(crumbs) {
  const container = document.getElementById('wikiBreadcrumbs');
  container.innerHTML = crumbs.map((crumb, idx) => {
    const isLast = idx === crumbs.length - 1;
    if (isLast) {
      return `<span class="bc-current">${escapeHtml(crumb.title)}</span>`;
    }
    return `<a href="${crumb.link}">${escapeHtml(crumb.title)}</a><span class="bc-sep">/</span>`;
  }).join('');
}

/* ==========================================================================
   ОТОБРАЖЕНИЕ СТРАНИЦ (VIEWS)
   ========================================================================== */

/** 1. Главная страница (Портал) **/
function renderHomeView(container) {
  const u = STATE.data.universe;
  const valentin = STATE.data.characters.find(c => c.id === 'valentin-belinsky') || STATE.data.characters[0];
  const allChars = STATE.data.characters;
  const factions = STATE.data.factions;

  container.innerHTML = `
    <!-- Главный баннер портала -->
    <div class="portal-hero">
      <div class="portal-tag">${escapeHtml(u.superTitle || "ОФИЦИАЛЬНАЯ ПАРОДИЙНАЯ ВИКИ")}</div>
      <h1 class="portal-title">${escapeHtml(u.title)}</h1>
      <p class="portal-desc">${escapeHtml(u.description)}</p>
      <div class="portal-actions">
        <a href="#characters" class="btn btn-primary">Все персонажи (${allChars.length})</a>
        <a href="#factions" class="btn btn-secondary">Группировки и картели</a>
        <a href="#episodes" class="btn btn-secondary">Серии</a>
        <a href="#timeline" class="btn btn-secondary">Хронология серий</a>
      </div>
    </div>

    <!-- Карточка персонажа недели (Валентин Белинский) -->
    ${valentin ? `
      <div class="portal-grid-header">
        <h2 class="portal-grid-title"><span class="icon">★</span> Главный криминальный авторитет Подзалупинска</h2>
        <a href="#characters">Вся база досье →</a>
      </div>
      <div class="wiki-card" style="margin-bottom: 36px; border-left: 4px solid var(--accent-primary);" onclick="window.location.hash='#character/${valentin.id}'">
        <div style="display: flex; flex-wrap: wrap; gap: 24px; padding: 24px; align-items: center;">
          <div class="card-avatar" style="width: 110px; height: 110px; font-size: 50px; flex-shrink: 0;">
            ${renderAvatarHtml(valentin)}
          </div>
          <div style="flex: 1; min-width: 260px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 6px;">
              <h3 style="font-family: var(--font-heading); font-size: 24px; color: var(--text-primary); margin: 0;">${escapeHtml(valentin.name)}</h3>
              <span class="status-badge status-${getStatusClass(valentin.status)}">${escapeHtml(valentin.status)}</span>
            </div>
            <div style="font-size: 13.5px; font-family: var(--font-mono); color: var(--accent-primary); margin-bottom: 12px;">
              ${escapeHtml(valentin.alias || '')} • ${escapeHtml(valentin.role || '')}
            </div>
            <p style="color: var(--text-secondary); margin-bottom: 14px; font-size: 14.5px;">${escapeHtml(valentin.overview)}</p>
            ${valentin.quote ? `<div style="font-style: italic; color: var(--text-muted); font-size: 13.5px;">«${escapeHtml(valentin.quote)}»</div>` : ''}
          </div>
        </div>
      </div>
    ` : ''}

    <!-- Каталог персонажей -->
    <div class="portal-grid-header">
      <h2 class="portal-grid-title"><span class="icon">👥</span> Действующие лица</h2>
      <a href="#characters">Смотреть всех (${allChars.length}) →</a>
    </div>
    <div class="cards-grid">
      ${allChars.map(char => renderCharacterCardHtml(char)).join('')}
    </div>

    <!-- Группировки -->
    <div class="portal-grid-header">
      <h2 class="portal-grid-title"><span class="icon">⚗️</span> Группировки и организации</h2>
      <a href="#factions">Все организации (${factions.length}) →</a>
    </div>
    <div class="cards-grid">
      ${factions.map(faction => renderFactionCardHtml(faction)).join('')}
    </div>
  `;
}

/** 2. Каталог персонажей **/
function renderCharactersDirectory(container, params = null) {
  const characters = STATE.data.characters;
  const factions = STATE.data.factions;

  container.innerHTML = `
    <div class="portal-grid-header" style="margin-bottom: 24px;">
      <div>
        <h1 class="portal-title" style="font-size: 28px; margin-bottom: 4px;">Картотека персонажей</h1>
        <div class="article-subheading" style="margin-bottom: 4px;">Полный каноничный реестр действующих лиц Подзалупинска</div>
      </div>
      <div class="wiki-counter-badge"><span class="badge-dot">●</span> <strong>${characters.length}</strong> персонажей задокументировано</div>
    </div>

    <!-- Фильтры и поиск по каталогу -->
    <div style="background: var(--bg-secondary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 14px 18px; margin-bottom: 24px; display: flex; flex-wrap: wrap; gap: 14px; align-items: center;">
      <div style="flex: 1; min-width: 220px;">
        <input type="text" id="dirSearchInput" placeholder="Поиск по имени, кличке или роли..." 
               style="width: 100%; background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13.5px;">
      </div>
      
      <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
        <label style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">Группировка:</label>
        <select id="dirFactionFilter" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px;">
          <option value="all">Все группировки</option>
          ${factions.map(f => `<option value="${f.id}">${escapeHtml(f.name)}</option>`).join('')}
        </select>

        <label style="font-size: 13px; font-weight: 600; color: var(--text-secondary);">Статус:</label>
        <select id="dirStatusFilter" style="background: var(--bg-primary); border: 1px solid var(--border-color); color: var(--text-primary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 13px;">
          <option value="all">Все статусы</option>
          <option value="Жив">Жив</option>
          <option value="Мёртв">Мёртв</option>
          <option value="Пропал">Пропал без вести</option>
          <option value="Отбывает срок">Отбывает срок</option>
        </select>
      </div>
    </div>

    <!-- Сетка карточек -->
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
    const fac = factionSelect.value;
    const stat = statusSelect.value;

    const filtered = STATE.data.characters.filter(c => {
      const matchText = (c.name + ' ' + (c.alias || '') + ' ' + (c.role || '') + ' ' + (c.fullName || '')).toLowerCase().includes(q);
      const matchFac = fac === 'all' || c.factionId === fac;
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
      grid.innerHTML = `<div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted); background: var(--bg-secondary); border: 1px dashed var(--border-color); border-radius: var(--radius-md);">
        Персонажи по заданным критериям не найдены.
      </div>`;
    } else {
      grid.innerHTML = filtered.map(c => renderCharacterCardHtml(c)).join('');
    }
  }

  input.addEventListener('input', applyFilter);
  factionSelect.addEventListener('change', applyFilter);
  statusSelect.addEventListener('change', applyFilter);

  if (params && (params.get('faction') || params.get('status') || params.get('q'))) {
    applyFilter();
  }
}

/** 3. Полная статья персонажа (Классический Fandom-инфобокс) **/
function renderCharacterArticle(container, charId) {
  const char = STATE.data.characters.find(c => c.id === charId);
  if (!char) {
    container.innerHTML = `
      <div class="article-container" style="text-align: center; padding: 60px 20px;">
        <h2 style="font-family: var(--font-heading); margin-bottom: 12px;">Персонаж не найден</h2>
        <p style="color: var(--text-secondary); margin-bottom: 20px;">Запись о данном персонаже отсутствует в архивах Подзалупинска.</p>
        <a href="#characters" class="btn btn-primary">Вернуться к списку</a>
      </div>
    `;
    return;
  }

  const faction = STATE.data.factions.find(f => f.id === char.factionId);
  updateBreadcrumbs([
    { title: 'Вики', link: '#home' },
    { title: 'Персонажи', link: '#characters' },
    { title: char.name }
  ]);

  // Разделение биографии на абзацы с авто-викификацией
  const bioParagraphs = char.biography 
    ? char.biography.split('\n\n').filter(p => p.trim().length > 0).map(p => `<p>${renderWikiProse(p, char.id)}</p>`).join('')
    : '<p>Подробная биография еще не задокументирована архивариусами Подзалупинска.</p>';

  container.innerHTML = `
    <article class="article-container">
      <!-- Классическая плашка вкладок MediaWiki / Fandom -->
      <div class="wiki-page-bar">
        <div class="wiki-page-tabs-left">
          <span class="wiki-page-tab active">📄 Статья</span>
          <button class="wiki-page-tab-btn" onclick="openArchitectureModal('character')" title="Посмотреть каноничную структуру этой статьи">📐 Архитектура статьи</button>
        </div>
        <div class="wiki-page-tabs-right">
          <span class="wiki-page-tab active">Читать</span>
          <span class="wiki-badge-canon">Канон v${STATE.data.version || '2.4'}</span>
        </div>
      </div>

      <!-- Заголовок статьи в стиле классической энциклопедии / шапка досье -->
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

      <!-- Классическая плашка верификации канона (Notice Box) -->
      <div class="wiki-notice-box">
        <div class="notice-icon">🛡️</div>
        <div class="notice-body">
          <div class="notice-title">Официальный канон вселенной «Во Все Хуёвые»</div>
          <div class="notice-text">
            Материал проверен архивариусами Подзалупинска. Статус: <strong class="status-badge status-${getStatusClass(char.status)}" style="display:inline-block; padding: 1px 7px; font-size: 11px;">${escapeHtml(char.status)}</strong>${char.actor ? ` • Исполнитель роли: <strong>${escapeHtml(char.actor)}</strong>` : ''}${char.origin ? ` • Происхождение: <strong>${escapeHtml(char.origin)}</strong>` : ''}.
          </div>
        </div>
      </div>

      <!-- Основное тело статьи со всплывающим инфобоксом справа -->
      <div class="article-main-wrapper">
        
        <!-- КЛАССИЧЕСКИЙ FANDOM ИНФОБОКС -->
        <aside class="wiki-infobox">
          <div class="infobox-title">${escapeHtml(char.fullName || char.name)}</div>
          
          <div class="infobox-image-wrapper">
            <div class="infobox-avatar">${renderAvatarHtml(char)}</div>
            <div class="infobox-caption">${escapeHtml(char.role || 'Персонаж')}</div>
            <div style="margin-top: 8px;">
              <span class="status-badge status-${getStatusClass(char.status)}">${escapeHtml(char.status)}</span>
            </div>
          </div>

          <!-- Секция: Информация о персонаже -->
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
                <ul style="padding-left: 14px; margin: 0; font-size: 12px;">
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

          <!-- Секция: Судьба -->
          <div class="infobox-section-header">Судьба</div>
          <div class="infobox-row">
            <div class="infobox-label">Статус</div>
            <div class="infobox-value"><strong style="color: ${char.status === 'Мёртв' ? 'var(--status-deceased-text)' : 'var(--status-active-text)'}">${escapeHtml(char.status)}</strong></div>
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
              <div class="infobox-value">${escapeHtml(char.causeOfDeath)}</div>
            </div>
          ` : ''}

          <!-- Секция: Жизнь и семья -->
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

          <!-- Секция: Появления в сериале -->
          <div class="infobox-section-header">Появления в сериале</div>
          ${char.firstAppearance ? `
            <div class="infobox-row">
              <div class="infobox-label">Первое</div>
              <div class="infobox-value">«${escapeHtml(char.firstAppearance.replace(/[«»"]/g, ''))}»</div>
            </div>
          ` : ''}
          ${char.lastAppearance ? `
            <div class="infobox-row">
              <div class="infobox-label">Последнее</div>
              <div class="infobox-value">«${escapeHtml(char.lastAppearance.replace(/[«»"]/g, ''))}»</div>
            </div>
          ` : ''}
          ${char.inMovie ? `
            <div class="infobox-row">
              <div class="infobox-label">Фильм «Путь розового?»</div>
              <div class="infobox-value">${escapeHtml(char.inMovie)}</div>
            </div>
          ` : ''}

          <!-- Секция: Группировка и навыки -->
          <div class="infobox-section-header">Деятельность и связи</div>
          
          ${char.rolesList && char.rolesList.length > 0 ? `
            <div class="infobox-row">
              <div class="infobox-label">Род деятельности</div>
              <div class="infobox-value">
                <ul style="padding-left: 14px; margin: 0; font-size: 12px; line-height: 1.45;">
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
                <ul style="padding-left: 14px; margin: 0; font-size: 12px; line-height: 1.45;">
                  ${char.affiliationsList.map(a => `<li>${escapeHtml(a)}</li>`).join('')}
                </ul>
              </div>
            </div>
          ` : `
            <div class="infobox-row">
              <div class="infobox-label">Принадлежность</div>
              <div class="infobox-value">
                ${faction ? `<a href="#faction/${faction.id}">${escapeHtml(faction.name)}</a>` : 'Одиночка / Не состоит'}
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

        <!-- Коронная цитата -->
        ${char.quote ? `
          <blockquote class="wiki-quote">
            «${escapeHtml(char.quote)}»
            <span class="wiki-quote-author">— ${escapeHtml(char.name)}</span>
          </blockquote>
        ` : ''}

        <!-- Содержание статьи (TOC) -->
        <nav class="wiki-toc">
          <div class="toc-header">
            <span class="toc-title">Содержание</span>
            <button class="toc-toggle-btn" id="tocToggleBtn">[скрыть]</button>
          </div>
          <ol class="toc-list" id="tocList">
            <li><a href="#sec-overview"><span class="toc-num">1</span>Общие сведения</a></li>
            <li><a href="#sec-biography"><span class="toc-num">2</span>Биография</a></li>
            ${char.personality ? `<li><a href="#sec-personality"><span class="toc-num">3</span>Личность и характер</a></li>` : ''}
            ${char.relationships && char.relationships.length ? `<li><a href="#sec-relationships"><span class="toc-num">${char.personality ? '4' : '3'}</span>Связи и отношения</a></li>` : ''}
            ${char.trivia && char.trivia.length ? `<li><a href="#sec-trivia"><span class="toc-num">${char.personality ? (char.relationships && char.relationships.length ? '5' : '4') : (char.relationships && char.relationships.length ? '4' : '3')}</span>Интересные факты</a></li>` : ''}
            <li><a href="#sec-categories"><span class="toc-num">${char.personality ? (char.relationships && char.relationships.length ? (char.trivia && char.trivia.length ? '6' : '5') : '4') : '4'}</span>Категории</a></li>
          </ol>
        </nav>

        <!-- Раздел 1: Общие сведения -->
        <section class="wiki-section" id="sec-overview">
          <h2 class="wiki-section-heading">
            <span><span class="mw-headline-number">1.</span> Общие сведения</span>
            <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="javascript:void(0)" onclick="openArchitectureModal('sections')">архитектура</a><span class="mw-editsection-bracket">]</span></span>
          </h2>
          <div class="wiki-section-body">
            <p>${renderWikiProse(char.overview, char.id)}</p>
          </div>
        </section>

        <!-- Раздел 2: Биография -->
        <section class="wiki-section" id="sec-biography">
          <h2 class="wiki-section-heading">
            <span><span class="mw-headline-number">2.</span> Биография</span>
            <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="javascript:void(0)" onclick="openArchitectureModal('sections')">архитектура</a><span class="mw-editsection-bracket">]</span></span>
          </h2>
          <div class="wiki-section-body">
            ${bioParagraphs}
          </div>
        </section>

        <!-- Раздел 3: Личность -->
        ${char.personality ? `
          <section class="wiki-section" id="sec-personality">
            <h2 class="wiki-section-heading">
              <span><span class="mw-headline-number">3.</span> Личность и характер</span>
              <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="javascript:void(0)" onclick="openArchitectureModal('sections')">архитектура</a><span class="mw-editsection-bracket">]</span></span>
            </h2>
            <div class="wiki-section-body">
              <p>${renderWikiProse(char.personality, char.id)}</p>
            </div>
          </section>
        ` : ''}

        <!-- Раздел 4: Отношения -->
        ${char.relationships && char.relationships.length ? `
          <section class="wiki-section" id="sec-relationships">
            <h2 class="wiki-section-heading">
              <span><span class="mw-headline-number">${char.personality ? '4.' : '3.'}</span> Связи и отношения</span>
              <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="javascript:void(0)" onclick="openArchitectureModal('sections')">архитектура</a><span class="mw-editsection-bracket">]</span></span>
            </h2>
            <div class="relationships-list">
              ${char.relationships.map(rel => {
                const targetChar = STATE.data.characters.find(c => c.id === rel.charId);
                const targetFaction = STATE.data.factions.find(f => f.id === rel.charId);
                const targetName = targetChar ? targetChar.name : (targetFaction ? targetFaction.name : (rel.charName || rel.charId));
                const targetLink = targetChar ? `#character/${rel.charId}` : (targetFaction ? `#faction/${targetFaction.id}` : (rel.charId === 'gusev-ferangiy' ? '#faction/gusev-empire' : '#characters'));
                return `
                  <div class="rel-item">
                    <a href="${targetLink}" class="rel-name">${escapeHtml(targetName)}</a>
                    <span class="rel-type">${escapeHtml(rel.type)}</span>
                  </div>
                `;
              }).join('')}
            </div>
          </section>
        ` : ''}

        <!-- Раздел 5: Интересные факты -->
        ${char.trivia && char.trivia.length ? `
          <section class="wiki-section" id="sec-trivia">
            <h2 class="wiki-section-heading">
              <span><span class="mw-headline-number">${char.personality ? (char.relationships && char.relationships.length ? '5.' : '4.') : (char.relationships && char.relationships.length ? '4.' : '3.')}</span> Интересные факты</span>
              <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="javascript:void(0)" onclick="openArchitectureModal('sections')">архитектура</a><span class="mw-editsection-bracket">]</span></span>
            </h2>
            <div class="wiki-section-body">
              <ul>
                ${char.trivia.map(item => `<li>${renderWikiProse(item, char.id)}</li>`).join('')}
              </ul>
            </div>
          </section>
        ` : ''}

        <!-- Классический подвал категорий MediaWiki -->
        <div class="wiki-categories-box" id="sec-categories">
          <span class="cat-label"><span class="cat-icon">🏷️</span> Категории:</span>
          <ul class="cat-list">
            <li><a href="#characters" class="cat-link">Персонажи сериала</a></li>
            <li><a href="#characters" class="cat-link">Жители Подзалупинска</a></li>
            <li><a href="#characters?status=${encodeURIComponent(char.status)}" class="cat-link">Статус: ${escapeHtml(char.status)}</a></li>
            ${faction ? `<li><a href="#characters?faction=${faction.id}" class="cat-link">Организация: ${escapeHtml(faction.name)}</a></li>` : '<li><a href="#characters" class="cat-link">Одиночки</a></li>'}
            ${char.deathDate && char.deathDate !== '—' ? `<li><a href="#characters?status=${encodeURIComponent('Мёртв')}" class="cat-link">Умершие персонажи</a></li>` : ''}
            ${char.inMovie === 'Да' ? `<li><a href="#timeline" class="cat-link">Персонажи фильма «Путь розового?»</a></li>` : ''}
            ${char.role ? `<li><a href="#characters?q=${encodeURIComponent(char.role)}" class="cat-link">${escapeHtml(char.role)}</a></li>` : ''}
            <li><a href="#home" class="cat-link">Канон «Во Все Хуёвые»</a></li>
          </ul>
        </div>

      </div>
    </article>
  `;

  // Сворачивание оглавления
  const tocBtn = document.getElementById('tocToggleBtn');
  const tocList = document.getElementById('tocList');
  if (tocBtn && tocList) {
    tocBtn.addEventListener('click', () => {
      const isHidden = tocList.style.display === 'none';
      tocList.style.display = isHidden ? 'block' : 'none';
      tocBtn.textContent = isHidden ? '[скрыть]' : '[показать]';
    });
  }

  // Плавный скролл по разделам содержания без изменения основного роута
  container.querySelectorAll('.toc-list a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const targetId = href.slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

/** 4. Каталог группировок **/
function renderFactionsDirectory(container) {
  const factions = STATE.data.factions;

  container.innerHTML = `
    <div class="portal-grid-header" style="margin-bottom: 24px;">
      <div>
        <h1 class="portal-title" style="font-size: 28px; margin-bottom: 4px;">Группировки и организации</h1>
        <div class="article-subheading" style="margin-bottom: 4px;">Синдикаты, правоохранительные органы и картели Подзалупинска</div>
      </div>
      <div class="wiki-counter-badge"><span class="badge-dot">●</span> <strong>${factions.length}</strong> организации в архиве</div>
    </div>

    <div class="cards-grid">
      ${factions.map(faction => renderFactionCardHtml(faction)).join('')}
    </div>
  `;
}

/** 5. Статья группировки **/
function renderFactionArticle(container, factionId) {
  const faction = STATE.data.factions.find(f => f.id === factionId);
  if (!faction) {
    container.innerHTML = `
      <div class="article-container" style="text-align: center; padding: 60px 20px;">
        <h2 style="font-family: var(--font-heading); margin-bottom: 12px;">Группировка не найдена</h2>
        <a href="#factions" class="btn btn-primary">Вернуться к списку</a>
      </div>
    `;
    return;
  }

  const members = STATE.data.characters.filter(c => c.factionId === faction.id);

  updateBreadcrumbs([
    { title: 'Вики', link: '#home' },
    { title: 'Группировки', link: '#factions' },
    { title: faction.name }
  ]);

  container.innerHTML = `
    <article class="article-container">
      <!-- Классическая плашка вкладок MediaWiki / Fandom -->
      <div class="wiki-page-bar">
        <div class="wiki-page-tabs-left">
          <span class="wiki-page-tab active">🏛️ Организация</span>
          <span class="wiki-page-tab clickable" onclick="showWikiToast('Архив обсуждения группировки зафиксирован архивариусами Подзалупинска.')">💬 Обсуждение</span>
          <button class="wiki-page-tab-btn" onclick="openArchitectureModal('faction')" title="Посмотреть структуру этой группировки">📐 Архитектура статьи</button>
        </div>
        <div class="wiki-page-tabs-right">
          <span class="wiki-page-tab active">Читать</span>
          <a href="#timeline" class="wiki-page-tab clickable" style="text-decoration:none;">📜 Хронология</a>
          <span class="wiki-badge-canon">Канон v${STATE.data.version || '2.4'}</span>
        </div>
      </div>

      <header class="article-header">
        <div class="article-heading-group">
          <h1 class="article-title">${escapeHtml(faction.name)}</h1>
          <div class="article-subheading">Материал из «Во Все Хуёвые Вики» — свободной энциклопедии Подзалупинска</div>
          <div class="article-subtitle">${escapeHtml(faction.type || '')}</div>
        </div>
      </header>

      <!-- Классическая плашка верификации канона -->
      <div class="wiki-notice-box">
        <div class="notice-icon">🏛️</div>
        <div class="notice-body">
          <div class="notice-title">Официальный реестр организаций Подзалупинска</div>
          <div class="notice-text">
            Группировка зафиксирована в базе знаний. Лидер: <strong>${escapeHtml(faction.leader || 'Неизвестен')}</strong> • Влияние: <strong>${escapeHtml(faction.influenceLevel || 'Локальный')}</strong> • Участников в базе: <strong>${members.length}</strong>.
          </div>
        </div>
      </div>

      <div class="article-main-wrapper">
        <aside class="wiki-infobox">
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
          <div class="infobox-row">
            <div class="infobox-label">Главарь</div>
            <div class="infobox-value">${escapeHtml(faction.leader || 'Неизвестен')}</div>
          </div>
          <div class="infobox-row">
            <div class="infobox-label">Штаб</div>
            <div class="infobox-value">${escapeHtml(faction.headquarters || 'Засекречен')}</div>
          </div>
          <div class="infobox-row">
            <div class="infobox-label">Статус влияния</div>
            <div class="infobox-value">${escapeHtml(faction.influenceLevel || 'Локальный')}</div>
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

        <!-- Содержание статьи (TOC) -->
        <nav class="wiki-toc">
          <div class="toc-header">
            <span class="toc-title">Содержание</span>
            <button class="toc-toggle-btn" id="factionTocToggleBtn">[скрыть]</button>
          </div>
          <ol class="toc-list" id="factionTocList">
            <li><a href="#sec-fac-summary"><span class="toc-num">1</span>Деятельность и цели</a></li>
            ${faction.history ? '<li><a href="#sec-fac-history"><span class="toc-num">2</span>История основания</a></li>' : ''}
            <li><a href="#sec-fac-members"><span class="toc-num">${faction.history ? '3' : '2'}</span>Известные участники</a></li>
            <li><a href="#sec-fac-categories"><span class="toc-num">${faction.history ? '4' : '3'}</span>Категории</a></li>
          </ol>
        </nav>

        <section class="wiki-section" id="sec-fac-summary">
          <h2 class="wiki-section-heading">
            <span><span class="mw-headline-number">1.</span> Деятельность и цели</span>
            <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="javascript:void(0)" onclick="openArchitectureModal('faction')">архитектура</a><span class="mw-editsection-bracket">]</span></span>
          </h2>
          <div class="wiki-section-body">
            <p>${renderWikiProse(faction.summary)}</p>
          </div>
        </section>

        ${faction.history ? `
          <section class="wiki-section" id="sec-fac-history">
            <h2 class="wiki-section-heading">
              <span><span class="mw-headline-number">2.</span> История основания</span>
              <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="javascript:void(0)" onclick="openArchitectureModal('faction')">архитектура</a><span class="mw-editsection-bracket">]</span></span>
            </h2>
            <div class="wiki-section-body">
              <p>${renderWikiProse(faction.history)}</p>
            </div>
          </section>
        ` : ''}

        <section class="wiki-section" id="sec-fac-members">
          <h2 class="wiki-section-heading">
            <span><span class="mw-headline-number">${faction.history ? '3.' : '2.'}</span> Известные участники (${members.length})</span>
            <span class="mw-editsection"><span class="mw-editsection-bracket">[</span><a href="javascript:void(0)" onclick="openArchitectureModal('faction')">архитектура</a><span class="mw-editsection-bracket">]</span></span>
          </h2>
          <div class="cards-grid" style="margin-top: 18px;">
            ${members.length > 0 ? members.map(m => renderCharacterCardHtml(m)).join('') : '<p style="color: var(--text-muted);">В базе пока нет записей об участниках этой организации.</p>'}
          </div>
        </section>

        <!-- Классический подвал категорий MediaWiki -->
        <div class="wiki-categories-box" id="sec-fac-categories">
          <span class="cat-label"><span class="cat-icon">🏷️</span> Категории:</span>
          <ul class="cat-list">
            <li><a href="#factions" class="cat-link">Группировки Подзалупинска</a></li>
            <li><a href="#factions" class="cat-link">${escapeHtml(faction.type || 'Организации')}</a></li>
            <li><a href="#characters?faction=${faction.id}" class="cat-link">Участники синдиката (${members.length})</a></li>
            <li><a href="#home" class="cat-link">Канон «Во Все Хуёвые»</a></li>
          </ul>
        </div>
      </div>
    </article>
  `;

  // Сворачивание оглавления группировки
  const fTocBtn = document.getElementById('factionTocToggleBtn');
  const fTocList = document.getElementById('factionTocList');
  if (fTocBtn && fTocList) {
    fTocBtn.addEventListener('click', () => {
      const isHidden = fTocList.style.display === 'none';
      fTocList.style.display = isHidden ? 'block' : 'none';
      fTocBtn.textContent = isHidden ? '[скрыть]' : '[показать]';
    });
  }

  // Плавный скролл по разделам оглавления группировки
  container.querySelectorAll('.toc-list a').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const targetId = href.slice(1);
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    });
  });
}

/** 6. Хронология серий и событий **/
function renderTimelineView(container) {
  const events = STATE.data.timeline || [];

  container.innerHTML = `
    <div class="article-container">
      <div class="wiki-page-bar">
        <div class="wiki-page-tabs-left">
          <span class="wiki-page-tab active">⏱️ Хронология серий</span>
          <button class="wiki-page-tab-btn" onclick="openArchitectureModal('sections')">📐 Архитектура статьи</button>
        </div>
        <div class="wiki-page-tabs-right">
          <span class="wiki-page-tab active">Каноничный таймлайн</span>
          <span class="wiki-badge-canon">Канон v${STATE.data.version || '2.4'}</span>
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

      <div style="position: relative; padding: 20px 0; max-width: 820px; margin: 0 auto;">
        <div style="position: absolute; left: 30px; top: 0; bottom: 0; width: 3px; background: var(--border-color);"></div>

        ${events.map(ev => `
          <div style="display: flex; gap: 24px; margin-bottom: 32px; position: relative;">
            <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--bg-tertiary); border: 3px solid var(--accent-primary); display: flex; align-items: center; justify-content: center; z-index: 2; font-size: 22px; flex-shrink: 0;">
              ⚗️
            </div>
            <div style="flex: 1; background: var(--bg-tertiary); border: 1px solid var(--border-color); border-radius: var(--radius-md); padding: 18px 22px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 8px;">
                <h3 style="font-family: var(--font-heading); font-size: 18px; color: var(--text-primary); margin: 0;">${escapeHtml(ev.title)}</h3>
                <span style="font-family: var(--font-mono); font-size: 12px; background: var(--bg-primary); border: 1px solid var(--border-color); padding: 2px 8px; border-radius: 4px; color: var(--accent-primary);">${escapeHtml(ev.year)}</span>
              </div>
              <p style="color: var(--text-secondary); font-size: 14px; margin: 0;">${renderWikiProse(ev.desc)}</p>
            </div>
          </div>
        `).join('')}
      </div>

      <!-- Классический подвал категорий MediaWiki -->
      <div class="wiki-categories-box" id="sec-categories">
        <span class="cat-label"><span class="cat-icon">🏷️</span> Категории:</span>
        <ul class="cat-list">
          <li><a href="#timeline" class="cat-link">Хронология Подзалупинска</a></li>
          <li><a href="#characters" class="cat-link">Каноничные эпизоды</a></li>
          <li><a href="#home" class="cat-link">Канон «Во Все Хуёвые»</a></li>
        </ul>
      </div>
    </div>
  `;
}

/** 6.1. Заглушка каталога серий **/
function renderEpisodesPlaceholder(container) {
  container.innerHTML = `
    <div class="portal-grid-header" style="margin-bottom: 24px;">
      <div>
        <h1 class="portal-title" style="font-size: 28px; margin-bottom: 4px;">Серии сериала</h1>
        <div class="article-subheading">Официальный реестр эпизодов сериала «Во Все Хуёвые»</div>
      </div>
      <div class="wiki-counter-badge"><span class="badge-dot">●</span> Каталог в подготовке</div>
    </div>

    <div class="episodes-placeholder-card">
      <div class="episodes-placeholder-icon">🎬</div>
      <h2 class="episodes-placeholder-title">Каталог серий в разработке</h2>
      <p class="episodes-placeholder-desc">
        Архивариусы Подзалупинска каталогизируют хронометраж, синопсисы и списки действующих лиц каждого эпизода. Совсем скоро здесь появится интерактивный каталог всех сезонов и серий!
      </p>
      <div class="episodes-placeholder-actions">
        <a href="#timeline" class="btn btn-primary">Посмотреть хронологию серий</a>
        <a href="#characters" class="btn btn-secondary">Список персонажей</a>
      </div>
    </div>
  `;
}

/* ==========================================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ КАРТОЧЕК
   ========================================================================== */

function renderAvatarHtml(char) {
  if (char.isImage || (char.avatar && (char.avatar.includes('/') || char.avatar.includes('.')))) {
    return `<img src="${char.avatar}" alt="${escapeHtml(char.name)}">`;
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

  return `<a href="#characters?status=${encodeURIComponent(queryStatus)}" class="wiki-status-stamp ${cls}" title="Статус персонажа: ${escapeHtml(status || '')} (нажмите для фильтрации)">${escapeHtml(label)}</a>`;
}

function renderCharacterCardHtml(char) {
  const faction = STATE.data.factions.find(f => f.id === char.factionId);
  return `
    <div class="wiki-card" onclick="window.location.hash='#character/${char.id}'">
      <div class="card-banner">
        <span class="status-badge status-${getStatusClass(char.status)}">${escapeHtml(char.status)}</span>
        <div class="card-avatar">${renderAvatarHtml(char)}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="#character/${char.id}" class="card-title-link" style="color:inherit; text-decoration:none;">${escapeHtml(char.name)}</a></h3>
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
  const memberCount = STATE.data.characters.filter(c => c.factionId === faction.id).length;
  return `
    <div class="wiki-card" onclick="window.location.hash='#faction/${faction.id}'">
      <div class="card-banner" style="background: linear-gradient(135deg, var(--bg-tertiary), var(--bg-card));">
        <div class="card-avatar" style="border-radius: var(--radius-md); font-size: 38px;">${faction.avatar || '🏛️'}</div>
      </div>
      <div class="card-body">
        <h3 class="card-title"><a href="#faction/${faction.id}" class="card-title-link" style="color:inherit; text-decoration:none;">${escapeHtml(faction.name)}</a></h3>
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
   ПОИСКОВОЕ ОКНО (QUICK SEARCH)
   ========================================================================== */

function initSearch() {
  const modal = document.getElementById('searchModal');
  const openBtn = document.getElementById('openSearchBtn');
  const closeBtn = document.getElementById('closeSearchBtn');
  const input = document.getElementById('globalSearchInput');
  const resultsContainer = document.getElementById('searchResultsList');

  openBtn.addEventListener('click', openSearch);
  closeBtn.addEventListener('click', closeSearch);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSearch();
  });

  window.addEventListener('keydown', (e) => {
    if ((e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) && document.activeElement !== input) {
      e.preventDefault();
      openSearch();
    } else if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
      closeSearch();
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

  input.addEventListener('input', () => {
    STATE.searchQuery = input.value.trim().toLowerCase();
    executeSearch();
  });

  function openSearch() {
    modal.classList.remove('hidden');
    input.value = '';
    STATE.searchQuery = '';
    executeSearch();
    setTimeout(() => input.focus(), 50);
  }

  function closeSearch() {
    modal.classList.add('hidden');
  }

  function executeSearch() {
    let results = [];
    const q = STATE.searchQuery;

    // Поиск персонажей
    if (STATE.searchFilter === 'all' || STATE.searchFilter === 'character') {
      STATE.data.characters.forEach(c => {
        const text = `${c.name} ${c.fullName || ''} ${c.alias || ''} ${(c.aliasesList || []).join(' ')} ${c.role || ''} ${(c.rolesList || []).join(' ')} ${c.overview || ''} ${c.quote || ''} ${c.actor || ''} ${c.weapon || ''}`.toLowerCase();
        if (!q || text.includes(q)) {
          results.push({
            type: 'Персонаж',
            id: c.id,
            title: c.name,
            sub: c.alias || c.role || 'Персонаж',
            avatarHtml: renderAvatarHtml(c),
            link: `#character/${c.id}`
          });
        }
      });
    }

    // Поиск группировок
    if (STATE.searchFilter === 'all' || STATE.searchFilter === 'faction') {
      STATE.data.factions.forEach(f => {
        const text = `${f.name} ${f.type || ''} ${f.leader || ''} ${f.summary || ''} ${f.motto || ''} ${f.headquarters || ''}`.toLowerCase();
        if (!q || text.includes(q)) {
          results.push({
            type: 'Группировка',
            id: f.id,
            title: f.name,
            sub: f.type || 'Организация',
            avatarHtml: f.avatar || '🏛️',
            link: `#faction/${f.id}`
          });
        }
      });
    }

    // Поиск ключевых разделов (Серии, Хронология)
    if (STATE.searchFilter === 'all' && q) {
      if ('серии сериала'.includes(q) || 'эпизоды'.includes(q) || 'сезоны'.includes(q) || 'каталог'.includes(q)) {
        results.push({
          type: 'Раздел',
          id: 'episodes',
          title: 'Серии сериала',
          sub: 'Официальный реестр эпизодов (в разработке)',
          avatarHtml: '🎬',
          link: '#episodes'
        });
      }
      if ('хронология серий'.includes(q) || 'таймлайн'.includes(q) || 'даты'.includes(q) || 'события'.includes(q)) {
        results.push({
          type: 'Раздел',
          id: 'timeline',
          title: 'Каноничная хронология',
          sub: 'Таймлайн событий и эпизодов с 1954 по 2025 год',
          avatarHtml: '⏱️',
          link: '#timeline'
        });
      }
    }

    if (results.length === 0) {
      resultsContainer.innerHTML = `
        <div style="padding: 30px; text-align: center; color: var(--text-muted);">
          По запросу «${escapeHtml(q)}» ничего не найдено в архивах.
        </div>
      `;
      return;
    }

    resultsContainer.innerHTML = results.map(r => `
      <div class="search-result-item" onclick="window.location.hash='${r.link}'; document.getElementById('searchModal').classList.add('hidden');">
        <span class="search-res-icon" style="width: 28px; height: 28px; display: inline-flex; align-items: center; justify-content: center; border-radius: 4px; overflow: hidden;">${r.avatarHtml}</span>
        <div class="search-res-content">
          <div class="search-res-title"><a href="${r.link}" style="color:inherit; text-decoration:none;">${escapeHtml(r.title)}</a></div>
          <div class="search-res-sub">${escapeHtml(r.sub)} • <span style="color: var(--accent-primary);">${r.type}</span></div>
        </div>
        <span style="color: var(--text-muted); font-size: 13px;">Открыть →</span>
      </div>
    `).join('');
  }
}

/* ==========================================================================
   СПЕЦИФИКАЦИЯ И АРХИТЕКТУРА СТАТЬИ
   (Перенос архитектуры и стандартов оформления без возможности добавления статей)
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
  }

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
      closeArchitectureModal();
    }
  });

  // Переключение вкладок в модальном окне
  document.querySelectorAll('.arch-modal-box .modal-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabKey = tab.getAttribute('data-arch-tab');
      switchArchTab(tabKey);
    });
  });

  // Копирование пошагового плана статьи
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
      }).catch(err => {
        console.warn('Не удалось скопировать план в буфер:', err);
        showWikiToast('Не удалось скопировать план. Выделите пункты вручную.');
      });
    });
  }
}

function openArchitectureModal(initialTab = 'character') {
  const modal = document.getElementById('architectureModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  const targetTab = (initialTab === 'faction') ? 'faction' : 'character';
  switchArchTab(targetTab);
}

function closeArchitectureModal() {
  const modal = document.getElementById('architectureModal');
  if (modal) modal.classList.add('hidden');
}

function switchArchTab(tabKey) {
  const targetKey = (tabKey === 'faction') ? 'faction' : 'character';

  document.querySelectorAll('.arch-modal-box .modal-tab').forEach(tab => {
    tab.classList.toggle('active', tab.getAttribute('data-arch-tab') === targetKey);
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

// Экспортируем в window для вызова из статей и ссылок
window.openArchitectureModal = openArchitectureModal;

/* ==========================================================================
   WIKI УВЕДОМЛЕНИЯ И АВТО-ВИКИФИКАЦИЯ
   ========================================================================== */

function showWikiToast(message) {
  let toast = document.getElementById('wikiToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'wikiToast';
    toast.className = 'wiki-toast';
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

  // Список сущностей отсортирован от наиболее специфичных и длинных к коротким
  const entities = [
    { pattern: /Валентин(?:а)?\s+(?:«Белый»\s+)?Белинск(?:ий|ого|ому|им|ом)\s+Агафонович/i, href: '#character/valentin-belinsky', id: 'valentin-belinsky' },
    { pattern: /Валентин(?:а)?\s+Белинск(?:ий|ого|ому|им|ом)/i, href: '#character/valentin-belinsky', id: 'valentin-belinsky' },
    { pattern: /Наркоимпери(?:я|и|ю|ей)\s+Хуйзенберга/i, href: '#faction/huizenberg-empire', id: 'huizenberg-empire' },
    { pattern: /Наркоимпери(?:я|и|ю|ей)\s+Гусева\s+Ферангия/i, href: '#faction/gusev-empire', id: 'gusev-empire' },
    { pattern: /Хуйзенберг(?:а|у|ом|е)?/i, href: '#character/valentin-belinsky', id: 'valentin-belinsky' },
    { pattern: /Стояк(?:а)?\s+Геннадьевич(?:а)?\s+Шрейдеров(?:а)?/i, href: '#character/stoyak-belinsky', id: 'stoyak-belinsky' },
    { pattern: /Стояк(?:а)?\s+Белинск(?:ий|ого|ому|им|ом)/i, href: '#character/stoyak-belinsky', id: 'stoyak-belinsky' },
    { pattern: /Скулер\s+Белинск(?:ая|ой|ую)/i, href: '#character/skyler-belinskaya', id: 'skyler-belinskaya' },
    { pattern: /Сосик(?:а)?\s+\(Джимми\)\s+Гудманов(?:а)?/i, href: '#character/sosik-goodman', id: 'sosik-goodman' },
    { pattern: /Сосик(?:а)?\s+Гудман(?:а|у|ом|е)?/i, href: '#character/sosik-goodman', id: 'sosik-goodman' },
    { pattern: /Гусев(?:а)?\s+Феранги(?:й|я|ю|ем|е)/i, href: '#faction/gusev-empire', id: 'gusev-empire' },
    { pattern: /Гей\s+Анальн(?:ый|ого)\s+Химбиович(?:а)?/i, href: '#character/gey-himbiovech', id: 'gey-himbiovech' },
    { pattern: /Гей(?:я)?\s+Химбиович(?:а|у|ем|е)?/i, href: '#character/gey-himbiovech', id: 'gey-himbiovech' },
    { pattern: /Гей(?:я)?\s+Химирович(?:а|у|ем|е)?/i, href: '#character/gey-himbiovech', id: 'gey-himbiovech' },
    { pattern: /Хербиович(?:а|у|ем|е)?/i, href: '#character/gey-himbiovech', id: 'gey-himbiovech' },
    { pattern: /Жесси\s+рiзiв(?:ым|ого|ому|ый)\s+пiрн(?:ем|я|ю|ь)/i, href: '#character/jesse-pinkman', id: 'jesse-pinkman' },
    { pattern: /Джесси\s+Розов(?:ый|ого|ому|ым|ом)/i, href: '#character/jesse-pinkman', id: 'jesse-pinkman' },
    { pattern: /Жесси\s+Розов(?:ый|ого|ому|ым|ом)/i, href: '#character/jesse-pinkman', id: 'jesse-pinkman' },
    { pattern: /ОБН\s+Подзалупинска/i, href: '#faction/obn-podzalupinsk', id: 'obn-podzalupinsk' },
    { pattern: /«Пилот\s+Мефедрона»|«Пилот\s+мефедрона»/i, href: '#timeline', id: 'timeline' },
    { pattern: /«Хуелина»/i, href: '#timeline', id: 'timeline' },
    { pattern: /«Путь\s+розового\?»/i, href: '#timeline', id: 'timeline' },
    { pattern: /«Полная\s+и\s+жирная\s+мера»/i, href: '#timeline', id: 'timeline' },
    { pattern: /«Без\s+яйца»/i, href: '#timeline', id: 'timeline' },
    { pattern: /«Озимандий\s+по-русски»/i, href: '#timeline', id: 'timeline' },
    { pattern: /«Звоните\s+Сосику»/i, href: '#timeline', id: 'timeline' },
    { pattern: /г\.\s+Подзалупинск(?:а|у|ом|е)?|Подзалупинск(?:а|у|ом|е)?/i, href: null, isPlace: true }
  ];

  // Единый регулярный шаблон с именованным поиском без повторного сканирования
  const combinedPattern = new RegExp(entities.map(e => `(${e.pattern.source})`).join('|'), 'gi');

  return escaped.replace(combinedPattern, (...matchArgs) => {
    const matchedText = matchArgs[0];
    for (let i = 0; i < entities.length; i++) {
      if (matchArgs[i + 1] !== undefined) {
        const entity = entities[i];
        if (entity.isPlace) {
          return `<span class="wiki-place-tag">${matchedText}</span>`;
        }
        if (entity.id && entity.id === currentId) {
          // Стандарт MediaWiki: самоссылки на текущей странице отображаются полужирным текстом
          return `<strong class="mw-selflink">${matchedText}</strong>`;
        }
        return `<a href="${entity.href}" class="wiki-inline-link">${matchedText}</a>`;
      }
    }
    return matchedText;
  });
}

/* ==========================================================================
   ЭКСПОРТ И СБРОС К КАНОНУ
   ========================================================================== */

function initExportReset() {
  document.getElementById('exportDataBtn').addEventListener('click', (e) => {
    e.preventDefault();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(STATE.data, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Во_Все_Хуевые_база_знаний.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  });

  document.getElementById('resetDataBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm("Сбросить все данные к каноничной базе «Во Все Хуёвые»? Все локальные правки будут заменены.")) {
      localStorage.removeItem('wiki_lore_data');
      initData();
      handleRoute();
    }
  });
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

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\u0400-\u04FF\-]+/g, '')
    .replace(/\-\-+/g, '-');
}
