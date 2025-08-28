import React, { useState, useEffect } from 'react';
import { accountsAPI, Account } from '../api';

const AccountsPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editForm, setEditForm] = useState({ name: '', tag: '' });

  const loadAccounts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await accountsAPI.getAccounts();
      setAccounts(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error loading accounts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setEditForm({ name: account.name || '', tag: account.tag || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingAccount) return;
    
    try {
      const updated = await accountsAPI.updateAccount(editingAccount.id, editForm);
      setAccounts(accounts.map(acc => acc.id === updated.id ? updated : acc));
      setEditingAccount(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error updating account');
    }
  };

    const handleDelete = async (id: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this account?')) return;

    try {
      await accountsAPI.deleteAccount(id);
      setAccounts(accounts.filter(acc => acc.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error deleting account');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: string } = {
      'active': '✅ Active',
      'pending_code': '⏳ Pending Verification',
      'error': '❌ Error'
    };
    return statusMap[status] || status;
  };

  if (loading) return <div className="loading">Loading accounts...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>📞 Accounts</h1>
        <p>Manage your Telegram accounts</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="accounts-grid">
        {accounts.map(account => (
          <div key={account.id} className="account-card">
            <div className="account-header">
              <h3>{account.name || account.phone}</h3>
              <span className={`status-badge ${account.status}`}>
                {getStatusBadge(account.status)}
              </span>
            </div>
            
            <div className="account-details">
              <p><strong>Phone:</strong> {account.phone}</p>
              {account.name && <p><strong>Name:</strong> {account.name}</p>}
              {account.tag && <p><strong>Tag:</strong> <span className="tag">{account.tag}</span></p>}
              <p><strong>Created:</strong> {new Date(account.created_at).toLocaleDateString()}</p>
            </div>

            <div className="account-actions">
              <button 
                onClick={() => handleEdit(account)} 
                className="btn btn-secondary"
              >
                ✏️ Edit
              </button>
              <button 
                onClick={() => handleDelete(account.id)} 
                className="btn btn-danger"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {accounts.length === 0 && !loading && (
        <div className="empty-state">
          <h3>No accounts found</h3>
          <p>Create your first account to get started with Telegram follow-ups.</p>
        </div>
      )}

      {editingAccount && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Account</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Friendly name for this account"
              />
            </div>
            <div className="form-group">
              <label>Tag</label>
              <input
                type="text"
                value={editForm.tag}
                onChange={(e) => setEditForm({ ...editForm, tag: e.target.value })}
                placeholder="Tag/label for organization"
              />
            </div>
            <div className="form-actions">
              <button onClick={handleSaveEdit} className="btn btn-primary">
                💾 Save
              </button>
              <button onClick={() => setEditingAccount(null)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPage;
