import { showToast } from './utils.js';

// Authentication component
export class Auth {
  constructor(container, api, onAuthenticated) {
    this.container = container;
    this.api = api;
    this.onAuthenticated = onAuthenticated;
    this.currentMode = 'login'; // 'login' or 'register' or 'verify'
  }

  render() {
    this.container.innerHTML = `
      <div class="auth-page">
        <div class="auth-branding">
          <div class="auth-branding-inner">
            <div class="auth-brand-logo">
              <span class="auth-brand-icon">📊</span>
              <h1>Numbers Don't Lie</h1>
            </div>
            <p class="auth-brand-tagline">Sinu privaatsusele keskenduv terviseplatvorm</p>
            <ul class="auth-features">
              <li>
                <span class="feature-icon">🔒</span>
                <div>
                  <strong>Privaatsus esikohal</strong>
                  <span>Sinu andmed on ainult sinu omad</span>
                </div>
              </li>
              <li>
                <span class="feature-icon">📈</span>
                <div>
                  <strong>Tervise ülevaade</strong>
                  <span>Jälgi kehakaalu, und, aktiivsust ja enamat</span>
                </div>
              </li>
              <li>
                <span class="feature-icon">🤖</span>
                <div>
                  <strong>AI nõuanded</strong>
                  <span>Personaalsed soovitused sinu andmete põhjal</span>
                </div>
              </li>
              <li>
                <span class="feature-icon">📊</span>
                <div>
                  <strong>Täpsed graafikud</strong>
                  <span>Visualiseeri oma tervisearengut</span>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div class="auth-container">
          <div class="auth-card">
            <div class="auth-header">
              <h2>Numbers Don't Lie</h2>
              <p class="auth-subtitle">Tere tulemast tagasi</p>
            </div>

            <div class="auth-tabs">
              <button class="auth-tab ${this.currentMode === 'login' ? 'active' : ''}" data-mode="login">
                Sisene
              </button>
              <button class="auth-tab ${this.currentMode === 'register' ? 'active' : ''}" data-mode="register">
                Registreeru
              </button>
            </div>

            <div class="auth-body">
              ${this.currentMode === 'login' ? this.renderLoginForm() : this.renderRegisterForm()}
            </div>

            <div class="auth-footer">
              <div class="auth-divider">
                <span>või</span>
              </div>
              <div class="oauth-buttons">
                <button class="btn-oauth btn-google" id="google-login">
                  <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg"><g fill="none" fill-rule="evenodd"><path d="M17.6 9.2l-.1-1.8H9v3.4h4.8C13.6 12 13 13 12 13.6v2.2h3a8.8 8.8 0 0 0 2.6-6.6z" fill="#4285F4" fill-rule="nonzero"/><path d="M9 18c2.4 0 4.5-.8 6-2.2l-3-2.2a5.4 5.4 0 0 1-8-2.9H1V13a9 9 0 0 0 8 5z" fill="#34A853" fill-rule="nonzero"/><path d="M4 10.7a5.4 5.4 0 0 1 0-3.4V5H1a9 9 0 0 0 0 8l3-2.3z" fill="#FBBC05" fill-rule="nonzero"/><path d="M9 3.6c1.3 0 2.5.4 3.4 1.3L15 2.3A9 9 0 0 0 1 5l3 2.4a5.4 5.4 0 0 1 5-3.7z" fill="#EA4335" fill-rule="nonzero"/></g></svg>
                  Google
                </button>
                <button class="btn-oauth btn-github" id="github-login">
                  <svg width="18" height="18" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9 0C4 0 0 4 0 9c0 4 2.6 7.4 6.2 8.6.5.1.7-.2.7-.5v-1.7c-2.5.5-3-.6-3.2-1.2-.1-.3-.6-1.2-1-1.4-.4-.2-.9-.7 0-.7.8 0 1.4.7 1.6 1 .9 1.5 2.4 1.1 3 .8.1-.6.4-1.1.7-1.3-2.3-.3-4.7-1.1-4.7-5 0-1.1.4-2 1-2.7-.1-.3-.4-1.3.1-2.8 0 0 .9-.3 2.8 1a9.5 9.5 0 0 1 5 0c2-1.3 2.8-1 2.8-1 .5 1.5.2 2.5.1 2.8.7.7 1 1.6 1 2.7 0 3.8-2.3 4.7-4.6 4.9.4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A9 9 0 0 0 9 0z"/></svg>
                  GitHub
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEventListeners();
  }

  renderLoginForm() {
    return `
      <form id="login-form" class="auth-form">
        <div class="form-group">
          <label>E-mail</label>
          <input 
            type="email" 
            name="email" 
            placeholder="sinu@email.ee"
            required 
            autocomplete="email"
          />
        </div>
        
        <div class="form-group">
          <label>Parool</label>
          <input 
            type="password" 
            name="password" 
            placeholder="••••••••"
            required 
            autocomplete="current-password"
          />
        </div>

        <div id="auth-error" class="auth-error" style="display: none;"></div>
        <div id="auth-success" class="auth-success" style="display: none;"></div>

        <button type="submit" class="btn-primary btn-block">
          Sisene
        </button>

        <div class="auth-links">
          <a href="#" id="forgot-password">Unustasid parooli?</a>
        </div>
      </form>
    `;
  }

  renderRegisterForm() {
    return `
      <form id="register-form" class="auth-form">
        <div class="form-group">
          <label>E-mail</label>
          <input 
            type="email" 
            name="email" 
            placeholder="sinu@email.ee"
            required 
            autocomplete="email"
          />
        </div>
        
        <div class="form-group">
          <label>Parool</label>
          <input 
            type="password" 
            name="password" 
            placeholder="Vähemalt 8 tähemärki"
            required 
            autocomplete="new-password"
            minlength="8"
          />
          <small class="form-hint">Vähemalt 8 tähemärki</small>
        </div>
        
        <div class="form-group">
          <label>Korda parooli</label>
          <input 
            type="password" 
            name="confirmPassword" 
            placeholder="••••••••"
            required 
            autocomplete="new-password"
          />
        </div>

        <div id="auth-error" class="auth-error" style="display: none;"></div>
        <div id="auth-success" class="auth-success" style="display: none;"></div>

        <button type="submit" class="btn-primary btn-block">
          Loo konto
        </button>
      </form>
    `;
  }

  attachEventListeners() {
    // Tab switching
    const tabs = this.container.querySelectorAll('.auth-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentMode = tab.dataset.mode;
        this.render();
      });
    });

    // Login form
    const loginForm = this.container.querySelector('#login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleLogin(e.target);
      });
    }

    // Register form
    const registerForm = this.container.querySelector('#register-form');
    if (registerForm) {
      registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await this.handleRegister(e.target);
      });
    }

    // OAuth buttons
    const googleBtn = this.container.querySelector('#google-login');
    const githubBtn = this.container.querySelector('#github-login');
    
    if (googleBtn) {
      googleBtn.addEventListener('click', () => this.handleOAuth('google'));
    }
    if (githubBtn) {
      githubBtn.addEventListener('click', () => this.handleOAuth('github'));
    }

    // Forgot password
    const forgotPassword = this.container.querySelector('#forgot-password');
    if (forgotPassword) {
      forgotPassword.addEventListener('click', (e) => {
        e.preventDefault();
        showToast('Password reset functionality coming soon! Use API endpoint /auth/forgot-password', 'error');
      });
    }
  }

  async handleLogin(form) {
    const email = form.email.value.trim();
    const password = form.password.value;
    const submitBtn = form.querySelector('button[type="submit"]');
    const errorEl = this.container.querySelector('#auth-error');
    const successEl = this.container.querySelector('#auth-success');

    this.hideMessages();
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sisselogimine...';

    try {
      const result = await this.api.login(email, password);
      
      if (result.accessToken) {
        this.showSuccess('Sisselogimine õnnestus!');
        setTimeout(() => {
          this.onAuthenticated();
        }, 500);
      } else if (result.message && result.message.includes('verify')) {
        this.showError('Palun kontrolli oma e-maili ja kinnita konto enne sisselogimist.');
      }
    } catch (error) {
      this.showError(error.message || 'Sisselogimine ebaõnnestus');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Sisene';
    }
  }

  async handleRegister(form) {
    const email = form.email.value.trim();
    const password = form.password.value;
    const confirmPassword = form.confirmPassword.value;
    const submitBtn = form.querySelector('button[type="submit"]');

    this.hideMessages();

    if (password !== confirmPassword) {
      this.showError('Paroolid ei ühti');
      return;
    }

    if (password.length < 8) {
      this.showError('Parool peab olema vähemalt 8 tähemärki');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Konto loomine...';

    try {
      await this.api.register(email, password);
      this.showSuccess('Konto loodud! Kontrolli oma e-maili, et konto kinnitada.');
      form.reset();
      
      // Show verification notice
      setTimeout(() => {
        this.showVerificationNotice(email);
      }, 2000);
      
    } catch (error) {
      this.showError(error.message || 'Registreerimine ebaõnnestus');
      submitBtn.disabled = false;
      submitBtn.textContent = 'Loo konto';
    }
  }

  handleOAuth(provider) {
    // Redirect to OAuth provider
    const oauthUrl = `${this.api.baseURL}/auth/${provider}`;
    window.location.href = oauthUrl;
  }

  showVerificationNotice(email) {
    this.container.querySelector('.auth-body').innerHTML = `
      <div class="verification-notice">
        <div class="verification-icon">📧</div>
        <h3>Kontrolli oma emaili</h3>
        <p>Saatsime kinnituslingi aadressile:</p>
        <strong>${email}</strong>
        <p class="verification-help">
          Kliki lingil emailis, et oma konto aktiveerida. 
          Seejärel saad sisse logida.
        </p>
        <button class="btn-secondary" id="back-to-login">
          Tagasi sisselogimisele
        </button>
      </div>
    `;

    this.container.querySelector('#back-to-login')?.addEventListener('click', () => {
      this.currentMode = 'login';
      this.render();
    });
  }

  showError(message) {
    const errorEl = this.container.querySelector('#auth-error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  }

  showSuccess(message) {
    const successEl = this.container.querySelector('#auth-success');
    if (successEl) {
      successEl.textContent = message;
      successEl.style.display = 'block';
    }
  }

  hideMessages() {
    const errorEl = this.container.querySelector('#auth-error');
    const successEl = this.container.querySelector('#auth-success');
    if (errorEl) errorEl.style.display = 'none';
    if (successEl) successEl.style.display = 'none';
  }
}
