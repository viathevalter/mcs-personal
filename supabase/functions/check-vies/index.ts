import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();

    // Initialize Supabase Auth client to verify user token directly
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );
    const { data: { user }, error: authError } = await authClient.auth.getUser(token);
    if (authError || !user) {
      console.error("[VIES] Authentication failed:", authError);
      return new Response(
        JSON.stringify({ error: `Invalid JWT token or user not found: ${authError?.message || 'Token inválido'}` }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse Request Body
    const { client_id, country_code, vat_number, trigger_source = 'manual' } = await req.json();

    if (!client_id || !country_code || !vat_number) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: client_id, country_code, vat_number" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Main Supabase Client with Service Role Key for writing privileges
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the client to check company permissions
    const { data: client, error: clientErr } = await supabase
      .schema('core_common')
      .from('clients')
      .select('*')
      .eq('id', client_id)
      .single();

    if (clientErr || !client) {
      return new Response(
        JSON.stringify({ error: "Client not found or query error" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Normalise country code and VAT number
    const normCountry = country_code.trim().toUpperCase();
    let normVat = vat_number.replace(/[\s\.\-\,]+/g, '').trim();

    // If VAT starts with country prefix, remove it (e.g. ESB63272603 -> B63272603)
    if (normVat.toUpperCase().startsWith(normCountry) && normVat.length > normCountry.length) {
      normVat = normVat.substring(normCountry.length);
    }

    const fullVatNumber = `${normCountry}${normVat}`;

    console.log(`[VIES] Querying VAT check for client ${client_id} (${client.trade_name}) - VAT: ${fullVatNumber}`);

    // Build the SOAP XML Envelope
    const soapEnvelope = `
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:ec.europa.eu:taxud:vies:services:checkVat:types">
   <soapenv:Header/>
   <soapenv:Body>
      <urn:checkVat>
         <urn:countryCode>${normCountry}</urn:countryCode>
         <urn:vatNumber>${normVat}</urn:vatNumber>
      </urn:checkVat>
   </soapenv:Body>
</soapenv:Envelope>
`;

    let status = 'not_checked';
    let valid = false;
    let returnedName = '';
    let returnedAddress = '';
    let requestDate = '';
    let requestIdentifier = '';
    let errorCode = '';
    let errorMessage = '';
    let rawResponse = '';
    let isTechnicalError = false;

    // Call European Commission VIES SOAP Service
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    try {
      const response = await fetch('https://ec.europa.eu/taxation_customs/vies/services/checkVatService', {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': '',
        },
        body: soapEnvelope,
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      rawResponse = await response.text();

      if (!response.ok) {
        throw new Error(`HTTP Error Status: ${response.status}`);
      }

      // Check for SOAP fault
      const faultMatch = rawResponse.match(/<faultstring>([^<]*)<\/faultstring>/i) || 
                         rawResponse.match(/<[^>]*faultstring[^>]*>([^<]*)<\/[^>]*faultstring>/i);
      
      if (faultMatch) {
        const faultStr = faultMatch[1].trim();
        errorCode = faultStr;
        errorMessage = faultStr;

        if (faultStr.includes('MS_UNAVAILABLE')) {
          status = 'member_state_unavailable';
          isTechnicalError = true;
        } else if (faultStr.includes('SERVICE_UNAVAILABLE')) {
          status = 'service_unavailable';
          isTechnicalError = true;
        } else if (faultStr.includes('TIMEOUT')) {
          status = 'timeout';
          isTechnicalError = true;
        } else if (faultStr.includes('SERVER_BUSY')) {
          status = 'rate_limited';
          isTechnicalError = true;
        } else {
          status = 'technical_error';
          isTechnicalError = true;
        }
      } else {
        // Parse successful SOAP elements namespace-agnostically
        const validMatch = rawResponse.match(/<[^>]*valid>([^<]*)<\/[^>]*valid>/i);
        const nameMatch = rawResponse.match(/<[^>]*name>([^<]*)<\/[^>]*name>/i);
        const addressMatch = rawResponse.match(/<[^>]*address>([^<]*)<\/[^>]*address>/i);
        const requestDateMatch = rawResponse.match(/<[^>]*requestDate>([^<]*)<\/[^>]*requestDate>/i);

        const parsedValid = validMatch ? validMatch[1].toLowerCase().trim() === 'true' : false;
        
        valid = parsedValid;
        status = parsedValid ? 'valid' : 'invalid';
        returnedName = nameMatch ? nameMatch[1].trim() : '';
        returnedAddress = addressMatch ? addressMatch[1].trim() : '';
        
        // Clean return values containing hyphens/placeholders
        if (returnedName === '---') returnedName = '';
        if (returnedAddress === '---') returnedAddress = '';

        requestDate = requestDateMatch ? requestDateMatch[1].trim() : '';
      }

    } catch (err: any) {
      clearTimeout(timeoutId);
      console.error(`[VIES] Connection failed: ${err.message}`);
      isTechnicalError = true;
      errorCode = 'CONNECTION_FAILURE';
      errorMessage = err.message;
      
      if (err.name === 'AbortError') {
        status = 'timeout';
        errorCode = 'TIMEOUT';
        errorMessage = 'O serviço da Comissão Europeia demorou demasiado tempo a responder.';
      } else {
        status = 'technical_error';
      }
    }

    // Preserve previous valid state if we hit a temporary technical error
    let clientViesValid = valid;
    if (isTechnicalError && client.vies_valid === true) {
      clientViesValid = true;
    }

    // Write lookup to historical log table `client_vies_checks`
    const { error: logErr } = await supabase
      .schema('core_common')
      .from('client_vies_checks')
      .insert({
        empresa_id: client.empresa_id,
        client_id: client.id,
        country_code: normCountry,
        vat_number: normVat,
        full_vat_number: fullVatNumber,
        status: status,
        valid: valid,
        returned_name: returnedName || null,
        returned_address: returnedAddress || null,
        request_date: requestDate || null,
        request_identifier: requestIdentifier || null,
        error_code: errorCode || null,
        error_message: errorMessage || null,
        checked_by: user.id,
        trigger_source: trigger_source,
        response_payload: { xml: rawResponse }
      });

    if (logErr) {
      console.error("[VIES] Failed to insert log check:", logErr);
    }

    // Check if returned name or address differs from local registry database
    let requiresReview = false;
    if (status === 'valid' && returnedName) {
      const localName = (client.legal_name || '').toLowerCase().trim();
      const remoteName = returnedName.toLowerCase().trim();
      // If remote name doesn't match locally at all, flag for review
      if (!localName.includes(remoteName) && !remoteName.includes(localName)) {
        requiresReview = true;
      }
    }

    // Update Client record
    const { error: updateErr } = await supabase
      .schema('core_common')
      .from('clients')
      .update({
        vies_status: status,
        vies_valid: clientViesValid,
        vies_returned_name: returnedName || null,
        vies_returned_address: returnedAddress || null,
        vies_request_date: requestDate || null,
        vies_request_identifier: requestIdentifier || null,
        vies_last_checked_at: new Date().toISOString(),
        vies_last_checked_by: user.id,
        vies_requires_review: requiresReview,
        vies_last_error_code: errorCode || null,
        vies_last_error_message: errorMessage || null,
        eu_vat_number: fullVatNumber
      })
      .eq('id', client_id);

    if (updateErr) {
      console.error("[VIES] Failed to update client properties:", updateErr);
    }

    return new Response(
      JSON.stringify({
        success: !isTechnicalError,
        status,
        valid: clientViesValid,
        returned_name: returnedName,
        returned_address: returnedAddress,
        request_date: requestDate,
        error_code: errorCode,
        error_message: errorMessage,
        requires_review: requiresReview
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("General error in Edge Function check-vies:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
