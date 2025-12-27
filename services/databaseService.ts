
import { InvoiceData, UserProfile, UserRole, Company, ProcessingLog } from '../types';

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
    if (!response.ok) throw new Error(data.error || "Une erreur est survenue lors de la connexion.");
    return data;
  },

  async getSessionProfile(username: string): Promise<UserProfile> {
    const response = await fetch(`${API_URL}/auth/session/${username}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Impossible de récupérer la session.");
    return data;
  },

  async register(username: string, password: string, securityQuestion: string, securityAnswer: string): Promise<{pending: boolean}> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, securityQuestion, securityAnswer })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Échec de l'inscription.");
    return data;
  },

  // Fix: Added missing resetPassword method to support password recovery workflow
  async resetPassword(username: string, newPassword: string, answer: string): Promise<void> {
    const response = await fetch(`${API_URL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, newPassword, answer })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Échec de la réinitialisation.");
  },

  async getRecoveryInfo(username: string): Promise<{username: string, security_question: string}> {
    const response = await fetch(`${API_URL}/auth/recovery/${username}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Utilisateur introuvable.");
    return data;
  },

  async updateUserStats(username: string, tokens: number): Promise<void> {
    await fetch(`${API_URL}/users/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, tokens })
    });
  },

  async getLogs(username: string): Promise<ProcessingLog[]> {
    const response = await fetch(`${API_URL}/logs/${username}`);
    const data = await response.json();
    return data.map((l: any) => ({ ...l, timestamp: new Date(l.timestamp) }));
  },

  async saveLog(username: string, message: string, type: string): Promise<void> {
    await fetch(`${API_URL}/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, message, type })
    });
  },

  async saveInvoice(invoice: InvoiceData): Promise<void> {
    await fetch(`${API_URL}/invoices`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invoice)
    });
  },

  async getInvoices(companyId: string): Promise<InvoiceData[]> {
    const response = await fetch(`${API_URL}/invoices?companyId=${companyId}`);
    return await response.json();
  },

  async deleteInvoices(ids: string[]): Promise<void> {
    await fetch(`${API_URL}/invoices/bulk-delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids })
    });
  },

  async archiveInvoices(ids: string[], archived: boolean): Promise<void> {
    await fetch(`${API_URL}/invoices/bulk-archive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids, archived })
    });
  },

  async saveCompanyConfig(companyId: string, config: any): Promise<void> {
    await fetch(`${API_URL}/company/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, config })
    });
  },

  async getAllUsers(companyId?: string): Promise<UserProfile[]> {
    const url = companyId ? `${API_URL}/admin/users?companyId=${companyId}` : `${API_URL}/admin/users`;
    const response = await fetch(url);
    return await response.json();
  },

  // Fix: Added missing updateUser method for the administration dashboard
  async updateUser(username: string, updates: { role: UserRole, companyId: string, isApproved: boolean }): Promise<void> {
    const response = await fetch(`${API_URL}/admin/users/update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, ...updates })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Échec de la mise à jour de l'utilisateur.");
  },

  // Fix: Added missing deleteUser method for the administration dashboard
  async deleteUser(username: string): Promise<void> {
    const response = await fetch(`${API_URL}/admin/users/${username}`, {
      method: 'DELETE'
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Échec de la suppression de l'utilisateur.");
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
  }
};
