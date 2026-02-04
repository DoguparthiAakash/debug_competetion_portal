import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import './AdminLogin.css';

function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    console.log('[AdminLogin] Attempting login...');

    try {
      const { data } = await api.post('/admin/login', { username, password });
      console.log('[AdminLogin] Login response:', { success: data.success, hasToken: !!data.token });

      if (data.success && data.token) {
        console.log('[AdminLogin] Saving token to sessionStorage (clears on refresh)...');
        sessionStorage.setItem('adminToken', data.token);

        // Verify it was saved
        const savedToken = sessionStorage.getItem('adminToken');
        console.log('[AdminLogin] Token saved successfully:', {
          tokenSaved: !!savedToken,
          tokenPreview: savedToken ? `${savedToken.substring(0, 20)}...` : 'null'
        });

        console.log('[AdminLogin] Navigating to /admin/dashboard');
        navigate('/admin/dashboard');
      } else {
        setError('Login failed - no token received');
      }
    } catch (err) {
      console.error('[AdminLogin] Login error:', err);
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <div className="admin-login__icon">⬡</div>
        <h1>Admin Panel</h1>
        <p>Manage rounds, questions, and results</p>

        {error && <div className="admin-login__error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="admin-login__field">
            <label>Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)}
              className="input" placeholder="admin" required />
          </div>
          <div className="admin-login__field">
            <label>Password</label>
            <div className="admin-login__password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                className="admin-login__toggle-password"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>
          <button type="submit" className="btn btn--primary btn--lg" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AdminLogin;
