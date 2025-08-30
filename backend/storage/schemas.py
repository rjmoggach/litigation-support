from datetime import datetime

from pydantic import BaseModel


class FileUploadResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_path: str
    file_size: int
    content_type: str
    dropbox_path: str | None = None
    dropbox_id: str | None = None
    uploaded_at: datetime
    user_profile_id: int
    category: str
    image_id: int | None = None  # Auto-created Image ID for image files

    class Config:
        from_attributes = True


class FileInfo(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    content_type: str
    uploaded_at: datetime
    dropbox_path: str | None = None
    sharing_url: str | None = None

    class Config:
        from_attributes = True


class FileListResponse(BaseModel):
    files: list[FileInfo]
    total: int
    page: int
    per_page: int


class ShareLinkResponse(BaseModel):
    sharing_url: str
    expires_at: datetime | None = None
