/**
 * Automated E2E Test Harness & DOM Simulation
 * Project: «Во Все Хуёвые» Wiki
 * 
 * Provides:
 * 1. Lightweight DOM simulation & HTML parser (Element, Document, Window, Event).
 * 2. Script execution sandbox via Node.js vm for app.js and data.js.
 * 3. Storage sandbox (normal, restricted/private browsing, quota exceeded).
 * 4. WCAG 2.1 AA color contrast calculation engine.
 * 5. Static code & CSS inspection helpers.
 * 6. Assertion library and test suite registry for E2E runner.
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PROJECT_ROOT = path.resolve(__dirname, '..');

/* ==========================================================================
   1. ASSERTION LIBRARY & TEST RUNNER ENGINE
   ========================================================================== */

class AssertionError extends Error {
  constructor(message, actual, expected) {
    super(message);
    this.name = 'AssertionError';
    this.actual = actual;
    this.expected = expected;
  }
}

class TestReporter {
  constructor() {
    this.suites = [];
    this.currentSuite = null;
    this.currentTest = null;
    this.totalAssertions = 0;
    this.passedAssertions = 0;
    this.failedAssertions = 0;
  }

  startSuite(name, description = '') {
    this.currentSuite = {
      name,
      description,
      tests: [],
      passed: true,
      startTime: Date.now(),
      duration: 0
    };
    this.suites.push(this.currentSuite);
  }

  endSuite() {
    if (this.currentSuite) {
      this.currentSuite.duration = Date.now() - this.currentSuite.startTime;
      this.currentSuite = null;
    }
  }

  startTest(name) {
    this.currentTest = {
      name,
      passed: true,
      assertions: [],
      error: null,
      startTime: Date.now(),
      duration: 0
    };
    if (this.currentSuite) {
      this.currentSuite.tests.push(this.currentTest);
    }
  }

  endTest() {
    if (this.currentTest) {
      this.currentTest.duration = Date.now() - this.currentTest.startTime;
      if (this.currentTest.assertions.some(a => !a.passed) || this.currentTest.error) {
        this.currentTest.passed = false;
        if (this.currentSuite) this.currentSuite.passed = false;
      }
      this.currentTest = null;
    }
  }

  recordAssertion(passed, message, actual = undefined, expected = undefined) {
    this.totalAssertions++;
    if (passed) {
      this.passedAssertions++;
    } else {
      this.failedAssertions++;
      if (this.currentTest) {
        this.currentTest.passed = false;
      }
      if (this.currentSuite) {
        this.currentSuite.passed = false;
      }
    }

    const record = {
      passed,
      message,
      actual,
      expected
    };

    if (this.currentTest) {
      this.currentTest.assertions.push(record);
    }

    return passed;
  }
}

const globalReporter = new TestReporter();

