export type Language = 'c' | 'java' | 'python';
export type ContestStatus = 'REGISTERING' | 'INSTRUCTIONS' | 'ACTIVE' | 'SUBMITTED' | 'TERMINATED';

export interface Student {
    fullName: string;
    rollNumber: string;
    college: string;
    department: string;
    year: string;
    email: string;
    language: Language;
    currentRound: number;
    contestStatus: ContestStatus;
    violationCount: number;
    scores: { [questionId: string]: number };
    codeCache: { [questionId: string]: string };
    roundStartTime: number | null;
    socketId?: string;
    lastSeen?: number;
    submissionTime?: number;
}

export interface Question {
    id: string;
    title: string;
    description: string;
    language: Language;
    round: number;
    buggyCode: string;
    correctSnippet: string; // Used for heuristic checking in this simulation
}
