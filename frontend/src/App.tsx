import React, { useEffect, useState } from 'react';
import './styles.css';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { dashboardAPI, DashboardData, Account } from './api';
import Dashboard from './components/Dashboard';
import AccountForm from './components/AccountForm';
import CampaignForm from './components/CampaignForm';
import ContactForm from './components/ContactForm';

type View = 'dashboard' | 'create-account' | 'create-campaign' | 'create-contact';

function App() {
  const [view, setView] = useState<View>('dashboard');
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

  const handleSuccess = () => {
    setView('dashboard');
    loadDashboard();
  };

  return (
    <div className="App">
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
            onClick={() => setView('create-account')}
            className={view === 'create-account' ? 'active' : ''}
          >
            📞 New Account
          </button>
          <button 
            onClick={() => setView('create-campaign')}
            className={view === 'create-campaign' ? 'active' : ''}
          >
            🎯 New Campaign
          </button>
          <button 
            onClick={() => setView('create-contact')}
            className={view === 'create-contact' ? 'active' : ''}
          >
            👤 New Contact
          </button>
        </nav>
      </header>

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

        {view === 'create-account' && (
          <AccountForm onSuccess={handleSuccess} onCancel={() => setView('dashboard')} />
        )}

        {view === 'create-campaign' && dashboardData && (
          <CampaignForm 
            accounts={dashboardData.accounts} 
            onSuccess={handleSuccess} 
            onCancel={() => setView('dashboard')} 
          />
        )}

        {view === 'create-contact' && dashboardData && (
          <ContactForm 
            accounts={dashboardData.accounts} 
            onSuccess={handleSuccess} 
            onCancel={() => setView('dashboard')} 
          />
        )}
      </main>
    </div>
  );
}

export default App;
