import React, { useState } from 'react';
import HomePage from './pages/Home';
import './styles.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [user, setUser] = useState({ id: '1', name: 'Rahul Patel', role: 'student' });

  return (
    <div className="app">
      <nav className="navbar">
        <h1>💡 I-Vendor</h1>
        <div className="nav-links">
          <button onClick={() => setCurrentPage('home')}>Home</button>
          <button onClick={() => setCurrentPage('ideas')}>Ideas</button>
          <button onClick={() => setCurrentPage('mentors')}>Mentors</button>
          <button onClick={() => setCurrentPage('materials')}>Materials</button>
          <button onClick={() => setCurrentPage('rewards')}>Rewards</button>
          <button onClick={() => setCurrentPage('attendance')}>Attendance</button>
          <span>�� {user.name}</span>
        </div>
      </nav>

      <main className="container">
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'ideas' && <IdeasPage />}
        {currentPage === 'mentors' && <MentorsPage />}
        {currentPage === 'materials' && <MaterialsPage />}
        {currentPage === 'rewards' && <RewardsPage />}
        {currentPage === 'attendance' && <AttendancePage />}
      </main>

      <footer className="footer">
        <p>© 2024 I-Vendor Platform | Idea Vending Machine for Engineering Students</p>
      </footer>
    </div>
  );
}

function IdeasPage() {
  const [ideas, setIdeas] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch('http://localhost:3000/api/v1/ideas')
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
    fetch('http://localhost:3000/api/v1/mentors')
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
    fetch('http://localhost:3000/api/v1/materials')
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

function RewardsPage() {
  const [rewards, setRewards] = React.useState([]);
  const [wallet, setWallet] = React.useState(null);

  React.useEffect(() => {
    Promise.all([
      fetch('http://localhost:3000/api/v1/rewards/catalog').then(r => r.json()),
      fetch('http://localhost:3000/api/v1/rewards/wallet/1').then(r => r.json())
    ]).then(([r, w]) => {
      setRewards(r);
      setWallet(w);
    });
  }, []);

  return (
    <div className="page">
      <h2>�� Rewards & Loyalty</h2>
      {wallet && <div className="wallet-card">
        <p><strong>Points Balance:</strong> {wallet.available_points}</p>
        <p><strong>Total Earned:</strong> {wallet.total_points}</p>
        <p><strong>Tier:</strong> {wallet.tier}</p>
      </div>}
      <div className="rewards-grid">
        {rewards.map(reward => (
          <div key={reward.id} className="card">
            <h4>{reward.name}</h4>
            <p>{reward.description}</p>
            <p><strong>Cost:</strong> {reward.points_required} points</p>
            <button className="btn-primary">Redeem</button>
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

export default App;
