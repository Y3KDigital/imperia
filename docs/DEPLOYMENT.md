# Deployment

This repository supports a minimal deployment model:

- Frontend + Admin UI: IPFS (published via IPFS Desktop)
- API surface: Supabase Edge Functions
- Persistence: Supabase Postgres
- Optional email: SendGrid

## 1) Deploy Supabase Edge Functions

Prereq: Supabase project created and schema applied (`supabase-schema.sql`).

### Secrets

Set these in Supabase (Edge Functions → Secrets) or via CLI:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_KEY`)
- `ADMIN_TOKEN`
- Optional: `SENDGRID_API_KEY`, `FROM_EMAIL`, `INTERNAL_RECIPIENTS`

### Endpoints

- `submit-intake` (public): inserts into `submissions`
- `admin-api/*` (protected): reads from views + RPC

## 2) Publish to IPFS (IPFS Desktop)

Use the PowerShell script:

- `deploy-ipfs-desktop.ps1`

Before running, stamp your real Supabase functions base:

- `SUPABASE_FUNCTIONS_BASE=https://<PROJECT_REF>.supabase.co/functions/v1`

Example:

```powershell
$env:SUPABASE_FUNCTIONS_BASE="https://<PROJECT_REF>.supabase.co/functions/v1"
.\deploy-ipfs-desktop.ps1
```

The script outputs:

- `https://ipfs.io/ipfs/<CID>/index.html`
- `https://ipfs.io/ipfs/<CID>/admin.html`

## 3) Validate

- Submit one test registration from the IPFS intake link.
- Confirm row appears in `submissions`.
- Confirm admin page loads and calls `admin-api` endpoints with token.
- Confirm emails (if configured).
