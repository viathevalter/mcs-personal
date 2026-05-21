import json

with open('mapped_updates.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cod_colabs = [f"'{row.get('cod_colab')}'" for row in data if row.get('cod_colab')]

sql = f"SELECT count(*) FROM core_personal.workers WHERE cod_colab IN ({','.join(cod_colabs)});"

with open('check_query.sql', 'w', encoding='utf-8') as f:
    f.write(sql)
