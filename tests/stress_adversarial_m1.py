import re
import sys
from html.parser import HTMLParser
from collections import Counter

html = open("index.html", "r", encoding="utf-8").read()
css = open("css/style.css", "r", encoding="utf-8").read()
app_js = open("js/app.js", "r", encoding="utf-8").read()

results = {
    "suite_1_tab_order": {"passed": True, "details": []},
    "suite_2_skip_link": {"passed": True, "details": []},
    "suite_3_semantics_aria": {"passed": True, "details": []},
    "suite_4_dom_integrity": {"passed": True, "details": []}
}

# --- SUITE 1: TAB ORDER ---
class TabOrderParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.elements = []
    def handle_starttag(self, tag, attrs):
        attr_dict = dict(attrs)
        tabindex = attr_dict.get("tabindex")
        is_focusable = False
        if tag == "a" and "href" in attr_dict:
            is_focusable = True
        elif tag in ["button", "input", "select", "textarea"]:
            if "disabled" not in attr_dict and attr_dict.get("type") != "hidden":
                is_focusable = True
        elif tabindex is not None:
            try:
                if int(tabindex) >= 0:
                    is_focusable = True
            except ValueError:
                pass
        if is_focusable:
            self.elements.append({"tag": tag, "id": attr_dict.get("id"), "class": attr_dict.get("class", ""), "attrs": attr_dict})

top_p = TabOrderParser()
top_p.feed(html)

expected_top_order = [
    ("a", "skip-link"),
    ("a", "homeLogoBtn"),
    ("button", "nav-btn active"),
    ("button", "nav-btn"),
    ("button", "nav-btn"),
    ("button", "nav-btn"),
    ("button", "nav-btn"),
    ("button", "openSearchBtn"),
    ("button", "themeToggleBtn")
]

tab_order_ok = True
for idx, (exp_tag, exp_id_or_class) in enumerate(expected_top_order):
    actual = top_p.elements[idx]
    tag_match = (actual["tag"] == exp_tag)
    id_or_class_match = (exp_id_or_class == actual.get("id") or exp_id_or_class in actual.get("class", ""))
    match = tag_match and id_or_class_match
    status = "PASS" if match else "FAIL"
    act_tag = actual["tag"]
    act_id = actual["id"]
    act_cls = actual["class"]
    results["suite_1_tab_order"]["details"].append(
        f"Position {idx+1}: expected <{exp_tag} ...{exp_id_or_class}...>, got <{act_tag} id=\"{act_id}\" class=\"{act_cls}\"> -> {status}"
    )
    if not match:
        tab_order_ok = False
results["suite_1_tab_order"]["passed"] = tab_order_ok

# Positive tabindex check
positive_tabindexes = [el for el in top_p.elements if el["attrs"].get("tabindex") and int(el["attrs"].get("tabindex", 0)) > 0]
if positive_tabindexes:
    results["suite_1_tab_order"]["passed"] = False
    results["suite_1_tab_order"]["details"].append(f"Discovered positive tabindexes: {positive_tabindexes}")
else:
    results["suite_1_tab_order"]["details"].append("No disruptive positive tabindexes found (natural DOM tab order maintained).")

# --- SUITE 2: SKIP LINK ---
class SkipLinkParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip_link = None
        self.viewport = None
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if tag == "a" and "skip-link" in d.get("class", ""):
            self.skip_link = d
        if d.get("id") == "contentViewport":
            self.viewport = (tag, d)

sp = SkipLinkParser()
sp.feed(html)

if sp.skip_link:
    target = sp.skip_link.get("href", "")
    if target == "#contentViewport":
        results["suite_2_skip_link"]["details"].append("Target attribute is href=\"#contentViewport\": PASS")
    else:
        results["suite_2_skip_link"]["passed"] = False
        results["suite_2_skip_link"]["details"].append(f"Target is {target}: FAIL (expected #contentViewport)")
else:
    results["suite_2_skip_link"]["passed"] = False
    results["suite_2_skip_link"]["details"].append("FAIL: .skip-link element not found in DOM")

if sp.viewport:
    tag, attrs = sp.viewport
    has_tabindex = ("tabindex" in attrs)
    results["suite_2_skip_link"]["details"].append(f"Target element <{tag} id=\"contentViewport\"> exists: PASS")
    if has_tabindex and attrs["tabindex"] == "-1":
        results["suite_2_skip_link"]["details"].append("Target element has tabindex=\"-1\": PASS")
    else:
        results["suite_2_skip_link"]["passed"] = False
        results["suite_2_skip_link"]["details"].append("DEFECT: Target element <div id=\"contentViewport\"> is missing tabindex=\"-1\". Non-interactive DOM elements cannot receive programmatic focus or standard anchor keyboard focus without tabindex=\"-1\"!")
