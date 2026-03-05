// API communication module
export class API {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    this.token = localStorage.getItem('ndli_access_token') || '';
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('ndli_access_token', token);
  }

  getToken() {
    return this.token;
  }

  setBaseURL(url) {
    this.baseURL = url;
  }

  async request(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const config = {
      ...options,
      headers,
      credentials: 'include',
    };

    const response = await fetch(`${this.baseURL}${endpoint}`, config);

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}`);
      error.status = response.status;
      try {
        error.data = await response.json();
      } catch {}
      throw error;
    }

    return response.json();
  }

  // Health check
  async checkHealth() {
    const response = await fetch(`${this.baseURL}/health`);
    return response.json();
  }

  // Health profile endpoints
  async getHealthProfile() {
    return this.request('/health-profile');
  }

  async updateHealthProfile(data) {
    return this.request('/health-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async grantConsent() {
    return this.request('/health-profile/consent', { method: 'POST' });
  }

  async revokeConsent() {
    return this.request('/health-profile/revoke-consent', { method: 'POST' });
  }

  // Privacy settings
  async getPrivacySettings() {
    return this.request('/privacy-settings');
  }

  async updatePrivacySettings(data) {
    return this.request('/privacy-settings', {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  // Export data
  async exportData() {
    return this.request('/health-profile/export');
  }

  // Weight history
  async getWeightHistory() {
    return this.request('/health-profile/weight-history');
  }

  async addWeightEntry(weightKg) {
    return this.request('/health-profile/weight', {
      method: 'POST',
      body: JSON.stringify({ weightKg }),
    });
  }

  // Activity
  async getActivityEntries() {
    return this.request('/health-profile/activity-entries');
  }

  async addActivityEntry(data) {
    return this.request('/health-profile/activity', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Wellness history
  async getWellnessHistory(days = 30) {
    const safeDays = Number.isFinite(days) ? days : 30;
    return this.request(`/health-profile/wellness-history?days=${encodeURIComponent(safeDays)}`);
  }

  // Summary (weekly/monthly)
  async getSummary(period = 'week') {
    return this.request(`/health-profile/summary?period=${encodeURIComponent(period)}`);
  }

  // AI insights
  async getAIInsights() {
    return this.request('/ai/insights');
  }

  // Authentication endpoints
  async register(email, password) {
    // Use fetch directly since we don't have a token yet
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = 'Registration failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use default error
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async login(email, password) {
    // Use fetch directly since we don't have a token yet
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = 'Login failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use default error
      }
      throw new Error(errorMessage);
    }

    const data = await response.json();
    if (data.accessToken) {
      this.setToken(data.accessToken);
    }
    return data;
  }

  async resendVerification(email) {
    const response = await fetch(`${this.baseURL}/auth/resend-verification`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = 'Failed to resend verification email';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async verifyEmail(code) {
    const response = await fetch(`${this.baseURL}/auth/verify-email?code=${code}`, {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = 'Verification failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {
        // If response is not JSON, use default error
      }
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async forgotPassword(email) {
    const response = await fetch(`${this.baseURL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = 'Failed to send reset email';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async resetPassword(token, newPassword) {
    const response = await fetch(`${this.baseURL}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, newPassword }),
      credentials: 'include',
    });

    if (!response.ok) {
      let errorMessage = 'Password reset failed';
      try {
        const error = await response.json();
        errorMessage = error.message || errorMessage;
      } catch (e) {}
      throw new Error(errorMessage);
    }

    return response.json();
  }
}
