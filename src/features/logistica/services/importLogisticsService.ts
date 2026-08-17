import * as XLSX from 'xlsx';
import { logisticsService } from './logisticsService';
import type { Provedor, Alojamento } from './logisticsService';
import { contratosLogisticsService } from './contratosLogisticsService';
import type { ContratoAlojamento } from './contratosLogisticsService';

export interface ImportResult {
  provedoresImportados: number;
  alojamentosImportados: number;
  contratosImportados: number;
  erros: string[];
}

export interface ParsedSpreadsheet {
  sheetNames: string[];
  selectedSheet: string;
  headers: string[];
  rows: any[];
}

export interface SystemTargetField {
  key: string;
  label: string;
  required?: boolean;
  aliases?: string[];
}

export const TARGET_FIELDS: Record<string, SystemTargetField[]> = {
  provedores: [
    { key: 'nome_razao_social', label: 'Nome / Razão Social', required: true, aliases: ['nombre', 'razonsozial', 'provedor', 'fornecedor', 'nome', 'razão social'] },
    { key: 'nome_comercial', label: 'Nome Comercial', aliases: ['nombrecomercial', 'fantasia', 'comercial'] },
    { key: 'cif_nif', label: 'CIF / NIF / DNI', aliases: ['cifnif', 'cif', 'nif', 'dni', 'nie', 'documento'] },
    { key: 'tipo_pessoa', label: 'Tipo de Pessoa (Física/Jurídica)', aliases: ['tipoproveedor', 'tipo_pessoa', 'pessoa'] },
    { key: 'contato_nome', label: 'Nome do Contato Principal', aliases: ['nombrecontato', 'contacto', 'contato', 'responsavel'] },
    { key: 'telefone', label: 'Telefone', aliases: ['telefono', 'celular', 'fone', 'tel'] },
    { key: 'email', label: 'Email', aliases: ['correoelectronico', 'correo', 'e-mail'] },
    { key: 'iban', label: 'IBAN / Conta Bancária', aliases: ['iban', 'conta', 'pix'] },
    { key: 'banco', label: 'Banco', aliases: ['banco', 'bank'] },
    { key: 'swift', label: 'SWIFT / BIC', aliases: ['swift', 'bic'] },
    { key: 'titular_conta', label: 'Titular da Conta', aliases: ['titularbancario', 'titular', 'proprietario'] },
    { key: 'metodo_pago', label: 'Método de Pagamento', aliases: ['metodopago', 'formapagamento', 'pagamento'] },
    { key: 'endereco', label: 'Endereço Fiscal / Calle', aliases: ['direccionhospedaje', 'direccion', 'ubicacionfiscal', 'endereco', 'calle'] },
    { key: 'municipio', label: 'Município / Cidade', aliases: ['ciudad', 'municipio', 'cidade'] },
    { key: 'provincia', label: 'Província / Estado', aliases: ['provincia', 'estado'] },
    { key: 'pais', label: 'País', aliases: ['pais', 'country'] }
  ],
  alojamentos: [
    { key: 'nome', label: 'Nome / Título do Alojamento', required: true, aliases: ['nomealojamiento', 'nombrealojamiento', 'alojamiento', 'imovel', 'titulo', 'direccion hospedaje', 'direccion'] },
    { key: 'codigo', label: 'Código Alojamento', aliases: ['codalojamiento', 'codigo'] },
    { key: 'endereco', label: 'Endereço Completo', aliases: ['direcion', 'direccionhospedaje', 'direccion', 'calle', 'endereco'] },
    { key: 'municipio', label: 'Cidade / Município', aliases: ['cidade', 'ciudad', 'municipio'] },
    { key: 'provincia', label: 'Província', aliases: ['provincia', 'estado'] },
    { key: 'pais', label: 'País', aliases: ['pais', 'country'] },
    { key: 'capacidade_pessoas', label: 'Capacidade (Pessoas)', aliases: ['cappersonas', 'capacidade', 'pessoas'] },
    { key: 'dormitorios', label: 'Qtde Dormitórios', aliases: ['dormitorios', 'quartos'] },
    { key: 'total_camas', label: 'Total de Camas', aliases: ['qtdecamas', 'camas', 'totalcamas'] },
    { key: 'camas_individuais', label: 'Camas Individuais', aliases: ['qtdecamasindividuales', 'individuais'] },
    { key: 'camas_duplas', label: 'Camas Duplas', aliases: ['qtdecamasdoble', 'duplas'] },
    { key: 'banheiros', label: 'Qtde Banheiros', aliases: ['qtdebanos', 'banheiros', 'banos'] },
    { key: 'provedor_nome', label: 'Nome/Código do Provedor', aliases: ['provedor', 'codprovedor', 'contacto', 'nombre', 'proprietario'] }
  ],
  contratos: [
    { key: 'codigo', label: 'Código do Contrato', required: true, aliases: ['codcontrato', 'codigo', 'contrato'] },
    { key: 'titular', label: 'Titular do Contrato', aliases: ['titular', 'proprietario', 'nombre', 'nome'] },
    { key: 'valor_mensal', label: 'Valor Mensal (€)', aliases: ['valormensal', 'alquiler', 'costofijo', 'valor'] },
    { key: 'fianza_valor', label: 'Valor Fiança (€)', aliases: ['fianzavalor', 'fiança', 'fianza'] },
    { key: 'data_inicio', label: 'Data Início', aliases: ['fechainicio', 'inicio', 'data_inicio'] },
    { key: 'data_fim', label: 'Data Fim', aliases: ['fechafin', 'fim', 'data_fim'] },
    { key: 'dia_vencimento', label: 'Dia Vencimento', aliases: ['diavencimento', 'vencimento'] },
    { key: 'iban_cobranca', label: 'IBAN Cobrança', aliases: ['ibancobranca', 'iban'] }
  ]
};

