import boto3
import os
from botocore.exceptions import ClientError
from typing import Optional, BinaryIO
import logging

logger = logging.getLogger(__name__)

class B2StorageService:
    def __init__(self):
        self.endpoint_url = os.getenv("B2_ENDPOINT_URL")
        self.key_id = os.getenv("B2_ACCESS_KEY_ID") # applicationKeyId
        self.application_key = os.getenv("B2_SECRET_ACCESS_KEY") # applicationKey
        self.bucket_name = os.getenv("B2_BUCKET_NAME")

        if not all([self.endpoint_url, self.key_id, self.application_key, self.bucket_name]):
            logger.warning("Backblaze B2 credentials incomplete. Storage service may fail.")

        try:
            self.s3_client = boto3.client(
                service_name='s3',
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.key_id,
                aws_secret_access_key=self.application_key
            )
            logger.info("B2StorageService initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize B2StorageService: {e}")
            self.s3_client = None

    def upload_file(self, file_obj: BinaryIO, object_name: str, content_type: Optional[str] = None) -> Optional[str]:
        """Upload a file-like object to B2 bucket."""
        if not self.s3_client:
            logger.error("B2 client not initialized.")
            return None

        extra_args = {}
        if content_type:
            extra_args['ContentType'] = content_type

        try:
            self.s3_client.upload_fileobj(
                file_obj, 
                self.bucket_name, 
                object_name, 
                ExtraArgs=extra_args
            )
            file_url = f"{self.endpoint_url}/{self.bucket_name}/{object_name}"
            # Note: Public access might differ depending on bucket settings.
            # Usually for private buckets we generate presigned URLs.
            logger.info(f"File uploaded to B2: {object_name}")
            return file_url
        except ClientError as e:
            logger.error(f"Upload failed for {object_name}: {e}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error during upload of {object_name}: {e}")
            return None

    def download_file(self, object_name: str, file_path: str) -> bool:
        """Download a file from B2 bucket to local path."""
        if not self.s3_client:
            return False

        try:
            self.s3_client.download_file(self.bucket_name, object_name, file_path)
            logger.info(f"File downloaded from B2: {object_name} to {file_path}")
            return True
        except ClientError as e:
            logger.error(f"Download failed for {object_name}: {e}")
            return False

    def generate_presigned_url(self, object_name: str, expiration: int = 3600) -> Optional[str]:
        """Generate a presigned URL to share an S3 object."""
        if not self.s3_client:
            return None

        try:
            response = self.s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': object_name},
                ExpiresIn=expiration
            )
            return response
        except ClientError as e:
            logger.error(f"Presigned URL generation failed for {object_name}: {e}")
            return None
