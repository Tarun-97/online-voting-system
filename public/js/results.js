// ========================================
// RESULTS PAGE LOGIC
// ========================================

// Setup logout button (visible only if authenticated)
document.addEventListener('DOMContentLoaded', () => {
  if (isAuthenticated()) {
    document.getElementById('logoutBtn').style.display = 'inline-block';
    document.getElementById('loginLink').style.display = 'none';
    setupLogoutButton();
  } else {
    document.getElementById('logoutBtn').style.display = 'none';
    document.getElementById('loginLink').style.display = 'inline-block';
  }

  loadResults();
});

// Load results
async function loadResults() {
  try {
    const token = getToken();

    if (!token) {
      // Show public results (without admin data)
      await loadPublicResults();
    } else {
      // Show admin results
      await loadAdminResults();
    }
  } catch (error) {
    console.error('Load results error:', error);
    showResultsError('Failed to load results. Please try again.');
  }
}

// Load public results
async function loadPublicResults() {
  try {
    // For public users, we just show the general results page
    // They can't access detailed admin results
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('noResults').style.display = 'block';
  } catch (error) {
    console.error('Public results error:', error);
  }
}

// Load admin results
async function loadAdminResults() {
  try {
    const user = getUser();

    // Check if user is admin
    if (user.role !== 'admin') {
      document.getElementById('loadingSpinner').style.display = 'none';
      showResultsError('⚠️ Only administrators can view election results.');
      return;
    }

    // Fetch results
    const response = await getResults();
    const { results, winner, totalVotes, message } = response;

    document.getElementById('loadingSpinner').style.display = 'none';

    // Handle no results
    if (!results || results.length === 0 || totalVotes === 0) {
      document.getElementById('noResults').style.display = 'block';
      document.getElementById('resultsContent').style.display = 'none';
      return;
    }

    // Display results
    document.getElementById('noResults').style.display = 'none';
    document.getElementById('resultsContent').style.display = 'block';

    // Display total votes
    document.getElementById('totalVotesCount').textContent = totalVotes;

    // Display winner
    if (winner) {
      const winnerSection = document.getElementById('winnerSection');
      winnerSection.style.display = 'block';
      document.getElementById('winnerCandidateName').textContent = winner.name;
      document.getElementById('winnerCandidateParty').textContent = winner.party;
      document.getElementById('winnerCandidateVotes').textContent = winner.voteCount;
      document.getElementById('winnerCandidatePercentage').textContent = winner.percentage + '%';
    } else {
      document.getElementById('winnerSection').style.display = 'none';
    }

    // Display detailed results
    const resultsList = document.getElementById('resultsList');
    resultsList.innerHTML = '';

    results.forEach((result, index) => {
      const resultItem = document.createElement('div');
      resultItem.className = 'result-item';
      resultItem.innerHTML = `
        <div class="result-item-info">
          <div class="result-item-name">${index + 1}. ${result.name}</div>
          <div class="result-item-party">Party: ${result.party}</div>
        </div>
        <div class="result-item-stats">
          <div class="result-item-votes">${result.voteCount} votes</div>
          <div class="result-item-percentage">${result.percentage}%</div>
        </div>
      `;
      resultsList.appendChild(resultItem);
    });
  } catch (error) {
    console.error('Admin results error:', error);

    // Check if it's an authorization error
    if (error.message.includes('admin')) {
      showResultsError('⚠️ Only administrators can view detailed election results.');
    } else {
      showResultsError('Failed to load results: ' + error.message);
    }
  }
}

// Show results error
function showResultsError(message) {
  document.getElementById('loadingSpinner').style.display = 'none';
  document.getElementById('noResults').style.display = 'none';
  document.getElementById('resultsContent').style.display = 'none';

  const errorContainer = document.getElementById('errorContainer');
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
}