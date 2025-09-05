import React, { useState, useEffect } from 'react';
import { campaignsAPI, Account, accountsAPI } from '../api';
import { useToast } from '../contexts/ToastContext';

interface CampaignFormPageProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface StepForm {
  step_number: number;
  message: string;
  interval_value: number;
  interval_unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

const CampaignFormPage: React.FC<CampaignFormPageProps> = ({ onSuccess, onCancel }) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  // Default interval to prefill each step
  const [defaultIntervalValue, setDefaultIntervalValue] = useState(24);
  const [defaultIntervalUnit, setDefaultIntervalUnit] = useState<'seconds'|'minutes'|'hours'|'days'>('hours');
  const [maxSteps, setMaxSteps] = useState(3);
  const [steps, setSteps] = useState<StepForm[]>([
    { step_number: 1, message: '', interval_value: 24, interval_unit: 'hours' }
  ]);
  const [loading, setLoading] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { showSuccess, showError } = useToast();

  // Load accounts on component mount
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountsData = await accountsAPI.getAccounts();
        setAccounts(accountsData);
        
        // Auto-select first active account if available
        const activeAccounts = accountsData.filter(acc => acc.status === 'active');
        if (activeAccounts.length > 0) {
          setAccountId(activeAccounts[0].id);
        }
      } catch (err: any) {
        showError('Error', 'Failed to load accounts');
      } finally {
        setLoadingAccounts(false);
      }
    };

    loadAccounts();
  }, [showError]);

  const activeAccounts = accounts.filter(acc => acc.status === 'active');

  const toSeconds = (value: number, unit: StepForm['interval_unit']) => {
    const multipliers = { seconds: 1, minutes: 60, hours: 3600, days: 86400 } as const;
    return value * multipliers[unit];
  };

  const addStep = () => {
    if (steps.length < maxSteps) {
      setSteps([
        ...steps,
        { step_number: steps.length + 1, message: '', interval_value: defaultIntervalValue, interval_unit: defaultIntervalUnit }
      ]);
    }
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      const newSteps = steps.filter((_, i) => i !== index);
      // Renumber steps
      const renumberedSteps = newSteps.map((step, i) => ({
        ...step,
        step_number: i + 1
      }));
      setSteps(renumberedSteps);
    }
  };

  const updateStep = (index: number, message: string) => {
    const newSteps = [...steps];
    newSteps[index].message = message;
    setSteps(newSteps);
  };
  const updateStepInterval = (index: number, value: number, unit?: StepForm['interval_unit']) => {
    const newSteps = [...steps];
    newSteps[index].interval_value = value;
    if (unit) newSteps[index].interval_unit = unit;
    setSteps(newSteps);
  };

  const updateMaxSteps = (newMaxSteps: number) => {
    setMaxSteps(newMaxSteps);
    // Adjust steps array if needed
    if (steps.length > newMaxSteps) {
      setSteps(steps.slice(0, newMaxSteps));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    // Validate that all steps have messages
    const emptySteps = steps.filter(step => !step.message.trim());
    if (emptySteps.length > 0) {
      setError('All steps must have a message');
      setLoading(false);
      return;
    }
    
    try {
      const campaign = await campaignsAPI.createCampaign({
        account_id: accountId,
        name,
        interval_seconds: toSeconds(defaultIntervalValue, defaultIntervalUnit),
        max_steps: maxSteps,
      });

      // Add all steps to the campaign
    for (const step of steps) {
        await campaignsAPI.addCampaignStep(campaign.id, {
          step_number: step.step_number,
      message: step.message,
      interval_seconds: toSeconds(step.interval_value, step.interval_unit),
        });
      }

      showSuccess('Success', 'Campaign created successfully!');
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error creating campaign');
      showError('Error', 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  if (loadingAccounts) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p>Loading accounts...</p>
        </div>
      </div>
    );
  }

  if (activeAccounts.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <button onClick={onCancel} className="btn btn-secondary back-btn">
            ← Back to Campaigns
          </button>
          <h1>🎯 Create New Campaign</h1>
        </div>
        
        <div className="empty-state-card">
          <div className="empty-icon">📞</div>
          <h2>No Active Accounts Found</h2>
          <p>You need to create and verify a Telegram account before creating campaigns.</p>
          <button onClick={onCancel} className="btn btn-primary">
            Go to Accounts
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={onCancel} className="btn btn-secondary back-btn">
          ← Back to Campaigns
        </button>
        <div className="header-content">
          <h1>🎯 Create New Campaign</h1>
          <p>Set up an automated follow-up sequence to engage with your contacts</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="campaign-form">
        {/* Basic Information Section */}
        <div className="form-section">
          <div className="section-header">
            <h2>📋 Basic Information</h2>
            <p>Configure the fundamental settings for your campaign</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Campaign Name *</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Lead Follow-up, Customer Outreach"
                required
                className="form-input"
              />
              <small>Choose a descriptive name for easy identification</small>
            </div>

            <div className="form-group">
              <label htmlFor="accountId">Telegram Account *</label>
              <select
                id="accountId"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                className="form-select"
              >
                <option value="">Select an account</option>
                {activeAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name || account.phone}
                  </option>
                ))}
              </select>
              <small>This account will send the campaign messages</small>
            </div>
          </div>
        </div>

        {/* Campaign Settings Section */}
        <div className="form-section">
          <div className="section-header">
            <h2>⚙️ Campaign Settings</h2>
            <p>Define timing and step limits for your campaign</p>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="maxSteps">Maximum Steps *</label>
              <input
                type="number"
                id="maxSteps"
                value={maxSteps}
                onChange={(e) => updateMaxSteps(Number(e.target.value))}
                min="1"
                max="10"
                required
                className="form-input"
              />
              <small>How many follow-up steps this campaign can have</small>
            </div>

            <div className="form-group">
              <label htmlFor="default-interval">Default Step Interval *</label>
              <div className="interval-input">
                <input
                  id="default-interval"
                  type="number"
                  value={defaultIntervalValue}
                  onChange={(e) => setDefaultIntervalValue(Number(e.target.value))}
                  placeholder="Interval"
                  min="1"
                  required
                  className="form-input interval-number"
                />
                <select
                  value={defaultIntervalUnit}
                  onChange={(e) => setDefaultIntervalUnit(e.target.value as StepForm['interval_unit'])}
                  className="form-select interval-unit"
                >
                  <option value="seconds">seconds</option>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              </div>
              <small>Default time between steps. You can override per step below.</small>
            </div>
          </div>
        </div>

        {/* Message Steps Section */}
        <div className="form-section">
          <div className="section-header">
            <h2>💬 Message Steps</h2>
            <p>Create the sequence of messages that will be sent to your contacts</p>
          </div>

          <div className="steps-container">
            {steps.map((step, index) => (
              <div key={index} className="step-card">
                <div className="step-header">
                  <div className="step-indicator">
                    <span className="step-number">{step.step_number}</span>
                    <span className="step-label">Step {step.step_number}</span>
                  </div>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="btn btn-danger-outline btn-sm"
                      title="Remove this step"
                    >
                      🗑️ Remove
                    </button>
                  )}
                </div>
                
                <div className="step-content">
                  <label htmlFor={`step-${index}`}>Message Content *</label>
                  <textarea
                    id={`step-${index}`}
                    value={step.message}
                    onChange={(e) => updateStep(index, e.target.value)}
                    placeholder={`Enter the message for step ${step.step_number}...\n\nTip: Keep it personal and engaging!`}
                    rows={4}
                    required
                    className="form-textarea"
                  />
                  <div className="character-count">
                    {step.message.length} characters
                  </div>
                  <div className="interval-input step-interval">
                    <input
                      type="number"
                      value={step.interval_value}
                      onChange={(e) => updateStepInterval(index, Number(e.target.value))}
                      min={1}
                      required
                      className="form-input interval-number"
                    />
                    <select
                      value={step.interval_unit}
                      onChange={(e) => updateStepInterval(index, step.interval_value, e.target.value as StepForm['interval_unit'])}
                      className="form-select interval-unit"
                    >
                      <option value="seconds">seconds</option>
                      <option value="minutes">minutes</option>
                      <option value="hours">hours</option>
                      <option value="days">days</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
            
            {steps.length < maxSteps && (
              <div className="add-step-container">
                <button
                  type="button"
                  onClick={addStep}
                  className="btn btn-secondary add-step-btn"
                >
                  ➕ Add Step {steps.length + 1}
                </button>
                <small>You can add up to {maxSteps} steps</small>
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="error-card">
            <span className="error-icon">⚠️</span>
            <div className="error-content">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="form-actions">
          <button 
            type="button" 
            onClick={onCancel} 
            className="btn btn-secondary"
            disabled={loading}
          >
            Cancel
          </button>
          <button 
            type="submit" 
            disabled={loading || !accountId || !name || steps.some(s => !s.message.trim())} 
            className="btn btn-primary"
          >
            {loading ? (
              <>
                <span className="loading-spinner small"></span>
                Creating Campaign...
              </>
            ) : (
              <>
                🎯 Create Campaign
              </>
            )}
          </button>
        </div>
      </form>

      {/* Helper Information */}
      <div className="info-card">
        <h3>💡 Campaign Tips</h3>
        <ul>
          <li>Start with a friendly, personalized first message</li>
          <li>Keep messages concise but valuable</li>
          <li>Include clear calls-to-action</li>
          <li>Test your campaign with a small group first</li>
          <li>Monitor response rates and adjust accordingly</li>
        </ul>
      </div>
    </div>
  );
};

export default CampaignFormPage;
