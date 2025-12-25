
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
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Une erreur est survenue lors de la connexion.");
    }
    return data;
  },

  async register(username: string, password: string, securityQuestion: string, securityAnswer: string): Promise<{pending: boolean}> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, securityQuestion, securityAnswer })
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Échec de l'inscription.");
    }
    return data;
  },

  async approveUser(username: string): Promise<void> {
    const response = await fetch(`${API_URL}/admin/users/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Impossible d'approuver l'utilisateur.");
    }
  },

  async updateUser(username: string, updates: { role: UserRole, companyId: string, isApproved: boolean }): Promise<void> {
    const response = await fetch(`${API_URL}/admin/users/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, ...updates })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Impossible de mettre à jour l'utilisateur.");
    }
  },

  async deleteUser(username: string): Promise<void> {
    const response = await fetch(`${API_URL}/admin/users/${username}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Impossible de supprimer l'utilisateur.");
    }
  },

  async resetPassword(username: string, newPassword: string, answer: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, newPassword, answer })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Échec de la réinitialisation.");
    }
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
