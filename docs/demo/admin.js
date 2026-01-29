/**
 * K IMPERIA — Admin Panel Frontend
 * Genesis Command Center
 *
 * This file is a copy for GitHub Pages publishing under /docs.
 */

// This placeholder is stamped at deploy time (see deploy-ipfs scripts)
const SUPABASE_FUNCTIONS_BASE = (window.K_IMPERIA_FUNCTIONS_BASE || '__SUPABASE_FUNCTIONS_BASE__').trim();
const ADMIN_API_BASE = SUPABASE_FUNCTIONS_BASE && !SUPABASE_FUNCTIONS_BASE.includes('__SUPABASE_FUNCTIONS_BASE__')
  ? `${SUPABASE_FUNCTIONS_BASE.replace(/\/$/, '')}/admin-api`
  : `${window.location.origin}/api/admin`;

function isGitHubPages() {
  return window.location.hostname.endsWith('github.io');
}

function isSupabaseFunctionsConfigured() {
  return Boolean(SUPABASE_FUNCTIONS_BASE) && !SUPABASE_FUNCTIONS_BASE.includes('__SUPABASE_FUNCTIONS_BASE__');
}

const ADMIN_TOKEN = localStorage.getItem('k_imperia_admin_token') || '';

// State
let submissions = [];
let stats = {};
let leaderboard = [];

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  if (!isSupabaseFunctionsConfigured() && isGitHubPages()) {
    document.body.innerHTML = `
      <div style="max-width: 900px; margin: 0 auto; padding: 64px 20px; color: #e6e6e6; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;">
        <h1 style="color: #c9a24d; margin-bottom: 12px;">Admin Demo Mode</h1>
        <p style="color: #b0b0b0; line-height: 1.5;">
          This Admin Command Center is running from GitHub Pages. Admin API calls are disabled until a Supabase Functions base URL is configured.
        </p>
        <p style="color: #b0b0b0; line-height: 1.5;">
          Set <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">window.K_IMPERIA_FUNCTIONS_BASE</span>
          in <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">docs/demo/admin.html</span>
          to point at:
        </p>
        <div style="background: #0b0b0d; border: 1px solid #2a2a2f; padding: 12px 14px; border-radius: 10px; color: #e6e6e6; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;">
          https://&lt;PROJECT_REF&gt;.supabase.co/functions/v1
        </div>
        <p style="margin-top: 16px; color: #b0b0b0;">
          Back to portal: <a href="../" style="color:#c9a24d; text-decoration:none;">/docs</a>
        </p>
      </div>
    `;
    return;
  }

  // Check for admin token
  if (!ADMIN_TOKEN) {
    promptForToken();
  }

  // Load data
  await loadAllData();

  // Event listeners
  document.getElementById('sortBy').addEventListener('change', renderTable);
  document.getElementById('refreshBtn').addEventListener('click', loadAllData);
});

// Prompt for admin token
function promptForToken() {
  const token = prompt('Enter admin access token:');
  if (token) {
    localStorage.setItem('k_imperia_admin_token', token);
    window.location.reload();
  } else {
    document.body.innerHTML = '<div style="text-align: center; padding: 100px; color: #808080;">Access denied. Refresh to try again.</div>';
  }
}

// Load all data
async function loadAllData() {
  try {
    showLoading(true);

    // Fetch in parallel
    const [pendingRes, statsRes, leaderboardRes] = await Promise.all([
      fetchAPI('pending'),
      fetchAPI('stats'),
      fetchAPI('leaderboard')
    ]);

    submissions = pendingRes.data || [];
    stats = statsRes.data || {};
    leaderboard = leaderboardRes.data || [];

    renderStats();
    renderTable();
    renderLeaderboard();

    showLoading(false);
  } catch (error) {
    showError(error.message);
  }
}

