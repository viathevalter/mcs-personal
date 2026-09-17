-- Migration: Add support for Precio Cerrado (Fixed Price / Llave en mano) estimations

ALTER TABLE core_comercial.estimaciones
ADD COLUMN IF NOT EXISTS pricing_model VARCHAR(20) DEFAULT 'hourly' NOT NULL,
ADD COLUMN IF NOT EXISTS fixed_price_notes TEXT,
ADD COLUMN IF NOT EXISTS parent_estimacion_id UUID REFERENCES core_comercial.estimaciones(id);

ALTER TABLE core_comercial.comercial_settings
ADD COLUMN IF NOT EXISTS fixed_price_markup_percent NUMERIC(5,2) DEFAULT 80.00,
ADD COLUMN IF NOT EXISTS fixed_price_min_margin_percent NUMERIC(5,2) DEFAULT 20.00;

ALTER TABLE core_comercial.job_function_rate_refs
ADD COLUMN IF NOT EXISTS fixed_price_sell_rate_hour NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS fixed_price_min_sell_rate_hour NUMERIC(10,2);
