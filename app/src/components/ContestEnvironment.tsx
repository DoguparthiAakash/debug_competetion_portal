import React, { useState, useEffect } from 'react';
import { useSocket } from '../utils/SocketContext';
import { LogOut, User, Play, Pause, StopCircle, MessageSquare, X } from 'lucide-react';
import { Student, Question, LevelConfig } from '../utils/types';
import { ROUND_CONFIG } from '../utils/data';
import api from '../utils/api';
import { FullScreenGuard } from './FullScreenGuard';
import { handleAdminAuth } from './AdminButton';

interface ContestEnvironmentProps {
    student: Student;
    updateStudent: (s: Student) => void;
    onAdminLogin: () => void;
}
export const ContestEnvironment: React.FC<ContestEnvironmentProps> = ({ student, updateStudent, onAdminLogin }) => {
    const { socket } = useSocket();
    const [questions, setQuestions] = useState<Question[]>([]);
    const [activeQIndex, setActiveQIndex] = useState(0);
    const [code, setCode] = useState('');
    const [output, setOutput] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [contestStatus, setContestStatus] = useState<"active" | "paused" | "ended">("active");
    const [broadcastMsg, setBroadcastMsg] = useState<string | null>(null);
    const [levelConfig, setLevelConfig] = useState<LevelConfig>({
        1: { duration: 30 },
        2: { duration: 45 },
        3: { duration: 60 }
    });

    // Fetch Questions & Config
    useEffect(() => {
        if (!socket) return;

        // Ensure socket is identified (handled in App.tsx generally, but good to ensure)

        socket.emit('get_student_questions');

        const handleQuestions = (qs: Question[]) => {
            console.log("Received questions from server:", qs);
            if (qs && qs.length > 0) {
                // Backend sends assigned questions for current round. No client filtering needed.
                setQuestions(qs);
            }
        };

        const handleLevelConfig = (cfg: LevelConfig) => {
            setLevelConfig(cfg);
        };

        socket.on('student_questions', handleQuestions);
        socket.on('level_config_update', handleLevelConfig);

        return () => {
            socket.off('student_questions', handleQuestions);
            socket.off('level_config_update', handleLevelConfig);
        };
    }, [socket, student.currentRound]);

    // Timer Logic - Updated for Dynamic Config
    useEffect(() => {
        // use level config
        const durationMins = levelConfig[student.currentRound]?.duration || 30;
        const roundDuration = durationMins * 60;

        const now = Date.now();
        const startTime = student.roundStartedAt?.[student.currentRound];

        if (!startTime) {
            // Optimistic update
            const newStartedAt = { ...student.roundStartedAt, [student.currentRound]: new Date(now).toISOString() };
            const newStudent = { ...student, roundStartedAt: newStartedAt };
            updateStudent(newStudent);

            // Allow server to handle truth
            api.post(`/student/${student.rollNumber}/start-round`, { round: student.currentRound })
                .catch(err => console.error("Failed to start round on server", err));

            setTimeLeft(roundDuration);
        } else {
            const startMs = new Date(startTime).getTime();
            const elapsed = Math.floor((now - startMs) / 1000);
            setTimeLeft(Math.max(0, roundDuration - elapsed));
        }
    }, [student.currentRound, student.roundStartedAt, levelConfig]);

    // Load code for active question
    useEffect(() => {
        if (questions.length > 0 && questions[activeQIndex]) {
            const qId = questions[activeQIndex]._id || questions[activeQIndex].id || "";
            // Use codeCache or buggyCode
            setCode(student.codeCache[qId] || questions[activeQIndex].buggyCode);
            setOutput('');
        }
    }, [activeQIndex, questions]);

    // Socket Listeners for Global Events
    useEffect(() => {
        if (!socket) return;

        socket.emit('get_contest_status');

        const handleStatus = (config: any) => {
            if (config && config.status) setContestStatus(config.status);
        };

        const handleBroadcast = (msg: string) => {
            setBroadcastMsg(msg);
            setTimeout(() => setBroadcastMsg(null), 10000);
        };

        socket.on('contest_status', handleStatus);
        socket.on('broadcast_message', handleBroadcast);

        return () => {
            socket.off('contest_status', handleStatus);
            socket.off('broadcast_message', handleBroadcast);
        };
    }, [socket]);

    // Timer Tick
    useEffect(() => {
        if (contestStatus !== 'active') return;

        const interval = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    handleRoundFinish();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [contestStatus]);

    const handleViolation = () => {
        const count = student.violationAttempts + 1; // Updated property name
        alert(`⚠️ VIOLATION DETECTED! (${count}/3)\nExiting fullscreen or switching tabs is prohibited.`);

        // Log violation to backend
        api.post(`/student/${student.rollNumber}/log-violation`, { violationType: 'tab_switch' })
            .then(res => {
                if (res.data.isDisqualified) {
                    updateStudent({ ...student, violationAttempts: count, isDisqualified: true, contestStatus: 'TERMINATED' });
                } else {
                    updateStudent({ ...student, violationAttempts: count });
                }
            })
            .catch(err => console.error("Violation log failed", err));

        // Optimistic update
        if (count >= 3) {
            updateStudent({ ...student, violationAttempts: count, contestStatus: 'TERMINATED' });
        } else {
            updateStudent({ ...student, violationAttempts: count });
        }
    };

    const handleRun = async () => {
        setIsRunning(true);
        const q = questions[activeQIndex];
        const qId = q._id || q.id || "";

        // Save Code to Cache
        const newCache = { ...student.codeCache, [qId]: code };

        try {
            // Execute on Backend (using Docker)
            const res = await api.post(`/student/${student.rollNumber}/submit`, {
                questionId: qId,
                submittedCode: code,
                round: student.currentRound
            });

            if (res.data.success) {
                const { score, verdict, testResults, compileError, runtimeError } = res.data;

                let outputMsg = "";
                if (compileError) outputMsg += `COMPILATION ERROR:\n${compileError}\n`;
                if (runtimeError) outputMsg += `RUNTIME ERROR:\n${runtimeError}\n`;

                if (testResults) {
                    outputMsg += `\nVERDICT: ${verdict}\nSCORE: ${score}\n\n`;
                    testResults.forEach((t: any, i: number) => {
                        outputMsg += `Test Case ${i + 1}: ${t.passed ? 'PASSED' : 'FAILED'}\n`;
                        if (!t.passed && t.actualOutput) outputMsg += `  Output: ${t.actualOutput}\n`;
                    });
                }

                setOutput(outputMsg);

                // Update Local Score State (Optional, waiting for round completion to sync total)
                // We can update the map if we want to show per-question progress
                // But student.scores is per-round in new type. 
                // We might need a transient 'questionScores' field in student or just local state?
                // For now, let's just keep the code cache updated. The total score updates on round completion.
                updateStudent({ ...student, codeCache: newCache });
            } else {
                setOutput(`Error: ${res.data.message}`);
                updateStudent({ ...student, codeCache: newCache });
            }
        } catch (error: any) {
            setOutput(`Error executing code: ${error.message}`);
            updateStudent({ ...student, codeCache: newCache });
        } finally {
            setIsRunning(false);
        }
    };


    const handleRoundFinish = () => {
        // Call API to complete round
        api.post(`/student/${student.rollNumber}/complete-round`, { round: student.currentRound })
            .then(res => {
                if (res.data.success) {
                    const { nextRound, contestComplete } = res.data;
                    if (nextRound) {
                        updateStudent({ ...student, currentRound: nextRound });
                    } else if (contestComplete) {
                        updateStudent({ ...student, contestStatus: 'SUBMITTED', submissionTime: Date.now() });
                    }
                }
            })
            .catch(err => console.error("Complete round failed", err));
    };

    const activeQ = questions[activeQIndex];

    if (!activeQ) return <div className="p-10 text-white">Loading Assessment Environment...</div>;

    const activeQId = activeQ._id || activeQ.id || "";

    return (

        <div className="flex flex-col h-screen bg-black text-slate-300 font-sans selection:bg-blue-500/30">
            <FullScreenGuard isActive={true} onViolation={handleViolation} />

            {/* Global Overlay for Pause/End */}
            {contestStatus !== 'active' && (
                <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center text-center p-8">
                    {contestStatus === 'paused' ? (
                        <>
                            <div className="animate-pulse mb-8">
                                <Pause size={64} className="text-amber-500 mx-auto mb-4" />
                                <h1 className="text-4xl font-bold text-amber-500">CONTEST PAUSED</h1>
                            </div>
                            <p className="text-slate-400 text-xl max-w-lg leading-relaxed">
                                The contest is securely paused. Your work is safe. Please wait for the administrator.
                            </p>
                        </>
                    ) : (
                        <>
                            <StopCircle size={64} className="text-red-500 mx-auto mb-4" />
                            <h1 className="text-4xl font-bold text-red-500 mb-4">CONTEST ENDED</h1>
                            <p className="text-slate-400 text-xl max-w-lg mb-8">
                                The session has concluded. Thank you for participating.
                            </p>
                            <button onClick={handleRoundFinish} className="bg-zinc-800 hover:bg-zinc-700 text-white px-8 py-3 rounded-lg font-bold transition-all border border-zinc-700">
                                View Results
                            </button>
                        </>
                    )}

                    <button
                        onClick={() => handleAdminAuth(onAdminLogin)}
                        className="absolute top-4 right-4 text-slate-600 hover:text-slate-400 p-2"
                    >
                        <User size={20} />
                    </button>
                </div>
            )}

            {/* Broadcast Toast */}
            {broadcastMsg && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white pl-6 pr-4 py-4 rounded-xl shadow-2xl flex items-start gap-4 animate-bounce-in max-w-xl border border-blue-400/20 w-11/12 md:w-auto">
                    <MessageSquare size={20} className="shrink-0 mt-1" />
                    <div className="flex-1">
                        <div className="text-[10px] font-bold uppercase opacity-75 mb-1 tracking-wider">Admin Broadcast</div>
                        <div className="text-md font-medium leading-snug">{broadcastMsg}</div>
                    </div>
                    <button onClick={() => setBroadcastMsg(null)} className="opacity-60 hover:opacity-100 p-1"><X size={16} /></button>
                </div>
            )}

            {/* Top Bar */}
            <div className="h-16 bg-zinc-900/50 backdrop-blur border-b border-zinc-800 flex items-center justify-between px-6 z-10">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/20">
                            <span className="font-bold text-white text-lg">H</span>
                        </div>
                        <div>
                            <div className="font-bold text-white leading-none">Bug Hunters</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-1">KANAL 2K26</div>
                        </div>
                    </div>
                    <div className="h-8 w-px bg-zinc-800 mx-2 hidden md:block"></div>
                    <div className="hidden md:flex items-center gap-3">
                        <div className="bg-zinc-800 text-xs px-3 py-1.5 rounded-md font-mono text-zinc-400 border border-zinc-700/50">
                            {ROUND_CONFIG[student.currentRound as keyof typeof ROUND_CONFIG]?.name || `Round ${student.currentRound}`}
                        </div>
                        <div className="text-zinc-500 text-xs font-mono uppercase tracking-wider">{student.rollNumber}</div>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`text-3xl font-mono font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-br ${timeLeft < 300 ? 'from-red-400 to-red-600 animate-pulse' : 'from-emerald-400 to-emerald-600'}`}>
                        {Math.floor(timeLeft / 60).toString().padStart(2, '0')}<span className="text-zinc-600 mx-1">:</span>{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                    <div className="flex gap-3">
                        <button onClick={handleRoundFinish} className="bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all">
                            {student.currentRound < 3 ? 'NEXT ROUND' : 'FINISH EXAM'} <LogOut size={14} />
                        </button>
                        <button
                            onClick={() => handleAdminAuth(onAdminLogin)}
                            className="w-9 h-9 flex items-center justify-center rounded-lg bg-zinc-800 hover:bg-zinc-700 text-slate-400 hover:text-white transition-colors border border-zinc-700"
                            title="Admin"
                        >
                            <User size={16} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-72 bg-black border-r border-zinc-800 flex flex-col">
                    <div className="p-5 text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex justify-between items-center border-b border-zinc-900">
                        Challenge Set
                        <span className="bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-800">
                            L{student.currentRound}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {questions.map((q, idx) => {
                            const qId = q._id || q.id || "";
                            const isActive = activeQIndex === idx;
                            return (
                                <button
                                    key={qId}
                                    onClick={() => setActiveQIndex(idx)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group ${isActive
                                        ? 'bg-zinc-900 border-zinc-700 shadow-sm'
                                        : 'bg-transparent border-transparent hover:bg-zinc-900/50'
                                        }`}
                                >
                                    <div className={`text-xs font-bold uppercase tracking-wider mb-2 ${isActive ? 'text-blue-500' : 'text-zinc-600'}`}>Problem {idx + 1}</div>
                                    <div className={`text-sm font-medium truncate mb-1 ${isActive ? 'text-white' : 'text-zinc-400 group-hover:text-zinc-200'}`}>{q.title}</div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0 bg-zinc-950/30">
                    {/* Question Desc */}
                    <div className="h-1/3 bg-black border-b border-zinc-800 p-8 overflow-y-auto">
                        <h2 className="text-2xl font-bold text-white mb-4 tracking-tight">{activeQ.title}</h2>
                        <div className="prose prose-invert prose-sm max-w-none text-zinc-400">
                            <p>{activeQ.description}</p>
                        </div>
                    </div>

                    {/* Editor & Console */}
                    <div className="flex-1 flex min-h-0 bg-[#1e1e1e]">
                        <div className="flex-1 flex flex-col border-r border-zinc-800 bg-[#1e1e1e]">
                            <div className="bg-[#1e1e1e] p-2 px-4 text-xs text-zinc-500 flex justify-between items-center border-b border-zinc-800/50">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-blue-500/50"></span>
                                    <span className="font-mono">main.{student.language === 'python' ? 'py' : student.language}</span>
                                </div>
                                <span className="opacity-50">Auto-save enabled</span>
                            </div>
                            <textarea
                                className="code-editor flex-1 bg-[#1e1e1e] text-zinc-300 p-6 outline-none resize-none text-sm font-mono leading-relaxed selection:bg-blue-500/30 focus:bg-[#1e1e1e]"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                spellCheck={false}
                            />
                        </div>

                        <div className="w-[400px] bg-black border-l border-zinc-800 flex flex-col">
                            <div className="p-3 px-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
                                <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Console Output</span>
                                <button
                                    onClick={handleRun}
                                    disabled={isRunning}
                                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-900/20"
                                >
                                    {isRunning ? 'RUNNING...' : 'EXECUTE'} <Play size={10} fill="currentColor" />
                                </button>
                            </div>
                            <div className="flex-1 p-4 overflow-auto font-mono text-xs">
                                {output ? (
                                    <pre className="text-zinc-300 whitespace-pre-wrap">{output}</pre>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                                        <div className="w-8 h-8 rounded-full border border-zinc-800 flex items-center justify-center">
                                            <Play size={12} fill="currentColor" className="opacity-50" />
                                        </div>
                                        <span>Ready to execute</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
