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
  const [intervalSeconds, setIntervalSeconds] = useState(86400); // 24 hours
  const [maxSteps, setMaxSteps] = useState(3);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = accounts.filter(acc => acc.status === 'active');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await campaignsAPI.createCampaign({
        account_id: accountId,
        name,
        interval_seconds: intervalSeconds,
        max_steps: maxSteps,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error creating campaign');
    } finally {
      setLoading(false);
    }
  };

  const handleIntervalChange = (minutes: number) => {
    setIntervalSeconds(minutes * 60);
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
          <div className="interval-buttons">
            <button 
              type="button" 
              onClick={() => handleIntervalChange(5)}
              className={intervalSeconds === 300 ? 'active' : ''}
            >
              5 minutes
            </button>
            <button 
              type="button" 
              onClick={() => handleIntervalChange(60)}
              className={intervalSeconds === 3600 ? 'active' : ''}
            >
              1 hour
            </button>
            <button 
              type="button" 
              onClick={() => handleIntervalChange(1440)}
              className={intervalSeconds === 86400 ? 'active' : ''}
            >
              24 hours
            </button>
            <button 
              type="button" 
              onClick={() => handleIntervalChange(4320)}
              className={intervalSeconds === 259200 ? 'active' : ''}
            >
              3 days
            </button>
          </div>
          <input
            type="number"
            value={Math.round(intervalSeconds / 60)}
            onChange={(e) => setIntervalSeconds(Number(e.target.value) * 60)}
            placeholder="Minutes"
            min="1"
          />
          <small>Current: {Math.round(intervalSeconds / 60)} minutes between messages</small>
        </div>

        <div className="form-group">
          <label htmlFor="maxSteps">Maximum Steps</label>
          <input
            type="number"
            id="maxSteps"
            value={maxSteps}
            onChange={(e) => setMaxSteps(Number(e.target.value))}
            min="1"
            max="10"
            required
          />
          <small>How many follow-up messages to send before stopping</small>
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