export const importLogisticsService = {
  // 1. Ler arquivo Excel/CSV e extrair abas com pontuação inteligente de detecção da aba correta
  async parseSpreadsheet(file: File, sheetNameRequested?: string, entityType: string = 'provedores'): Promise<ParsedSpreadsheet> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const buffer = e.target?.result;
          if (!buffer) {
            reject(new Error('Falha ao carregar conteúdo da planilha.'));
            return;
          }

          const workbook = XLSX.read(buffer, { type: 'binary' });
          const sheetNames = workbook.SheetNames;

          if (!sheetNames || sheetNames.length === 0) {
            reject(new Error('Nenhuma aba encontrada na planilha.'));
            return;
          }

          let targetSheetName = sheetNameRequested || sheetNames[0];

          // Se nenhuma aba foi especificada pelo usuário, calcula a pontuação para encontrar a aba ideal
          if (!sheetNameRequested && sheetNames.length > 1) {
            let maxScore = -1;

            for (const sName of sheetNames) {
              const testSheet = workbook.Sheets[sName];
              const testRows: any[] = XLSX.utils.sheet_to_json(testSheet, { defval: '' });
              
              if (testRows && testRows.length > 0) {
                const keys = Object.keys(testRows[0]).map(k => k.toUpperCase().trim());
                let score = 0;

                if (entityType === 'provedores') {
                  if (keys.includes('IBAN')) score += 10;
                  if (keys.includes('NOMBRE') || keys.includes('RAZON') || keys.includes('PROVEDOR')) score += 5;
                  if (keys.includes('CONTACTO')) score += 3;
                  if (keys.includes('DIRECCION HOSPEDAJE') || keys.includes('DIRECCION')) score += 2;
                  if (keys.includes('PAIS')) score += 1;
                } else if (entityType === 'alojamentos') {
                  if (keys.includes('DIRECCION HOSPEDAJE') || keys.includes('DIRECCION')) score += 8;
                  if (keys.includes('NOMBRE') || keys.includes('NOME')) score += 5;
                  if (keys.includes('CAMAS') || keys.includes('CAPACIDADE')) score += 5;
                  if (keys.includes('PAIS') || keys.includes('CIUDAD')) score += 2;
                }

                if (score > maxScore) {
                  maxScore = score;
                  targetSheetName = sName;
                }
              }
            }
          }

          const sheet = workbook.Sheets[targetSheetName];
          const rawRows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

          if (!rawRows || rawRows.length === 0) {
            reject(new Error(`A aba "${targetSheetName}" está vazia.`));
            return;
          }

          // Filtrar cabeçalhos (evitando colunas vazias como __EMPTY se houverem colunas válidas)
          const allHeaders = Object.keys(rawRows[0]);
          const cleanHeaders = allHeaders.filter(h => h && !h.startsWith('__EMPTY'));
          const finalHeaders = cleanHeaders.length > 0 ? cleanHeaders : allHeaders;

          resolve({
            sheetNames,
            selectedSheet: targetSheetName,
            headers: finalHeaders,
            rows: rawRows
          });
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (err) => reject(err);
      reader.readAsBinaryString(file);
    });
  },

  // 2. Auto-mapear colunas inteligentes com suporte a apelidos da planilha Matriz
  autoMapColumns(entityType: string, spreadsheetHeaders: string[]): Record<string, string> {
    const targetFields = TARGET_FIELDS[entityType] || [];
    const mapping: Record<string, string> = {};

    targetFields.forEach(field => {
      const matchedHeader = spreadsheetHeaders.find(header => {
        const cleanHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanKey = field.key.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (cleanHeader === cleanKey) return true;
        if (field.aliases?.some(alias => cleanHeader.includes(alias.toLowerCase().replace(/[^a-z0-9]/g, '')))) {
          return true;
        }
        return false;
      });

      if (matchedHeader) {
        mapping[field.key] = matchedHeader;
      } else {
        mapping[field.key] = '';
      }
    });

    return mapping;
  },

  // 3. Executar importação em lote com mapeamento
  async executeMappedImport(
    entityType: string,
    rows: any[],
    columnMapping: Record<string, string>
  ): Promise<ImportResult> {
    const result: ImportResult = {
      provedoresImportados: 0,
      alojamentosImportados: 0,
      contratosImportados: 0,
      erros: []
    };

    if (entityType === 'provedores') {
      for (const row of rows) {
        try {
          const getValue = (key: string) => {
            const colName = columnMapping[key];
            return colName ? String(row[colName] || '').trim() : '';
          };

          const nomeRazao = getValue('nome_razao_social');
          if (!nomeRazao) continue;

          const p: Partial<Provedor> = {
            codigo: `PV-${Math.floor(1000 + Math.random() * 9000)}`,
            nome_razao_social: nomeRazao,
            nome_comercial: getValue('nome_comercial') || nomeRazao,
            cif_nif: getValue('cif_nif'),
            tipo: 'alojamento',
            tipo_provedor: 'Proveedor Alojamiento',
            tipo_pessoa: getValue('tipo_pessoa')?.includes('Física') ? 'Persona Física' : 'Persona Jurídica',
            classificacao: 'Proveedor Alojamiento',
            contato_nome: getValue('contato_nome'),
            telefone: getValue('telefone'),
            email: getValue('email'),
            iban: getValue('iban'),
            banco: getValue('banco'),
            swift: getValue('swift'),
            titular_conta: getValue('titular_conta') || nomeRazao,
            metodo_pago: getValue('metodo_pago') || 'Transferir',
            endereco: getValue('endereco'),
            municipio: getValue('municipio'),
            provincia: getValue('provincia'),
            pais: getValue('pais') || 'España',
            status: 'Activo'
          };

          await logisticsService.createProvedor(p);
          result.provedoresImportados++;
        } catch (err: any) {
          result.erros.push(`Provedor [${row[columnMapping['nome_razao_social']] || 'Item'}]: ${err.message || 'Erro de gravação'}`);
        }
      }
    } else if (entityType === 'alojamentos') {
      for (const row of rows) {
        try {
          const getValue = (key: string) => {
            const colName = columnMapping[key];
            return colName ? String(row[colName] || '').trim() : '';
          };

          const nome = getValue('nome');
          if (!nome) continue;

          const a: Partial<Alojamento> = {
            codigo: getValue('codigo') || `AL-${Math.floor(1000 + Math.random() * 9000)}`,
            nome: nome,
            tipo_alojamento: 'Fijo',
            classificacao: 'Privado',
            capacidade_pessoas: parseInt(getValue('capacidade_pessoas')) || 0,
            dormitorios: parseInt(getValue('dormitorios')) || 0,
            total_camas: parseInt(getValue('total_camas')) || 0,
            camas_individuais: parseInt(getValue('camas_individuais')) || 0,
            camas_duplas: parseInt(getValue('camas_duplas')) || 0,
            banheiros: parseInt(getValue('banheiros')) || 0,
            endereco: getValue('endereco'),
            municipio: getValue('municipio'),
            provincia: getValue('provincia'),
            pais: getValue('pais') || 'España',
            status: 'ativo'
          };

          await logisticsService.createAlojamento(a);
          result.alojamentosImportados++;
        } catch (err: any) {
          result.erros.push(`Alojamento: ${err.message || 'Erro de gravação'}`);
        }
      }
    } else if (entityType === 'contratos') {
      for (const row of rows) {
        try {
          const getValue = (key: string) => {
            const colName = columnMapping[key];
            return colName ? String(row[colName] || '').trim() : '';
          };

          const codigo = getValue('codigo');
          if (!codigo) continue;

          const c: Partial<ContratoAlojamento> = {
            codigo: codigo,
            titular: getValue('titular'),
            tipo_contrato: 'Fijo',
            valor_mensal: parseFloat(getValue('valor_mensal').replace('.', '').replace(',', '.')) || 0,
            fianza_valor: parseFloat(getValue('fianza_valor').replace('.', '').replace(',', '.')) || 0,
            data_inicio: getValue('data_inicio'),
            data_fim: getValue('data_fim'),
            dia_vencimento: parseInt(getValue('dia_vencimento')) || 1,
            iban_cobranca: getValue('iban_cobranca'),
            status: 'Activo'
          };

          await contratosLogisticsService.createContrato(c);
          result.contratosImportados++;
        } catch (err: any) {
          result.erros.push(`Contrato: ${err.message || 'Erro de gravação'}`);
        }
      }
    }

    return result;
  }
};
