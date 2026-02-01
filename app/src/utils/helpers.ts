import { Student, Language, Question } from './types';
import { QUESTION_DB, ROUND_CONFIG } from './data';

export const generateQuestions = (lang: Language, round: number): Question[] => {
    // In a real app, this would be randomized backend logic
    const pool = QUESTION_DB.filter(q => q.language === lang && q.round === round);
    const count = (ROUND_CONFIG[round as keyof typeof ROUND_CONFIG] || ROUND_CONFIG[1]).count;
    // Fill with placeholders if not enough in mock DB
    if (pool.length < count) {
        for (let i = pool.length; i < count; i++) {
            pool.push({
                id: `mock_${lang}_r${round}_${i}`,
                title: `Debug Challenge #${i + 1}`,
                description: 'Fix the logic error in the code below.',
                language: lang,
                round: round,
                buggyCode: lang === 'python' ? `def solve():\n    # Logic error here\n    pass` : `void solve() {\n    // Bug here\n}`,
                correctSnippet: 'solved'
            });
        }
    }
    return pool.slice(0, count);
};

export const mockExecuteCode = (code: string, correctSnippet: string): Promise<{ success: boolean; output: string; score: number }> => {
    return new Promise(resolve => {
        setTimeout(() => {
            // Heuristic Check: Does the code contain the fix?
            // In production this runs in Docker with test cases.
            const isFixed = code.includes(correctSnippet) || code.length !== 0; // Fallback for mock

            if (isFixed) {
                resolve({ success: true, output: 'Test Cases: 5/5 PASSED\nExecution Time: 0.04s', score: 30 });
            } else {
                resolve({ success: false, output: 'Test Cases: 2/5 PASSED\nLogic Error Detected\nOutput mismatch.', score: 15 });
            }
        }, 1500);
    });
};

export const saveState = (student: Student) => {
    localStorage.setItem('contest_state', JSON.stringify(student));
};

export const loadState = (): Student | null => {
    const saved = localStorage.getItem('contest_state');
    return saved ? JSON.parse(saved) : null;
};
