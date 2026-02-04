import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './RegistrationPage.css';

const LANGUAGES = [
  { value: 'C', label: 'C', icon: '⟨C⟩', color: '#5b9bd5', desc: 'GCC Compiler' },
  { value: 'Java', label: 'Java', icon: '☕', color: '#f5a623', desc: 'OpenJDK 17' },
  { value: 'Python', label: 'Python', icon: '🐍', color: '#00d4aa', desc: 'Python 3.11' }
];

function RegistrationPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    fullName: '', rollNumber: '', collegeName: '',
    department: '', yearOfStudy: '', email: '', language: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  /* ── Input change ── */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  /* ── Language card click ── */
  const selectLanguage = (lang) => {
    setForm(prev => ({ ...prev, language: lang }));
    if (errors.language) setErrors(prev => ({ ...prev, language: undefined }));
  };

  /* ── Client-side validation ── */
  const validate = () => {
    const errs = {};
    if (!form.fullName.trim()) errs.fullName = 'Full name is required';
    if (!form.rollNumber.trim()) errs.rollNumber = 'Roll number is required';
    if (!form.collegeName.trim()) errs.collegeName = 'College name is required';
    if (!form.department.trim()) errs.department = 'Department is required';
    if (!form.yearOfStudy) errs.yearOfStudy = 'Year of study is required';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Invalid email';
    if (!form.language) errs.language = 'Please select a language';
    return errs;
  };

  /* ── Submit ── */
  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }

    setLoading(true);
    try {
      const { data } = await api.post('/student/register', form);
      if (data.success) {
        // Store student roll in sessionStorage for later rounds
        sessionStorage.setItem('contestRollNumber', form.rollNumber.trim());
        setSubmitted(true);
        // Redirect after brief success animation
        setTimeout(() => navigate('/contest'), 1400);
      }
    } catch (err) {
      setErrors({ _global: err.response?.data?.message || 'Registration failed. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="reg-success">
        <div className="reg-success__icon">✓</div>
        <h2>Registered!</h2>
        <p>Redirecting to contest…</p>
      </div>
    );
  }

  return (
    <div className="reg-page">
      <div className="reg-page__card">
        {/* Header */}
        <div className="reg-page__header">
          <span className="reg-page__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
            ⬡ Bug Hunters
          </span>
          <h1 className="reg-page__title">Enter the Arena</h1>
          <p className="reg-page__sub">Fill in your details and pick your weapon.</p>
        </div>

        {/* Global error */}
        {errors._global && (
          <div className="reg-page__alert">{errors._global}</div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* ── Info fields ── */}
          <div className="reg-page__grid">
            <Field label="Full Name" name="fullName" value={form.fullName}
              onChange={handleChange} error={errors.fullName} placeholder="Arjun Mehta" />
            <Field label="Roll Number" name="rollNumber" value={form.rollNumber}
              onChange={handleChange} error={errors.rollNumber} placeholder="2024CS0042" />
            <Field label="College Name" name="collegeName" value={form.collegeName}
              onChange={handleChange} error={errors.collegeName} placeholder="Indian Institute of Technology" />
            <Field label="Department" name="department" value={form.department}
              onChange={handleChange} error={errors.department} placeholder="Computer Science" />
          </div>

          <div className="reg-page__row">
            {/* Year of Study */}
            <div className="reg-page__field">
              <label>Year of Study</label>
              <select name="yearOfStudy" value={form.yearOfStudy} onChange={handleChange}
                className={errors.yearOfStudy ? 'input input--error' : 'input'}>
                <option value="">Select year</option>
                {[1, 2, 3, 4, 5, 6].map(y => <option key={y} value={y}>{y}{y === 1 ? 'st' : y === 2 ? 'nd' : y === 3 ? 'rd' : 'th'} Year</option>)}
              </select>
              {errors.yearOfStudy && <span className="reg-page__error">{errors.yearOfStudy}</span>}
            </div>

            {/* Email */}
            <div className="reg-page__field">
              <label>Email</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                className={errors.email ? 'input input--error' : 'input'}
                placeholder="arjun@iit.edu" />
              {errors.email && <span className="reg-page__error">{errors.email}</span>}
            </div>
          </div>

          {/* ── Language Selection ── */}
          <div className="reg-page__section">
            <label className="reg-page__section-label">
              Choose Your Language
              <span className="reg-page__section-note">— locked after registration</span>
            </label>
            {errors.language && <span className="reg-page__error" style={{ marginBottom: 8 }}>{errors.language}</span>}

            <div className="lang-cards">
              {LANGUAGES.map(lang => (
                <div
                  key={lang.value}
                  className={`lang-card ${form.language === lang.value ? 'lang-card--active' : ''}`}
                  onClick={() => selectLanguage(lang.value)}
                  style={{ '--card-color': lang.color }}
                >
                  <span className="lang-card__icon">{lang.icon}</span>
                  <span className="lang-card__label">{lang.label}</span>
                  <span className="lang-card__desc">{lang.desc}</span>
                  {form.language === lang.value && <span className="lang-card__check">✓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* ── Submit ── */}
          <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Registering…' : 'Register & Start Contest'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ── Reusable text input ── */
function Field({ label, name, value, onChange, error, placeholder }) {
  return (
    <div className="reg-page__field">
      <label>{label}</label>
      <input type="text" name={name} value={value} onChange={onChange}
        className={error ? 'input input--error' : 'input'}
        placeholder={placeholder} />
      {error && <span className="reg-page__error">{error}</span>}
    </div>
  );
}

export default RegistrationPage;
