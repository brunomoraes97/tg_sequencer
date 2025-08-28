import React, { useState } from 'react';
import { accountsAPI, Account } from '../api';

interface AccountFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const AccountForm: React.FC<AccountFormProps> = ({ onSuccess, onCancel }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAccount, setPendingAccount] = useState<Account | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const account = await accountsAPI.createAccount(phone);
      setPendingAccount(account);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error creating account');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingAccount) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await accountsAPI.verifyAccount(pendingAccount.id, code, password || undefined);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  if (pendingAccount) {
    return (
      <div className="form-container">
        <h2>📱 Verify Account</h2>
        <p>We sent a verification code to <strong>{pendingAccount.phone}</strong></p>
        
        <form onSubmit={handleVerifyCode}>
          <div className="form-group">
            <label htmlFor="code">Verification Code</label>
            <input
              type="text"
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="12345"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Two-Factor Password (if enabled)</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {error && <div className="error">{error}</div>}

          <div className="form-actions">
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? '⏳ Verifying...' : '✅ Verify'}
            </button>
            <button type="button" onClick={onCancel} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="form-container">
      <h2>📞 Add New Account</h2>
      <p>Enter your Telegram phone number to add a new account</p>
      
      <form onSubmit={handleCreateAccount}>
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1234567890"
            required
          />
          <small>Include country code (e.g., +1 for US, +55 for Brazil)</small>
        </div>

        {error && <div className="error">{error}</div>}

        <div className="form-actions">
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? '⏳ Sending...' : '📤 Send Code'}
          </button>
          <button type="button" onClick={onCancel} className="btn btn-secondary">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default AccountForm;
