import pandas as pd
import json
import re

file_path = r'C:\Projetos IA\Kotrik\mcs-personal\dados_sharepoint\Control IBAN att.xlsx'

df = pd.read_excel(file_path, header=None)
pairs = []

for idx, row in df.iterrows():
    for col_idx in range(len(row)):
        val = str(row[col_idx]).strip()
        clean_val = val.replace(" ", "")
        if re.match(r'^[A-Z]{2}[0-9A-Z]{13,}', clean_val):
            if col_idx > 0:
                name = str(row[col_idx - 1]).strip()
                if name and name != 'nan':
                    banco = 'Banco Não Informado'
                    if clean_val.startswith('PT'): banco = 'Banco Português'
                    elif clean_val.startswith('ES'): banco = 'Banco Espanhol'
                    elif clean_val.startswith('BE'): banco = 'Banco Belga'
                    elif clean_val.startswith('NL'): banco = 'Banco Holandês'
                    
                    pairs.append({
                        "name": name,
                        "iban": clean_val,
                        "banco": banco
                    })

with open('ibans_to_import.json', 'w', encoding='utf-8') as f:
    json.dump(pairs, f, ensure_ascii=False, indent=2)

print(f"Generated JSON for {len(pairs)} records.")
