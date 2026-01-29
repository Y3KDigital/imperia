# Security

## Threat model (practical)

### Public intake

Risks:
- Bot/spam submissions
- Referral gaming
- Payload tampering

Controls:
- Server-side validation in Edge Function (`submit-intake`)
- Database constraints (required fields, allowed enums, positive weight)
- Trigger-enforced referral increment (no client authority)

### Admin read-only

Risks:
- Token leakage
- Unauthenticated reads

Controls:
- Admin Edge Function requires `Authorization: Bearer <ADMIN_TOKEN>`
- No write endpoints
- Consider rotating `ADMIN_TOKEN` periodically

### Secrets

- Supabase service role key must only exist in Edge Function secrets.
- Never embed `SUPABASE_SERVICE_ROLE_KEY` in IPFS/JS.

## Operational hardening (recommended)

- Pin IPFS CIDs on at least one pinning provider (optional) or keep IPFS Desktop always-on.
- Restrict who receives `ADMIN_TOKEN`.
- Use separate SendGrid sender domain and verified sender.
- Log and review error rates in Supabase function logs.
