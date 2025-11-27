import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import './Dashboard.css';

export function Dashboard() {
  const [wallet, setWallet] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWalletData();
    fetchRecentTransactions();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await fetch(`${api.baseURL}/rewards/wallet`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWallet(data);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const fetchRecentTransactions = async () => {
    try {
      const response = await fetch(`${api.baseURL}/rewards/transactions`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRecentTransactions(data.slice(0, 5));
      }
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="dashboard loading">Loading...</div>;

  const tierColors = {
    'Bronze': '#CD7F32',
    'Silver': '#C0C0C0',
    'Gold': '#FFD700',
    'Platinum': '#E5E4E2'
  };

  return (
    <div className="dashboard">
      <h1>Welcome to I-Vender</h1>

      <div className="wallet-section">
        {wallet && (
          <>
            <div className="points-card">
              <h2>Available Points</h2>
              <div className="points-display">{wallet.available_points || 0}</div>
              <p className="tier-badge" style={{ borderColor: tierColors[wallet.current_tier] }}>
                {wallet.current_tier} Tier
              </p>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <h3>Lifetime Points</h3>
                <p>{wallet.total_points_earned || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Points Redeemed</h3>
                <p>{wallet.total_points_redeemed || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Pending Conversions</h3>
                <p>{wallet.pending_conversions || 0}</p>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="quick-actions">
        <h2>Quick Actions</h2>
        <div className="action-buttons">
          <a href="/rewards-catalog" className="btn btn-primary">Browse Rewards</a>
          <a href="/convert" className="btn btn-secondary">Convert Points</a>
          <a href="/history" className="btn btn-outline">View History</a>
        </div>
      </div>

      {recentTransactions.length > 0 && (
        <div className="recent-activity">
          <h2>Recent Activity</h2>
          <div className="activity-list">
            {recentTransactions.map((tx, idx) => (
              <div key={idx} className="activity-item">
                <div className="activity-type">{tx.transaction_type}</div>
                <div className="activity-details">
                  <p className="reason">{tx.reason}</p>
                  <p className="date">{new Date(tx.created_at).toLocaleDateString()}</p>
                </div>
                <div className={`points-change ${tx.points_change > 0 ? 'positive' : 'negative'}`}>
                  {tx.points_change > 0 ? '+' : ''}{tx.points_change}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
    </div>
  );
}
