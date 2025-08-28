import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

export interface Account {
  id: string;
  phone: string;
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
  telegram_user_id: number;
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

export const dashboardAPI = {
  getDashboard: (): Promise<DashboardData> =>
    api.get('/dashboard').then(res => res.data),
};

export const accountsAPI = {
  createAccount: (phone: string): Promise<Account> =>
    api.post('/accounts', { phone }).then(res => res.data),
  
  verifyAccount: (accountId: string, code: string, password?: string): Promise<Account> =>
    api.post(`/accounts/${accountId}/verify`, { code, password }).then(res => res.data),
  
  getAccounts: (): Promise<Account[]> =>
    api.get('/accounts').then(res => res.data),
};

export const campaignsAPI = {
  createCampaign: (data: {
    account_id: string;
    name: string;
    interval_seconds: number;
    max_steps: number;
  }): Promise<Campaign> =>
    api.post('/campaigns', data).then(res => res.data),
  
  getCampaigns: (): Promise<Campaign[]> =>
    api.get('/campaigns').then(res => res.data),
  
  getCampaign: (campaignId: string): Promise<Campaign> =>
    api.get(`/campaigns/${campaignId}`).then(res => res.data),
  
  addCampaignStep: (campaignId: string, data: {
    step_number: number;
    message: string;
  }): Promise<CampaignStep> =>
    api.post(`/campaigns/${campaignId}/steps`, data).then(res => res.data),
};

export const contactsAPI = {
  createContact: (data: {
    account_id: string;
    identifier: string;
  }): Promise<Contact> =>
    api.post('/contacts', data).then(res => res.data),
  
  getContacts: (): Promise<Contact[]> =>
    api.get('/contacts').then(res => res.data),
};
