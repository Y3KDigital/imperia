# K IMPERIA — Supabase Setup Guide

## 🎯 Overview

This guide walks you through setting up Supabase as the backend database for K IMPERIA Genesis Intake.

**What Supabase Provides:**
- PostgreSQL database (institutional-grade, SQL-queryable)
- Built-in REST API (no backend code needed for reads)
- Real-time subscriptions (for live dashboard updates)
- Row-level security (compliance-friendly)
- Built-in auth (for admin access)
- Free tier: 500MB database, 2GB bandwidth

---

## 🚀 Step 1: Create Supabase Project

### 1.1 Sign Up

1. Go to: https://supabase.com
2. Sign up with GitHub or email
3. Verify your email

### 1.2 Create New Project

1. Click "New Project"
2. Project Name: `k-imperia-genesis`
3. Database Password: **Save this securely**
4. Region: Choose closest to your users (e.g., `us-east-1`)
5. Click "Create new project"
6. Wait 2-3 minutes for provisioning

---

## 🔑 Step 2: Get API Credentials

### 2.1 Find Your Credentials

1. Go to: Settings → API
2. Copy these values:

```
Project URL: https://xxxxx.supabase.co
anon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 2.2 Update .env File

```bash
cd C:\k-imperia-genesis-intake
cp .env.example .env
notepad .env
```

Add your Supabase credentials:

```env
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Important:**
- `SUPABASE_ANON_KEY` — Safe for frontend (read-only)
- `SUPABASE_SERVICE_KEY` — Admin access (keep secret, backend only)

---

## 📊 Step 3: Create Database Schema

### 3.1 Open SQL Editor

1. In Supabase dashboard, go to: SQL Editor
2. Click "New query"

### 3.2 Run Schema Script

Copy the entire contents of `supabase-schema.sql` and paste into SQL editor.

Click **"Run"**.

This creates:
- `submissions` table
- Indexes for performance
- Constraints for data integrity
- Triggers for auto-updates
- Views for admin queries
- Helper functions

### 3.3 Verify Tables

1. Go to: Table Editor
2. You should see:
   - `submissions` (main table)
   - `pending_submissions` (view)
   - `referral_leaderboard` (view)
   - `referral_chains` (view)

---

## 🧪 Step 4: Test Database Connection

### 4.1 Install Dependencies

```powershell
cd C:\k-imperia-genesis-intake
npm install
```

This installs `@supabase/supabase-js` package.

### 4.2 Test Connection

Start the server:

```powershell
npm start
```

You should see:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  K IMPERIA — Genesis Intake Server
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  🚀 Server running on port 3000
  📧 Email provider: SendGrid
  🌐 Frontend: http://localhost:3000
  
  Ready to receive Genesis allocations.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 4.3 Submit Test Registration

1. Open: `http://localhost:3000`
2. Fill out form
3. Submit

Check terminal logs:

```
📬 Processing submission: a3f5b8c1...
   Referral ID: K7M2P9Q1
✅ Submission stored in database: uuid-here
✅ Registrant confirmation sent to: test@example.com
✅ Internal notification sent to: team@unykorn.io
```

---

## 🔍 Step 5: Verify Data in Supabase

### 5.1 Check Table Editor

1. Go to: Table Editor → submissions
2. You should see your test submission
3. Note the auto-generated fields:
   - `id` (UUID)
   - `created_at` (timestamp)
   - `referral_count` (starts at 0)

### 5.2 Test Referral Tracking

1. Copy the `referral_id` from your first submission (e.g., `K7M2P9Q1`)
2. Visit: `http://localhost:3000?ref=K7M2P9Q1`
3. Register again with different email
4. Check Supabase:
   - New submission has `referred_by = K7M2P9Q1`
   - First submission's `referral_count` incremented to 1

This confirms the trigger is working.

---

## 📊 Step 6: Test Admin Endpoints

### 6.1 Get Pending Submissions

```bash
curl http://localhost:3000/api/admin/pending
```

Returns JSON array of all pending submissions.

### 6.2 Get Statistics

```bash
curl http://localhost:3000/api/admin/stats
```

Returns:

```json
{
  "success": true,
  "data": {
    "total": 5,
    "pending": 5,
    "approved": 0,
    "total_weight_gold": 100.5,
    "total_weight_silver": 250.75,
    "unique_jurisdictions": 3
  }
}
```

