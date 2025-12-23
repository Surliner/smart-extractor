
import { InvoiceData, UserProfile, UserActivity } from '../types';

// En production sur Render, l'API sera sur le même domaine ou un domaine spécifique
// Cette logique permet de basculer dynamiquement.
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api' 
  : `${window.location.origin}/api`; 

export const dbService = {
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
