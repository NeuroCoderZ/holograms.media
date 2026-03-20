import os
import asyncio
from astrapy import DataAPIClient
from dotenv import load_dotenv

load_dotenv(".env.local")

async def main():
    token = os.getenv("ASTRA_DB_APPLICATION_TOKEN")
    endpoint = os.getenv("ASTRA_DB_API_ENDPOINT")
    client = DataAPIClient(token)
    db = client.get_async_database(endpoint)
    
    print(f"Attempting to create tria_knowledge...")
    try:
        from astrapy.info import CollectionDefinition
        from astrapy.constants import VectorMetric
        
        definition = (
            CollectionDefinition.builder()
            .set_vector_dimension(1536)
            .set_vector_metric(VectorMetric.COSINE)
            .build()
        )
        coll = await db.create_collection("tria_knowledge", definition=definition)
        print("Success!")
    except Exception as e:
        print(f"Failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())
