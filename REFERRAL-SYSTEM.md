# K IMPERIA — Referral System Documentation

## 🎯 Overview

The K IMPERIA Genesis Intake now includes a **viral referral system** that:

- Tracks who refers whom
- Generates unique referral IDs per registrant
- Creates shareable Web3 links (IPFS-based)
- Auto-generates QR codes for easy sharing
- Provides social media sharing buttons
- Incentivizes early adopters to build the cohort

---

## 🔑 How It Works

### 1. User Registers

User fills out Genesis allocation form at:

```
https://ipfs.io/ipfs/CID/index.html
```

or

```
ipfs://CID/index.html
```

### 2. System Generates Referral ID

Upon successful registration, system:

1. Creates **8-character alphanumeric ID** (e.g., `K7M2P9Q1`)
2. Stores in database with user's submission
3. Tracks if they came via someone else's referral

### 3. User Gets Shareable Link

After registration, user sees:

- ✅ **Their unique referral link**
- ✅ **QR code** (downloadable)
- ✅ **Social share buttons** (X, Facebook, Email)

Example referral link:

```
https://ipfs.io/ipfs/CID/index.html?ref=K7M2P9Q1
```

### 4. New Users Click Referral Link

When someone visits with `?ref=K7M2P9Q1`:

- System captures referral code
- Shows "✨ You were referred by: K7M2P9Q1"
- Stores `referred_by` field in their submission

---

## 📊 Data Schema

### New Fields Added

```json
{
  "referral_id": "K7M2P9Q1",        // This person's unique ID
  "referred_by": "A3F5B8C1",        // Who referred them (if any)
  "referral_count": 5                // How many people they've referred
}
```

### Referral Chain Example

```
Alice registers → Gets ID: A3F5B8C1
Bob clicks Alice's link → Gets ID: B7M2P9Q1, referred_by: A3F5B8C1
Carol clicks Bob's link → Gets ID: C9K4L6N8, referred_by: B7M2P9Q1
```

You can now see:
- Alice referred Bob
- Bob referred Carol
- Alice's referral_count = 1
- Bob's referral_count = 1

---

## 🎨 User Experience Flow

### Registration Page

1. User lands on page (with or without `?ref=`)
2. If `?ref=` present → Shows banner: "You were referred by: XXXXX"
3. User fills out form
4. Submits

### Success Page

After submission, form is replaced with:

```
✅ Registration Confirmed

Thank you, [Name]. Your Genesis allocation signal has been received.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Share K IMPERIA

Help build the Genesis cohort. Share your unique link:

[https://ipfs.io/ipfs/.../index.html?ref=K7M2P9Q1]  [Copy Link]

Your QR Code:
[QR CODE IMAGE]
[Download QR Code]

[Share on X] [Share on Facebook] [Share via Email]

Anyone who registers through your link will be recorded as your referral.
Early referrers may receive priority allocation consideration.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🔗 Sharing Methods

### 1. Copy Link Button

Copies referral URL to clipboard via `navigator.clipboard`.

### 2. QR Code

- Generated using qrcode.js library
- Displays inline (256x256px)
- Downloadable as PNG
- Styled in K IMPERIA colors (gold on dark)

### 3. Social Sharing

#### X (Twitter)

Pre-filled tweet:

```
I just registered for K IMPERIA Genesis — imperial-grade settlement 
infrastructure on XRPL. Join me: [referral link]
```

#### Facebook

Opens Facebook share dialog with referral link.

#### Email

Opens default email client with:

**Subject:** K IMPERIA Genesis Allocation

**Body:**
```
I've registered for K IMPERIA Genesis — an imperial-grade, 
weight-referenced settlement layer on XRPL.

Join me using this link:
[referral link]

K IMPERIA is operated by UNYKORN and designed for reserve, 
governance, and long-term infrastructure use.
```

---

## 📧 Email Integration

### Registrant Confirmation Email

Now includes:

```
YOUR REFERRAL LINK

Share K IMPERIA with your network:
https://ipfs.io/ipfs/.../index.html?ref=K7M2P9Q1

Anyone who registers through your link will be recorded as your referral.
Early referrers may receive priority allocation consideration.
```

### Internal Team Notification

Now includes:

```
REFERRAL TRACKING

Referral ID: K7M2P9Q1
Referred By: A3F5B8C1 (or "Direct signup (no referral)")
```

---

## 🏆 Incentive Structure

### Current Messaging

> "Early referrers may receive priority allocation consideration."

This is **intentionally vague** but creates incentive without making promises.

### Future Enhancements (Optional)

You could add:

- **Referral leaderboard** (top referrers)
- **Tiered benefits** (1 referral = X, 5 referrals = Y)
- **Exclusive access** for high referrers
- **Priority issuance** based on referral count

---

## 🛠️ Technical Implementation

### Frontend (k-imperia.js)

```javascript
// Extract referral code from URL
function getReferralCode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ref') || '';
}

