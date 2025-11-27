import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import './AdminPanel.css';

export function AdminPanel() {
  const [pendingConversions, setPendingConversions] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('conversions'); // conversions, rewards
  const [actioningId, setActioningId] = useState(null);

  useEffect(() => {
    fetchAdminData();
  }, []);

  const fetchAdminData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [convRes, rewardRes] = await Promise.all([
        fetch(`${api.baseURL}/rewards/admin/conversions-pending`, { headers }),
        fetch(`${api.baseURL}/rewards/admin/rewards-all`, { headers })
      ]);

      if (convRes.ok) {
        const data = await convRes.json();
        setPendingConversions(data);
      }

      if (rewardRes.ok) {
        const data = await rewardRes.json();
        setRewards(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveConversion = async (redemptionId, studentId) => {
    setActioningId(redemptionId);
    try {
      const response = await fetch(`${api.baseURL}/rewards/admin/conversion-approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ redemption_id: redemptionId })
      });

      if (response.ok) {
        alert('Conversion approved');
        fetchAdminData();
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.error}`);
      }
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectConversion = async (redemptionId) => {
    setActioningId(redemptionId);
    try {
      const response = await fetch(`${api.baseURL}/rewards/admin/conversion-reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ redemption_id: redemptionId, reason: 'Rejected by admin' })
      });

      if (response.ok) {
        alert('Conversion rejected');
        fetchAdminData();
      } else {
        const errData = await response.json();
        alert(`Error: ${errData.error}`);
      }
    } catch (err) {
      alert(`Failed: ${err.message}`);
    } finally {
      setActioningId(null);
    }
  };

  if (loading) return <div className="admin-panel loading">Loading admin data...</div>;

  return (
    <div className="admin-panel">
      <h1>Admin Dashboard</h1>
      
      {error && <div className="error-banner">{error}</div>}

      <div className="admin-tabs">
        <button
          className={`tab-btn ${activeTab === 'conversions' ? 'active' : ''}`}
          onClick={() => setActiveTab('conversions')}
        >
          Pending Conversions ({pendingConversions.length})
        </button>
        <button
          className={`tab-btn ${activeTab === 'rewards' ? 'active' : ''}`}
          onClick={() => setActiveTab('rewards')}
        >
          Rewards Management ({rewards.length})
        </button>
      </div>

      {activeTab === 'conversions' && (
        <div className="conversions-section">
          <h2>Pending Conversions</h2>
          {pendingConversions.length === 0 ? (
            <p className="empty-state">No pending conversions</p>
          ) : (
            <div className="conversions-list">
              {pendingConversions.map((conversion) => {
                const metadata = conversion.metadata || {};
                return (
                  <div key={conversion.id} className="conversion-card">
                    <div className="card-header">
                      <h3>Conversion Request</h3>
                      <span className="badge badge-warning">Pending</span>
                    </div>
                    <div className="card-body">
                      <div className="field">
                        <label>Student ID:</label>
                        <p>{conversion.student_id}</p>
                      </div>
                      <div className="field">
                        <label>Points Requested:</label>
                        <p><strong>{metadata.converted_points}</strong> pts</p>
                      </div>
                      <div className="field">
                        <label>Target:</label>
                        <p>{metadata.target === 'canteen' ? '🍽️ Canteen Voucher' : '💰 Fee Refund'}</p>
                      </div>
                      <div className="field">
                        <label>Requested on:</label>
                        <p>{new Date(conversion.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="card-actions">
                      <button
                        onClick={() => handleApproveConversion(conversion.id, conversion.student_id)}
                        disabled={actioningId === conversion.id}
                        className="btn btn-success"
                      >
                        {actioningId === conversion.id ? 'Processing...' : 'Approve'}
                      </button>
                      <button
                        onClick={() => handleRejectConversion(conversion.id)}
                        disabled={actioningId === conversion.id}
                        className="btn btn-danger"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'rewards' && (
        <div className="rewards-section">
          <h2>Rewards Management</h2>
          {rewards.length === 0 ? (
            <p className="empty-state">No rewards configured</p>
          ) : (
            <div className="rewards-table">
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Points Required</th>
                    <th>Max Redemptions</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward) => (
                    <tr key={reward.id}>
                      <td>{reward.title}</td>
                      <td>{reward.reward_type}</td>
                      <td>{reward.points_required}</td>
                      <td>{reward.max_redemptions}</td>
                      <td>
                        <span className={`badge badge-${reward.is_active ? 'success' : 'danger'}`}>
                          {reward.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
