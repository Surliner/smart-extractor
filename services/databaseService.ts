
import { InvoiceData, UserProfile, UserActivity, UserRole, Company } from '../types';

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : `${window.location.origin}/api`; 

export const dbService = {
  async login(username: string, password: string): Promise<UserProfile> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error("Identifiants invalides.");
    return await response.json();
  },

  async saveCompanyConfig(companyId: string, config: any): Promise<void> {
    await fetch(`${API_URL}/company/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, config })
    });
  },

  async getAllCompanies(): Promise<Company[]> {
    const response = await fetch(`${API_URL}/admin/companies`);
    return await response.json();
  },

  async createCompany(name: string): Promise<Company> {
    const response = await fetch(`${API_URL}/admin/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    return await response.json();
  },

  async createAdminUser(userData: any): Promise<void> {
    await fetch(`${API_URL}/admin/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    });
  },

  async saveInvoice(invoice: InvoiceData): Promise<void> {
    await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice)
    });
  },

  async getInvoices(username: string): Promise<InvoiceData[]> {
    const response = await fetch(`${API_URL}/invoices?user=${username}`);
    return await response.json();
  },

  async getAllUsers(): Promise<UserProfile[]> {
    const response = await fetch(`${API_URL}/admin/users`);
    return await response.json();
  }
};
