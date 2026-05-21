// ========================================
// REGISTRATION PAGE LOGIC
// ========================================

const registerForm = document.getElementById('registerForm');

// Form submission
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear previous errors - FIXED: Define inline
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach((el) => {
    el.textContent = '';
  });

  // Get form values
  const voterID = document.getElementById('voterID').value.trim();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const dateOfBirth = document.getElementById('dateOfBirth').value;
  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  // Validation
  let isValid = true;

  if (!voterID) {
    showFieldError('voterID', 'Voter ID is required');
    isValid = false;
  }

  if (!name) {
    showFieldError('name', 'Full name is required');
    isValid = false;
  }

  if (!email) {
    showFieldError('email', 'Email is required');
    isValid = false;
  } else if (!validateEmail(email)) {
    showFieldError('email', 'Please enter a valid email address');
    isValid = false;
  }

  if (!dateOfBirth) {
    showFieldError('dateOfBirth', 'Date of birth is required');
    isValid = false;
  }

  if (!password) {
    showFieldError('password', 'Password is required');
    isValid = false;
  } else if (!validatePassword(password)) {
    showFieldError('password', 'Password must be at least 6 characters long');
    isValid = false;
  }

  if (password !== confirmPassword) {
    showFieldError('confirmPassword', 'Passwords do not match');
    isValid = false;
  }

  if (!isValid) {
    return;
  }

  // Show loading state
  const submitBtn = registerForm.querySelector('button[type="submit"]');
  const submitButtonText = document.getElementById('submitButtonText');
  const submitButtonLoader = document.getElementById('submitButtonLoader');

  submitBtn.disabled = true;
  submitButtonText.style.display = 'none';
  submitButtonLoader.style.display = 'inline';

  try {
    // Call registration API
    const response = await registerUser({
      voterID,
      name,
      email,
      dateOfBirth,
      password,
      confirmPassword,
    });

    if (response.success) {
      // Show success message
      showMessage('successMessage', response.message, 'success', 3000);

      // Reset form
      registerForm.reset();

      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/login.html';
      }, 2000);
    }
  } catch (error) {
    console.error('Registration error:', error);
    showMessage('errorMessage', error.message || 'Registration failed. Please try again.', 'error');
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    submitButtonText.style.display = 'inline';
    submitButtonLoader.style.display = 'none';
  }
});

// Helper function to show field error
function showFieldError(fieldId, message) {
  const errorElement = document.getElementById(`${fieldId}Error`);
  if (errorElement) {
    errorElement.textContent = message;
  }
}

// Helper function to show message
function showMessage(elementId, message, type = 'success', duration = 5000) {
  const element = document.getElementById(elementId);
  if (!element) return;

  element.textContent = message;
  element.style.display = 'block';
  element.className = `message ${type === 'error' ? 'error' : ''}`;

  setTimeout(() => {
    element.style.display = 'none';
  }, duration);
}

// Validate email
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
function validatePassword(password) {
  return password.length >= 6;
}