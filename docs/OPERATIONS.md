# Operations

## Command Center posture

- Observe first; decide later.
- Treat submissions as non-binding signals.
- Track quality: outliers, bots, forced referrals, duplicated patterns.

## Useful SQL queries

Run in Supabase SQL editor.

### Submission counts

```sql
select
  count(*) as total,
  count(*) filter (where status = 'PENDING') as pending
from submissions;
```

### Distribution by metal

```sql
select metal, count(*)
from submissions
group by metal
order by count(*) desc;
```

### Weight totals

```sql
select
  sum(case when metal in ('Gold','Both') then proposed_weight else 0 end) as total_weight_gold,
  sum(case when metal in ('Silver','Both') then proposed_weight else 0 end) as total_weight_silver
from submissions;
```

### Referrals

```sql
select
  count(*) filter (where referred_by is not null)::float / nullif(count(*),0) * 100 as referral_rate_percent
from submissions;
```

### Top referrers

```sql
select referral_id, name, email, referral_count
from submissions
where referral_count > 0
order by referral_count desc
limit 25;
```

## Admin endpoints (Edge Functions)

- `GET /admin-api/pending`
- `GET /admin-api/stats`
- `GET /admin-api/leaderboard`

All require:

- `Authorization: Bearer <ADMIN_TOKEN>`
