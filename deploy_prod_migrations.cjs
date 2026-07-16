const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const prodConnectionStrings = [
  'postgresql://postgres.unbepkdzvsfvylnysrcq:Stkrt%402026%23%40%23@aws-1-eu-west-1.pooler.supabase.com:5432/postgres',
  'postgresql://postgres:Stkrt%402026%23%40%23@db.unbepkdzvsfvylnysrcq.supabase.co:5432/postgres'
];

const migrationsToRun = [
  '20260415000000_bloco3_registro_general.sql',
  '20260515120000_bloco3_registro_general.sql',
  '20260515120000_bloco3_registro_general_v2.sql',
  '20260515120000_bloco3_registro_general_v21.sql',
  '20260515120000_bloco3_registro_general_v22.sql',
  '20260515120000_bloco3_registro_general_v23_fix_roles.sql',
  '20260515120000_bloco3_registro_general_v24_data_migration.sql',
  '20260516000000_bloco3_add_empresas_fields.sql',
  '20260516160000_bloco4_mcs_comercial_v3.sql',
  '20260516161500_add_code_to_playbook_steps.sql',
  '20260516170000_create_rpc_iniciar_playbook.sql',
  '20260516180000_create_rpc_iniciar_playbook_v2.sql',
  '20260516190000_create_rpc_aprovar_estimacion.sql',
  '20260516190000_create_rpc_aprovar_estimacion_v2.sql',
  '20260516200000_create_rpcs_tarefas_operacionais.sql',
  '20260516200000_create_rpcs_tarefas_operacionais_v2.sql',
  '20260516210000_create_rpc_criar_estimacion_completa.sql',
  '20260517000000_fix_rls_super_admin.sql',
  '20260517000001_fix_global_super_admin.sql',
  '20260517000002_global_epis_catalog.sql',
  '20260517000003_global_job_functions_catalog.sql',
  '20260518000000_fix_estimacion_versions_status.sql',
  '20260518000000_global_clients_catalog.sql',
  '20260518000001_operational_targets.sql',
  '20260518000002_rpc_solicitud_targets.sql',
  '20260519000000_rpc_alocar_trabalhador.sql',
  '20260520000000_contracts_schema.sql',
  '20260520000001_contracts_storage.sql',
  '20260520000002_public_contracts_storage_policy.sql',
  '20260520000003_document_capture_schema.sql',
  '20260522100000_create_vw_worker_allocations.sql',
  '20260522110000_comercial_leads_and_proposal_signing.sql',
  '20260522120000_add_postal_code_to_estimaciones.sql',
  '20260522130000_add_proposal_rls_anonymous.sql',
  '20260522140000_fix_estimacion_versions_status_rpc.sql',
  '20260523141000_create_safetyprev_schema.sql',
  '20260525160000_add_country_id_to_estimaciones_and_pedidos.sql',
  '20260525170000_comercial_lodging_and_taxes.sql',
  '20260525171000_add_ss_regime_to_items.sql',
  '20260525172000_fix_lodging_rls_policy.sql',
  '20260525173000_seasonal_regional_lodging.sql',
  '20260525180000_commercial_contracts.sql',
  '20260526101500_add_empresas_write_rls.sql',
  '20260527000000_compliance_cae_schema.sql',
  '20260528120000_add_signed_to_estimacion_status.sql',
  '20260606152000_add_rpc_atualizar_estimacion.sql',
  '20260608090000_add_custom_epi_and_transport_rates.sql',
  '20260608100000_add_manager_approval_to_estimaciones.sql',
  '20260608110000_comercial_settings_and_client_finance.sql',
  '20260608170000_add_document_language_to_estimaciones.sql',
  '20260608180000_update_rpcs_for_document_language.sql',
  '20260609080000_create_rpc_criar_nova_versao_estimacion.sql',
  '20260609090000_add_custom_contract_fields_to_estimaciones.sql',
  '20260609130000_add_working_schedule_and_additional_revenues.sql',
  '20260610100000_add_individual_weekday_hours.sql',
  '20260610102000_fix_aprovar_estimacion_solicitudes.sql',
  '20260610161000_add_worker_sizes_and_rate_to_assignments.sql',
  '20260610170000_add_options_to_job_function_questions.sql',
  '20260612080000_fill_contratante_during_allocation.sql',
  '20260612081000_fix_workers_functions_overload.sql',
  '20260612140000_add_planned_end_date_to_allocation.sql',
  '20260618100000_fix_solicitud_targets_and_add_pedido_language.sql',
  '20260618110000_make_playbook_optional_on_iniciar_playbook.sql',
  '20260618141500_complete_solicitud_target_on_allocation.sql',
  '20260618142500_fix_replacement_limit_and_terminate_assignment.sql',
  '20260618162000_allow_signed_on_aprovar_estimacion.sql',
  '20260621132754_core_finance_schema.sql',
  '20260621151000_faturamento_e_extracao_horas.sql',
  '20260621160000_fix_faturamento_tables.sql',
  '20260621183432_add_faturamento_details.sql',
  '20260622000000_core_logistics_schema.sql',
  '20260622120000_client_flow_adjustments.sql',
  '20260622150000_client_contacts.sql',
  '20260623110000_add_housing_fields_to_solicitud_targets.sql',
  '20260623124000_add_requires_replacement_to_solicitud_targets.sql',
  '20260625100000_sequence_generation.sql',
  '20260625110000_update_allocate_worker_duplicate_check.sql',
  '20260625140000_automatic_compliance_sync.sql',
  '20260627110000_client_vies_integration.sql',
  '20260628142000_create_bancos_table.sql',
  '20260628143000_ordens_pagamento_e_pagos.sql',
  '20260701161500_comercial_marketing_and_crm.sql',
  '20260701171000_add_crm_fields_to_leads.sql',
  '20260703141500_fix_rpc_allocation_pedido_id.sql',
  '20260703142000_fix_rpc_allocation_job_function_id.sql',
  '20260703142200_fix_rpc_allocation_operational_status.sql',
  '20260704103000_create_core_operacoes_views.sql',
  '20260705093500_add_cobranca_email_to_empresas.sql',
  '20260705120000_order_extension_and_termination.sql',
  '20260705130000_order_postponement_and_notifications.sql',
  '20260708130000_update_pedidos_on_solicitud_completion.sql',
  '20260708140000_auto_complete_date_change_solicitudes.sql',
  '20260708150000_update_aprovar_estimacion_dates.sql',
  '20260708160000_unify_sequential_codes.sql',
  '20260708170000_fix_alocar_trabalhador_rpc_for_global_workers.sql',
  '20260709160000_fix_get_global_movement_history.sql',
  '20260709170000_fix_salary_report_workers_empresa_id.sql',
  '20260709180000_create_authenticate_worker_rpc.sql',
  '20260716150000_unify_vidal_amill_client.sql',
  '20260716160000_fix_get_hours_control_workers_company.sql'
];

