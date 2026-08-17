-- Migration: 20260817172000_disable_rls_holerites.sql
-- Description: Completely disable RLS on holerites and holerite_eventos tables

ALTER TABLE core_personal.holerites DISABLE ROW LEVEL SECURITY;
ALTER TABLE core_personal.holerite_eventos DISABLE ROW LEVEL SECURITY;
