# Architecture

## System boundary

This repository implements a compliance-safe intake and observation system:

- Public users can submit non-binding, weight-referenced allocation intent.
- Operators can observe submissions via a read-only admin panel.
- No irreversible actions (no approvals, no minting, no promises) occur in this system.

## Components

- IPFS-hosted frontend: public intake form + referral success page
- IPFS-hosted admin UI: read-only operations dashboard
- Supabase Postgres: durable storage + triggers + views
- Supabase Edge Functions: public intake API + protected admin API
- SendGrid: outbound receipts and internal notifications (optional)

## High-level flow

```mermaid
flowchart LR
  U[User] -->|HTTPS| IPFS[IPFS Gateway: index.html]
  IPFS -->|fetch POST /submit-intake| EF1[Supabase Edge Function: submit-intake]
  EF1 --> DB[(Supabase Postgres: submissions)]
  DB -->|trigger| DB
  EF1 -->|optional| SG[SendGrid]

  A[Admin] -->|HTTPS| IPFS2[IPFS Gateway: admin.html]
  IPFS2 -->|fetch GET /admin-api/*| EF2[Supabase Edge Function: admin-api]
  EF2 --> V1[(View: pending_submissions)]
  EF2 --> V2[(View: referral_leaderboard)]
  EF2 --> RPC[RPC: get_submission_stats]
```

## Data model (core)

```mermaid
classDiagram
  class submissions {
    uuid id
    string submission_id
    timestamptz timestamp
    string status

    string name
    string email
    string organization
    string jurisdiction
    string wallet

    string role
    string metal
    string unit
    numeric proposed_weight
    string intended_use

    string referral_id
    string referred_by
    int referral_count

    bool email_sent
    timestamptz email_sent_at
    bool internal_notification_sent

    timestamptz created_at
    timestamptz updated_at
  }

  class pending_submissions
  class referral_leaderboard

  pending_submissions ..> submissions : view
  referral_leaderboard ..> submissions : view
```

## Trust boundaries

- Public traffic: IPFS gateway + public Edge Function endpoint
- Privileged traffic: admin Edge Function endpoint protected by `ADMIN_TOKEN`
- Database writes: only Edge Function uses service role key (server-side only)
- Database reads (admin): served via Edge Function (server-side only)
