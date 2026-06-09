const { createClient } = require('@supabase/supabase-js');
const JSZip = require('jszip');

const supabaseUrl = 'https://pyahcgorkvwfwmlzspnv.supabase.co';
const supabaseAnonKey = 'sb_publishable_tq8hA_C8ETTM--m3jFCeLA_ikiqwsSx';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  const path = 'ec7d5968-22b8-4bb1-8184-ec3bf03f6ca2/proposta_1780933717528.docx';
  console.log(`Downloading generated docx: ${path}`);
  
  const { data, error } = await supabase.storage
    .from('proposal-signatures')
    .download(path);
    
  if (error) {
    console.error("Download error:", error);
    return;
  }
  
  const arrayBuffer = await data.arrayBuffer();
  const zip = await JSZip.loadAsync(arrayBuffer);
  const docXml = await zip.file('word/document.xml').async('text');
  
  console.log("Includes 'Stocco'?", docXml.includes('Stocco'));
  console.log("Includes 'PRESUPUESTO ANEXO'?", docXml.includes('PRESUPUESTO ANEXO'));
  console.log("Includes 'Aptos Display'?", docXml.includes('Aptos Display'));
  
  // Print first 500 characters of clean text
  const cleanText = docXml.replace(/<[^>]+>/g, '');
  console.log("Document clean text preview:\n", cleanText.substring(0, 1000));
}

run().catch(err => console.error(err));
