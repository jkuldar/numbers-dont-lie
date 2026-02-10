// Profile form component
import { 
  kgToLbs, 
  lbsToKg, 
  cmToInches, 
  feetInchesToCm,
  cmToFeetInches,
  validatePositiveNumber, 
  validateAge,
  getErrorMessage,
  showLoading,
  hideLoading
} from './utils.js';

export class ProfileForm {
  constructor(container, api, onSave) {
    this.container = container;
    this.api = api;
    this.onSave = onSave;
    this.errors = {};
    this.useMetric = true; // Default to metric
    this.render();
    this.attachListeners();
  }

  render() {
    this.container.innerHTML = `
      <div class="profile-form">
        <div class="form-header">
          <h2>Health Profile</h2>
          <div class="unit-toggle">
            <button type="button" class="unit-btn active" data-unit="metric">Metric</button>
            <button type="button" class="unit-btn" data-unit="imperial">Imperial</button>
          </div>
        </div>

        <form id="profile-form">
          <!-- Demographics -->
          <section class="form-section">
            <h3>Demographics</h3>
            <div class="form-grid">
              <label>
                <span>Age *</span>
                <input type="number" name="age" min="13" max="120" required />
                <span class="error" data-field="age"></span>
              </label>
              <label>
                <span>Gender</span>
                <select name="gender">
                  <option value="">Select...</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </label>
            </div>
          </section>

          <!-- Physical Measurements -->
          <section class="form-section">
            <h3>Physical Measurements</h3>
            <div class="form-grid">
              <label class="metric-input">
                <span>Height (cm) *</span>
                <input type="number" name="heightCm" step="0.1" min="50" max="300" required />
                <span class="error" data-field="heightCm"></span>
              </label>
              <label class="imperial-input" style="display: none;">
                <span>Height (ft/in) *</span>
                <div class="height-imperial">
                  <input type="number" name="heightFeet" min="3" max="9" placeholder="ft" />
                  <input type="number" name="heightInches" min="0" max="11" placeholder="in" />
                </div>
                <span class="error" data-field="height"></span>
              </label>
              <label class="metric-input">
                <span>Current Weight (kg) *</span>
                <input type="number" name="currentWeightKg" step="0.1" min="20" max="500" required />
                <span class="error" data-field="currentWeightKg"></span>
              </label>
              <label class="imperial-input" style="display: none;">
                <span>Current Weight (lbs) *</span>
                <input type="number" name="currentWeightLbs" step="0.1" min="44" max="1100" />
                <span class="error" data-field="currentWeightLbs"></span>
              </label>
              <label class="metric-input">
                <span>Target Weight (kg)</span>
                <input type="number" name="targetWeightKg" step="0.1" min="20" max="500" />
              </label>
              <label class="imperial-input" style="display: none;">
                <span>Target Weight (lbs)</span>
                <input type="number" name="targetWeightLbs" step="0.1" min="44" max="1100" />
              </label>
            </div>
          </section>

          <!-- Lifestyle -->
          <section class="form-section">
            <h3>Lifestyle</h3>
            <div class="form-grid">
              <label>
                <span>Activity Level</span>
                <select name="activityLevel">
                  <option value="">Select...</option>
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Lightly Active</option>
                  <option value="moderate">Moderately Active</option>
                  <option value="active">Active</option>
                  <option value="very_active">Very Active</option>
                </select>
              </label>
              <label>
                <span>Sleep (hours/day)</span>
                <input type="number" name="sleepHoursPerDay" step="0.5" min="0" max="24" />
              </label>
              <label>
                <span>Stress Level</span>
                <select name="stressLevel">
                  <option value="">Select...</option>
                  <option value="low">Low</option>
                  <option value="moderate">Moderate</option>
                  <option value="high">High</option>
                </select>
              </label>
              <label>
                <span>Fitness Level</span>
                <select name="fitnessLevel">
                  <option value="">Select...</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>
            </div>
          </section>

          <!-- Dietary Preferences -->
          <section class="form-section">
            <h3>Dietary Preferences & Restrictions</h3>
            <label>
              <span>Dietary Preferences (comma-separated)</span>
              <input type="text" name="dietaryPreferences" placeholder="e.g., vegetarian, vegan, keto" />
              <small>Examples: vegetarian, vegan, pescatarian, keto, paleo</small>
            </label>
            <label>
              <span>Allergies (comma-separated)</span>
              <input type="text" name="allergies" placeholder="e.g., nuts, dairy, shellfish" />
            </label>
            <label>
              <span>Dietary Restrictions (comma-separated)</span>
              <input type="text" name="restrictions" placeholder="e.g., gluten-free, lactose-free" />
            </label>
          </section>

          <!-- Goals -->
          <section class="form-section">
            <h3>Goals</h3>
            <div class="form-grid">
              <label>
                <span>Primary Goal</span>
                <select name="primaryGoal">
                  <option value="">Select...</option>
                  <option value="lose_weight">Lose Weight</option>
                  <option value="gain_weight">Gain Weight</option>
                  <option value="maintain">Maintain Weight</option>
                  <option value="build_muscle">Build Muscle</option>
                  <option value="improve_fitness">Improve Fitness</option>
                </select>
              </label>
              <label>
                <span>Target Date</span>
                <input type="date" name="targetDate" />
              </label>
              <label>
                <span>Weekly Activity Goal (times/week)</span>
                <input type="number" name="weeklyActivityGoal" min="0" max="21" />
              </label>
            </div>
          </section>

          <!-- Medical Information -->
          <section class="form-section">
            <h3>Medical Information (Optional, Encrypted)</h3>
            <label>
              <span>Medical Conditions (comma-separated)</span>
              <input type="text" name="medicalConditions" placeholder="e.g., diabetes, hypertension" />
              <small>This information is encrypted at rest</small>
            </label>
            <label>
              <span>Medications (comma-separated)</span>
              <input type="text" name="medications" placeholder="e.g., metformin, lisinopril" />
              <small>This information is encrypted at rest</small>
            </label>
          </section>

          <!-- Consent -->
          <section class="form-section">
            <label class="checkbox-label">
              <input type="checkbox" name="consentGiven" required />
              <span>I consent to storing my health data securely (required)</span>
            </label>
          </section>

          <div class="form-actions">
            <button type="submit" class="btn-primary">Save Profile</button>
            <button type="button" class="btn-secondary" id="cancel-profile">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }

  attachListeners() {
    const form = this.container.querySelector('#profile-form');
    const unitBtns = this.container.querySelectorAll('.unit-btn');
    const cancelBtn = this.container.querySelector('#cancel-profile');

    // Unit toggle
    unitBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const unit = btn.dataset.unit;
        this.toggleUnits(unit);
        unitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });

    // Form submit
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(form);
    });

    // Cancel
    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => {
        if (this.onCancel) this.onCancel();
      });
    }

    // Real-time validation
    const inputs = form.querySelectorAll('input[required]');
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateField(input);
      });
    });
  }

  toggleUnits(unit) {
    this.useMetric = unit === 'metric';
    const metricInputs = this.container.querySelectorAll('.metric-input');
    const imperialInputs = this.container.querySelectorAll('.imperial-input');

    if (this.useMetric) {
      metricInputs.forEach(el => {
        el.style.display = '';
        // Enable required for visible inputs
        const inputs = el.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
          if (input.name === 'heightCm' || input.name === 'currentWeightKg') {
            input.required = true;
          }
        });
      });
      imperialInputs.forEach(el => {
        el.style.display = 'none';
        // Disable required for hidden inputs
        const inputs = el.querySelectorAll('input[type="number"]');
        inputs.forEach(input => input.required = false);
      });
    } else {
      metricInputs.forEach(el => {
        el.style.display = 'none';
        // Disable required for hidden inputs
        const inputs = el.querySelectorAll('input[type="number"]');
        inputs.forEach(input => input.required = false);
      });
      imperialInputs.forEach(el => {
        el.style.display = '';
        // Enable required for visible inputs
        const inputs = el.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
          if (input.name === 'currentWeightLbs') {
            input.required = true;
          }
        });
      });
    }
  }

  validateField(input) {
    const name = input.name;
    const value = input.value.trim();
    const errorSpan = this.container.querySelector(`[data-field="${name}"]`);

    if (!errorSpan) return true;

    let error = '';

    if (input.required && !value) {
      error = 'This field is required';
    } else if (name === 'age' && !validateAge(value)) {
      error = 'Age must be between 13 and 120';
    } else if ((name === 'heightCm' || name === 'currentWeightKg' || name === 'targetWeightKg') && value && !validatePositiveNumber(value)) {
      error = 'Must be a positive number';
    }

    errorSpan.textContent = error;
    this.errors[name] = error;

    return !error;
  }

  async handleSubmit(form) {
    const formData = new FormData(form);
    const data = {};

    // Clear previous errors
    this.errors = {};
    this.container.querySelectorAll('.error').forEach(el => el.textContent = '');

    // Parse form data
    for (let [key, value] of formData.entries()) {
      if (value === '' && key !== 'consentGiven') continue;
      
      // Boolean (checkbox)
      if (key === 'consentGiven') {
        data[key] = formData.get(key) === 'on' || formData.get(key) === 'true';
      }
      // Arrays (comma-separated)
      else if (['dietaryPreferences', 'allergies', 'restrictions', 'medicalConditions', 'medications'].includes(key)) {
        data[key] = value.split(',').map(v => v.trim()).filter(v => v);
      }
      // Numbers
      else if (['age', 'heightCm', 'currentWeightKg', 'targetWeightKg', 'sleepHoursPerDay', 'weeklyActivityGoal'].includes(key)) {
        data[key] = parseFloat(value);
      }
      // Strings
      else {
        data[key] = value;
      }
    }

    // Convert imperial to metric if needed
    if (!this.useMetric) {
      const feet = parseInt(formData.get('heightFeet')) || 0;
      const inches = parseInt(formData.get('heightInches')) || 0;
      if (feet || inches) {
        data.heightCm = feetInchesToCm(feet, inches);
      }

      const weightLbs = parseFloat(formData.get('currentWeightLbs'));
      if (weightLbs) {
        data.currentWeightKg = lbsToKg(weightLbs);
      }

      const targetLbs = parseFloat(formData.get('targetWeightLbs'));
      if (targetLbs) {
        data.targetWeightKg = lbsToKg(targetLbs);
      }
    }

    // Validate required fields
    const hasErrors = Object.values(this.errors).some(e => e);
    if (hasErrors) {
      this.showError('Please fix the errors above');
      return;
    }

    // Check for BMI validity after conversion
    if (data.currentWeightKg && data.heightCm) {
      const heightM = data.heightCm / 100;
      const bmi = data.currentWeightKg / (heightM * heightM);
      if (bmi < 0 || bmi > 100) {
        this.showError('Invalid BMI calculated. Please check your height and weight values.');
        return;
      }
    }

    // Submit
    const submitBtn = form.querySelector('button[type="submit"]');
    showLoading(submitBtn);

    try {
      const result = await this.api.updateHealthProfile(data);
      hideLoading(submitBtn);
      this.showSuccess('Profile saved successfully!');
      if (this.onSave) this.onSave(result);
    } catch (error) {
      hideLoading(submitBtn);
      this.showError(getErrorMessage(error));
    }
  }

  async loadProfile() {
    try {
      const profile = await this.api.getHealthProfile();
      this.fillForm(profile);
    } catch (error) {
      console.error('Failed to load profile:', error);
    }
  }

  fillForm(profile) {
    const form = this.container.querySelector('#profile-form');
    
    if (!profile) return; // Handle null profile for new users
    
    // Simple fields
    const fields = ['age', 'gender', 'heightCm', 'currentWeightKg', 'targetWeightKg',
                    'activityLevel', 'sleepHoursPerDay', 'stressLevel', 'fitnessLevel',
                    'primaryGoal', 'weeklyActivityGoal'];
    
    fields.forEach(field => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input && profile[field] !== null && profile[field] !== undefined) {
        input.value = profile[field];
      }
    });

    // Checkbox for consent
    const consentInput = form.querySelector('[name="consentGiven"]');
    if (consentInput && profile.consentGiven) {
      consentInput.checked = true;
    }

    // Date field
    if (profile.targetDate) {
      const dateInput = form.querySelector('[name="targetDate"]');
      if (dateInput) {
        dateInput.value = new Date(profile.targetDate).toISOString().split('T')[0];
      }
    }

    // Array fields
    const arrayFields = ['dietaryPreferences', 'allergies', 'restrictions', 'medicalConditions', 'medications'];
    arrayFields.forEach(field => {
      const input = form.querySelector(`[name="${field}"]`);
      if (input && Array.isArray(profile[field])) {
        input.value = profile[field].join(', ');
      }
    });
  }

  showError(message) {
    // You can implement a toast or modal here
    alert(message);
  }

  showSuccess(message) {
    alert(message);
  }
}
