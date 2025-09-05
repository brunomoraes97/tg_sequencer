import React, { useState } from 'react';
import { campaignsAPI, Account } from '../api';

interface CampaignFormProps {
  accounts: Account[];
  onSuccess: () => void;
  onCancel: () => void;
}

interface StepForm {
  step_number: number;
  message: string;
  interval_value: number;
  interval_unit: 'seconds' | 'minutes' | 'hours' | 'days';
}

const CampaignForm: React.FC<CampaignFormProps> = ({ accounts, onSuccess, onCancel }) => {
  const [accountId, setAccountId] = useState('');
  const [name, setName] = useState('');
  // Default interval used to prefill each step
  const [defaultIntervalValue, setDefaultIntervalValue] = useState(24);
  const [defaultIntervalUnit, setDefaultIntervalUnit] = useState<'seconds'|'minutes'|'hours'|'days'>('hours');
  const [maxSteps, setMaxSteps] = useState(3);
  const [steps, setSteps] = useState<StepForm[]>([
    { step_number: 1, message: '', interval_value: 24, interval_unit: 'hours' }
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = accounts.filter(acc => acc.status === 'active');

  const toSeconds = (value: number, unit: StepForm['interval_unit']) => {
    const multipliers = { seconds: 1, minutes: 60, hours: 3600, days: 86400 } as const;
    return value * multipliers[unit];
  };

  const addStep = () => {
    if (steps.length < maxSteps) {
      setSteps([
        ...steps, 
        { 
          step_number: steps.length + 1, 
          message: '',
          interval_value: defaultIntervalValue,
          interval_unit: defaultIntervalUnit
        }
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
        // Keep a default at campaign level for any steps without override (fallback)
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
                {account.name || account.phone}
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
          <label htmlFor="maxSteps">Maximum Steps</label>
          <input
            type="number"
            id="maxSteps"
            value={maxSteps}
            onChange={(e) => updateMaxSteps(Number(e.target.value))}
            min="1"
            max="10"
            required
          />
          <small>Define how many steps this campaign can have at most</small>
        </div>

        <div className="form-group">
          <label htmlFor="default-interval">Default Step Interval</label>
          <div className="interval-input">
            <input
              id="default-interval"
              type="number"
              value={defaultIntervalValue}
              onChange={(e) => setDefaultIntervalValue(Number(e.target.value))}
              placeholder="Interval"
              min="1"
              required
            />
            <select
              value={defaultIntervalUnit}
              onChange={(e) => setDefaultIntervalUnit(e.target.value as StepForm['interval_unit'])}
            >
              <option value="seconds">seconds</option>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
          <small>New steps will default to {defaultIntervalValue} {defaultIntervalUnit}</small>
        </div>

        <div className="form-group">
          <label>Campaign Steps</label>
          <div className="steps-container">
            {steps.map((step, index) => (
              <div key={index} className="step-form">
                <div className="step-header">
                  <span className="step-number">Step {step.step_number}</span>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(index)}
                      className="btn btn-danger-small"
                    >
                      🗑️
                    </button>
                  )}
                </div>
                <textarea
                  value={step.message}
                  onChange={(e) => updateStep(index, e.target.value)}
                  placeholder={`Enter the message for step ${step.step_number}...`}
                  rows={3}
                  required
                />
                <div className="interval-input step-interval">
                  <input
                    type="number"
                    value={step.interval_value}
                    onChange={(e) => updateStepInterval(index, Number(e.target.value))}
                    min={1}
                    required
                  />
                  <select
                    value={step.interval_unit}
                    onChange={(e) => updateStepInterval(index, step.interval_value, e.target.value as StepForm['interval_unit'])}
                  >
                    <option value="seconds">seconds</option>
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                  </select>
                </div>
              </div>
            ))}
            
            {steps.length < maxSteps && (
              <button
                type="button"
                onClick={addStep}
                className="btn btn-secondary add-step-btn"
              >
                ➕ Add Step
              </button>
            )}
          </div>
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
        <p><strong>Note:</strong> Define all the messages that will be sent at each step of your follow-up campaign.</p>
      </div>
    </div>
  );
};

export default CampaignForm;