async function run() {
    let client;
    let connected = false;
    for (const connStr of prodConnectionStrings) {
        const masked = connStr.replace(/:[^:@]+@/, ':***@');
        console.log(`Connecting to PROD database using: ${masked}...`);
        try {
            client = new Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
            await client.connect();
            console.log("Connected to PROD database successfully!");
            connected = true;
            break;
        } catch (e) {
            console.warn(`Connection failed: ${e.message}`);
        }
    }
    if (!connected) {
        console.error("All production connection attempts failed.");
        process.exit(1);
    }
    try {
        console.log("Running pre-migration tasks...");
        
        // Manually record the first two which we know ran successfully
        await client.query(`
            INSERT INTO supabase_migrations.schema_migrations (version) 
            VALUES ('20260415000000'), ('20260515120000')
            ON CONFLICT (version) DO NOTHING;
        `);
        console.log("Recorded pre-executed migrations.");
        
        // Fetch all applied migrations
        const appliedRes = await client.query("SELECT version FROM supabase_migrations.schema_migrations;");
        const appliedVersions = new Set(appliedRes.rows.map(r => r.version));
        
        for (const file of migrationsToRun) {
            const version = file.match(/^(\d+)_/)[1];
            if (appliedVersions.has(version)) {
                console.log(`Skipping already applied migration: ${file}`);
                continue;
            }
            
            console.log(`\n======================================================`);
            console.log(`Running migration: ${file}`);
            console.log(`======================================================`);
            
            const filePath = path.resolve(__dirname, 'supabase', 'migrations', file);
            if (!fs.existsSync(filePath)) {
                console.error(`Error: File not found: ${filePath}`);
                process.exit(1);
            }
            
            const sql = fs.readFileSync(filePath, 'utf8');
            
            // Execute the migration SQL
            try {
                await client.query(sql);
                console.log(`Migration ${file} completed successfully.`);
                
                // Record the migration in supabase_migrations.schema_migrations
                await client.query(`
                    INSERT INTO supabase_migrations.schema_migrations (version) 
                    VALUES ($1)
                    ON CONFLICT (version) DO NOTHING;
                `, [version]);
                
            } catch (err) {
                console.error(`Migration ${file} FAILED with error:`, err.message);
                console.error(`Stopping migration run.`);
                process.exit(1);
            }
        }
        
        console.log("\nAll migrations deployed successfully to PROD database!");
        
    } catch (err) {
        console.error("Connection/Query error:", err.message);
    } finally {
        await client.end();
    }
}

run();
