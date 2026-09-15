-- ========================================================================================
-- Migration: 20260915103000_add_commercial_user_columns.sql
-- Description: Add commercial_email, commercial_name, commercial_phone to public.mcs_users
-- ========================================================================================

ALTER TABLE public.mcs_users 
ADD COLUMN IF NOT EXISTS commercial_email TEXT,
ADD COLUMN IF NOT EXISTS commercial_name TEXT,
ADD COLUMN IF NOT EXISTS commercial_phone TEXT;
