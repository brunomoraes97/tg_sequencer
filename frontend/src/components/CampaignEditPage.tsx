import React, { useState, useEffect } from 'react';
import { campaignsAPI, Campaign, CampaignStep, Contact, contactsAPI, Account, accountsAPI } from '../api';
import { useToast } from '../contexts/ToastContext';

interface CampaignEditPageProps {
  campaignId: string | null;
  onBack: () => void;
}

const CampaignEditPage: React.FC<CampaignEditPageProps> = ({ campaignId, onBack }) => {
  const { showSuccess, showError } = useToast();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [allContacts, setAllContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStep, setNewStep] = useState({ step_number: 1, message: '' });
  const [editingStep, setEditingStep] = useState<CampaignStep | null>(null);

  const loadData = async () => {
    if (!campaignId) return;
    
    try {
      const [campaignData, contactsData, accountsData] = await Promise.all([
        campaignsAPI.getCampaign(campaignId),
        contactsAPI.getContacts(),
        accountsAPI.getAccounts()
      ]);
      
      setCampaign(campaignData);
      setAllContacts(contactsData);
      setAccounts(accountsData);
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error loading data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [campaignId]);

  const handleAddStep = async () => {
    if (!campaign || !newStep.message.trim()) return;
    
    try {
      await campaignsAPI.addCampaignStep(campaign.id, newStep);
      await loadData();
      setNewStep({ step_number: (campaign.steps?.length || 0) + 1, message: '' });
      showSuccess('Success', 'Step added successfully!');
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error adding step');
    }
  };

  const handleUpdateStep = async () => {
    if (!editingStep || !campaign) return;
    
    try {
      await campaignsAPI.updateCampaignStep(campaign.id, editingStep.id, {
        step_number: editingStep.step_number,
        message: editingStep.message
      });
      
      await loadData();
      setEditingStep(null);
      showSuccess('Success', 'Step updated successfully!');
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error updating step');
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!campaign) return;
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this step?')) return;
    
    try {
      await campaignsAPI.deleteCampaignStep(campaign.id, stepId);
      await loadData();
      showSuccess('Success', 'Step deleted successfully!');
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error deleting step');
    }
  };

  const handleToggleContactInCampaign = async (contact: Contact) => {
    if (!campaign) return;
    
    try {
      if (contact.campaign_id === campaign.id) {
        // Remove from campaign
        await contactsAPI.updateContact(contact.id, { campaign_id: '' });
      } else {
        // Add to campaign
        await contactsAPI.updateContact(contact.id, { campaign_id: campaign.id });
      }
      
      await loadData();
      showSuccess('Success', 'Contact updated successfully!');
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error updating contact');
    }
  };

  if (loading) return <div className="loading">Loading campaign...</div>;
  if (!campaign) return <div className="error">Campaign not found</div>;

  const campaignContacts = allContacts.filter(c => c.campaign_id === campaign.id);
  const availableContacts = allContacts.filter(c => 
    c.account_id === campaign.account_id && c.campaign_id !== campaign.id
  );

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? (account.name || account.phone) : 'Unknown Account';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={onBack} className="btn btn-secondary">
          ← Back to Campaigns
        </button>
        <h1>📋 Edit Campaign: {campaign.name}</h1>
        <span className={`status-badge ${campaign.active ? 'active' : 'inactive'}`}>
          {campaign.active ? '✅ Active' : '⏸️ Inactive'}
        </span>
      </div>

      <div className="campaign-edit-layout">
        {/* Campaign Steps Section */}
        <div className="steps-section">
          <h2>📝 Campaign Steps</h2>
          
          {/* Add New Step */}
          <div className="add-step-form">
            <h3>Add New Step</h3>
            <div className="form-row">
              <div className="form-group">
                <label>Step Number</label>
                <input
                  type="number"
                  value={newStep.step_number}
                  onChange={(e) => setNewStep({ ...newStep, step_number: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="form-input"
                />
              </div>
              <div className="form-group flex-grow">
                <label>Message</label>
                <textarea
                  value={newStep.message}
                  onChange={(e) => setNewStep({ ...newStep, message: e.target.value })}
                  placeholder="Enter the message for this step..."
                  className="form-textarea"
                  rows={3}
                />
              </div>
              <div className="form-group">
                <label>&nbsp;</label>
                <button 
                  onClick={handleAddStep} 
                  className="btn btn-primary"
                  disabled={!newStep.message.trim()}
                >
                  ➕ Add Step
                </button>
              </div>
            </div>
          </div>

          {/* Existing Steps */}
          <div className="steps-list">
            {campaign.steps?.map(step => (
              <div key={step.id} className="step-item">
                {editingStep?.id === step.id ? (
                  <div className="step-edit-form">
                    <div className="form-row">
                      <div className="form-group">
                        <input
                          type="number"
                          value={editingStep.step_number}
                          onChange={(e) => setEditingStep({ 
                            ...editingStep, 
                            step_number: parseInt(e.target.value) || 1
                          })}
                          min="1"
                          className="form-input"
                        />
                      </div>
                      <div className="form-group flex-grow">
                        <textarea
                          value={editingStep.message}
                          onChange={(e) => setEditingStep({ 
                            ...editingStep, 
                            message: e.target.value 
                          })}
                          className="form-textarea"
                          rows={3}
                        />
                      </div>
                      <div className="form-group">
                        <button onClick={handleUpdateStep} className="btn btn-primary btn-sm">
                          💾 Save
                        </button>
                        <button onClick={() => setEditingStep(null)} className="btn btn-secondary btn-sm">
                          Cancel
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="step-display">
                    <div className="step-header">
                      <span className="step-number">Step {step.step_number}</span>
                      <div className="step-actions">
                        <button 
                          onClick={() => setEditingStep(step)}
                          className="btn btn-secondary btn-sm"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          onClick={() => handleDeleteStep(step.id)}
                          className="btn btn-danger btn-sm"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                    <div className="step-content">
                      {step.message}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {(!campaign.steps || campaign.steps.length === 0) && (
              <div className="empty-state">
                <p>No steps configured for this campaign.</p>
                <p>Add your first step above to get started.</p>
              </div>
            )}
          </div>
        </div>

        {/* Campaign Contacts Section */}
        <div className="contacts-section">
          <h2>👥 Campaign Contacts</h2>
          
          {/* Contacts in Campaign */}
          <div className="contacts-in-campaign">
            <h3>Contacts in this Campaign ({campaignContacts.length})</h3>
            {campaignContacts.map(contact => (
              <div key={contact.id} className="contact-item in-campaign">
                <div className="contact-info">
                  <strong>{contact.name || `User ${contact.telegram_user_id}`}</strong>
                  <span className="contact-details">
                    Step: {contact.current_step}/{campaign.max_steps} | 
                    {contact.replied ? ' ✅ Replied' : ' 📤 Active'}
                  </span>
                  {contact.tag && <span className="contact-tag">{contact.tag}</span>}
                </div>
                <button 
                  onClick={() => handleToggleContactInCampaign(contact)}
                  className="btn btn-danger btn-sm"
                >
                  ➖ Remove
                </button>
              </div>
            ))}
            
            {campaignContacts.length === 0 && (
              <div className="empty-state">
                <p>No contacts assigned to this campaign yet.</p>
              </div>
            )}
          </div>

          {/* Available Contacts */}
          <div className="available-contacts">
            <h3>Available Contacts from {getAccountName(campaign.account_id)} ({availableContacts.length})</h3>
            {availableContacts.map(contact => (
              <div key={contact.id} className="contact-item available">
                <div className="contact-info">
                  <strong>{contact.name || `User ${contact.telegram_user_id}`}</strong>
                  <span className="contact-details">
                    {contact.campaign_id ? `In campaign: ${allContacts.find(c => c.campaign_id === contact.campaign_id)?.name || 'Unknown'}` : 'No campaign'}
                  </span>
                  {contact.tag && <span className="contact-tag">{contact.tag}</span>}
                </div>
                <button 
                  onClick={() => handleToggleContactInCampaign(contact)}
                  className="btn btn-success btn-sm"
                >
                  ➕ Add
                </button>
              </div>
            ))}
            
            {availableContacts.length === 0 && (
              <div className="empty-state">
                <p>No available contacts for this account.</p>
                <p>All contacts are either in this campaign or other campaigns.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CampaignEditPage;
