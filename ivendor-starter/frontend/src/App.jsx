import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/Home';
import { Dashboard } from './pages/Dashboard';
import { RewardsCatalog } from './pages/RewardsCatalog';
import { ConversionForm } from './pages/ConversionForm';
import { TransactionHistory } from './pages/TransactionHistory';
import { AdminPanel } from './pages/AdminPanel';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setIsLoggedIn(true);
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUser(null);
  };

  if (!isLoggedIn) {
    return (
      <div className="app auth-page">
        <div className="auth-container">
          <h1>💡 I-Vendor</h1>
          <p>Idea Vending Machine for Engineering Students</p>
          <LoginForm onLogin={(userData) => {
            setUser(userData);
            setIsLoggedIn(true);
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Navbar user={user} onLogout={handleLogout} />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/rewards-catalog" element={<RewardsCatalog />} />
          <Route path="/convert" element={<ConversionForm />} />
          <Route path="/history" element={<TransactionHistory />} />
          <Route path="/admin" element={<AdminPanel />} />
          <Route path="/ideas" element={<IdeasPage />} />
          <Route path="/mentors" element={<MentorsPage />} />
          <Route path="/materials" element={<MaterialsPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
        </Routes>
      </main>
      <Footer />
    </div>
  );
}

function Navbar({ user, onLogout }) {
  const location = useLocation();

  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/">
          <h1>💡 I-Vendor</h1>
        </Link>
      </div>

      <div className="navbar-menu">
        <Link to="/home" className={`nav-link ${isActive('/home')}`}>Home</Link>
        <Link to="/rewards-catalog" className={`nav-link ${isActive('/rewards-catalog')}`}>Rewards</Link>
        <Link to="/convert" className={`nav-link ${isActive('/convert')}`}>Convert Points</Link>
        <Link to="/history" className={`nav-link ${isActive('/history')}`}>History</Link>
        <Link to="/ideas" className={`nav-link ${isActive('/ideas')}`}>Ideas</Link>
        <Link to="/mentors" className={`nav-link ${isActive('/mentors')}`}>Mentors</Link>

        {user?.role === 'mentor' && (
          <Link to="/admin" className={`nav-link ${isActive('/admin')}`}>Admin</Link>
        )}
      </div>

      <div className="navbar-user">
        <span className="user-info">🧑‍🎓 {user?.name}</span>
        <button className="btn-logout" onClick={onLogout}>Logout</button>
      </div>
    </nav>
  );
}

function LoginForm({ onLogin }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/v1/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        onLogin(data.user);
      } else {
        const errData = await response.json();
        setError(errData.error || 'Login failed');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && <div className="error-banner">{error}</div>}

      <div className="form-group">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          placeholder="your@email.com"
          required
        />
      </div>

      <div className="form-group">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleInputChange}
          placeholder="Password"
          required
        />
      </div>

      <button type="submit" disabled={loading} className="btn btn-primary btn-large">
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <p className="demo-hint">Demo: student@example.com / password123</p>
    </form>
  );
}

function IdeasPage() {
  const [ideas, setIdeas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('http://localhost:3000/api/v1/ideas', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(d => { setIdeas(d); setLoading(false); })
      .catch(e => console.error(e));
  }, []);

  return (
    <div className="page">
      <h2>🚀 Project Ideas Vending Machine</h2>
      <p>Browse 35+ engineering project ideas across all departments</p>
      {loading ? <p>Loading...</p> : (
        <div className="ideas-grid">
          {ideas.map(idea => (
            <div key={idea.id} className="card">
              <h3>{idea.title}</h3>
              <p><strong>Dept:</strong> {idea.department_id}</p>
              <p><strong>Cost:</strong> ₹{idea.estimated_cost}</p>
              <p><strong>Time:</strong> {idea.estimated_time_weeks} weeks</p>
              <p><strong>Level:</strong> {idea.difficulty}</p>
              <button className="btn-primary">Select & Start</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MentorsPage() {
  const [mentors, setMentors] = React.useState([]);

  React.useEffect(() => {
    fetch('http://localhost:3000/api/v1/mentors', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(d => setMentors(d))
      .catch(e => console.error(e));
  }, []);

  return (
    <div className="page">
      <h2>👨‍🏫 Alumni Mentors</h2>
      <p>Book sessions with experienced alumni mentors</p>
      <div className="mentors-list">
        {mentors.map(mentor => (
          <div key={mentor.id} className="card">
            <h3>{mentor.name}</h3>
            <p><strong>Email:</strong> {mentor.email}</p>
            <p><strong>Experience:</strong> {mentor.experience_years} years</p>
            <p><strong>Rate:</strong> ₹{mentor.hourly_rate}/hr</p>
            <button className="btn-primary">Book Session</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MaterialsPage() {
  const [materials, setMaterials] = React.useState([]);

  React.useEffect(() => {
    fetch('http://localhost:3000/api/v1/materials', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => r.json())
      .then(d => setMaterials(d))
      .catch(e => console.error(e));
  }, []);

  return (
    <div className="page">
      <h2>🛒 Material & Components Market</h2>
      <p>Browse 40+ components and kits from verified vendors</p>
      <div className="materials-grid">
        {materials.map(material => (
          <div key={material.id} className="card">
            <h4>{material.name}</h4>
            <p><strong>Category:</strong> {material.category}</p>
            <p><strong>Price:</strong> ₹{material.unit_price}</p>
            <p><strong>Stock:</strong> {material.stock_quantity}</p>
            <button className="btn-primary">Add to Cart</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function AttendancePage() {
  return (
    <div className="page">
      <h2>📍 Smart Attendance</h2>
      <div className="attendance-modes">
        <div className="card">
          <h3>RFID Card</h3>
          <button className="btn-primary">Tap Card</button>
        </div>
        <div className="card">
          <h3>Facial Recognition</h3>
          <button className="btn-primary">Scan Face</button>
        </div>
        <div className="card">
          <h3>Fingerprint</h3>
          <button className="btn-primary">Scan Finger</button>
        </div>
        <div className="card">
          <h3>QR Code</h3>
          <button className="btn-primary">Scan QR</button>
        </div>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <p>© 2024 I-Vendor Platform | Idea Vending Machine for Engineering Students</p>
    </footer>
  );
}

export default App;
