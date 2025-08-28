import React from 'react';
import { DashboardData } from '../api';

interface DashboardProps {
  data: DashboardData;
  onRefresh: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onRefresh }) => {
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">✅ Active</span>;
      case 'pending_code':
        return <span className="badge badge-warning">⏳ Pending Code</span>;
      default:
        return <span className="badge badge-error">❌ {status}</span>;
    }
  };

  const getNextMessageStatus = (contact: any) => {
    if (contact.replied) {
      return <span className="badge badge-success">✅ Replied</span>;
    }
    if (contact.next_message_time === 'now') {
      return <span className="badge badge-urgent">🔥 NOW</span>;
    }
    if (contact.next_message_time) {
      return <span className="badge badge-info">⏰ {formatDate(contact.next_message_time)}</span>;
    }
    return <span className="badge badge-gray">📋 Scheduled</span>;
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 System Overview</h2>
        <button onClick={onRefresh} className="btn btn-primary">🔄 Refresh</button>
      </div>

      {/* Accounts Section */}
      <section className="dashboard-section">
        <h3>📞 Accounts ({data.accounts.length})</h3>
        {data.accounts.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Phone</th>
                  <th>Status</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map(account => (
                  <tr key={account.id}>
                    <td><strong>{account.phone}</strong></td>
                    <td>{getStatusBadge(account.status)}</td>
                    <td>{formatDate(account.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No accounts yet. Create your first account!</p>
        )}
      </section>

      {/* Campaigns Section */}
      <section className="dashboard-section">
        <h3>🎯 Campaigns ({data.campaigns.length})</h3>
        {data.campaigns.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Account</th>
                  <th>Status</th>
                  <th>Interval</th>
                  <th>Steps</th>
                </tr>
              </thead>
              <tbody>
                {data.campaigns.map(campaign => {
                  const account = data.accounts.find(a => a.id === campaign.account_id);
                  return (
                    <tr key={campaign.id}>
                      <td><strong>{campaign.name}</strong></td>
                      <td>{account?.phone || 'Unknown'}</td>
                      <td>
                        {campaign.active ? 
                          <span className="badge badge-success">✅ Active</span> : 
                          <span className="badge badge-error">❌ Inactive</span>
                        }
                      </td>
                      <td>{campaign.interval_seconds}s ({Math.round(campaign.interval_seconds/60)}min)</td>
                      <td>{campaign.steps.length}/{campaign.max_steps}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No campaigns yet. Create your first campaign!</p>
        )}
      </section>

      {/* Contacts Section */}
      <section className="dashboard-section">
        <h3>👥 Contacts ({data.contacts.length})</h3>
        {data.contacts.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Name/Username</th>
                  <th>Telegram ID</th>
                  <th>Step</th>
                  <th>Status</th>
                  <th>Last Message</th>
                  <th>Next Message</th>
                </tr>
              </thead>
              <tbody>
                {data.contacts.map(contact => {
                  const campaign = data.campaigns.find(c => c.account_id === contact.account_id && c.active);
                  return (
                    <tr key={contact.id}>
                      <td>
                        <div>
                          <strong>{contact.user_info?.full_name || `User ${contact.telegram_user_id}`}</strong>
                          {contact.user_info?.username && (
                            <div className="username">@{contact.user_info.username}</div>
                          )}
                          {contact.user_info?.is_verified && <span className="verified">✓</span>}
                          {contact.user_info?.is_bot && <span className="bot">🤖</span>}
                        </div>
                      </td>
                      <td>{contact.telegram_user_id}</td>
                      <td>{contact.current_step}/{campaign?.max_steps || 'N/A'}</td>
                      <td>
                        {contact.replied ? 
                          <span className="badge badge-success">✅ Replied</span> : 
                          <span className="badge badge-warning">⏳ Pending</span>
                        }
                      </td>
                      <td>{contact.last_message_at ? formatDate(contact.last_message_at) : 'Never'}</td>
                      <td>{getNextMessageStatus(contact)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="empty-state">No contacts yet. Add your first contact!</p>
        )}
      </section>
    </div>
  );
};

export default Dashboard;
