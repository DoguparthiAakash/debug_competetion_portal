import React from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing">
      {/* ── Decorative background geometry ── */}
      <div className="landing__geo landing__geo--1" aria-hidden="true" />
      <div className="landing__geo landing__geo--2" aria-hidden="true" />
      <div className="landing__geo landing__geo--3" aria-hidden="true" />

      {/* ── Top nav ── */}
      <nav className="landing__nav">
        <span className="landing__logo">
          <span className="landing__logo-icon">⬡</span> Bug Hunters
        </span>
        <button className="btn btn--ghost" onClick={() => navigate('/admin')}>
          Admin
        </button>
      </nav>

      {/* ── Hero ── */}
      <main className="landing__hero">
        <div className="landing__badge">
          <span className="landing__badge-dot" />
          Kanal 2k26
        </div>

        <h1 className="landing__title">
          Fix the Bug.<br />
          <span className="landing__title-accent">Win the Glory.</span>
        </h1>

        <p className="landing__subtitle">
          Three rounds. Real code. Zero hints. Show your debugging skills
          against the best engineers in your college.
        </p>

        {/* ── Stats row ── */}
        <div className="landing__stats">
          <div className="landing__stat">
            <span className="landing__stat-num">3</span>
            <span className="landing__stat-label">Rounds</span>
          </div>
          <div className="landing__stat">
            <span className="landing__stat-num">9</span>
            <span className="landing__stat-label">Questions</span>
          </div>
          <div className="landing__stat">
            <span className="landing__stat-num">3</span>
            <span className="landing__stat-label">Languages</span>
          </div>
        </div>

        {/* ── CTA ── */}
        <div className="landing__cta">
          <button className="btn btn--primary btn--lg" onClick={() => navigate('/register')}>
            Enter Contest
          </button>
        </div>

        {/* ── Language pills ── */}
        <div className="landing__langs">
          <span className="lang-pill lang-pill--c">C</span>
          <span className="lang-pill lang-pill--java">Java</span>
          <span className="lang-pill lang-pill--py">Python</span>
        </div>
      </main>

      {/* ── Footer note ── */}
      <footer className="landing__footer">
        No account needed · Select your language once · Compete at your own pace
      </footer>
    </div>
  );
}

export default LandingPage;
