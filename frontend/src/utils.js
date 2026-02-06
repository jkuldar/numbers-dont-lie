// Utility functions

// Unit conversions
export function kgToLbs(kg) {
  return kg * 2.20462;
}

export function lbsToKg(lbs) {
  return lbs / 2.20462;
}

export function cmToInches(cm) {
  return cm / 2.54;
}

export function inchesToCm(inches) {
  return inches * 2.54;
}

export function cmToFeetInches(cm) {
  const totalInches = cmToInches(cm);
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { feet, inches };
}

export function feetInchesToCm(feet, inches) {
  return inchesToCm(feet * 12 + inches);
}

// BMI calculation
export function calculateBMI(weightKg, heightCm) {
  if (!weightKg || !heightCm || heightCm <= 0) return null;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

export function getBMIClass(bmi) {
  if (!bmi || bmi < 0) return 'Invalid';
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal weight';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// Date formatting
export function formatDate(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString();
}

export function formatDateTime(date) {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

// Validation
export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePositiveNumber(value) {
  const num = parseFloat(value);
  return !isNaN(num) && num > 0;
}

export function validateAge(age) {
  const num = parseInt(age);
  return !isNaN(num) && num >= 13 && num <= 120;
}

// Error handling
export function getErrorMessage(error) {
  if (error.data?.message) return error.data.message;
  if (error.message) return error.message;
  return 'An unexpected error occurred';
}

// Loading state helpers
export function showLoading(element) {
  element.classList.add('loading');
  element.setAttribute('aria-busy', 'true');
}

export function hideLoading(element) {
  element.classList.remove('loading');
  element.removeAttribute('aria-busy');
}

// Debounce
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}
