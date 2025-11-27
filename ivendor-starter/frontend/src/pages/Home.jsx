import React, { useState, useEffect } from 'react';

function Home() {
  const [dashboard, setDashboard] = useState(null);

  useEffect(() => {
    fetch('http://localhost:3000/api/v1/admin/dashboard')
      .then(r => r.json())
      .then(d => setDashboard(d))
      .catch(e => console.error(e));
  }, []);

  return (
    <div className="home">
      <div className="hero">
        <h1>💡 Welcome to I-Vendor</h1>
        <p>The Idea Vending Machine for Engineering Students</p>
        <p style={{ fontSize: '1rem', marginTop: '1rem' }}>
          Browse 35+ project ideas • Book alumni mentors • Buy materials • Earn rewards
        </p>
      </div>

      {dashboard && (
        <div className="stats-grid">
          <div className="stat-card">
            <h3>📚 Total Ideas</h3>
            <div className="number">{dashboard.total_ideas}</div>
          </div>
          <div className="stat-card">
            <h3>👥 Active Students</h3>
            <div className="number">{dashboard.total_students}</div>
          </div>
          <div className="stat-card">
            <h3>⭐ Avg Mentor Rating</h3>
            <div className="number">{(dashboard.avg_mentor_rating || 0).toFixed(1)}</div>
          </div>
          <div className="stat-card">
            <h3>✅ Resolved Reports</h3>
            <div className="number">{dashboard.cleanliness_resolved}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: '3rem' }}>
        <h2 style={{ marginBottom: '1rem' }}>🚀 Key Features</h2>
        <div className="features-grid">
          <div className="feature card">
            <h3>💡 Project Vending</h3>
            <p>Browse 35+ ideas across departments. AI recommendations based on budget & skills.</p>
          </div>
          <div className="feature card">
            <h3>🛒 Marketplace</h3>
            <p>40+ components from verified vendors. Alumni suppliers with commission model.</p>
          </div>
          <div className="feature card">
            <h3>👨‍🏫 Mentorship</h3>
            <p>Book sessions with 8+ alumni experts. Hourly rates ₹450-₹700.</p>
          </div>
          <div className="feature card">
            <h3>📍 Smart Attendance</h3>
            <p>RFID, Facial, Fingerprint, QR code check-in with anti-proxy.</p>
          </div>
          <div className="feature card">
            <h3>♻️ RBVM</h3>
            <p>Reverse Bottle Vending. 5 points per bottle. Track carbon saved!</p>
          </div>
          <div className="feature card">
            <h3>🎁 Rewards</h3>
            <p>Earn points & redeem for merchandise, vouchers, and services.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
