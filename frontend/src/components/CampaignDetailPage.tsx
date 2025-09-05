import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { campaignsAPI, Campaign, CampaignStep, Contact, contactsAPI } from '../api';
import { useToast } from '../contexts/ToastContext';

const CampaignDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();
  
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStep, setEditingStep] = useState<CampaignStep | null>(null);
  const [newStep, setNewStep] = useState<{ step_number: number; message: string; interval_value: number; interval_unit: 'seconds'|'minutes'|'hours'|'days'; }>({ step_number: 1, message: '', interval_value: 24, interval_unit: 'hours' });

  const toSeconds = (value: number, unit: 'seconds'|'minutes'|'hours'|'days') => {
    const multipliers = { seconds: 1, minutes: 60, hours: 3600, days: 86400 } as const;
    return value * multipliers[unit];
  };
  const [showNewStepForm, setShowNewStepForm] = useState(false);

  const loadCampaign = async () => {
    if (!id) return;
    
    try {
      const [campaignData, contactsData] = await Promise.all([
        campaignsAPI.getCampaign(id),
        contactsAPI.getContacts()
      ]);
      
      setCampaign(campaignData);
      // Filter contacts that belong to this campaign
      setContacts(contactsData.filter(contact => contact.campaign_id === id));
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error loading campaign');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [id]);

  const handleUpdateStep = async () => {
    if (!editingStep || !campaign) return;
    
    try {
      await campaignsAPI.updateCampaignStep(campaign.id, editingStep.id, {
        step_number: editingStep.step_number,
        message: editingStep.message,
        interval_seconds: editingStep.interval_seconds,
      });
      
      await loadCampaign();
      setEditingStep(null);
      showSuccess('Success', 'Step updated successfully!');
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error updating step');
    }
  };

  const handleDeleteStep = async (stepId: string) => {
    if (!campaign) return;
    if (!confirm('Are you sure you want to delete this step?')) return;
    
    try {
      await campaignsAPI.deleteCampaignStep(campaign.id, stepId);
      await loadCampaign();
      showSuccess('Success', 'Step deleted successfully!');
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error deleting step');
    }
  };

  const handleAddStep = async () => {
    if (!campaign) return;
    
    try {
      await campaignsAPI.addCampaignStep(campaign.id, {
        step_number: newStep.step_number,
        message: newStep.message,
        interval_seconds: toSeconds(newStep.interval_value, newStep.interval_unit),
      });
      await loadCampaign();
      setNewStep({ step_number: 1, message: '', interval_value: 24, interval_unit: 'hours' });
      setShowNewStepForm(false);
      showSuccess('Success', 'Step added successfully!');
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error adding step');
    }
  };

  const handleRemoveContactFromCampaign = async (contactId: string) => {
    if (!campaign) return;
    if (!confirm('Remove this contact from the campaign?')) return;
    
    try {
      await campaignsAPI.removeContactFromCampaign(campaign.id, contactId);
      await loadCampaign();
      showSuccess('Success', 'Contact removed from campaign!');
    } catch (err: any) {
      showError('Error', err.response?.data?.detail || 'Error removing contact');
    }
  };

  if (loading) return <div className="loading">Loading campaign...</div>;
  if (!campaign) return <div className="error">Campaign not found</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <button onClick={() => navigate('/campaigns')} className="btn btn-secondary">
          ← Back to Campaigns
        </button>
        <h1>📋 {campaign.name}</h1>
        <span className={`status-badge ${campaign.active ? 'active' : 'inactive'}`}>
          {campaign.active ? '✅ Active' : '⏸️ Inactive'}
        </span>
      </div>

      <div className="campaign-detail-grid">
        {/* Campaign Steps Section */}
        <div className="campaign-steps-section">
          <div className="section-header">
            <h2>📝 Campaign Steps</h2>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => setShowNewStepForm(true)}
            >
              ➕ Add Step
            </button>
          </div>

          {campaign.steps?.map(step => (
            <div key={step.id} className="step-card">
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
              <div className="step-message">
                {step.message}
              </div>
            </div>
          ))}

          {(!campaign.steps || campaign.steps.length === 0) && (
            <div className="empty-state">
              <p>No steps configured for this campaign.</p>
              <button 
                className="btn btn-primary"
                onClick={() => setShowNewStepForm(true)}
              >
                Add First Step
              </button>
            </div>
          )}
        </div>

        {/* Campaign Contacts Section */}
        <div className="campaign-contacts-section">
          <div className="section-header">
            <h2>👥 Contacts in Campaign</h2>
            <span className="contact-count">{contacts.length} contacts</span>
          </div>

          {contacts.map(contact => (
            <div key={contact.id} className="contact-card-mini">
              <div className="contact-info">
                <h4>{contact.name || `User ${contact.telegram_user_id}`}</h4>
                <p>Step: {contact.current_step}/{campaign.max_steps}</p>
                <p>Status: {contact.replied ? '✅ Replied' : '📤 Active'}</p>
              </div>
              <button 
                onClick={() => handleRemoveContactFromCampaign(contact.id)}
                className="btn btn-danger btn-sm"
              >
                Remove
              </button>
            </div>
          ))}

          {contacts.length === 0 && (
            <div className="empty-state">
              <p>No contacts assigned to this campaign.</p>
              <p>Go to Contacts page to assign contacts.</p>
            </div>
          )}
        </div>
      </div>

      {/* Add Step Modal */}
      {showNewStepForm && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Add New Step</h3>
            <div className="form-group">
              <label>Step Number</label>
              <input
                type="number"
                value={newStep.step_number}
                onChange={(e) => setNewStep({ ...newStep, step_number: parseInt(e.target.value) })}
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={newStep.message}
                onChange={(e) => setNewStep({ ...newStep, message: e.target.value })}
                placeholder="Enter the message for this step..."
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Interval</label>
              <div className="interval-input">
                <input
                  type="number"
                  value={newStep.interval_value}
                  onChange={(e) => setNewStep({ ...newStep, interval_value: parseInt(e.target.value) || 1 })}
                  min={1}
                />
                <select
                  value={newStep.interval_unit}
                  onChange={(e) => setNewStep({ ...newStep, interval_unit: e.target.value as any })}
                >
                  <option value="seconds">seconds</option>
                  <option value="minutes">minutes</option>
                  <option value="hours">hours</option>
                  <option value="days">days</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button onClick={handleAddStep} className="btn btn-primary">
                💾 Add Step
              </button>
              <button onClick={() => setShowNewStepForm(false)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Step Modal */}
      {editingStep && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Step {editingStep.step_number}</h3>
            <div className="form-group">
              <label>Step Number</label>
              <input
                type="number"
                value={editingStep.step_number}
                onChange={(e) => setEditingStep({ 
                  ...editingStep, 
                  step_number: parseInt(e.target.value) 
                })}
                min="1"
              />
            </div>
            <div className="form-group">
              <label>Message</label>
              <textarea
                value={editingStep.message}
                onChange={(e) => setEditingStep({ 
                  ...editingStep, 
                  message: e.target.value 
                })}
                rows={4}
              />
            </div>
            <div className="form-group">
              <label>Interval (seconds)</label>
              <input
                type="number"
                value={editingStep.interval_seconds ?? 0}
                onChange={(e) => setEditingStep({ ...editingStep, interval_seconds: parseInt(e.target.value) || 0 })}
                min={0}
              />
              <small>0 means use campaign default</small>
            </div>
            <div className="form-actions">
              <button onClick={handleUpdateStep} className="btn btn-primary">
                💾 Save Changes
              </button>
              <button onClick={() => setEditingStep(null)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampaignDetailPage;
