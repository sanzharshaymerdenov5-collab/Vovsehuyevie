# Project: «Во Все Хуёвые» Wiki Optimization & Code Quality Enhancement

## Architecture
- **Type**: Static SPA (Single Page Application) deployed on GitHub Pages.
- **Entry Point**: `index.html` (shell with semantic layout, header, navigation, content viewport, search modal, and scripts).
- **Styles**: `css/style.css` (custom design tokens, dark/light themes, typography, layout, components, and responsive media queries).
- **Logic & State**:
  - `js/data.js`: Canon dataset (`DEFAULT_WIKI_DATA`) containing universe metadata, characters, factions, locations, artifacts, episodes, and timeline.
  - `js/app.js`: Application controller (`STATE`, routing, directory renderers, search engine, theme manager, and prose auto-linker).
- **Data Flow**:
  1. Initial Load: Shell parsed -> `style.css` rendered -> `data.js` and `app.js` loaded.
  2. State Initialization: `STATE.data` bound to `DEFAULT_WIKI_DATA`; theme retrieved via `safeStorage`.
  3. Routing: `window.onhashchange` invokes `handleRoute(route)` -> renders view into `#contentViewport` -> updates `document.title`.
  4. Search: Modal or catalog input -> debounced query -> multi-field search against `STATE.data` -> keyboard or click navigation.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Safe Storage Wrapper | Resilient `safeStorage` helper to prevent Safari Private Mode / restricted iframe crashes on `localStorage`. | M3 | survey_3 |
| 2 | Decoupled Data Loading | Direct binding to `DEFAULT_WIKI_DATA`, eliminating stale 34.6KB `localStorage` cache. | M3 | survey_3 |
| 3 | Search Modal Keyboard Navigation | Full `ArrowUp`, `ArrowDown`, and `Enter` keyboard selection and navigation in quick search modal. | M3 | survey_1, survey_3 |
| 4 | Search Debounce | 150ms debounce utility on search inputs to eliminate DOM churn and lag. | M3 | survey_3 |
| 5 | Precompiled Wiki Regex | Module-level precompiled RegExp in `renderWikiProse` for 57% faster rendering and 0 GC churn. | M3 | survey_3 |
| 6 | Data Integrity & Character Record | Add `gusev-ferangiy` to canon data, fix relationship links, and faction member resolution. | M3 | survey_3 |
| 7 | Dynamic Document Title & Anchor Routing | Update `document.title` on route changes and fix initial landing on `#sec-*` anchors. | M3 | survey_1, survey_3 |
| 8 | Sequential TOC Numbering | Replace nested ternaries with sequential counter in `renderCharacterArticle`. | M3 | survey_3 |
| 9 | Dead Code Removal (JS) | Remove unused `slugify` function in `js/app.js`. | M3 | survey_3 |
| 10 | Mobile Header Navigation Layout Fix | Fix `.wiki-header` height in `@media (max-width: 768px)` so navigation wraps cleanly without clipping. | M2 | survey_2 |
| 11 | Light Theme WCAG 2.1 AA Contrast | Override `--status-*-text` in `[data-theme="light"]` (`#16a34a`, `#dc2626`, `#d97706`) for >= 4.5:1 contrast. | M2 | survey_1, survey_2 |
| 12 | CSS Dead Code Elimination | Remove 188 lines of unused wireframe classes and orphaned `.form-grid`. | M2 | survey_2 |
| 13 | Font Optimization & Preconnect | Prune 5 unused font variants; place `<link rel="preconnect">` before stylesheets in `<head>`. | M1 | survey_1, survey_2 |
| 14 | GPU Acceleration & Smooth Transitions | Replace `transition: all` with composite properties (`transform`, `box-shadow`, `opacity`); add `-webkit-backdrop-filter`. | M2 | survey_2 |
| 15 | Semantic Markup & Accessible Navigation | Accessible logo (`<a>`), search button (`<button>`), hero card link, `<label for>`, and modal `aria-modal`. | M1 | survey_1 |
| 16 | Complete SEO & Social Metadata | Meta description, keywords, Open Graph (`og:*`), Twitter Cards (`twitter:*`), canonical URL, SVG favicon, `robots.txt`, `sitemap.xml`. | M1 | survey_1 |
| 17 | Image Loading Optimization | Add `width`, `height`, and `loading="lazy"` attributes to avatar images. | M1 | survey_1 |
| 18 | Automated E2E Test Suite | Comprehensive opaque-box test runner covering Tiers 1-4 and Tier 5 adversarial checks. | M0 | requirements |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | E2E Testing Track | Design test infrastructure (`TEST_INFRA.md`), create test runner and test cases for Tiers 1-4, publish `TEST_READY.md`. | none | DONE |
| M1 | HTML, SEO & Accessibility | Semantic HTML structure, Open Graph/Twitter meta tags, canonical link, favicon, sitemap/robots, WCAG landmarks, labels, and lazy image attributes. | none | DONE |
| M2 | CSS Architecture & Performance | Mobile header layout fix, dead code cleanup, light theme contrast fix, composite property transitions, Safari blur fix. | none | DONE |
| M3 | JavaScript Architecture & Logic | `safeStorage` wrapper, direct canon data binding, search modal arrow-key navigation, debounced search, precompiled regex, data integrity fixes, dynamic document title. | M1, M2 | DONE |
| M4 | Final E2E Pass & Hardening | Pass 100% of E2E test suite (Tiers 1-4), execute Tier 5 adversarial verification, and run Forensic Integrity Audit. | M0, M1, M2, M3 | DONE |

