-- K IMPERIA Genesis Intake Database Schema
-- PostgreSQL / Supabase

-- =============================================================================
-- SUBMISSIONS TABLE (Main Registry)
-- =============================================================================

CREATE TABLE submissions (
  -- Primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Submission metadata
  submission_id VARCHAR(64) UNIQUE NOT NULL,  -- SHA-256 hash of submission
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  
  -- Registrant identity
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  organization VARCHAR(255),
  jurisdiction VARCHAR(255) NOT NULL,
  wallet VARCHAR(255),
  
  -- Role
  role VARCHAR(50) NOT NULL,
  
  -- Allocation signal
  metal VARCHAR(20) NOT NULL,
  unit VARCHAR(20) NOT NULL,
  proposed_weight DECIMAL(20, 8) NOT NULL,
  intended_use VARCHAR(50),
  
  -- Referral tracking
  referral_id VARCHAR(8) UNIQUE NOT NULL,     -- This person's unique referral ID
  referred_by VARCHAR(8),                     -- Who referred them
  referral_count INTEGER NOT NULL DEFAULT 0,  -- How many they've referred
  
  -- Back-office fields
  notes TEXT,
  reviewed_by VARCHAR(255),
  review_date TIMESTAMPTZ,
  
  -- Email tracking
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  email_sent_at TIMESTAMPTZ,
  internal_notification_sent BOOLEAN NOT NULL DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- INDEXES
-- =============================================================================

CREATE INDEX idx_submissions_email ON submissions(email);
CREATE INDEX idx_submissions_referral_id ON submissions(referral_id);
CREATE INDEX idx_submissions_referred_by ON submissions(referred_by);
CREATE INDEX idx_submissions_status ON submissions(status);
CREATE INDEX idx_submissions_timestamp ON submissions(timestamp DESC);
CREATE INDEX idx_submissions_metal ON submissions(metal);
CREATE INDEX idx_submissions_jurisdiction ON submissions(jurisdiction);

-- =============================================================================
-- CONSTRAINTS
-- =============================================================================

ALTER TABLE submissions
  ADD CONSTRAINT check_status 
  CHECK (status IN ('PENDING', 'APPROVED', 'DEFERRED', 'REJECTED'));

ALTER TABLE submissions
  ADD CONSTRAINT check_metal 
  CHECK (metal IN ('Gold', 'Silver', 'Both'));

ALTER TABLE submissions
  ADD CONSTRAINT check_unit 
  CHECK (unit IN ('grams', 'ounces', 'kilograms'));

ALTER TABLE submissions
  ADD CONSTRAINT check_role 
  CHECK (role IN ('Holder / Allocator', 'Issuer / Dealer', 'Partner / Infrastructure', 'Research / Observer'));

ALTER TABLE submissions
  ADD CONSTRAINT check_intended_use 
  CHECK (intended_use IN ('Long-term reserve holding', 'Settlement liquidity', 'Issuance participation', 'Undecided') OR intended_use IS NULL);

ALTER TABLE submissions
  ADD CONSTRAINT check_proposed_weight_positive 
  CHECK (proposed_weight > 0);

ALTER TABLE submissions
  ADD CONSTRAINT check_referral_count_non_negative 
  CHECK (referral_count >= 0);

-- Referral ceiling (internal limit - not publicly exposed)
ALTER TABLE submissions
  ADD CONSTRAINT check_referral_count_ceiling 
  CHECK (referral_count <= 100);

-- =============================================================================
-- TRIGGER: Update updated_at timestamp
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_submissions_updated_at 
  BEFORE UPDATE ON submissions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- TRIGGER: Auto-increment referrer's referral_count
-- =============================================================================

CREATE OR REPLACE FUNCTION increment_referrer_count()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referred_by IS NOT NULL THEN
    UPDATE submissions
    SET referral_count = referral_count + 1
    WHERE referral_id = NEW.referred_by;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_referrer_count 
  AFTER INSERT ON submissions 
  FOR EACH ROW 
  EXECUTE FUNCTION increment_referrer_count();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================================================

-- Enable RLS
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert (for registration endpoint)
CREATE POLICY "Allow public insert" 
  ON submissions 
  FOR INSERT 
  WITH CHECK (true);

-- Policy: Authenticated users can read all (for admin dashboard)
CREATE POLICY "Allow authenticated read" 
  ON submissions 
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- Policy: Authenticated users can update (for admin status changes)
CREATE POLICY "Allow authenticated update" 
  ON submissions 
  FOR UPDATE 
  USING (auth.role() = 'authenticated');

-- =============================================================================
-- VIEWS (For Admin Dashboard)
-- =============================================================================

-- View: Pending submissions
CREATE VIEW pending_submissions AS
SELECT 
  id,
  submission_id,
  timestamp,
  name,
  email,
  role,
  metal,
  proposed_weight,
  unit,
  jurisdiction,
  referral_id,
  referred_by,
  referral_count
FROM submissions
WHERE status = 'PENDING'
ORDER BY timestamp DESC;

-- View: Referral leaderboard (internal only)
CREATE VIEW referral_leaderboard AS
SELECT 
  referral_id,
  name,
  email,
  referral_count,
  timestamp
FROM submissions
WHERE referral_count > 0
ORDER BY referral_count DESC, timestamp ASC
LIMIT 100;

-- View: Referral chains
CREATE VIEW referral_chains AS
SELECT 
  s1.referral_id as referrer_id,
  s1.name as referrer_name,
  s2.referral_id as referee_id,
  s2.name as referee_name,
  s2.timestamp as referred_at
FROM submissions s1
JOIN submissions s2 ON s1.referral_id = s2.referred_by
ORDER BY s2.timestamp DESC;

-- =============================================================================
-- FUNCTIONS (Helper queries)
-- =============================================================================

-- Function: Get referral stats for a specific user
CREATE OR REPLACE FUNCTION get_referral_stats(user_referral_id VARCHAR)
RETURNS TABLE (
  total_referrals INTEGER,
  direct_referrals INTEGER,
  referral_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT referral_count FROM submissions WHERE referral_id = user_referral_id),
    COUNT(*)::INTEGER as direct,
    ARRAY_AGG(name) as names
  FROM submissions
  WHERE referred_by = user_referral_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Get submission stats
CREATE OR REPLACE FUNCTION get_submission_stats()
RETURNS TABLE (
  total INTEGER,
  pending INTEGER,
  approved INTEGER,
  deferred INTEGER,
  rejected INTEGER,
  total_weight_gold DECIMAL,
  total_weight_silver DECIMAL,
  unique_jurisdictions INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total,
    COUNT(*) FILTER (WHERE status = 'PENDING')::INTEGER as pending,
    COUNT(*) FILTER (WHERE status = 'APPROVED')::INTEGER as approved,
    COUNT(*) FILTER (WHERE status = 'DEFERRED')::INTEGER as deferred,
    COUNT(*) FILTER (WHERE status = 'REJECTED')::INTEGER as rejected,
    SUM(CASE WHEN metal IN ('Gold', 'Both') THEN proposed_weight ELSE 0 END) as total_weight_gold,
    SUM(CASE WHEN metal IN ('Silver', 'Both') THEN proposed_weight ELSE 0 END) as total_weight_silver,
    COUNT(DISTINCT jurisdiction)::INTEGER as unique_jurisdictions
  FROM submissions;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- COMMENTS
-- =============================================================================

COMMENT ON TABLE submissions IS 'K IMPERIA Genesis allocation registration submissions';
COMMENT ON COLUMN submissions.submission_id IS 'SHA-256 hash of submission payload (deterministic identifier)';
COMMENT ON COLUMN submissions.referral_id IS 'Unique 8-char alphanumeric ID for referral tracking';
COMMENT ON COLUMN submissions.referred_by IS 'Referral ID of the person who referred this registrant';
COMMENT ON COLUMN submissions.referral_count IS 'Number of people this registrant has referred (auto-incremented)';
COMMENT ON COLUMN submissions.status IS 'PENDING, APPROVED, DEFERRED, or REJECTED';
COMMENT ON CONSTRAINT check_referral_count_ceiling ON submissions IS 'Internal referral ceiling - prevents spam rings';

-- =============================================================================
-- SEED DATA (Optional - for testing)
-- =============================================================================

-- Uncomment to add test data:
-- INSERT INTO submissions (submission_id, name, email, jurisdiction, role, metal, unit, proposed_weight, referral_id, intended_use)
-- VALUES 
--   ('test_hash_001', 'Test User 1', 'test1@example.com', 'United States', 'Holder / Allocator', 'Gold', 'ounces', 10.0, 'TEST0001', 'Long-term reserve holding'),
--   ('test_hash_002', 'Test User 2', 'test2@example.com', 'United Kingdom', 'Issuer / Dealer', 'Silver', 'kilograms', 5.0, 'TEST0002', 'Settlement liquidity');
