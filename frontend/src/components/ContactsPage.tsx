import React, { useState, useEffect } from 'react';
import { contactsAPI, Contact, Account, accountsAPI } from '../api';

const ContactsPage: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [editForm, setEditForm] = useState({ name: '', tag: '' });

  const loadContacts = async () => {
    setLoading(true);
    setError(null);
    try {
      const [contactsData, accountsData] = await Promise.all([
        contactsAPI.getContacts(),
        accountsAPI.getAccounts()
      ]);
      setContacts(contactsData);
      setAccounts(accountsData);
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

  const formatNextMessage = (nextMessageTime?: string) => {
    if (!nextMessageTime) return 'Not scheduled';
    if (nextMessageTime === 'now') return '🔴 Due now';
    
    try {
      const date = new Date(nextMessageTime);
      const now = new Date();
      const diff = date.getTime() - now.getTime();
      
      if (diff < 0) return '🔴 Overdue';
      if (diff < 60 * 1000) return '🟡 Due in < 1 minute';
      if (diff < 60 * 60 * 1000) return `🟡 Due in ${Math.round(diff / (60 * 1000))} minutes`;
      if (diff < 24 * 60 * 60 * 1000) return `🟢 Due in ${Math.round(diff / (60 * 60 * 1000))} hours`;
      
      return `🟢 Due on ${date.toLocaleDateString()} at ${date.toLocaleTimeString()}`;
    } catch {
      return 'Invalid date';
    }
  };

  const getStatusBadge = (contact: Contact) => {
    if (contact.replied) return '✅ Replied';
    if (contact.current_step > (contact.user_info ? 3 : 3)) return '⏹️ Completed'; // Fallback max steps
    return '📤 In Progress';
  };

  if (loading) return <div className="loading">Loading contacts...</div>;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>👥 Contacts</h1>
        <p>Manage your follow-up contacts</p>
      </div>

      {error && <div className="error">{error}</div>}

      <div className="contacts-grid">
        {contacts.map(contact => (
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
              <p><strong>Next Message:</strong> {formatNextMessage(contact.next_message_time)}</p>
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
        ))}
      </div>

      {contacts.length === 0 && !loading && (
        <div className="empty-state">
          <h3>No contacts found</h3>
          <p>Add your first contact to start managing follow-ups.</p>
        </div>
      )}

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
