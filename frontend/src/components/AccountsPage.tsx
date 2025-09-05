import React, { useState, useEffect } from 'react';
import { accountsAPI, Account } from '../api';
import { useAuth } from '../contexts/AuthContext';
import AccountForm from './AccountForm';

const AccountsPage: React.FC = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const data = await accountsAPI.getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Error loading accounts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadAccounts();
    } else {
      setAccounts([]);
    }
  }, [user]);

  if (loading) {
    return (
      <div className="page-container">
        <h1>📞 Accounts</h1>
        <p>Loading accounts...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📞 Accounts</h1>
        <p>Manage your Telegram accounts</p>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ New Account
        </button>
      </div>

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create New Account</h2>
            <AccountForm 
              onSuccess={() => {
                setShowCreateForm(false);
                loadAccounts();
              }} 
              onCancel={() => setShowCreateForm(false)} 
            />
          </div>
        </div>
      )}

      <div className="accounts-grid">
        {accounts.map(account => (
          <div key={account.id} className="account-card">
            <div className="account-header">
              <h3>{account.name || account.phone}</h3>
              <span className={`status-badge ${account.status}`}>
                {account.status}
              </span>
            </div>
            
            <div className="account-details">
              <p><strong>Phone:</strong> {account.phone}</p>
              {account.name && <p><strong>Name:</strong> {account.name}</p>}
              {account.tag && <p><strong>Tag:</strong> {account.tag}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AccountsPage;
