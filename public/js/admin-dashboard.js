// ========================================
// ADMIN DASHBOARD LOGIC
// ========================================

// Redirect if not authenticated or not admin
redirectIfNotAuthenticated();
redirectIfNotAdmin();

// Setup logout button
setupLogoutButton();

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  loadAdminDashboard();
  setupTabButtons();
  setupAddCandidateForm();
  setupVotingControlButtons();
  setupExportPdfButton();
  setupTabSwitching();
});

// Load admin dashboard data
async function loadAdminDashboard() {
  try {
    // Get admin info
    const user = getUser();
    document.getElementById('adminName').textContent = user.name;

    // Fetch dashboard stats
    const dashboardResponse = await getAdminDashboard();
    const { stats } = dashboardResponse;

    document.getElementById('totalVoters').textContent = stats.totalVoters;
    document.getElementById('totalCandidates').textContent = stats.totalCandidates;
    document.getElementById('totalVotes').textContent = stats.totalVotes;

    // Load voting status
    await loadVotingStatus();

    // Load candidates table
    await loadCandidatesTable();

    // Load results
    await loadResultsTab();
  } catch (error) {
    console.error('Dashboard load error:', error);
  }
}

// Load voting status
async function loadVotingStatus() {
  try {
    const response = await getVotingStatusAdmin();
    const { session } = response;

    const statusElement = document.getElementById('votingStatus');
    const currentStatusElement = document.getElementById('currentVotingStatus');

    if (session && session.isOpen) {
      statusElement.textContent = 'Open';
      statusElement.className = 'stat-status badge badge-open';
      currentStatusElement.textContent = 'Open';
      currentStatusElement.className = 'badge badge-open';
      document.getElementById('openVotingBtn').style.display = 'none';
      document.getElementById('closeVotingBtn').style.display = 'inline-block';
    } else {
      statusElement.textContent = 'Closed';
      statusElement.className = 'stat-status badge badge-closed';
      currentStatusElement.textContent = 'Closed';
      currentStatusElement.className = 'badge badge-closed';
      document.getElementById('openVotingBtn').style.display = 'inline-block';
      document.getElementById('closeVotingBtn').style.display = 'none';
    }
  } catch (error) {
    console.error('Load voting status error:', error);
  }
}

