# K IMPERIA Email Templates

## Registrant Confirmation Email

**From:** K IMPERIA Genesis <genesis@unykorn.io>  
**Subject:** K IMPERIA — Genesis Registration Confirmed

---

**Body:**

```
K IMPERIA — Genesis Registration Confirmed

Your K IMPERIA Genesis Allocation registration has been received.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SUBMISSION DETAILS

Submission ID: {{submission_id}}
Date: {{timestamp}}
Metal: {{metal}}
Proposed Weight: {{proposed_weight}} {{unit}}
Intended Use: {{intended_use}}

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
```

---

## Internal Team Notification

**To:** Kevan, Jimmy, Thomas, Isaac  
**From:** K IMPERIA System <system@unykorn.io>  
**Subject:** K IMPERIA — New Genesis Allocation [{{submission_id_short}}]

---

**Body:**

```
New K IMPERIA Genesis Allocation Registration

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REGISTRANT INFORMATION

Name: {{name}}
Email: {{email}}
Organization: {{organization}}
Jurisdiction: {{jurisdiction}}
Role: {{role}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALLOCATION SIGNAL

Metal: {{metal}}
Weight: {{proposed_weight}} {{unit}}
Intended Use: {{intended_use}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

TECHNICAL DETAILS

Submission ID: {{submission_id}}
Timestamp: {{timestamp}}
Wallet: {{wallet}}
Status: PENDING

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ACTION REQUIRED

Review this allocation in the K IMPERIA back office:
[Link to admin dashboard]

Status options:
• APPROVED — proceed with issuance cohort
• DEFERRED — hold for future phase
• REJECTED — decline allocation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

K IMPERIA Genesis System
```

---

## Email Template Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{submission_id}}` | Full SHA-256 hash | `a3f5b8...` (64 chars) |
| `{{submission_id_short}}` | First 8 chars of hash | `a3f5b8c1` |
| `{{timestamp}}` | ISO-8601 datetime | `2026-01-28T14:32:00Z` |
| `{{name}}` | Full name | `John Smith` |
| `{{email}}` | Email address | `john@example.com` |
| `{{organization}}` | Organization name | `Acme Corp` or empty |
| `{{jurisdiction}}` | Legal jurisdiction | `United States` |
| `{{wallet}}` | XRPL wallet address | `rN7n7otQDd6FczFgLdlqtyMVrn...` or empty |
| `{{role}}` | Selected role | `Holder / Allocator` |
| `{{metal}}` | Metal type | `Gold` / `Silver` / `Both` |
| `{{unit}}` | Weight unit | `grams` / `ounces` / `kilograms` |
| `{{proposed_weight}}` | Numeric weight | `100` |
| `{{intended_use}}` | Use case | `Long-term reserve holding` |

---

## Email Service Integration Options

### Option 1: SendGrid (Recommended)

```javascript
const sgMail = require('@sendgrid/mail');
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function sendRegistrantEmail(data) {
  const msg = {
    to: data.email,
    from: 'genesis@unykorn.io',
    subject: 'K IMPERIA — Genesis Registration Confirmed',
    text: renderTemplate(registrantTemplate, data),
  };
  await sgMail.send(msg);
}
```

### Option 2: AWS SES

```javascript
const AWS = require('aws-sdk');
const ses = new AWS.SES({ region: 'us-east-1' });

async function sendRegistrantEmail(data) {
  const params = {
    Source: 'genesis@unykorn.io',
    Destination: { ToAddresses: [data.email] },
    Message: {
      Subject: { Data: 'K IMPERIA — Genesis Registration Confirmed' },
      Body: { Text: { Data: renderTemplate(registrantTemplate, data) } }
    }
  };
  await ses.sendEmail(params).promise();
}
```

### Option 3: Custom SMTP

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

async function sendRegistrantEmail(data) {
  await transporter.sendMail({
    from: 'genesis@unykorn.io',
    to: data.email,
    subject: 'K IMPERIA — Genesis Registration Confirmed',
    text: renderTemplate(registrantTemplate, data)
  });
}
```

---

## Template Rendering Example

```javascript
function renderTemplate(template, data) {
  return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return data[key] !== undefined ? data[key] : '';
  });
}
```

---

## Testing Checklist

- [ ] Registrant email sends successfully
- [ ] Internal notification reaches all team members
- [ ] Variable substitution works correctly
- [ ] Email formatting renders properly in common clients
- [ ] Unsubscribe link included (if required by jurisdiction)
- [ ] SPF/DKIM/DMARC configured for domain
- [ ] Bounce handling implemented
- [ ] Rate limiting configured
