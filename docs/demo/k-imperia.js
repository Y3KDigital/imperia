/**
 * K IMPERIA — Genesis Allocation Registration
 * Client-side form logic + referral mechanics
 *
 * This file is a copy for GitHub Pages publishing under /docs.
 */

// This placeholder is stamped at deploy time (see deploy-ipfs scripts)
const SUPABASE_FUNCTIONS_BASE = (window.K_IMPERIA_FUNCTIONS_BASE || '__SUPABASE_FUNCTIONS_BASE__').trim();

function isSupabaseFunctionsConfigured() {
  return Boolean(SUPABASE_FUNCTIONS_BASE) && !SUPABASE_FUNCTIONS_BASE.includes('__SUPABASE_FUNCTIONS_BASE__');
}

function isGitHubPages() {
  return window.location.hostname.endsWith('github.io');
}

function getSubmitEndpoint() {
  // If the placeholder wasn't replaced, fall back to local dev API
  if (!SUPABASE_FUNCTIONS_BASE || SUPABASE_FUNCTIONS_BASE.includes('__SUPABASE_FUNCTIONS_BASE__')) {
    return '/api/submit';
  }
  return `${SUPABASE_FUNCTIONS_BASE.replace(/\/$/, '')}/submit-intake`;
}

// Generate SHA-256 hash for submission ID
async function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Extract referral parameter from URL
function getReferralCode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || '';
}

// Generate unique referral ID (8-char alphanumeric)
function generateReferralId(email, timestamp) {
  const combined = email + timestamp;
  const hash = Array.from(combined)
    .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  return Math.abs(hash).toString(36).toUpperCase().substring(0, 8).padEnd(8, '0');
}

// Format submission data
function formatSubmissionData(formData) {
  const timestamp = new Date().toISOString();
  const email = String(formData.get('email') || '').trim();

  return {
    name: String(formData.get('name') || '').trim(),
    email,
    organization: String(formData.get('organization') || '').trim(),
    jurisdiction: String(formData.get('jurisdiction') || '').trim(),
    wallet: String(formData.get('wallet') || '').trim(),
    role: String(formData.get('role') || '').trim(),
    metal: String(formData.get('metal') || '').trim(),
    unit: String(formData.get('unit') || '').trim(),
    proposed_weight: parseFloat(String(formData.get('weight') || '0')),
    intended_use: String(formData.get('intended_use') || 'Undecided').trim(),
    timestamp,
    status: 'PENDING',
    referral_id: generateReferralId(email, timestamp),
    referred_by: getReferralCode(),
    referral_count: 0
  };
}

// Display status message
function showStatus(message, type = 'success') {
  const statusEl = document.getElementById('status');
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `visible ${type}`;
  statusEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Show personalized referral page after successful registration
function showReferralPage(referralId, name) {
  const baseUrl = window.location.origin + window.location.pathname;
  const referralUrl = `${baseUrl}?ref=${referralId}`;

  document.querySelector('.content').innerHTML = `
    <div class="referral-success">
      <h2>✅ Registration Confirmed</h2>
      <p>Thank you, ${escapeHtml(name)}. Your Genesis allocation signal has been received.</p>

      <div class="referral-box">
        <h3>Share Your Link</h3>
        <p>Share your unique referral link (non-promotional, informational):</p>

        <div class="referral-link-box">
          <code id="referralLink">${referralUrl}</code>
          <button onclick="copyReferralLink()">Copy Link</button>
        </div>

        <div class="qr-section">
          <p><strong>Your QR Code:</strong></p>
          <div id="qrcode"></div>
          <button onclick="downloadQR()">Download QR Code</button>
        </div>

        <div class="share-buttons">
          <button onclick="shareTwitter()">Share on X</button>
          <button onclick="shareFacebook()">Share on Facebook</button>
          <button onclick="shareEmail()">Share via Email</button>
        </div>

        <p class="referral-disclaimer">
          <strong>Important:</strong> Referral activity does not guarantee eligibility, allocation, acceptance, or issuance.
        </p>
      </div>

      <p class="email-notice">
        If email is enabled, a receipt will be sent to your email address.
      </p>
    </div>
  `;

  generateQRCode(referralUrl);
}

// Generate QR code using qrcode.js library (loaded via CDN)
function generateQRCode(url) {
  const qrContainer = document.getElementById('qrcode');
  new QRCode(qrContainer, {
    text: url,
    width: 256,
    height: 256,
    colorDark: '#c9a24d',
    colorLight: '#0b0b0d',
    correctLevel: QRCode.CorrectLevel.H
  });
}

// Copy referral link to clipboard
function copyReferralLink() {
  const linkEl = document.getElementById('referralLink');
  const link = linkEl.textContent;
  navigator.clipboard.writeText(link).then(() => {
    alert('✅ Referral link copied to clipboard!');
  });
}

// Download QR code as image
function downloadQR() {
  const canvas = document.querySelector('#qrcode canvas');
  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'k-imperia-genesis-qr.png';
  link.href = url;
  link.click();
}

// Social sharing functions
function shareTwitter() {
  const text = 'K IMPERIA — Genesis allocation registration (non-binding). Register your allocation signal here:';
  const url = document.getElementById('referralLink').textContent;
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
}

function shareFacebook() {
  const url = document.getElementById('referralLink').textContent;
  window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
}

function shareEmail() {
  const subject = 'K IMPERIA Genesis Allocation';
  const body = `K IMPERIA — Genesis allocation registration (non-binding).\n\nRegister using this link:\n${document.getElementById('referralLink').textContent}\n\nImportant: This is not an offer, not a purchase agreement, and does not guarantee allocation or issuance.`;
  window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function escapeHtml(str) {
  return String(str)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

// Form submission handler
document.getElementById('intakeForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  try {
    if (!isSupabaseFunctionsConfigured() && isGitHubPages()) {
      showStatus(
        'Demo mode (GitHub Pages): submissions are disabled until SUPABASE_FUNCTIONS_BASE is configured. ' +
        'Set window.K_IMPERIA_FUNCTIONS_BASE in index.html (or publish via the IPFS deploy script) to point at your Supabase Functions URL.',
        'error'
      );
      return;
    }

    const formData = new FormData(e.target);
    const data = formatSubmissionData(formData);

    // Generate deterministic submission ID
    const hash = await sha256(JSON.stringify(data));
    data.submission_id = hash;

    const endpoint = getSubmitEndpoint();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      let details = '';
      try {
        const err = await response.json();
        details = err?.error || err?.message || '';
      } catch {
        details = '';
      }
      throw new Error(details || `Submission failed (${response.status})`);
    }

    // Prefer referral page over status block
    showReferralPage(data.referral_id, data.name);

    // Reset form (in case user navigates back)
    e.target.reset();
  } catch (error) {
    console.error('Submission error:', error);
    showStatus(
      `Submission failed. ${error?.message ? error.message : 'Please try again.'}`,
      'error'
    );
  }
});

// Show referral info if present in URL
window.addEventListener('DOMContentLoaded', () => {
  const referredBy = getReferralCode();
  if (referredBy) {
    const form = document.getElementById('intakeForm');
    const notice = document.createElement('div');
    notice.className = 'referral-notice';
    notice.innerHTML = `<p>✨ You were referred by: <strong>${referredBy}</strong></p>`;
    form.insertBefore(notice, form.firstChild);
  }
});
