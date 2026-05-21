// ========================================
// COMMON UTILITIES & API FUNCTIONS
// ========================================

const API_BASE_URL = window.location.origin + '/api';

// Get token from localStorage
function getToken() {
  return localStorage.getItem('token');
}

// Set token in localStorage
function setToken(token) {
  localStorage.setItem('token', token);
}

// Remove token from localStorage
function removeToken() {
  localStorage.removeItem('token');
}

// Get user from localStorage
function getUser() {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
}

// Set user in localStorage
function setUser(user) {
  localStorage.setItem('user', JSON.stringify(user));
}

// Remove user from localStorage
function removeUser() {
  localStorage.removeItem('user');
}

// Check if user is authenticated
function isAuthenticated() {
  return !!getToken();
}

// Check if user is admin
function isAdmin() {
  const user = getUser();
  return user && user.role === 'admin';
}

// Logout user
function logout() {
  removeToken();
  removeUser();
  window.location.href = '/login.html';
}

// ========================================
// API HELPER FUNCTIONS
// ========================================

// Generic fetch function with token
async function apiFetch(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const token = getToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired or invalid
        logout();
        throw new Error('Session expired. Please log in again.');
      }
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// ========================================
// AUTH API CALLS
// ========================================

// Register user
async function registerUser(formData) {
  return apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

// Login user
async function loginUser(voterID, password) {
  return apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ voterID, password }),
  });
}

// Get current user info
async function getCurrentUser() {
  return apiFetch('/auth/me', {
    method: 'GET',
  });
}

// Logout user (API call)
async function logoutAPI() {
  return apiFetch('/auth/logout', {
    method: 'POST',
  });
}

// ========================================
// VOTING API CALLS
// ========================================

// Get all active candidates
async function getCandidates() {
  return apiFetch('/voting/candidates', {
    method: 'GET',
  });
}

// Check voting session status
async function getVotingStatus() {
  return apiFetch('/voting/session-status', {
    method: 'GET',
  });
}

// Cast a vote
async function castVote(candidateID) {
  return apiFetch('/voting/cast-vote', {
    method: 'POST',
    body: JSON.stringify({ candidateID }),
  });
}

// Check if user has voted
async function checkVoteStatus() {
  return apiFetch('/voting/check-vote-status', {
    method: 'GET',
  });
}

// ========================================
// ADMIN API CALLS
// ========================================

// Get admin dashboard data
async function getAdminDashboard() {
  return apiFetch('/admin/dashboard', {
    method: 'GET',
  });
}

// Add a new candidate
async function addCandidate(name, party, symbol) {
  return apiFetch('/admin/add-candidate', {
    method: 'POST',
    body: JSON.stringify({ name, party, symbol }),
  });
}

// Remove a candidate
async function removeCandidate(candidateID) {
  return apiFetch(`/admin/remove-candidate/${candidateID}`, {
    method: 'DELETE',
  });
}

// Get all candidates (admin view)
async function getAllCandidates() {
  return apiFetch('/admin/candidates', {
    method: 'GET',
  });
}

// Toggle voting (open/close)
async function toggleVoting(isOpen) {
  return apiFetch('/admin/toggle-voting', {
    method: 'POST',
    body: JSON.stringify({ isOpen }),
  });
}

// Get voting status (admin view)
async function getVotingStatusAdmin() {
  return apiFetch('/admin/voting-status', {
    method: 'GET',
  });
}

// ========================================
// ADDITIONAL API CALLS
// ========================================

// Get election history
async function getElectionHistory() {
  return apiFetch('/admin/election-history', {
    method: 'GET',
  });
}

// ========================================
// RESULTS API CALLS
// ========================================

// Get election results
async function getResults() {
  return apiFetch('/results/results', {
    method: 'GET',
  });
}

// Export results as PDF
async function exportResultsPDF() {
  const token = getToken();
  const url = `${API_BASE_URL}/results/export-pdf`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to export PDF');
    }

    // Get blob from response
    const blob = await response.blob();

    // Create download link
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `voting_results_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error) {
    console.error('PDF Export Error:', error);
    throw error;
  }
}

// ========================================
// UI HELPER FUNCTIONS
// ========================================

// Show message
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

// Clear all error messages
function clearErrors() {
  const errorElements = document.querySelectorAll('.error-message');
  errorElements.forEach((el) => {
    el.textContent = '';
  });
}

// Show error for specific field
function showFieldError(fieldId, message) {
  const errorElement = document.getElementById(`${fieldId}Error`);
  if (errorElement) {
    errorElement.textContent = message;
  }
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

// Format date
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Format date and time
function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ========================================
// MODAL FUNCTIONS
// ========================================

// Show modal
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
  }
}

// Hide modal
function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
  }
}

// ========================================
// TAB FUNCTIONS
// ========================================

// Switch tab
function switchTab(tabName) {
  // Hide all tabs
  const tabContents = document.querySelectorAll('.tab-content');
  tabContents.forEach((tab) => {
    tab.classList.remove('active');
  });

  // Remove active class from all tab buttons
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Add active class to clicked button
  event.target.classList.add('active');
}

// ========================================
// LOGOUT BUTTON HANDLER
// ========================================

// Setup logout button
function setupLogoutButton() {
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await logoutAPI();
        logout();
      } catch (error) {
        console.error('Logout error:', error);
        logout(); // Force logout even if API call fails
      }
    });
  }
}

// ========================================
// REDIRECT FUNCTIONS
// ========================================

// Redirect if not authenticated
function redirectIfNotAuthenticated() {
  if (!isAuthenticated()) {
    window.location.href = '/login.html';
  }
}

// Redirect if not admin
function redirectIfNotAdmin() {
  if (!isAdmin()) {
    window.location.href = '/';
  }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  setupLogoutButton();
  setupTabButtons();
});

// Setup tab button listeners
function setupTabButtons() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tabName = e.target.getAttribute('data-tab');
      switchTab(tabName);
    });
  });
}

// Close modal when close button is clicked
document.addEventListener('DOMContentLoaded', () => {
  const modals = document.querySelectorAll('.modal');
  modals.forEach((modal) => {
    const closeBtn = modal.querySelector('.modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        modal.classList.remove('show');
      });
    }

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        modal.classList.remove('show');
      }
    });
  });
});