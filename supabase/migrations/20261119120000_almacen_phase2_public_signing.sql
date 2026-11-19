-- ==============================================================================
-- MCS Almacen - Fase 2: RPCs Públicas para Assinatura Digital do Trabalhador
-- ==============================================================================

CREATE OR REPLACE FUNCTION core_logistica.get_almacen_order_by_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order core_logistica.almacen_picking_orders%ROWTYPE;
  v_items JSONB;
BEGIN
  SELECT * INTO v_order
  FROM core_logistica.almacen_picking_orders
  WHERE signature_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', i.id,
      'item_name', i.item_name,
      'size_code', i.size_code,
      'quantity_requested', i.quantity_requested,
      'quantity_picked', i.quantity_picked
    )
    ORDER BY i.created_at ASC
  ), '[]'::jsonb)
  INTO v_items
  FROM core_logistica.almacen_picking_items i
  WHERE i.picking_order_id = v_order.id;

  RETURN jsonb_build_object(
    'id', v_order.id,
    'order_number', v_order.order_number,
    'pedido_codigo', v_order.pedido_codigo,
    'empresa_nome', v_order.empresa_nome,
    'client_nome', v_order.client_nome,
    'worker_nome', v_order.worker_nome,
    'worker_identificacion', v_order.worker_identificacion,
    'job_function_name', v_order.job_function_name,
    'request_type', v_order.request_type,
    'status', v_order.status,
    'delivery_method', v_order.delivery_method,
    'tracking_code', v_order.tracking_code,
    'delivery_address', v_order.delivery_address,
    'observations', v_order.observations,
    'expected_start_date', v_order.expected_start_date,
    'signature_token', v_order.signature_token,
    'signed_at', v_order.signed_at,
    'signed_by_name', v_order.signed_by_name,
    'signature_data_url', v_order.signature_data_url,
    'created_at', v_order.created_at,
    'items', v_items
  );
END;
$$;

CREATE OR REPLACE FUNCTION core_logistica.sign_almacen_order_by_token(
  p_token UUID,
  p_signed_by_name TEXT,
  p_signature_data_url TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order core_logistica.almacen_picking_orders%ROWTYPE;
BEGIN
  SELECT * INTO v_order
  FROM core_logistica.almacen_picking_orders
  WHERE signature_token = p_token
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ordem não encontrada para o token informado.';
  END IF;

  IF v_order.signed_at IS NOT NULL THEN
    RETURN jsonb_build_object('already_signed', true, 'signed_at', v_order.signed_at);
  END IF;

  UPDATE core_logistica.almacen_picking_orders
  SET
    signed_at = now(),
    signed_by_name = COALESCE(NULLIF(TRIM(p_signed_by_name), ''), v_order.worker_nome),
    signature_data_url = p_signature_data_url,
    status = 'ENTREGUE',
    carrier_status = 'ENTREGUE',
    delivered_at = COALESCE(delivered_at, now()),
    updated_at = now()
  WHERE id = v_order.id;

  RETURN jsonb_build_object('success', true, 'signed_at', now());
END;
$$;

GRANT USAGE ON SCHEMA core_logistica TO anon, authenticated;
GRANT EXECUTE ON FUNCTION core_logistica.get_almacen_order_by_token(UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION core_logistica.sign_almacen_order_by_token(UUID, TEXT, TEXT) TO anon, authenticated;
