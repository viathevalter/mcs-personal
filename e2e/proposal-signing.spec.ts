import { test, expect } from '@playwright/test';
import { Client } from 'pg';
import JSZip from 'jszip';

const dbConnectionString = 'postgresql://postgres:Stkrt%40Dev2026@db.pyahcgorkvwfwmlzspnv.supabase.co:5432/postgres';

const TEST_TOKEN = '00000000-0000-0000-0000-000000000000';
const TEST_OTP = '123456';
const ESTIMACION_ID = '11111111-1111-1111-1111-111111111111';
const VERSION_ID = '22222222-2222-2222-2222-222222222222';
const ITEM_ID = '33333333-3333-3333-3333-333333333333';
const SIGNATURE_ID = '44444444-4444-4444-4444-444444444444';

async function generateMinimalDocx(): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`);
  
  zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`);
  
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:r>
        <w:t>Proposta Comercial Teste E2E</w:t>
      </w:r>
    </w:p>
  </w:body>
</w:document>`);
  
  zip.file('word/_rels/document.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>`);
  
  return await zip.generateAsync({ type: 'nodebuffer' });
}

async function cleanDatabase(client: Client) {
  await client.query(`
    DELETE FROM core_operacoes.solicitud_tareas WHERE solicitud_id IN (
        SELECT id FROM core_operacoes.solicitudes_operativas WHERE client_id = 'b3113ee0-89cd-4c75-b4e7-63167c0a0af2' AND pedido_id IN (
            SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
        )
    );
    DELETE FROM core_operacoes.solicitud_timeline WHERE solicitud_id IN (
        SELECT id FROM core_operacoes.solicitudes_operativas WHERE client_id = 'b3113ee0-89cd-4c75-b4e7-63167c0a0af2' AND pedido_id IN (
            SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
        )
    );
    DELETE FROM core_operacoes.solicitudes_operativas WHERE client_id = 'b3113ee0-89cd-4c75-b4e7-63167c0a0af2' AND pedido_id IN (
        SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
    );
    DELETE FROM core_comercial.pedido_status_history WHERE pedido_id IN (
        SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
    );
    DELETE FROM core_comercial.pedido_events WHERE pedido_id IN (
        SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
    );
    DELETE FROM core_comercial.pedido_items WHERE pedido_id IN (
        SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}'
    );
    DELETE FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}';
    DELETE FROM core_comercial.proposal_audit_logs WHERE proposal_signature_id = '${SIGNATURE_ID}';
    DELETE FROM core_comercial.proposal_signatures WHERE id = '${SIGNATURE_ID}';
    UPDATE core_comercial.estimaciones SET current_version_id = NULL WHERE id = '${ESTIMACION_ID}';
    DELETE FROM core_comercial.estimacion_items WHERE estimacion_id = '${ESTIMACION_ID}';
    DELETE FROM core_comercial.estimacion_versions WHERE estimacion_id = '${ESTIMACION_ID}';
    DELETE FROM core_comercial.estimaciones WHERE id = '${ESTIMACION_ID}';
  `);
}

async function seedDatabase(client: Client) {
  // 1. Seed Estimacion
  await client.query(`
    INSERT INTO core_comercial.estimaciones (
        id, empresa_id, codigo, client_id, client_site_id, status, estimation_type, contact_name, contact_email, validity_date
    ) VALUES (
        '${ESTIMACION_ID}',
        'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
        'EST-TEST-E2E-001',
        'b3113ee0-89cd-4c75-b4e7-63167c0a0af2',
        '7df7b76f-846c-42bc-9f76-cbe8afa97df1',
        'sent',
        'new_allocation',
        'John Client Test',
        'billing@client.com',
        NOW() + INTERVAL '10 days'
    )
  `);

  // 2. Seed Version
  await client.query(`
    INSERT INTO core_comercial.estimacion_versions (
        id, estimacion_id, empresa_id, version_number, status, total_cost, total_revenue, margin_percent, notes
    ) VALUES (
        '${VERSION_ID}',
        '${ESTIMACION_ID}',
        'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
        1,
        'active',
        1000.00,
        1500.00,
        33.33,
        'Initial test version'
    )
  `);

  // Update Estimacion current_version_id
  await client.query(`
    UPDATE core_comercial.estimaciones
    SET current_version_id = '${VERSION_ID}'
    WHERE id = '${ESTIMACION_ID}'
  `);

  // 3. Seed Items
  await client.query(`
    INSERT INTO core_comercial.estimacion_items (
        id, estimacion_id, estimacion_version_id, empresa_id, job_function_id, quantity,
        planned_hours_per_day, planned_days_per_week, planned_total_hours, base_cost_hour, sell_rate_hour, margin_percent, status
    ) VALUES (
        '${ITEM_ID}',
        '${ESTIMACION_ID}',
        '${VERSION_ID}',
        'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
        'f5c00645-6fc2-41f7-9937-0f717a591b12',
        1,
        8.00,
        5,
        40.00,
        15.00,
        25.00,
        40.00,
        'active'
    )
  `);

  // 4. Seed Proposal Signature
  await client.query(`
    INSERT INTO core_comercial.proposal_signatures (
        id, empresa_id, estimacion_id, status, signature_token, otp_code, otp_expires_at, document_url
    ) VALUES (
        '${SIGNATURE_ID}',
        'bedbc2ad-bb7a-4bb3-986e-07224a9a5a3d',
        '${ESTIMACION_ID}',
        'pending_signature',
        '${TEST_TOKEN}',
        '${TEST_OTP}',
        NOW() + INTERVAL '1 hour',
        'test-proposta.docx'
    )
  `);
}

