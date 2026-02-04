/**
 * bugInjectionService.js
 * ─────────────────────
 * Takes a correct, working source file and returns a syntactically or
 * semantically mutated "buggy" version based on round difficulty.
 *
 * Round 1: Easy bugs (syntax errors, simple typos)
 * Round 2: Moderate bugs (logic errors, off-by-one)
 * Round 3: Hard bugs (complex logic, array bounds, edge cases)
 */

/* ══════════════════════════════════════════════════════════
   HELPER – pick a random element from an array
   ══════════════════════════════════════════════════════════ */
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/* ══════════════════════════════════════════════════════════
   C  MUTATIONS - EASY (Round 1)
   ══════════════════════════════════════════════════════════ */
const cEasyMutations = [
  {
    name: 'missing semicolon',
    apply(lines) {
      // Remove semicolon from a simple assignment or declaration
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*(int|float|char|double)\s+\w+\s*=\s*[^;]+;/.test(lines[i])) {
          lines[i] = lines[i].replace(/;$/, '');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'swap + and -',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/[a-zA-Z0-9_]\s*\+\s*[a-zA-Z0-9_]/.test(lines[i]) && !/printf|scanf|"/.test(lines[i])) {
          lines[i] = lines[i].replace(/(\w\s*)\+(\s*\w)/, '$1-$2');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'typo in variable name',
    apply(lines) {
      // Find a variable declaration and introduce a typo in its usage
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\s*(int|float|char|double)\s+(\w+)\s*=/);
        if (match) {
          const varName = match[2];
          // Look for usage of this variable in later lines
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes(varName) && !lines[j].includes('=')) {
              lines[j] = lines[j].replace(varName, varName + '1');
              return lines;
            }
          }
        }
      }
      return null;
    }
  },
  {
    name: 'wrong bracket type',
    apply(lines) {
      // Change array brackets to parentheses: arr[i] → arr(i)
      for (let i = 0; i < lines.length; i++) {
        if (/\w+\[i\]/.test(lines[i]) && !/scanf|printf/.test(lines[i])) {
          lines[i] = lines[i].replace(/\[i\]/, '(i)');
          return lines;
        }
      }
      return null;
    }
  }
];

/* ══════════════════════════════════════════════════════════
   C  MUTATIONS - MODERATE (Round 2)
   ══════════════════════════════════════════════════════════ */
const cModerateMutations = [
  {
    name: 'off-by-one in for-loop',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/for\s*\(.*<\s*\w+/.test(lines[i])) {
          lines[i] = lines[i].replace(/(<\s*)(\w+)/, '$1$2 + 1');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong comparison operator',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/if\s*\(.*==/.test(lines[i])) {
          lines[i] = lines[i].replace('==', '!=');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong initial value',
    apply(lines) {
      // Change initialization: int sum = 0; → int sum = 1;
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*(int|float)\s+\w+\s*=\s*0\s*;/.test(lines[i])) {
          lines[i] = lines[i].replace(/=\s*0/, '= 1');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'missing return value',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/return\s+\S+/.test(lines[i]) && !lines[i].includes('return 0')) {
          lines[i] = lines[i].replace(/return\s+\S+/, 'return 0');
          return lines;
        }
      }
      return null;
    }
  }
];

/* ══════════════════════════════════════════════════════════
   C  MUTATIONS - HARD (Round 3)
   ══════════════════════════════════════════════════════════ */
