-- New batch lifecycle values. This migration ONLY adds enum labels — nothing
-- in this file may reference them yet, since Postgres forbids using a new
-- enum value in the same transaction it was added in. Backfill/usage happens
-- in the next migration.
--
-- Full lifecycle after this: draft -> unpublished -> under_review -> published
--                             -> in_progress -> completed -> archived
-- draft         = still being filled out in the creation form (not fully saved)
-- unpublished   = fully created, saved, not yet submitted to Ami Probashi
-- under_review  = submitted; pending Ami Probashi's internal approval
-- published     = approved and live on the Ami Probashi app

ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'unpublished' AFTER 'draft';
ALTER TYPE public.batch_status ADD VALUE IF NOT EXISTS 'under_review' AFTER 'unpublished';
