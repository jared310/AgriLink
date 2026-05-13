import React, { useState, useEffect } from 'react';
import './App.css';

// REPLACE THIS with your actual Render backend URL once it is live
const API_BASE_URL = 'https://agrilink-backend.onrender.com';

function App() {
  const [status, setStatus] = useState('Connecting...');
  const [formData, setFormData] = useState({ email: '', password: '', username: '' });
  const [user, setUser] = useState(null);

  // Check connection to backend on load
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/status`)
      .then(res => res.json())
      .then(data => setStatus(data.message))
      .catch(() => setStatus('Backend Offline'));
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAuth = async (endpoint) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      alert(data.message);
      if (response.ok && endpoint === 'login') {
        setUser(data.user);
      }
    } catch (err) {
      alert('Error connecting to the server');
    }
  };

  return (
    <div className="App" style={{ textAlign: 'center', padding: '50px' }}>
      <h1>AgriLink Marketplace</h1>
      <p>Server Status: <strong>{status}</strong></p>

      {user ? (
        <h2>Welcome back, {user}!</h2>
      ) : (
        <div style={{ maxWidth: '300px', margin: '0 auto' }}>
          <h3>Login or Register</h3>
          <input name="username" placeholder="Username (for registration)" onChange={handleInputChange} style={{display: 'block', width: '100%', marginBottom: '10px'}} />
          <input name="email" placeholder="Email" onChange={handleInputChange} style={{display: 'block', width: '100%', marginBottom: '10px'}} />
          <input name="password" type="password" placeholder="Password" onChange={handleInputChange} style={{display: 'block', width: '100%', marginBottom: '10px'}} />
          
          <button onClick={() => handleAuth('register')} style={{marginRight: '10px'}}>Register</button>
          <button onClick={() => handleAuth('login')}>Login</button>
        </div>
      )}
    </div>
  );
}

export default App;