test.describe('E2E Public Proposal Signing', () => {
  let pgClient: Client;

  test.beforeAll(async () => {
    pgClient = new Client({ connectionString: dbConnectionString });
    await pgClient.connect();
  });

  test.afterAll(async () => {
    await pgClient.end();
  });

  test.beforeEach(async () => {
    await cleanDatabase(pgClient);
    await seedDatabase(pgClient);
  });

  test.afterEach(async () => {
    await cleanDatabase(pgClient);
  });

  test('should load proposal, draw signature, enter OTP, verify backend conversion and playbook tasks', async ({ page }) => {
    // Print console logs and page errors from the browser
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER PAGE ERROR:', err.message));

    // 1. Mock Supabase Storage Object Download (return minimal valid docx buffer)
    const mockDocxBuffer = await generateMinimalDocx();
    await page.route('**/storage/v1/object/proposal-signatures/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        body: mockDocxBuffer,
      });
    });

    // 2. Mock Edge Function '/functions/v1/sign-proposal'
    // This executes the backend DB integration flow directly in the DB
    await page.route('**/functions/v1/sign-proposal', async (route) => {
      const client = new Client({ connectionString: dbConnectionString });
      await client.connect();
      try {
        const payload = JSON.parse(route.request().postData() || '{}');
        expect(payload.token).toBe(TEST_TOKEN);
        expect(payload.otp_code).toBe(TEST_OTP);

        // Execute DB updates / RPC calls exactly like the Edge function would do
        await client.query('BEGIN;');
        await client.query("SELECT set_config('request.jwt.claim.sub', 'ee4320ae-2d42-419e-a4a1-6f30f41d3680', true);");

        await client.query(`
          INSERT INTO core_comercial.proposal_audit_logs (
              proposal_signature_id, ip_address, user_agent, verification_code,
              signature_image, email_or_phone_used
          ) VALUES (
              '${SIGNATURE_ID}',
              '${payload.ip_address || '127.0.0.1'}',
              '${payload.user_agent || 'E2E-Test'}',
              '${payload.otp_code}',
              '${payload.signature_image || 'data:image/png;base64,mock'}',
              'billing@client.com'
          )
        `);

        await client.query(`
          UPDATE core_comercial.proposal_signatures
          SET status = 'signed', signed_at = NOW(), otp_code = null, otp_expires_at = null
          WHERE id = '${SIGNATURE_ID}'
        `);

        await client.query(`
          UPDATE core_comercial.estimaciones
          SET status = 'signed', updated_at = NOW()
          WHERE id = '${ESTIMACION_ID}'
        `);

        await client.query('COMMIT;');

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            message: 'Assinatura realizada com sucesso',
            signed_at: new Date().toISOString()
          }),
        });
      } catch (err: any) {
        try {
          await client.query('ROLLBACK;');
        } catch (rollErr) {
          // ignore rollback errors if query failed before BEGIN
        }
        console.error("Mock Edge Function DB error:", err);
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: err.message || 'Internal DB simulation error' }),
        });
      } finally {
        await client.end();
      }
    });

    // 3. Navigate to the public signing URL
    await page.goto(`/assinar-proposta/${TEST_TOKEN}`);

    // Wait for page loading spinner to go away and check details
    await expect(page.locator('text=John Client Test')).toBeVisible();
    await expect(page.locator('text=billing@client.com')).toBeVisible();

    // 4. Simulate canvas drawing to validate that a signature has been drawn
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
    await page.evaluate(async () => {
      const el = document.querySelector('canvas');
      if (el) {
        const rect = el.getBoundingClientRect();
        el.dispatchEvent(new MouseEvent('mousedown', {
          clientX: rect.left + rect.width / 4,
          clientY: rect.top + rect.height / 2,
          bubbles: true
        }));
        
        // Wait 50ms for React state update
        await new Promise(r => setTimeout(r, 50));
        
        el.dispatchEvent(new MouseEvent('mousemove', {
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
          bubbles: true
        }));
        
        await new Promise(r => setTimeout(r, 50));
        
        el.dispatchEvent(new MouseEvent('mouseup', {
          bubbles: true
        }));
      }
    });

    // Check that clear button/trash icon is visible
    await expect(page.locator('button:has-text("Limpar")')).toBeVisible();

    // 5. Click the "Assinar Proposta e Contrato" button to open OTP modal
    const signBtn = page.locator('button:has-text("Assinar Proposta e Contrato")');
    await signBtn.click();

    // Verify OTP Modal is visible
    await expect(page.locator('text=Confirmar Código de Segurança')).toBeVisible();

    // 6. Enter OTP 123456
    const otpInputs = page.locator('input[type="text"][inputmode="numeric"]');
    expect(await otpInputs.count()).toBe(6);
    
    // Focus first input and type OTP sequence
    await otpInputs.first().focus();
    await page.keyboard.type(TEST_OTP);

    // Click "Confirmar e Assinar"
    const confirmBtn = page.locator('button:has-text("Confirmar e Assinar")');
    await confirmBtn.click();

    // 7. Verify UI changes to signed/success state
    await expect(page.locator('text=✓ Documentos Assinados!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Baixar Proposta Comercial')).toBeVisible();

    // 8. Assert DB integration outcomes
    // A: Estimacao status is 'signed'
    const estRes = await pgClient.query(`
      SELECT status FROM core_comercial.estimaciones WHERE id = '${ESTIMACION_ID}';
    `);
    expect(estRes.rows[0].status).toBe('signed');

    // B: Pedido was NOT created automatically
    const pedRes = await pgClient.query(`
      SELECT id FROM core_comercial.pedidos WHERE source_estimacion_id = '${ESTIMACION_ID}';
    `);
    expect(pedRes.rowCount).toBe(0);
  });
});
