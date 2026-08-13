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

export const importLogisticsService = {
  async processFile(file: File): Promise<ImportResult> {
    const result: ImportResult = {
      provedoresImportados: 0,
      alojamentosImportados: 0,
      contratosImportados: 0,
      erros: []
    };

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const buffer = e.target?.result;
          if (!buffer) {
            reject(new Error('Falha ao ler arquivo.'));
            return;
          }

          const workbook = XLSX.read(buffer, { type: 'binary' });
          
          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const data: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

            if (!data || data.length === 0) continue;

            const sample = data[0];
            const keys = Object.keys(sample).map(k => k.toLowerCase());

            // Identificar tipo de planilha pelos cabeçalhos
            if (keys.includes('razonsozial') || keys.includes('codprovedor') || keys.includes('nome_razao_social')) {
              // Importar Provedores
              for (const row of data) {
                try {
                  const p: Partial<Provedor> = {
                    codigo: row.CodProvedor || row.codigo || `PV-${Math.floor(1000 + Math.random() * 9000)}`,
                    nome_razao_social: row.RazonSozial || row.nome_razao_social || row.NombreComercial || 'Provedor Sem Nome',
                    nome_comercial: row.NombreComercial || row.nome_comercial,
                    cif_nif: row.CifNif || row.DniNie || row.NIF,
                    contato_nome: row.NombreContato || row.contato_nome,
                    telefone: row.Telefono || row.telefone,
                    email: row.CorreoElectronico || row.email,
                    iban: row.IBAN || row.iban,
                    banco: row.Banco || row.banco,
                    swift: row.Swift || row.swift,
                    titular_conta: row.TitularBancario || row.titular_conta,
                    tipo_provedor: row.TipoProveedor || 'Persona Jurídica',
                    classificacao: row.ClassificacionProveedor || 'Proveedor Alojamiento',
                    endereco: row.UbicacionFiscal || row.endereco,
                    municipio: row.Municipio || row.municipio,
                    pais: row.Pais || 'España',
                    status: row.StatusProveedores === 'Bosquejo' ? 'Inactivo' : 'Activo'
                  };

                  await logisticsService.createProvedor(p);
                  result.provedoresImportados++;
                } catch (err: any) {
                  result.erros.push(`Provedor [${row.RazonSozial || row.CodProvedor}]: ${err.message || 'Erro'}`);
                }
              }
            } else if (keys.includes('nomealojamiento') || keys.includes('codalojamiento') || keys.includes('total_camas')) {
              // Importar Alojamentos
              for (const row of data) {
                try {
                  const a: Partial<Alojamento> = {
                    codigo: row.CodAlojamiento || `AL-${Math.floor(1000 + Math.random() * 9000)}`,
                    nome: row.NomeAlojamiento || row.nome || row.NombreAlojamiento || 'Alojamento Sem Nome',
                    tipo_alojamento: row.TipoAlojamiento || 'Fijo',
                    classificacao: row.Classificacion || 'Privado',
                    capacidade_pessoas: parseInt(row.CapPersonas || row.capacidade_pessoas || '0') || 0,
                    dormitorios: parseInt(row.Dormitorios || '0') || 0,
                    total_camas: parseInt(row.QtdeCamas || row.total_camas || '0') || 0,
                    camas_individuais: parseInt(row.QtdeCamasIndividuales || '0') || 0,
                    camas_duplas: parseInt(row.QtdeCamasDoble || '0') || 0,
                    banheiros: parseInt(row.QtdeBanos || '0') || 0,
                    endereco: row.Direcion || row.endereco,
                    municipio: row.Cidade || row.municipio,
                    provincia: row.Provincia || row.provincia,
                    pais: row.Pais === '1' ? 'España' : row.Pais === '3' ? 'Italia' : 'España',
                    status: row.StatusAlojamiento === 'Bosquejo' ? 'inativo' : 'ativo'
                  };

                  await logisticsService.createAlojamento(a);
                  result.alojamentosImportados++;
                } catch (err: any) {
                  result.erros.push(`Alojamento [${row.NomeAlojamiento || row.CodAlojamiento}]: ${err.message || 'Erro'}`);
                }
              }
            } else if (keys.includes('codcontrato') || keys.includes('valormensal')) {
              // Importar Contratos
              for (const row of data) {
                try {
                  const c: Partial<ContratoAlojamento> = {
                    codigo: row.CodContrato || `CT-${Math.floor(1000 + Math.random() * 9000)}`,
                    tipo_contrato: row.TipoContrato || 'Fijo',
                    valor_mensal: parseFloat((row.ValorMensal || '0').replace('.', '').replace(',', '.')) || 0,
                    fianza_valor: parseFloat((row.FianzaValor || '0').replace('.', '').replace(',', '.')) || 0,
                    dia_vencimento: parseInt(row.DiaVencimento || '1') || 1,
                    renovacao_automatica: row.RenovacionAutomatica === 'Sim',
                    aviso_rescisao_dias: parseInt(row.AvisoRescisaoDias || '30') || 30,
                    iban_cobranca: row.IbanCobranca,
                    titular: row.Titular,
                    status: row.StatusContrato === 'Activo' ? 'Activo' : 'Cerrado'
                  };

                  await contratosLogisticsService.createContrato(c);
                  result.contratosImportados++;
                } catch (err: any) {
                  result.erros.push(`Contrato [${row.CodContrato}]: ${err.message || 'Erro'}`);
                }
              }
            }
          }

          resolve(result);
        } catch (err) {
          reject(err);
        }
      };

      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  }
};
