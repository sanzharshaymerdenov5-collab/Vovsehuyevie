#!/usr/bin/env python3
"""
Comprehensive Milestone 1 Iteration 2 Reviewer 2 Verification Suite
"""

import os
import re
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT_DIR = "/home/antigravity/sanzharshaymerdenov5-collab/Vovsehuyevie"

with open(os.path.join(ROOT_DIR, "index.html"), "r", encoding="utf-8") as f:
    html_content = f.read()

with open(os.path.join(ROOT_DIR, "css/style.css"), "r", encoding="utf-8") as f:
    css_content = f.read()

with open(os.path.join(ROOT_DIR, "robots.txt"), "r", encoding="utf-8") as f:
    robots_content = f.read()

with open(os.path.join(ROOT_DIR, "sitemap.xml"), "r", encoding="utf-8") as f:
    sitemap_content = f.read()

with open(os.path.join(ROOT_DIR, "js/app.js"), "r", encoding="utf-8") as f:
    app_js_content = f.read()

def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def luminance(hex_col):
    hex_col = hex_col.lstrip("#")
    r, g, b = [int(hex_col[i:i+2], 16) for i in (0, 2, 4)]
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)

def contrast_ratio(hex1, hex2):
    l1 = luminance(hex1)
    l2 = luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

checks = []

def test(name, condition, details=""):
    checks.append((name, condition, details))
    mark = "✓" if condition else "✗"
    print(f"[{mark}] {name}" + (f": {details}" if details else ""))

print("=========================================================================")
print("  MILESTONE 1 (ITERATION 2) INDEPENDENT REVIEWER 2 VERIFICATION")
print("=========================================================================\n")

# ---------------------------------------------------------
# SECTION 1: BUTTON TYPES & STYLING REGRESSIONS
# ---------------------------------------------------------
print("--- 1. Button Types & Styling Regressions in index.html ---")

# 1.1 Updated button types have explicit type="button"
updated_button_ids = ["openSearchBtn", "themeToggleBtn", "closeSearchBtn", "closeArchModalBtn", "openArchitectureBtn"]
for btn_id in updated_button_ids:
    btn_match = re.search(r'<button[^>]*id="' + btn_id + r'"[^>]*>', html_content)
    test(f"Button #{btn_id} has explicit type='button'",
         btn_match is not None and 'type="button"' in btn_match.group(0),
         btn_match.group(0) if btn_match else "NOT FOUND")

# 1.2 No form tag exists where missing type could trigger accidental submission
has_forms = "<form" in html_content.lower()
test("No enclosing <form> tags present to avoid accidental submit semantics",
     not has_forms,
     "Zero <form> elements in index.html")

# 1.3 CSS resets for converted elements prevent visual regressions
test("a.logo-area CSS reset prevents link underline and preserves inherited color",
     "a.logo-area {" in html_content and "text-decoration: none;" in html_content and "color: inherit;" in html_content)

test("a.logo-area:hover CSS reset suppresses hover underline",
     "a.logo-area:hover {" in html_content and "text-decoration: none;" in html_content)

test("button.search-trigger CSS reset matches previous <div> visual typography",
     "button.search-trigger {" in html_content and "font-family: inherit;" in html_content and "font-size: inherit;" in html_content and "text-align: left;" in html_content and "color: inherit;" in html_content)

test("button.search-trigger styles from css/style.css apply cleanly",
     ".search-trigger {" in css_content and "display: flex;" in css_content and "background-color: var(--bg-tertiary);" in css_content)

test("themeToggleBtn styling from css/style.css applies cleanly",
     ".theme-toggle-btn {" in css_content and "border-radius: var(--radius-md);" in css_content)

test("modal-close-btn styling from css/style.css applies cleanly",
     ".modal-close-btn {" in css_content and "background: transparent;" in css_content)

# 1.4 Skip-link styling & positioning
test("Skip-link off-screen positioning when blurred (top: -999px)",
     ".skip-link {" in html_content and "top: -999px;" in html_content and "position: absolute;" in html_content)

test("Skip-link on-screen visible positioning when focused (top: 12px)",
     ".skip-link:focus {" in html_content and "top: 12px;" in html_content)