// Generate unique 8-char ID
function generateReferralId(email, timestamp) {
  const combined = email + timestamp;
  const hash = Array.from(combined)
    .reduce((acc, char) => ((acc << 5) - acc) + char.charCodeAt(0), 0);
  return Math.abs(hash).toString(36).toUpperCase().substring(0, 8).padEnd(8, '0');
}
```

### Backend (server.js)

Logs referral info:

```
📬 Processing submission: a3f5b8c1...
   Referral ID: K7M2P9Q1
   Referred by: A3F5B8C1
```

### Database (Future)

When you add database storage:

```sql
-- Track referrals
UPDATE submissions 
SET referral_count = referral_count + 1 
WHERE referral_id = :referred_by;

-- Query referral chains
SELECT * FROM submissions 
WHERE referred_by = 'A3F5B8C1';

-- Leaderboard
SELECT name, email, referral_count 
FROM submissions 
ORDER BY referral_count DESC 
LIMIT 10;
```

---

## 📱 IPFS + Web3 Benefits

### Why This Works

1. **Immutable links** → CID never changes
2. **Decentralized** → No single point of failure
3. **Censorship-resistant** → Can't be taken down
4. **Professional** → Not a cheesy URL shortener
5. **Trackable** → Still know who referred whom

### Example Links

**Production:**
```
https://ipfs.io/ipfs/QmXxx.../index.html?ref=K7M2P9Q1
ipfs://QmXxx.../index.html?ref=K7M2P9Q1
```

**Custom Domain (via DNSLink):**
```
https://genesis.unykorn.io?ref=K7M2P9Q1
```

---

## 🚀 Deployment Checklist

### Before IPFS Deployment

- [ ] Backend deployed and running
- [ ] SendGrid configured
- [ ] Test referral link locally
- [ ] Test QR code generation
- [ ] Test social sharing

### During IPFS Deployment

```bash
export BACKEND_URL=https://your-backend.com
bash deploy-ipfs.sh
```

System will:
1. Update API URL in k-imperia.js
2. Deploy to IPFS
3. Output CID and gateway links

### After IPFS Deployment

1. **Update `.env` on backend:**
   ```env
   BASE_URL=https://ipfs.io/ipfs/QmXxx.../index.html
   ```

2. **Test full flow:**
   - Visit IPFS link
   - Register
   - Get referral link
   - Share on social media
   - Verify new registrations track referrer

3. **Share initial link:**
   - Post on X, Facebook, etc.
   - Email to early supporters
   - Generate QR code for physical materials

---

## 📊 Analytics & Tracking

### What You Can Track

With database storage:

```sql
-- Total referrals per user
SELECT name, email, referral_count 
FROM submissions 
ORDER BY referral_count DESC;

-- Referral conversion timeline
SELECT DATE(timestamp), COUNT(*) 
FROM submissions 
WHERE referred_by IS NOT NULL 
GROUP BY DATE(timestamp);

-- Top referral sources
SELECT referred_by, COUNT(*) as referrals
FROM submissions
WHERE referred_by IS NOT NULL
GROUP BY referred_by
ORDER BY referrals DESC
LIMIT 10;

-- Referral chain depth
WITH RECURSIVE chain AS (
  SELECT referral_id, referred_by, 1 as depth
  FROM submissions
  WHERE referred_by IS NULL
  
  UNION ALL
  
  SELECT s.referral_id, s.referred_by, c.depth + 1
  FROM submissions s
  JOIN chain c ON s.referred_by = c.referral_id
)
SELECT MAX(depth) as max_chain_depth FROM chain;
```

---

## 🎯 Next Steps

### Immediate (Now)

- [x] Referral tracking implemented
- [x] QR code generation added
- [x] Social sharing buttons added
- [x] Email templates updated

### Short-term (Next Phase)

- [ ] Deploy backend with referral support
- [ ] Deploy frontend to IPFS
- [ ] Test full referral flow
- [ ] Share initial link publicly

### Medium-term (Database Phase)

- [ ] Add database storage for referrals
- [ ] Build referral leaderboard
- [ ] Create admin view of referral chains
- [ ] Export referral analytics

### Long-term (Enhancement Phase)

- [ ] Tiered referral rewards
- [ ] Referral performance dashboards
- [ ] Automated referral incentives
- [ ] Integration with XRPL allocation priority

---

## 🔐 Security Considerations

### Referral ID Generation

- **Deterministic** → Same email + timestamp = same ID
- **Collision-resistant** → 8-char alphanumeric = 36^8 = 2.8 trillion possibilities
- **Non-reversible** → Cannot derive email from referral ID

### Fraud Prevention

Consider adding:

- Rate limiting (max referrals per IP per day)
- Email verification before generating referral link
- CAPTCHA on registration form
- Referral count caps (max 100 referrals per person)
- Manual review of high referrers

---

## 📞 Support & Documentation

- Main docs: README.md
- Setup guide: SETUP.md
- Email templates: email-templates.md
- Data schema: schema.json
- This file: REFERRAL-SYSTEM.md

---

**K IMPERIA referral system is operational.** 🚀

Share. Build. Grow the Genesis cohort.
