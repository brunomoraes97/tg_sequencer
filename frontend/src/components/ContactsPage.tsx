import React, { useState, useEffect, useMemo } from 'react';
import { contactsAPI, Contact, Account, accountsAPI, Campaign, campaignsAPI } from '../api';
import ContactForm from './ContactForm';
import Alert from './Alert';
import SearchFilters from './SearchFilters';

const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showAlert, setShowAlert] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [campaignFilter, setCampaignFilter] = useState('all');
  // const { showSuccess, showError } = useToast(); // Uncomment when needed
  const [editForm, setEditForm] = useState({ name: '', tag: '' });

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [contactsData, accountsData, campaignsData] = await Promise.all([
        contactsAPI.getContacts(),
        accountsAPI.getAccounts(),
        campaignsAPI.getCampaigns()
      ]);
      setContacts(contactsData);
      setAccounts(accountsData);
      setCampaigns(campaignsData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error loading contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setEditForm({ name: contact.name || '', tag: contact.tag || '' });
  };

  const handleSaveEdit = async () => {
    if (!editingContact) return;
    
    try {
      const updated = await contactsAPI.updateContact(editingContact.id, editForm);
      setContacts(contacts.map(contact => contact.id === updated.id ? updated : contact));
      setEditingContact(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error updating contact');
    }
  };

    const handleDelete = async (id: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm('Are you sure you want to delete this contact?')) return;

    try {
      await contactsAPI.deleteContact(id);
      setContacts(contacts.filter(contact => contact.id !== id));
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error deleting contact');
    }
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find(acc => acc.id === accountId);
    return account ? (account.name || account.phone) : 'Unknown Account';
  };

  const formatNextMessage = (contact: Contact) => {
    // If contact has replied, no next message
    if (contact.replied) return 'Contact replied - no more messages';
    
    // Find the campaign for this contact
    const campaign = campaigns.find(c => c.account_id === contact.account_id && c.active);
    if (!campaign) return 'No active campaign found';
    
    // Check if contact exceeded max steps
    if (contact.current_step >= campaign.max_steps) {
      return 'Campaign completed - no more messages';
    }
    
    // If no last message, next message is now
    if (!contact.last_message_at) return '🔴 Ready to send first message';
    
    try {
      const lastMessage = new Date(contact.last_message_at);
      const nextMessage = new Date(lastMessage.getTime() + (campaign.interval_seconds * 1000));
      const now = new Date();
      
      const diff = nextMessage.getTime() - now.getTime();
      const dateStr = nextMessage.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: nextMessage.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
      const timeStr = nextMessage.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      if (diff < 0) return `🔴 Overdue - was due ${dateStr} at ${timeStr}`;
      if (diff < 60 * 1000) return `🟡 Due now - ${dateStr} at ${timeStr}`;
      if (diff < 60 * 60 * 1000) return `🟡 Due in ${Math.round(diff / (60 * 1000))} min - ${dateStr} at ${timeStr}`;
      if (diff < 24 * 60 * 60 * 1000) return `🟢 Due in ${Math.round(diff / (60 * 60 * 1000))} hrs - ${dateStr} at ${timeStr}`;
      
      return `🟢 Next: ${dateStr} at ${timeStr}`;
    } catch {
      return '❌ Invalid date';
    }
  };

  const getStatusBadge = (contact: Contact) => {
    if (contact.replied) return '✅ Replied';
    
    const campaign = campaigns.find(c => c.account_id === contact.account_id && c.active);
    const maxSteps = campaign ? campaign.max_steps : 3; // fallback to 3
    
    if (contact.current_step >= maxSteps) return '⏹️ Completed';
    return '📤 In Progress';
  };

  // Filter and search logic
  const filteredContacts = useMemo(() => {
    return contacts.filter(contact => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const matchesName = contact.name?.toLowerCase().includes(searchLower);
        const matchesTag = contact.tag?.toLowerCase().includes(searchLower);
        const matchesUserId = contact.telegram_user_id.toString().includes(searchTerm);
        
        if (!matchesName && !matchesTag && !matchesUserId) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all') {
        if (statusFilter === 'replied' && !contact.replied) return false;
        if (statusFilter === 'active' && contact.replied) return false;
        if (statusFilter === 'completed') {
          const campaign = campaigns.find(c => c.account_id === contact.account_id && c.active);
          const maxSteps = campaign ? campaign.max_steps : 3;
          if (contact.current_step < maxSteps && !contact.replied) return false;
        }
      }

      // Campaign filter
      if (campaignFilter !== 'all') {
        const campaign = campaigns.find(c => c.account_id === contact.account_id);
        if (!campaign || campaign.id !== campaignFilter) return false;
      }

      return true;
    });
  }, [contacts, searchTerm, statusFilter, campaignFilter, campaigns]);

  const filterOptions = [
    { value: 'all', label: 'Todos os Status' },
    { value: 'active', label: 'Em Progresso' },
    { value: 'replied', label: 'Responderam' },
    { value: 'completed', label: 'Concluídos' }
  ];

  const campaignOptions = [
    { value: 'all', label: 'Todas as Campanhas' },
    ...campaigns.map(campaign => ({
      value: campaign.id,
      label: campaign.name
    }))
  ];

  if (loading) return <div className="loading">Loading contacts...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👥 Contacts</h1>
        <p>Manage your follow-up contacts</p>
        <button 
          className="btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          ➕ New Contact
        </button>
      </div>

      {showAlert && (
        <Alert
          type="success"
          title="Gestão de Contatos"
          message="Acompanhe o progresso das suas sequências e veja quais contatos precisam de atenção."
          onClose={() => setShowAlert(false)}
        />
      )}

      <SearchFilters
        onSearch={setSearchTerm}
        onFilterChange={(filters) => {
          setStatusFilter(filters.status || 'all');
          setCampaignFilter(filters.campaign || 'all');
        }}
        placeholder="Buscar por nome, tag ou ID do usuário..."
        filters={[
          {
            key: 'status',
            label: 'Status',
            type: 'select',
            options: filterOptions
          },
          {
            key: 'campaign',
            label: 'Campanha',
            type: 'select',
            options: campaignOptions
          }
        ]}
      />

      {error && <div className="error">{error}</div>}

      {showCreateForm && (
        <div className="modal-overlay" onClick={() => setShowCreateForm(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h2>Create New Contact</h2>
            <ContactForm 
              accounts={accounts}
              onSuccess={() => {
                setShowCreateForm(false);
                loadContacts();
              }} 
              onCancel={() => setShowCreateForm(false)} 
            />
          </div>
        </div>
      )}

      <div className="contacts-grid">
        {filteredContacts.length === 0 ? (
          <div className="empty-state">
            <h3>Nenhum contato encontrado</h3>
            <p>
              {contacts.length === 0 
                ? 'Adicione seu primeiro contato para começar o follow-up.'
                : 'Tente ajustar os filtros de busca.'
              }
            </p>
            {contacts.length === 0 && (
              <button className="btn btn-primary" onClick={() => setShowCreateForm(true)}>
                Adicionar Primeiro Contato
              </button>
            )}
          </div>
        ) : (
          filteredContacts.map(contact => (
          <div key={contact.id} className="contact-card">
            <div className="contact-header">
              <h3>
                {contact.name || contact.user_info?.full_name || `User ${contact.telegram_user_id}`}
              </h3>
              <span className={`status-badge ${contact.replied ? 'replied' : 'active'}`}>
                {getStatusBadge(contact)}
              </span>
            </div>
            
            <div className="contact-details">
              <p><strong>Account:</strong> {getAccountName(contact.account_id)}</p>
              {contact.user_info?.username && (
                <p><strong>Username:</strong> @{contact.user_info.username}</p>
              )}
              {contact.user_info?.phone && (
                <p><strong>Phone:</strong> {contact.user_info.phone}</p>
              )}
              {contact.tag && <p><strong>Tag:</strong> <span className="tag">{contact.tag}</span></p>}
              <p><strong>Current Step:</strong> {contact.current_step}</p>
              {contact.last_message_at && (
                <p><strong>Last Message:</strong> {new Date(contact.last_message_at).toLocaleString()}</p>
              )}
              <p><strong>Next Message:</strong> {formatNextMessage(contact)}</p>
            </div>

            {contact.user_info && (
              <div className="user-info">
                <h4>Telegram Info:</h4>
                <p><strong>ID:</strong> {contact.user_info.id}</p>
                {contact.user_info.first_name && (
                  <p><strong>Name:</strong> {contact.user_info.first_name} {contact.user_info.last_name || ''}</p>
                )}
                {contact.user_info.is_verified && <span className="verified">✅ Verified</span>}
                {contact.user_info.is_bot && <span className="bot">🤖 Bot</span>}
              </div>
            )}

            <div className="contact-actions">
              <button 
                onClick={() => handleEdit(contact)} 
                className="btn btn-secondary"
              >
                ✏️ Edit
              </button>
              <button 
                onClick={() => handleDelete(contact.id)} 
                className="btn btn-danger"
              >
                🗑️ Delete
              </button>
            </div>
          </div>
        ))
        )}
      </div>

      {editingContact && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Edit Contact</h3>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Friendly name for this contact"
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
              <button onClick={() => setEditingContact(null)} className="btn btn-secondary">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsPage;