const cHardMutations = [
  {
    name: 'array index out of bounds',
    apply(lines) {
      // arr[i] → arr[i + 1] (will cause out of bounds)
      for (let i = 0; i < lines.length; i++) {
        if (/\w+\[i\]/.test(lines[i]) && !/scanf|printf/.test(lines[i]) && /for/.test(lines[i - 1] || '')) {
          lines[i] = lines[i].replace(/(\w+)\[i\]/, '$1[i + 1]');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong array index',
    apply(lines) {
      // arr[i] → arr[i - 1] (off by one, can cause negative index)
      for (let i = 0; i < lines.length; i++) {
        if (/\w+\[i\]/.test(lines[i]) && !/scanf|printf/.test(lines[i])) {
          lines[i] = lines[i].replace(/(\w+)\[i\]/, '$1[i - 1]');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'complex off-by-one with condition',
    apply(lines) {
      // for (i = 0; i < n; i++) → for (i = 1; i < n; i++)
      for (let i = 0; i < lines.length; i++) {
        if (/for\s*\(\s*\w+\s*=\s*0\s*;/.test(lines[i])) {
          lines[i] = lines[i].replace(/=\s*0\s*;/, '= 1;');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'logic inversion in nested condition',
    apply(lines) {
      // if (a > 0 && b > 0) → if (a > 0 || b > 0)
      for (let i = 0; i < lines.length; i++) {
        if (/if\s*\(.*&&/.test(lines[i])) {
          lines[i] = lines[i].replace('&&', '||');
          return lines;
        }
      }
      return null;
    }
  }
];

/* ══════════════════════════════════════════════════════════
   JAVA MUTATIONS - EASY (Round 1)
   ══════════════════════════════════════════════════════════ */
const javaEasyMutations = [
  {
    name: 'missing semicolon',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/^\s*(int|float|double|String)\s+\w+\s*=\s*[^;]+;/.test(lines[i])) {
          lines[i] = lines[i].replace(/;$/, '');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'swap + and -',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/[a-zA-Z0-9_]\s*\+\s*[a-zA-Z0-9_]/.test(lines[i]) && !/System\.out/.test(lines[i])) {
          lines[i] = lines[i].replace(/(\w\s*)\+(\s*\w)/, '$1-$2');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'typo in variable name',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\s*(int|float|double|String)\s+(\w+)\s*=/);
        if (match) {
          const varName = match[2];
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes(varName) && !lines[j].includes('=')) {
              lines[j] = lines[j].replace(varName, varName + '1');
              return lines;
            }
          }
        }
      }
      return null;
    }
  },
  {
    name: 'wrong bracket type',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/\w+\[i\]/.test(lines[i]) && !/System\.out/.test(lines[i])) {
          lines[i] = lines[i].replace(/\[i\]/, '(i)');
          return lines;
        }
      }
      return null;
    }
  }
];

/* ══════════════════════════════════════════════════════════
   JAVA MUTATIONS - MODERATE (Round 2)
   ══════════════════════════════════════════════════════════ */
const javaModerateMutations = [
  {
    name: 'off-by-one in for-loop',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/for\s*\(.*<\s*\w+/.test(lines[i])) {
          lines[i] = lines[i].replace(/(<\s*)(\w+)/, '$1$2 + 1');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong comparison operator',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/if\s*\(.*==/.test(lines[i])) {
          lines[i] = lines[i].replace('==', '!=');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong array length',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/\.length/.test(lines[i]) && /for/.test(lines[i])) {
          lines[i] = lines[i].replace('.length', '.length - 1');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong return value',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/return\s+\w+\s*[+\-*]/.test(lines[i])) {
          lines[i] = lines[i].replace(/return\s+/, 'return -');
          return lines;
        }
      }
      return null;
    }
  }
];

/* ══════════════════════════════════════════════════════════
   JAVA MUTATIONS - HARD (Round 3)
   ══════════════════════════════════════════════════════════ */
const javaHardMutations = [
  {
    name: 'array index out of bounds',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/\w+\[i\]/.test(lines[i]) && !/System\.out/.test(lines[i]) && /for/.test(lines[i - 1] || '')) {
          lines[i] = lines[i].replace(/(\w+)\[i\]/, '$1[i + 1]');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong array index',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/\w+\[i\]/.test(lines[i]) && !/System\.out/.test(lines[i])) {
          lines[i] = lines[i].replace(/(\w+)\[i\]/, '$1[i - 1]');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'complex off-by-one with condition',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/for\s*\(\s*\w+\s*=\s*0\s*;/.test(lines[i])) {
          lines[i] = lines[i].replace(/=\s*0\s*;/, '= 1;');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'logic inversion in nested condition',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/if\s*\(.*&&/.test(lines[i])) {
          lines[i] = lines[i].replace('&&', '||');
          return lines;
        }
      }
      return null;
    }
  }
];

/* ══════════════════════════════════════════════════════════
   PYTHON MUTATIONS - EASY (Round 1)
   ══════════════════════════════════════════════════════════ */
const pythonEasyMutations = [
  {
    name: 'indentation error',
    apply(lines) {
      // Remove indentation from a line inside a function/loop
      for (let i = 1; i < lines.length; i++) {
        if (/^\s{4,}\w+/.test(lines[i]) && !/def |if |for |while /.test(lines[i])) {
          lines[i] = lines[i].replace(/^\s+/, '');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'swap + and -',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/[a-zA-Z0-9_]\s*\+\s*[a-zA-Z0-9_]/.test(lines[i]) && !/print/.test(lines[i])) {
          lines[i] = lines[i].replace(/(\w\s*)\+(\s*\w)/, '$1-$2');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'typo in variable name',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        const match = lines[i].match(/^\s*(\w+)\s*=/);
        if (match && !/def |if |for |while /.test(lines[i])) {
          const varName = match[1];
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].includes(varName) && !lines[j].includes('=')) {
              lines[j] = lines[j].replace(varName, varName + '1');
              return lines;
            }
          }
        }
      }
      return null;
    }
  },
  {
    name: 'missing colon',
    apply(lines) {
      // Remove colon from if/for/while/def statements
      for (let i = 0; i < lines.length; i++) {
        if (/(if |for |while |def )\w+.*:$/.test(lines[i])) {
          lines[i] = lines[i].replace(/:$/, '');
          return lines;
        }
      }
      return null;
    }
  }
];

