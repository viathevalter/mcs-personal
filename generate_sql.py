import json
import re

with open('workers_db.json', 'r', encoding='utf-8') as f:
    raw_content = json.load(f)["result"]

# Simply find the first '[' and last ']'
start_idx = raw_content.find('[')
end_idx = raw_content.rfind(']')

if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
    json_str = raw_content[start_idx:end_idx+1]
    try:
        workers = json.loads(json_str)
    except json.JSONDecodeError as e:
        print("JSON Decode Error:", e)
        print("String preview:", json_str[:100])
        exit(1)
else:
    print("Could not find JSON array.")
    exit(1)

worker_map = {}
for w in workers:
    cod = str(w.get('cod_colab', '')).strip().upper()
    worker_map[cod] = w['id']

with open('temp_iban_import.json', 'r', encoding='utf-8') as f:
    ibans = json.load(f)

found = 0
not_found = []
worker_ids_to_update = []
inserts = []
processed_ids = set()

for item in ibans:
    cod = item['cod']
    if cod in worker_map:
        if cod in processed_ids:
            continue
        processed_ids.add(cod)
        
        worker_id = worker_map[cod]
        worker_ids_to_update.append(f"'{worker_id}'")
        
        iban = item['iban'].replace("'", "''")
        banco = item['banco'].replace("'", "''") if item['banco'] else ''
        obs = item['obs'].replace("'", "''") if item['obs'] else ''
        
        insert_line = f"('{worker_id}', '{banco}', '{iban}', 'ATIVO', '{obs}')"
        inserts.append(insert_line)
        found += 1
    else:
        if cod not in not_found:
            not_found.append(cod)

print(f"Matched {found} out of {len(ibans)}.")
if not_found:
    print(f"Not found ({len(not_found)}): {not_found[:10]}...")

sql = "-- 1. Set all existing ATIVO ibans for these workers to INATIVO\n"
sql += f"UPDATE core_personal.worker_ibans\nSET status = 'INATIVO', updated_at = NOW()\nWHERE status = 'ATIVO' AND worker_id IN ({','.join(worker_ids_to_update)});\n\n"

sql += "-- 2. Insert the new IBAN records\n"
sql += "INSERT INTO core_personal.worker_ibans (worker_id, banco, iban, status, observacoes) VALUES\n"
sql += ",\n".join(inserts) + ";\n"

with open('update_ibans.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
print("Saved update_ibans.sql")
