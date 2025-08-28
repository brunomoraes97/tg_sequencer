import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

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
    account_id: string;
    name: string;
    interval_seconds: number;
  }): Promise<Campaign> =>
    api.put(`/campaigns/${campaignId}`, data).then(res => res.data),
  
  deleteCampaign: (campaignId: string): Promise<void> =>
    api.delete(`/campaigns/${campaignId}`).then(res => res.data),
  
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
    name?: string;
    tag?: string;
  }): Promise<Contact> =>
    api.post('/contacts', data).then(res => res.data),
  
  getContacts: (): Promise<Contact[]> =>
    api.get('/contacts').then(res => res.data),
  
  updateContact: (contactId: string, data: {
    name?: string;
    tag?: string;
  }): Promise<Contact> =>
    api.put(`/contacts/${contactId}`, data).then(res => res.data),
  
  deleteContact: (contactId: string): Promise<void> =>
    api.delete(`/contacts/${contactId}`).then(res => res.data),
};