const assert = {
  ok(condition, message = 'Expected condition to be truthy') {
    const passed = Boolean(condition);
    globalReporter.recordAssertion(passed, message, condition, true);
    if (!passed) throw new AssertionError(message, condition, true);
  },

  equal(actual, expected, message) {
    const msg = message || `Expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`;
    const passed = actual === expected;
    globalReporter.recordAssertion(passed, msg, actual, expected);
    if (!passed) throw new AssertionError(msg, actual, expected);
  },

  notEqual(actual, expected, message) {
    const msg = message || `Expected ${JSON.stringify(actual)} not to equal ${JSON.stringify(expected)}`;
    const passed = actual !== expected;
    globalReporter.recordAssertion(passed, msg, actual, expected);
    if (!passed) throw new AssertionError(msg, actual, expected);
  },

  includes(haystack, needle, message) {
    const msg = message || `Expected haystack to include ${JSON.stringify(needle)}`;
    const passed = typeof haystack === 'string'
      ? haystack.includes(needle)
      : Array.isArray(haystack) ? haystack.includes(needle) : false;
    const actualSample = typeof haystack === 'string' && haystack.length > 100
      ? haystack.slice(0, 100) + '...'
      : haystack;
    globalReporter.recordAssertion(passed, msg, actualSample, needle);
    if (!passed) throw new AssertionError(msg, actualSample, needle);
  },

  notIncludes(haystack, needle, message) {
    const msg = message || `Expected haystack not to include ${JSON.stringify(needle)}`;
    const passed = typeof haystack === 'string'
      ? !haystack.includes(needle)
      : Array.isArray(haystack) ? !haystack.includes(needle) : true;
    const actualSample = typeof haystack === 'string' && haystack.length > 100
      ? haystack.slice(0, 100) + '...'
      : haystack;
    globalReporter.recordAssertion(passed, msg, actualSample, needle);
    if (!passed) throw new AssertionError(msg, actualSample, needle);
  },

  match(text, regex, message) {
    const msg = message || `Expected ${JSON.stringify(text)} to match ${regex}`;
    const passed = regex.test(text);
    globalReporter.recordAssertion(passed, msg, text, regex.toString());
    if (!passed) throw new AssertionError(msg, text, regex.toString());
  },

  doesNotMatch(text, regex, message) {
    const msg = message || `Expected ${JSON.stringify(text)} not to match ${regex}`;
    const passed = !regex.test(text);
    globalReporter.recordAssertion(passed, msg, text, regex.toString());
    if (!passed) throw new AssertionError(msg, text, regex.toString());
  },

  notMatch(text, regex, message) {
    return this.doesNotMatch(text, regex, message);
  },

  gte(actual, expected, message) {
    const msg = message || `Expected ${actual} to be >= ${expected}`;
    const passed = Number(actual) >= Number(expected);
    globalReporter.recordAssertion(passed, msg, actual, expected);
    if (!passed) throw new AssertionError(msg, actual, expected);
  },

  lte(actual, expected, message) {
    const msg = message || `Expected ${actual} to be <= ${expected}`;
    const passed = Number(actual) <= Number(expected);
    globalReporter.recordAssertion(passed, msg, actual, expected);
    if (!passed) throw new AssertionError(msg, actual, expected);
  },

  throws(fn, expectedRegexOrClass, message) {
    let threw = false;
    let caught = null;
    try {
      fn();
    } catch (e) {
      threw = true;
      caught = e;
    }
    const msg = message || `Expected function to throw`;
    let passed = threw;
    if (threw && expectedRegexOrClass) {
      if (expectedRegexOrClass instanceof RegExp) {
        passed = expectedRegexOrClass.test(caught.message || String(caught));
      } else if (typeof expectedRegexOrClass === 'string') {
        passed = (caught.message || String(caught)).includes(expectedRegexOrClass);
      }
    }
    globalReporter.recordAssertion(passed, msg, caught ? caught.message : null, expectedRegexOrClass);
    if (!passed) throw new AssertionError(msg, caught ? caught.message : null, expectedRegexOrClass);
  },

  doesNotThrow(fn, message) {
    let threw = false;
    let caught = null;
    try {
      fn();
    } catch (e) {
      threw = true;
      caught = e;
    }
    const msg = message || (threw ? `Expected function not to throw, but caught: ${caught.message}` : 'Did not throw');
    const passed = !threw;
    globalReporter.recordAssertion(passed, msg, caught ? caught.message : null, null);
    if (!passed) throw new AssertionError(msg, caught ? caught.message : null, null);
  }
};

/* ==========================================================================
   2. LIGHTWEIGHT DOM SIMULATION
   ========================================================================== */

class DOMTokenList {
  constructor(element) {
    this._element = element;
    this._tokens = new Set();
    this._syncFromAttr();
  }

  _syncFromAttr() {
    this._tokens.clear();
    const classAttr = this._element.getAttribute('class') || '';
    classAttr.trim().split(/\s+/).forEach(token => {
      if (token) this._tokens.add(token);
    });
  }

  _syncToAttr() {
    const str = Array.from(this._tokens).join(' ');
    if (str) {
      this._element.setAttribute('class', str);
    } else {
      this._element.removeAttribute('class');
    }
  }

  add(...tokens) {
    tokens.forEach(t => {
      if (t) this._tokens.add(String(t));
    });
    this._syncToAttr();
  }

  remove(...tokens) {
    tokens.forEach(t => this._tokens.delete(String(t)));
    this._syncToAttr();
  }

  toggle(token, force) {
    const has = this._tokens.has(token);
    const shouldAdd = force !== undefined ? Boolean(force) : !has;
    if (shouldAdd) {
      this.add(token);
    } else {
      this.remove(token);
    }
    return shouldAdd;
  }

  contains(token) {
    return this._tokens.has(token);
  }

  toString() {
    return Array.from(this._tokens).join(' ');
  }
}

class DOMNode {
  constructor(nodeType, nodeName) {
    this.nodeType = nodeType;
    this.nodeName = nodeName;
    this.parentNode = null;
    this.childNodes = [];
  }

