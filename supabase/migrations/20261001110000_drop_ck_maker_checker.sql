-- Migration: Drop restrictive maker_checker check to allow administrators to approve orders
ALTER TABLE core_finance.ordens_pagamento DROP CONSTRAINT IF EXISTS ck_maker_checker;
