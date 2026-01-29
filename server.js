/**
 * K IMPERIA — Genesis Intake Backend Server
 * Handles form submissions and email notifications
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { sendAllNotifications } = require('./email');
const { 
  storeSubmission, 
  markEmailSent, 
  getPendingSubmissions,
  getSubmissionStats,
  getReferralLeaderboard
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
app.use(bodyParser.json());
app.use(express.static('public'));

// Simple admin auth middleware
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-this-in-production';

function requireAdminAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  next();
}

// Serve admin panel
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/admin.html');
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'operational', service: 'k-imperia-genesis' });
});

// Genesis allocation submission endpoint
app.post('/api/submit', async (req, res) => {
  try {
    const data = req.body;

    // Validate required fields
    const required = ['submission_id', 'timestamp', 'name', 'email', 'jurisdiction', 'role', 'metal', 'unit', 'proposed_weight', 'referral_id'];
    const missing = required.filter(field => !data[field]);
    
    if (missing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields', 
        missing 
      });
    }

    console.log(`📬 Processing submission: ${data.submission_id.substring(0, 8)}...`);
    console.log(`   Referral ID: ${data.referral_id}`);
    if (data.referred_by) {
      console.log(`   Referred by: ${data.referred_by}`);
    }

    // Store in database (referral count auto-incremented by trigger)
    const dbResult = await storeSubmission(data);
    
    // Send email notifications
    const emailResults = await sendAllNotifications(data);

    // Update email sent status in database
    if (emailResults.registrant) {
      await markEmailSent(data.submission_id, 'registrant');
    }
    if (emailResults.internal) {
      await markEmailSent(data.submission_id, 'internal');
    }

    // Return response
    res.json({
      success: true,
      submission_id: data.submission_id,
      referral_id: data.referral_id,
      email_sent: emailResults.registrant,
      internal_notified: emailResults.internal,
      stored: dbResult.success,
      errors: emailResults.errors.length > 0 ? emailResults.errors : undefined
    });

  } catch (error) {
    console.error('❌ Submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Admin endpoints (authenticated access required)

// Get pending submissions
app.get('/api/admin/pending', requireAdminAuth, async (req, res) => {
  try {
    const submissions = await getPendingSubmissions();
    res.json({ success: true, data: submissions });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get submission statistics
app.get('/api/admin/stats', requireAdminAuth, async (req, res) => {
  try {
    const stats = await getSubmissionStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get referral leaderboard (internal only)
app.get('/api/admin/leaderboard', requireAdminAuth, async (req, res) => {
  try {
    const leaderboard = await getReferralLeaderboard();
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  K IMPERIA — Genesis Intake Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🚀 Server running on port ${PORT}
  📧 Email provider: SendGrid
  🌐 Frontend: http://localhost:${PORT}
  
  Ready to receive Genesis allocations.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});
