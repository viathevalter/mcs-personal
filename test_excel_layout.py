import pandas as pd
import json

file_path = r'C:\Projetos IA\Kotrik\mcs-personal\dados_sharepoint\Control IBAN att.xlsx'
df = pd.read_excel(file_path, sheet_name='Control General', header=None)

output = []
for i in range(2, 6):
    row_list = df.iloc[i].tolist()
    row_clean = [str(x) if str(x) != 'nan' else '' for x in row_list]
    output.append({f"ROW_{i}": row_clean})

with open('excel_head.json', 'w', encoding='utf-8') as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

print("Dumped Control General head to excel_head.json.")
