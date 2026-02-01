import React, { useRef, useState } from 'react';
import { User, LogOut, Unlock, FileSpreadsheet, Trash2, XCircle, Code, Clock, ArrowRight, ArrowLeft, Download, Upload, AlertOctagon, Edit, Save, X, Radio, MessageSquare, Pause, Play, StopCircle, Info, Calendar } from 'lucide-react';
import { Student } from '../utils/types';
import { useSocket } from '../utils/SocketContext';

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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Sync All Students
    React.useEffect(() => {
        if (!socket) return;

        socket.emit('admin_login'); // Ensure we are registered as admin

        const handleAll = (students: Student[]) => {
            setAllStudents(students);
        };

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
            if (config && config.status) setContestStatus(config.status);
        };

        socket.on('all_students', handleAll);
        socket.on('student_update', handleUpdate);
        socket.on('contest_status', handleContestStatus);

        return () => {
            socket.off('all_students', handleAll);
            socket.off('student_update', handleUpdate);
            socket.off('contest_status', handleContestStatus);
        };
    }, [socket]); // Removed selectedRollNumber dependency to prevent listener churn

    // Override onUpdateStudent to send via socket
    const handleUpdateStudent = (s: Student) => {
        // Optimistic update
        setAllStudents(prev => prev.map(p => p.rollNumber === s.rollNumber ? s : p));

        // Send command to server
        if (socket && s.socketId) socket.emit('admin_command', { targetSocketId: s.socketId, command: 'force_update', payload: s });

        // Also call local prop if it matches local
        if (localStudent && s.rollNumber === localStudent.rollNumber) {
            onUpdateStudent(s);
        }
    };

    const student = allStudents.find(s => s.rollNumber === selectedRollNumber) || null;
    const totalScore = student ? Object.values(student.scores).reduce((a: number, b: number) => a + b, 0) : 0;

    const handleExportState = () => {
        if (!student) return;
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(student, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `contest_state_${student.rollNumber}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleImportState = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = JSON.parse(e.target?.result as string);
                if (json.rollNumber && json.contestStatus) {
                    onUpdateStudent(json);
                    alert("State imported successfully!");
                } else {
                    alert("Invalid state file.");
                }
            } catch (err) {
                alert("Error parsing JSON.");
            }
        };
        reader.readAsText(file);
    };

    const handleEditStart = () => {
        if (!student) return;
        setEditForm({ ...student });
        setIsEditing(true);
    };

    const handleEditSave = () => {
        if (!student) return;
        handleUpdateStudent({ ...student, ...editForm } as Student);
        setIsEditing(false);
    };

    const handleForceSubmit = () => {
        if (confirm("Are you sure you want to FORCE SUBMIT this contest? The student will be moved to the Result screen immediately.")) {
            if (student) handleUpdateStudent({ ...student, contestStatus: 'SUBMITTED', roundStartTime: null });
        }
    };

    const handleDisqualify = () => {
        const reason = prompt("Enter disqualification reason:", "Violation of rules");
        if (reason && student) {
            // But for now we set status to TERMINATED. 
            // Ideally we'd store the reason in the student object.
            // For this iteration, we'll just set terminated.
            handleUpdateStudent({ ...student, contestStatus: 'TERMINATED', violationCount: 99 });
        }
    };

    const handleAddTime = (minutes: number) => {
        if (!student || !student.roundStartTime) return;
        const newStartTime = student.roundStartTime + (minutes * 60 * 1000); // Adding minutes effectively reduces elapsed time, so we ADD to start time? No.
        // If we want to ADD time to the countdown, we need to make the start time LATER? No.
        // Timer = Duration - (Now - StartTime).
        // To increase Timer, we need to decrease (Now - StartTime).
        // So we need to increase StartTime. 
        // Example: Start = 10:00. Now = 10:10. Elapsed = 10m. Left = 20-10 = 10m.
        // Add 5m. Left should be 15m.
        // 15 = 20 - (Now - NewStart).
        // Now - NewStart = 5. NewStart = Now - 5 = 10:05.
        // OldStart was 10:00. NewStart is 10:05. So we ADD 5 mins to StartTime.
        handleUpdateStudent({ ...student, roundStartTime: student.roundStartTime + (minutes * 60 * 1000) });
    };

    const handleRoundChange = (delta: number) => {
        if (!student) return;
        const newRound = Math.max(1, Math.min(3, student.currentRound + delta));
        handleUpdateStudent({ ...student, currentRound: newRound, roundStartTime: Date.now() }); // Reset timer for new round
    };

    // Global Actions
    const handleBroadcast = () => {
        if (!broadcastMsg.trim() || !socket) return;
        socket.emit('admin_broadcast', broadcastMsg);
        setBroadcastMsg("");
        alert("Broadcast sent!");
    };

    const handleSetGlobalStatus = (status: "active" | "paused" | "ended") => {
        if (!socket) return;
        if (confirm(`Are you sure you want to set global status to ${status.toUpperCase()}?`)) {
            socket.emit('admin_set_contest_status', status);
            // Optimistic update
            setContestStatus(status);
        }
    };

    const handleExportAll = () => {
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(allStudents, null, 2));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute("href", dataStr);
        downloadAnchorNode.setAttribute("download", `contest_full_export_${Date.now()}.json`);
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
    };

    const handleExportCSV = () => {
        if (allStudents.length === 0) {
            alert("No data to export.");
            return;
        }

        const headers = ["Roll Number", "Full Name", "College", "Status", "Round", "Total Score"];
        // Add headers for potential questions if needed, but for summary, this is good.

        const rows = allStudents.map(s => {
            const score = Object.values(s.scores).reduce((a: number, b: number) => a + b, 0);
            return [
                s.rollNumber,
                `"${s.fullName}"`, // Quote incase of commas
                `"${s.college}"`,
                s.contestStatus,
                s.currentRound,
                score
            ].join(",");
        });

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `contest_results_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        link.remove();
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 p-8 font-mono">
            <div className="max-w-4xl mx-auto">
                <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <User size={32} className="text-blue-500" />
                        <h1 className="text-2xl font-bold">Admin Console</h1>
                    </div>
                    <button onClick={onExit} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded text-sm flex items-center gap-2">
                        <LogOut size={16} /> Exit
                    </button>
                    <button onClick={() => setSelectedRollNumber(null)} className="ml-4 bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm flex items-center gap-2">
                        <ArrowLeft size={16} /> All Students
                    </button>
                    <button
                        onClick={() => {
                            if (socket) {
                                socket.emit('admin_login');
                                alert("Refreshed data from server.");
                            }
                        }}
                        className="ml-4 bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded text-sm flex items-center gap-2"
                        title="Force refresh data from server"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></svg>
                        Refresh
                    </button>
                </div>

                {/* Global Controls Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-8 flex flex-col md:flex-row gap-4 justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Global Status:</span>
                            <span className={`px-2 py-1 rounded text-xs font-bold ${contestStatus === 'active' ? 'bg-emerald-900 text-emerald-300' : contestStatus === 'paused' ? 'bg-amber-900 text-amber-300' : 'bg-red-900 text-red-300'}`}>
                                {contestStatus.toUpperCase()}
                            </span>
                        </div>
                        <div className="flex gap-1">
                            {contestStatus !== 'active' && (
                                <button onClick={() => handleSetGlobalStatus('active')} className="bg-emerald-700 hover:bg-emerald-600 p-2 rounded text-emerald-100" title="Resume Contest">
                                    <Play size={16} />
                                </button>
                            )}
                            {contestStatus === 'active' && (
                                <button onClick={() => handleSetGlobalStatus('paused')} className="bg-amber-700 hover:bg-amber-600 p-2 rounded text-amber-100" title="Pause Contest">
                                    <Pause size={16} />
                                </button>
                            )}
                            {contestStatus !== 'ended' && (
                                <button onClick={() => handleSetGlobalStatus('ended')} className="bg-red-700 hover:bg-red-600 p-2 rounded text-red-100" title="End Contest">
                                    <StopCircle size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex gap-2 w-full md:w-auto">
                        <input
                            value={broadcastMsg}
                            onChange={e => setBroadcastMsg(e.target.value)}
                            placeholder="Broadcast message to all students..."
                            className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-2 text-sm text-white"
                        />
                        <button onClick={handleBroadcast} disabled={!broadcastMsg.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 px-4 py-2 rounded text-sm text-white flex items-center gap-2">
                            <MessageSquare size={16} /> Send
                        </button>
                    </div>

                    <div>
                        <div className="flex gap-2">
                            <button onClick={handleExportCSV} className="bg-green-700 hover:bg-green-600 px-4 py-2 rounded text-sm text-white flex items-center gap-2">
                                <FileSpreadsheet size={16} /> Export CSV
                            </button>
                            <button onClick={handleExportAll} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm text-white flex items-center gap-2">
                                <Download size={16} /> Export JSON
                            </button>
                        </div>
                    </div>
                </div>

                {student ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Student Info */}
                        <div
                            className="bg-slate-900 p-6 rounded-lg border border-slate-800 relative cursor-pointer hover:border-blue-500 transition-colors group"
                            onClick={() => setShowFullDetails(true)}
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h2 className="text-xl font-bold text-emerald-400 group-hover:text-blue-400 transition-colors">{student.fullName}</h2>
                                    <p className="text-xs text-slate-500 font-mono">{student.rollNumber}</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleEditStart(); }} className="text-slate-500 hover:text-blue-400" title="Edit Student Details">
                                    <Edit size={16} />
                                </button>
                            </div>
                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between"><span className="text-slate-500">Email:</span> <span className="truncate max-w-[150px]">{student.email || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Started:</span> {student.roundStartTime ? new Date(student.roundStartTime).toLocaleTimeString() : '-'}</div>
                                <div className="flex justify-between"><span className="text-slate-500">Ended:</span> {student.submissionTime ? new Date(student.submissionTime).toLocaleTimeString() : '-'}</div>
                            </div>
                            <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-blue-400 flex items-center gap-1">
                                View Full Details <ArrowRight size={12} />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-slate-900 p-6 rounded-lg border border-slate-800 flex flex-col gap-4">
                            <h2 className="text-xl font-bold mb-2 text-blue-400">Controls</h2>



                            {/* Time & Round Controls */}
                            <div className="bg-slate-800 p-4 rounded-lg">
                                <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <Clock size={14} /> Session Management
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleAddTime(5)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-xs">
                                        +5 Mins
                                    </button>
                                    <button onClick={() => handleAddTime(-5)} className="bg-slate-700 hover:bg-slate-600 p-2 rounded text-xs">
                                        -5 Mins
                                    </button>
                                    <button onClick={() => handleRoundChange(-1)} disabled={student.currentRound <= 1} className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 p-2 rounded text-xs flex items-center justify-center gap-1">
                                        <ArrowLeft size={12} /> Prev Round
                                    </button>
                                    <button onClick={() => handleRoundChange(1)} disabled={student.currentRound >= 3} className="bg-slate-700 hover:bg-slate-600 disabled:opacity-50 p-2 rounded text-xs flex items-center justify-center gap-1">
                                        Next Round <ArrowRight size={12} />
                                    </button>
                                </div>
                            </div>

                            {/* Code Inspector */}
                            <div className="bg-slate-800 p-4 rounded-lg flex-1 overflow-hidden flex flex-col">
                                <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <Code size={14} /> Code Inspector
                                </h3>
                                <div className="flex-1 overflow-y-auto space-y-2 max-h-[200px]">
                                    {Object.keys(student.codeCache).length === 0 && <span className="text-xs text-slate-500">No code submitted yet.</span>}
                                    {Object.entries(student.codeCache).map(([qId, code]) => (
                                        <div key={qId} className="border border-slate-700 rounded p-2 text-xs">
                                            <div className="flex justify-between mb-1">
                                                <span className="font-bold text-slate-300">{qId}</span>
                                                <button onClick={() => setViewCodeId(qId)} className="text-blue-400 hover:underline">View</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>


                            {student.contestStatus === 'TERMINATED' && (
                                <button onClick={onUnlock} className="bg-amber-600 hover:bg-amber-700 text-white p-3 rounded flex items-center justify-center gap-2 transition-colors">
                                    <Unlock size={18} /> Unlock Student
                                </button>
                            )}

                            {student.contestStatus !== 'TERMINATED' && student.contestStatus !== 'SUBMITTED' && (
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={handleForceSubmit} className="bg-emerald-700 hover:bg-emerald-800 text-white p-3 rounded flex items-center justify-center gap-2 transition-colors">
                                        <Save size={18} /> Force Submit
                                    </button>
                                    <button onClick={handleDisqualify} className="bg-red-700 hover:bg-red-800 text-white p-3 rounded flex items-center justify-center gap-2 transition-colors">
                                        <AlertOctagon size={18} /> Disqualify
                                    </button>
                                </div>
                            )}

                            <button onClick={onReset} className="bg-red-900/50 hover:bg-red-900 text-red-200 border border-red-800 p-3 rounded flex items-center justify-center gap-2 mt-auto transition-colors">
                                <Trash2 size={18} /> Reset System (Clear Data)
                            </button>
                        </div>

                        {/* Edit Modal */}
                        {isEditing && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
                                <div className="bg-slate-900 w-full max-w-md rounded-lg border border-slate-700 shadow-2xl p-6">
                                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                                        <Edit size={20} className="text-blue-500" /> Edit Student
                                    </h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Full Name</label>
                                            <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                                value={editForm.fullName} onChange={e => setEditForm({ ...editForm, fullName: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">Roll Number</label>
                                            <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                                value={editForm.rollNumber} onChange={e => setEditForm({ ...editForm, rollNumber: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-slate-500 mb-1">College</label>
                                            <input className="w-full bg-slate-800 border border-slate-700 rounded p-2 text-white"
                                                value={editForm.college} onChange={e => setEditForm({ ...editForm, college: e.target.value })} />
                                        </div>
                                    </div>
                                    <div className="flex gap-3 mt-6">
                                        <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded">Cancel</button>
                                        <button onClick={handleEditSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded font-bold">Save Changes</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Code Modal */}
                        {viewCodeId && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setViewCodeId(null)}>
                                <div className="bg-slate-900 w-full max-w-3xl rounded-lg border border-slate-700 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
                                    <div className="bg-slate-800 p-3 border-b border-slate-700 flex justify-between items-center">
                                        <span className="font-mono font-bold text-slate-300">{viewCodeId}</span>
                                        <button onClick={() => setViewCodeId(null)} className="text-slate-400 hover:text-white"><XCircle size={18} /></button>
                                    </div>
                                    <pre className="p-4 text-xs font-mono bg-[#1e1e1e] text-slate-300 overflow-auto max-h-[60vh]">
                                        {student.codeCache[viewCodeId]}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Full Details Modal */}
                        {showFullDetails && (
                            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowFullDetails(false)}>
                                <div className="bg-slate-900 w-full max-w-2xl rounded-lg border border-slate-700 shadow-2xl p-8" onClick={e => e.stopPropagation()}>
                                    <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                                        <div>
                                            <h2 className="text-2xl font-bold text-white mb-1">{student.fullName}</h2>
                                            <p className="text-slate-400 font-mono">{student.rollNumber} | {student.email}</p>
                                        </div>
                                        <button onClick={() => setShowFullDetails(false)} className="text-slate-500 hover:text-white"><X size={24} /></button>
                                    </div>

                                    <div className="grid grid-cols-2 gap-8">
                                        <div>
                                            <h3 className="text-sm font-bold text-blue-500 uppercase mb-3">Academic Info</h3>
                                            <div className="space-y-2 text-sm text-slate-300">
                                                <div className="flex justify-between border-b border-slate-800 py-2">
                                                    <span className="text-slate-500">College</span>
                                                    <span>{student.college}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800 py-2">
                                                    <span className="text-slate-500">Department</span>
                                                    <span>{student.department}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800 py-2">
                                                    <span className="text-slate-500">Year</span>
                                                    <span>{student.year}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800 py-2">
                                                    <span className="text-slate-500">Language</span>
                                                    <span className="uppercase">{student.language}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-bold text-emerald-500 uppercase mb-3">Participation Stats</h3>
                                            <div className="space-y-2 text-sm text-slate-300">
                                                <div className="flex justify-between border-b border-slate-800 py-2">
                                                    <span className="text-slate-500">Status</span>
                                                    <span className={`font-bold ${student.contestStatus === 'TERMINATED' ? 'text-red-500' : 'text-blue-400'}`}>{student.contestStatus}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800 py-2">
                                                    <span className="text-slate-500">Current Round</span>
                                                    <span>{student.currentRound}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800 py-2">
                                                    <span className="text-slate-500">Total Score</span>
                                                    <span>{totalScore}</span>
                                                </div>
                                                <div className="flex justify-between border-b border-slate-800 py-2">
                                                    <span className="text-slate-500">Violations</span>
                                                    <span className={student.violationCount > 0 ? 'text-red-400' : ''}>{student.violationCount}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-8">
                                        <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Timing & Meta</h3>
                                        <div className="grid grid-cols-3 gap-4 text-xs bg-slate-800 p-4 rounded-lg">
                                            <div>
                                                <div className="text-slate-500 mb-1">Last Seen</div>
                                                <div className="font-mono text-white">{student.lastSeen ? new Date(student.lastSeen).toLocaleTimeString() : 'Never'}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500 mb-1">Round Start</div>
                                                <div className="font-mono text-white">{student.roundStartTime ? new Date(student.roundStartTime).toLocaleTimeString() : '-'}</div>
                                            </div>
                                            <div>
                                                <div className="text-slate-500 mb-1">Submission</div>
                                                <div className="font-mono text-white">{student.submissionTime ? new Date(student.submissionTime).toLocaleTimeString() : '-'}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {allStudents.length === 0 && (
                            <div className="col-span-full bg-slate-900 p-12 rounded-lg border border-slate-800 text-center text-slate-500">
                                <XCircle size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No active students connected.</p>
                            </div>
                        )}
                        {allStudents.map(s => {
                            const sScore = Object.values(s.scores).reduce((a: number, b: number) => a + b, 0);
                            return (
                                <div key={s.rollNumber} onClick={() => setSelectedRollNumber(s.rollNumber)} className="bg-slate-900 p-6 rounded-lg border border-slate-800 hover:border-blue-500 cursor-pointer transition-all shadow-lg hover:shadow-blue-500/20 group relative overflow-hidden">
                                    <div className={`absolute top-0 left-0 w-1 h-full ${s.contestStatus === 'TERMINATED' ? 'bg-red-500' : s.contestStatus === 'SUBMITTED' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-white group-hover:text-blue-400">{s.fullName}</h3>
                                            <p className="text-xs text-slate-400">{s.rollNumber}</p>
                                        </div>
                                        <span className={`text-xs px-2 py-1 rounded font-bold ${s.contestStatus === 'TERMINATED' ? 'bg-red-900 text-red-200' : 'bg-slate-700 text-slate-300'}`}>
                                            {s.contestStatus}
                                        </span>
                                    </div>
                                    <div className="space-y-2 text-xs text-slate-400">
                                        <div className="flex justify-between border-b border-slate-800/50 pb-1">
                                            <span>Email:</span> <span className="text-slate-300 truncate max-w-[120px]">{s.email || '-'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-800/50 pb-1">
                                            <span>Start:</span> <span className="text-slate-300 font-mono">{s.roundStartTime ? new Date(s.roundStartTime).toLocaleTimeString() : '-'}</span>
                                        </div>
                                        <div className="flex justify-between border-b border-slate-800/50 pb-1">
                                            <span>End:</span> <span className="text-slate-300 font-mono">{s.submissionTime ? new Date(s.submissionTime).toLocaleTimeString() : '-'}</span>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-2 border-t border-slate-800 flex justify-end">
                                        <span className="text-[10px] text-blue-500 group-hover:underline flex items-center gap-1">
                                            View Details <ArrowRight size={10} />
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div >
    );
};
