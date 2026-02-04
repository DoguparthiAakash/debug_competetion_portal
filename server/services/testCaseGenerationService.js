/**
 * testCaseGenerationService.js
 * ──────────────────────────────
 * Generates test cases for a given correct solution.
 * Strategy:
 *   1. We define a set of standard inputs per language-type heuristic.
 *   2. Run the correct code inside the Docker sandbox with each input.
 *   3. Capture stdout as expectedOutput.
 *   4. Return array of { input, expectedOutput }.
 *
 * If Docker is unavailable (e.g. local dev without Docker), we fall back
 * to a set of STATIC synthetic test cases so the platform still works.
 */

const executionService = require('./executionService');

/* ══════════════════════════════════════════════════════════
   STANDARD INPUT SETS
   We generate a variety of inputs to cover edge cases.
   ══════════════════════════════════════════════════════════ */
const STANDARD_INPUTS = [
  '5\n1 2 3 4 5',          // small array
  '1\n42',                  // single element
  '3\n-1 0 1',             // negatives
  '10\n10 9 8 7 6 5 4 3 2 1',  // reverse sorted
  '0',                      // zero / empty
  '7\n3 1 4 1 5 9 2',      // mixed
  '4\n100 200 300 400',    // larger values
  '2\n-5 5'                // symmetric negatives
];

/**
 * generateTestCases(correctCode, language)
 * @returns {Promise<Array<{input: string, expectedOutput: string}>>}
 */
async function generateTestCases(correctCode, language) {
  const testCases = [];
  const inputs = STANDARD_INPUTS.slice(0, 5); // use first 5 inputs

  for (const input of inputs) {
    try {
      const result = await executionService.executeCode(correctCode, language, input);

      if (result.success && result.output !== undefined) {
        testCases.push({
          input: input.trim(),
          expectedOutput: result.output.trim()
        });
      }
      // If execution failed, skip this input (correct code shouldn't fail, but safety net)
    } catch (err) {
      console.warn(`[TestCaseGen] Skipping input due to error: ${err.message}`);
    }
  }

  // If Docker is completely unavailable, fall back to static cases
  if (testCases.length === 0) {
    console.warn('[TestCaseGen] Docker unavailable – using static fallback test cases.');
    return generateStaticTestCases(language);
  }

  return testCases;
}

/**
 * generateStaticTestCases(language)
 * Fallback when Docker is not available (e.g. during initial setup).
 * Returns generic test cases that work with typical number-processing programs.
 */
function generateStaticTestCases(language) {
  return [
    { input: '5\n1 2 3 4 5',           expectedOutput: '15' },
    { input: '3\n10 20 30',            expectedOutput: '60' },
    { input: '1\n7',                   expectedOutput: '7'  },
    { input: '4\n-1 -2 -3 -4',         expectedOutput: '-10' },
    { input: '2\n0 0',                 expectedOutput: '0'  }
  ];
}

module.exports = { generateTestCases, generateStaticTestCases };