// Fetch with auth
async function fetchAPI(endpoint) {
  const response = await fetch(`${ADMIN_API_BASE}/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${ADMIN_TOKEN}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem('k_imperia_admin_token');
      promptForToken();
      throw new Error('Unauthorized');
    }
    throw new Error(`API error: ${response.status}`);
  }

  return response.json();
}

// Render stats strip
function renderStats() {
  document.getElementById('totalSubmissions').textContent = stats.total || 0;
  document.getElementById('totalGold').textContent = formatWeight(stats.total_weight_gold);
  document.getElementById('totalSilver').textContent = formatWeight(stats.total_weight_silver);

  const referralRate = stats.total > 0
    ? Math.round((submissions.filter(s => s.referred_by).length / stats.total) * 100)
    : 0;
  document.getElementById('referralRate').textContent = `${referralRate}%`;

  document.getElementById('jurisdictionCount').textContent = stats.unique_jurisdictions || 0;
}

// Render submissions table
function renderTable() {
  const sortBy = document.getElementById('sortBy').value;
  const sorted = [...submissions].sort((a, b) => {
    switch (sortBy) {
      case 'weight':
        return b.proposed_weight - a.proposed_weight;
      case 'referrals':
        return b.referral_count - a.referral_count;
      case 'timestamp':
      default:
        return new Date(b.timestamp) - new Date(a.timestamp);
    }
  });

  const tbody = document.getElementById('submissionsBody');
  const table = document.getElementById('submissionsTable');
  const emptyState = document.getElementById('emptyState');

  if (sorted.length === 0) {
    table.style.display = 'none';
    emptyState.style.display = 'block';
    return;
  }

  table.style.display = 'table';
  emptyState.style.display = 'none';

  tbody.innerHTML = sorted.map(sub => `
    <tr>
      <td class="highlight">${escapeHtml(sub.name)}</td>
      <td>${escapeHtml(sub.role)}</td>
      <td>${escapeHtml(sub.metal)}</td>
      <td>${sub.proposed_weight} ${sub.unit}</td>
      <td>${escapeHtml(sub.jurisdiction)}</td>
      <td class="highlight">${sub.referral_count}</td>
      <td>${formatTimestamp(sub.timestamp)}</td>
      <td><button class="btn-view" onclick="viewDetails('${sub.submission_id}')">View</button></td>
    </tr>
  `).join('');
}

// Render leaderboard
function renderLeaderboard() {
  const container = document.getElementById('leaderboardContent');

  if (leaderboard.length === 0) {
    container.innerHTML = '<p style="color: #808080; text-align: center; padding: 20px;">No referral activity yet.</p>';
    return;
  }

  const top10 = leaderboard.slice(0, 10);

  container.innerHTML = `
    <ul class="leaderboard-list">
      ${top10.map((item, index) => `
        <li class="leaderboard-item">
          <div class="leaderboard-rank">#${index + 1}</div>
          <div class="leaderboard-name">${escapeHtml(item.name)}</div>
          <div class="leaderboard-count">${item.referral_count}</div>
        </li>
      `).join('')}
    </ul>
  `;
}

// View submission details
function viewDetails(submissionId) {
  const submission = submissions.find(s => s.submission_id === submissionId);
  if (!submission) return;

  const modalBody = document.getElementById('modalBody');

  modalBody.innerHTML = `
      <div class="detail-row">
        <div class="detail-label">Submission ID</div>
        <div class="detail-value mono">${submission.submission_id.substring(0, 16)}...</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Name</div>
        <div class="detail-value">${escapeHtml(submission.name)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Email</div>
        <div class="detail-value">${escapeHtml(submission.email)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Organization</div>
        <div class="detail-value">${escapeHtml(submission.organization || 'N/A')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Jurisdiction</div>
        <div class="detail-value">${escapeHtml(submission.jurisdiction)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Wallet</div>
        <div class="detail-value mono">${escapeHtml(submission.wallet || 'N/A')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Role</div>
        <div class="detail-value">${escapeHtml(submission.role)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Metal</div>
        <div class="detail-value">${escapeHtml(submission.metal)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Proposed Weight</div>
        <div class="detail-value">${submission.proposed_weight} ${escapeHtml(submission.unit)}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Intended Use</div>
        <div class="detail-value">${escapeHtml(submission.intended_use || 'N/A')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Referral ID</div>
        <div class="detail-value mono">${escapeHtml(submission.referral_id || 'N/A')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Referred By</div>
        <div class="detail-value mono">${escapeHtml(submission.referred_by || 'N/A')}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Referral Count</div>
        <div class="detail-value highlight">${submission.referral_count}</div>
      </div>
      <div class="detail-row">
        <div class="detail-label">Timestamp</div>
        <div class="detail-value">${formatTimestamp(submission.timestamp)}</div>
      </div>
  `;

  document.getElementById('detailModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('detailModal').style.display = 'none';
}

function showLoading(isLoading) {
  document.getElementById('loadingState').style.display = isLoading ? 'block' : 'none';
  document.getElementById('errorState').style.display = 'none';
}

function showError(message) {
  document.getElementById('loadingState').style.display = 'none';
  const errorEl = document.getElementById('errorState');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

function formatWeight(value) {
  if (value === null || value === undefined) return '—';
  const num = Number(value);
  if (Number.isNaN(num)) return '—';
  return num.toFixed(2);
}

function formatTimestamp(timestamp) {
  try {
    return new Date(timestamp).toLocaleString();
  } catch {
    return String(timestamp || '');
  }
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Close modal on background click
window.addEventListener('click', (e) => {
  const modal = document.getElementById('detailModal');
  if (e.target === modal) {
    closeModal();
  }
});