## Interface Contracts

### HTML ↔ JavaScript
- `#homeLogoBtn`: Semantic link `<a href="#home" class="logo-area" id="homeLogoBtn">`.
- `#openSearchBtn`: Semantic button `<button type="button" class="search-trigger" id="openSearchBtn" aria-label="Открыть поиск">`.
- `#searchModal`: Container with `role="dialog"`, `aria-modal="true"`, `aria-labelledby="searchModalTitle"`.
- `#globalSearchInput`: Input with `aria-label="Поиск по вики"`.
- Search result items in modal: `.search-result-item` with `.selected` class on active keyboard navigation item.

### CSS ↔ HTML/JavaScript
- `[data-theme="light"]`: Defines `--status-active-text: #16a34a;`, `--status-deceased-text: #dc2626;`, `--status-missing-text: #d97706;`.
- `.search-result-item.selected`: Background highlight for keyboard-navigated search results.
- `.wiki-header`: Responsive `height: auto` under `@media (max-width: 768px)`.

### Storage & State Interface
- `safeStorage.getItem(key, defaultValue)`: Returns stored string or `defaultValue`, catching any `SecurityError` or `QuotaExceededError`.
- `safeStorage.setItem(key, value)`: Stores string safely, falling back to memory if storage is inaccessible.
- `STATE.data`: Directly references `DEFAULT_WIKI_DATA` object.

## Code Layout
```
/home/antigravity/sanzharshaymerdenov5-collab/Vovsehuyevie/
├── index.html                  # Main SPA entry point & semantic shell
├── css/
│   └── style.css               # Core design tokens, components, responsive styles
├── js/
│   ├── data.js                 # Canon lore & entities dataset (DEFAULT_WIKI_DATA)
│   └── app.js                  # Application logic, routing, search, rendering
├── assets/                     # Images, avatars, media
├── tests/                      # Automated E2E test harness and test suites
│   ├── e2e_runner.js           # Automated headless test runner
│   ├── tier1_features.test.js  # Feature verification tests
│   ├── tier2_boundaries.test.js# Boundary and corner cases
│   ├── tier3_interactions.test.js # Cross-feature pairwise interactions
│   └── tier4_scenarios.test.js # Real-world user flows & performance
├── robots.txt                  # Search engine crawling rules
├── sitemap.xml                 # XML sitemap for SEO discovery
├── TEST_INFRA.md               # Test methodology & coverage documentation
├── TEST_READY.md               # Test suite readiness indicator & results summary
└── .agents/teamwork/           # Coordination metadata & agent logs
```