  appendChild(child) {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    this.childNodes.push(child);
    return child;
  }

  removeChild(child) {
    const idx = this.childNodes.indexOf(child);
    if (idx !== -1) {
      this.childNodes.splice(idx, 1);
      child.parentNode = null;
      return child;
    }
    return null;
  }

  get children() {
    return this.childNodes.filter(node => node.nodeType === 1);
  }

  get firstChild() {
    return this.childNodes[0] || null;
  }

  get lastChild() {
    return this.childNodes[this.childNodes.length - 1] || null;
  }

  get textContent() {
    return this.childNodes.map(n => n.textContent).join('');
  }

  set textContent(val) {
    this.childNodes = [];
    if (val !== undefined && val !== null && val !== '') {
      this.appendChild(new DOMText(String(val)));
    }
  }
}

class DOMText extends DOMNode {
  constructor(text = '') {
    super(3, '#text');
    this.data = String(text);
  }

  get textContent() {
    return this.data;
  }

  set textContent(val) {
    this.data = String(val);
  }
}

class DOMElement extends DOMNode {
  constructor(tagName) {
    super(1, tagName.toUpperCase());
    this.tagName = tagName.toUpperCase();
    this.attributes = new Map();
    this.eventListeners = new Map();
    this.style = {};
    this._classList = null;
    this._value = '';
  }

  get classList() {
    if (!this._classList) {
      this._classList = new DOMTokenList(this);
    }
    return this._classList;
  }

  get className() {
    return this.getAttribute('class') || '';
  }

  set className(val) {
    this.setAttribute('class', val);
    if (this._classList) this._classList._syncFromAttr();
  }

  get id() {
    return this.getAttribute('id') || '';
  }

  set id(val) {
    this.setAttribute('id', val);
  }

  get value() {
    if (this.tagName === 'SELECT') {
      if (this._value !== '') return this._value;
      const options = this.querySelectorAll('option');
      const selectedOpt = options.find(o => o.hasAttribute('selected')) || options[0];
      return selectedOpt ? (selectedOpt.getAttribute('value') !== null ? selectedOpt.getAttribute('value') : selectedOpt.textContent) : '';
    }
    return this._value;
  }

  set value(val) {
    this._value = String(val);
  }

  getAttribute(name) {
    const key = name.toLowerCase();
    return this.attributes.has(key) ? this.attributes.get(key) : null;
  }

  setAttribute(name, val) {
    const key = name.toLowerCase();
    this.attributes.set(key, String(val));
    if (key === 'class' && this._classList) {
      this._classList._syncFromAttr();
    }
    if (key === 'value') {
      this._value = String(val);
    }
  }

  removeAttribute(name) {
    const key = name.toLowerCase();
    this.attributes.delete(key);
    if (key === 'class' && this._classList) {
      this._classList._syncFromAttr();
    }
  }

  hasAttribute(name) {
    return this.attributes.has(name.toLowerCase());
  }

  addEventListener(type, listener) {
    const key = type.toLowerCase();
    if (!this.eventListeners.has(key)) {
      this.eventListeners.set(key, []);
    }
    this.eventListeners.get(key).push(listener);
  }

  removeEventListener(type, listener) {
    const key = type.toLowerCase();
    if (this.eventListeners.has(key)) {
      const list = this.eventListeners.get(key);
      const idx = list.indexOf(listener);
      if (idx !== -1) list.splice(idx, 1);
    }
  }

  dispatchEvent(event) {
    if (!event.target) event.target = this;
    if (typeof event.stopPropagation !== 'function') {
      event.stopPropagation = () => { event.propagationStopped = true; };
    }
    if (typeof event.preventDefault !== 'function') {
      event.preventDefault = () => { event.defaultPrevented = true; };
    }
    const key = event.type.toLowerCase();
    let current = this;

    while (current) {
      current.ownerDocument;
      event.currentTarget = current;
      const listeners = current.eventListeners ? (current.eventListeners.get(key) || []).slice() : [];
      for (const listener of listeners) {
        try {
          listener.call(current, event);
        } catch (e) {
          if (process.env.DEBUG_TESTS) {
            console.error(`Error in event listener for ${event.type}:`, e);
          }
        }
      }

      if (key === 'click' && typeof current.getAttribute === 'function') {
        const onclickAttr = current.getAttribute('onclick');
        if (onclickAttr && current.ownerDocument && current.ownerDocument.defaultView) {
          try {
            const win = current.ownerDocument.defaultView;
            const fn = new Function('window', 'document', 'location', 'event', onclickAttr);
            fn.call(current, win, current.ownerDocument, win.location, event);
          } catch (e) {
            // Expected in test cases testing error states
          }
        }
      }

      if (!event.bubbles || event.propagationStopped || event.cancelBubble) break;
      current = current.parentNode;
    }

    return !event.defaultPrevented;
  }