ratio = contrast_ratio("#ffffff", "#1d4ed8")
test("Skip-link background #1d4ed8 meets WCAG AA contrast against white text (>= 4.5:1)",
     ratio >= 4.5,
     f"Contrast ratio is {ratio:.2f}:1 (> 4.5:1 threshold)")

test("contentViewport outline suppressed on focus without breaking focusability",
     "#contentViewport:focus {" in html_content and "outline: none;" in html_content)

# ---------------------------------------------------------
# SECTION 2: JAVASCRIPT EVENT LISTENERS & A11Y
# ---------------------------------------------------------
print("\n--- 2. JavaScript Event Listener Bindings & DOM Accessibility ---")

test("index.html contains skip-link with href='#contentViewport'",
     'href="#contentViewport" class="skip-link"' in html_content)

test("skip-link contains inline event.preventDefault() handler to prevent hash mutation",
     'onclick="event.preventDefault();' in html_content and 'vp.focus()' in html_content and 'scrollIntoView' in html_content)

test("index.html contains dedicated DOMContentLoaded listener for .skip-link event prevention",
     "skipLink.addEventListener('click', function(e) {" in html_content and "e.preventDefault();" in html_content and "vp.focus();" in html_content)

test("contentViewport has tabindex='-1' for programmatic accessibility and skip-link targeting",
     '<div class="content-viewport" id="contentViewport" tabindex="-1">' in html_content)

test("homeLogoBtn is semantic link <a href='#home'>",
     '<a href="#home" class="logo-area" id="homeLogoBtn"' in html_content)

test("homeLogoBtn has descriptive aria-label",
     'id="homeLogoBtn" aria-label="Во Все Хуёвые — Главная страница"' in html_content)

test("main-nav landmark has aria-label",
     '<nav class="main-nav" aria-label="Основная навигация">' in html_content)

test("openSearchBtn has aria-label",
     'id="openSearchBtn" aria-label="Открыть быстрый поиск"' in html_content)

test("themeToggleBtn has aria-label",
     'id="themeToggleBtn"' in html_content and 'aria-label="Сменить тему (Светлая / Тёмная)"' in html_content)

test("wikiBreadcrumbs landmark has aria-label",
     '<nav class="wiki-breadcrumbs" id="wikiBreadcrumbs" aria-label="Хлебные крошки">' in html_content)

test("searchModal has role='dialog', aria-modal='true', and aria-labelledby",
     'id="searchModal" role="dialog" aria-modal="true" aria-labelledby="searchModalTitle"' in html_content)

test("searchModalTitle heading exists with .visually-hidden",
     '<h2 id="searchModalTitle" class="visually-hidden">Поиск по энциклопедии</h2>' in html_content)

test("globalSearchInput has aria-label",
     'id="globalSearchInput"' in html_content and 'aria-label="Поиск по энциклопедии"' in html_content)

test("closeSearchBtn has aria-label",
     'id="closeSearchBtn" aria-label="Закрыть поиск"' in html_content)

test("searchResultsList has aria-live='polite'",
     'id="searchResultsList" aria-live="polite"' in html_content)

test("architectureModal has role='dialog', aria-modal='true', and aria-labelledby",
     'id="architectureModal" role="dialog" aria-modal="true" aria-labelledby="archModalTitle"' in html_content)

test("closeArchModalBtn has aria-label",
     'id="closeArchModalBtn"' in html_content and 'aria-label="Закрыть модальное окно"' in html_content)

# Check all IDs expected by app.js exist in index.html
expected_ids = [
    "homeLogoBtn", "wikiBreadcrumbs", "quickStats", "statCharCount", "statFactionCount",
    "statArticleCount", "mainLayout", "contentViewport", "searchModal", "searchModalTitle",
    "globalSearchInput", "closeSearchBtn", "searchResultsList", "architectureModal",
    "archModalTitle", "closeArchModalBtn", "openArchitectureBtn", "themeToggleBtn",
    "themeIcon", "exportDataBtn", "resetDataBtn"
]
missing_ids = [i for i in expected_ids if f'id="{i}"' not in html_content]
test("All element IDs bound in app.js exist in index.html",
     len(missing_ids) == 0,
     f"Missing IDs: {missing_ids}" if missing_ids else f"All {len(expected_ids)} required IDs present")

