import React, { useState } from 'react';
import { contactsAPI, Account } from '../api';

interface ContactFormProps {
  accounts: Account[];
  onSuccess: () => void;
  onCancel: () => void;
}

const ContactForm: React.FC<ContactFormProps> = ({ accounts, onSuccess, onCancel }) => {
  const [accountId, setAccountId] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeAccounts = accounts.filter(acc => acc.status === 'active');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await contactsAPI.createContact({
        account_id: accountId,
        identifier: identifier.trim(),
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error creating contact');
    } finally {
      setLoading(false);
    }
  };

  if (activeAccounts.length === 0) {
    return (
      <div className="form-container">
        <h2>👤 Add Contact</h2>
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
      <h2>👤 Add New Contact</h2>
      <p>Add a contact to receive automated follow-up messages</p>
      
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
          <label htmlFor="identifier">Contact Identifier</label>
          <input
            type="text"
            id="identifier"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="@username or +1234567890"
            required
          />
          <small>
            Enter a Telegram username (e.g., @johndoe) or phone number (e.g., +1234567890)
          </small>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? '⏳ Adding...' : '👤 Add Contact'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>

      <div className="form-note">
        <h4>📋 How it works:</h4>
        <ul>
          <li>The system will resolve the username/phone to a Telegram user ID</li>
          <li>Contacts will automatically receive messages from active campaigns</li>
          <li>You can track message delivery and responses in the dashboard</li>
        </ul>
      </div>
    </div>
  );
};

export default ContactForm;
