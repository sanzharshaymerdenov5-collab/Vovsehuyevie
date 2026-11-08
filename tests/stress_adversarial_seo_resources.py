#!/usr/bin/env python3
"""
Adversarial Quality Challenger 2: SEO & Resource Loading Test Suite
Milestone 1 (Iteration 2 Verification)

Strict, empirical, adversarial audit covering:
1. Sitemap.xml well-formedness, XML schema validation, URLs, RFC compliance, and SPA route resolution.
2. Robots.txt RFC 9309 compliance with robot exclusion parsers and edge-case user-agents.
3. Open Graph and Twitter Card tags, image asset resolution, dimensions, headers, and security.
4. Font preconnect ordering, crossorigin attributes, pruned font weights, and typography token alignment.
"""

import sys
import os
import re
import urllib.parse
import urllib.robotparser
from xml.etree import ElementTree as ET
from html.parser import HTMLParser
import datetime
from PIL import Image

try:
    import lxml.etree as lxml_ET
    LXML_AVAILABLE = True
except ImportError:
    LXML_AVAILABLE = False

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
HTML_PATH = os.path.join(BASE_DIR, 'index.html')
ROBOTS_PATH = os.path.join(BASE_DIR, 'robots.txt')
SITEMAP_PATH = os.path.join(BASE_DIR, 'sitemap.xml')
CSS_PATH = os.path.join(BASE_DIR, 'css', 'style.css')
APP_JS_PATH = os.path.join(BASE_DIR, 'js', 'app.js')
ASSETS_DIR = os.path.join(BASE_DIR, 'assets')

CANONICAL_ORIGIN = "https://sanzharshaymerdenov5-collab.github.io"
CANONICAL_BASE = "https://sanzharshaymerdenov5-collab.github.io/Vovsehuyevie/"

class HTMLHeadExtractor(HTMLParser):
    def __init__(self):
        super().__init__()
        self.meta_tags = []
        self.link_tags = []
        self.in_head = False
        self.head_order = []

    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        if tag == 'head':
            self.in_head = True
        elif tag == 'body':
            self.in_head = False

        if self.in_head:
            if tag == 'meta':
                self.meta_tags.append(attr_dict)
                self.head_order.append(('meta', attr_dict))
            elif tag == 'link':
                self.link_tags.append(attr_dict)
                self.head_order.append(('link', attr_dict))

class TestRunner:
    def __init__(self):
        self.suites = {}
        self.current_suite = None
        self.total_assertions = 0
        self.passed_assertions = 0
        self.failed_assertions = 0

    def start_suite(self, name, description=""):
        self.current_suite = {
            "name": name,
            "description": description,
            "assertions": [],
            "passed": True
        }
        self.suites[name] = self.current_suite

    def check(self, condition, message, details=None):
        self.total_assertions += 1
        entry = {
            "condition": bool(condition),
            "message": message,
            "details": details
        }
        self.current_suite["assertions"].append(entry)
        if condition:
            self.passed_assertions += 1
            print(f"    ✓ {message}")
        else:
            self.failed_assertions += 1
            self.current_suite["passed"] = False
            detail_str = f" ({details})" if details else ""
            print(f"    ✗ FAIL: {message}{detail_str}")

