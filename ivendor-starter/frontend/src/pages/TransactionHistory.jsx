import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import './TransactionHistory.css';

export function TransactionHistory() {
  const [transactions, setTransactions] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all'); // all, earn, redeem, conversion

  useEffect(() => {
    fetchTransactionData();
  }, []);

  const fetchTransactionData = async () => {
    try {
      const [txRes, redRes] = await Promise.all([
        fetch(`${api.baseURL}/rewards/transactions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch(`${api.baseURL}/rewards/redemptions`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData);
      }

      if (redRes.ok) {
        const redData = await redRes.json();
        setRedemptions(redData);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(tx => {
    if (filter === 'all') return true;
    return tx.transaction_type === filter;
  });

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FFC107';
      case 'rejected': return '#F44336';
      default: return '#999';
    }
  };

  if (loading) return <div className="transaction-history loading">Loading history...</div>;

  return (
    <div className="transaction-history">
      <h1>Transaction History</h1>

      <div className="filter-section">
        <h3>Filter by Type</h3>
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'earn' ? 'active' : ''}`}
            onClick={() => setFilter('earn')}
          >
            Earned
          </button>
          <button
            className={`filter-btn ${filter === 'redeem' ? 'active' : ''}`}
            onClick={() => setFilter('redeem')}
          >
            Redeemed
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="history-sections">
        <div className="transactions-section">
          <h2>Points Transactions</h2>
          {filteredTransactions.length === 0 ? (
            <p className="empty-state">No transactions found</p>
          ) : (
            <div className="transactions-list">
              {filteredTransactions.map((tx) => (
                <div key={tx.id} className={`transaction-item ${tx.transaction_type}`}>
                  <div className="tx-icon">
                    {tx.transaction_type === 'earn' ? '⬆' : '⬇'}
                  </div>
                  <div className="tx-details">
                    <h4>{tx.reason}</h4>
                    <p className="tx-date">{new Date(tx.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className={`tx-points ${tx.points_change > 0 ? 'positive' : 'negative'}`}>
                    {tx.points_change > 0 ? '+' : ''}{tx.points_change}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="redemptions-section">
          <h2>Redemptions & Conversions</h2>
          {redemptions.length === 0 ? (
            <p className="empty-state">No redemptions yet</p>
          ) : (
            <div className="redemptions-list">
              {redemptions.map((redemption) => {
                const metadata = redemption.metadata || {};
                return (
                  <div key={redemption.id} className="redemption-item">
                    <div className="redemption-header">
                      <h4>{metadata.converted_points ? 'Point Conversion' : 'Reward Redeemed'}</h4>
                      <span
                        className="status-badge"
                        style={{ backgroundColor: getStatusBadgeColor(redemption.status) }}
                      >
                        {redemption.status}
                      </span>
                    </div>
                    <div className="redemption-details">
                      {metadata.converted_points && (
                        <>
                          <p><strong>Points Converted:</strong> {metadata.converted_points}</p>
                          <p><strong>Target:</strong> {metadata.target === 'canteen' ? 'Canteen Voucher' : 'Fee Refund'}</p>
                        </>
                      )}
                      <p className="redemption-id">ID: {redemption.id}</p>
                      <p className="redemption-date">
                        {new Date(redemption.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
