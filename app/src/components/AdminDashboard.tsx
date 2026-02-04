import React, { useRef, useState, useEffect } from 'react';
import { User, LogOut, Unlock, FileSpreadsheet, Trash2, XCircle, Code, Clock, ArrowRight, ArrowLeft, Download, Upload, AlertOctagon, Edit, Save, X, Radio, MessageSquare, Pause, Play, StopCircle, Info, Calendar } from 'lucide-react';
import { Student } from '../utils/types';
import { useSocket } from '../utils/SocketContext';
import api from '../utils/api';

interface AdminDashboardProps {
    student: Student | null;
    onExit: () => void;
    onReset: () => void;
    onUnlock: () => void;
    onUpdateStudent: (s: Student) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ student: localStudent, onExit, onReset, onUnlock, onUpdateStudent }) => {
    const { socket } = useSocket();
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [contestStatus, setContestStatus] = useState<"active" | "paused" | "ended">("active");
    const [broadcastMsg, setBroadcastMsg] = useState("");
    const [selectedRollNumber, setSelectedRollNumber] = useState<string | null>(localStudent?.rollNumber || null);
    const [viewCodeId, setViewCodeId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState<Partial<Student>>({});
    const [showFullDetails, setShowFullDetails] = useState(false);

    const fetchDashboard = async () => {
        try {
            const res = await api.get('/admin/dashboard');
            if (res.data.success) {
                // Map backend student to frontend student type if needed
                // The backend returns a summary dashboard structure.
                // We might need to fetch detailed student list or adapt.
                // adminRoutes: /dashboard returns { dashboard: [...] } with summary fields.
                // But we need 'codeCache' etc for inspector. 
                // Let's modify adminRoutes to return full objects or add a new endpoint?
                // For now, let's assume /dashboard returned summary, but we need full data for inspector.
                // Actually, relying on socket for live updates is fine, but initial load should be robust.
                // Let's rely on socket for 'all_students' for now as it sends full objects?
                // Wait, server.js emits 'all_students' with `await Student.find({})`. That sends full objects.
                // So socket is fine for fetching full data!
                // But let's add an explicit fetch via API for robustness.
                // I'll stick to Socket for 'all_students' as per original design, but use API for actions.
            }
        } catch (error) {
            console.error(error);
        }
    };

    // Sync All Students
    useEffect(() => {
        if (!socket) return;
        socket.emit('admin_login');

        const handleAll = (students: Student[]) => setAllStudents(students);
        const handleUpdate = (updated: Student) => {
            setAllStudents(prev => {
                const idx = prev.findIndex(s => s.rollNumber === updated.rollNumber);
                if (idx > -1) {
                    const newArr = [...prev];
                    newArr[idx] = updated;
                    return newArr;
                }
                return [...prev, updated];
            });
        };
        const handleContestStatus = (config: any) => {
            if (config?.status) setContestStatus(config.status);
        };

        socket.on('all_students', handleAll);
        socket.on('student_update', handleUpdate);
        socket.on('contest_status', handleContestStatus);

        return () => {
            socket.off('all_students', handleAll);
            socket.off('student_update', handleUpdate);
            socket.off('contest_status', handleContestStatus);
        };
    }, [socket]);

    // Handle updates via API
    const handleUpdateStudent = async (id: string, updates: Partial<Student>) => {
        try {
            // Optimistic update
            setAllStudents(prev => prev.map(s => s._id === id || s.rollNumber === id ? { ...s, ...updates } : s));

            // API Call
            const res = await api.put(`/admin/students/${id}`, updates);
            if (res.data.success) {
                // Server might emit 'student_update' which will correct any drift
                const updated = res.data.student;
                // If local user is the one being updated (rare in admin view, but possible)
                if (localStudent && updated.rollNumber === localStudent.rollNumber) {
                    onUpdateStudent(updated);
                }
            }
        } catch (error) {
            console.error("Update failed", error);
            alert("Failed to update student.");
        }
    };

    const student = allStudents.find(s => s.rollNumber === selectedRollNumber) || null;
    const totalScore = student ? Object.values(student.scores || {}).reduce((a: number, b: number | null | undefined) => (a || 0) + (b || 0), 0) : 0;

    const handleEditStart = () => {
        if (!student) return;
        setEditForm({ ...student });
        setIsEditing(true);
    };

    const handleEditSave = () => {
        if (!student || !student._id) return;
        handleUpdateStudent(student._id, editForm);
        setIsEditing(false);
    };

    const handleForceSubmit = () => {
        if (student?._id && confirm("FORCE SUBMIT this contest?")) {
            handleUpdateStudent(student._id, { contestStatus: 'SUBMITTED' });
        }
    };

    const handleDisqualify = () => {
        if (student?._id && confirm("DISQUALIFY this student?")) {
            handleUpdateStudent(student._id, { contestStatus: 'TERMINATED', isDisqualified: true });
        }
    };

    const handleUnlock = () => {
        if (student?._id) {
            handleUpdateStudent(student._id, { contestStatus: 'ACTIVE', isDisqualified: false, violationAttempts: 0 });
        }
    };

    const handleAddTime = (minutes: number) => {
        if (!student?._id || !student.currentRound) return;
        const currentStart = student.roundStartedAt?.[student.currentRound];
        if (!currentStart) return;

        const newStartTime = new Date(currentStart).getTime() + (minutes * 60 * 1000);

        const newStartedAt = { ...student.roundStartedAt, [student.currentRound]: new Date(newStartTime).toISOString() };
        handleUpdateStudent(student._id, { roundStartedAt: newStartedAt });
    };

    const handleRoundChange = (delta: number) => {
        if (!student?._id) return;
        const newRound = Math.max(1, Math.min(3, student.currentRound + delta));
        handleUpdateStudent(student._id, { currentRound: newRound });
    };

    const handleBroadcast = () => {
        if (!broadcastMsg.trim() || !socket) return;
        socket.emit('admin_broadcast', broadcastMsg);
        setBroadcastMsg("");
        alert("Broadcast sent!");
    };

    const handleSetGlobalStatus = (status: "active" | "paused" | "ended") => {
        if (!socket) return;
        if (confirm(`Set global status to ${status.toUpperCase()}?`)) {
            socket.emit('admin_set_contest_status', status);
            setContestStatus(status);
        }
    };

    const handleExportCSV = () => {
        window.open(`${api.defaults.baseURL}/admin/export-excel`, '_blank');
    };

    return (
        <div className="min-h-screen bg-black text-slate-200 p-8 font-sans selection:bg-blue-500/30">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8 border-b border-zinc-800 pb-6">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-600/10 rounded-lg border border-blue-500/20">
                            <User size={24} className="text-blue-500" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold text-white tracking-tight">Admin Console</h1>
                            <div className="text-xs text-slate-500 font-mono">KANAL 2K26 · CONTROLLER</div>
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <button onClick={() => setSelectedRollNumber(null)} className="bg-zinc-900 hover:bg-zinc-800 px-4 py-2 rounded-lg text-sm font-medium border border-zinc-800 transition-colors flex items-center gap-2">
                            <ArrowLeft size={16} /> Dashboard
                        </button>
                        <button onClick={onExit} className="bg-red-900/10 hover:bg-red-900/20 text-red-500 px-4 py-2 rounded-lg text-sm font-medium border border-red-500/20 transition-colors flex items-center gap-2">
                            <LogOut size={16} /> Exit
                        </button>
                    </div>
                </div>

                {/* Global Controls */}
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-xl p-5 mb-8 flex flex-wrap gap-6 justify-between items-center backdrop-blur-sm">
                    <div className="flex items-center gap-6">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Contest Status</span>
                            <div className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${contestStatus === 'active' ? 'bg-emerald-500 animate-pulse' : contestStatus === 'paused' ? 'bg-amber-500' : 'bg-red-500'}`}></span>
                                <span className={`text-sm font-bold ${contestStatus === 'active' ? 'text-white' : 'text-slate-300'}`}>
                                    {contestStatus.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-1 bg-zinc-900 p-1 rounded-lg border border-zinc-800">
                            <button onClick={() => handleSetGlobalStatus('active')} className={`p-2 rounded-md transition-all ${contestStatus === 'active' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'hover:bg-zinc-800 text-slate-500'}`} title="Start Contest"><Play size={16} fill="currentColor" /></button>
                            <button onClick={() => handleSetGlobalStatus('paused')} className={`p-2 rounded-md transition-all ${contestStatus === 'paused' ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20' : 'hover:bg-zinc-800 text-slate-500'}`} title="Pause Contest"><Pause size={16} fill="currentColor" /></button>
                            <button onClick={() => handleSetGlobalStatus('ended')} className={`p-2 rounded-md transition-all ${contestStatus === 'ended' ? 'bg-red-600 text-white shadow-lg shadow-red-900/20' : 'hover:bg-zinc-800 text-slate-500'}`} title="End Contest"><StopCircle size={16} fill="currentColor" /></button>
                        </div>
                    </div>
                    <div className="flex-1 flex gap-2 min-w-[300px]">
                        <input value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Type a broadcast message..." className="flex-1 bg-black border border-zinc-700 rounded-lg px-4 py-2.5 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-zinc-600" />
                        <button onClick={handleBroadcast} className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-lg text-sm font-bold text-white transition-all shadow-lg shadow-blue-900/20">Send</button>
                    </div>
                    <div>
                        <button onClick={handleExportCSV} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 px-5 py-2.5 rounded-lg text-sm font-medium text-white gap-2 flex items-center transition-all">
                            <FileSpreadsheet size={16} className="text-emerald-500" /> Export Data
                        </button>
                    </div>
                </div>

                {/* Main View */}
                {student ? (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[600px]">
                        {/* Student Details Card */}
                        <div className="bg-zinc-900/50 p-6 rounded-xl border border-zinc-800 flex flex-col h-full">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h2 className="text-2xl font-bold text-white mb-1">{student.fullName}</h2>
                                    <p className="text-sm text-slate-400 font-mono">{student.rollNumber}</p>
                                </div>
                                <button onClick={handleEditStart} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"><Edit size={16} className="text-slate-500 hover:text-blue-400" /></button>
                            </div>

                            <div className="space-y-4 text-sm flex-1">
                                <DetailRow label="Current Status" value={student.contestStatus} highlight={student.contestStatus === 'ACTIVE' ? 'text-emerald-400' : 'text-slate-200'} />
                                <DetailRow label="Department" value={student.department || 'N/A'} />
                                <DetailRow label="Language" value={student.language.toUpperCase()} />
                                <DetailRow label="Current Round" value={`Round ${student.currentRound}`} />
                                <DetailRow label="Current Score" value={String(totalScore)} highlight="text-white font-bold" />
                                <div className="p-3 bg-red-900/10 border border-red-500/10 rounded-lg mt-4">
                                    <div className="flex justify-between items-center">
                                        <span className="text-red-400 font-bold uppercase text-xs">Violations</span>
                                        <span className="text-2xl font-mono font-bold text-red-500">{student.violationAttempts}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="mt-6 grid grid-cols-2 gap-3 pt-6 border-t border-zinc-800">
                                <button onClick={() => handleAddTime(5)} className="bg-zinc-800 p-3 rounded-lg text-xs font-bold hover:bg-zinc-700 border border-zinc-700 transition-all flex justify-center gap-1">+5 MIN</button>
                                <button onClick={() => handleRoundChange(1)} className="bg-zinc-800 p-3 rounded-lg text-xs font-bold hover:bg-zinc-700 border border-zinc-700 transition-all">NEXT ROUND</button>

                                {student.isDisqualified ? (
                                    <button onClick={handleUnlock} className="col-span-2 bg-amber-600 hover:bg-amber-500 p-3 rounded-lg text-white font-bold flex justify-center items-center gap-2 shadow-lg shadow-amber-900/20"><Unlock size={16} /> UNLOCK STUDENT</button>
                                ) : (
                                    <>
                                        <button onClick={handleForceSubmit} className="bg-emerald-900/30 text-emerald-500 border border-emerald-500/30 hover:bg-emerald-900/50 p-3 rounded-lg text-xs font-bold transition-all">FORCE SUBMIT</button>
                                        <button onClick={handleDisqualify} className="bg-red-900/30 text-red-500 border border-red-500/30 hover:bg-red-900/50 p-3 rounded-lg text-xs font-bold transition-all">DISQUALIFY</button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Code Inspector */}
                        <div className="lg:col-span-2 bg-zinc-900/50 p-0 rounded-xl border border-zinc-800 flex flex-col h-full overflow-hidden">
                            <div className="p-4 border-b border-zinc-800 bg-zinc-900/80 flex justify-between items-center">
                                <h3 className="font-bold text-slate-300 flex items-center gap-2"><Code size={18} className="text-blue-500" /> Evidence Inspector</h3>
                                {viewCodeId && <div className="text-xs font-mono text-zinc-500">{viewCodeId}</div>}
                            </div>

                            <div className="flex-1 flex min-h-0">
                                {/* Submission List */}
                                <div className="w-48 border-r border-zinc-800 bg-black/50 overflow-y-auto p-2 space-y-1">
                                    <div className="text-[10px] font-bold text-slate-600 uppercase tracking-widest px-2 py-2">Submissions</div>
                                    {Object.keys(student.codeCache || {}).length === 0 && <span className="text-slate-500 text-xs px-2 italic">No data yet.</span>}
                                    {Object.entries(student.codeCache || {}).map(([qid, code]) => (
                                        <button
                                            key={qid}
                                            onClick={() => setViewCodeId(qid)}
                                            className={`w-full text-left px-3 py-2 rounded-md text-xs font-mono truncate transition-colors ${viewCodeId === qid ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' : 'text-slate-400 hover:bg-zinc-800'}`}
                                        >
                                            {qid}
                                        </button>
                                    ))}
                                </div>

                                {/* Code Viewer */}
                                <div className="flex-1 bg-[#1e1e1e] overflow-auto p-4 font-mono text-sm relative">
                                    {viewCodeId ? (
                                        <pre className="text-zinc-300">{student.codeCache[viewCodeId]}</pre>
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-zinc-700">
                                            <Code size={48} className="mb-4 opacity-20" />
                                            <p>Select a submission to inspect code</p>
                                        </div>
                                    )}
                                    {viewCodeId && (
                                        <button
                                            onClick={() => setViewCodeId(null)}
                                            className="absolute top-4 right-4 p-1 bg-zinc-800 rounded text-slate-400 hover:text-white"
                                        >
                                            <X size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    // Dashboard Grid
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {allStudents.map(s => {
                            const score = Object.values(s.scores || {}).reduce((a: number, b: number | null | undefined) => (a || 0) + (b || 0), 0);
                            return (
                                <div
                                    key={s.rollNumber}
                                    onClick={() => setSelectedRollNumber(s.rollNumber)}
                                    className={`bg-zinc-900/50 p-5 rounded-xl border transition-all cursor-pointer group hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 ${s.isDisqualified ? 'border-red-900/50 bg-red-900/5' : 'border-zinc-800 hover:border-blue-500/50 hover:bg-zinc-900'}`}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-800 to-black border border-zinc-700 flex items-center justify-center font-bold text-slate-400 group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors">
                                            {s.fullName.charAt(0)}
                                        </div>
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${s.contestStatus === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {s.contestStatus}
                                        </span>
                                    </div>
                                    <h3 className="font-bold text-zinc-200 truncate group-hover:text-white transition-colors">{s.fullName}</h3>
                                    <div className="text-xs text-zinc-500 font-mono mb-4">{s.rollNumber}</div>

                                    <div className="flex justify-between items-end border-t border-zinc-800 pt-3">
                                        <div className="text-xs text-zinc-500">R{s.currentRound}</div>
                                        <div className="text-xl font-bold text-white tabular-nums">{score}</div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Edit Modal */}
                {isEditing && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                        <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-700 w-96 shadow-2xl">
                            <h3 className="text-xl font-bold mb-6 text-white">Edit Student</h3>
                            <div className="space-y-4">
                                <input className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" value={editForm.fullName || ''} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} placeholder="Name" />
                                <input className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" value={editForm.rollNumber || ''} onChange={e => setEditForm({ ...editForm, rollNumber: e.target.value })} placeholder="Roll Number" />
                                <input className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-blue-500 outline-none" value={editForm.email || ''} onChange={e => setEditForm({ ...editForm, email: e.target.value })} placeholder="Email" />
                            </div>
                            <div className="flex gap-3 mt-8">
                                <button onClick={() => setIsEditing(false)} className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white p-3 rounded-lg font-bold transition-colors">Cancel</button>
                                <button onClick={handleEditSave} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-lg font-bold transition-colors shadow-lg shadow-blue-900/20">Save Changes</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const DetailRow = ({ label, value, highlight = "text-slate-300" }: { label: string, value: string | number, highlight?: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-zinc-800/50 last:border-0">
        <span className="text-slate-500 font-medium">{label}</span>
        <span className={`${highlight} text-right`}>{value}</span>
    </div>
);