  click() {
    const event = {
      type: 'click',
      target: this,
      currentTarget: this,
      bubbles: true,
      cancelable: true,
      defaultPrevented: false,
      propagationStopped: false,
      stopPropagation() { this.propagationStopped = true; },
      preventDefault() { this.defaultPrevented = true; }
    };
    this.dispatchEvent(event);
    // If element is link with href and wasn't prevented, simulate fallback navigation
    if (this.tagName === 'A' && this.hasAttribute('href') && !event.defaultPrevented) {
      const href = this.getAttribute('href');
      if (href && this.ownerDocument && this.ownerDocument.defaultView) {
        const win = this.ownerDocument.defaultView;
        if (href.startsWith('#')) {
          win.location.hash = href;
        } else if (typeof win.navigateTo === 'function') {
          win.navigateTo(href);
        }
      }
    }
  }

  matches(selector) {
    return selector.split(',').some(part => matchesSelector(this, part.trim()));
  }

  closest(selector) {
    let el = this;
    while (el && el.nodeType === 1) {
      if (el.tagName !== '#DOCUMENT' && el.matches(selector)) {
        return el;
      }
      el = el.parentNode;
    }
    return null;
  }

  focus() {
    if (this.ownerDocument) {
      this.ownerDocument.activeElement = this;
    }
  }

  blur() {
    if (this.ownerDocument && this.ownerDocument.activeElement === this) {
      this.ownerDocument.activeElement = null;
    }
  }

  scrollIntoView() {
    // Simulated no-op for headless testing
  }

  get innerHTML() {
    return serializeNodesToHTML(this.childNodes);
  }

  set innerHTML(html) {
    this.childNodes = [];
    parseHTMLToDOM(html, this);
  }

  getElementById(id) {
    return findFirst(this, node => node.nodeType === 1 && node.id === id);
  }

  getElementsByTagName(tagName) {
    const target = tagName.toUpperCase();
    return findAll(this, node => node.nodeType === 1 && (target === '*' || node.tagName === target));
  }

  getElementsByClassName(className) {
    const classes = className.trim().split(/\s+/);
    return findAll(this, node => node.nodeType === 1 && classes.every(c => node.classList.contains(c)));
  }

  querySelector(selector) {
    return querySelectorSingle(this, selector);
  }

  querySelectorAll(selector) {
    return querySelectorAll(this, selector);
  }
}

function findFirst(root, predicate) {
  for (const child of root.childNodes) {
    if (predicate(child)) return child;
    if (child.nodeType === 1) {
      const found = findFirst(child, predicate);
      if (found) return found;
    }
  }
  return null;
}

function findAll(root, predicate, acc = []) {
  for (const child of root.childNodes) {
    if (predicate(child)) acc.push(child);
    if (child.nodeType === 1) {
      findAll(child, predicate, acc);
    }
  }
  return acc;
}

