import psycopg2

db_url = "postgres://postgres.ntdizrvttovqowavfctf:789qwe!%40%23MASTER@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

print("Connecting to db...")
conn = psycopg2.connect(db_url)
cursor = conn.cursor()

print("Reading sql file...")
with open('update_script.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

print("Executing SQL statements...")
import time
start = time.time()
cursor.execute(sql)
conn.commit()

# Print affected rows if possible, or just log success.
print(f"Update done successfully in {time.time() - start:.2f}s!")

cursor.close()
conn.close()