### 6.3 Get Referral Leaderboard (Internal)

```bash
curl http://localhost:3000/api/admin/leaderboard
```

Returns top referrers by count.

---

## 🔐 Step 7: Configure Row-Level Security

### 7.1 Understanding RLS Policies

The schema includes these policies:

1. **Public can insert** → Allows registration form to submit
2. **Authenticated read** → Only logged-in users see data
3. **Authenticated update** → Only logged-in users can change status

### 7.2 Test Public Insert

Registration form should work without auth.

### 7.3 Test Protected Read

Try accessing admin endpoint from browser:

```
http://localhost:3000/api/admin/pending
```

Should return data (for now).

**Later:** Add authentication middleware to protect `/api/admin/*` routes.

---

## 🚀 Step 8: Production Deployment

### 8.1 Deploy Backend

Deploy `server.js` to:
- **Heroku** (easiest)
- **Railway** (fast)
- **Fly.io** (modern)
- **VPS** (full control)

Set environment variables:

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key
SENDGRID_API_KEY=SG.xxx
FROM_EMAIL=genesis@unykorn.io
INTERNAL_RECIPIENTS=team@unykorn.io
```

### 8.2 Deploy Frontend to IPFS

```powershell
$env:BACKEND_URL="https://your-backend.com"
.\deploy-ipfs.ps1
```

### 8.3 Update BASE_URL

In backend `.env`:

```env
BASE_URL=https://ipfs.io/ipfs/QmXxx.../index.html
```

This ensures referral links in emails are correct.

---

## 📊 Step 9: Monitor Database

### 9.1 Supabase Dashboard

Go to: Database → Tables → submissions

View:
- Real-time row count
- Recent submissions
- Storage usage

### 9.2 Run Custom Queries

SQL Editor → New query:

```sql
-- Get today's submissions
SELECT COUNT(*) 
FROM submissions 
WHERE DATE(timestamp) = CURRENT_DATE;

-- Top referrers
SELECT name, email, referral_count 
FROM submissions 
WHERE referral_count > 0 
ORDER BY referral_count DESC 
LIMIT 10;

-- Referral conversion rate
SELECT 
  COUNT(*) FILTER (WHERE referred_by IS NOT NULL)::FLOAT / COUNT(*) * 100 as conversion_rate
FROM submissions;
```

---

## 🔧 Step 10: Backup & Maintenance

### 10.1 Automatic Backups

Supabase automatically backs up your database daily (on paid plans).

Free tier: Manual backups only.

### 10.2 Manual Backup

```bash
# Export all data
curl "https://xxxxx.supabase.co/rest/v1/submissions?select=*" \
  -H "apikey: YOUR_ANON_KEY" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  > backup.json
```

### 10.3 Database Migrations

When schema changes:

1. Create new SQL file: `migrations/001_add_field.sql`
2. Run in SQL Editor
3. Document in version control

---

## 📈 Scaling Considerations

### When to Upgrade Supabase Plan

**Free Tier Limits:**
- 500 MB database
- 2 GB bandwidth/month
- 50k monthly active users

**Upgrade when:**
- Database > 400 MB
- Expecting >10k registrations
- Need daily backups

**Pro Plan ($25/mo):**
- 8 GB database
- 50 GB bandwidth
- Daily backups
- Custom domains

---

## 🐛 Troubleshooting

### "Failed to store submission"

Check:
- Supabase URL correct in `.env`
- Service key has admin access
- RLS policies allow insert
- All required fields present

### "Referral count not incrementing"

Check:
- Trigger created successfully
- `referred_by` field populated
- Referral ID exists in database

### "Email sent but not marked in DB"

Check:
- `markEmailSent()` called after email
- Submission ID matches exactly
- Database connection stable

---

## 🎯 Next Steps

Once Supabase is working:

1. **Add admin authentication** (Step B)
2. **Build admin dashboard** (Step C)
3. **Map to XRPL issuance** (Step D)

---

## 📞 Support

- Supabase Docs: https://supabase.com/docs
- SQL Reference: https://www.postgresql.org/docs/
- Supabase Discord: https://discord.supabase.com

---

**Your Genesis intake now has institutional-grade persistence.** ✅