function matchesSelector(element, selector) {
  if (element.nodeType !== 1) return false;
  const sel = selector.trim();
  if (sel === '*') return true;

  // Single ID: #id
  if (sel.startsWith('#') && !sel.includes(' ') && !sel.includes('[') && !sel.includes('.')) {
    return element.id === sel.slice(1);
  }

  // Single Class: .class
  if (sel.startsWith('.') && !sel.includes(' ') && !sel.includes('[') && !sel.slice(1).includes('.')) {
    return element.classList.contains(sel.slice(1));
  }

  // Complex parsing (tag, classes, attributes)
  const tagMatch = sel.match(/^[a-zA-Z0-9_-]+/);
  if (tagMatch) {
    if (element.tagName !== tagMatch[0].toUpperCase()) return false;
  }

  // Classes: .c1.c2
  const classMatches = sel.match(/\.([a-zA-Z0-9_-]+)/g);
  if (classMatches) {
    for (const cm of classMatches) {
      const cls = cm.slice(1);
      if (!element.classList.contains(cls)) return false;
    }
  }

  // IDs: #foo
  const idMatches = sel.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatches) {
    if (element.id !== idMatches[1]) return false;
  }

  // Attributes: [attr], [attr="val"], [attr*="val"], [attr^="val"], [attr$="val"]
  const attrMatches = sel.match(/\[([a-zA-Z0-9_-]+)(?:([*^$]?=)(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/g);
  if (attrMatches) {
    for (const am of attrMatches) {
      const parsed = am.match(/\[([a-zA-Z0-9_-]+)(?:([*^$]?=)(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/);
      if (!parsed) continue;
      const attrName = parsed[1].toLowerCase();
      const operator = parsed[2];
      const expectedVal = parsed[3] !== undefined ? parsed[3] : (parsed[4] !== undefined ? parsed[4] : parsed[5]);

      if (!element.hasAttribute(attrName)) return false;
      if (operator) {
        const actualVal = element.getAttribute(attrName);
        if (operator === '=') {
          if (actualVal !== expectedVal) return false;
        } else if (operator === '*=') {
          if (!actualVal.includes(expectedVal)) return false;
        } else if (operator === '^=') {
          if (!actualVal.startsWith(expectedVal)) return false;
        } else if (operator === '$=') {
          if (!actualVal.endsWith(expectedVal)) return false;
        }
      }
    }
  }

  return true;
}

function querySelectorSingle(root, selector) {
  const parts = selector.split(',').map(s => s.trim());
  for (const part of parts) {
    const subParts = part.split(/\s+/).filter(Boolean);
    if (subParts.length === 1) {
      const found = findFirst(root, node => matchesSelector(node, subParts[0]));
      if (found) return found;
    } else {
      const allMatchingFirst = findAll(root, node => matchesSelector(node, subParts[0]));
      for (const parent of allMatchingFirst) {
        const found = querySelectorSingle(parent, subParts.slice(1).join(' '));
        if (found) return found;
      }
    }
  }
  return null;
}

function querySelectorAll(root, selector) {
  const parts = selector.split(',').map(s => s.trim());
  const results = new Set();
  for (const part of parts) {
    const subParts = part.split(/\s+/).filter(Boolean);
    if (subParts.length === 1) {
      const matched = findAll(root, node => matchesSelector(node, subParts[0]));
      matched.forEach(m => results.add(m));
    } else {
      const firstMatches = findAll(root, node => matchesSelector(node, subParts[0]));
      for (const parent of firstMatches) {
        const subResults = querySelectorAll(parent, subParts.slice(1).join(' '));
        subResults.forEach(m => results.add(m));
      }
    }
  }
  return Array.from(results);
}

/* ==========================================================================
   3. HTML SERIALIZER & PARSER
   ========================================================================== */

const SELF_CLOSING_TAGS = new Set([
  'AREA', 'BASE', 'BR', 'COL', 'EMBED', 'HR', 'IMG', 'INPUT',
  'LINK', 'META', 'PARAM', 'SOURCE', 'TRACK', 'WBR'
]);

function serializeNodesToHTML(nodes) {
  return nodes.map(node => {
    if (node.nodeType === 3) {
      return node.data;
    }
    if (node.nodeType === 1) {
      const tag = node.tagName.toLowerCase();
      let attrs = '';
      for (const [k, v] of node.attributes.entries()) {
        attrs += ` ${k}="${String(v).replace(/"/g, '&quot;')}"`;
      }
      if (SELF_CLOSING_TAGS.has(node.tagName)) {
        return `<${tag}${attrs}>`;
      }
      const childrenHTML = serializeNodesToHTML(node.childNodes);
      return `<${tag}${attrs}>${childrenHTML}</${tag}>`;
    }
    return '';
  }).join('');
}

function parseHTMLToDOM(html, parentNode) {
  if (!html) return;
  const doc = parentNode.ownerDocument || parentNode;

  const tokenRegex = /<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/([a-zA-Z0-9_-]+)>|<([a-zA-Z0-9_-]+)((?:\s+[^=>\s]+(?:\s*=\s*(?:"[^"]*"|'([^']*)'|[^>\s]+))?)*)\s*(\/?)>/gi;
  let lastIndex = 0;
  let currentParent = parentNode;
  const stack = [parentNode];
  let match;

  while ((match = tokenRegex.exec(html)) !== null) {
    const textBefore = html.slice(lastIndex, match.index);
    if (textBefore) {
      const textNode = new DOMText(textBefore);
      textNode.ownerDocument = doc;
      currentParent.appendChild(textNode);
    }
    lastIndex = tokenRegex.lastIndex;

    const fullMatch = match[0];
    if (fullMatch.startsWith('<!--') || fullMatch.toUpperCase().startsWith('<!DOCTYPE')) {
      continue;
    }

    const closeTag = match[1];
    const openTag = match[2];
    const attrString = match[3];
    const selfCloseSlash = match[4];

    if (closeTag) {
      const closeTagName = closeTag.toUpperCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === closeTagName) {
          stack.length = i;
          currentParent = stack[stack.length - 1];
          break;
        }
      }
    } else if (openTag) {
      const element = new DOMElement(openTag);
      element.ownerDocument = doc;

      if (attrString) {
        const attrRegex = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^>\s]+)))?/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrString)) !== null) {
          const attrName = attrMatch[1];
          const attrVal = attrMatch[2] !== undefined ? attrMatch[2] : (attrMatch[3] !== undefined ? attrMatch[3] : (attrMatch[4] !== undefined ? attrMatch[4] : ''));
          element.setAttribute(attrName, attrVal);
        }
      }

      currentParent.appendChild(element);

      if (!SELF_CLOSING_TAGS.has(element.tagName) && !selfCloseSlash) {
        stack.push(element);
        currentParent = element;
      }
    }
  }

  const trailingText = html.slice(lastIndex);
  if (trailingText) {
    const textNode = new DOMText(trailingText);
    textNode.ownerDocument = doc;
    currentParent.appendChild(textNode);
  }
}

