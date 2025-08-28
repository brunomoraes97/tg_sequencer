import React, { useMemo } from 'react';
import { DashboardData } from '../api';

interface DashboardProps {
  data: DashboardData;
  onRefresh: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ data, onRefresh }) => {
  // Calculate metrics
  const metrics = useMemo(() => {
    const totalContacts = data.contacts.length;
    const repliedContacts = data.contacts.filter(c => c.replied).length;
    const activeContacts = data.contacts.filter(c => !c.replied).length;
    const activeCampaigns = data.campaigns.filter(c => c.active).length;
    const activeAccounts = data.accounts.filter(a => a.status === 'active').length;
    
    // Contacts due for next message
    const contactsDue = data.contacts.filter(contact => {
      if (contact.replied) return false;
      if (!contact.last_message_at) return true;
      
      const campaign = data.campaigns.find(c => c.account_id === contact.account_id && c.active);
      if (!campaign || contact.current_step >= campaign.max_steps) return false;
      
      const lastMessage = new Date(contact.last_message_at);
      const nextMessage = new Date(lastMessage.getTime() + (campaign.interval_seconds * 1000));
      return nextMessage <= new Date();
    }).length;
    
    const replyRate = totalContacts > 0 ? (repliedContacts / totalContacts * 100).toFixed(1) : '0';
    
    return {
      totalContacts,
      repliedContacts,
      activeContacts,
      activeCampaigns,
      activeAccounts,
      contactsDue,
      replyRate
    };
  }, [data]);
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
    // If contact has replied, no next message
    if (contact.replied) {
      return <span className="text-muted">Replied - Complete</span>;
    }
    
    // Find the campaign for this contact
    const campaign = data.campaigns.find(c => c.account_id === contact.account_id && c.active);
    if (!campaign) {
      return <span className="text-muted">No Active Campaign</span>;
    }
    
    // Check if contact exceeded max steps
    if (contact.current_step >= campaign.max_steps) {
      return <span className="text-muted">Campaign Complete</span>;
    }
    
    // If no last message, next message is now
    if (!contact.last_message_at) {
      return <span>Now</span>;
    }
    
    try {
      const lastMessage = new Date(contact.last_message_at);
      const nextMessage = new Date(lastMessage.getTime() + (campaign.interval_seconds * 1000));
      
      // Format date and time
      const dateStr = nextMessage.toLocaleDateString('pt-BR', { 
        day: '2-digit',
        month: '2-digit',
        year: nextMessage.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
      });
      const timeStr = nextMessage.toLocaleTimeString('pt-BR', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
      
      return <span>{dateStr} às {timeStr}</span>;
    } catch {
      return <span className="text-muted">Invalid Date</span>;
    }
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h2>📊 System Overview</h2>
        <button onClick={onRefresh} className="btn btn-primary">🔄 Refresh</button>
      </div>

      {/* Key Metrics */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-icon">📱</div>
          <div className="metric-content">
            <h3>{metrics.activeAccounts}</h3>
            <p>Active Accounts</p>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">🎯</div>
          <div className="metric-content">
            <h3>{metrics.activeCampaigns}</h3>
            <p>Active Campaigns</p>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">👥</div>
          <div className="metric-content">
            <h3>{metrics.totalContacts}</h3>
            <p>Total Contacts</p>
          </div>
        </div>
        
        <div className="metric-card urgent">
          <div className="metric-icon">🔥</div>
          <div className="metric-content">
            <h3>{metrics.contactsDue}</h3>
            <p>Due Now</p>
          </div>
        </div>
        
        <div className="metric-card success">
          <div className="metric-icon">✅</div>
          <div className="metric-content">
            <h3>{metrics.repliedContacts}</h3>
            <p>Replied</p>
          </div>
        </div>
        
        <div className="metric-card">
          <div className="metric-icon">📈</div>
          <div className="metric-content">
            <h3>{metrics.replyRate}%</h3>
            <p>Reply Rate</p>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      {metrics.contactsDue > 0 && (
        <section className="alert-section">
          <div className="alert alert-warning">
            <span className="alert-icon">⚠️</span>
            <div className="alert-content">
              <strong>Action Required:</strong> {metrics.contactsDue} contacts are due for their next message.
            </div>
          </div>
        </section>
      )}

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
                      <td>
                        {campaign ? 
                          `${Math.min(contact.current_step, campaign.max_steps)}/${campaign.max_steps}` : 
                          `${contact.current_step}/N/A`
                        }
                      </td>
                      <td>
                        {contact.replied ? 
                          <span className="badge badge-success">✅ Replied</span> : 
                          campaign && contact.current_step >= campaign.max_steps ?
                            <span className="badge badge-info">🏁 Complete</span> :
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