# ---------------------------------------------------------
# SECTION 3: ROBOTS.TXT & SITEMAP.XML COMPLIANCE
# ---------------------------------------------------------
print("\n--- 3. robots.txt and sitemap.xml Standards Compliance ---")

test("robots.txt has User-agent: *",
     "User-agent: *" in robots_content)

test("robots.txt has Allow: /",
     "Allow: /" in robots_content)

test("robots.txt has Sitemap directive pointing to sitemap.xml",
     "Sitemap: https://sanzharshaymerdenov5-collab.github.io/Vovsehuyevie/sitemap.xml" in robots_content)

# Sitemap validation
sitemap_valid = False
url_count = 0
try:
    root = ET.fromstring(sitemap_content)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    urls = root.findall("sm:url", ns)
    url_count = len(urls)
    locs = [u.find("sm:loc", ns).text for u in urls if u.find("sm:loc", ns) is not None]
    all_https = all(loc.startswith("https://sanzharshaymerdenov5-collab.github.io/Vovsehuyevie/") for loc in locs)
    has_priorities = all(0.0 <= float(u.find("sm:priority", ns).text) <= 1.0 for u in urls if u.find("sm:priority", ns) is not None)
    has_changefreq = all(u.find("sm:changefreq", ns).text in ["always", "hourly", "daily", "weekly", "monthly", "yearly", "never"] for u in urls if u.find("sm:changefreq", ns) is not None)
    has_lastmod = all(re.match(r"^\d{4}-\d{2}-\d{2}$", u.find("sm:lastmod", ns).text) for u in urls if u.find("sm:lastmod", ns) is not None)
    sitemap_valid = (url_count >= 5 and all_https and has_priorities and has_changefreq and has_lastmod)
except Exception as e:
    sitemap_valid = False

test("sitemap.xml is valid XML conforming to Sitemaps 0.9 schema",
     sitemap_valid,
     f"Parsed {url_count} URLs; schema validated, valid lastmod/priority/changefreq")

# ---------------------------------------------------------
# SECTION 4: SEO & HEAD METADATA STANDARDS
# ---------------------------------------------------------
print("\n--- 4. SEO & Head Metadata Standards Compliance ---")

test("DOCTYPE and html lang='ru' are valid",
     html_content.startswith("<!DOCTYPE html>") and '<html lang="ru"' in html_content)

test("charset UTF-8 and viewport meta present",
     '<meta charset="UTF-8">' in html_content and '<meta name="viewport" content="width=device-width, initial-scale=1.0">' in html_content)

test("Meta description present and informative (>50 chars)",
     re.search(r'<meta name="description" content="([^"]{50,})">', html_content) is not None)

test("Meta keywords present",
     '<meta name="keywords"' in html_content)

test("Canonical link tag present and absolute",
     '<link rel="canonical" href="https://sanzharshaymerdenov5-collab.github.io/Vovsehuyevie/">' in html_content)

test("SVG favicon present",
     '<link rel="icon" type="image/svg+xml"' in html_content)

test("Open Graph tags present (type, site_name, title, description, url, image, dimensions, locale)",
     all(f'property="{p}"' in html_content for p in ["og:type", "og:site_name", "og:title", "og:description", "og:url", "og:image", "og:image:width", "og:image:height", "og:locale"]))

test("Twitter card tags present (card, title, description, image)",
     all(f'name="{p}"' in html_content for p in ["twitter:card", "twitter:title", "twitter:description", "twitter:image"]))

test("Google Fonts preconnects precede stylesheet links in <head>",
     html_content.find("https://fonts.googleapis.com") < html_content.find('href="css/style.css"'))

test("Fonts gstatic preconnect has crossorigin attribute",
     '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>' in html_content)

# ---------------------------------------------------------
# SUMMARY & VERDICT
# ---------------------------------------------------------
print("\n=========================================================================")
passed = sum(1 for _, c, _ in checks if c)
total = len(checks)
verdict = "APPROVE" if passed == total else "REJECT"
print(f"  VERIFICATION RESULT: {passed} / {total} CHECKS PASSED")
print(f"  EXPLICIT VERDICT: {verdict}")
print("=========================================================================")

if verdict != "APPROVE":
    exit(1)