else:
    results["suite_2_skip_link"]["passed"] = False
    results["suite_2_skip_link"]["details"].append("FAIL: Target element #contentViewport does not exist in DOM")

# CSS check
skip_blurred = re.search(r"\.skip-link\s*\{([^}]+)\}", html)
skip_focused = re.search(r"\.skip-link:focus\s*\{([^}]+)\}", html)
if skip_blurred and "top: -999px" in skip_blurred.group(1):
    results["suite_2_skip_link"]["details"].append("Skip link off-screen when blurred (top: -999px): PASS")
else:
    results["suite_2_skip_link"]["passed"] = False
    results["suite_2_skip_link"]["details"].append("FAIL: .skip-link missing off-screen styling when blurred")

if skip_focused and "top: 12px" in skip_focused.group(1):
    results["suite_2_skip_link"]["details"].append("Skip link visible on :focus (top: 12px): PASS")
else:
    results["suite_2_skip_link"]["passed"] = False
    results["suite_2_skip_link"]["details"].append("FAIL: .skip-link missing :focus styling")

# Behavioral / Router collision check:
# SPA router collision is prevented via event.preventDefault() so hash does NOT become #contentViewport
has_prevent_default_inline = "event.preventDefault()" in html and "contentViewport" in html
has_prevent_default_listener = "skipLink.addEventListener('click'" in html and "e.preventDefault()" in html
if has_prevent_default_inline or has_prevent_default_listener:
    results["suite_2_skip_link"]["details"].append("Router collision prevention (event.preventDefault() intercepts click, keeping hash untouched and preventing view reset): PASS")
else:
    results["suite_2_skip_link"]["passed"] = False
    results["suite_2_skip_link"]["details"].append("DEFECT: Missing event.preventDefault() on skip-link activation. Hash could change to #contentViewport and reset view.")

# Focus shift verification:
has_focus_call = "vp.focus()" in html or "focus()" in html
if has_focus_call and sp.viewport and sp.viewport[1].get("tabindex") == "-1":
    results["suite_2_skip_link"]["details"].append("Focus cleanly transferred to #contentViewport (tabindex=\"-1\" enables programmatic focus): PASS")
else:
    results["suite_2_skip_link"]["passed"] = False
    results["suite_2_skip_link"]["details"].append("DEFECT: Keyboard focus is not cleanly shifted to #contentViewport")


# --- SUITE 3: SEMANTICS & ARIA ---
class ButtonSemanticsParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.buttons = {}
    def handle_starttag(self, tag, attrs):
        if tag == "button":
            d = dict(attrs)
            bid = d.get("id")
            if bid: self.buttons[bid] = d

bp = ButtonSemanticsParser()
bp.feed(html)

buttons_to_verify = [
    ("openSearchBtn", "Быстрый поиск trigger"),
    ("themeToggleBtn", "Переключатель темы"),
    ("closeSearchBtn", "Закрытие модального окна поиска"),
    ("closeArchModalBtn", "Закрытие модального окна архитектуры"),
    ("closeArchModalBtn2", "Вторичная кнопка закрытия модалки архитектуры"),
    ("copyArchPlanBtn", "Кнопка копирования плана архитектуры"),
    ("openArchitectureBtn", "Кнопка открытия архитектуры в футере")
]

for bid, label in buttons_to_verify:
    btn = bp.buttons.get(bid)
    if btn and btn.get("type") == "button":
        results["suite_3_semantics_aria"]["details"].append(f"#{bid} ({label}) has type=\"button\": PASS")
    else:
        results["suite_3_semantics_aria"]["passed"] = False
        results["suite_3_semantics_aria"]["details"].append(f"DEFECT: #{bid} ({label}) missing explicit type=\"button\"")

# Modal ARIA
search_modal_role = "id=\"searchModal\"" in html and "role=\"dialog\"" in html and "aria-modal=\"true\"" in html and "aria-labelledby=\"searchModalTitle\"" in html
results["suite_3_semantics_aria"]["details"].append("searchModal ARIA dialog + aria-modal + aria-labelledby: " + ("PASS" if search_modal_role else "FAIL"))
if not search_modal_role: results["suite_3_semantics_aria"]["passed"] = False

arch_modal_role = "id=\"architectureModal\"" in html and "role=\"dialog\"" in html and "aria-modal=\"true\"" in html and "aria-labelledby=\"archModalTitle\"" in html
results["suite_3_semantics_aria"]["details"].append("architectureModal ARIA dialog + aria-modal + aria-labelledby: " + ("PASS" if arch_modal_role else "FAIL"))
if not arch_modal_role: results["suite_3_semantics_aria"]["passed"] = False

