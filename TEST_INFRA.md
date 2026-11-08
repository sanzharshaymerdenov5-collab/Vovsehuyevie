# E2E Test Infra: «Во Все Хуёвые» Wiki

## Test Philosophy
- **Opaque-box & Requirement-driven**: Tests verify the static website strictly from the user's and browser's perspective. No coupling to private internal variables unless validating interface contracts.
- **Coverage Methodology**: Category-Partition, Boundary Value Analysis (BVA), Pairwise Combinatorial Testing, and Real-World Workload Validation.
- **Environment**: Node.js automated test runner utilizing JSDOM / headless DOM environment simulating browser navigation, events, storage restrictions, styling computations, and network constraints.

## Feature Inventory Coverage Map
| # | Feature | Requirement Source | Tier 1 | Tier 2 | Tier 3 |
|---|---------|-------------------|:------:|:------:|:------:|
| 1 | Safe Storage Wrapper | ORIGINAL_REQUEST §1, §4 | 5 | 5 | ✓ |
| 2 | Decoupled Data Loading | ORIGINAL_REQUEST §1, §2 | 5 | 5 | ✓ |
| 3 | Search Modal Keyboard Navigation | ORIGINAL_REQUEST §3, §4 | 5 | 5 | ✓ |
| 4 | Search Debounce | ORIGINAL_REQUEST §1, §2 | 5 | 5 | ✓ |
| 5 | Precompiled Wiki Regex | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 6 | Data Integrity & Character Record | ORIGINAL_REQUEST §2, §4 | 5 | 5 | ✓ |
| 7 | Dynamic Document Title & Routing | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 8 | Sequential TOC Numbering | ORIGINAL_REQUEST §2, §4 | 5 | 5 | ✓ |
| 9 | Dead Code Removal | ORIGINAL_REQUEST §2 | 5 | 5 | ✓ |
| 10 | Mobile Header Navigation Layout | ORIGINAL_REQUEST §1, §4 | 5 | 5 | ✓ |
| 11 | Light Theme WCAG 2.1 AA Contrast | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 12 | CSS Dead Code Elimination | ORIGINAL_REQUEST §1, §2 | 5 | 5 | ✓ |
| 13 | Font Optimization & Preconnect | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 14 | GPU Acceleration & Smooth Transitions | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 15 | Semantic Markup & Accessible Navigation | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 16 | Complete SEO & Social Metadata | ORIGINAL_REQUEST §3 | 5 | 5 | ✓ |
| 17 | Image Loading Optimization | ORIGINAL_REQUEST §1 | 5 | 5 | ✓ |
| 18 | Automated E2E Verification Harness | ORIGINAL_REQUEST §4 | 5 | 5 | ✓ |

## Test Architecture
- **Runner**: `node tests/e2e_runner.js`
- **Pass/Fail Semantics**: Process exits with code 0 if 100% of test cases pass; exits with non-zero code on any failure.
- **Test Case Suites**:
  - `tests/tier1_features.test.js`: Feature-by-feature verification tests (≥5 per feature).
  - `tests/tier2_boundaries.test.js`: Boundary, edge cases, error-prone inputs (≥5 per feature where applicable).
  - `tests/tier3_interactions.test.js`: Cross-feature pairwise interactions (theme switching + search + navigation + modal focus).
  - `tests/tier4_scenarios.test.js`: Real-world end-to-end user journeys (opening site, browsing articles, searching, viewing factions, navigating history, mobile viewport checks).

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Full Reader Journey | Landing page -> Featured hero card click -> Table of Contents jump -> Prose wiki-link click -> Back button | Medium |
| 2 | Search & Keyboard Navigation | Shortcut `Ctrl+K` -> Query "Белинский" -> `ArrowDown` -> `Enter` -> Article load & Title update | High |
| 3 | Mobile Navigation & Viewport Wrap | Screen resize to 375px -> Header wrap inspection -> Nav link clicks -> Smooth scrolling | High |
| 4 | Offline / Restricted Storage Flow | Restricted iframe / private browsing sandbox -> Storage exception simulation -> Graceful fallback | High |
| 5 | Theme Toggle & Contrast Verification | Dark to Light theme switch -> Badge contrast calculation across all statuses -> Persistent preference | Medium |

## Coverage Thresholds
- Tier 1: ≥ 90 test assertions (18 features × 5)
- Tier 2: ≥ 50 boundary / edge case assertions
- Tier 3: ≥ 25 cross-feature interaction assertions
- Tier 4: ≥ 5 comprehensive end-to-end user scenario flows
- Total: ≥ 170 automated test assertions
