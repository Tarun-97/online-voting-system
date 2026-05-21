// ========================================
// VOTER DASHBOARD LOGIC
// ========================================

// Redirect if not authenticated
redirectIfNotAuthenticated();

// Setup logout button
setupLogoutButton();

let selectedCandidateId = null;
let selectedCandidateName = null;
let selectedCandidateParty = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  setupCandidateCards();
  setupConfirmVoteModal();
});

// Load dashboard data
async function loadDashboard() {
  try {
    // Get current user
    const user = getUser();
    document.getElementById('userName').textContent = user.name;
    document.getElementById('voterID').textContent = user.voterID;

    // Check voting status
    const votingStatus = await getVotingStatus();

    // Check if user has already voted
    const voteStatusResponse = await checkVoteStatus();
    const hasVoted = voteStatusResponse.hasVoted;

    // Update UI based on voting status
    if (hasVoted) {
      document.getElementById('alreadyVoted').style.display = 'block';
      document.getElementById('votingOpen').style.display = 'none';
      document.getElementById('voteStatus').textContent = 'Voted';
      document.getElementById('voteStatus').className = 'badge badge-voted';
    } else if (votingStatus.isOpen) {
      document.getElementById('alreadyVoted').style.display = 'none';
      document.getElementById('votingOpen').style.display = 'block';
      document.getElementById('votingClosed').style.display = 'none';
      loadCandidates();
    } else {
      document.getElementById('alreadyVoted').style.display = 'none';
      document.getElementById('votingOpen').style.display = 'none';
      document.getElementById('votingClosed').style.display = 'block';
    }

    document.getElementById('loadingSpinner').style.display = 'none';
  } catch (error) {
    console.error('Dashboard load error:', error);
    showError('Failed to load dashboard: ' + error.message);
  }
}

// Load candidates
async function loadCandidates() {
  try {
    document.getElementById('loadingSpinner').style.display = 'flex';
    document.getElementById('candidatesGrid').innerHTML = '';

    const response = await getCandidates();
    const candidates = response.candidates;

    if (candidates.length === 0) {
      document.getElementById('candidatesGrid').innerHTML =
        '<p style="grid-column: 1/-1; text-align: center; color: #6b7280;">No candidates available</p>';
      return;
    }

    // Create candidate cards
    candidates.forEach((candidate) => {
      const card = document.createElement('div');
      card.className = 'candidate-card';
      card.id = `candidate-${candidate._id}`;
      card.innerHTML = `
        <div class="candidate-symbol">${candidate.symbol}</div>
        <h4>${candidate.name}</h4>
        <p class="candidate-party">${candidate.party}</p>
        <button type="button" class="btn btn-primary vote-btn" data-id="${candidate._id}" data-name="${candidate.name}" data-party="${candidate.party}">
          Vote
        </button>
      `;
      document.getElementById('candidatesGrid').appendChild(card);
    });

    document.getElementById('loadingSpinner').style.display = 'none';
  } catch (error) {
    console.error('Load candidates error:', error);
    showError('Failed to load candidates: ' + error.message);
  }
}

// Setup candidate cards
function setupCandidateCards() {
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('vote-btn')) {
      e.preventDefault();
      selectedCandidateId = e.target.getAttribute('data-id');
      selectedCandidateName = e.target.getAttribute('data-name');
      selectedCandidateParty = e.target.getAttribute('data-party');

      // Highlight selected candidate
      document.querySelectorAll('.candidate-card').forEach((card) => {
        card.classList.remove('selected');
      });
      document.getElementById(`candidate-${selectedCandidateId}`).classList.add('selected');

      // Show confirmation modal
      document.getElementById('selectedCandidateName').textContent = selectedCandidateName;
      document.getElementById('selectedCandidateParty').textContent = selectedCandidateParty;
      showModal('confirmVoteModal');
    }
  });
}

// Setup confirm vote modal
function setupConfirmVoteModal() {
  const closeModalBtn = document.getElementById('closeModal');
  const cancelVoteBtn = document.getElementById('cancelVoteBtn');
  const confirmVoteBtn = document.getElementById('confirmVoteBtn');

  closeModalBtn.addEventListener('click', () => {
    hideModal('confirmVoteModal');
  });

  cancelVoteBtn.addEventListener('click', () => {
    hideModal('confirmVoteModal');
    selectedCandidateId = null;
    selectedCandidateName = null;
    selectedCandidateParty = null;
    document.querySelectorAll('.candidate-card').forEach((card) => {
      card.classList.remove('selected');
    });
  });

  confirmVoteBtn.addEventListener('click', async () => {
    await submitVote();
  });
}

// Submit vote
async function submitVote() {
  if (!selectedCandidateId) {
    showMessage('errorMessage', 'Please select a candidate', 'error');
    return;
  }

  const confirmBtn = document.getElementById('confirmVoteBtn');
  confirmBtn.disabled = true;
  confirmBtn.textContent = 'Submitting...';

  try {
    const response = await castVote(selectedCandidateId);

    if (response.success) {
      hideModal('confirmVoteModal');
      document.getElementById('votingOpen').style.display = 'none';
      document.getElementById('alreadyVoted').style.display = 'block';
      document.getElementById('voteStatus').textContent = 'Voted';
      document.getElementById('voteStatus').className = 'badge badge-voted';

      showMessage('successMessage', response.message, 'success', 5000);

      // Update user data
      const user = getUser();
      user.hasVoted = true;
      setUser(user);
    }
  } catch (error) {
    console.error('Vote submission error:', error);
    showMessage('errorMessage', error.message || 'Failed to submit vote. Please try again.', 'error');
  } finally {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirm Vote';
  }
}

// Show error
function showError(message) {
  const errorContainer = document.getElementById('errorContainer');
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
  document.getElementById('loadingSpinner').style.display = 'none';
}