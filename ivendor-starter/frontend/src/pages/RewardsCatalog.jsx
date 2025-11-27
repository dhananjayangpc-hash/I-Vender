import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import './RewardsCatalog.css';

export function RewardsCatalog() {
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [redeeming, setRedeeming] = useState(null);

  useEffect(() => {
    fetchRewards();
    fetchWallet();
  }, []);

  const fetchRewards = async () => {
    try {
      const response = await fetch(`${api.baseURL}/rewards/catalog`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setRewards(data);
      } else {
        setError('Failed to load rewards');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchWallet = async () => {
    try {
      const response = await fetch(`${api.baseURL}/rewards/wallet`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setWallet(data);
      }
    } catch (err) {
      console.error('Failed to fetch wallet:', err);
    }
  };

  const handleRedeem = async (rewardId) => {
    setRedeeming(rewardId);
    try {
      const response = await fetch(`${api.baseURL}/rewards/redeem`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ reward_id: rewardId })
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Reward redeemed! Reference: ${data.redemption.id}`);
        fetchRewards();
        fetchWallet();
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.error}`);
      }
    } catch (err) {
      alert(`Failed to redeem: ${err.message}`);
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) return <div className="rewards-catalog loading">Loading rewards...</div>;

  const canAfford = (pointsRequired) => !wallet || wallet.available_points >= pointsRequired;

  return (
    <div className="rewards-catalog">
      <h1>Rewards Catalog</h1>
      
      {wallet && (
        <div className="wallet-banner">
          <p>Available Points: <strong>{wallet.available_points}</strong></p>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="rewards-grid">
        {rewards.length === 0 ? (
          <p className="no-rewards">No rewards available yet</p>
        ) : (
          rewards.map((reward) => (
            <div key={reward.id} className={`reward-card ${!canAfford(reward.points_required) ? 'disabled' : ''}`}>
              <h3>{reward.title}</h3>
              <p className="description">{reward.description}</p>
              <div className="reward-meta">
                <span className="badge badge-primary">{reward.points_required} pts</span>
                <span className="badge badge-info">{reward.reward_type}</span>
              </div>
              <p className="max-redemptions">Max: {reward.max_redemptions} per semester</p>
              
              <button
                onClick={() => handleRedeem(reward.id)}
                disabled={!canAfford(reward.points_required) || redeeming === reward.id}
                className="btn btn-primary"
              >
                {redeeming === reward.id ? 'Redeeming...' : 'Redeem'}
              </button>

              {!canAfford(reward.points_required) && (
                <p className="insufficient-points">Insufficient points</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
