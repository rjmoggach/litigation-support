from __future__ import annotations

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import relationship

from core.database import Base
from tags.mixins import Taggable


class Gallery(Base, Taggable):
    """
    Gallery model with Taggable mixin and slug generation.

    Inherits Taggable mixin for tag functionality.
    Uses existing slug patterns from contacts.
    Includes user ownership following established patterns.
    """

    __tablename__ = "galleries"

    id = Column(Integer, primary_key=True, index=True)

    # Gallery metadata
    title = Column(String, nullable=False, index=True)
    slug = Column(String, nullable=True, unique=True, index=True)  # SEO-friendly URL identifier
    description = Column(Text, nullable=True)
    date = Column(DateTime(timezone=True), nullable=True, index=True)  # Custom date for sorting/chronological order

    # Visibility settings
    is_public = Column(Boolean, default=False, index=True)

    # Optional thumbnail selection (auto-selected from first image if None)
    thumbnail_image_id = Column(
        Integer, ForeignKey("images.id", ondelete="SET NULL"), nullable=True
    )

    # User ownership following existing patterns
    user_profile_id = Column(
        Integer, ForeignKey("user_profiles.id", ondelete="CASCADE"), nullable=False, index=True
    )

    # Standard timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    thumbnail_image = relationship("Image", foreign_keys=[thumbnail_image_id])
    user_profile = relationship("UserProfile")
    gallery_images = relationship(
        "GalleryImage",
        back_populates="gallery",
        cascade="all, delete-orphan",
        order_by="GalleryImage.sort_order",
    )

    # Convenience property to get images in order
    @property
    def images(self):
        """Get images in sort order"""
        return [gi.image for gi in self.gallery_images]

    __table_args__ = (
        Index("ix_galleries_user_profile_id", "user_profile_id"),
        Index("ix_galleries_public_slug", "is_public", "slug"),
        Index("ix_galleries_created_at", "created_at"),
    )


class GalleryImage(Base):
    """
    Many-to-many relationship between Gallery and Image with ordering.

    Simple association table with sort_order and caption fields.
    Follows existing association table patterns.
    """

    __tablename__ = "gallery_images"

    id = Column(Integer, primary_key=True)
    gallery_id = Column(Integer, ForeignKey("galleries.id", ondelete="CASCADE"), nullable=False)
    image_id = Column(Integer, ForeignKey("images.id", ondelete="CASCADE"), nullable=False)

    # Ordering and metadata
    sort_order = Column(Integer, nullable=False, default=0)
    caption = Column(Text, nullable=True)  # Optional caption for this image in this gallery

    # Standard timestamp
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    gallery = relationship("Gallery", back_populates="gallery_images")
    image = relationship("Image", back_populates="gallery_images")

    __table_args__ = (
        UniqueConstraint("gallery_id", "image_id", name="uq_gallery_images_gallery_image"),
        Index("ix_gallery_images_gallery_sort", "gallery_id", "sort_order"),
        Index("ix_gallery_images_image_id", "image_id"),
    )
