export type Language = 'C' | 'Java' | 'Python';
export type ContestStatus = 'REGISTERING' | 'INSTRUCTIONS' | 'ACTIVE' | 'SUBMITTED' | 'TERMINATED';

export interface Student {
    _id?: string;
    fullName: string;
    rollNumber: string;
    collegeName: string;
    department: string;
    yearOfStudy: number;
    email: string;
    language: Language;
    currentRound: number;

    // Backend Specifics
    roundsCompleted: number[];
    scores: {
        round1: number | null;
        round2: number | null;
        round3: number | null;
        [key: string]: number | null | undefined; // Allow loose access
    };
    roundStartedAt: { [key: number]: string | null };
    violationAttempts: number;
    isDisqualified: boolean;

    // Client-side transient state
    contestStatus?: ContestStatus;
    codeCache: { [questionId: string]: string };
    socketId?: string;
    lastSeen?: number;
    submissionTime?: number;
}

export interface Question {
    _id?: string;
    id?: string; // adapt to whatever backend sends (usually _id)
    title: string;
    description: string;
    language: Language;
    round: number;
    buggyCode: string;
    // correctSnippet removed - secure backend doesn't send it
    difficulty?: string; // optional text (easy/medium/hard) if needed
}

export interface LevelConfig {
    [level: number]: { duration: number }; // Duration in minutes
}
