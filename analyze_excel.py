import pandas as pd
import json

file_path = r'C:\Projetos IA\Kotrik\mcs-personal\dados_sharepoint\GENERAL CONTROL DE HORAS - FEBRERO 2026.xlsx'
xlsx = pd.ExcelFile(file_path)

data = {}
data['sheets'] = xlsx.sheet_names

for sheet in ['STOCCO', 'WISE', 'LUMI', 'TRIANGULO', 'KOTRIK']:
    try:
        df = pd.read_excel(xlsx, sheet_name=sheet)
        data[sheet] = {
            'columns': list(df.columns),
            'head': df.head(5).to_dict(orient='records')
        }
    except Exception as e:
        data[sheet] = {'error': str(e)}

with open('excel_analysis.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)