class DOMDocument extends DOMElement {
  constructor() {
    super('#document');
    this.ownerDocument = this;
    this.defaultView = null;
    this.activeElement = null;
    this.documentElement = null;
    this.head = null;
    this.body = null;
    this._title = '';
  }

  get title() {
    if (this._title) return this._title;
    const titleEl = this.querySelector('title');
    return titleEl ? titleEl.textContent : '';
  }

  set title(val) {
    this._title = String(val);
    const titleEl = this.querySelector('title');
    if (titleEl) {
      titleEl.textContent = val;
    }
  }

  createElement(tagName) {
    const el = new DOMElement(tagName);
    el.ownerDocument = this;
    return el;
  }
}

/* ==========================================================================
   4. LOCALSTORAGE MOCK & RESTRICTED STORAGE SIMULATOR
   ========================================================================== */

class MockLocalStorage {
  constructor(mode = 'normal') {
    this._mode = mode; // 'normal', 'restricted', 'quota_exceeded'
    this._store = new Map();
  }

  getItem(key) {
    if (this._mode === 'restricted') {
      const err = new Error('SecurityError: Access is denied');
      err.name = 'SecurityError';
      throw err;
    }
    return this._store.has(key) ? this._store.get(key) : null;
  }

  setItem(key, value) {
    if (this._mode === 'restricted') {
      const err = new Error('SecurityError: Access is denied');
      err.name = 'SecurityError';
      throw err;
    }
    if (this._mode === 'quota_exceeded') {
      const err = new Error('QuotaExceededError: Storage quota exceeded');
      err.name = 'QuotaExceededError';
      throw err;
    }
    this._store.set(key, String(value));
  }

  removeItem(key) {
    if (this._mode === 'restricted') {
      const err = new Error('SecurityError: Access is denied');
      err.name = 'SecurityError';
      throw err;
    }
    this._store.delete(key);
  }

  clear() {
    if (this._mode === 'restricted') {
      const err = new Error('SecurityError: Access is denied');
      err.name = 'SecurityError';
      throw err;
    }
    this._store.clear();
  }

  get length() {
    if (this._mode === 'restricted') {
      const err = new Error('SecurityError: Access is denied');
      err.name = 'SecurityError';
      throw err;
    }
    return this._store.size;
  }
}

/* ==========================================================================
   5. ENVIRONMENT / CONTEXT FACTORY
   ========================================================================== */

