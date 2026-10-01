-- Migration: Add 'cancelado' to core_finance.status_pagamento enum
ALTER TYPE core_finance.status_pagamento ADD VALUE IF NOT EXISTS 'cancelado';
