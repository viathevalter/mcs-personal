import pandas as pd

file_path = r'C:\Projetos IA\Kotrik\mcs-personal\dados_sharepoint\Control IBAN att.xlsx'
df = pd.read_excel(file_path, header=None)

for idx, row in df.iterrows():
    for col_idx in range(len(row)):
        val = str(row[col_idx]).strip()
        if 'E0530' in val:
            print(f"Row {idx}: Found '{val}' at column {col_idx}")

print("Search finished.")
