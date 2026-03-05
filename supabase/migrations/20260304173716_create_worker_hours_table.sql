-- Create worker_hours table
CREATE TABLE IF NOT EXISTS core_personal.worker_hours (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id uuid NOT NULL,
    worker_id uuid NOT NULL REFERENCES core_personal.workers(id) ON DELETE CASCADE,
    period_year integer NOT NULL,
    period_month integer NOT NULL,
    status text NOT NULL DEFAULT 'pendente', -- 'pendente', 'enviado', 'validado'
    file_url text,
    file_name text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE core_personal.worker_hours ENABLE ROW LEVEL SECURITY;

-- Temporary loose RLS for worker_hours so that portal users and admins can operate (Portal will use anonymous/public or basic auth depending on implementation, but for now allow authenticated)
-- Actually, the user wants a Portal for Workers. Workers might login with a generic authenticated role or anonymous.
-- We'll allow all authenticated and anon to interact with this table for now, or just public access since it's a worker portal.
-- Or we create the workers API to use anon role. We will set it to allow all for now.
CREATE POLICY "Allow all read write for worker_hours" 
ON core_personal.worker_hours FOR ALL 
USING (true) WITH CHECK (true);

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('horas_trabalhadores', 'horas_trabalhadores', false) 
ON CONFLICT (name) DO NOTHING;

-- Storage RLS (Bucket: horas_trabalhadores)
CREATE POLICY "Allow all operations on horas_trabalhadores"
ON storage.objects FOR ALL
USING (bucket_id = 'horas_trabalhadores')
WITH CHECK (bucket_id = 'horas_trabalhadores');
