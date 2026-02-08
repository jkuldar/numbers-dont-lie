// Main application
import { API } from './api.js';
import { Auth } from './auth.js';
import { Dashboard } from './dashboard.js';
import { ProfileForm } from './profile-form.js';
import { Charts } from './charts.js';
import { PrivacySettings } from './privacy-settings.js';

class App {
  constructor() {
    this.api = new API();
    this.currentView = 'dashboard';
    this.components = {};
    
    this.init();
  }

  init() {
    this.renderNav();
    this.checkAuth();
    this.attachGlobalListeners();
  }

  renderNav() {
    const nav = document.getElementById('app-nav');
    nav.innerHTML = `
      <nav class="main-nav">
        <div class="nav-brand">
          <h1>Numbers Don't Lie</h1>
        </div>
        <div class="nav-links">
          <button class="nav-link active" data-view="dashboard">Dashboard</button>
          <button class="nav-link" data-view="profile">Profile</button>
          <button class="nav-link" data-view="charts">Charts</button>
          <button class="nav-link" data-view="privacy">Privacy</button>
        </div>
        <div class="nav-actions">
          <button class="btn-icon" id="settings-btn" title="Settings">⚙️</button>
          <button class="btn-icon" id="logout-btn" title="Logout">🚪</button>
        </div>
      </nav>
    `;

    // Nav click handlers
    const navLinks = nav.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const view = link.dataset.view;
        this.navigateTo(view);
        
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });

    // Settings button (opens modal for API config)
    document.getElementById('settings-btn')?.addEventListener('click', () => {
      this.showSettingsModal();
    });

    // Logout
    document.getElementById('logout-btn')?.addEventListener('click', () => {
      if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('ndli_access_token');
        location.reload();
      }
    });
  }

  checkAuth() {
    const token = this.api.getToken();
    
    // Check for OAuth callback
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('accessToken');
    const refreshToken = urlParams.get('refreshToken');
    
    if (accessToken) {
      // OAuth callback - save token and redirect
      this.api.setToken(accessToken);
      if (refreshToken) {
        localStorage.setItem('ndli_refresh_token', refreshToken);
      }
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      this.navigateTo('dashboard');
      return;
    }
    
    if (!token) {
      this.showAuthScreen();
    } else {
      this.navigateTo('dashboard');
    }
  }

  showAuthScreen() {
    const container = document.getElementById('app-content');
    container.innerHTML = '<div id="auth-container"></div>';
    
    const authContainer = document.getElementById('auth-container');
    const auth = new Auth(authContainer, this.api, () => {
      this.renderNav();
      this.navigateTo('dashboard');
    });
    
    auth.render();
  }

  showSettingsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Settings</h3>
          <button class="btn-close" id="close-modal">×</button>
        </div>
        <div class="modal-body">
          <label>
            <span>API Base URL</span>
            <input type="text" id="modal-api-base" value="${this.api.baseURL}" />
          </label>
          <label>
            <span>Access Token</span>
            <input type="password" id="modal-token" value="${this.api.getToken()}" />
          </label>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn-primary" id="modal-save">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    const close = () => {
      modal.classList.remove('show');
      setTimeout(() => document.body.removeChild(modal), 300);
    };

    modal.querySelector('#close-modal').addEventListener('click', close);
    modal.querySelector('#modal-cancel').addEventListener('click', close);
    modal.addEventListener('click', (e) => {
      if (e.target === modal) close();
    });

    modal.querySelector('#modal-save').addEventListener('click', () => {
      const baseURL = modal.querySelector('#modal-api-base').value.trim();
      const token = modal.querySelector('#modal-token').value.trim();
      
      if (baseURL) this.api.setBaseURL(baseURL);
      if (token) this.api.setToken(token);
      
      close();
      location.reload();
    });
  }

  async navigateTo(view) {
    this.currentView = view;
    const container = document.getElementById('app-content');
    container.innerHTML = '<div class="loading-spinner">Loading...</div>';

    try {
      switch (view) {
        case 'dashboard':
          await this.renderDashboard(container);
          break;
        case 'profile':
          await this.renderProfile(container);
          break;
        case 'charts':
          await this.renderCharts(container);
          break;
        case 'privacy':
          await this.renderPrivacy(container);
          break;
      }
    } catch (error) {
      container.innerHTML = `<div class="error-state">Failed to load view: ${error.message}</div>`;
    }
  }

  async renderDashboard(container) {
    container.innerHTML = '<div id="dashboard-container"></div>';
    const dashboardEl = document.getElementById('dashboard-container');
    
    const dashboard = new Dashboard(dashboardEl, this.api);
    dashboard.onCreateProfile = () => this.navigateTo('profile');
    dashboard.onAddWeight = () => this.showAddWeightModal();
    dashboard.onAddActivity = () => this.showAddActivityModal();
    
    await dashboard.load();
    this.components.dashboard = dashboard;
  }

  async renderProfile(container) {
    container.innerHTML = '<div id="profile-container"></div>';
    const profileEl = document.getElementById('profile-container');
    
    const profileForm = new ProfileForm(profileEl, this.api, () => {
      this.navigateTo('dashboard');
    });
    
    await profileForm.loadProfile();
    this.components.profileForm = profileForm;
  }

  async renderCharts(container) {
    container.innerHTML = '<div id="charts-container"></div>';
    const chartsEl = document.getElementById('charts-container');
    
    const charts = new Charts(chartsEl, this.api);
    await charts.load();
    this.components.charts = charts;
  }

  async renderPrivacy(container) {
    container.innerHTML = '<div id="privacy-container"></div>';
    const privacyEl = document.getElementById('privacy-container');
    
    const privacy = new PrivacySettings(privacyEl, this.api);
    await privacy.load();
    this.components.privacy = privacy;
  }

  showAddWeightModal() {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Log Weight</h3>
          <button class="btn-close" id="close-modal">×</button>
        </div>
        <div class="modal-body">
          <form id="add-weight-form">
            <label>
              <span>Weight (kg) *</span>
              <input type="number" name="weightKg" step="0.1" min="20" max="500" required />
            </label>
          </form>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" id="modal-cancel">Cancel</button>
          <button class="btn-primary" id="modal-save">Save</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => modal.classList.add('show'), 10);

    const close = () => {
      modal.classList.remove('show');
      setTimeout(() => document.body.removeChild(modal), 300);
    };

    modal.querySelector('#close-modal').addEventListener('click', close);
    modal.querySelector('#modal-cancel').addEventListener('click', close);

    modal.querySelector('#modal-save').addEventListener('click', async () => {
      const form = modal.querySelector('#add-weight-form');
      const weightKg = parseFloat(form.weightKg.value);
      
      if (weightKg) {
        try {
          await this.api.addWeightEntry(weightKg);
          close();
          this.navigateTo('dashboard');
        } catch (error) {
          alert('Failed to save weight: ' + error.message);
        }
      }
    });
  }

  showAddActivityModal() {
    alert('Activity logging modal coming soon!');
  }

  attachGlobalListeners() {
    // Handle API errors globally
    window.addEventListener('unhandledrejection', (event) => {
      console.error('Unhandled promise rejection:', event.reason);
    });
  }
}

// Initialize app
new App();
