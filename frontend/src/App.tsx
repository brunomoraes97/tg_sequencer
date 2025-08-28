import React, { useEffect, useState } from 'react';
import './styles.css';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { dashboardAPI, DashboardData, Account } from './api';
import Dashboard from './components/Dashboard';
import AccountsPage from './components/AccountsPage';
import CampaignsPage from './components/CampaignsPage';
import CampaignFormPage from './components/CampaignFormPage';
import CampaignEditPage from './components/CampaignEditPage';
import ContactsPage from './components/ContactsPage';
import HelpPage from './components/HelpPage';
import { ToastProvider } from './contexts/ToastContext';

type View = 'dashboard' | 'accounts' | 'campaigns' | 'campaign-form' | 'campaign-edit' | 'contacts' | 'help';

function App() {
  const [view, setView] = useState<View>('dashboard');
  const [editingCampaignId, setEditingCampaignId] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dashboardAPI.getDashboard();
      setDashboardData(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleCampaignFormSuccess = () => {
    setView('campaigns');
    loadDashboard(); // Refresh dashboard data
  };

  const handleCampaignFormCancel = () => {
    setView('campaigns');
  };

  return (
    <ToastProvider>
      <div className="App">
      {view !== 'campaign-form' && (
        <header className="App-header">
          <h1>🚀 Telegram Follow-up System</h1>
          <nav>
            <button 
              onClick={() => setView('dashboard')}
              className={view === 'dashboard' ? 'active' : ''}
            >
              📊 Dashboard
            </button>
            <button 
              onClick={() => setView('accounts')}
              className={view === 'accounts' ? 'active' : ''}
            >
              📞 Accounts
            </button>
            <button 
              onClick={() => setView('campaigns')}
              className={view === 'campaigns' ? 'active' : ''}
            >
              🎯 Campaigns
            </button>
            <button 
              onClick={() => setView('contacts')}
              className={view === 'contacts' ? 'active' : ''}
            >
              👥 Contacts
            </button>
            <button 
              onClick={() => setView('help')}
              className={view === 'help' ? 'active' : ''}
            >
              ❓ Help
            </button>
          </nav>
        </header>
      )}

      <main className="App-main">
        {error && (
          <div className="error-banner">
            ❌ {error}
            <button onClick={() => setError(null)}>✖</button>
          </div>
        )}

        {loading && <div className="loading">⏳ Loading...</div>}

        {view === 'dashboard' && dashboardData && (
          <Dashboard data={dashboardData} onRefresh={loadDashboard} />
        )}

        {view === 'accounts' && <AccountsPage />}
        {view === 'campaigns' && (
          <CampaignsPage 
            onCreateCampaign={() => setView('campaign-form')} 
            onEditCampaign={(campaignId: string) => {
              setEditingCampaignId(campaignId);
              setView('campaign-edit');
            }}
          />
        )}
        {view === 'campaign-form' && (
          <CampaignFormPage 
            onSuccess={handleCampaignFormSuccess}
            onCancel={handleCampaignFormCancel}
          />
        )}
        {view === 'campaign-edit' && editingCampaignId && (
          <CampaignEditPage 
            campaignId={editingCampaignId}
            onBack={() => {
              setView('campaigns');
              setEditingCampaignId(null);
            }}
          />
        )}
        {view === 'contacts' && <ContactsPage />}
        {view === 'help' && <HelpPage />}
      </main>
      </div>
    </ToastProvider>
  );
}

export default App;
