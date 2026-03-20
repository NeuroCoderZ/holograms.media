import os
from astrapy import DataAPIClient
from dotenv import load_dotenv

load_dotenv(".env.local")

def main():
    token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
    endpoint = os.getenv("ASTRA_DB_API_ENDPOINT")
    client = DataAPIClient(token)
    db = client.get_database(endpoint)
    
    print(f"Attempting to create tria_knowledge (SYNC)...")
    try:
        coll = db.create_collection("tria_knowledge", dimension=1536, metric="cosine")
        print("Success (SYNC)!")
    except Exception as e:
        print(f"Failed (SYNC): {e}")

if __name__ == "__main__":
    main()
