import boto3
from botocore.exceptions import ClientError, NoCredentialsError
from .base import BaseStorage
from typing import Dict, Any, Optional
from urllib.parse import urljoin
import datetime


class S3Storage(BaseStorage):
    def __init__(self, access_key: str, secret_key: str, bucket_name: str, region: str = "us-east-1"):
        self.bucket_name = bucket_name
        self.client = boto3.client(
            's3',
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region
        )
        self.region = region
    
    async def put(self, path: str, content: bytes) -> Dict[str, Any]:
        """Upload a file to S3"""
        try:
            # Remove leading slash for S3 compatibility
            key = path.lstrip('/')
            
            # Don't use ACL since bucket has "Bucket owner enforced" ownership
            # Files will be accessible via CloudFront with bucket policy
            result = self.client.put_object(
                Bucket=self.bucket_name,
                Key=key,
                Body=content
            )
            
            # Get object metadata
            response = self.client.head_object(Bucket=self.bucket_name, Key=key)
            
            return {
                "id": result.get("ETag", "").strip('"'),
                "path": f"/{key}",
                "size": response.get("ContentLength", len(content)),
                "etag": result.get("ETag", ""),
                "last_modified": response.get("LastModified").isoformat() if response.get("LastModified") else None
            }
        except (ClientError, NoCredentialsError) as e:
            raise Exception(f"S3 upload failed: {str(e)}")
    
    async def get(self, path: str) -> bytes:
        """Download a file from S3"""
        try:
            key = path.lstrip('/')
            response = self.client.get_object(Bucket=self.bucket_name, Key=key)
            return response['Body'].read()
        except (ClientError, NoCredentialsError) as e:
            raise Exception(f"S3 download failed: {str(e)}")
    
    async def delete(self, path: str) -> bool:
        """Delete a file from S3"""
        try:
            key = path.lstrip('/')
            self.client.delete_object(Bucket=self.bucket_name, Key=key)
            return True
        except (ClientError, NoCredentialsError) as e:
            raise Exception(f"S3 delete failed: {str(e)}")
    
    async def get_sharing_link(self, path: str, expiry_hours: int = 24) -> str:
        """Create a presigned URL for sharing"""
        try:
            key = path.lstrip('/')
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiry_hours * 3600
            )
            return url
        except (ClientError, NoCredentialsError) as e:
            raise Exception(f"S3 sharing link creation failed: {str(e)}")
    
    async def get_url(self, path: str, expiry_minutes: int = 60) -> str:
        """Get a temporary download URL"""
        try:
            key = path.lstrip('/')
            url = self.client.generate_presigned_url(
                'get_object',
                Params={'Bucket': self.bucket_name, 'Key': key},
                ExpiresIn=expiry_minutes * 60
            )
            return url
        except (ClientError, NoCredentialsError) as e:
            raise Exception(f"S3 temporary link creation failed: {str(e)}")
    
    def get_account_info(self) -> Dict[str, Any]:
        """Get S3 account/bucket information"""
        try:
            # Get bucket location
            location = self.client.get_bucket_location(Bucket=self.bucket_name)
            
            # Get bucket info (this is limited compared to Dropbox)
            return {
                "provider": "s3",
                "bucket_name": self.bucket_name,
                "region": location.get('LocationConstraint', 'us-east-1'),
                "endpoint": f"https://s3.{self.region}.amazonaws.com"
            }
        except (ClientError, NoCredentialsError) as e:
            raise Exception(f"S3 account info failed: {str(e)}")
    
    async def exists(self, path: str) -> bool:
        """Check if a file exists in S3"""
        try:
            key = path.lstrip('/')
            self.client.head_object(Bucket=self.bucket_name, Key=key)
            return True
        except (ClientError, NoCredentialsError):
            return False
    
    async def list_files(self, path: str = "", limit: Optional[int] = None) -> list:
        """List files in an S3 directory"""
        try:
            prefix = path.lstrip('/') + '/' if path else ""
            
            kwargs = {
                'Bucket': self.bucket_name,
                'Prefix': prefix
            }
            
            if limit:
                kwargs['MaxKeys'] = limit
            
            response = self.client.list_objects_v2(**kwargs)
            files = []
            
            for obj in response.get('Contents', []):
                # Skip directory markers
                if not obj['Key'].endswith('/'):
                    files.append({
                        "name": obj['Key'].split('/')[-1],
                        "path": f"/{obj['Key']}",
                        "size": obj['Size'],
                        "modified": obj['LastModified'].isoformat() if obj.get('LastModified') else None,
                        "etag": obj.get('ETag', '').strip('"')
                    })
            
            return files
        except (ClientError, NoCredentialsError) as e:
            raise Exception(f"S3 list files failed: {str(e)}")