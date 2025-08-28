import React, { useState, useEffect } from 'react';
import { campaignsAPI, accountsAPI, contactsAPI, Campaign, Account, Contact, CampaignStep } from '../api';
import { useToast } from '../contexts/ToastContext';
import Alert from './Alert';

interface CampaignsPageProps {
  onCreateCampaign: () => void;
  onEditCampaign: (campaignId: string) => void;
}

const CampaignsPage: React.FC<CampaignsPageProps> = ({ onCreateCampaign, onEditCampaign }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({ name: '', account_id: '', interval_seconds: 3600 });
  const [showAlert, setShowAlert] = useState(true);

  const { showSuccess, showError } = useToast();

  useEffect(() => {
    loadCampaigns();
    loadAccounts();
    loadContacts();
  }, []);

  const loadCampaigns = async () => {
    try {
      const data = await campaignsAPI.getCampaigns();
      setCampaigns(data);
      setError(null);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error loading campaigns';
      setError(errorMessage);
      showError('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const data = await accountsAPI.getAccounts();
      setAccounts(data);
    } catch (err: any) {
      console.error('Error loading accounts:', err);
    }
  };

  const loadContacts = async () => {
    try {
      const data = await contactsAPI.getContacts();
      setContacts(data);
    } catch (err: any) {
      console.error('Error loading contacts:', err);
    }
  };

  const getContactsCount = (campaign: Campaign) => {
    return contacts.filter(contact => contact.campaign_id === campaign.id).length;
  };

  const getRepliedContactsCount = (campaign: Campaign) => {
    return contacts.filter(contact => contact.campaign_id === campaign.id && contact.replied).length;
  };

  const deleteCampaign = async (campaign: Campaign) => {
    const activeContactsCount = contacts.filter(contact => 
      contact.campaign_id === campaign.id && !contact.replied
    ).length;

    if (activeContactsCount > 0) {
      showError('Error', `Cannot delete campaign. There are ${activeContactsCount} active contacts in this campaign.`);
      return;
    }

    try {
      await campaignsAPI.deleteCampaign(campaign.id);
      setCampaigns(campaigns.filter(c => c.id !== campaign.id));
      showSuccess('Success', 'Campaign deleted successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error deleting campaign';
      setError(errorMessage);
      showError('Error', errorMessage);
    }
  };

  const handleDelete = async (id: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await campaignsAPI.deleteCampaign(id);
      setCampaigns(campaigns.filter(campaign => campaign.id !== id));
      showSuccess('Success', 'Campaign deleted successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error deleting campaign';
      setError(errorMessage);
      showError('Error', errorMessage);
    }
  };

  const toggleCampaignStatus = async (campaign: Campaign) => {
    try {
      const updated = await campaignsAPI.updateCampaign(campaign.id, {
        active: !campaign.active
      });
      setCampaigns(campaigns.map(camp => camp.id === updated.id ? updated : camp));
      showSuccess('Success', `Campaign ${updated.active ? 'activated' : 'deactivated'} successfully!`);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error updating campaign status';
      setError(errorMessage);
      showError('Error', errorMessage);
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? (account.name || account.phone) : 'Unknown Account';
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };

  const formatIntervalInput = (seconds: number) => {
    if (seconds % 86400 === 0) return { value: seconds / 86400, unit: 'days' };
    if (seconds % 3600 === 0) return { value: seconds / 3600, unit: 'hours' };
    if (seconds % 60 === 0) return { value: seconds / 60, unit: 'minutes' };
    return { value: seconds, unit: 'seconds' };
  };

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditForm({
      name: campaign.name,
      account_id: campaign.account_id,
      interval_seconds: campaign.interval_seconds
    });
  };

  const handleIntervalChange = (value: number, unit: string) => {
    let seconds = value;
    if (unit === 'minutes') seconds *= 60;
    else if (unit === 'hours') seconds *= 3600;
    else if (unit === 'days') seconds *= 86400;
    
    setEditForm({ ...editForm, interval_seconds: seconds });
  };

  const handleSaveEdit = async () => {
    if (!editingCampaign) return;
    
    try {
      const updated = await campaignsAPI.updateCampaign(editingCampaign.id, editForm);
      setCampaigns(campaigns.map(campaign => campaign.id === updated.id ? updated : campaign));
      setEditingCampaign(null);
      showSuccess('Success', 'Campaign updated successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Error updating campaign';
      setError(errorMessage);
      showError('Error', errorMessage);
    }
  };

  if (loading) return <div className="loading">Loading campaigns...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🎯 Campaigns</h1>
        <p>Manage your follow-up campaigns</p>
        <button 
          className="btn-primary"
          onClick={onCreateCampaign}
        >
          ➕ New Campaign
        </button>
      </div>

      {showAlert && (
        <Alert
          type="info"
          title="Productivity Tip"
          message="Use campaigns to automate your message sequences and increase engagement with your contacts."
          onClose={() => setShowAlert(false)}
        />
      )}

      {error && <div className="error">{error}</div>}

      <div className="campaigns-grid">
        {campaigns.map(campaign => (
          <div key={campaign.id} className="campaign-card">
            <div className="campaign-header">
              <h3>{campaign.name}</h3>
              <div className="campaign-status">
                <span className={`status-badge ${campaign.active ? 'active' : 'inactive'}`}>
                  {campaign.active ? '🟢 Active' : '🔴 Inactive'}
                </span>
                <button 
                  onClick={() => toggleCampaignStatus(campaign)}
                  className={`btn btn-sm ${campaign.active ? 'btn-warning' : 'btn-success'}`}
                >
                  {campaign.active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
            
            <div className="campaign-info">
              <p><strong>Account:</strong> {getAccountName(campaign.account_id)}</p>
              <p><strong>Interval:</strong> {formatInterval(campaign.interval_seconds)}</p>
              <p><strong>Steps:</strong> {campaign.steps?.length || 0}/{campaign.max_steps}</p>
              
              <div className="campaign-contacts-info">
                <p><strong>📊 Contact Stats:</strong></p>
                <div className="contact-stats">
                  <span className="stat">
                    <strong>{getContactsCount(campaign)}</strong> total
                  </span>
                  <span className="stat">
                    <strong>{getContactsCount(campaign) - getRepliedContactsCount(campaign)}</strong> active
                  </span>
                  <span className="stat">
                    <strong>{getRepliedContactsCount(campaign)}</strong> replied
                  </span>
                </div>
              </div>
            </div>

            {campaign.steps && campaign.steps.length > 0 && (
              <div className="campaign-steps-preview">
                <p><strong>📝 Steps Preview:</strong></p>
                {campaign.steps.slice(0, 2).map((step: CampaignStep) => (
                  <div key={step.id} className="step-preview">
                    <span className="step-number">{step.step_number}</span>
                    <span className="step-message">{step.message.substring(0, 50)}...</span>
                  </div>
                ))}
              </div>
            )}

            <div className="campaign-actions">
              <button 
                onClick={() => onEditCampaign(campaign.id)}
                className="btn btn-info"
              >
                📋 Edit Campaign
              </button>
              <button 
                onClick={() => handleEdit(campaign)} 
                className="btn btn-secondary"
              >
                ✏️ Edit Details
              </button>
              <button 
                onClick={() => handleDelete(campaign.id)} 
                className="btn btn-danger"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {campaigns.length === 0 && !loading && (
        <div className="empty-state">
          <h3>No campaigns found</h3>
          <p>Create your first campaign to start automating follow-ups.</p>
        </div>
      )}

      {editingCampaign && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Campaign</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Campaign name"
              />
            </div>
            <div className="form-group">
              <label>Account</label>
              <select
                value={editForm.account_id}
                onChange={(e) => setEditForm({ ...editForm, account_id: e.target.value })}
              >
                {accounts.filter(acc => acc.status === 'active').map(account => (
                  <option key={account.id} value={account.id}>
                    {account.name || account.phone}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Message Interval</label>
              <div className="interval-input">
                <input
                  type="number"
                  value={formatIntervalInput(editForm.interval_seconds).value}
                  onChange={(e) => handleIntervalChange(
                    Number(e.target.value), 
                    formatIntervalInput(editForm.interval_seconds).unit
                  )}
                  min="1"
                />
                <select
                  value={formatIntervalInput(editForm.interval_seconds).unit}
                  onChange={(e) => handleIntervalChange(
                    formatIntervalInput(editForm.interval_seconds).value, 
                    e.target.value
                  )}
                >
                  <option value="seconds">seconds</option>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button onClick={handleSaveEdit} className="btn btn-primary">
                💾 Save
              </button>
              <button onClick={() => setEditingCampaign(null)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignsPage;
