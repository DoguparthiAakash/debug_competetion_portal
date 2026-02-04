import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { useFullscreenMonitor } from '../hooks/useFullscreenMonitor';
import './ContestPage.css';

/* ══════════════════════════════════════════════════════════
   CONTEST PAGE – main student contest interface
   ══════════════════════════════════════════════════════════ */

function ContestPage() {
  const navigate = useNavigate();
  const rollNumber = sessionStorage.getItem('contestRollNumber');

  // ── State ──
  const [student, setStudent] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeQIdx, setActiveQIdx] = useState(0);     // which question card is open
  const [code, setCode] = useState('');     // current editor content
  const [submissions, setSubmissions] = useState({});   // questionId → result
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [roundTimer, setRoundTimer] = useState(null);  // seconds remaining
  const [roundStarted, setRoundStarted] = useState(false);
  const [contestDone, setContestDone] = useState(false);
  const timerRef = useRef(null);

  // Violation handling
  const handleViolation = useCallback(async (violationType) => {
    if (!rollNumber) return;
    try {
      const { data } = await api.post(`/student/${rollNumber}/log-violation`, { violationType });
      if (data.success) {
        // Update student state with new violation count
        setStudent(prev => ({
          ...prev,
          violationAttempts: data.violationAttempts,
          isDisqualified: data.isDisqualified
        }));
      }
    } catch (err) {
      console.error('Failed to log violation:', err);
    }
  }, [rollNumber]);

  // Fullscreen monitoring
  const { startMonitoring, stopMonitoring, showWarning, warningMessage } = useFullscreenMonitor(
    roundStarted && !contestDone,
    handleViolation,
    student
  );

  // ── Redirect if no roll number ──
  useEffect(() => {
    if (!rollNumber) { navigate('/'); return; }
    fetchStudent();
  }, []); // eslint-disable-line

  /* ── Fetch student status ── */
  const fetchStudent = async () => {
    try {
      const { data } = await api.get(`/student/${rollNumber}/status`);
      if (data.success) {
        setStudent(data.student);
        if (data.student.currentRound > 3) {
          setContestDone(true);
        } else {
          fetchQuestions(data.student);
        }
      }
    } catch (err) {
      console.error('Failed to fetch student:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Fetch questions for current round ── */
  const fetchQuestions = async (stu) => {
    const round = stu.currentRound;
    try {
      const { data } = await api.get(`/student/${rollNumber}/questions/${round}`);
      if (data.success) {
        setQuestions(data.questions);
        setActiveQIdx(0);

        // Rebuild submissions map from existing data
        const subMap = {};
        data.questions.forEach(q => {
          if (q.submission) subMap[q._id] = q.submission;
        });
        setSubmissions(subMap);

        // Set code to existing submission or buggy template
        const first = data.questions[0];
        if (first) {
          setCode(subMap[first._id]?.submittedCode || first.buggyCode);
        }

        // Check if round already started (has a startedAt)
        if (stu.roundStartedAt && stu.roundStartedAt[round]) {
          setRoundStarted(true);
          startCountdown(stu, round);
        }
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err);
    }
  };

  /* ── Start the round (record start time + begin countdown) ── */
  const handleStartRound = async () => {
    if (!student) return;
    try {
      await api.post(`/student/${rollNumber}/start-round`, { round: student.currentRound });
      setRoundStarted(true);
      // Start fullscreen monitoring
      startMonitoring();
      // Refresh student to get the startedAt
      const { data } = await api.get(`/student/${rollNumber}/status`);
      if (data.success) {
        setStudent(data.student);
        startCountdown(data.student, data.student.currentRound);
      }
    } catch (err) {
      console.error('Failed to start round:', err);
    }
  };

  /* ── Countdown timer logic ── */
  const startCountdown = useCallback(async (stu, round) => {
    // Fetch round config for timer duration
    try {
      const { data: cfgData } = await api.get('/admin/rounds/config');
      // cfgData might fail if not admin – fallback to 30 min
      const timerMinutes = (cfgData?.timers && cfgData.timers[round]) || 30;
      const startedAt = new Date(stu.roundStartedAt[round]).getTime();
      const elapsedMs = Date.now() - startedAt;
      const remainingSec = Math.max(0, timerMinutes * 60 - Math.floor(elapsedMs / 1000));
      setRoundTimer(remainingSec);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRoundTimer(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (_) {
      // If admin config endpoint is blocked for students, use default 30 min
      const startedAt = new Date(stu.roundStartedAt[round]).getTime();
      const elapsedMs = Date.now() - startedAt;
      const remainingSec = Math.max(0, 30 * 60 - Math.floor(elapsedMs / 1000));
      setRoundTimer(remainingSec);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setRoundTimer(prev => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  /* ── Switch active question ── */
  const switchQuestion = (idx) => {
    setActiveQIdx(idx);
    const q = questions[idx];
    if (q) {
      setCode(submissions[q._id]?.submittedCode || q.buggyCode);
    }
  };

  /* ── Submit code ── */
  const handleSubmit = async () => {
    if (!questions[activeQIdx] || submitting) return;
    const q = questions[activeQIdx];

    if (roundTimer === 0) {
      alert('Round timer has expired. You can no longer submit.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(`/student/${rollNumber}/submit`, {
        questionId: q._id,
        submittedCode: code,
        round: student.currentRound
      });
      if (data.success !== false) {
        setSubmissions(prev => ({ ...prev, [q._id]: data }));
      } else {
        alert(data.message || 'Submission failed');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Complete round ── */
  const handleCompleteRound = async () => {
    try {
      const { data } = await api.post(`/student/${rollNumber}/complete-round`, { round: student.currentRound });
      if (data.success) {
        if (data.contestComplete) {
          setContestDone(true);
        } else {
          // Move to next round
          if (timerRef.current) clearInterval(timerRef.current);
          setRoundStarted(false);
          setRoundTimer(null);
          // Refresh
          const { data: stuData } = await api.get(`/student/${rollNumber}/status`);
          setStudent(stuData.student);
          setQuestions([]);
          setSubmissions({});
          fetchQuestions(stuData.student);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete round');
    }
  };

  /* ════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════ */

  if (loading) return <div className="contest-loading"><div className="spinner" /> Loading…</div>;

  if (contestDone) return <ContestComplete student={student} />;

  const currentRound = student?.currentRound || 1;
  const activeQ = questions[activeQIdx];
  const result = activeQ ? submissions[activeQ._id] : null;

  // ── All submitted? ──
  const allSubmitted = questions.length > 0 && questions.every(q => submissions[q._id]);

  return (
    <div className="contest">
      {/* ── Violation Warning ── */}
      {showWarning && (
        <div className="contest__violation-warning">
          <span className="contest__violation-icon">⚠️</span>
          <span className="contest__violation-text">{warningMessage}</span>
          <span className="contest__violation-count">Attempt {student?.violationAttempts || 0} of 3</span>
        </div>
      )}

      {/* ── Disqualification Overlay ── */}
      {student?.isDisqualified && (
        <div className="contest__disqualified-overlay">
          <div className="contest__disqualified-card">
            <div className="contest__disqualified-icon">🚫</div>
            <h1 className="contest__disqualified-title">Disqualified</h1>
            <p className="contest__disqualified-message">
              You have been disqualified from the contest due to multiple violations.
            </p>
            <p className="contest__disqualified-details">
              Total Violations: {student.violationAttempts}
            </p>
            <button className="btn btn--primary" onClick={() => navigate('/')}>Return to Home</button>
          </div>
        </div>
      )}

      {/* ── Top bar ── */}
      <header className="contest__header">
        <span className="contest__logo">⬡ Bug Hunters</span>
        <div className="contest__header-center">
          <span className="contest__round-badge">Round {currentRound}</span>
          <span className="contest__lang-badge">{student?.language}</span>
        </div>
        <div className="contest__header-right">
          {roundTimer !== null && (
            <span className={`contest__timer ${roundTimer <= 60 ? 'contest__timer--urgent' : ''}`}>
              ⏱ {formatTime(roundTimer)}
            </span>
          )}
        </div>
      </header>

      {/* ── Round start gate ── */}
      {!roundStarted && (
        <div className="contest__gate">
          <div className="contest__gate-card">
            <h2>Round {currentRound}</h2>
            <p>{currentRound === 1 ? 4 : currentRound === 2 ? 3 : 2} questions · Timer starts when you click</p>
            <button className="btn btn--primary btn--lg" onClick={handleStartRound}>
              Start Round {currentRound}
            </button>
          </div>
        </div>
      )}

      {roundStarted && (
        <div className="contest__body">
          {/* ── Sidebar: question list ── */}
          <aside className="contest__sidebar">
            <div className="contest__q-list">
              {questions.map((q, idx) => {
                const sub = submissions[q._id];
                return (
                  <div
                    key={q._id}
                    className={`contest__q-item ${idx === activeQIdx ? 'contest__q-item--active' : ''} ${sub ? 'contest__q-item--done' : ''}`}
                    onClick={() => switchQuestion(idx)}
                  >
                    <span className="contest__q-num">Q{idx + 1}</span>
                    <span className="contest__q-title">{q.title}</span>
                    {sub && <span className="contest__q-score">{sub.score}pts</span>}
                  </div>
                );
              })}
            </div>

            {/* Complete round button */}
            {allSubmitted && (
              <button className="btn btn--primary" style={{ width: '100%', marginTop: 16 }} onClick={handleCompleteRound}>
                Complete Round {currentRound} →
              </button>
            )}
          </aside>

          {/* ── Main: editor + results ── */}
          <main className="contest__main">
            {activeQ && (
              <>
                {/* Question header */}
                <div className="contest__q-header">
                  <h2 className="contest__q-title-main">{activeQ.title}</h2>
                  <p className="contest__q-desc">{activeQ.description}</p>
                </div>

                {/* Code editor (textarea-based, Monaco-free for portability) */}
                <div className="contest__editor-wrap">
                  <div className="contest__editor-bar">
                    <span className="contest__editor-lang">{activeQ.language}</span>
                    <span className="contest__editor-hint">Fix the bug below</span>
                  </div>
                  <textarea
                    className="contest__editor"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    spellCheck={false}
                    disabled={roundTimer === 0}
                  />
                </div>

                {/* Action bar */}
                <div className="contest__actions">
                  <button className="btn btn--primary" onClick={handleSubmit} disabled={submitting || roundTimer === 0}>
                    {submitting ? 'Submitting…' : '▶ Submit'}
                  </button>
                  {result && (
                    <span className={`contest__verdict contest__verdict--${result.verdict}`}>
                      {verdictLabel(result.verdict)} · {result.score} pts
                    </span>
                  )}
                </div>

                {/* ── Test results panel ── */}
                {result?.testResults && (
                  <div className="contest__results">
                    <h4>Test Results</h4>
                    <div className="contest__test-grid">
                      {result.testResults.map((tr, i) => (
                        <div key={i} className={`contest__test-case ${tr.passed ? 'contest__test-case--pass' : 'contest__test-case--fail'}`}>
                          <span className="contest__test-badge">{tr.passed ? '✓' : '✗'} Test {i + 1}</span>
                          <div className="contest__test-detail">
                            <span><strong>Input:</strong> {tr.input || '(shown on submit)'}</span>
                            <span><strong>Expected:</strong> {tr.expectedOutput}</span>
                            <span><strong>Got:</strong> {tr.actualOutput}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Compile / runtime error display */}
                {(result?.compileError || result?.runtimeError) && (
                  <div className="contest__error-box">
                    <strong>{result.compileError ? 'Compile Error' : 'Runtime Error'}:</strong>{' '}
                    {result.compileError || result.runtimeError}
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      )}
    </div>
  );
}

/* ── Contest Complete screen ── */
function ContestComplete({ student }) {
  const r1 = student?.scores?.round1 ?? 0;
  const r2 = student?.scores?.round2 ?? 0;
  const r3 = student?.scores?.round3 ?? 0;
  const avg = ((r1 + r2 + r3) / 3).toFixed(2);

  return (
    <div className="contest-done">
      <div className="contest-done__card">
        <div className="contest-done__trophy">🏆</div>
        <h1>Contest Complete!</h1>
        <p className="contest-done__name">{student?.fullName}</p>
        <div className="contest-done__scores">
          <ScoreBox label="Round 1" value={r1} />
          <ScoreBox label="Round 2" value={r2} />
          <ScoreBox label="Round 3" value={r3} />
        </div>
        <div className="contest-done__final">
          <span>Final Average Score</span>
          <span className="contest-done__avg">{avg}</span>
        </div>
      </div>
    </div>
  );
}
function ScoreBox({ label, value }) {
  return (
    <div className="contest-done__score-box">
      <span className="contest-done__score-label">{label}</span>
      <span className="contest-done__score-val">{value}</span>
    </div>
  );
}

/* ── Helpers ── */
function formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function verdictLabel(v) {
  const map = {
    all_pass: '✓ All Passed',
    some_pass: '~ Some Passed',
    wrong_output: '✗ Wrong Output',
    compile_error: '✗ Compile Error',
    runtime_error: '✗ Runtime Error'
  };
  return map[v] || v;
}

export default ContestPage;