function createBrowserEnvironment(options = {}) {
  const {
    storageMode = 'normal', // 'normal', 'restricted', 'quota_exceeded'
    initialHash = '',
    initialPath = '/Vovsehuyevie/',
    protocol = 'https:',
    htmlFile = path.join(PROJECT_ROOT, 'index.html'),
    htmlContent: providedHtml = null,
    dataFile = path.join(PROJECT_ROOT, 'js', 'data.js'),
    appFile = path.join(PROJECT_ROOT, 'js', 'app.js'),
    loadApp = true
  } = options;

  const htmlContent = providedHtml !== null ? providedHtml : fs.readFileSync(htmlFile, 'utf8');
  const document = new DOMDocument();
  parseHTMLToDOM(htmlContent, document);

  document.documentElement = document.querySelector('html');
  document.head = document.querySelector('head');
  document.body = document.querySelector('body');

  const windowListeners = new Map();
  const storage = new MockLocalStorage(storageMode);
  const origin = protocol === 'file:' ? 'null' : 'https://sanzharshaymerdenov5-collab.github.io';

  const normalizedInitPath = initialPath.startsWith('/') ? initialPath : `/${initialPath}`;
  const [initPathname, initSearchPart = ''] = normalizedInitPath.split('?');
  const initSearch = initSearchPart ? `?${initSearchPart}` : '';

  const locationObj = {
    protocol,
    origin,
    host: protocol === 'file:' ? '' : 'sanzharshaymerdenov5-collab.github.io',
    pathname: initPathname,
    search: initSearch,
    _hash: initialHash,
    get hash() {
      return this._hash;
    },
    set hash(val) {
      const oldVal = this._hash;
      const oldHref = this.href;
      this._hash = val ? (String(val).startsWith('#') ? String(val) : `#${val}`) : '';
      if (this._hash !== oldVal) {
        window.dispatchEvent({
          type: 'hashchange',
          oldURL: oldHref,
          newURL: this.href
        });
      }
    },
    get href() {
      if (this.protocol === 'file:') {
        return `file://${this.pathname}${this.search}${this._hash}`;
      }
      return `${this.origin}${this.pathname}${this.search}${this._hash}`;
    }
  };

  const historyStack = [{ state: null, url: locationObj.href }];
  let historyIndex = 0;

  const window = {
    document,
    localStorage: storage,
    location: locationObj,
    scrollX: 0,
    scrollY: 0,
    navigator: {
      clipboard: {
        writeText: () => Promise.resolve()
      }
    },
    matchMedia: () => ({ matches: false, addListener() {}, removeListener() {} }),
    history: {
      get length() {
        return historyStack.length;
      },
      get state() {
        return historyStack[historyIndex] ? historyStack[historyIndex].state : null;
      },
      pushState(state, _title, url) {
        if (url !== undefined && url !== null) {
          const baseHref = locationObj.protocol === 'file:' ? 'https://example.com/' : locationObj.href;
          const resolved = new URL(String(url), baseHref);
          locationObj.pathname = resolved.pathname;
          locationObj.search = resolved.search;
          locationObj._hash = resolved.hash || '';
        }
        historyStack.splice(historyIndex + 1);
        historyStack.push({ state: state || null, url: locationObj.href });
        historyIndex = historyStack.length - 1;
      },
      replaceState(state, _title, url) {
        if (url !== undefined && url !== null) {
          const baseHref = locationObj.protocol === 'file:' ? 'https://example.com/' : locationObj.href;
          const resolved = new URL(String(url), baseHref);
          locationObj.pathname = resolved.pathname;
          locationObj.search = resolved.search;
          locationObj._hash = resolved.hash || '';
        }
        historyStack[historyIndex] = { state: state || null, url: locationObj.href };
      }
    },
    scrollTo(opts) {
      window.scrollX = opts && opts.left !== undefined ? opts.left : 0;
      window.scrollY = opts && opts.top !== undefined ? opts.top : 0;
    },
    addEventListener(type, listener) {
      const key = type.toLowerCase();
      if (!windowListeners.has(key)) windowListeners.set(key, []);
      windowListeners.get(key).push(listener);
    },
    removeEventListener(type, listener) {
      const key = type.toLowerCase();
      if (windowListeners.has(key)) {
        const list = windowListeners.get(key);
        const idx = list.indexOf(listener);
        if (idx !== -1) list.splice(idx, 1);
      }
    },
    dispatchEvent(event) {
      event.target = window;
      event.currentTarget = window;
      const key = event.type.toLowerCase();
      const list = windowListeners.get(key) || [];
      for (const fn of list) {
        try {
          fn.call(window, event);
        } catch (e) {
          console.error(`Window listener error (${event.type}):`, e);
        }
      }
      return true;
    },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    console,
    URL,
    URLSearchParams,
    JSON,
    Date,
    RegExp,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    isFinite
  };

  document.defaultView = window;

  const sandbox = {
    window,
    document,
    localStorage: storage,
    location: window.location,
    history: window.history,
    navigator: window.navigator,
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    JSON,
    Date,
    RegExp,
    Math,
    parseInt,
    parseFloat,
    isNaN,
    isFinite
  };

  vm.createContext(sandbox);

  let scriptExecutionError = null;

  if (loadApp) {
    try {
      const dataCode = fs.readFileSync(dataFile, 'utf8');
      vm.runInContext(dataCode, sandbox);

      const appCode = fs.readFileSync(appFile, 'utf8');
      vm.runInContext(appCode, sandbox);

      // Trigger DOMContentLoaded
      document.dispatchEvent({
        type: 'DOMContentLoaded',
        bubbles: true,
        cancelable: false
      });
    } catch (e) {
      scriptExecutionError = e;
    }
  }

  const helper = {
    window,
    document,
    sandbox,
    storage,
    scriptExecutionError,
    PROJECT_ROOT,

    eval(code) {
      return vm.runInContext(code, sandbox);
    },

    getState() {
      try {
        return vm.runInContext("typeof STATE !== 'undefined' ? STATE : null", sandbox);
      } catch (e) {
        return null;
      }
    },

    getData() {
      try {
        return vm.runInContext("typeof DEFAULT_WIKI_DATA !== 'undefined' ? DEFAULT_WIKI_DATA : null", sandbox);
      } catch (e) {
        return null;
      }
    },

    getSafeStorage() {
      try {
        return vm.runInContext("typeof safeStorage !== 'undefined' ? safeStorage : null", sandbox);
      } catch (e) {
        return null;
      }
    },

    click(selector) {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Element not found for selector: ${selector}`);
      el.click();
      return el;
    },

    type(selector, text) {
      const el = document.querySelector(selector);
      if (!el) throw new Error(`Input element not found for selector: ${selector}`);
      el.value = text;
      el.dispatchEvent({
        type: 'input',
        target: el,
        currentTarget: el,
        bubbles: true,
        cancelable: false
      });
      return el;
    },

    navigate(target) {
      const raw = String(target === undefined || target === null ? '' : target);
      if (raw.startsWith('#')) {
        window.location.hash = raw;
      } else if (typeof window.navigateTo === 'function') {
        window.navigateTo(raw);
      } else {
        window.history.pushState({}, '', raw);
        window.dispatchEvent({ type: 'popstate', state: {} });
      }
    }
  };

  return helper;
}

/* ==========================================================================
   6. WCAG 2.1 AA COLOR CONTRAST ENGINE
   ========================================================================== */

function parseHexColor(hex) {
  let clean = hex.replace('#', '').trim();
  if (clean.length === 3) {
    clean = clean.split('').map(c => c + c).join('');
  }
  const num = parseInt(clean, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function calculateRelativeLuminance({ r, g, b }) {
  const [sR, sG, sB] = [r, g, b].map(v => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * sR + 0.7152 * sG + 0.0722 * sB;
}

function calculateContrastRatio(hexColor1, hexColor2) {
  const rgb1 = parseHexColor(hexColor1);
  const rgb2 = parseHexColor(hexColor2);
  const l1 = calculateRelativeLuminance(rgb1);
  const l2 = calculateRelativeLuminance(rgb2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/* ==========================================================================
   7. FILE & CODE INSPECTION HELPERS
   ========================================================================== */

function getFileContent(relPath) {
  const absPath = path.join(PROJECT_ROOT, relPath);
  if (!fs.existsSync(absPath)) return null;
  return fs.readFileSync(absPath, 'utf8');
}

function fileExists(relPath) {
  return fs.existsSync(path.join(PROJECT_ROOT, relPath));
}

function getCSSContent() {
  return getFileContent('css/style.css');
}

function getHTMLContent() {
  return getFileContent('index.html');
}

function getJSAppContent() {
  return getFileContent('js/app.js');
}

function getJSDataContent() {
  return getFileContent('js/data.js');
}

module.exports = {
  PROJECT_ROOT,
  assert,
  globalReporter,
  createBrowserEnvironment,
  calculateContrastRatio,
  parseHexColor,
  calculateRelativeLuminance,
  getFileContent,
  fileExists,
  getCSSContent,
  getHTMLContent,
  getJSAppContent,
  getJSDataContent
};
