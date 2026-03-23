import os
import requests
import json
from dotenv import load_dotenv

# Load env to get the token
load_dotenv(".env.local", override=True)
token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")

if not token:
    print("❌ Token not found in .env.local")
    exit(1)

# Clean token (remove AstraCS: prefix for Bearer auth if needed, usually Astra expects Bearer AstraCS:...)
# DevOps API expects: Authorization: Bearer AstraCS:...
headers = {
    "Authorization": f"Bearer {token}",
    "Content-Type": "application/json"
}

print(f"🔑 Using Token: {token[:15]}...")

print("\n📡 Connecting to Astra DevOps API to list databases...")
try:
    resp = requests.get("https://api.astra.datastax.com/v2/databases", headers=headers, timeout=10)
    
    if resp.status_code == 401:
        print("❌ 401 Unauthorized. Token invalid for DevOps API.")
        exit(1)
    
    if resp.status_code != 200:
        print(f"❌ API Error: {resp.status_code} - {resp.text}")
        exit(1)

    data = resp.json()
    dbs = data if isinstance(data, list) else data.get('data', []) # Astra V2 usually returns list

    print(f"✅ Found {len(dbs)} databases in your organization.")
    
    active_db = None
    
    for db in dbs:
        db_id = db.get("id")
        name = db.get("info", {}).get("name")
        region = db.get("info", {}).get("region")
        status = db.get("status")
        keyspace = db.get("info", {}).get("keyspaces", ["default_keyspace"])[0]
        
        # Construct Data API Endpoint
        # Format: https://<ID>-<REGION>.apps.astra.datastax.com
        endpoint = f"https://{db_id}-{region}.apps.astra.datastax.com"
        
        print(f"\n   📦 DB: {name}")
        print(f"      ID: {db_id}")
        print(f"      Status: {status}")
        print(f"      Region: {region}")
        print(f"      Keyspace: {keyspace}")
        print(f"      Endpoint: {endpoint}")
        
        if status == "ACTIVE":
            active_db = {
                "id": db_id,
                "region": region,
                "keyspace": keyspace,
                "endpoint": endpoint
            }

    if active_db:
        print(f"\n🎯 Recommended Active Database: {active_db['endpoint']}")
        
        # Update .env.local?
        with open(".env.local", "r", encoding="utf-8") as f:
            lines = f.readlines()
        
        new_lines = []
        for line in lines:
            if line.startswith("ASTRA_DB_API_ENDPOINT="):
                new_lines.append(f"ASTRA_DB_API_ENDPOINT={active_db['endpoint']}\n")
            elif line.startswith("ASTRA_DB_KEYSPACE="):
                # If keyspace var exists update it, otherwise ignore
                new_lines.append(f"ASTRA_DB_KEYSPACE={active_db['keyspace']}\n")
            else:
                new_lines.append(line)
        
        # Write back
        with open(".env.local", "w", encoding="utf-8") as f:
            f.writelines(new_lines)
            
        print("✅ .env.local UPDATED with correct Endpoint!")
        
    else:
        print("\n⚠️ No ACTIVE databases found.")

except Exception as e:
    print(f"❌ Script Error: {e}")
