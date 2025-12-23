
import { InvoiceData, UserProfile, UserActivity } from '../types';

const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : `${window.location.origin}/api`; 

export const dbService = {
  // --- AUTHENTIFICATION ---
  async registerUser(user: any): Promise<UserProfile> {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user)
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Erreur lors de la création du compte.");
    }
    return await response.json();
  },

  async login(username: string, password: string): Promise<UserProfile> {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Échec de l'authentification.");
    }
    return await response.json();
  },

  // --- FACTURES ---
  async saveInvoice(invoice: InvoiceData): Promise<boolean> {
    try {
      const response = await fetch(`${API_URL}/invoices`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoice)
      });
      return response.ok;
    } catch (e) {
      console.warn("Connexion Backend échouée, mode local activé.");
      return false; 
    }
  },

  async getInvoices(username: string, role: string): Promise<InvoiceData[]> {
    try {
      const response = await fetch(`${API_URL}/invoices?user=${username}&role=${role}`);
      if (response.ok) return await response.json();
      throw new Error();
    } catch (e) {
      const saved = localStorage.getItem('invoice-queue-persistent-all');
      return saved ? JSON.parse(saved) : [];
    }
  },

  // --- UTILISATEURS & MONITORING ---
  async syncUserStats(username: string, stats: any, activity: UserActivity): Promise<void> {
    try {
      await fetch(`${API_URL}/users/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, stats, activity })
      });
    } catch (e) {
      // Fallback localstorage déjà géré dans App.tsx
    }
  },

  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const response = await fetch(`${API_URL}/admin/users`);
      if (response.ok) return await response.json();
      throw new Error();
    } catch (e) {
      const saved = localStorage.getItem('smart-invoice-users');
      return saved ? JSON.parse(saved) : [];
    }
  }
};
