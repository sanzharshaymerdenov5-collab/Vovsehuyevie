# Project: «Во Все Хуёвые» Wiki — Architecture & Engineering Reference

## Architecture
- **Type**: Static Pre-Rendered Multi-Page + SPA Hybrid (GitHub Pages compatible, offline `file://` compatible).
- **Build Generator**: `scripts/build-pages.js` pre-renders 26 static HTML entry points (`index.html`, `characters/`, `factions/`, `episodes/`, `timeline/`, `graph/`, `character/<id>/`, `faction/<id>/`, `episode/<id>/`, `404.html`) plus a hash-free `sitemap.xml` directly from `js/data.js` and `js/app.js`.
- **Styles**: `css/style.css` (design tokens, dark/light themes verified >= 4.5:1 WCAG 2.1 AA, infoboxes, graph SVG styling, episodes registry, and responsive breakpoints down to 320px).
- **Logic & State**:
  - `js/data.js`: Canon dataset (`DEFAULT_WIKI_DATA` v2.6) containing universe metadata, 7 characters, 3 factions, 9 canon episodes/film, and 8 timeline milestones.
  - `js/app.js`: History API router (`pushState`/`popstate` + legacy `#...` auto-upgrade), directory/article/episode-stub/relationship-graph renderers, full-field debounced quick search with `<mark>` match highlighting & focus trap, random article switcher, section copy buttons, and PWA Service Worker registration.

## Data Flow
1. Initial Load: Pre-rendered static HTML renders immediately with accurate breadcrumbs, stats, `<picture>` WebP portraits, and canonical tags; JS hydrates `STATE.data = DEFAULT_WIKI_DATA`, syncs theme/preferences via `safeStorage`, and attaches dynamic controls.
2. Navigation: Internal `<a>` clicks call `navigateTo(target)` -> updates browser URL cleanly via `history.pushState` (or virtual state under `file://`) without `#` -> updates `document.title`, breadcrumbs, and `#contentViewport`.
3. Custom 404 Recovery: `404.html` injects `<base>` early on nested HTTP paths so assets resolve from site root.
4. Search: Modal (`/` / `Ctrl+K`) or catalog input -> 150ms debounced query -> full-field search across characters (with `All`/`Characters`/`Factions`/`Episodes` chips) -> safe `<mark class="search-highlight">` rendering -> keyboard (`ArrowUp`/`ArrowDown`/`Enter`) or click navigation.

## Key Engineering Features
| # | Feature | Implementation |
|---|---------|----------------|
| 1 | Safe Storage Wrapper | Resilient `safeStorage` catching `SecurityError` / `QuotaExceededError` with in-memory Map fallback. |
| 2 | Hash-Free History API Routing + SSR Pre-Render | `scripts/build-pages.js` + `ROUTING` context supporting GitHub Pages `/Vovsehuyevie/`, root `/`, and local `file://`. |
| 3 | Episodes Directory + Stub Pages | Working `/episodes/` catalog listing 9 canon entries routing to clean «Страница в разработке» stubs. |
| 4 | Interactive Relationship Graph | `/graph/` SVG network connecting canon characters, faction filters, keyboard support, and detail inspector. |
| 5 | Unified Faction Resolution & Status Semantics | `getFactionMembers()` consistency across cards/filters/articles; accurate `infobox-status-text-*` styling and `.mw-redlink` buttons for undocumented mentions. |
| 6 | Accessible Search Modal & Highlights | ARIA `combobox`/`listbox`/`activedescendant`, `Tab` focus trap, focus restoration, `Episodes` filter chip, `<mark>` match highlight. |
| 7 | Media & WebP Optimization | `<picture>` WebP + thumbnail variants alongside `.jpg` fallbacks; PNG/Apple touch PWA icons (`manifest.webmanifest`, `sw.js`). |
| 8 | WCAG 2.1 AA Contrast & Responsive Polish | >= 4.5:1 dark/light tokens & stamps, tablet header wrap (`1120px`), `768px`/`480px` mobile rules, 0px horizontal overflow. |
| 9 | Precompiled Regex & Fixed Debounce | Single-pass `WIKI_PATTERN` with non-capturing groups (`renderWikiProse`); leading+trailing debounce without single-keystroke double firing. |
| 10 | Automated Tests & CI | `tests/e2e_runner.js` (Tiers 1-4) + `.github/workflows/test.yml` checking both E2E pass and pre-render parity (`--check`). |

## Code Layout
```
Vovsehuyevie/
├── .github/workflows/test.yml  # GitHub Actions CI workflow
├── assets/                     # JPG + WebP/thumb WebP character portraits & PWA icons
├── css/style.css               # Design tokens, dark/light themes, responsive styles
├── js/
│   ├── data.js                 # Canon lore dataset (DEFAULT_WIKI_DATA v2.6)
│   └── app.js                  # History API routing, graph, search, renderers, SW registration
├── scripts/build-pages.js      # Static HTML pre-renderer & clean sitemap.xml generator
├── character/<id>/index.html   # Pre-rendered character dossier pages (7)
├── faction/<id>/index.html     # Pre-rendered faction pages (3)
├── episode/<id>/index.html     # Pre-rendered episode/film stub pages (9)
├── characters|factions|episodes|timeline|graph/index.html
├── index.html                  # Home portal page
├── 404.html                    # Custom 404 recovery page for GitHub Pages
├── manifest.webmanifest        # PWA app manifest
├── sw.js                       # Offline caching Service Worker
├── robots.txt                  # Search crawling policy
├── sitemap.xml                 # Clean `#`-free sitemap (25 URLs)
└── tests/                      # Test harness & Tier 1-4 suites
```
