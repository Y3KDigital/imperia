/**
 * K IMPERIA — Supabase Database Client
 * Handles all database operations for Genesis allocation submissions
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client with service role key (for admin operations)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

/**
 * Store a new submission in the database
 */
async function storeSubmission(data) {
  try {
    const { data: submission, error } = await supabase
      .from('submissions')
      .insert([{
        submission_id: data.submission_id,
        timestamp: data.timestamp,
        name: data.name,
        email: data.email,
        organization: data.organization || null,
        jurisdiction: data.jurisdiction,
        wallet: data.wallet || null,
        role: data.role,
        metal: data.metal,
        unit: data.unit,
        proposed_weight: data.proposed_weight,
        intended_use: data.intended_use || 'Undecided',
        referral_id: data.referral_id,
        referred_by: data.referred_by || null,
        referral_count: 0,
        status: 'PENDING',
        email_sent: false,
        internal_notification_sent: false
      }])
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Submission stored in database: ${submission.id}`);
    return { success: true, submission };
  } catch (error) {
    console.error('❌ Failed to store submission:', error.message);
    throw error;
  }
}

/**
 * Update email sent status
 */
async function markEmailSent(submissionId, type = 'registrant') {
  try {
    const field = type === 'registrant' ? 'email_sent' : 'internal_notification_sent';
    const timestampField = type === 'registrant' ? 'email_sent_at' : null;
    
    const updateData = { [field]: true };
    if (timestampField) {
      updateData[timestampField] = new Date().toISOString();
    }

    const { error } = await supabase
      .from('submissions')
      .update(updateData)
      .eq('submission_id', submissionId);

    if (error) throw error;

    console.log(`✅ Email status updated: ${type}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Failed to update email status:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Get all pending submissions
 */
async function getPendingSubmissions() {
  try {
    const { data, error } = await supabase
      .from('pending_submissions')
      .select('*')
      .order('timestamp', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch pending submissions:', error.message);
    throw error;
  }
}

/**
 * Get submission by referral ID
 */
async function getSubmissionByReferralId(referralId) {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('referral_id', referralId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;
  } catch (error) {
    console.error('❌ Failed to fetch submission:', error.message);
    return null;
  }
}

/**
 * Update submission status
 */
async function updateSubmissionStatus(submissionId, status, reviewedBy, notes) {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .update({
        status,
        reviewed_by: reviewedBy,
        review_date: new Date().toISOString(),
        notes: notes || null
      })
      .eq('submission_id', submissionId)
      .select()
      .single();

    if (error) throw error;

    console.log(`✅ Submission status updated: ${status}`);
    return { success: true, submission: data };
  } catch (error) {
    console.error('❌ Failed to update submission status:', error.message);
    throw error;
  }
}

/**
 * Get referral leaderboard
 */
async function getReferralLeaderboard(limit = 100) {
  try {
    const { data, error } = await supabase
      .from('referral_leaderboard')
      .select('*')
      .limit(limit);

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch leaderboard:', error.message);
    throw error;
  }
}

/**
 * Get submission statistics
 */
async function getSubmissionStats() {
  try {
    const { data, error } = await supabase
      .rpc('get_submission_stats');

    if (error) throw error;
    return data[0]; // RPC returns array with single row
  } catch (error) {
    console.error('❌ Failed to fetch stats:', error.message);
    throw error;
  }
}

/**
 * Get referral stats for specific user
 */
async function getReferralStats(referralId) {
  try {
    const { data, error } = await supabase
      .rpc('get_referral_stats', { user_referral_id: referralId });

    if (error) throw error;
    return data[0]; // RPC returns array with single row
  } catch (error) {
    console.error('❌ Failed to fetch referral stats:', error.message);
    throw error;
  }
}

/**
 * Get referral chain for a user
 */
async function getReferralChain(referralId) {
  try {
    const { data, error } = await supabase
      .from('referral_chains')
      .select('*')
      .eq('referrer_id', referralId)
      .order('referred_at', { ascending: false });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('❌ Failed to fetch referral chain:', error.message);
    throw error;
  }
}

/**
 * Check if referral ID exists
 */
async function referralIdExists(referralId) {
  try {
    const { data, error } = await supabase
      .from('submissions')
      .select('referral_id')
      .eq('referral_id', referralId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  } catch (error) {
    console.error('❌ Failed to check referral ID:', error.message);
    return false;
  }
}

module.exports = {
  supabase,
  storeSubmission,
  markEmailSent,
  getPendingSubmissions,
  getSubmissionByReferralId,
  updateSubmissionStatus,
  getReferralLeaderboard,
  getSubmissionStats,
  getReferralStats,
  getReferralChain,
  referralIdExists
};
