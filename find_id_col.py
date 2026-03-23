import pandas as pd

file_path = r'C:\Projetos IA\Kotrik\mcs-personal\dados_sharepoint\Control IBAN att.xlsx'
df = pd.read_excel(file_path, header=None)

found_cols = set()

for idx, row in df.iterrows():
    for col_idx in range(len(row)):
        val = str(row[col_idx]).strip()
        if val.startswith('E') and len(val) == 5 and val[1:].isdigit():
            # Looks like E0530
            print(f"Row {idx}: Found ID {val} at column {col_idx}")
            found_cols.add(col_idx)
            if len(found_cols) >= 3:
                break
    if len(found_cols) >= 1 and count > 10:
        pass # just sample some

print("Columns containing IDs:", found_cols)
