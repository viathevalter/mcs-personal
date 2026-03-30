import json
from datetime import datetime
import pandas as pd # only to make sure we parse epoch right if needed, but standard python works

with open('mapped_updates.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

sql_statements = []

for row in data:
    cod = row.get('cod_colab')
    
    if not cod:
        continue
        
    updates = []
    
    cam = row.get('camiseta')
    if pd.notna(cam) and cam:
        cam_safe = str(cam).replace("'", "''")
        updates.append(f"camiseta = '{cam_safe}'")
        
    pant = row.get('pantalones')
    if pd.notna(pant) and pant:
        pant_safe = str(pant).replace("'", "''")
        updates.append(f"pantalones = '{pant_safe}'")
        
    nasc = row.get('fecha_nacimiento')
    if pd.notna(nasc) and nasc:
        # Check if it's epoch (numeric)
        if isinstance(nasc, (int, float)):
            try:
                dt = datetime.fromtimestamp(nasc / 1000.0)
                nasc_str = dt.strftime('%d/%m/%Y')
                updates.append(f"fecha_nacimiento = '{nasc_str}'")
            except Exception as e:
                pass
        else:
            nasc_safe = str(nasc).replace("'", "''")
            updates.append(f"fecha_nacimiento = '{nasc_safe}'")

    if updates:
        set_clause = ", ".join(updates)
        sql_statements.append(f"UPDATE core_personal.workers SET {set_clause} WHERE cod_colab = '{cod}';")

with open('update_script.sql', 'w', encoding='utf-8') as f:
    f.write("\n".join(sql_statements))

print(f"Gerou {len(sql_statements)} instrucoes UPDATE.")
