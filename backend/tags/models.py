from __future__ import annotations

import re
from datetime import datetime
from typing import TYPE_CHECKING, Optional, Type

from sqlalchemy import (
    Column,
    Integer, 
    String,
    DateTime,
    ForeignKey,
    UniqueConstraint,
    Index,
    func,
)
from sqlalchemy.orm import Session, relationship

from core.database import Base

if TYPE_CHECKING:
    from sqlalchemy.ext.declarative import DeclarativeMeta


class ContentType(Base):
    """
    Model to track model types for polymorphic relationships.
    Similar to Django's ContentType model, this allows tagging any model
    without modifying their schemas.
    """
    __tablename__ = "content_types"

    id = Column(Integer, primary_key=True, index=True)
    app_label = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    table_name = Column(String(100), nullable=False)

    __table_args__ = (
        UniqueConstraint('app_label', 'model', name='_app_model_uc'),
        Index('idx_content_type_lookup', 'app_label', 'model'),
    )

    @classmethod
    def get_for_model(
        cls, 
        model_class: Type[DeclarativeMeta], 
        db: Session
    ) -> ContentType:
        """
        Get or create a ContentType instance for the given model class.
        
        Args:
            model_class: SQLAlchemy model class
            db: Database session
            
        Returns:
            ContentType instance for the model
        """
        # Extract app label from module path (e.g., "videos" from "videos.models")
        module_path = model_class.__module__
        app_label = module_path.split('.')[-2] if '.' in module_path else 'main'
        
        # Get model name and table name
        model_name = model_class.__name__.lower()
        table_name = model_class.__tablename__
        
        # Try to get existing ContentType
        content_type = db.query(cls).filter(
            cls.app_label == app_label,
            cls.model == model_name
        ).first()
        
        # Create if doesn't exist
        if not content_type:
            content_type = cls(
                app_label=app_label,
                model=model_name,
                table_name=table_name
            )
            db.add(content_type)
            db.commit()
            db.refresh(content_type)
        
        return content_type

    def get_object(self, object_id: int, db: Session) -> Optional[object]:
        """
        Retrieve the actual object for this content type.
        
        Args:
            object_id: ID of the object to retrieve
            db: Database session
            
        Returns:
            The object instance or None if not found
        """
        # This would need to be implemented with a registry of model classes
        # For now, we'll return None as a placeholder
        # In a full implementation, you'd maintain a registry of model classes
        # that can be looked up by app_label and model name
        return None

    def __repr__(self) -> str:
        return f"<ContentType: {self.app_label}.{self.model}>"


class Tag(Base):
    """
    Model to store tag names and slugs.
    Tags are used to categorize and organize content across different models.
    """
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False, unique=True)
    slug = Column(String(100), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        Index('idx_tag_slug', 'slug'),
        Index('idx_tag_name_lower', func.lower('name')),
    )

    @staticmethod
    def create_slug(name: str) -> str:
        """
        Generate a URL-safe slug from a tag name.
        
        Args:
            name: The tag name to convert to a slug
            
        Returns:
            URL-safe slug string
        """
        # Convert to lowercase and replace spaces with hyphens
        slug = name.lower().strip()
        
        # Replace multiple spaces/hyphens with single hyphen
        slug = re.sub(r'[\s\-]+', '-', slug)
        
        # Remove any non-alphanumeric characters except hyphens
        slug = re.sub(r'[^\w\-]', '', slug)
        
        # Remove leading/trailing hyphens
        slug = slug.strip('-')
        
        # Ensure slug is not empty
        if not slug:
            slug = 'tag'
        
        return slug

    def get_usage_count(self, db: Session) -> int:
        """
        Get the number of items tagged with this tag.
        
        Args:
            db: Database session
            
        Returns:
            Count of tagged items
        """
        # This will be implemented when TaggedItem model is created
        return 0

    def __repr__(self) -> str:
        return f"<Tag: {self.name} ({self.slug})>"


class TaggedItem(Base):
    """
    Junction table linking tags to any object through polymorphic relationships.
    This model stores the relationships between tags and any model in the system.
    """
    __tablename__ = "tagged_items"

    id = Column(Integer, primary_key=True, index=True)
    tag_id = Column(Integer, ForeignKey("tags.id", ondelete="CASCADE"), nullable=False)
    content_type_id = Column(Integer, ForeignKey("content_types.id"), nullable=False)
    object_id = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    tag = relationship("Tag", backref="tagged_items")
    content_type = relationship("ContentType", backref="tagged_items")

    __table_args__ = (
        UniqueConstraint('tag_id', 'content_type_id', 'object_id', name='_tag_content_object_uc'),
        Index('idx_tagged_item_lookup', 'content_type_id', 'object_id'),
        Index('idx_tagged_item_tag', 'tag_id', 'content_type_id'),
    )

    def get_object(self, db: Session) -> Optional[object]:
        """
        Retrieve the actual object that this tagged item points to.
        
        Args:
            db: Database session
            
        Returns:
            The tagged object instance or None if not found
        """
        return self.content_type.get_object(self.object_id, db)

    def __repr__(self) -> str:
        return f"<TaggedItem: tag={self.tag_id} content_type={self.content_type_id} object={self.object_id}>"