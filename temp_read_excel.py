import pandas as pd
import re
import json

file_path = r'C:\Projetos IA\Kotrik\mcs-personal\dados_sharepoint\Control IBAN att.xlsx'
df = pd.read_excel(file_path, sheet_name='Control General', header=None)

output = []
count = 0

for idx, row in df.iterrows():
    if len(row) > 9:
        worker_id = str(row[1]).strip()
        
        # ID is E plus digits
        if worker_id.startswith('E') and len(worker_id) <= 6:
            iban_val = str(row[3]).strip().replace(" ", "")
            banco_val = str(row[4]).strip()
            obs_val = str(row[9]).strip()
            
            if obs_val.lower() == 'nan':
                obs_val = ''
            
            # Simple IBAN validation
            if re.match(r'^[A-Z]{2}[0-9A-Z]{13,}', iban_val):
                banco = banco_val if banco_val and banco_val.lower() != 'nan' else 'Banco Não Informado'
                
                obs_final = "Importado via Planilha ID"
                if obs_val:
                    obs_final += f" - Obs RH: {obs_val}"
                
                output.append({
                    "cod_colab": worker_id,
                    "iban": iban_val,
                    "banco": banco,
                    "observacoes": obs_final
                })
                count += 1

with open(r'C:\Projetos IA\Kotrik\mcs-personal\ibans_batch.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print(f"Generated JSON for {count} valid IBANs.")
