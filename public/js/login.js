// ========================================
// LOGIN PAGE LOGIC
// ========================================

const loginForm = document.getElementById('loginForm');

// Form submission
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // Clear previous errors - FIXED: Define inline instead of calling undefined function
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach((el) => {
    el.textContent = '';
  });

  // Get form values
  const voterID = document.getElementById('voterID').value.trim();
  const password = document.getElementById('password').value;

  // Validation
  let isValid = true;

  if (!voterID) {
    showFieldError('voterID', 'Voter ID is required');
    isValid = false;
  }

  if (!password) {
    showFieldError('password', 'Password is required');
    isValid = false;
  }

  if (!isValid) {
    return;
  }

  // Show loading state
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  const submitButtonText = document.getElementById('submitButtonText');
  const submitButtonLoader = document.getElementById('submitButtonLoader');

  submitBtn.disabled = true;
  submitButtonText.style.display = 'none';
  submitButtonLoader.style.display = 'inline';

  try {
    // Call login API
    const response = await loginUser(voterID, password);

    if (response.success) {
      // Store token and user info
      setToken(response.token);
      setUser(response.user);

      // Show success message
      showMessage('successMessage', response.message, 'success', 1000);

      // Redirect based on role
      setTimeout(() => {
        if (response.user.role === 'admin') {
          window.location.href = '/admin-dashboard.html';
        } else {
          window.location.href = '/voter-dashboard.html';
        }
      }, 1000);
    }
  } catch (error) {
    console.error('Login error:', error);
    showMessage('errorMessage', error.message || 'Login failed. Please check your credentials.', 'error');
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