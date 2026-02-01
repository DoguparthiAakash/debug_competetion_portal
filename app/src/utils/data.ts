import { Question, Language } from './types';

// Mock Database of Questions (A small subset for demonstration)
export const QUESTION_DB: Question[] = [
    // ROUND 1 - PYTHON
    {
        id: 'p1_r1_1',
        title: 'Mutable Default Argument',
        description: 'The function `append_to` is supposed to append a value to a list. However, it seems to be sharing state across calls unexpectedly.',
        language: 'python',
        round: 1,
        buggyCode: `def append_to(element, target=[]):\n    target.append(element)\n    return target\n\n# Test\nprint(append_to(1))\nprint(append_to(2)) # Should be [2], but returns [1, 2]`,
        correctSnippet: 'target=None'
    },
    {
        id: 'p1_r1_2',
        title: 'Loop Closure Issue',
        description: 'We are trying to create a list of functions that return their index. All functions represent the last index.',
        language: 'python',
        round: 1,
        buggyCode: `def create_multipliers():\n    return [lambda x: x * i for i in range(5)]\n\nfor m in create_multipliers():\n    print(m(2)) # Expected 0, 2, 4... got 8, 8, 8...`,
        correctSnippet: 'lambda x, i=i'
    },
    {
        id: 'p1_r1_3',
        title: 'Indentation Error',
        description: 'The logic flow is incorrect due to indentation.',
        language: 'python',
        round: 1,
        buggyCode: `def check_status(is_admin, is_active):\n    if is_admin:\n        if is_active:\n            return "Active Admin"\n    else:\n        return "Guest"\n    return "Access Denied" # Unreachable?`,
        correctSnippet: 'return "Access Denied"'
    },
    {
        id: 'p1_r1_4',
        title: 'Off-by-one Range',
        description: 'Process all items in the list.',
        language: 'python',
        round: 1,
        buggyCode: `items = [10, 20, 30]\nfor i in range(len(items) + 1):\n    print(items[i])`,
        correctSnippet: 'range(len(items))'
    },
    // ROUND 1 - C
    {
        id: 'c_r1_1',
        title: 'Array Out of Bounds',
        description: 'Iterate through the array and print values.',
        language: 'c',
        round: 1,
        buggyCode: `#include <stdio.h>\n\nint main() {\n    int arr[5] = {1, 2, 3, 4, 5};\n    for(int i = 0; i <= 5; i++) {\n        printf("%d\\n", arr[i]);\n    }\n    return 0;\n}`,
        correctSnippet: 'i < 5'
    },
    // ROUND 2 - PYTHON
    {
        id: 'p_r2_1',
        title: 'Object Reference Copy',
        description: 'Copying the list didn\'t work as expected.',
        language: 'python',
        round: 2,
        buggyCode: `original = [[1, 2], [3, 4]]\ncopy = list(original)\ncopy[0][0] = 99\nprint(original[0][0]) # Modified original too!`,
        correctSnippet: 'deepcopy'
    },
    // ROUND 3 - PYTHON
    {
        id: 'p_r3_1',
        title: 'Recursion Limit',
        description: 'Infinite recursion in factorial.',
        language: 'python',
        round: 3,
        buggyCode: `def factorial(n):\n    if n == 1:\n        return 1\n    return n * factorial(n)\n\nprint(factorial(5))`,
        correctSnippet: 'n - 1'
    }
];

export const ROUND_CONFIG = {
    1: { name: "Level 1: Novice", count: 3, duration: 30 * 60 },
    2: { name: "Level 2: Apprentice", count: 3, duration: 45 * 60 },
    3: { name: "Level 3: Master", count: 3, duration: 60 * 60 },
};
