import React, { useState } from 'react';
import { campaignsAPI, Account } from '../api';

interface CampaignFormProps {
  accounts: Account[];
  onSuccess: () => void;
  onCancel: () => void;
}

const CampaignForm: React.FC<CampaignFormProps> = ({ accounts, onSuccess, onCancel }) => {
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  const [intervalValue, setIntervalValue] = useState(24);
  const [intervalUnit, setIntervalUnit] = useState('hours');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = accounts.filter(acc => acc.status === 'active');

  const getIntervalSeconds = () => {
    const multipliers = { seconds: 1, minutes: 60, hours: 3600, days: 86400 };
    return intervalValue * multipliers[intervalUnit as keyof typeof multipliers];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await campaignsAPI.createCampaign({
        account_id: accountId,
        name,
        interval_seconds: getIntervalSeconds(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error creating campaign');
    } finally {
      setLoading(false);
    }
  };

  if (activeAccounts.length === 0) {
    return (
      <div className="form-container">
        <h2>🎯 Create Campaign</h2>
        <div className="error">
          No active accounts found. Please create and verify an account first.
        </div>
        <button onClick={onCancel} className="btn btn-secondary">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>🎯 Create New Campaign</h2>
      <p>Set up an automated follow-up sequence</p>
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="accountId">Account</label>
          <select
            id="accountId"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            required
          >
            <option value="">Select an account</option>
            {activeAccounts.map(account => (
              <option key={account.id} value={account.id}>
                {account.phone}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor="name">Campaign Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Lead Follow-up, Customer Outreach"
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="interval">Message Interval</label>
          <div className="interval-input">
            <input
              type="number"
              value={intervalValue}
              onChange={(e) => setIntervalValue(Number(e.target.value))}
              placeholder="Interval"
              min="1"
              required
            />
            <select
              value={intervalUnit}
              onChange={(e) => setIntervalUnit(e.target.value)}
            >
              <option value="seconds">seconds</option>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
          <small>Messages will be sent every {intervalValue} {intervalUnit}</small>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? '⏳ Creating...' : '🎯 Create Campaign'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>

      <div className="form-note">
        <p><strong>Note:</strong> After creating the campaign, you'll need to add message steps to define what gets sent at each stage.</p>
      </div>
    </div>
  );
};

export default CampaignForm;
