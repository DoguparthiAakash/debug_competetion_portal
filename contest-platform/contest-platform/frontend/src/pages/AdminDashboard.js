import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './AdminDashboard.css';

/* ══════════════════════════════════════════════════════════
   ADMIN DASHBOARD
   Tabs: Rounds | Questions | Scores
   ══════════════════════════════════════════════════════════ */

function AdminDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('rounds');   // rounds | questions | scores
  const [timers, setTimers] = useState({ 1: 30, 2: 30, 3: 30 });
  const [questions, setQuestions] = useState([]);
  const [dashboard, setDashboard] = useState([]);
  const [qFilter, setQFilter] = useState({ round: '', language: '' });

  // Clear token on page refresh or close
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('adminToken');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  // Load data on mount
  useEffect(() => { fetchTimers(); fetchQuestions(); fetchDashboard(); }, []);

  /* ── API calls ── */
  const fetchTimers = async () => {
    try {
      const { data } = await api.get('/admin/rounds/config');
      if (data.success) setTimers(data.timers);
    } catch (_) { }
  };
  const fetchQuestions = async () => {
    try {
      const params = {};
      if (qFilter.round) params.round = qFilter.round;
      if (qFilter.language) params.language = qFilter.language;
      const { data } = await api.get('/admin/questions', { params });
      if (data.success) setQuestions(data.questions);
    } catch (_) { }
  };
  const fetchDashboard = async () => {
    try {
      const { data } = await api.get('/admin/dashboard');
      if (data.success) setDashboard(data.dashboard);
    } catch (_) { }
  };

  // Re-fetch questions when filter changes
  useEffect(() => { fetchQuestions(); }, [qFilter]);

  /* ── Logout ── */
  const handleLogout = () => {
    sessionStorage.removeItem('adminToken');
    navigate('/admin');
  };

  return (
    <div className="admin">
      {/* ── Header ── */}
      <header className="admin__header">
        <span className="admin__logo">⬡ Bug Hunters <span className="admin__logo-role">Admin</span></span>
        <nav className="admin__tabs">
          {[
            { key: 'rounds', label: '⚙ Rounds' },
            { key: 'questions', label: '📝 Questions' },
            { key: 'scores', label: '🏆 Scores' }
          ].map(t => (
            <button key={t.key} className={`admin__tab ${tab === t.key ? 'admin__tab--active' : ''}`}
              onClick={() => setTab(t.key)}>
              {t.label}
            </button>
          ))}
        </nav>
        <button className="btn btn--ghost btn--sm" onClick={handleLogout}>Logout</button>
      </header>

      {/* ── Tab content ── */}
      <div className="admin__content">

        {/* ════════════════════ ROUNDS TAB ════════════════════ */}
        {tab === 'rounds' && (
          <RoundsPanel timers={timers} setTimers={setTimers} onSave={fetchTimers} />
        )}

        {/* ════════════════════ QUESTIONS TAB ════════════════════ */}
        {tab === 'questions' && (
          <QuestionsPanel questions={questions} qFilter={qFilter} setQFilter={setQFilter}
            onDelete={() => fetchQuestions()} />
        )}

        {/* ════════════════════ SCORES TAB ════════════════════ */}
        {tab === 'scores' && (
          <ScoresPanel dashboard={dashboard} />
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ROUNDS PANEL
   ══════════════════════════════════════════════════════════ */
function RoundsPanel({ timers, setTimers, onSave }) {
  const [saving, setSaving] = useState({});
  const [saved, setSaved] = useState({});

  const handleSave = async (round) => {
    setSaving(prev => ({ ...prev, [round]: true }));
    try {
      await api.post('/admin/rounds/config', { round, timerMinutes: timers[round] });
      setSaved(prev => ({ ...prev, [round]: true }));
      setTimeout(() => setSaved(prev => ({ ...prev, [round]: false })), 2000);
      onSave();
    } catch (err) {
      alert('Failed to save timer');
    } finally {
      setSaving(prev => ({ ...prev, [round]: false }));
    }
  };

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>Round Timer Configuration</h2>
        <p>Set the duration (in minutes) for each round. Students' countdown starts when they click "Start Round".</p>
      </div>
      <div className="rounds-grid">
        {[1, 2, 3].map(round => (
          <div key={round} className="rounds-card">
            <div className="rounds-card__num">Round {round}</div>
            <div className="rounds-card__info">
              <span>{round === 1 ? '4 Questions' : round === 2 ? '3 Questions' : '2 Questions'}</span>
            </div>
            <div className="rounds-card__input-row">
              <input
                type="number"
                min={1}
                max={180}
                value={timers[round]}
                onChange={e => setTimers(prev => ({ ...prev, [round]: Number(e.target.value) }))}
                className="input"
              />
              <span className="rounds-card__unit">min</span>
            </div>
            <button className="btn btn--primary btn--sm" onClick={() => handleSave(round)} disabled={saving[round]}>
              {saved[round] ? '✓ Saved' : saving[round] ? '…' : 'Save'}
            </button>
          </div>
        ))}
      </div>

      {/* ── Upload new question section ── */}
      <div className="admin-panel__header" style={{ marginTop: 40 }}>
        <h2>Upload New Question</h2>
        <p>Provide correct working code. The system will auto-generate a buggy version and test cases.</p>
      </div>
      <QuestionUploadForm />
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   QUESTION UPLOAD FORM
   ══════════════════════════════════════════════════════════ */
function QuestionUploadForm() {
  const [form, setForm] = useState({ title: '', description: '', round: '1', language: 'C', correctCode: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // { success, message }

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.description || !form.correctCode) {
      setResult({ success: false, message: 'All fields are required' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await api.post('/admin/questions', {
        ...form,
        round: Number(form.round)
      });
      setResult({ success: true, message: data.message || 'Question uploaded successfully' });
      setForm({ title: '', description: '', round: form.round, language: form.language, correctCode: '' });
    } catch (err) {
      setResult({ success: false, message: err.response?.data?.message || 'Upload failed' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-form">
      {result && (
        <div className={`upload-form__alert ${result.success ? 'upload-form__alert--success' : 'upload-form__alert--error'}`}>
          {result.message}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="upload-form__row">
          <div className="upload-form__field">
            <label>Title</label>
            <input type="text" name="title" value={form.title} onChange={handleChange} className="input" placeholder="Reverse an Array" />
          </div>
          <div className="upload-form__field upload-form__field--sm">
            <label>Round</label>
            <select name="round" value={form.round} onChange={handleChange} className="input">
              <option value="1">Round 1</option>
              <option value="2">Round 2</option>
              <option value="3">Round 3</option>
            </select>
          </div>
          <div className="upload-form__field upload-form__field--sm">
            <label>Language</label>
            <select name="language" value={form.language} onChange={handleChange} className="input">
              <option value="C">C</option>
              <option value="Java">Java</option>
              <option value="Python">Python</option>
            </select>
          </div>
        </div>
        <div className="upload-form__field">
          <label>Description</label>
          <textarea name="description" value={form.description} onChange={handleChange}
            className="input" rows={3} placeholder="Describe the problem the student must solve..." />
        </div>
        <div className="upload-form__field">
          <label>Correct Working Code <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>(system will auto-generate buggy version + test cases)</span></label>
          <textarea name="correctCode" value={form.correctCode} onChange={handleChange}
            className="input" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', minHeight: 220 }}
            placeholder={`// Paste your correct, working ${form.language} code here`} />
        </div>
        <button type="submit" className="btn btn--primary" disabled={loading}>
          {loading ? 'Uploading & Generating…' : '📤 Upload Question'}
        </button>
      </form>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   QUESTIONS PANEL (list)
   ══════════════════════════════════════════════════════════ */
function QuestionsPanel({ questions, qFilter, setQFilter, onDelete }) {
  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    try {
      await api.delete(`/admin/questions/${id}`);
      onDelete();
    } catch (_) { alert('Delete failed'); }
  };

  // Count per round+language
  const counts = {};
  questions.forEach(q => {
    const key = `${q.round}-${q.language}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  return (
    <div className="admin-panel">
      <div className="admin-panel__header">
        <h2>Questions Library</h2>
        <p>View and manage uploaded questions. Each round/language should have 15 questions.</p>
      </div>

      {/* Filters */}
      <div className="questions-filters">
        <select value={qFilter.round} onChange={e => setQFilter(prev => ({ ...prev, round: e.target.value }))} className="input">
          <option value="">All Rounds</option>
          <option value="1">Round 1</option>
          <option value="2">Round 2</option>
          <option value="3">Round 3</option>
        </select>
        <select value={qFilter.language} onChange={e => setQFilter(prev => ({ ...prev, language: e.target.value }))} className="input">
          <option value="">All Languages</option>
          <option value="C">C</option>
          <option value="Java">Java</option>
          <option value="Python">Python</option>
        </select>
      </div>

      {/* Progress indicators */}
      <div className="questions-progress">
        {[1, 2, 3].map(r => ['C', 'Java', 'Python'].map(l => {
          const count = counts[`${r}-${l}`] || 0;
          const pct = Math.min(100, (count / 15) * 100);
          return (
            <div key={`${r}-${l}`} className="q-progress-item">
              <span className="q-progress-label">R{r} {l}</span>
              <div className="q-progress-bar">
                <div className="q-progress-fill" style={{ width: `${pct}%` }} />
              </div>
              <span className="q-progress-count">{count}/15</span>
            </div>
          );
        }))}
      </div>

      {/* Question list */}
      <div className="questions-list">
        {questions.length === 0 && <p className="questions-empty">No questions found.</p>}
        {questions.map(q => (
          <div key={q._id} className="q-card">
            <div className="q-card__meta">
              <span className="q-card__badge q-card__badge--round">Round {q.round}</span>
              <span className={`q-card__badge q-card__badge--lang`}>{q.language}</span>
              <span className="q-card__tc">{q.testCaseCount || 0} test cases</span>
            </div>
            <h3 className="q-card__title">{q.title}</h3>
            <p className="q-card__desc">{q.description}</p>
            <div className="q-card__actions">
              <button className="btn btn--danger btn--sm" onClick={() => deleteQuestion(q._id)}>Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   SCORES PANEL
   ══════════════════════════════════════════════════════════ */
function ScoresPanel({ dashboard }) {
  const [deleting, setDeleting] = useState(null); // Track which student is being deleted

  const handleExport = async () => {
    try {
      const response = await api.get('/admin/export-excel', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'contest_results.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Export failed: ' + (err.response?.data?.message || err.message));
    }
  };

  const deleteStudent = async (studentId, studentName) => {
    if (!window.confirm(`Are you sure you want to delete ${studentName}? This will permanently remove all their data including scores and submissions.`)) {
      return;
    }

    setDeleting(studentId);
    try {
      const { data } = await api.delete(`/admin/students/${studentId}`);
      if (data.success) {
        alert(data.message || 'Student deleted successfully');
        // Refresh the dashboard by reloading the page or calling parent's fetch function
        window.location.reload();
      }
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setDeleting(null);
    }
  };

  // Sort by finalAvgScore descending
  const sorted = [...dashboard].sort((a, b) => (b.finalAvgScore ?? -1) - (a.finalAvgScore ?? -1));

  return (
    <div className="admin-panel">
      <div className="admin-panel__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2>Score Dashboard</h2>
          <p>{dashboard.length} students registered</p>
        </div>
        <button className="btn btn--primary btn--sm" onClick={handleExport}>📥 Export Excel</button>
      </div>

      {/* Summary cards */}
      <div className="scores-summary">
        <div className="scores-summary__card">
          <span className="scores-summary__num">{dashboard.length}</span>
          <span className="scores-summary__label">Total Students</span>
        </div>
        <div className="scores-summary__card">
          <span className="scores-summary__num">{dashboard.filter(s => s.round1Score !== null).length}</span>
          <span className="scores-summary__label">Completed R1</span>
        </div>
        <div className="scores-summary__card">
          <span className="scores-summary__num">{dashboard.filter(s => s.round2Score !== null).length}</span>
          <span className="scores-summary__label">Completed R2</span>
        </div>
        <div className="scores-summary__card">
          <span className="scores-summary__num">{dashboard.filter(s => s.finalAvgScore !== null).length}</span>
          <span className="scores-summary__label">Contest Done</span>
        </div>
      </div>

      {/* Scores table */}
      <div className="scores-table-wrap">
        <table className="scores-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Name</th>
              <th>Roll No</th>
              <th>College</th>
              <th>Dept</th>
              <th>Yr</th>
              <th>Lang</th>
              <th>R1</th>
              <th>R2</th>
              <th>R3</th>
              <th>Avg</th>
              <th>Violations</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr key={i}>
                <td className="scores-table__rank">{i + 1}</td>
                <td className="scores-table__name">{s.name}</td>
                <td>{s.rollNumber}</td>
                <td>{s.college}</td>
                <td>{s.department}</td>
                <td>{s.year}</td>
                <td><span className="scores-table__lang">{s.language}</span></td>
                <td className="scores-table__score">{s.round1Score ?? '—'}</td>
                <td className="scores-table__score">{s.round2Score ?? '—'}</td>
                <td className="scores-table__score">{s.round3Score ?? '—'}</td>
                <td className={`scores-table__avg ${s.finalAvgScore !== null ? 'scores-table__avg--set' : ''}`}>
                  {s.finalAvgScore ?? '—'}
                </td>
                <td>
                  <span className={`scores-table__violations ${s.violationAttempts >= 3 ? 'scores-table__violations--high' : s.violationAttempts > 0 ? 'scores-table__violations--medium' : ''}`}>
                    {s.violationAttempts || 0}
                  </span>
                </td>
                <td>
                  <span className={`scores-table__status ${s.status === 'Disqualified' ? 'scores-table__status--disqualified' : 'scores-table__status--active'}`}>
                    {s.status || 'Active'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn--danger btn--sm"
                    onClick={() => deleteStudent(s._id, s.name)}
                    disabled={deleting === s._id}
                  >
                    {deleting === s._id ? '...' : '🗑️'}
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr><td colSpan={14} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 32 }}>No students yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDashboard;
