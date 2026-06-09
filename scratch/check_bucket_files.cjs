const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://unbepkdzvsfvylnysrcq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVuYmVwa2R6dnNmdnlsbnlzcmNxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNTMzOTEsImV4cCI6MjA4OTkyOTM5MX0.WNFoECndTbEYSC23SBJQt3a7ut4qnCMeeubfy6K-6Vw';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    console.log("Listing PROD files in proposal-templates storage...");
    
    // Check root files
    const { data: rootFiles, error: err1 } = await supabase.storage
        .from('proposal-templates')
        .list();
    console.log("Root files:", rootFiles ? rootFiles.map(f => f.name) : [], err1 ? err1.message : "");

    // Check stocco folder
    const { data: stoccoFiles, error: err2 } = await supabase.storage
        .from('proposal-templates')
        .list('stocco');
    console.log("Stocco folder:", stoccoFiles ? stoccoFiles.map(f => f.name) : [], err2 ? err2.message : "");

    // Check stocco/es folder
    const { data: stoccoEsFiles, error: err3 } = await supabase.storage
        .from('proposal-templates')
        .list('stocco/es');
    console.log("Stocco/es folder:", stoccoEsFiles ? stoccoEsFiles.map(f => f.name) : [], err3 ? err3.message : "");

    // Check stocco/pt folder
    const { data: stoccoPtFiles, error: err4 } = await supabase.storage
        .from('proposal-templates')
        .list('stocco/pt');
    console.log("Stocco/pt folder:", stoccoPtFiles ? stoccoPtFiles.map(f => f.name) : [], err4 ? err4.message : "");
}

check().catch(err => console.error(err));
