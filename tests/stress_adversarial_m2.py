#!/usr/bin/env python3
"""
Milestone 2 Stress & Adversarial Verification Suite
Comprehensive audit for CSS Architecture, Contrast, GPU acceleration, and Dead Code elimination.
"""

import re
import sys

def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def luminance(hex_col):
    hex_col = hex_col.lstrip('#')
    r, g, b = [int(hex_col[i:i+2], 16) for i in (0, 2, 4)]
    return 0.2126 * srgb_to_lin(r) + 0.7152 * srgb_to_lin(g) + 0.0722 * srgb_to_lin(b)

def contrast_ratio(hex1, hex2):
    l1 = luminance(hex1)
    l2 = luminance(hex2)
    lighter = max(l1, l2)
    darker = min(l1, l2)
    return (lighter + 0.05) / (darker + 0.05)

def run_all_checks():
    css_path = 'css/style.css'
    with open(css_path, 'r', encoding='utf-8') as f:
        css = f.read()

    print("========================================================================")
    print("  MILESTONE 2: CSS ARCHITECTURE & VISUAL PERFORMANCE AUDIT")
    print("========================================================================\n")

    all_passed = True

    # 1. SYNTAX & BALANCE CHECK
    print("--- 1. CSS Syntax & Structural Balance ---")
    open_c = css.count('/*')
    close_c = css.count('*/')
    assert open_c == close_c, f"Comment mismatch: {open_c} open vs {close_c} close"

    no_comments = re.sub(r'/\*[\s\S]*?\*/', '', css)
    open_b = no_comments.count('{')
    close_b = no_comments.count('}')
    assert open_b == close_b, f"Brace mismatch: {open_b} open vs {close_b} close"

    open_p = no_comments.count('(')
    close_p = no_comments.count(')')
    assert open_p == close_p, f"Paren mismatch: {open_p} open vs {close_p} close"

    open_sq = no_comments.count('[')
    close_sq = no_comments.count(']')
    assert open_sq == close_sq, f"Bracket mismatch: {open_sq} open vs {close_sq} close"

    print(f"  ✓ Comments balanced: {open_c} pairs")
    print(f"  ✓ Braces balanced: {open_b} pairs")
    print(f"  ✓ Parentheses balanced: {open_p} pairs")
    print(f"  ✓ Brackets balanced: {open_sq} pairs")

    # 2. F10: MOBILE HEADER NAVIGATION LAYOUT FIX
    print("\n--- 2. F10: Mobile Header Navigation Layout Fix ---")
    m768_match = re.search(r'@media\s*\(\s*max-width:\s*768px\s*\)\s*\{([\s\S]*?)(?=@media|$)', css)
    assert m768_match, "768px media query missing"
    m768_content = m768_match.group(1)
    
    header_auto_match = re.search(r'\.wiki-header\s*\{[^}]*height:\s*auto\s*;?[^}]*\}', m768_content)
    assert header_auto_match, ".wiki-header { height: auto; } not found in @media (max-width: 768px)"
    print("  ✓ .wiki-header has height: auto in @media (max-width: 768px)")

    assert not re.search(r'\.wiki-header\s*\{[^}]*overflow:\s*hidden', css), ".wiki-header should not clip content"
    print("  ✓ .wiki-header does not have overflow: hidden (clean wrapping)")

    # 3. F11: LIGHT THEME WCAG 2.1 AA CONTRAST
    print("\n--- 3. F11: Light Theme WCAG 2.1 AA Contrast ---")
    light_theme_match = re.search(r'\[data-theme=["\']?light["\']?\]\s*\{([\s\S]*?)\}', css)
    assert light_theme_match, "[data-theme=\"light\"] block missing"
    light_block = light_theme_match.group(1)

    active_match = re.search(r'--status-active-text:\s*(#[0-9a-fA-F]{3,6})', light_block)
    deceased_match = re.search(r'--status-deceased-text:\s*(#[0-9a-fA-F]{3,6})', light_block)
    missing_match = re.search(r'--status-missing-text:\s*(#[0-9a-fA-F]{3,6})', light_block)

    assert active_match, "--status-active-text missing in light theme"
    assert deceased_match, "--status-deceased-text missing in light theme"
    assert missing_match, "--status-missing-text missing in light theme"

    active_hex = active_match.group(1)
    deceased_hex = deceased_match.group(1)
    missing_hex = missing_match.group(1)

    print(f"  Light Theme Tokens: active={active_hex}, deceased={deceased_hex}, missing={missing_hex}")

    bgs = [('#ffffff', 'White Card (#ffffff)'), ('#f8f9fa', 'Vector Canvas (#f8f9fa)')]
    for hex_val, label in [(active_hex, 'Active'), (deceased_hex, 'Deceased'), (missing_hex, 'Missing')]:
        for bg_hex, bg_label in bgs:
            cr = contrast_ratio(hex_val, bg_hex)
            passes = cr >= 4.5
            print(f"  {'✓' if passes else '✗'} {label} ({hex_val}) vs {bg_label}: {cr:.2f}:1 (Required: >=4.5:1)")
            if not passes:
                all_passed = False

    # 4. F12: DEAD CODE ELIMINATION
    print("\n--- 4. F12: CSS Dead Code Elimination ---")
    dead_selectors = [
        '.arch-components-grid',
        '.arch-comp-card',
        '.arch-comp-header',
        '.arch-comp-num',
        '.arch-fields-list',
        '.arch-wireframe',
        '.wireframe-row',
        '.wf-tag',
        '.wireframe-body-layout',
        '.wireframe-block',
        '.wireframe-quote',
        '.wireframe-toc',
        '.wireframe-infobox',
        '.wf-ib-header',
        '.wf-ib-img',
        '.wf-ib-section',
        '.wf-ib-row',
        '.arch-code-block',
        '.form-grid',
        '--font-wiki-title'
    ]
    for dead in dead_selectors:
        found = dead in css
        print(f"  {'✗' if found else '✓'} '{dead}' eliminated: {not found}")
        if found:
            all_passed = False

    # 5. F14: GPU ACCELERATION & ANIMATION EFFICIENCY
    print("\n--- 5. F14: GPU Acceleration & Animation Efficiency ---")
    transition_all_matches = re.findall(r'transition:\s*all', css, re.IGNORECASE)
    print(f"  ✓ Instances of 'transition: all': {len(transition_all_matches)} (Expected: 0)")
    assert len(transition_all_matches) == 0, f"Found {len(transition_all_matches)} instances of transition: all"

    # Safari webkit backdrop filter
    backdrop_match = re.search(r'-webkit-backdrop-filter:\s*blur\(4px\);[\s\S]*?backdrop-filter:\s*blur\(4px\);', css)
    assert backdrop_match, "-webkit-backdrop-filter must precede backdrop-filter"
    print("  ✓ -webkit-backdrop-filter: blur(4px) present for Safari iOS glassmorphism")

    # will-change: transform
    will_change_card = re.search(r'\.wiki-card\s*\{[^}]*will-change:\s*transform', css)
    will_change_stamp = re.search(r'a\.wiki-status-stamp\s*\{[^}]*will-change:\s*transform', css)
    assert will_change_card, ".wiki-card missing will-change: transform"
    assert will_change_stamp, ".wiki-status-stamp missing will-change: transform"
    print("  ✓ GPU layer promotion (will-change: transform) present on .wiki-card and .wiki-status-stamp")

    # 480px media query
    m480_match = re.search(r'@media\s*\(\s*max-width:\s*480px\s*\)\s*\{([\s\S]*?)\n\}\s*$', css)
    if not m480_match:
        # Fallback to finding block by start index
        start_idx = css.find('@media (max-width: 480px)')
        m480_content = css[start_idx:]
    else:
        m480_content = m480_match.group(1)
    assert '.cards-grid' in m480_content and 'grid-template-columns: 1fr' in m480_content, ".cards-grid single column missing in 480px query"
    assert '.arch-plan-grid' in m480_content and 'grid-template-columns: 1fr' in m480_content, ".arch-plan-grid single column missing in 480px query"
    print("  ✓ @media (max-width: 480px) present with single-column collapse for cards-grid and arch-plan-grid")

    # Media query cascade order
    mq_pos_900 = css.find('@media (max-width: 900px)')
    mq_pos_768 = css.find('@media (max-width: 768px)')
    mq_pos_480 = css.find('@media (max-width: 480px)')
    assert mq_pos_900 != -1 and mq_pos_768 != -1 and mq_pos_480 != -1
    assert mq_pos_900 < mq_pos_768 < mq_pos_480, "Media queries must be ordered: 900px -> 768px -> 480px"
    print("  ✓ Media queries correctly ordered in cascade: 900px -> 768px -> 480px")

    # 6. UNDEFINED / UNREFERENCED VARIABLES
    print("\n--- 6. CSS Variable Integrity ---")
    defined_vars = set(re.findall(r'(--[a-zA-Z0-9_-]+)\s*:', no_comments))
    referenced_vars = set(re.findall(r'var\(\s*(--[a-zA-Z0-9_-]+)', no_comments))
    undefined_vars = referenced_vars - defined_vars
    unreferenced_vars = defined_vars - referenced_vars

    print(f"  ✓ Total defined variables: {len(defined_vars)}")
    print(f"  ✓ Undefined variables referenced: {len(undefined_vars)}")
    print(f"  ✓ Dead defined variables: {len(unreferenced_vars)}")
    assert len(undefined_vars) == 0, f"Undefined vars: {undefined_vars}"
    assert len(unreferenced_vars) == 0, f"Unreferenced vars: {unreferenced_vars}"

    print("\n========================================================================")
    if all_passed:
        print("  ALL AUDIT CHECKS PASSED: 100% COMPLIANT")
    else:
        print("  SOME CHECKS FAILED")
    print("========================================================================")

if __name__ == '__main__':
    run_all_checks()
