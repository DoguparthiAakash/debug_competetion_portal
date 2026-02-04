/**
 * scoringService.js
 * ─────────────────
 * Evaluates a student's submitted code against the hidden test cases
 * stored with the question.
 *
 * Scoring table:
 *   All test cases pass          → 30 pts
 *   Some (but not all) pass      → 15 pts
 *   Runs but all outputs wrong   →  5 pts
 *   Compile / runtime error      →  0 pts
 *
 * Returns { score, verdict, testResults, compileError, runtimeError, executionTimeMs }
 */

const executionService = require('./executionService');

/**
 * scoreSubmission(submittedCode, language, testCases)
 * @param {string}   submittedCode – the student's code
 * @param {string}   language      – 'C' | 'Java' | 'Python'
 * @param {Array}    testCases     – [{ input, expectedOutput }, ...]
 * @returns {Promise<Object>}
 */
async function scoreSubmission(submittedCode, language, testCases) {
  let totalTests   = testCases.length;
  let passedTests  = 0;
  let ranAtAll     = false;           // did at least one test actually execute?
  let testResults  = [];
  let firstCompileError = null;
  let firstRuntimeError = null;
  let totalExecTime = 0;

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const result = await executionService.executeCode(submittedCode, language, tc.input);
    totalExecTime += result.executionTimeMs;

    if (!result.success) {
      // ── Execution failed (compile or runtime error) ──
      if (!firstCompileError && !firstRuntimeError) {
        // Heuristic: if error mentions "error:" or "cannot find symbol" → compile error
        const errMsg = result.error || '';
        if (errMsg.toLowerCase().includes('error') && !errMsg.includes('Runtime')) {
          firstCompileError = errMsg;
        } else {
          firstRuntimeError = errMsg;
        }
      }
      testResults.push({
        testIndex:      i,
        passed:         false,
        actualOutput:   result.error || 'Execution failed',
        expectedOutput: tc.expectedOutput
      });
      continue;
    }

    // ── Execution succeeded – compare output ──
    ranAtAll = true;
    const actual   = (result.output || '').trim();
    const expected = (tc.expectedOutput || '').trim();
    const passed   = actual === expected;

    if (passed) passedTests++;

    testResults.push({
      testIndex:      i,
      passed,
      actualOutput:   actual,
      expectedOutput: expected
    });
  }

  /* ─── Determine verdict & score ─── */
  let verdict, score;

  if (firstCompileError && !ranAtAll) {
    // Never ran successfully
    verdict = 'compile_error';
    score   = 0;
  } else if (firstRuntimeError && passedTests === 0 && !ranAtAll) {
    verdict = 'runtime_error';
    score   = 0;
  } else if (passedTests === totalTests) {
    verdict = 'all_pass';
    score   = 30;
  } else if (passedTests > 0) {
    verdict = 'some_pass';
    score   = 15;
  } else if (ranAtAll) {
    // Ran but all outputs wrong
    verdict = 'wrong_output';
    score   = 5;
  } else {
    // Nothing ran at all
    verdict = firstCompileError ? 'compile_error' : 'runtime_error';
    score   = 0;
  }

  return {
    score,
    verdict,
    testResults,
    compileError:    firstCompileError,
    runtimeError:    firstRuntimeError,
    executionTimeMs: totalExecTime
  };
}

module.exports = { scoreSubmission };
