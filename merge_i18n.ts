import fs from 'fs';
import { pt } from './temp-operacoes/src/locales/pt';
import { es } from './temp-operacoes/src/locales/es';

function deepMerge(target: any, source: any) {
  for (const key of Object.keys(source)) {
    if (source[key] instanceof Object && key in target) {
      Object.assign(source[key], deepMerge(target[key], source[key]));
    }
  }
  Object.assign(target || {}, source);
  return target;
}

function mergeLocales(lang: string, tsObj: any) {
  const jsonPath = `./src/i18n/locales/${lang}.json`;
  let jsonObj = {};
  if (fs.existsSync(jsonPath)) {
    jsonObj = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  }
  const merged = deepMerge(jsonObj, tsObj);
  fs.writeFileSync(jsonPath, JSON.stringify(merged, null, 2));
  console.log(`Merged ${lang}`);
}

mergeLocales('pt', pt);
mergeLocales('es', es);
