const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

const dirPath = 'C:\\Projetos IA\\Kotrik\\mcs-personal\\temp-operacoes\\Presupuestos';

async function processFile(file, replacements) {
  const filePath = path.join(dirPath, file);
  console.log(`Processing file: ${file}`);
  const dataBuffer = fs.readFileSync(filePath);
  const zip = await JSZip.loadAsync(dataBuffer);
  
  let docXml = await zip.file('word/document.xml').async('text');
  
  let modified = false;
  for (const [target, replacement] of Object.entries(replacements)) {
    if (docXml.includes(target)) {
      console.log(`  Replacing "${target}" with "${replacement}"`);
      docXml = docXml.split(target).join(replacement);
      modified = true;
    } else {
      console.warn(`  WARNING: Tag "${target}" not found in ${file}!`);
    }
  }
  
  if (modified) {
    zip.file('word/document.xml', docXml);
    // Write back
    const outputBuffer = await zip.generateAsync({ type: 'nodebuffer' });
    fs.writeFileSync(filePath, outputBuffer);
    console.log(`  Successfully updated ${file}`);
  } else {
    console.log(`  No modifications made for ${file}`);
  }
}

async function run() {
  // 1. Luminous, Stocco, Wise
  const standardReplacements = {
    '{{PERFIL}}': '{{FOR item IN itens}}{{$item.funcao}}',
    '{{CANTIDAD}}': '{{$item.quantidade}}',
    '{{TARIFA_HORA}}': '{{$item.tarifa_venda}}',
    '{{OBSERVACION_PERFIL}}': '{{$item.horas_dia}}h/día, {{$item.dias_semana}}d/sem{{END-FOR item}}'
  };

  await processFile('modelo_presupuesto_luminous_valley_es.docx', standardReplacements);
  await processFile('modelo_presupuesto_stocco_es.docx', standardReplacements);
  await processFile('modelo_presupuesto_wise_services_es.docx', standardReplacements);

  // 2. Triangulo
  const trianguloReplacements = {
    '{{PERFIL_1}}': '{{FOR item IN itens}}{{$item.funcao}}',
    '{{CANTIDAD_1}}': '{{$item.quantidade}}',
    '{{TARIFA_HORA_1}}': '{{$item.tarifa_venda}}',
    '{{OBS_PERFIL_1}}': '{{$item.horas_dia}}h/día, {{$item.dias_semana}}d/sem{{END-FOR item}}'
  };

  await processFile('modelo_presupuesto_triangulo_es.docx', trianguloReplacements);
}

run().catch(err => console.error(err));
