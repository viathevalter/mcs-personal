import os
import re

d = r'C:\Users\theva\.gemini\antigravity\conversations'
uuid_pattern = re.compile(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', re.IGNORECASE)
secret_pattern = re.compile(r'.{0,30}client_secret.{0,80}', re.IGNORECASE)

print("Starting deep search for Azure AD UUIDs in all past conversations...")
for f in os.listdir(d):
    if not f.endswith('.pb'):
        continue
    filepath = os.path.join(d, f)
    try:
        with open(filepath, 'rb') as file:
            content = file.read().decode('utf-8', errors='ignore')
            
            uuids = set(uuid_pattern.findall(content))
            secrets = set(secret_pattern.findall(content))
            
            if uuids or secrets:
                # We only want to print ones that actually have interesting matches
                if uuids:
                    print(f"\n--- Found UUIDs in {f} ---")
                    for u in uuids:
                        print(u)
                
                # Check for things looking like the client secret (often base64 strings ~40 chars)
                # Client Secret Microsoft Entra usually looks like `value~...`
                secret_matches = re.findall(r'[A-Za-z0-9_\-~]{30,50}', content)
                for sm in set(secret_matches):
                    if '~' in sm: # High probability it's an Azure secret
                        print(f"Probable Azure Secret in {f}: {sm}")

    except Exception as e:
        print(f"Error reading {f}: {e}")

print("Search complete.")