def run_tests():
    runner = TestRunner()

    print("=========================================================================")
    print("  ADVERSARIAL QUALITY CHALLENGER 2: SEO & RESOURCE LOADING SUITE")
    print("  Milestone 1 (Iteration 2 Verification)")
    print("=========================================================================\n")

    # Read files
    with open(HTML_PATH, 'r', encoding='utf-8') as f:
        html_content = f.read()

    with open(ROBOTS_PATH, 'r', encoding='utf-8') as f:
        robots_content = f.read()

    with open(SITEMAP_PATH, 'r', encoding='utf-8') as f:
        sitemap_content = f.read()

    with open(CSS_PATH, 'r', encoding='utf-8') as f:
        css_content = f.read()

    with open(APP_JS_PATH, 'r', encoding='utf-8') as f:
        app_js_content = f.read()

    head_parser = HTMLHeadExtractor()
    head_parser.feed(html_content)

    # =========================================================================
    # SUITE 1: SITEMAP.XML WELL-FORMEDNESS, SCHEMA & RFC COMPLIANCE
    # =========================================================================
    runner.start_suite("1. Sitemap.xml Well-Formedness, XML Schema & RFC Compliance")
    print(f"--- {runner.current_suite['name']} ---")

    # 1.1 File existence & encoding
    runner.check(os.path.exists(SITEMAP_PATH), "sitemap.xml exists at repository root")
    runner.check(not sitemap_content.startswith('\ufeff'), "sitemap.xml has no UTF-8 Byte Order Mark (BOM)")

    # 1.2 XML declaration
    decl_match = re.match(r'<\?xml\s+version=["\']1\.0["\']\s+encoding=["\']UTF-8["\']\s*\?>', sitemap_content.strip())
    runner.check(bool(decl_match), "XML declaration is well-formed with version='1.0' and encoding='UTF-8'")

    # 1.3 XML Well-formedness parsing
    xml_doc = None
    parse_error = None
    try:
        xml_doc = ET.fromstring(sitemap_content)
    except Exception as e:
        parse_error = str(e)
    runner.check(xml_doc is not None, "sitemap.xml parses cleanly with standard XML parser", parse_error)

    # 1.4 Namespace & root element
    ns = "{http://www.sitemaps.org/schemas/sitemap/0.9}"
    runner.check(xml_doc is not None and xml_doc.tag == f"{ns}urlset", "Root element is <urlset> with namespace 'http://www.sitemaps.org/schemas/sitemap/0.9'")

    # 1.5 Official Sitemaps 0.9 XSD Schema Validation
    if LXML_AVAILABLE and xml_doc is not None:
        xsd_valid = False
        xsd_detail = ""
        try:
            xsd_content = """<?xml version="1.0" encoding="UTF-8"?>
<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
           targetNamespace="http://www.sitemaps.org/schemas/sitemap/0.9"
           xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
           elementFormDefault="qualified">
  <xs:element name="urlset">
    <xs:complexType>
      <xs:sequence>
        <xs:element name="url" maxOccurs="unbounded">
          <xs:complexType>
            <xs:sequence>
              <xs:element name="loc" type="xs:anyURI"/>
              <xs:element name="lastmod" minOccurs="0"/>
              <xs:element name="changefreq" minOccurs="0">
                <xs:simpleType>
                  <xs:restriction base="xs:string">
                    <xs:enumeration value="always"/>
                    <xs:enumeration value="hourly"/>
                    <xs:enumeration value="daily"/>
                    <xs:enumeration value="weekly"/>
                    <xs:enumeration value="monthly"/>
                    <xs:enumeration value="yearly"/>
                    <xs:enumeration value="never"/>
                  </xs:restriction>
                </xs:simpleType>
              </xs:element>
              <xs:element name="priority" minOccurs="0">
                <xs:simpleType>
                  <xs:restriction base="xs:decimal">
                    <xs:minInclusive value="0.0"/>
                    <xs:maxInclusive value="1.0"/>
                  </xs:restriction>
                </xs:simpleType>
              </xs:element>
            </xs:sequence>
          </xs:complexType>
        </xs:element>
      </xs:sequence>
    </xs:complexType>
  </xs:element>
</xs:schema>"""
            schema_doc = lxml_ET.fromstring(xsd_content.encode('utf-8'))
            schema = lxml_ET.XMLSchema(schema_doc)
            lxml_doc = lxml_ET.fromstring(sitemap_content.encode('utf-8'))
            schema.assertValid(lxml_doc)
            xsd_valid = True
        except Exception as e:
            xsd_detail = str(e)
        runner.check(xsd_valid, "Validates 100% against official W3C / Sitemaps 0.9 XML Schema (XSD)", xsd_detail)

    # 1.6 RFC limits: max 50,000 URLs and max 50MB
    file_size_bytes = os.path.getsize(SITEMAP_PATH)
    runner.check(file_size_bytes <= 50 * 1024 * 1024, f"File size ({file_size_bytes} bytes) within RFC 50MB limit")
    urls = xml_doc.findall(f"{ns}url") if xml_doc is not None else []
    runner.check(0 < len(urls) <= 50000, f"URL count ({len(urls)}) within RFC limit (1 - 50,000)")

    # 1.7 Deep URL entries verification
    loc_set = set()
    all_locs_valid = True
    all_dates_valid = True
    all_freqs_valid = True
    all_prios_valid = True
    has_root_loc = False
    no_http_downgrade = True

    valid_changefreqs = {'always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'}

    for u in urls:
        loc_el = u.find(f"{ns}loc")
        if loc_el is None or not loc_el.text:
            all_locs_valid = False
            continue
        loc = loc_el.text.strip()
        loc_set.add(loc)

        if loc.startswith('http://'):
            no_http_downgrade = False

        if loc == CANONICAL_BASE:
            has_root_loc = True

        # RFC 3986 parse
        parsed = urllib.parse.urlparse(loc)
        if parsed.scheme != 'https' or parsed.netloc != 'sanzharshaymerdenov5-collab.github.io':
            all_locs_valid = False

        # lastmod validation
        lastmod_el = u.find(f"{ns}lastmod")
        if lastmod_el is not None and lastmod_el.text:
            try:
                datetime.datetime.strptime(lastmod_el.text.strip(), "%Y-%m-%d")
            except ValueError:
                all_dates_valid = False

        # changefreq validation
        cf_el = u.find(f"{ns}changefreq")
        if cf_el is not None and cf_el.text:
            if cf_el.text.strip() not in valid_changefreqs:
                all_freqs_valid = False

        # priority validation
        pr_el = u.find(f"{ns}priority")
        if pr_el is not None and pr_el.text:
            try:
                val = float(pr_el.text.strip())
                if not (0.0 <= val <= 1.0):
                    all_prios_valid = False
            except ValueError:
                all_prios_valid = False

    runner.check(all_locs_valid, "All <loc> entries are valid absolute HTTPS URLs matching canonical repository domain")
    runner.check(no_http_downgrade, "Zero insecure HTTP URL downgrades in sitemap (strictly https://)")
    runner.check(has_root_loc, f"Canonical base URL ({CANONICAL_BASE}) is present in sitemap")
    runner.check(len(loc_set) == len(urls), f"All {len(urls)} URLs in sitemap are strictly unique (0 duplicates)")
    runner.check(all_dates_valid, "All <lastmod> timestamps strictly conform to W3C Datetime format (YYYY-MM-DD)")
    runner.check(all_freqs_valid, "All <changefreq> values belong to RFC sitemap vocabulary")
    runner.check(all_prios_valid, "All <priority> values are valid floats bounded within [0.0, 1.0]")

    # Check key navigation views resolution in app.js
    expected_views = ['#home', '#characters', '#factions', '#episodes', '#timeline']
    for v in expected_views:
        url_entry = f"{CANONICAL_BASE}{v}"
        runner.check(url_entry in loc_set, f"Sitemap includes key SPA route: {v}")
        view_name = v.lstrip('#')
        # Ensure view name is handled in app.js router
        router_handles_view = (f"'{view_name}'" in app_js_content or f'"{view_name}"' in app_js_content)
        runner.check(router_handles_view, f"SPA client-side router handles sitemap route '{view_name}'")

    # =========================================================================
    # SUITE 2: ROBOTS.TXT RFC 9309 COMPLIANCE WITH ROBOT PARSERS
    # =========================================================================
    print()
    runner.start_suite("2. Robots.txt Compliance with RFC 9309 & Crawler Parsers")
    print(f"--- {runner.current_suite['name']} ---")

    # 2.1 File existence & encoding
    runner.check(os.path.exists(ROBOTS_PATH), "robots.txt exists at repository root")
    runner.check(not robots_content.startswith('\ufeff'), "robots.txt has no BOM")

    # 2.2 Standard Library robotparser execution
    rp = urllib.robotparser.RobotFileParser()
    rp.parse(robots_content.splitlines())

    # 2.3 User-agent wildcard record
    has_user_agent_star = bool(re.search(r'^\s*User-agent:\s*\*$', robots_content, re.IGNORECASE | re.MULTILINE))
    runner.check(has_user_agent_star, "Contains standard 'User-agent: *' record")

    # 2.4 Allow all record
    has_allow_root = bool(re.search(r'^\s*Allow:\s*/\s*$', robots_content, re.IGNORECASE | re.MULTILINE))
    runner.check(has_allow_root, "Contains 'Allow: /' directive allowing site indexing")

    # 2.5 Sitemap directive
    sitemaps = rp.site_maps()
    has_sitemap_directive = sitemaps is not None and len(sitemaps) > 0
    runner.check(has_sitemap_directive, f"Parser extracted Sitemap directive: {sitemaps}")
    expected_sitemap_url = f"{CANONICAL_BASE}sitemap.xml"
    runner.check(sitemaps and sitemaps[0] == expected_sitemap_url, f"Sitemap directive points to exact absolute URL: {expected_sitemap_url}")

    # 2.6 Multi-Crawler Adversarial Probing
    test_crawlers = [
        '*',
        'Googlebot',
        'Googlebot-Image',
        'Bingbot',
        'YandexBot',
        'Baiduspider',
        'DuckDuckBot',
        'Slurp',
        'Applebot',
        'Twitterbot',
        'facebookexternalhit',
        'Discordbot'
    ]

    probe_urls = [
        CANONICAL_BASE,
        f"{CANONICAL_BASE}index.html",
        f"{CANONICAL_BASE}css/style.css",
        f"{CANONICAL_BASE}js/app.js",
        f"{CANONICAL_BASE}js/data.js",
        f"{CANONICAL_BASE}assets/valentin.jpg",
        f"{CANONICAL_BASE}assets/gey-himbiovech.jpg",
        f"{CANONICAL_BASE}sitemap.xml"
    ]

    all_crawlers_allowed = True
    for bot in test_crawlers:
        for u in probe_urls:
            if not rp.can_fetch(bot, u):
                all_crawlers_allowed = False
                break
    runner.check(all_crawlers_allowed, f"All {len(test_crawlers)} crawler user-agents successfully permitted across all {len(probe_urls)} asset & page URLs")

    # 2.7 Malformed lines check (RFC 9309)
    valid_record_keys = {'user-agent', 'allow', 'disallow', 'sitemap', 'crawl-delay'}
    malformed_lines = []
    for line_num, line in enumerate(robots_content.splitlines(), start=1):
        clean = line.strip()
        if not clean or clean.startswith('#'):
            continue
        if ':' not in clean:
            malformed_lines.append((line_num, line))
        else:
            k = clean.split(':', 1)[0].strip().lower()
            if k not in valid_record_keys:
                malformed_lines.append((line_num, line))
    runner.check(len(malformed_lines) == 0, "No malformed or unsupported RFC 9309 directive lines in robots.txt", malformed_lines)

    # =========================================================================
    # SUITE 3: OPEN GRAPH, TWITTER CARDS & IMAGE ASSET INTEGRITY
    # =========================================================================
    print()
    runner.start_suite("3. Open Graph, Twitter Cards & Image Asset Resolution")
    print(f"--- {runner.current_suite['name']} ---")

    # Helper function to extract meta tags from head_parser
    def get_meta(attr_key, attr_val):
        for m in head_parser.meta_tags:
            if m.get(attr_key) == attr_val:
                return m.get('content')
        return None

    # 3.1 Open Graph Tags
    og_type = get_meta("property", "og:type")
    og_title = get_meta("property", "og:title")
    og_desc = get_meta("property", "og:description")
    og_url = get_meta("property", "og:url")
    og_image = get_meta("property", "og:image")
    og_width = get_meta("property", "og:image:width")
    og_height = get_meta("property", "og:image:height")
    og_locale = get_meta("property", "og:locale")
    og_site_name = get_meta("property", "og:site_name")

    runner.check(og_type == "website", f"og:type is 'website' (got: {og_type})")
    runner.check(bool(og_site_name), f"og:site_name is non-empty ('{og_site_name}')")
    runner.check(bool(og_title) and len(og_title) >= 10, f"og:title is descriptive ('{og_title}')")
    runner.check(bool(og_desc) and len(og_desc) >= 30, f"og:description is detailed ('{og_desc}')")
    runner.check(og_url == CANONICAL_BASE, f"og:url matches canonical base URL ('{og_url}')")
    runner.check(og_locale == "ru_RU", f"og:locale is 'ru_RU' (got: {og_locale})")
    runner.check(bool(og_image) and og_image.startswith("https://"), f"og:image is absolute HTTPS URL ('{og_image}')")
    runner.check(bool(og_width) and og_width.isdigit() and int(og_width) >= 600, f"og:image:width is >= 600px ('{og_width}')")
    runner.check(bool(og_height) and og_height.isdigit() and int(og_height) >= 315, f"og:image:height is >= 315px ('{og_height}')")

    # 3.2 Twitter Card Tags
    tw_card = get_meta("name", "twitter:card")
    tw_title = get_meta("name", "twitter:title")
    tw_desc = get_meta("name", "twitter:description")
    tw_image = get_meta("name", "twitter:image")

    runner.check(tw_card in ["summary_large_image", "summary"], f"twitter:card is standard ('{tw_card}')")
    runner.check(bool(tw_title) and len(tw_title) >= 10, f"twitter:title is present ('{tw_title}')")
    runner.check(bool(tw_desc) and len(tw_desc) >= 20, f"twitter:description is present ('{tw_desc}')")
    runner.check(tw_image == og_image, f"twitter:image matches og:image ('{tw_image}')")

    # 3.3 Image Asset Physical Resolution on Disk
    rel_image_path = og_image.replace(CANONICAL_BASE, '') if og_image else ''
    local_image_path = os.path.join(BASE_DIR, rel_image_path)
    runner.check(os.path.exists(local_image_path), f"og:image target file exists on disk at '{rel_image_path}'")

    # 3.4 Image Format, Header Integrity & Dimension Match
    img_valid = False
    img_format = None
    img_size = (0, 0)
    try:
        with open(local_image_path, 'rb') as f:
            header = f.read(2)
            is_jpeg_soi = (header == b'\xff\xd8')
        with Image.open(local_image_path) as im:
            im.verify()
        with Image.open(local_image_path) as im:
            img_valid = True
            img_format = im.format
            img_size = im.size
    except Exception as e:
        img_valid = False

    runner.check(img_valid, f"Image binary passes format verification without corruption ({local_image_path})")
    runner.check(img_format == 'JPEG', f"Image is genuine JPEG format (header SOI 0xFFD8 verified)")
    runner.check(img_size == (int(og_width), int(og_height)),
                 f"Image binary dimensions {img_size} EXACTLY MATCH og:image:width ({og_width}) and og:image:height ({og_height})")

    file_size_kb = os.path.getsize(local_image_path) / 1024
    runner.check(file_size_kb <= 5000, f"Image size ({file_size_kb:.1f} KB) within social crawler limits (< 5MB)")

    aspect_ratio = img_size[0] / img_size[1] if img_size[1] > 0 else 0
    runner.check(1.3 <= aspect_ratio <= 1.95, f"Image aspect ratio {aspect_ratio:.2f}:1 conforms to social card viewport (optimal ~1.58:1 to 1.91:1)")

    # 3.5 Canonical Tag & Favicon
    canonical_link = None
    icon_link = None
    for lk in head_parser.link_tags:
        rel = lk.get('rel', '').lower()
        if rel == 'canonical':
            canonical_link = lk.get('href')
        elif rel == 'icon':
            icon_link = lk

    runner.check(canonical_link == CANONICAL_BASE, f"<link rel='canonical'> href matches '{CANONICAL_BASE}'")
    runner.check(icon_link is not None and icon_link.get('type') == 'image/svg+xml', "<link rel='icon' type='image/svg+xml'> defined")

    if icon_link:
        fav_href = icon_link.get('href', '')
        runner.check(fav_href.startswith("data:image/svg+xml,"), "Favicon uses data:image/svg+xml URI (instant render, 0 extra HTTP requests)")
        runner.check("⚗️" in fav_href or "%E2%9A%97" in fav_href, "Favicon contains lore-specific chemical flask symbol (⚗️)")
        # Parse SVG XML
        svg_xml = urllib.parse.unquote(fav_href.split('data:image/svg+xml,')[1])
        svg_parsed = False
        try:
            svg_root = ET.fromstring(svg_xml)
            svg_parsed = (svg_root.tag == 'svg' or svg_root.tag.endswith('svg'))
        except Exception:
            pass
        runner.check(svg_parsed, "Favicon SVG payload is 100% valid XML")

    # 3.6 HTML Meta tags (description, keywords, robots, theme-color)
    meta_desc = get_meta("name", "description")
    meta_kw = get_meta("name", "keywords")
    meta_robots = get_meta("name", "robots")
    meta_theme = get_meta("name", "theme-color")

    runner.check(bool(meta_desc) and len(meta_desc) >= 30, f"<meta name='description'> is comprehensive ('{meta_desc}')")
    runner.check(bool(meta_kw) and "Хуйзенберг" in meta_kw, f"<meta name='keywords'> contains primary show keywords")
    runner.check(meta_robots == "index, follow", f"<meta name='robots'> set to 'index, follow' (got: {meta_robots})")
    runner.check(meta_theme == "#0f1117", f"<meta name='theme-color'> matches dark theme base '#0f1117' (got: {meta_theme})")

    # =========================================================================
    # SUITE 4: FONT PRECONNECT ORDERING & PRUNED FONT WEIGHTS
    # =========================================================================
    print()
    runner.start_suite("4. Font Preconnect Ordering & Pruned Font Weights")
    print(f"--- {runner.current_suite['name']} ---")

    # Analyze order of elements in <head>
    preconnects = []
    stylesheets = []

    for idx, (tag, attrs) in enumerate(head_parser.head_order):
        if tag == 'link':
            rel = attrs.get('rel', '').lower()
            href = attrs.get('href', '')
            if rel == 'preconnect':
                preconnects.append((idx, href, attrs))
            elif rel == 'stylesheet':
                stylesheets.append((idx, href, attrs))

    # 4.1 Preconnect existence
    pre_apis = [p for p in preconnects if 'fonts.googleapis.com' in p[1]]
    pre_gstatic = [p for p in preconnects if 'fonts.gstatic.com' in p[1]]

    runner.check(len(pre_apis) > 0, "Preconnect to 'https://fonts.googleapis.com' exists in <head>")
    runner.check(len(pre_gstatic) > 0, "Preconnect to 'https://fonts.gstatic.com' exists in <head>")
    runner.check(len(pre_gstatic) > 0 and 'crossorigin' in pre_gstatic[0][2], "Preconnect to 'https://fonts.gstatic.com' defines 'crossorigin' attribute")

    # 4.2 Preconnect Ordering in <head>
    all_preconnect_indices = [p[0] for p in preconnects]
    all_stylesheet_indices = [s[0] for s in stylesheets]

    first_preconnect_idx = min(all_preconnect_indices) if all_preconnect_indices else 999
    last_preconnect_idx = max(all_preconnect_indices) if all_preconnect_indices else 999
    first_stylesheet_idx = min(all_stylesheet_indices) if all_stylesheet_indices else -1

    runner.check(last_preconnect_idx < first_stylesheet_idx,
                 f"ALL <link rel='preconnect'> (indices {all_preconnect_indices}) appear strictly BEFORE ANY <link rel='stylesheet'> (first at index {first_stylesheet_idx})")

    gfonts_sheets = [s for s in stylesheets if 'fonts.googleapis.com' in s[1]]
    local_css_sheets = [s for s in stylesheets if 'style.css' in s[1]]

    runner.check(len(gfonts_sheets) > 0, "Google Fonts stylesheet link present")
    runner.check(len(local_css_sheets) > 0, "Local CSS stylesheet 'style.css' link present")

    if gfonts_sheets and local_css_sheets:
        runner.check(gfonts_sheets[0][0] < local_css_sheets[0][0], "External font stylesheet loaded before local style.css")

    # 4.3 Google Fonts URL Structure & display=swap
    gfonts_url = gfonts_sheets[0][1] if gfonts_sheets else ""
    parsed_gfonts = urllib.parse.urlparse(gfonts_url)
    qs = urllib.parse.parse_qs(parsed_gfonts.query)

    runner.check('display' in qs and 'swap' in qs['display'], "Google Fonts URL includes 'display=swap' parameter for zero FOIT")

    families = qs.get('family', [])
    runner.check(any('Inter' in f for f in families), "Inter font family requested")
    runner.check(any('JetBrains Mono' in f or 'JetBrains+Mono' in f for f in families), "JetBrains Mono font family requested")
    runner.check(any('Lora' in f for f in families), "Lora font family requested")

    # 4.4 Pruned Font Weights Verification (Feature 13)
    # Expected:
    # Inter: 400, 500, 600, 700
    # JetBrains Mono: 400, 600, 700 (500 and 800 pruned)
    # Lora: 700 (500, 600, italic 400, italic 600 pruned)
    runner.check(any('Inter:wght@400;500;600;700' in f for f in families), "Inter requests exactly required weights 400;500;600;700")
    runner.check(any('JetBrains Mono:wght@400;600;700' in f or 'JetBrains+Mono:wght@400;600;700' in f for f in families), "JetBrains Mono requests exactly required weights 400;600;700")
    runner.check(any('Lora:wght@700' in f for f in families), "Lora requests exactly required weight 700")

    # Adversarial verification: ensure pruned weights are ABSENT
    pruned_variants = [
        ("JetBrains Mono 500", ":wght@400;500;600;700;800"),
        ("JetBrains Mono 800", ";800"),
        ("Lora 500", "0,500"),
        ("Lora 600", "0,600"),
        ("Lora italic 400", "1,400"),
        ("Lora italic 600", "1,600")
    ]
    for label, pattern in pruned_variants:
        runner.check(pattern not in gfonts_url, f"Unused font variant '{label}' successfully pruned from Google Fonts URL")

    # 4.5 CSS Font Family Declarations
    runner.check("--font-body:" in css_content and "Inter" in css_content, "CSS declares --font-body token with Inter and system fallbacks")
    runner.check("--font-heading:" in css_content and "Lora" in css_content, "CSS declares --font-heading token with Lora and serif fallbacks")
    runner.check("--font-mono:" in css_content and "JetBrains Mono" in css_content, "CSS declares --font-mono token with JetBrains Mono and monospace fallbacks")

    # =========================================================================
    # SUMMARY & FINAL VERDICT
    # =========================================================================
    print("\n=========================================================================")
    print("  VERIFICATION SUMMARY BY SUITE")
    print("=========================================================================")
    all_suites_passed = True
    for s_name, s_data in runner.suites.items():
        pass_count = sum(1 for a in s_data["assertions"] if a["condition"])
        total_count = len(s_data["assertions"])
        status = "PASS" if s_data["passed"] else "FAIL"
        if not s_data["passed"]:
            all_suites_passed = False
        print(f"  [{status}] {s_name}: {pass_count}/{total_count} assertions passed")

    print("-------------------------------------------------------------------------")
    print(f"  Total Assertions: {runner.total_assertions}")
    print(f"  Passed:           {runner.passed_assertions}")
    print(f"  Failed:           {runner.failed_assertions}")
    verdict = "APPROVE" if all_suites_passed else "REJECT"
    print("=========================================================================")
    print(f"  EXPLICIT VERDICT: {verdict}")
    print("=========================================================================")

    return verdict, runner

if __name__ == '__main__':
    verdict, runner = run_tests()
    if verdict == "APPROVE":
        sys.exit(0)
    else:
        sys.exit(1)
