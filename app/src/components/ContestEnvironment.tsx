import React, { useState, useEffect } from 'react';
import { useSocket } from '../utils/SocketContext';
import { LogOut, User, Play, Pause, StopCircle, MessageSquare, X } from 'lucide-react';
import { Student, Question } from '../utils/types';
import { ROUND_CONFIG } from '../utils/data';
import { generateQuestions, mockExecuteCode } from '../utils/helpers';
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

    // Initialize Round
    useEffect(() => {
        const qs = generateQuestions(student.language, student.currentRound);
        setQuestions(qs);

        // Set timer based on config, account for elapsed time if reload
        const roundDuration = (ROUND_CONFIG[student.currentRound as keyof typeof ROUND_CONFIG] || ROUND_CONFIG[1]).duration;
        const now = Date.now();

        if (!student.roundStartTime) {
            const newStudent = { ...student, roundStartTime: now };
            updateStudent(newStudent);
            setTimeLeft(roundDuration);
        } else {
            const elapsed = Math.floor((now - student.roundStartTime) / 1000);
            setTimeLeft(Math.max(0, roundDuration - elapsed));
        }
    }, [student.currentRound]);

    // Load code for active question
    useEffect(() => {
        if (questions.length > 0) {
            const qId = questions[activeQIndex].id;
            setCode(student.codeCache[qId] || questions[activeQIndex].buggyCode);
            setOutput('');
        }
    }, [activeQIndex, questions]);

    // Keep ref to student for socket callbacks to avoid dependency cycles
    const studentRef = React.useRef(student);
    useEffect(() => { studentRef.current = student; }, [student]);

    // Ensure server knows about us (Re-register on mount/reconnect)
    useEffect(() => {
        if (!socket) return;

        const register = () => {
            console.log('Registering/Re-registering student with server...');
            socket.emit('register_student', studentRef.current);
        };

        // Register immediately on mount (in case we loaded from local storage)
        if (socket.connected) register();

        // Register on reconnect (in case server restarted)
        socket.on('connect', register);

        return () => {
            socket.off('connect', register);
        };
    }, [socket]);

    // Socket Listeners for Global Events
    useEffect(() => {
        if (!socket) return;

        // Get initial status
        socket.emit('get_contest_status');

        const handleStatus = (config: any) => {
            if (config && config.status) setContestStatus(config.status);
        };

        const handleBroadcast = (msg: string) => {
            setBroadcastMsg(msg);
            // Auto hide after 10 seconds?
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
        if (contestStatus !== 'active') return; // Pause timer locally if global pause

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
        const count = student.violationCount + 1;
        alert(`⚠️ VIOLATION DETECTED! (${count}/3)\nExiting fullscreen or switching tabs is prohibited.`);

        if (count > 3) {
            updateStudent({ ...student, violationCount: count, contestStatus: 'TERMINATED' });
        } else {
            updateStudent({ ...student, violationCount: count });
        }
    };

    const handleRun = async () => {
        setIsRunning(true);
        const q = questions[activeQIndex];

        // Save Code
        const newCache = { ...student.codeCache, [q.id]: code };

        const result = await mockExecuteCode(code, q.correctSnippet);
        setOutput(result.output);

        // Update Score
        const newScores = { ...student.scores, [q.id]: result.score };
        updateStudent({ ...student, codeCache: newCache, scores: newScores });
        setIsRunning(false);
    };

    const handleRoundFinish = () => {
        if (student.currentRound < 3) {
            // Go to next round
            // IMPORTANT: Reset roundStartTime to null so the effect triggers a new timer start
            updateStudent({ ...student, currentRound: student.currentRound + 1, roundStartTime: null });
        } else {
            // Finish Exam
            updateStudent({ ...student, contestStatus: 'SUBMITTED', roundStartTime: null, submissionTime: Date.now() });
        }
    };

    const activeQ = questions[activeQIndex];

    if (!activeQ) return <div className="p-10 text-white">Loading Assessment Environment...</div>;

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-slate-300">
            <FullScreenGuard isActive={true} onViolation={handleViolation} />

            {/* Global Overlay for Pause/End */}
            {contestStatus !== 'active' && (
                <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center text-center p-8">
                    {contestStatus === 'paused' ? (
                        <>
                            <div className="animate-pulse mb-8">
                                <Pause size={64} className="text-amber-500 mx-auto mb-4" />
                                <h1 className="text-4xl font-bold text-amber-500">CONTEST PAUSED</h1>
                            </div>
                            <p className="text-slate-400 text-xl max-w-lg">
                                The admin has paused the contest securely. Your timer and work are preserved. Please wait for the contest to resume.
                            </p>
                        </>
                    ) : (
                        <>
                            <StopCircle size={64} className="text-red-500 mx-auto mb-4" />
                            <h1 className="text-4xl font-bold text-red-500 mb-4">CONTEST ENDED</h1>
                            <p className="text-slate-400 text-xl max-w-lg">
                                The contest has been ended by the administrator. Thank you for participating.
                            </p>
                            <button onClick={handleRoundFinish} className="mt-8 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded font-bold">
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
                <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-blue-600 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 animate-bounce-in max-w-2xl border-2 border-white/20">
                    <MessageSquare size={24} className="shrink-0" />
                    <div>
                        <div className="text-xs font-bold uppercase opacity-75 mb-1">Admin Broadcast</div>
                        <div className="text-lg font-medium">{broadcastMsg}</div>
                    </div>
                    <button onClick={() => setBroadcastMsg(null)} className="ml-4 opacity-75 hover:opacity-100"><X size={18} /></button>
                </div>
            )}

            {/* Top Bar */}
            <div className="h-16 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-6 shadow-md z-10">
                <div className="flex items-center gap-4">
                    <div className="bg-blue-600 text-white px-3 py-1 rounded font-bold text-sm">VSB DEBUGGING CONTEST</div>
                    <div className="hidden md:block bg-slate-700 text-blue-400 px-3 py-1 rounded font-bold text-xs border border-slate-600 uppercase tracking-wider">
                        {ROUND_CONFIG[student.currentRound as keyof typeof ROUND_CONFIG]?.name || `Round ${student.currentRound}`}
                    </div>
                    <div className="text-slate-400 text-sm hidden sm:block">| {student.rollNumber}</div>
                </div>

                <div className="flex items-center gap-6">
                    <div className={`text-2xl font-mono font-bold tracking-widest ${timeLeft < 300 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`}>
                        {Math.floor(timeLeft / 60).toString().padStart(2, '0')}:{(timeLeft % 60).toString().padStart(2, '0')}
                    </div>
                    <button onClick={handleRoundFinish} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm font-bold flex items-center gap-2">
                        {student.currentRound < 3 ? 'NEXT ROUND' : 'FINISH EXAM'} <LogOut size={14} />
                    </button>
                    <button
                        onClick={() => handleAdminAuth(onAdminLogin)}
                        className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                        title="Admin"
                    >
                        <User size={16} />
                    </button>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar */}
                <div className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                    <div className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider flex justify-between items-center">
                        Problem Set
                        <span className="text-[10px] bg-slate-800 text-slate-400 px-1 rounded border border-slate-700">
                            L{student.currentRound}
                        </span>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {questions.map((q, idx) => {
                            const score = student.scores[q.id];
                            return (
                                <button
                                    key={q.id}
                                    onClick={() => setActiveQIndex(idx)}
                                    className={`w-full text-left p-4 border-l-4 transition-colors ${activeQIndex === idx
                                        ? 'bg-slate-800 border-blue-500 text-white'
                                        : 'border-transparent hover:bg-slate-800'
                                        }`}
                                >
                                    <div className="text-sm font-bold truncate mb-1">Q{idx + 1}: {q.title}</div>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="text-slate-500">30 Points</span>
                                        {score !== undefined && (
                                            <span className={`px-2 py-0.5 rounded ${score === 30 ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}`} >
                                                {score} pts
                                            </span>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 flex flex-col min-w-0">
                    {/* Question Desc */}
                    <div className="h-1/3 bg-slate-800 p-6 overflow-y-auto border-b border-slate-700">
                        <h2 className="text-xl font-bold text-white mb-2">{activeQ.title}</h2>
                        <p className="text-slate-300 leading-relaxed">{activeQ.description}</p>
                    </div>

                    {/* Editor & Console */}
                    <div className="flex-1 flex min-h-0">
                        <div className="flex-1 flex flex-col border-r border-slate-700">
                            <div className="bg-slate-900 p-2 text-xs text-slate-500 flex justify-between">
                                <span>main.{student.language === 'python' ? 'py' : student.language}</span>
                                <span>Auto-saved</span>
                            </div>
                            <textarea
                                className="code-editor flex-1 bg-[#1e1e1e] text-slate-200 p-4 outline-none resize-none text-sm leading-6"
                                value={code}
                                onChange={e => setCode(e.target.value)}
                                spellCheck={false}
                            />
                        </div>

                        <div className="w-1/3 bg-[#0d0d0d] flex flex-col font-mono text-sm">
                            <div className="p-3 border-b border-slate-800 flex justify-between items-center">
                                <span className="text-slate-400">Console Output</span>
                                <button
                                    onClick={handleRun}
                                    disabled={isRunning}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white px-4 py-1 rounded text-xs font-bold flex items-center gap-1"
                                >
                                    {isRunning ? 'EXECUTING...' : 'RUN CODE'} <Play size={12} fill="currentColor" />
                                </button>
                            </div>
                            <div className="flex-1 p-4 text-slate-300 overflow-auto whitespace-pre-wrap">
                                {output || <span className="text-slate-600 italic">// Run code to see output...</span>}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
