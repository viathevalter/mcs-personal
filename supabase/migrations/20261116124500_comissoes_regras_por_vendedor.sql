-- Migration: Suporte a Regras Individuais de Comissão por Vendedor (Comercial) + Fix enum cast em is_admin()
ALTER TABLE public.mcs_comissoes_settings
  ADD COLUMN IF NOT EXISTS regras_vendedores JSONB DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.mcs_users
    WHERE id = auth.uid()
      AND role::text IN ('admin', 'super_admin', 'admin_rh')
  ) OR EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = auth.uid()
      AND role::text IN ('admin', 'super_admin', 'admin_rh')
  );
END;
$function$;

DROP POLICY IF EXISTS "Admins have full access to comissoes_settings" ON public.mcs_comissoes_settings;
CREATE POLICY "Admins have full access to comissoes_settings"
  ON public.mcs_comissoes_settings
  FOR ALL
  TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

UPDATE public.mcs_comissoes_settings
SET regras_vendedores = jsonb_set(
  COALESCE(regras_vendedores, '{}'::jsonb),
  '{alex@gestaologinpro.com}',
  jsonb_build_object(
    'vendedor_email', 'alex@gestaologinpro.com',
    'vendedor_nome', 'Alex Carmona Archiles',
    'ativo', true,
    'comissao_base', 30,
    'bonus_novo_cliente', 40,
    'carencia_dias', 15,
    'exigir_fatura_quitada', true,
    'updated_at', NOW()
  ),
  true
),
updated_at = NOW()
WHERE id = 1;

NOTIFY pgrst, 'reload schema';
