/**
 * Milestone 3 Challenger 2: Data Integrity, Regex Performance, Routing, and TOC Stress Test
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const PROJECT_ROOT = path.resolve(__dirname, '..');
const { createBrowserEnvironment } = require(path.join(PROJECT_ROOT, 'tests', 'test_harness.js'));
const assert = require('assert');

let testsPassed = 0;
let testsFailed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    console.log(`  \x1b[32m✓\x1b[0m ${name}`);
    testsPassed++;
  } catch (err) {
    console.error(`  \x1b[31m✗\x1b[0m ${name}`);
    console.error(`    ${err.message}`);
    testsFailed++;
    failures.push({ name, error: err });
  }
}

async function runAll() {
  console.log('\n\x1b[1m\x1b[34m========================================================================\x1b[0m');
  console.log('\x1b[1m  Milestone 3 Challenger 2: Data Integrity & Regex Stress Test Suite\x1b[0m');
  console.log('\x1b[1m\x1b[34m========================================================================\x1b[0m\n');

  // Load environment to inspect DEFAULT_WIKI_DATA and STATE
  const initialEnv = createBrowserEnvironment({ loadApp: true });
  const DEFAULT_WIKI_DATA = initialEnv.getData();

  // ------------------------------------------------------------------------
  // PART 1: DATA INTEGRITY
  // ------------------------------------------------------------------------
  console.log('\x1b[1m\x1b[33m▶ Part 1: Data Integrity Probing\x1b[0m');

  test('DEFAULT_WIKI_DATA.characters exists and contains gusev-ferangiy', () => {
    assert(Array.isArray(DEFAULT_WIKI_DATA.characters), 'characters must be an array');
    const gusev = DEFAULT_WIKI_DATA.characters.find(c => c.id === 'gusev-ferangiy');
    assert(gusev !== undefined, 'gusev-ferangiy must be defined in characters');
  });

  const gusev = DEFAULT_WIKI_DATA.characters.find(c => c.id === 'gusev-ferangiy');

  test('gusev-ferangiy has complete core attributes with correct values', () => {
    assert.strictEqual(gusev.id, 'gusev-ferangiy', 'id must be gusev-ferangiy');
    assert.strictEqual(gusev.name, 'Гусев Ферангий', 'name must be Гусев Ферангий');
    assert.strictEqual(gusev.fullName, 'Ферангий Лоренцович Гусев', 'fullName must be complete');
    assert.strictEqual(gusev.alias, 'Гусь', 'alias must be Гусь');
    assert(Array.isArray(gusev.aliasesList) && gusev.aliasesList.length >= 4, 'aliasesList must contain at least 4 aliases');
    assert(gusev.aliasesList.includes('Гусь'), 'aliasesList must include Гусь');
    assert(gusev.aliasesList.includes('Эль Пойо'), 'aliasesList must include Эль Пойо');
    assert(gusev.aliasesList.includes('Повелитель Курятника'), 'aliasesList must include Повелитель Курятника');
    assert(gusev.aliasesList.includes('Глава Синдиката'), 'aliasesList must include Глава Синдиката');

    assert(typeof gusev.role === 'string' && gusev.role.length > 10, 'role must be a descriptive string');
    assert(Array.isArray(gusev.rolesList) && gusev.rolesList.length >= 4, 'rolesList must have >= 4 roles');
    assert(gusev.rolesList.includes('Лидер картеля'), 'rolesList has Лидер картеля');

    assert.strictEqual(gusev.factionId, 'gusev-empire', 'factionId must be gusev-empire');
    assert(Array.isArray(gusev.affiliationsList) && gusev.affiliationsList.length >= 2, 'affiliationsList must have >= 2 items');

    assert.strictEqual(gusev.actor, 'Джанкарло Эспозито (в адаптации Подзалупинска)', 'actor must match');
    assert(typeof gusev.weapon === 'string' && gusev.weapon.includes('Канцелярский нож'), 'weapon must include iconic weapons');
    assert(typeof gusev.quote === 'string' && gusev.quote.length > 20, 'quote must be a non-trivial quote');
    assert.strictEqual(gusev.status, 'Мёртв', 'status must be Мёртв');

    assert(typeof gusev.overview === 'string' && gusev.overview.length > 50, 'overview must be comprehensive');
    assert(Array.isArray(gusev.biography) || typeof gusev.biography === 'string', 'biography must be string or array');
    const bioText = Array.isArray(gusev.biography) ? gusev.biography.join(' ') : gusev.biography;
    assert(bioText.length > 100, 'biography content must be substantive');

    assert(typeof gusev.personality === 'string' && gusev.personality.length > 30, 'personality must be defined');
    assert(Array.isArray(gusev.relationships) && gusev.relationships.length >= 2, 'relationships must have at least 2 entries');
    assert(Array.isArray(gusev.trivia) && gusev.trivia.length >= 3, 'trivia must have at least 3 entries');
    assert(Array.isArray(gusev.categories) && gusev.categories.length >= 3, 'categories must have at least 3 entries');
  });

  test('gusev-ferangiy personal data fields are complete', () => {
    assert.strictEqual(gusev.origin, 'Г. Подзалупинск', 'origin must be Подзалупинск');
    assert.strictEqual(gusev.deathDate, '2024 год', 'deathDate must be 2024');
    assert.strictEqual(gusev.deathPlace, 'Дом престарелых Подзалупинска', 'deathPlace must be correct');
    assert(gusev.causeOfDeath.includes('Взрыв бомбы'), 'causeOfDeath must specify bomb explosion');
    assert.strictEqual(gusev.firstAppearance, 'Сезон 2', 'firstAppearance Season 2');
    assert.strictEqual(gusev.lastAppearance, '«Без яйца»', 'lastAppearance Без яйца');
  });

  test('gusev-empire faction has notableMembers containing Gusev, Valentin, and Gey Himbiovech', () => {
    const faction = DEFAULT_WIKI_DATA.factions.find(f => f.id === 'gusev-empire');
    assert(faction !== undefined, 'gusev-empire faction must exist');
    assert(Array.isArray(faction.notableMembers), 'notableMembers must be an array');
    assert(faction.notableMembers.includes('gusev-ferangiy'), 'notableMembers must include gusev-ferangiy');
    assert(faction.notableMembers.includes('valentin-belinsky'), 'notableMembers must include valentin-belinsky');
    assert(faction.notableMembers.includes('gey-himbiovech'), 'notableMembers must include gey-himbiovech');
  });

  test('renderFactionArticle resolves and renders all 3 notable members as character cards', () => {
    const env = createBrowserEnvironment({ initialHash: '#faction/gusev-empire' });
    const viewport = env.document.getElementById('contentViewport');
    assert(viewport !== null, 'viewport must exist');

    const memberSection = viewport.querySelector('#sec-fac-members');
    assert(memberSection !== null, '#sec-fac-members section must be rendered');

    // Check all 3 members are present in the members section as .wiki-card
    const memberCards = memberSection.querySelectorAll('.wiki-card');
    assert.strictEqual(memberCards.length, 3, `Expected 3 member cards, got ${memberCards.length}`);

    const memberHtml = memberSection.innerHTML;
    assert(memberHtml.includes('#character/gusev-ferangiy'), 'Card link for Gusev must be present');
    assert(memberHtml.includes('#character/valentin-belinsky'), 'Card link for Valentin must be present');
    assert(memberHtml.includes('#character/gey-himbiovech'), 'Card link for Gey Himbiovech must be present');

    assert(memberHtml.includes('Гусев Ферангий'), 'Gusev name must appear in members');
    assert(memberHtml.includes('Валентин Белинский'), 'Valentin name must appear in members');
    assert(memberHtml.includes('Гей Химбиович'), 'Gey Himbiovech name must appear in members');
  });

  test('Relationship link from gey-himbiovech targets gusev-ferangiy and renders clickable link', () => {
    const gey = DEFAULT_WIKI_DATA.characters.find(c => c.id === 'gey-himbiovech');
    assert(gey !== undefined, 'gey-himbiovech must exist');
    const relToGusev = gey.relationships.find(r => r.charId === 'gusev-ferangiy');
    assert(relToGusev !== undefined, 'gey must have relationship to gusev-ferangiy');
    assert(relToGusev.type.includes('Босс и любовник'), 'relationship type must be boss and lover');

    const env = createBrowserEnvironment({ initialHash: '#character/gey-himbiovech' });
    const viewport = env.document.getElementById('contentViewport');
    const relSection = viewport.querySelector('#sec-relationships');
    assert(relSection !== null, '#sec-relationships must be rendered');

    const links = relSection.getElementsByTagName('a');
    const gusevRelLink = links.find(a => a.getAttribute('href') === '#character/gusev-ferangiy');
    assert(gusevRelLink !== undefined, 'Link to #character/gusev-ferangiy must be rendered in relationships');
    assert(gusevRelLink.textContent.includes('Гусев Ферангий'), 'Link text must include Gusev');
  });

  test('gusev-ferangiy article renders outgoing relationships to Valentin and Gey Himbiovech', () => {
    const env = createBrowserEnvironment({ initialHash: '#character/gusev-ferangiy' });
    const viewport = env.document.getElementById('contentViewport');
    const relSection = viewport.querySelector('#sec-relationships');
    assert(relSection !== null, '#sec-relationships must be rendered in gusev article');

    const links = relSection.getElementsByTagName('a');
    const valentinLink = links.find(a => a.getAttribute('href') === '#character/valentin-belinsky');
    assert(valentinLink !== undefined, 'Link to #character/valentin-belinsky must be present');

    const geyLink = links.find(a => a.getAttribute('href') === '#character/gey-himbiovech');
    assert(geyLink !== undefined, 'Link to #character/gey-himbiovech must be present');
  });

  test('All relationship charId links across all characters resolve to existing characters or factions', () => {
    const charIds = new Set(DEFAULT_WIKI_DATA.characters.map(c => c.id));
    const factionIds = new Set(DEFAULT_WIKI_DATA.factions.map(f => f.id));

    let totalRelationships = 0;
    for (const char of DEFAULT_WIKI_DATA.characters) {
      if (char.relationships && Array.isArray(char.relationships)) {
        for (const rel of char.relationships) {
          totalRelationships++;
          const valid = charIds.has(rel.charId) || factionIds.has(rel.charId);
          assert(valid, `Character ${char.id} has invalid relationship charId "${rel.charId}"`);
        }
      }
    }
    assert(totalRelationships > 10, `Expected > 10 relationships validated across characters, found ${totalRelationships}`);
  });

  // ------------------------------------------------------------------------
  // PART 2: WIKI REGEX AUTO-LINKING PERFORMANCE & CORRECTNESS
  // ------------------------------------------------------------------------
  console.log('\n\x1b[1m\x1b[33m▶ Part 2: Wiki Regex Auto-linking Performance & Correctness\x1b[0m');

  const appJsContent = fs.readFileSync(path.join(PROJECT_ROOT, 'js', 'app.js'), 'utf8');

  test('WIKI_PATTERN is precompiled at module scope outside renderWikiProse', () => {
    const regexPatternDef = /const\s+WIKI_PATTERN\s*=\s*new\s+RegExp\(/;
    assert(regexPatternDef.test(appJsContent), 'WIKI_PATTERN must be declared with const WIKI_PATTERN = new RegExp(...)');

    // Verify it is defined before STATE or functions
    const posPattern = appJsContent.indexOf('const WIKI_PATTERN =');
    const posRenderWiki = appJsContent.indexOf('function renderWikiProse(');
    assert(posPattern !== -1, 'WIKI_PATTERN must exist');
    assert(posRenderWiki !== -1, 'renderWikiProse must exist');
    assert(posPattern < posRenderWiki, 'WIKI_PATTERN must be defined before renderWikiProse at top-level scope');

    // Verify renderWikiProse does not create new RegExp inside
    const renderWikiBody = appJsContent.slice(posRenderWiki, posRenderWiki + 1000);
    assert(!renderWikiBody.includes('new RegExp'), 'renderWikiProse must NOT instantiate new RegExp on every invocation');
  });

  // Test benchmarking execution time for 2,000 iterations
  test('Benchmark: Precompiled WIKI_PATTERN vs Re-compiling Regex (2,000 iterations)', () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const renderWikiProse = env.eval('renderWikiProse');
    const WIKI_ENTITIES = env.eval('WIKI_ENTITIES');
    const WIKI_PATTERN = env.eval('WIKI_PATTERN');
    const escapeHtml = env.eval('escapeHtml');

    const sampleProse = `Ферангий Лоренцович Гусев встретился с Валентином Белинским в Подзалупинске, чтобы обсудить поставки Наркоимперии Гусева Ферангия. При этом Гей Химбиович и Жесси Розовый варили мефедрон по рецепту, показанному в серии «Пилот Мефедрона». Стояк Белинский из ОБН Подзалупинска пытался выследить Хуйзенберга, напевая песню из «Хуелина».`;

    // 1. Benchmark precompiled module-scope WIKI_PATTERN
    const startPrecompiled = process.hrtime.bigint();
    for (let i = 0; i < 2000; i++) {
      renderWikiProse(sampleProse, 'gusev-ferangiy');
    }
    const endPrecompiled = process.hrtime.bigint();
    const durationPrecompiledMs = Number(endPrecompiled - startPrecompiled) / 1e6;

    // 2. Benchmark unoptimized naive approach (re-instantiating RegExp every time)
    function naiveRenderWikiProse(text, currentId) {
      if (!text) return '';
      const escaped = escapeHtml(text);
      const naivePattern = new RegExp(WIKI_ENTITIES.map(e => `(${e.pattern.source})`).join('|'), 'gi');
      return escaped.replace(naivePattern, (...matchArgs) => {
        const matchedText = matchArgs[0];
        for (let i = 0; i < WIKI_ENTITIES.length; i++) {
          if (matchArgs[i + 1] !== undefined) {
            const entity = WIKI_ENTITIES[i];
            if (entity.isPlace) return `<span class="wiki-place-tag">${matchedText}</span>`;
            if (entity.id && entity.id === currentId) return `<strong class="mw-selflink">${matchedText}</strong>`;
            return `<a href="${entity.href}" class="wiki-link wiki-inline-link">${matchedText}</a>`;
          }
        }
        return matchedText;
      });
    }

    const startNaive = process.hrtime.bigint();
    for (let i = 0; i < 2000; i++) {
      naiveRenderWikiProse(sampleProse, 'gusev-ferangiy');
    }
    const endNaive = process.hrtime.bigint();
    const durationNaiveMs = Number(endNaive - startNaive) / 1e6;

    console.log(`      ⚡ Precompiled WIKI_PATTERN (2,000 runs): ${durationPrecompiledMs.toFixed(2)} ms (${(2000 / (durationPrecompiledMs / 1000)).toFixed(0)} ops/sec)`);
    console.log(`      🐢 Naive RegExp creation (2,000 runs):   ${durationNaiveMs.toFixed(2)} ms (${(2000 / (durationNaiveMs / 1000)).toFixed(0)} ops/sec)`);
    const speedup = durationNaiveMs / durationPrecompiledMs;
    console.log(`      🚀 Speedup factor: ${speedup.toFixed(2)}x faster`);

    assert(durationPrecompiledMs < durationNaiveMs, `Precompiled pattern (${durationPrecompiledMs}ms) should be faster than naive (${durationNaiveMs}ms)`);
    assert(durationPrecompiledMs < 200, `Precompiled pattern should execute 2,000 iterations in < 200ms (took ${durationPrecompiledMs}ms)`);
  });

  test('Wiki auto-linking handles edge cases: empty strings, null, undefined', () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const renderWikiProse = env.eval('renderWikiProse');

    assert.strictEqual(renderWikiProse(''), '', 'Empty string must return empty string');
    assert.strictEqual(renderWikiProse(null), '', 'null must return empty string');
    assert.strictEqual(renderWikiProse(undefined), '', 'undefined must return empty string');
    assert.strictEqual(renderWikiProse(0), '', 'falsy 0 must return empty string');
  });

  test('Wiki auto-linking preserves text with no matching entities without corruption', () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const renderWikiProse = env.eval('renderWikiProse');

    const plainText = 'Обычный текст без всяких ключевых слов и упоминаний.';
    const result = renderWikiProse(plainText);
    assert.strictEqual(result, plainText, 'Text without entities must remain unchanged');
  });

  test('Wiki auto-linking handles multiple matching entities in single sentence', () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const renderWikiProse = env.eval('renderWikiProse');

    const multiText = 'Валентин Белинский встретил Гусева Ферангия и Гей Химбиович в Подзалупинске.';
    const result = renderWikiProse(multiText);

    assert(result.includes('href="#character/valentin-belinsky"'), 'Must link to valentin-belinsky');
    assert(result.includes('href="#character/gusev-ferangiy"'), 'Must link to gusev-ferangiy');
    assert(result.includes('href="#character/gey-himbiovech"'), 'Must link to gey-himbiovech');
    assert(result.includes('<span class="wiki-place-tag">Подзалупинске</span>'), 'Must tag Podzalupinsk as place');
  });

  test('Wiki auto-linking declension coverage analysis', () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const renderWikiProse = env.eval('renderWikiProse');

    // Test canonical nominative and genitive cases handled by regex
    const nomGusev = renderWikiProse('Гусев Ферангий');
    assert(nomGusev.includes('href="#character/gusev-ferangiy"'), 'Гусев Ферангий (nom) must link');

    const genGusev = renderWikiProse('Гусева Ферангия');
    assert(genGusev.includes('href="#character/gusev-ferangiy"'), 'Гусева Ферангия (gen) must link');

    const nomGey = renderWikiProse('Гей Химбиович');
    assert(nomGey.includes('href="#character/gey-himbiovech"'), 'Гей Химбиович (nom) must link');

    const altGey = renderWikiProse('Хербиович');
    assert(altGey.includes('href="#character/gey-himbiovech"'), 'Хербиович (alias) must link');

    // Probe oblique cases (dative/instrumental):
    const datGusev = renderWikiProse('Гусеву Ферангию');
    const datGusevLinked = datGusev.includes('href="#character/gusev-ferangiy"');
    console.log(`      ℹ Probe: 'Гусеву Ферангию' auto-linked: ${datGusevLinked ? 'YES' : 'NO (pattern: /Гусев(?:а)?/)'}`);

    const genGey = renderWikiProse('Гея Химбиовича');
    const genGeyLinked = genGey.includes('href="#character/gey-himbiovech"');
    console.log(`      ℹ Probe: 'Гея Химбиовича' auto-linked: ${genGeyLinked ? 'YES' : 'NO (pattern: /Гей(?:я)?/)'}`);
  });

  test('Wiki auto-linking self-link: renders <strong class="mw-selflink"> for currentId', () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const renderWikiProse = env.eval('renderWikiProse');

    const text = 'Гусев Ферангий является лидером картеля.';
    const result = renderWikiProse(text, 'gusev-ferangiy');

    assert(result.includes('<strong class="mw-selflink">Гусев Ферангий</strong>'), 'Self-reference must render as strong.mw-selflink');
    assert(!result.includes('href="#character/gusev-ferangiy"'), 'Must not render anchor link to self');
  });

  test('Wiki auto-linking prevents XSS: escapes <script>, onerror, quotes, tags', () => {
    const env = createBrowserEnvironment({ loadApp: true });
    const renderWikiProse = env.eval('renderWikiProse');
    const viewport = env.document.getElementById('contentViewport');

    const dangerousPayloads = [
      '<script>alert("XSS")</script> Валентин Белинский',
      '<img src=x onerror=alert(1)> Гусев Ферангий',
      '<a href="javascript:alert(1)">Click</a> Гей Химбиович',
      '"><script>alert(document.cookie)</script> Подзалупинск'
    ];

    for (const payload of dangerousPayloads) {
      const result = renderWikiProse(payload);
      assert(!result.includes('<script>'), `Result must not contain unescaped <script>: ${result}`);
      assert(!result.includes('<img'), `Result must not contain unescaped <img: ${result}`);
      assert(!result.includes('<a href="javascript:'), `Result must not contain unescaped anchor tag: ${result}`);
      assert(result.includes('&lt;') && result.includes('&gt;'), 'Dangerous tags must be HTML-escaped');
      assert(result.includes('wiki-link') || result.includes('wiki-place-tag'), 'Valid entities must still be auto-linked');

      // Inject into DOM and verify no executable script, img, or javascript anchor elements are parsed
      viewport.innerHTML = result;
      assert.strictEqual(viewport.querySelector('script'), null, 'No script element created in DOM');
      assert.strictEqual(viewport.querySelector('img'), null, 'No img element created in DOM');
      assert.strictEqual(viewport.querySelector('a[href^="javascript:"]'), null, 'No javascript: link created in DOM');
    }
  });

  // ------------------------------------------------------------------------
  // PART 3: ROUTE HANDLING & DOCUMENT TITLE
  // ------------------------------------------------------------------------
  console.log('\n\x1b[1m\x1b[33m▶ Part 3: Route Handling & Document Title Verification\x1b[0m');

  const routesToTest = [
    { hash: '#home', expectedTitle: '«Во Все Хуёвые» — Энциклопедия криминального Подзалупинска' },
    { hash: '#characters', expectedTitle: 'Персонажи — «Во Все Хуёвые» Wiki' },
    { hash: '#character/valentin-belinsky', expectedTitle: 'Валентин Белинский — «Во Все Хуёвые» Wiki' },
    { hash: '#character/gusev-ferangiy', expectedTitle: 'Гусев Ферангий — «Во Все Хуёвые» Wiki' },
    { hash: '#factions', expectedTitle: 'Группировки — «Во Все Хуёвые» Wiki' },
    { hash: '#faction/gusev-empire', expectedTitle: 'Наркоимперия Гусева Ферангия — «Во Все Хуёвые» Wiki' },
    { hash: '#timeline', expectedTitle: 'Хронология — «Во Все Хуёвые» Wiki' }
  ];

  for (const item of routesToTest) {
    test(`Document title updates correctly on ${item.hash}`, () => {
      const env = createBrowserEnvironment({ initialHash: item.hash });
      assert.strictEqual(env.document.title, item.expectedTitle, `Expected document.title "${item.expectedTitle}", got "${env.document.title}"`);
    });
  }

  test('Direct URL landing on #sec-biography does not leave #contentViewport empty', () => {
    const env = createBrowserEnvironment({ initialHash: '#sec-biography' });
    const viewport = env.document.getElementById('contentViewport');
    assert(viewport !== null, 'contentViewport must exist');
    assert(viewport.children.length > 0, 'contentViewport must have children rendered');
    assert(viewport.innerHTML.trim().length > 0, 'contentViewport innerHTML must not be empty');
    // Check fallback title and breadcrumbs
    assert.strictEqual(env.document.title, '«Во Все Хуёвые» — Энциклопедия криминального Подзалупинска');
  });

  test('Direct URL landing on #sec-trivia does not leave #contentViewport empty', () => {
    const env = createBrowserEnvironment({ initialHash: '#sec-trivia' });
    const viewport = env.document.getElementById('contentViewport');
    assert(viewport !== null, 'contentViewport must exist');
    assert(viewport.children.length > 0, 'contentViewport must have children rendered');
    assert(viewport.innerHTML.trim().length > 0, 'contentViewport innerHTML must not be empty');
  });

  test('In-page anchor jump to #sec-biography keeps existing character article intact', () => {
    const env = createBrowserEnvironment({ initialHash: '#character/valentin-belinsky' });
    const viewport = env.document.getElementById('contentViewport');
    assert(viewport.querySelector('.article-title') !== null, 'Valentin article rendered');

    // Simulate clicking anchor #sec-biography
    env.window.location.hash = '#sec-biography';

    assert(viewport.querySelector('.article-title') !== null, 'Article must not be destroyed by hash change to section');
    assert(viewport.querySelector('#sec-biography') !== null, '#sec-biography section must still be in DOM');
  });

  // ------------------------------------------------------------------------
  // PART 4: TOC NUMBERING
  // ------------------------------------------------------------------------
  console.log('\n\x1b[1m\x1b[33m▶ Part 4: TOC Numbering Stress Testing\x1b[0m');

  test('TOC and section headings have strictly sequential 1, 2, 3... numbering for all canonical characters', () => {
    for (const char of DEFAULT_WIKI_DATA.characters) {
      const env = createBrowserEnvironment({ initialHash: `#character/${char.id}` });
      const viewport = env.document.getElementById('contentViewport');
      const tocList = viewport.querySelector('#tocList');
      assert(tocList !== null, `TOC list must exist for character ${char.id}`);

      const tocItems = tocList.querySelectorAll('li');
      assert(tocItems.length >= 3, `Character ${char.id} must have at least 3 TOC items`);

      const nums = [];
      tocItems.forEach((li, idx) => {
        const numSpan = li.querySelector('.toc-num');
        assert(numSpan !== null, `TOC item ${idx + 1} must have .toc-num in ${char.id}`);
        const n = parseInt(numSpan.textContent.trim(), 10);
        nums.push(n);
      });

      // Verify strictly sequential [1, 2, 3, ...]
      for (let i = 0; i < nums.length; i++) {
        assert.strictEqual(nums[i], i + 1, `TOC numbers for ${char.id} must be strictly sequential: got [${nums.join(', ')}]`);
      }

      // Verify section headings in article match TOC numbering
      const sectionHeadings = viewport.querySelectorAll('.wiki-section-heading .mw-headline-number');
      sectionHeadings.forEach((headingSpan, idx) => {
        const headingNum = parseInt(headingSpan.textContent.replace('.', '').trim(), 10);
        assert.strictEqual(headingNum, idx + 1, `Section heading ${idx + 1} for ${char.id} has incorrect number: ${headingSpan.textContent}`);
      });
    }
  });

  test('TOC Numbering with missing optional sections (no personality, no relationships, no trivia)', () => {
    // We create synthetic characters with missing combinations and test renderCharacterArticle
    const env = createBrowserEnvironment({ loadApp: true });
    const renderCharacterArticle = env.eval('renderCharacterArticle');
    const STATE = env.getState();
    const viewport = env.document.getElementById('contentViewport');

    const testCases = [
      {
        desc: 'Character with NO personality',
        char: {
          id: 'synthetic-no-personality',
          name: 'Без Личности',
          status: 'Жив',
          overview: 'Краткое описание.',
          biography: 'Биография персонажа.',
          relationships: [{ charId: 'valentin-belinsky', type: 'Знакомый' }],
          trivia: ['Факт 1', 'Факт 2']
        },
        expectedSectionCount: 5 // overview, bio, relationships, trivia, categories
      },
      {
        desc: 'Character with NO relationships',
        char: {
          id: 'synthetic-no-rel',
          name: 'Без Отношений',
          status: 'Жив',
          overview: 'Краткое описание.',
          biography: 'Биография персонажа.',
          personality: 'Спокойный характер.',
          trivia: ['Факт 1']
        },
        expectedSectionCount: 5 // overview, bio, personality, trivia, categories
      },
      {
        desc: 'Character with NO trivia',
        char: {
          id: 'synthetic-no-trivia',
          name: 'Без Фактов',
          status: 'Жив',
          overview: 'Краткое описание.',
          biography: 'Биография персонажа.',
          personality: 'Спокойный характер.',
          relationships: [{ charId: 'valentin-belinsky', type: 'Знакомый' }]
        },
        expectedSectionCount: 5 // overview, bio, personality, relationships, categories
      },
      {
        desc: 'Character with NO personality AND NO relationships AND NO trivia',
        char: {
          id: 'synthetic-minimal',
          name: 'Минимальный Персонаж',
          status: 'Жив',
          overview: 'Краткое описание.',
          biography: 'Биография персонажа.'
        },
        expectedSectionCount: 3 // overview, bio, categories
      }
    ];

    for (const tc of testCases) {
      STATE.data.characters.push(tc.char);
      renderCharacterArticle(viewport, tc.char.id);

      const tocList = viewport.querySelector('#tocList');
      assert(tocList !== null, `TOC list must exist for ${tc.desc}`);
      const tocItems = tocList.querySelectorAll('li');
      assert.strictEqual(tocItems.length, tc.expectedSectionCount, `TOC item count mismatch for ${tc.desc}`);

      const nums = [];
      tocItems.forEach(li => {
        const numSpan = li.querySelector('.toc-num');
        nums.push(parseInt(numSpan.textContent.trim(), 10));
      });

      // Verify sequential without gaps or duplicates
      for (let i = 0; i < nums.length; i++) {
        assert.strictEqual(nums[i], i + 1, `${tc.desc}: TOC numbers must be strictly sequential: got [${nums.join(', ')}]`);
      }

      // Verify headings
      const sectionHeadings = viewport.querySelectorAll('.wiki-section-heading .mw-headline-number');
      sectionHeadings.forEach((headingSpan, idx) => {
        const headingNum = parseInt(headingSpan.textContent.replace('.', '').trim(), 10);
        assert.strictEqual(headingNum, idx + 1, `${tc.desc}: Heading number mismatch for section ${idx + 1}`);
      });
    }
  });

  // ------------------------------------------------------------------------
  // SUMMARY
  // ------------------------------------------------------------------------
  console.log('\n\x1b[1m\x1b[36m========================================================================\x1b[0m');
  console.log('\x1b[1m  CHALLENGER 2 TEST EXECUTION SUMMARY\x1b[0m');
  console.log('\x1b[1m\x1b[36m========================================================================\x1b[0m');
  console.log(`  Passed Tests: \x1b[32m${testsPassed}\x1b[0m`);
  console.log(`  Failed Tests: ${testsFailed > 0 ? `\x1b[31m${testsFailed}\x1b[0m` : `\x1b[32m0\x1b[0m`}`);

  if (testsFailed > 0) {
    console.log('\n\x1b[31mFailures:\x1b[0m');
    failures.forEach(f => {
      console.log(`- ${f.name}: ${f.error.message}`);
    });
    process.exit(1);
  } else {
    console.log('\n\x1b[32mALL CHALLENGER 2 TESTS PASSED EMPIRICALLY!\x1b[0m\n');
    process.exit(0);
  }
}

runAll().catch(err => {
  console.error('Fatal error running tests:', err);
  process.exit(1);
});
