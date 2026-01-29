# K IMPERIA — Complete Setup Guide

## 🎯 Overview

This system has **two parts**:

1. **Backend** (Node.js server) — handles submissions + sends emails
2. **Frontend** (HTML/CSS/JS) — the registration page users see

**For local testing:** Backend + Frontend run together on localhost  
**For production:** Backend deployed to server, Frontend deployed to IPFS

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd k-imperia-genesis-intake
npm install
```

### Step 2: Get SendGrid API Key

1. Sign up: https://app.sendgrid.com/signup
2. Verify your email address
3. Go to: Settings → API Keys → Create API Key
4. Name it: `K-IMPERIA-Production`
5. Select: **Full Access**
6. Copy the key (starts with `SG.`)

### Step 3: Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
SENDGRID_API_KEY=SG.your_actual_key_here
FROM_EMAIL=genesis@unykorn.io
INTERNAL_RECIPIENTS=kevan@unykorn.io,jimmy@unykorn.io,thomas@unykorn.io,isaac@unykorn.io
```

### Step 4: Start Server

```bash
npm start
```

You'll see:

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

### Step 5: Test

1. Open: `http://localhost:3000`
2. Fill out form
3. Submit
4. Check emails (registrant + internal team)

---

## 📧 SendGrid Configuration

### Verify Sender Email (Important!)

SendGrid requires sender verification to prevent spam.

**Option 1: Single Sender Verification** (fastest)

1. Go to: Settings → Sender Authentication → Single Sender Verification
2. Add: `genesis@unykorn.io`
3. Check your email and click verify link

**Option 2: Domain Authentication** (production recommended)

1. Go to: Settings → Sender Authentication → Authenticate Your Domain
2. Follow DNS configuration steps for `unykorn.io`
3. Wait for DNS propagation (5-60 minutes)

### Test Email Delivery

SendGrid dashboard shows:

- Emails sent
- Delivery status
- Bounce/spam reports
- Open rates (if tracking enabled)

---

## 🌐 Production Deployment

### Backend Deployment Options

#### Option A: Heroku (Easiest)

```bash
# Install Heroku CLI
heroku create k-imperia-backend

# Set environment variables
heroku config:set SENDGRID_API_KEY=SG.xxx
heroku config:set FROM_EMAIL=genesis@unykorn.io
heroku config:set INTERNAL_RECIPIENTS=kevan@unykorn.io,jimmy@unykorn.io,thomas@unykorn.io,isaac@unykorn.io

# Deploy
git push heroku main

# Get backend URL
heroku open
```

Backend URL: `https://k-imperia-backend.herokuapp.com`

#### Option B: Vercel (Serverless)

```bash
npm install -g vercel
vercel
```

Add environment variables in Vercel dashboard.

#### Option C: VPS (DigitalOcean, AWS, etc.)

```bash
# SSH into server
ssh user@your-server.com

# Clone repo
git clone <repo-url>
cd k-imperia-genesis-intake

# Install dependencies
npm install

# Set up environment
nano .env  # Add your values

# Install PM2 for process management
npm install -g pm2

# Start server
pm2 start server.js --name k-imperia

# Save PM2 config
pm2 save
pm2 startup
```

Configure nginx reverse proxy + SSL certificate (Let's Encrypt).

---

### Frontend Deployment (IPFS)

Once backend is deployed:

```bash
# Set backend URL
export BACKEND_URL=https://k-imperia-backend.herokuapp.com  # Your actual backend URL

# Deploy to IPFS
bash deploy-ipfs.sh  # macOS/Linux
.\deploy-ipfs.ps1    # Windows
```

You'll get:

```
📍 CID: QmXxx...
🌐 https://ipfs.io/ipfs/QmXxx.../index.html
```

---

## 🔐 Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `SENDGRID_API_KEY` | ✅ Yes | SendGrid API key | `SG.xxx` |
| `FROM_EMAIL` | ✅ Yes | Sender email address | `genesis@unykorn.io` |
| `FROM_NAME` | No | Sender display name | `K IMPERIA Genesis` |
| `INTERNAL_RECIPIENTS` | ✅ Yes | Team email addresses (comma-separated) | `kevan@unykorn.io,jimmy@unykorn.io` |
| `PORT` | No | Server port | `3000` |
| `NODE_ENV` | No | Environment | `production` |
| `ALLOWED_ORIGINS` | No | CORS origins | `https://ipfs.io` |

---

## 🧪 Testing Checklist

### Local Testing

- [ ] Server starts without errors
- [ ] Frontend loads at localhost
- [ ] Form validation works (required fields)
- [ ] Submission creates hash correctly
- [ ] Registrant email received
- [ ] Internal notification received (all team members)
- [ ] Email content looks correct
- [ ] Status message displays on form

### Production Testing

- [ ] Backend health check: `GET /health`
- [ ] CORS allows IPFS origins
- [ ] HTTPS enabled
- [ ] SendGrid domain verified
- [ ] Emails don't go to spam
- [ ] IPFS page loads via gateway
- [ ] Form submits to production backend
- [ ] Rate limiting configured (if needed)

---

## 🐛 Troubleshooting

### "SENDGRID_API_KEY not set"

- Check `.env` file exists
- Verify no extra spaces in `.env`
- Restart server after editing `.env`

### Emails not sending

- Verify SendGrid API key is valid
- Check sender email is verified in SendGrid
- Look at SendGrid Activity Feed for errors
- Check server logs for error messages

### CORS errors

- Add IPFS gateway to `ALLOWED_ORIGINS`
- Example: `https://ipfs.io,https://gateway.pinata.cloud`

### Form not submitting

- Check backend URL in `k-imperia.js`
- Verify backend is running: `curl http://your-backend/health`
- Check browser console for errors

### IPFS deployment fails

- Check IPFS daemon is running: `ipfs daemon`
- Or use Pinata/Web3.Storage instead

---

## 📊 Monitoring

### Email Delivery (SendGrid Dashboard)

- Go to: Activity Feed
- See all sent emails
- Check delivery status
- View bounce/spam reports

### Backend Logs

**Local:**
```bash
# Logs appear in terminal where you ran `npm start`
```

**Heroku:**
```bash
heroku logs --tail
```

**PM2:**
```bash
pm2 logs k-imperia
```

### Submission Data

Currently stored in localStorage (frontend only).

**Next step:** Add database storage (see README.md for options)

---

## 🔄 Update Deployment

### Backend Update

```bash
git pull
npm install
pm2 restart k-imperia  # Or redeploy to Heroku/Vercel
```

### Frontend Update

```bash
git pull
bash deploy-ipfs.sh  # Deploy new CID
# Update DNS or share new gateway link
```

---

## 🎓 Next Steps

Once this is working:

1. **Add database storage** (Supabase, Firebase, PostgreSQL)
2. **Build admin dashboard** (view/approve submissions)
3. **Add rate limiting** (prevent spam)
4. **Set up monitoring** (Sentry, LogRocket)
5. **XRPL integration** (trustlines + issuance)

---

## 📞 Support

- SendGrid docs: https://docs.sendgrid.com
- IPFS docs: https://docs.ipfs.tech
- Node.js docs: https://nodejs.org/docs

---

**K IMPERIA is operational.** 🎯