# Live regions & Search input
search_live = "id=\"searchResultsList\"" in html and "aria-live=\"polite\"" in html
results["suite_3_semantics_aria"]["details"].append("searchResultsList has aria-live=\"polite\": " + ("PASS" if search_live else "FAIL"))
if not search_live: results["suite_3_semantics_aria"]["passed"] = False

search_input_aria = "id=\"globalSearchInput\"" in html and "aria-label=" in html.split("id=\"globalSearchInput\"")[1].split(">")[0]
results["suite_3_semantics_aria"]["details"].append("globalSearchInput has aria-label: " + ("PASS" if search_input_aria else "FAIL"))
if not search_input_aria: results["suite_3_semantics_aria"]["passed"] = False

# Screen reader labels on icon buttons
theme_aria = "id=\"themeToggleBtn\"" in html and "aria-label=" in html.split("id=\"themeToggleBtn\"")[1].split(">")[0]
results["suite_3_semantics_aria"]["details"].append("themeToggleBtn has aria-label: " + ("PASS" if theme_aria else "FAIL"))
if not theme_aria: results["suite_3_semantics_aria"]["passed"] = False

close_search_aria = "id=\"closeSearchBtn\"" in html and "aria-label=" in html.split("id=\"closeSearchBtn\"")[1].split(">")[0]
results["suite_3_semantics_aria"]["details"].append("closeSearchBtn has aria-label: " + ("PASS" if close_search_aria else "FAIL"))
if not close_search_aria: results["suite_3_semantics_aria"]["passed"] = False

close_arch_aria = "id=\"closeArchModalBtn\"" in html and "aria-label=" in html.split("id=\"closeArchModalBtn\"")[1].split(">")[0]
results["suite_3_semantics_aria"]["details"].append("closeArchModalBtn has aria-label: " + ("PASS" if close_arch_aria else "FAIL"))
if not close_arch_aria: results["suite_3_semantics_aria"]["passed"] = False

# Note on modal focus trap: M3 responsibility
results["suite_3_semantics_aria"]["details"].append("Modal focus trap (JS Tab cycle): Handled in Milestone 3 (JavaScript Architecture)")

# --- SUITE 4: DOM INTEGRITY ---
class StrictValidator(HTMLParser):
    def __init__(self):
        super().__init__()
        self.stack = []
        self.errors = []
        self.all_ids = []
        self.void_tags = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
    def handle_starttag(self, tag, attrs):
        d = dict(attrs)
        if "id" in d: self.all_ids.append(d["id"])
        if tag not in self.void_tags:
            self.stack.append((tag, self.getpos()))
    def handle_endtag(self, tag):
        if tag in self.void_tags:
            self.errors.append(f"Void tag <{tag}> closed at line {self.getpos()[0]}")
            return
        if not self.stack:
            self.errors.append(f"Unmatched closing tag </{tag}> at line {self.getpos()[0]}")
            return
        t, pos = self.stack.pop()
        if t != tag:
            self.errors.append(f"Mismatched tag: expected </{t}> (line {pos[0]}), got </{tag}> (line {self.getpos()[0]})")

val = StrictValidator()
val.feed(html)
if val.stack:
    results["suite_4_dom_integrity"]["passed"] = False
    for t, pos in val.stack:
        results["suite_4_dom_integrity"]["details"].append(f"FAIL: Unclosed tag <{t}> from line {pos[0]}")
if val.errors:
    results["suite_4_dom_integrity"]["passed"] = False
    for err in val.errors:
        results["suite_4_dom_integrity"]["details"].append(f"FAIL: {err}")
if not val.stack and not val.errors:
    results["suite_4_dom_integrity"]["details"].append("HTML tag nesting and closure: PERFECT (0 errors)")

id_dups = [k for k, v in Counter(val.all_ids).items() if v > 1]
if id_dups:
    results["suite_4_dom_integrity"]["passed"] = False
    results["suite_4_dom_integrity"]["details"].append(f"FAIL: Duplicate IDs found: {id_dups}")
else:
    results["suite_4_dom_integrity"]["details"].append(f"All {len(val.all_ids)} IDs are strictly unique: PASS")

print("=========================================================================")
print("  ADVERSARIAL QUALITY CHALLENGER 1: DOM & ACCESSIBILITY REPORT")
print("=========================================================================")
total_suites = len(results)
passed_suites = sum(1 for v in results.values() if v["passed"])
failed_suites = total_suites - passed_suites

for k, v in results.items():
    status = "APPROVE" if v["passed"] else "REJECT"
    print(f"\n[{status}] {k.upper()}:")
    for d in v["details"]:
        print(f"  • {d}")

verdict = "APPROVE" if failed_suites == 0 else "REJECT"
print("\n=========================================================================")
print(f"  OVERALL VERDICT: {verdict} ({passed_suites}/{total_suites} suites passed)")
print("=========================================================================")

if verdict == "REJECT":
    sys.exit(1)
else:
    sys.exit(0)
