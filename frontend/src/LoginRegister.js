import React, { useState, useEffect } from 'react';

const initialAuthForm = { name: '', email: '', phone: '', password: '' };

/**
 * LoginRegister component handles user authentication and registration.
 * Now uses JWT token-based authentication (Phase 1: Security Hardening)
 */
export default function LoginRegister({ onAuthSuccess, apiBaseUrl }) {
  const [authForm, setAuthForm] = useState(initialAuthForm);
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [healthMessage, setHealthMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchJson = async (path, options = {}) => {
    const requestUrl = `${apiBaseUrl}${path}`;
    try {
      const response = await fetch(requestUrl, options);
      const textResponse = await response.text().catch(() => null);
      let responseData = null;
      try {
        responseData = textResponse ? JSON.parse(textResponse) : null;
      } catch {
        responseData = null;
      }
      if (!response.ok) {
        throw new Error(responseData?.message || responseData?.error || textResponse || response.statusText || 'Network response was not ok');
      }
      return responseData;
    } catch (error) {
      if (error.message === 'Failed to fetch') {
        const fallbackUrl = requestUrl.includes('127.0.0.1')
          ? requestUrl.replace('127.0.0.1', 'localhost')
          : requestUrl.replace('localhost', '127.0.0.1');
        const fallbackResponse = await fetch(fallbackUrl, options).catch(() => null);
        if (fallbackResponse && fallbackResponse.ok) {
          const responseData = await fallbackResponse.json().catch(() => null);
          return responseData;
        }
      }
      throw error;
    }
  };

  const handleAuthSubmit = async () => {
    const identifier = authForm.email || authForm.phone;
    if (!identifier || !authForm.password) {
      setErrorMessage('Please provide email or phone, and password.');
      return;
    }

    if (isRegisterMode && !authForm.name.trim()) {
      setErrorMessage('Please provide your full name to register.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setInfoMessage('');

    try {
      if (isRegisterMode) {
        const payload = {
          name: authForm.name.trim(),
          email: authForm.email.trim().toLowerCase(),
          phone: authForm.phone.trim(),
          password: authForm.password,
        };
        
        // Register
        await fetchJson('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        
        // Then login
        const loginData = await fetchJson('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email_or_phone: authForm.email.trim().toLowerCase(),
            password: authForm.password,
          }),
        });
        
        onAuthSuccess({ token: loginData.token, user: loginData.user });
        return;
      }

      // Login
      const data = await fetchJson('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email_or_phone: identifier.trim(),
          password: authForm.password,
        }),
      });

      onAuthSuccess({ token: data.token, user: data.user });
    } catch (error) {
      console.error('Authentication failed:', error);
      setErrorMessage(error.message || (isRegisterMode ? 'Registration failed. Please try again.' : 'Login failed. Please check your credentials and try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsRegisterMode(!isRegisterMode);
    setErrorMessage('');
    setInfoMessage('');
  };

  const checkBackendHealth = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/health`, { method: 'GET' });
      const data = await response.json();
      setHealthMessage(data?.status === 'ok' ? 'Server ready' : 'Backend not available');
    } catch {
      setHealthMessage('Backend unavailable. Start your API on port 5000.');
    }
  };

  useEffect(() => {
    checkBackendHealth();
  }, [apiBaseUrl]);

  return (
    <div style={s.page}>
      <div style={s.card}>
        <h2 style={{ color: '#2e7d32' }}>AgriLink</h2>
        <p>{isRegisterMode ? 'Create your AgriLink account' : 'Sign in with email or phone'}</p>
        {healthMessage && <p style={s.healthText}>{healthMessage}</p>}
        {isRegisterMode && (
          <input
            style={s.input}
            placeholder="Full Name"
            value={authForm.name}
            onChange={(e) => setAuthForm((curr) => ({ ...curr, name: e.target.value }))}
          />
        )}
        <input
          style={s.input}
          placeholder="Email Address"
          value={authForm.email}
          onChange={(e) => setAuthForm((curr) => ({ ...curr, email: e.target.value }))}
        />
        <input
          style={s.input}
          placeholder="Phone Number"
          value={authForm.phone}
          onChange={(e) => setAuthForm((curr) => ({ ...curr, phone: e.target.value }))}
        />
        <input
          style={s.input}
          type="password"
          placeholder="Password"
          value={authForm.password}
          onChange={(e) => setAuthForm((curr) => ({ ...curr, password: e.target.value }))}
        />
        {infoMessage && <p style={s.infoText}>{infoMessage}</p>}
        {errorMessage && <p style={s.errorText}>{errorMessage}</p>}
        <button style={s.btn} onClick={handleAuthSubmit} disabled={isLoading}>
          {isLoading ? (isRegisterMode ? 'Registering...' : 'Signing in...') : isRegisterMode ? 'Create Account' : 'Sign In'}
        </button>
        <button
          style={{ ...s.linkButton, marginTop: '10px' }}
          onClick={toggleMode}
        >
          {isRegisterMode ? 'Already have an account? Sign in' : 'New here? Create an account'}
        </button>
      </div>
    </div>
  );
}

const s = {
  page: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    background: '#1a1a1a', // Dark theme background
  },
  card: {
    background: '#2d2d2d', // Dark card background
    padding: '30px',
    borderRadius: '12px',
    width: '320px',
    textAlign: 'center',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
    color: '#ffffff', // White text for dark theme
  },
  input: {
    width: '100%',
    padding: '12px',
    margin: '5px 0',
    borderRadius: '8px',
    border: '1px solid #555',
    boxSizing: 'border-box',
    background: '#3a3a3a',
    color: '#ffffff',
  },
  btn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#2e7d32',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  infoText: {
    color: '#4caf50',
    marginBottom: '12px',
    fontSize: '14px',
  },
  healthText: {
    color: '#cfdc39',
    marginBottom: '12px',
    fontSize: '13px',
  },
  errorText: {
    color: '#f44336',
    marginBottom: '12px',
    fontSize: '14px',
  },
  linkButton: {
    width: '100%',
    background: 'transparent',
    border: '1px solid #2e7d32',
    color: '#2e7d32',
    borderRadius: '8px',
    padding: '10px',
    cursor: 'pointer',
    fontWeight: 'bold',
  },
};