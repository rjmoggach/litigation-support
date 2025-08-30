from typing import Any

import dropbox
from dropbox.exceptions import ApiError, AuthError

from .base import BaseStorage


class DropboxStorage(BaseStorage):
    def __init__(self, access_token: str, app_key: str, app_secret: str, refresh_token: str):
        # If no access token, use refresh token to get one
        if access_token:
            self.client = dropbox.Dropbox(
                oauth2_access_token=access_token,
                app_key=app_key,
                app_secret=app_secret,
                oauth2_refresh_token=refresh_token,
            )
        else:
            # Initialize with refresh token only
            self.client = dropbox.Dropbox(
                app_key=app_key,
                app_secret=app_secret,
                oauth2_refresh_token=refresh_token,
            )

    async def put(self, path: str, content: bytes) -> dict[str, Any]:
        """Upload a file to Dropbox"""
        try:
            result = self.client.files_upload(
                content, path, mode=dropbox.files.WriteMode.overwrite, autorename=True
            )
            return {
                "id": result.id,
                "path": result.path_display,
                "size": result.size,
                "content_hash": result.content_hash,
                "client_modified": result.client_modified.isoformat()
                if result.client_modified
                else None,
                "server_modified": result.server_modified.isoformat()
                if result.server_modified
                else None,
            }
        except (ApiError, AuthError) as e:
            raise Exception(f"Dropbox upload failed: {str(e)}")

    async def get(self, path: str) -> bytes:
        """Download a file from Dropbox"""
        try:
            _, response = self.client.files_download(path)
            return response.content
        except (ApiError, AuthError) as e:
            raise Exception(f"Dropbox download failed: {str(e)}")

    async def delete(self, path: str) -> bool:
        """Delete a file from Dropbox"""
        try:
            self.client.files_delete_v2(path)
            return True
        except (ApiError, AuthError) as e:
            raise Exception(f"Dropbox delete failed: {str(e)}")

    async def get_sharing_link(self, path: str) -> str:
        """Create a sharing link for a file"""
        try:
            # First check if a shared link already exists
            try:
                links = self.client.sharing_list_shared_links(path=path)
                if links.links:
                    url = links.links[0].url
                    # Modify the URL to add raw=1 for direct image access
                    if "?" in url:
                        url += "&raw=1"
                    else:
                        url += "?raw=1"
                    return url
            except:
                pass

            # Create new shared link
            link = self.client.sharing_create_shared_link_with_settings(
                path,
                settings=dropbox.sharing.SharedLinkSettings(
                    requested_visibility=dropbox.sharing.RequestedVisibility.public
                ),
            )
            # Modify the URL to add raw=1 for direct image access
            url = link.url
            if "?" in url:
                url += "&raw=1"
            else:
                url += "?raw=1"
            return url
        except (ApiError, AuthError) as e:
            raise Exception(f"Dropbox sharing link creation failed: {str(e)}")

    async def get_url(self, path: str) -> str:
        """Get a temporary download URL for a file"""
        try:
            result = self.client.files_get_temporary_link(path)
            return result.link
        except (ApiError, AuthError) as e:
            raise Exception(f"Dropbox temporary link creation failed: {str(e)}")

    def get_account_info(self) -> dict[str, Any]:
        """Get Dropbox account information"""
        try:
            account = self.client.users_get_current_account()
            space_usage = self.client.users_get_space_usage()

            return {
                "provider": "dropbox",
                "account_id": account.account_id,
                "name": account.name.display_name,
                "email": account.email,
                "used_bytes": space_usage.used,
                "allocated_bytes": space_usage.allocation.get_individual().allocated
                if space_usage.allocation.get_individual()
                else None,
            }
        except (ApiError, AuthError) as e:
            raise Exception(f"Dropbox account info failed: {str(e)}")

    async def exists(self, path: str) -> bool:
        """Check if a file exists in Dropbox"""
        try:
            self.client.files_get_metadata(path)
            return True
        except (ApiError, AuthError):
            return False

    async def list_files(self, path: str = "", limit: int | None = None) -> list:
        """List files in a Dropbox directory"""
        try:
            if not path:
                path = ""

            result = self.client.files_list_folder(path)
            files = []

            for entry in result.entries:
                if isinstance(entry, dropbox.files.FileMetadata):
                    files.append(
                        {
                            "name": entry.name,
                            "path": entry.path_display,
                            "size": entry.size,
                            "modified": entry.server_modified.isoformat()
                            if entry.server_modified
                            else None,
                            "content_hash": entry.content_hash,
                        }
                    )

                if limit and len(files) >= limit:
                    break

            return files
        except (ApiError, AuthError) as e:
            raise Exception(f"Dropbox list files failed: {str(e)}")
