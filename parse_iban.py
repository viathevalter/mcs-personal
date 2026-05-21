import pandas as pd
import json
import math

# Load Excel
file_path = r'C:\Projetos IA\Kotrik\mcs-personal\dados_sharepoint\Control IBAN att.xlsx'
df = pd.read_excel(file_path)

records = []
for index, row in df.iterrows():
    cod = str(row.get('ID', '')).strip().upper()
    if not cod or cod == 'NAN':
        continue
    
    iban = str(row.get('IBAN', '')).strip().upper()
    banco = str(row.get('BANCO', '')).strip()
    obs = str(row.get('OBSERVACIONES', '')).strip()
    
    if iban == 'NAN' or iban == '':
        continue
        
    records.append({
        'cod': cod,
        'iban': iban,
        'banco': banco if banco != 'nan' else '',
        'obs': obs if obs != 'nan' else ''
    })

print(f"Total valid IBANs to import: {len(records)}")
with open('temp_iban_import.json', 'w', encoding='utf-8') as f:
    json.dump(records, f, ensure_ascii=False, indent=2)
