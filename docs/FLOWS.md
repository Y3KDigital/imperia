# Flows (Diagrams)

## Intake submission sequence

```mermaid
sequenceDiagram
  autonumber
  participant U as User Browser
  participant F as IPFS Frontend
  participant EF as Edge Function (submit-intake)
  participant DB as Supabase Postgres
  participant SG as SendGrid

  U->>F: Load index.html + JS
  U->>F: Submit form
  F->>EF: POST /submit-intake (JSON)
  EF->>DB: INSERT submissions
  DB-->>DB: Trigger increments referral_count (if referred_by)
  EF-->>SG: Send receipt + internal notice (optional)
  EF-->>F: 200 { success: true }
  F-->>U: Render referral link + QR
```

## Admin read-only flow

```mermaid
flowchart TB
  A[Admin Browser] --> UI[admin.html]
  UI -->|Bearer ADMIN_TOKEN| API[Edge Function: admin-api]
  API --> P[(pending_submissions)]
  API --> L[(referral_leaderboard)]
  API --> S[[RPC: get_submission_stats]]
  API --> UI
```

## Flow tree (decision boundary)

```mermaid
mindmap
  root((Genesis Intake))
    Observe
      Demand by metal
      Weight distribution
      Jurisdiction clustering
      Referral behavior
    Decide
      Pause (wait for more signal)
      Proceed to cohort mapping (no minting)
```

## Example metrics graph (template)

This is a template for operational dashboards. Replace values with real observed data.

```mermaid
xychart-beta
  title "Genesis submissions (example)"
  x-axis [Day1, Day2, Day3, Day4, Day5]
  y-axis "Count" 0 --> 50
  line [2, 8, 13, 21, 34]
```
