const http = require('https');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const clientId = '7442b62c-9c27-40e4-bd90-9ae0c338d57d'; // E. BACHILLER B, S.A
const countryCode = 'ES';
const vatNumber = 'A08700197';

const requestBody = JSON.stringify({
  client_id: clientId,
  country_code: countryCode,
  vat_number: vatNumber,
  trigger_source: 'manual'
});

const url = new URL(`${supabaseUrl}/functions/v1/check-vies`);

const options = {
  hostname: url.hostname,
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${supabaseKey}`,
    'Content-Length': Buffer.byteLength(requestBody)
  }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => {
    data += chunk;
  });
  res.on('end', () => {
    console.log('HTTP STATUS:', res.statusCode);
    console.log('HEADERS:', JSON.stringify(res.headers));
    console.log('RESPONSE:', data);
  });
});

req.on('error', (e) => {
  console.error(`problem with request: ${e.message}`);
});

req.write(requestBody);
req.end();
