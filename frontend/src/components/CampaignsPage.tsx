import React, { useState, useEffect } from 'react';
import { campaignsAPI, Campaign, Account, accountsAPI } from '../api';
import CampaignForm from './CampaignForm';
import { useToast } from '../contexts/ToastContext';
import Alert from './Alert';

const CampaignsPage: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const { showSuccess, showError } = useToast();
  const [editForm, setEditForm] = useState({
    name: '',
    account_id: '',
    interval_seconds: 86400
  });

  const loadCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignsData, accountsData] = await Promise.all([
        campaignsAPI.getCampaigns(),
        accountsAPI.getAccounts()
      ]);
      setCampaigns(campaignsData);
      setAccounts(accountsData);
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erro ao carregar campanhas';
      setError(errorMessage);
      showError('Erro', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleEdit = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditForm({
      name: campaign.name,
      account_id: campaign.account_id,
      interval_seconds: campaign.interval_seconds
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCampaign) return;
    
    try {
      const updated = await campaignsAPI.updateCampaign(editingCampaign.id, editForm);
      setCampaigns(campaigns.map(camp => camp.id === updated.id ? updated : camp));
      setEditingCampaign(null);
      showSuccess('Sucesso', 'Campanha atualizada com sucesso!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erro ao atualizar campanha';
      setError(errorMessage);
      showError('Erro', errorMessage);
    }
  };

    const handleDelete = async (id: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Tem certeza que deseja excluir esta campanha?')) return;

    try {
      await campaignsAPI.deleteCampaign(id);
      setCampaigns(campaigns.filter(camp => camp.id !== id));
      showSuccess('Sucesso', 'Campanha excluída com sucesso!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.detail || 'Erro ao excluir campanha';
      setError(errorMessage);
      showError('Erro', errorMessage);
    }
  };

  const formatInterval = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    if (seconds < 3600) return `${Math.round(seconds / 60)} minutes`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)} hours`;
    return `${Math.round(seconds / 86400)} days`;
  };

  const formatIntervalInput = (seconds: number) => {
    if (seconds >= 86400) return { value: seconds / 86400, unit: 'days' };
    if (seconds >= 3600) return { value: seconds / 3600, unit: 'hours' };
    if (seconds >= 60) return { value: seconds / 60, unit: 'minutes' };
    return { value: seconds, unit: 'seconds' };
  };

  const handleIntervalChange = (value: number, unit: string) => {
    const multipliers = { seconds: 1, minutes: 60, hours: 3600, days: 86400 };
    setEditForm({
      ...editForm,
      interval_seconds: value * multipliers[unit as keyof typeof multipliers]
    });
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? (account.name || account.phone) : 'Unknown Account';
  };

  if (loading) return <div className="loading">Loading campaigns...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>🎯 Campaigns</h1>
        <p>Manage your follow-up campaigns</p>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ New Campaign
        </button>
      </div>

      {showAlert && (
        <Alert
          type="info"
          title="Dica de Produtividade"
          message="Use campanhas para automatizar suas sequências de mensagens e aumentar o engajamento com seus contatos."
          onClose={() => setShowAlert(false)}
        />
      )}

      {error && <div className="error">{error}</div>}

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create New Campaign</h2>
            <CampaignForm 
              accounts={accounts}
              onSuccess={() => {
                setShowCreateForm(false);
                loadCampaigns();
              }} 
              onCancel={() => setShowCreateForm(false)} 
            />
          </div>
        </div>
      )}

      <div className="campaigns-grid">
        {campaigns.map(campaign => (
          <div key={campaign.id} className="campaign-card">
            <div className="campaign-header">
              <h3>{campaign.name}</h3>
              <span className={`status-badge ${campaign.active ? 'active' : 'inactive'}`}>
                {campaign.active ? '✅ Active' : '⏸️ Inactive'}
              </span>
            </div>
            
            <div className="campaign-details">
              <p><strong>Account:</strong> {getAccountName(campaign.account_id)}</p>
              <p><strong>Interval:</strong> {formatInterval(campaign.interval_seconds)}</p>
              <p><strong>Steps:</strong> {campaign.steps?.length || 0}</p>
              <p><strong>Max Steps:</strong> {campaign.max_steps}</p>
            </div>

            {campaign.steps && campaign.steps.length > 0 && (
              <div className="campaign-steps">
                <h4>Steps:</h4>
                {campaign.steps.map(step => (
                  <div key={step.id} className="step-preview">
                    <span className="step-number">{step.step_number}</span>
                    <span className="step-message">{step.message.substring(0, 50)}...</span>
                  </div>
                ))}
              </div>
            )}

            <div className="campaign-actions">
              <button 
                onClick={() => handleEdit(campaign)} 
                className="btn btn-secondary"
              >
                ✏️ Edit
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
