-- M0 decision D2 (specs/005-m0-workspace/plan.md): project_member.permission gains `owner`.
-- New databases already get it from 20261101000100_schema.sql (regenerated from data/schema); this migration
-- brings databases pushed before 03/11/2026 to the same constraint.
ALTER TABLE public.project_member DROP CONSTRAINT IF EXISTS ck_project_member_permission;
ALTER TABLE public.project_member
  ADD CONSTRAINT ck_project_member_permission CHECK (permission IN ('owner', 'view', 'edit'));
