/**
 * K IMPERIA — Email Service
 * SendGrid integration for Genesis allocation notifications
 */

const sgMail = require('@sendgrid/mail');

// Initialize SendGrid with API key from environment
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Email configuration
const config = {
  from: {
    email: process.env.FROM_EMAIL || 'genesis@unykorn.io',
    name: process.env.FROM_NAME || 'K IMPERIA Genesis'
  },
  internal: process.env.INTERNAL_RECIPIENTS?.split(',') || []
};

/**
 * Send confirmation email to registrant
 */
async function sendRegistrantConfirmation(data) {
  const submissionIdShort = data.submission_id.substring(0, 16);
  const baseUrl = process.env.BASE_URL || 'https://ipfs.io/ipfs/YOUR_CID';
  const referralUrl = `${baseUrl}?ref=${data.referral_id}`;
  
  const msg = {
    to: data.email,
    from: config.from,
    subject: 'K IMPERIA — Genesis Registration Confirmed',
    text: `
K IMPERIA — Genesis Registration Confirmed

Your K IMPERIA Genesis Allocation registration has been received.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBMISSION DETAILS

Submission ID: ${submissionIdShort}...
Date: ${new Date(data.timestamp).toLocaleString('en-US', { 
  dateStyle: 'long', 
  timeStyle: 'short',
  timeZone: 'UTC'
})} UTC
Metal: ${data.metal}
Proposed Weight: ${data.proposed_weight} ${data.unit}
Intended Use: ${data.intended_use}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

YOUR REFERRAL LINK

Share K IMPERIA with your network:
${referralUrl}

Anyone who registers through your link will be recorded as your referral.
Early referrers may receive priority allocation consideration.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

IMPORTANT REMINDERS

• This submission is non-binding
• No price, yield, or redemption is implied
• Allocation acceptance is discretionary
• This is not an investment contract

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT STEPS

You will be contacted directly if selected for the next phase of K IMPERIA Genesis issuance.

No further action is required at this time.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

K IMPERIA is operated by UNYKORN
Imperial-grade, weight-referenced settlement infrastructure on XRPL

This is not an offer to sell securities or investment products.
    `.trim()
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Registrant confirmation sent to: ${data.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send registrant confirmation:', error.message);
    throw error;
  }
}

/**
 * Send internal notification to UNYKORN team
 */
async function sendInternalNotification(data) {
  if (!config.internal.length) {
    console.warn('⚠️  No internal recipients configured');
    return { success: false, reason: 'No recipients' };
  }

  const submissionIdShort = data.submission_id.substring(0, 8);
  
  const msg = {
    to: config.internal,
    from: {
      email: process.env.FROM_EMAIL || 'system@unykorn.io',
      name: 'K IMPERIA System'
    },
    subject: `K IMPERIA — New Genesis Allocation [${submissionIdShort}]`,
    text: `
New K IMPERIA Genesis Allocation Registration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGISTRANT INFORMATION

Name: ${data.name}
Email: ${data.email}
Organization: ${data.organization || 'N/A'}
Jurisdiction: ${data.jurisdiction}
REFERRAL TRACKING

Referral ID: ${data.referral_id}
Referred By: ${data.referred_by || 'Direct signup (no referral)'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Role: ${data.role}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALLOCATION SIGNAL

Metal: ${data.metal}
Weight: ${data.proposed_weight} ${data.unit}
Intended Use: ${data.intended_use}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TECHNICAL DETAILS

Submission ID: ${data.submission_id}
Timestamp: ${data.timestamp}
Wallet: ${data.wallet || 'Not provided'}
Status: PENDING

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTION REQUIRED

Review this allocation in the K IMPERIA back office.

Status options:
• APPROVED — proceed with issuance cohort
• DEFERRED — hold for future phase
• REJECTED — decline allocation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

K IMPERIA Genesis System
    `.trim()
  };

  try {
    await sgMail.send(msg);
    console.log(`✅ Internal notification sent to: ${config.internal.join(', ')}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to send internal notification:', error.message);
    throw error;
  }
}

/**
 * Send both emails for a new submission
 */
async function sendAllNotifications(data) {
  const results = {
    registrant: false,
    internal: false,
    errors: []
  };

  try {
    await sendRegistrantConfirmation(data);
    results.registrant = true;
  } catch (error) {
    results.errors.push({ type: 'registrant', error: error.message });
  }

  try {
    await sendInternalNotification(data);
    results.internal = true;
  } catch (error) {
    results.errors.push({ type: 'internal', error: error.message });
  }

  return results;
}

module.exports = {
  sendRegistrantConfirmation,
  sendInternalNotification,
  sendAllNotifications
};
