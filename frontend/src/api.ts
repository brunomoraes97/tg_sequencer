import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Auth interfaces
export interface User {
  id: string;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface Account {
  id: string;
  phone: string;
  name?: string;
  tag?: string;
  status: string;
  created_at: string;
}

export interface Campaign {
  id: string;
  account_id: string;
  name: string;
  interval_seconds: number;
  max_steps: number;
  active: boolean;
  steps: CampaignStep[];
}

export interface CampaignStep {
  id: string;
  step_number: number;
  message: string;
  interval_seconds?: number;
}

export interface UserInfo {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  phone?: string;
  is_bot: boolean;
  is_verified: boolean;
  full_name: string;
}

export interface Contact {
  id: string;
  account_id: string;
  campaign_id?: string;
  telegram_user_id: number;
  name?: string;
  tag?: string;
  current_step: number;
  replied: boolean;
  last_message_at?: string;
  user_info?: UserInfo;
  next_message_time?: string;
}

export interface DashboardData {
  accounts: Account[];
  campaigns: Campaign[];
  contacts: Contact[];
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.reload();
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (email: string, password: string): Promise<LoginResponse> =>
    axios.post(`${API_BASE_URL}/auth/login`, 
      new URLSearchParams({
        username: email,
        password: password
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        }
      }
    ).then(res => res.data),
  
  register: (email: string, password: string): Promise<User> =>
    axios.post(`${API_BASE_URL}/auth/register`, {
      email,
      password
    }).then(res => res.data),
  
  getCurrentUser: (): Promise<User> =>
    api.get('/auth/me').then(res => res.data),
  
  logout: () => {
    localStorage.removeItem('access_token');
  }
};

export const dashboardAPI = {
  getDashboard: (): Promise<DashboardData> =>
    api.get('/dashboard').then(res => res.data),
};

export const accountsAPI = {
  createAccount: (data: { 
    phone: string; 
    name?: string; 
    tag?: string; 
  }): Promise<Account> =>
    api.post('/accounts', data).then(res => res.data),
  
  verifyAccount: (accountId: string, code: string, password?: string): Promise<Account> =>
    api.post(`/accounts/${accountId}/verify`, { code, password }).then(res => res.data),
  
  getAccounts: (): Promise<Account[]> =>
    api.get('/accounts').then(res => res.data),
  
  updateAccount: (accountId: string, data: {
    name?: string;
    tag?: string;
  }): Promise<Account> =>
    api.put(`/accounts/${accountId}`, data).then(res => res.data),
  
  deleteAccount: (accountId: string): Promise<void> =>
    api.delete(`/accounts/${accountId}`).then(res => res.data),
};

export const campaignsAPI = {
  createCampaign: (data: {
    account_id: string;
    name: string;
    interval_seconds: number;
    max_steps?: number;
  }): Promise<Campaign> =>
    api.post('/campaigns', data).then(res => res.data),
  
  getCampaigns: (): Promise<Campaign[]> =>
    api.get('/campaigns').then(res => res.data),
  
  getCampaign: (campaignId: string): Promise<Campaign> =>
    api.get(`/campaigns/${campaignId}`).then(res => res.data),
  
  updateCampaign: (campaignId: string, data: {
    account_id?: string;
    name?: string;
    interval_seconds?: number;
    active?: boolean;
  }): Promise<Campaign> =>
    api.put(`/campaigns/${campaignId}`, data).then(res => res.data),
  
  deleteCampaign: (campaignId: string): Promise<void> =>
    api.delete(`/campaigns/${campaignId}`).then(res => res.data),
  
  addCampaignStep: (campaignId: string, data: {
    step_number: number;
  message: string;
  interval_seconds?: number;
  }): Promise<CampaignStep> =>
    api.post(`/campaigns/${campaignId}/steps`, data).then(res => res.data),

  updateCampaignStep: (campaignId: string, stepId: string, data: {
    step_number: number;
  message: string;
  interval_seconds?: number;
  }): Promise<CampaignStep> =>
    api.put(`/campaigns/${campaignId}/steps/${stepId}`, data).then(res => res.data),

  deleteCampaignStep: (campaignId: string, stepId: string): Promise<void> =>
    api.delete(`/campaigns/${campaignId}/steps/${stepId}`).then(res => res.data),

  assignContactToCampaign: (campaignId: string, contactId: string): Promise<void> =>
    api.post(`/campaigns/${campaignId}/contacts/${contactId}`).then(res => res.data),

  removeContactFromCampaign: (campaignId: string, contactId: string): Promise<void> =>
    api.delete(`/campaigns/${campaignId}/contacts/${contactId}`).then(res => res.data),
};

export const contactsAPI = {
  createContact: (data: {
    account_id: string;
    identifier: string;
    name?: string;
    tag?: string;
  }): Promise<Contact> =>
    api.post('/contacts', data).then(res => res.data),
  
  getContacts: (): Promise<Contact[]> =>
    api.get('/contacts').then(res => res.data),
  
  updateContact: (contactId: string, data: {
    name?: string;
    tag?: string;
    campaign_id?: string;
  }): Promise<Contact> =>
    api.put(`/contacts/${contactId}`, data).then(res => res.data),
  
  deleteContact: (contactId: string): Promise<void> =>
    api.delete(`/contacts/${contactId}`).then(res => res.data),
};
