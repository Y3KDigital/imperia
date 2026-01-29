# K IMPERIA — Admin Panel Documentation

## 🎯 Genesis Command Center

**Read-only operational surface for K IMPERIA Genesis intake.**

---

## 🔑 Access

### Local Development

```
http://localhost:3000/admin
```

### Production

```
https://your-backend.com/admin
```

---

## 🔐 Authentication

### Phase 1: Token-Based (Current)

Admin panel uses simple bearer token authentication.

**Setup:**

1. Set token in `.env`:
   ```env
   ADMIN_TOKEN=your_secure_random_token_here
   ```

2. Generate secure token:
   ```bash
   # Node.js
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   
   # PowerShell
   [Convert]::ToBase64String((1..32|%{Get-Random -Max 256}))
   ```

3. On first visit to `/admin`, enter token when prompted

4. Token stored in localStorage (browser-only)

**Security Notes:**

- Token only protects `/api/admin/*` endpoints
- Not suitable for public deployment
- Sufficient for internal/team use
- Consider IP allowlist for additional security

---

## 📊 What the Panel Shows

### Top Stats Strip

- **Total Submissions** — All registrations received
- **Gold Weight** — Combined gold allocation signals
- **Silver Weight** — Combined silver allocation signals
- **Referral Participation** — % of submissions that came via referral
- **Unique Jurisdictions** — Number of different countries/regions

### Pending Submissions Table

Columns:
- Name
- Role
- Metal
- Weight (with unit)
- Jurisdiction
- Referral count (how many they've referred)
- Timestamp
- View button (opens details modal)

**Sorting:**
- Timestamp (newest first) — default
- Weight (highest first)
- Referral count (most active)

### Referral Leaderboard (Internal)

Top 10 referrers by count.

**This is internal only** — never expose publicly.

---

## 🔍 Submission Details Modal

Click "View" on any submission to see full record:

- Complete identity information
- Wallet address (if provided)
- Allocation signal (metal, weight, intended use)
- Referral tracking (their ID, who referred them, how many they've referred)
- Submission hash (for verification)
- Timestamp

**No editing capabilities** — read-only by design.

---

## 🧭 Operational Use

### What This Panel Answers

✅ Who is registering?  
✅ What metals are in demand?  
✅ What weight levels are being signaled?  
✅ Which jurisdictions are represented?  
✅ Is referral growth organic?  
✅ Who are the network connectors?

### What This Panel Does NOT Do

❌ Approve/reject submissions  
❌ Change status  
❌ Modify data  
❌ Make issuance decisions  
❌ Show public-facing metrics

**This is intentional discipline.**

---

## 🎯 Decision-Making Guide

### Signals to Watch For

**Positive:**
- Consistent allocation weights (not random)
- Diverse jurisdictions
- Balanced metal preference
- Referrals from credible roles (e.g., dealers, partners)
- Organization names you recognize

**Cautionary:**
- Extreme outlier weights (could be testing)
- Single-jurisdiction dominance (concentration risk)
- Suspicious referral patterns (spam rings)
- Generic email domains (lack of institutional backing)

### When to Consider Genesis Issuance

Only when:
- Total demand exceeds minimum viable cohort
- Metals balance aligns with sourcing capacity
- Jurisdictional compliance is manageable
- Network quality is verifiable
- UNYKORN's operational readiness is confirmed

**A serious system must be able to say "not yet."**

---

## 📈 Refresh & Updates

### Manual Refresh

Click **"Refresh"** button to reload data.

### Auto-Refresh (Optional)

Not implemented yet to avoid unnecessary database load.

Can be added later if needed for monitoring.

---

## 🔒 Security Best Practices

### Current Setup

- Token-based auth (Phase 1)
- Bearer token in request headers
- No password storage
- LocalStorage persistence

### Recommended Production Setup

1. **Deploy admin panel separately** (different subdomain)
2. **Use Supabase Auth** (magic link)
3. **Add admin email allowlist** (in `.env`)
4. **Enable HTTPS only**
5. **Add IP allowlist** (firewall level)
6. **Log all admin access** (audit trail)

---

## 🛠️ Troubleshooting

### "Unauthorized" error

- Check `ADMIN_TOKEN` in `.env` matches entered token
- Verify backend server restarted after changing `.env`
- Clear browser localStorage and re-enter token

### "No pending submissions"

- Check Supabase connection
- Verify submissions table has data
- Check `status = 'PENDING'` filter in view

### Stats showing "—" or zeros

- Check API endpoint `/api/admin/stats` directly
- Verify Supabase function `get_submission_stats()` exists
- Check for database permissions issues

### Leaderboard empty

- Normal if no referrals yet
- Check `referral_count > 0` filter in database view
- Verify referral trigger is working on new submissions

---

## 📊 Exporting Data

### Via Browser (Quick)

In browser console:

```javascript
// Copy table data
copy(document.querySelector('#submissionsTable').innerText)
```

### Via API (Programmatic)

```bash
# Export pending submissions
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/pending > pending.json

# Export stats
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/admin/stats > stats.json
```

### Via Supabase (Direct)

```sql
-- Export to CSV
COPY (SELECT * FROM pending_submissions) TO '/tmp/pending.csv' CSV HEADER;
```

---

## 🔜 Phase 2 Features (Not Implemented Yet)

These will be added only after Phase 1 is operationally proven:

- [ ] Status change buttons (Approve/Defer/Reject)
- [ ] Bulk operations
- [ ] Notes/comments on submissions
- [ ] Email re-send capability
- [ ] Advanced filtering (by metal, role, jurisdiction)
- [ ] Export to CSV button
- [ ] Cohort builder (group approved submissions)
- [ ] XRPL integration preview

**Do not add these until the read-only panel has been used in real operations.**

---

## 📞 Support

- Main setup: [SETUP.md](SETUP.md)
- Database: [SUPABASE-SETUP.md](SUPABASE-SETUP.md)
- Referral system: [REFERRAL-SYSTEM.md](REFERRAL-SYSTEM.md)

---

**This panel exists to create clarity, not excitement.**

If looking at this data makes you calmer, it's working.  
If it creates anxiety, something needs adjustment.
