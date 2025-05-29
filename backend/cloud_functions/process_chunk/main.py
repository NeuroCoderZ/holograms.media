from firebase_functions import storage_fn
# from firebase_admin import initialize_app # Should be initialized once, centrally if possible
# initialize_app() # Or ensure it's initialized if this function is deployed standalone

# It's good practice to define global options like region once,
# e.g., in a main __init__.py for cloud_functions or via firebase.json settings.
# import firebase_functions.options as options
# options.set_global_options(region=options.SupportedRegion.EUROPE_WEST1)

@storage_fn.on_object_finalized()
def process_new_chunk(event: storage_fn.CloudEvent[storage_fn.StorageObjectData]):
    """
    Storage-triggered Cloud Function to process a new chunk uploaded to Firebase Storage.
    This function will extract metadata and store it in PostgreSQL.
    It can also (optionally for MVP) trigger further Tria bot processing.
    """
    
    bucket = event.data.bucket
    name = event.data.name # Full path to the file in the bucket
    metageneration = event.data.metageneration
    time_created = event.data.time_created
    updated = event.data.updated

    print(f"Received new chunk event for file: {name} in bucket: {bucket}")
    print(f"  Metageneration: {metageneration}")
    print(f"  Created: {time_created}")
    print(f"  Updated: {updated}")

    # TODO: Extract user_id from the file path 'name' (e.g., if path is 'user_uploads/<user_id>/<chunk_id>')
    # Example: parts = name.split('/'); user_id = parts[1] if len(parts) > 2 else None

    # TODO: Import and use backend.core.crud_operations to save metadata
    # crud_ops.save_chunk_metadata(user_id=user_id, storage_ref=f"gs://{bucket}/{name}", ...)
    
    # TODO: (Optional for MVP) Trigger Tria bot for further processing
    # e.g., by calling a method from a module in backend.core.tria_bots
    # or by publishing a message to a Pub/Sub topic if async processing is desired.

    print(f"Placeholder: Successfully processed metadata for {name}.")
    return "Chunk processing placeholder - further actions to be implemented."
