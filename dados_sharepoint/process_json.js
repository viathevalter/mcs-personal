import fs from 'fs';

try {
  const dataStr = fs.readFileSync('output.json', 'utf8');
  const data = JSON.parse(dataStr);
  
  if (data.length === 0) {
    console.log("Planilha vazia.");
    process.exit(0);
  }
  
  const keys = Object.keys(data[0]);
  console.log("Colunas encontradas:");
  console.log(keys);
  
  let codKey = keys.find(k => k.toLowerCase().includes('cod'));
  let dateKey = keys.find(k => k.toLowerCase().includes('nasc') || k.toLowerCase().includes('nacim'));
  let shirtKey = keys.find(k => k.toLowerCase().includes('camis') || k.toLowerCase().includes('talla superior'));
  let pantsKey = keys.find(k => k.toLowerCase().includes('pant') || k.toLowerCase().includes('calç') || k.toLowerCase().includes('talla inferi'));
  
  console.log("Mapeamento inferido:", { codKey, dateKey, shirtKey, pantsKey });
  
  if (!codKey) {
   codKey = keys[0];
  }

  const mapped = data.filter(r => r[codKey]).map(r => ({
    cod_colab: r[codKey] || null,
    fecha_nacimiento: dateKey ? (r[dateKey] || null) : null,
    camiseta: shirtKey ? (r[shirtKey] || null) : null,
    pantalones: pantsKey ? (r[pantsKey] || null) : null
  }));
  
  console.log(`Total mapeadas com código: ${mapped.length}`);
  console.log("Amostra:");
  console.log(mapped.slice(0, 3));
  
  fs.writeFileSync('mapped_updates.json', JSON.stringify(mapped, null, 2));
} catch (err) {
  console.error(err);
}