/* ══════════════════════════════════════════════════════════
   PYTHON MUTATIONS - MODERATE (Round 2)
   ══════════════════════════════════════════════════════════ */
const pythonModerateMutations = [
  {
    name: 'off-by-one in range',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/range\((\w+)\)/);
        if (m) {
          lines[i] = lines[i].replace(`range(${m[1]})`, `range(${m[1]} + 1)`);
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong comparison operator',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/if\s+.*==/.test(lines[i])) {
          lines[i] = lines[i].replace('==', '!=');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong initial value',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/\w+\s*=\s*0\s*$/.test(lines[i].trim())) {
          lines[i] = lines[i].replace(/=\s*0/, '= 1');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong list method',
    apply(lines) {
      // .append() → .extend()
      for (let i = 0; i < lines.length; i++) {
        if (/\.append\(/.test(lines[i])) {
          lines[i] = lines[i].replace('.append(', '.extend(');
          return lines;
        }
      }
      return null;
    }
  }
];

/* ══════════════════════════════════════════════════════════
   PYTHON MUTATIONS - HARD (Round 3)
   ══════════════════════════════════════════════════════════ */
const pythonHardMutations = [
  {
    name: 'list index out of bounds',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/\w+\[i\]/.test(lines[i]) && !/print/.test(lines[i]) && /for/.test(lines[i - 1] || '')) {
          lines[i] = lines[i].replace(/(\w+)\[i\]/, '$1[i + 1]');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'wrong list index',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/\w+\[i\]/.test(lines[i]) && !/print/.test(lines[i])) {
          lines[i] = lines[i].replace(/(\w+)\[i\]/, '$1[i - 1]');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'complex off-by-one with range',
    apply(lines) {
      // range(0, n) → range(1, n)
      for (let i = 0; i < lines.length; i++) {
        if (/range\(0,/.test(lines[i])) {
          lines[i] = lines[i].replace('range(0,', 'range(1,');
          return lines;
        }
      }
      return null;
    }
  },
  {
    name: 'logic inversion in nested condition',
    apply(lines) {
      for (let i = 0; i < lines.length; i++) {
        if (/if\s+.*and/.test(lines[i])) {
          lines[i] = lines[i].replace(' and ', ' or ');
          return lines;
        }
      }
      return null;
    }
  }
];

/* ══════════════════════════════════════════════════════════
   MAIN EXPORT
   ══════════════════════════════════════════════════════════ */
const DIFFICULTY_MAP = {
  C: {
    1: cEasyMutations,
    2: cModerateMutations,
    3: cHardMutations
  },
  Java: {
    1: javaEasyMutations,
    2: javaModerateMutations,
    3: javaHardMutations
  },
  Python: {
    1: pythonEasyMutations,
    2: pythonModerateMutations,
    3: pythonHardMutations
  }
};

/**
 * injectBug(correctCode, language, round)
 * @param {string} correctCode - The correct, working source code
 * @param {string} language - 'C', 'Java', or 'Python'
 * @param {number} round - 1, 2, or 3 (determines difficulty)
 * @returns {string} – the buggy version of the code
 *
 * Selects mutations based on round difficulty and applies one randomly.
 */
function injectBug(correctCode, language, round = 2) {
  // Get mutations for this language and round
  const mutations = DIFFICULTY_MAP[language]?.[round] || [];

  if (mutations.length === 0) {
    console.warn(`No mutations found for ${language} round ${round}, using default`);
    return correctCode;
  }

  // Shuffle mutations for randomness
  const shuffled = [...mutations];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const lines = correctCode.split('\n');

  // Try each mutation until one applies
  for (const mutation of shuffled) {
    const result = mutation.apply([...lines]);
    if (result !== null) {
      console.log(`Applied bug: ${mutation.name} (Round ${round})`);
      return result.join('\n');
    }
  }

  // Fallback: simple operator swap
  for (let i = 0; i < lines.length; i++) {
    if (/[a-zA-Z0-9_]\s*\+\s*[a-zA-Z0-9_]/.test(lines[i])) {
      lines[i] = lines[i].replace(/(\w\s*)\+(\s*\w)/, '$1-$2');
      console.log(`Applied fallback bug: swap + to - (Round ${round})`);
      return lines.join('\n');
    }
  }

  // Last resort
  return correctCode;
}

module.exports = { injectBug };
