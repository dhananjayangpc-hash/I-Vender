import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import './ConversionForm.css';

export function ConversionForm() {
  const [wallet, setWallet] = useState(null);
  const [formData, setFormData] = useState({ target: 'canteen', points: '' });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    fetchWallet();
  }, []);

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!formData.points || formData.points <= 0) {
      setError('Please enter a valid number of points');
      return;
    }

    if (wallet && formData.points > wallet.available_points) {
      setError('Insufficient points');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${api.baseURL}/rewards/convert`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          target: formData.target,
          points: parseInt(formData.points)
        })
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess({
          message: data.message,
          voucher: data.voucher,
          redemption: data.redemption
        });
        setFormData({ target: 'canteen', points: '' });
        fetchWallet();
      } else {
        const errData = await response.json();
        setError(errData.error || 'Failed to process conversion');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="conversion-form loading">Loading...</div>;

  const maxConvertible = wallet?.available_points || 0;

  return (
    <div className="conversion-form">
      <h1>Convert Points</h1>
      <p className="subtitle">Exchange your loyalty points for tangible rewards</p>

      {wallet && (
        <div className="wallet-info">
          <div className="info-card">
            <h3>Available Points</h3>
            <p className="amount">{wallet.available_points}</p>
          </div>
          <div className="info-card">
            <h3>Current Tier</h3>
            <p className="tier">{wallet.current_tier}</p>
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}
      {success && (
        <div className="success-banner">
          <h3>✓ {success.message}</h3>
          {success.voucher && (
            <div className="voucher-code">
              <p>Your Voucher Code:</p>
              <code>{success.voucher}</code>
              <p className="hint">Show this code at the college canteen</p>
            </div>
          )}
          {success.redemption && (
            <p className="redemption-id">Redemption ID: {success.redemption.id}</p>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="conversion-form-fields">
        <div className="form-group">
          <label htmlFor="target">Conversion Target</label>
          <select
            id="target"
            name="target"
            value={formData.target}
            onChange={handleInputChange}
            className="select-field"
          >
            <option value="canteen">Canteen Voucher</option>
            <option value="cash">Fee Refund (Cash)</option>
          </select>
          <p className="field-hint">
            {formData.target === 'canteen' 
              ? 'Get a voucher code to use at the college canteen'
              : 'Request a refund that will be credited to your account'}
          </p>
        </div>

        <div className="form-group">
          <label htmlFor="points">Points to Convert</label>
          <div className="input-wrapper">
            <input
              id="points"
              type="number"
              name="points"
              value={formData.points}
              onChange={handleInputChange}
              placeholder="Enter points"
              min="1"
              max={maxConvertible}
              className="input-field"
            />
            <button
              type="button"
              className="btn-max"
              onClick={() => setFormData(prev => ({ ...prev, points: maxConvertible.toString() }))}
            >
              Max
            </button>
          </div>
          <p className="field-hint">You can convert up to {maxConvertible} points</p>
        </div>

        <div className="conversion-preview">
          <h3>Conversion Summary</h3>
          <div className="preview-row">
            <span>Points to Convert:</span>
            <strong>{formData.points || 0} pts</strong>
          </div>
          <div className="preview-row">
            <span>Conversion Type:</span>
            <strong>{formData.target === 'canteen' ? 'Canteen Voucher' : 'Fee Refund'}</strong>
          </div>
          <div className="preview-row highlight">
            <span>Estimated Value:</span>
            <strong>₹{Math.floor((formData.points || 0) * 1.5)}</strong>
          </div>
          <p className="conversion-note">1 point ≈ ₹1.50</p>
        </div>

        <button
          type="submit"
          disabled={submitting || !formData.points}
          className="btn btn-primary btn-large"
        >
          {submitting ? 'Processing...' : 'Confirm Conversion'}
        </button>
      </form>
    </div>
  );
}
