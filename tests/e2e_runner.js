#!/usr/bin/env node
/**
 * Automated Headless E2E Test Runner
 * Project: «Во Все Хуёвые» Wiki
 * 
 * Executes:
 * - tests/tier1_features.test.js  (18 features × ≥5 assertions)
 * - tests/tier2_boundaries.test.js (≥50 boundary & error assertions)
 * - tests/tier3_interactions.test.js (≥25 pairwise cross-feature assertions)
 * - tests/tier4_scenarios.test.js (5 full real-world user scenario flows)
 * 
 * Reports detailed assertion results, distinguishes execution errors vs assertion failures,
 * and exits with code 0 on all pass, 1 on fail.
 */

const { globalReporter } = require('./test_harness');
const { runTier1Tests } = require('./tier1_features.test');
const { runTier2Tests } = require('./tier2_boundaries.test');
const { runTier3Tests } = require('./tier3_interactions.test');
const { runTier4Tests } = require('./tier4_scenarios.test');

const ANSI = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

async function main() {
  const startTime = Date.now();
  console.log(`${ANSI.bold}${ANSI.cyan}========================================================================${ANSI.reset}`);
  console.log(`${ANSI.bold}  «Во Все Хуёвые» Wiki — Automated Headless E2E Test Suite${ANSI.reset}`);
  console.log(`${ANSI.dim}  Node: ${process.version} | Runner: Standalone JSDOM/Node.js VM Harness${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}========================================================================${ANSI.reset}\n`);

  const tiers = [
    { name: 'Tier 1: Feature-by-Feature Verification (18 Features)', runner: runTier1Tests },
    { name: 'Tier 2: Boundary Value Analysis & Error Handling', runner: runTier2Tests },
    { name: 'Tier 3: Cross-Feature Pairwise Interactions', runner: runTier3Tests },
    { name: 'Tier 4: Real-World End-to-End User Scenarios', runner: runTier4Tests }
  ];

  const tierStats = [];

  for (const tier of tiers) {
    console.log(`${ANSI.bold}${ANSI.blue}▶ Running ${tier.name}...${ANSI.reset}`);
    const tierStartAssertions = globalReporter.totalAssertions;
    const tierStartFailedAssertions = globalReporter.failedAssertions;
    const initialSuiteCount = globalReporter.suites.length;

    let tierError = null;
    try {
      await tier.runner(globalReporter);
    } catch (e) {
      tierError = e;
      console.error(`${ANSI.red}${ANSI.bold}[FRAMEWORK/RUNNER ERROR IN ${tier.name}]${ANSI.reset}`, e);
    }

    const tierSuites = globalReporter.suites.slice(initialSuiteCount);
    const tierTests = tierSuites.flatMap(s => s.tests);
    const tierPassedTests = tierTests.filter(t => t.passed).length;
    const tierFailedTests = tierTests.filter(t => !t.passed).length;
    const tierTotalAssertions = globalReporter.totalAssertions - tierStartAssertions;
    const tierFailedAssertions = globalReporter.failedAssertions - tierStartFailedAssertions;
    const tierPassedAssertions = tierTotalAssertions - tierFailedAssertions;

    tierStats.push({
      name: tier.name,
      suitesCount: tierSuites.length,
      totalTests: tierTests.length,
      passedTests: tierPassedTests,
      failedTests: tierFailedTests,
      totalAssertions: tierTotalAssertions,
      passedAssertions: tierPassedAssertions,
      failedAssertions: tierFailedAssertions,
      hasError: Boolean(tierError)
    });

    for (const suite of tierSuites) {
      const suiteStatus = suite.passed ? `${ANSI.green}✓ PASS${ANSI.reset}` : `${ANSI.red}✗ FAIL${ANSI.reset}`;
      console.log(`  ${suiteStatus} ${ANSI.bold}${suite.name}${ANSI.reset} ${ANSI.dim}(${suite.duration}ms)${ANSI.reset}`);
      for (const test of suite.tests) {
        if (test.passed) {
          console.log(`    ${ANSI.green}✓${ANSI.reset} ${ANSI.gray}${test.name}${ANSI.reset}`);
        } else {
          console.log(`    ${ANSI.red}✗ ${test.name}${ANSI.reset}`);
          for (const assertion of test.assertions) {
            if (!assertion.passed) {
              console.log(`      ${ANSI.red}↳ Assertion Failed:${ANSI.reset} ${assertion.message}`);
              if (assertion.expected !== undefined && assertion.actual !== undefined) {
                const expStr = String(JSON.stringify(assertion.expected));
                const actStr = String(JSON.stringify(assertion.actual));
                const formatVal = (s) => (s.length > 80 ? s.slice(0, 80) + '... (truncated)' : s);
                console.log(`        ${ANSI.dim}Expected:${ANSI.reset} ${formatVal(expStr)}`);
                console.log(`        ${ANSI.dim}Actual:  ${ANSI.reset} ${formatVal(actStr)}`);
              }
            }
          }
          if (test.error) {
            console.log(`      ${ANSI.red}↳ Unhandled Error:${ANSI.reset} ${test.error.message || test.error}`);
          }
        }
      }
    }
    console.log();
  }

  const totalDuration = Date.now() - startTime;
  const grandTotalTests = tierStats.reduce((acc, t) => acc + t.totalTests, 0);
  const grandPassedTests = tierStats.reduce((acc, t) => acc + t.passedTests, 0);
  const grandFailedTests = tierStats.reduce((acc, t) => acc + t.failedTests, 0);
  const grandTotalAssertions = globalReporter.totalAssertions;
  const grandPassedAssertions = globalReporter.passedAssertions;
  const grandFailedAssertions = globalReporter.failedAssertions;

  console.log(`${ANSI.bold}${ANSI.cyan}========================================================================${ANSI.reset}`);
  console.log(`${ANSI.bold}  TEST SUITE EXECUTION SUMMARY${ANSI.reset}`);
  console.log(`${ANSI.bold}${ANSI.cyan}========================================================================${ANSI.reset}`);
  console.log(`  Total Execution Time: ${totalDuration} ms`);
  console.log(`  Total Suites:         ${globalReporter.suites.length}`);
  console.log(`  Total Tests:          ${grandTotalTests}`);
  console.log(`  Passed Tests:         ${ANSI.green}${grandPassedTests}${ANSI.reset}`);
  console.log(`  Failed Tests:         ${grandFailedTests > 0 ? ANSI.red : ANSI.green}${grandFailedTests}${ANSI.reset}`);
  console.log(`  Total Assertions:     ${grandTotalAssertions}`);
  console.log(`  Passed Assertions:    ${ANSI.green}${grandPassedAssertions}${ANSI.reset}`);
  console.log(`  Failed Assertions:    ${grandFailedAssertions > 0 ? ANSI.red : ANSI.green}${grandFailedAssertions}${ANSI.reset}`);
  console.log('------------------------------------------------------------------------');

  console.log(`${ANSI.bold}Tier Breakdown:${ANSI.reset}`);
  for (let i = 0; i < tierStats.length; i++) {
    const ts = tierStats[i];
    const tierColor = ts.failedTests === 0 ? ANSI.green : ANSI.yellow;
    console.log(`  ${tierColor}Tier ${i + 1}:${ANSI.reset} ${ts.name}`);
    console.log(`    Tests:      ${ts.passedTests} / ${ts.totalTests} passed`);
    console.log(`    Assertions: ${ts.passedAssertions} / ${ts.totalAssertions} passed (${ts.failedAssertions} failed)`);
  }
  console.log(`${ANSI.bold}${ANSI.cyan}========================================================================${ANSI.reset}\n`);

  const allPassed = grandFailedTests === 0 && grandFailedAssertions === 0;

  if (allPassed) {
    console.log(`${ANSI.bold}${ANSI.green}ALL E2E TESTS PASSED SUCCESSFULLY! (100% Pass Rate)${ANSI.reset}\n`);
    process.exit(0);
  } else {
    console.log(`${ANSI.bold}${ANSI.yellow}TEST RUN FINISHED WITH FAILURES${ANSI.reset}`);
    console.log(`${ANSI.dim}Note: On the unoptimized codebase (Milestone M0), feature assertion failures are expected for features planned in M1-M3.`);
    console.log(`The test runner executed cleanly and distinguished framework execution vs feature assertion failures.${ANSI.reset}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal Runner Crash:', err);
    process.exit(2);
  });
}

module.exports = { main };
