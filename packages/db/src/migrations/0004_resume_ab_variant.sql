-- A/B testing for the resume-tailoring strategy. Each application is bucketed
-- into variant 'A' (impact-narrative) or 'B' (ATS keyword-dense) when its resume
-- is tailored; Analytics compares callback (interview/offer) rate per variant.
-- Nullable: applications without a tailored resume have no variant.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS ab_variant varchar(10);