// Load candidates table
async function loadCandidatesTable() {
  try {
    const response = await getAllCandidates();
    const candidates = response.candidates;

    const tbody = document.getElementById('candidatesTableBody');
    tbody.innerHTML = '';

    if (candidates.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6b7280;">No candidates yet</td></tr>';
      return;
    }

    candidates.forEach((candidate) => {
      const row = document.createElement('tr');
      const statusBadge = candidate.isActive
        ? '<span class="badge badge-open">Active</span>'
        : '<span class="badge badge-closed">Inactive</span>';

      row.innerHTML = `
        <td>${candidate.name}</td>
        <td>${candidate.party}</td>
        <td>${candidate.symbol}</td>
        <td>${statusBadge}</td>
        <td>
          <div class="action-buttons">
            ${candidate.isActive ? `
              <button class="btn-remove remove-candidate-btn" data-id="${candidate._id}" title="Remove Candidate">
                Remove
              </button>
            ` : `
              <span style="color: #6b7280;">Already removed</span>
            `}
          </div>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Add event listeners to remove buttons
    document.querySelectorAll('.remove-candidate-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.preventDefault();
        const candidateId = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to remove this candidate?')) {
          await removeCandidateAction(candidateId);
        }
      });
    });
  } catch (error) {
    console.error('Load candidates table error:', error);
  }
}

// Remove candidate action
async function removeCandidateAction(candidateId) {
  try {
    const response = await removeCandidate(candidateId);
    if (response.success) {
      showMessage('addCandidateSuccess', response.message, 'success', 3000);
      await loadCandidatesTable();
      await loadAdminDashboard();
    }
  } catch (error) {
    console.error('Remove candidate error:', error);
    showMessage('addCandidateError', error.message || 'Failed to remove candidate', 'error');
  }
}

// Setup add candidate form
function setupAddCandidateForm() {
  const form = document.getElementById('addCandidateForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const candidateName = document.getElementById('candidateName').value.trim();
    const candidateParty = document.getElementById('candidateParty').value.trim();
    const candidateSymbol = document.getElementById('candidateSymbol').value.trim() || '🔵';

    if (!candidateName || !candidateParty) {
      showMessage('addCandidateError', 'Please fill in all required fields', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Adding...';

    try {
      const response = await addCandidate(candidateName, candidateParty, candidateSymbol);

      if (response.success) {
        showMessage('addCandidateSuccess', response.message, 'success', 3000);
        form.reset();
        document.getElementById('candidateSymbol').value = '🔵';
        await loadCandidatesTable();
        await loadAdminDashboard();
      }
    } catch (error) {
      console.error('Add candidate error:', error);
      showMessage('addCandidateError', error.message || 'Failed to add candidate', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Add Candidate';
    }
  });
}

// Setup voting control buttons
function setupVotingControlButtons() {
  const openBtn = document.getElementById('openVotingBtn');
  const closeBtn = document.getElementById('closeVotingBtn');

  if (openBtn) {
    openBtn.addEventListener('click', async () => {
      await toggleVotingSession(true);
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', async () => {
      await toggleVotingSession(false);
    });
  }
}

// Toggle voting session
async function toggleVotingSession(isOpen) {
  const btn = isOpen ? document.getElementById('openVotingBtn') : document.getElementById('closeVotingBtn');
  btn.disabled = true;
  btn.textContent = isOpen ? 'Opening...' : 'Closing...';

  try {
    const response = await toggleVoting(isOpen);

    if (response.success) {
      showMessage(
        'votingControlSuccess',
        response.message || `Voting ${isOpen ? 'opened' : 'closed'} successfully`,
        'success',
        3000
      );

      // Update UI
      await loadVotingStatus();
      await loadAdminDashboard();
    }
  } catch (error) {
    console.error('Toggle voting error:', error);
    showMessage('votingControlError', error.message || 'Failed to toggle voting', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = isOpen ? 'Open Voting' : 'Close Voting';
  }
}

// Load results tab
async function loadResultsTab() {
  try {
    const response = await getResults();
    const { results, winner, totalVotes } = response;

    const noResults = document.getElementById('noResults');
    const resultsContainer = document.getElementById('resultsContainer');

    if (!results || results.length === 0 || totalVotes === 0) {
      noResults.style.display = 'block';
      resultsContainer.style.display = 'none';
      return;
    }

    noResults.style.display = 'none';
    resultsContainer.style.display = 'block';

    // Display summary
    document.getElementById('resultsTotalVotes').textContent = totalVotes;

    // Display winner
    if (winner) {
      const winnerCard = document.getElementById('winnerCard');
      winnerCard.style.display = 'block';
      document.getElementById('winnerName').textContent = winner.name;
      document.getElementById('winnerParty').textContent = winner.party;
      document.getElementById('winnerVotes').textContent = `${winner.voteCount} votes (${winner.percentage}%)`;
    }

    // Display detailed results
    const chartContainer = document.getElementById('resultsChart');
    chartContainer.innerHTML = '';

    results.forEach((result) => {
      const chartBar = document.createElement('div');
      chartBar.className = 'chart-bar';
      chartBar.innerHTML = `
        <div class="chart-label">${result.name}</div>
        <div class="chart-bar-container">
          <div class="chart-bar-fill" style="width: ${result.percentage}%">
            ${result.percentage}%
          </div>
        </div>
        <div class="chart-percentage">${result.voteCount} votes</div>
      `;
      chartContainer.appendChild(chartBar);
    });
  } catch (error) {
    console.error('Load results error:', error);
  }
}

// Load election history
async function loadElectionHistory() {
  try {
    const response = await getElectionHistory();
    const { elections } = response;

    const noHistory = document.getElementById('noHistory');
    const historyContainer = document.getElementById('historyContainer');
    const historyList = document.getElementById('historyList');

    if (!elections || elections.length === 0) {
      noHistory.style.display = 'block';
      historyContainer.style.display = 'none';
      return;
    }

    noHistory.style.display = 'none';
    historyContainer.style.display = 'block';
    historyList.innerHTML = '';

    elections.forEach((election, index) => {
      const card = document.createElement('div');
      card.className = 'history-card';
      
      const startDate = new Date(election.startTime).toLocaleString();
      const endDate = new Date(election.endTime).toLocaleString();

      card.innerHTML = `
        <div class="history-card-header">
          <div class="history-card-title">${election.electionName}</div>
          <div class="history-card-date">#${elections.length - index}</div>
        </div>
        
        <div class="history-stats">
          <div class="history-stat">
            <div class="history-stat-label">Total Votes</div>
            <div class="history-stat-value">${election.totalVotes}</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-label">Candidates</div>
            <div class="history-stat-value">${election.candidates.length}</div>
          </div>
          <div class="history-stat">
            <div class="history-stat-label">Duration</div>
            <div class="history-stat-value">${calculateDuration(election.startTime, election.endTime)}</div>
          </div>
        </div>

        <div class="history-winner">
          <div class="history-winner-name">🏆 ${election.winner.name}</div>
          <div class="history-winner-details">
            Party: ${election.winner.party} | Votes: ${election.winner.voteCount} (${election.winner.percentage}%)
          </div>
        </div>

        <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.2); font-size: 0.85rem; opacity: 0.8;">
          Started: ${startDate} | Ended: ${endDate}
        </div>
      `;
      historyList.appendChild(card);
    });
  } catch (error) {
    console.error('Load election history error:', error);
  }
}

// Helper function to calculate duration
function calculateDuration(startTime, endTime) {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const diff = Math.floor((end - start) / 1000); // seconds
  
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  return `${Math.floor(diff / 3600)}h`;
}

// Setup export PDF button
function setupExportPdfButton() {
  const exportBtn = document.getElementById('exportPdfBtn');
  if (!exportBtn) return;

  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    exportBtn.textContent = '📄 Exporting...';

    try {
      await exportResultsPDF();
      showMessage('exportSuccess', 'Results exported successfully!', 'success', 3000);
    } catch (error) {
      console.error('Export error:', error);
      showMessage('exportError', error.message || 'Failed to export results', 'error');
    } finally {
      exportBtn.disabled = false;
      exportBtn.textContent = '📄 Export as PDF';
    }
  });
}

// Setup tab switching
function setupTabSwitching() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();

      // Remove active class from all buttons
      tabButtons.forEach((b) => {
        b.classList.remove('active');
      });

      // Add active class to clicked button
      btn.classList.add('active');

      // Hide all tab contents
      const tabContents = document.querySelectorAll('.tab-content');
      tabContents.forEach((content) => {
        content.classList.remove('active');
      });

      // Show selected tab content
      const tabName = btn.getAttribute('data-tab');
      const selectedTab = document.getElementById(tabName);
      if (selectedTab) {
        selectedTab.classList.add('active');

        // Reload data for specific tabs
        if (tabName === 'results') {
          await loadResultsTab();
        } else if (tabName === 'candidates') {
          await loadCandidatesTable();
        } else if (tabName === 'history') {
          await loadElectionHistory();
        }
      }
    });
  });
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