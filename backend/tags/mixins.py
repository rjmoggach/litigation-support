from __future__ import annotations

from typing import List, Optional, Union

from sqlalchemy.orm import Session
from sqlalchemy.ext.hybrid import hybrid_property

from tags.models import ContentType, Tag, TaggedItem


class Taggable:
    """
    Mixin class to add tagging capabilities to any SQLAlchemy model.
    
    This mixin provides methods to add, remove, and query tags for any model
    that inherits from it. It uses the polymorphic tagging system via
    ContentType, Tag, and TaggedItem models.
    """

    _content_type: Optional[ContentType] = None

    def _get_content_type(self, db: Session) -> ContentType:
        """
        Get or cache the ContentType for this model.
        
        Args:
            db: Database session
            
        Returns:
            ContentType instance for this model
        """
        if self._content_type is None:
            self._content_type = ContentType.get_for_model(self.__class__, db)
        return self._content_type

    def add_tag(self, tag_name: str, db: Session) -> bool:
        """
        Add a tag to this object.
        
        Args:
            tag_name: Name of the tag to add
            db: Database session
            
        Returns:
            True if tag was added, False if it already existed
        """
        # Get or create the tag
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            slug = Tag.create_slug(tag_name)
            # Ensure slug uniqueness
            counter = 1
            original_slug = slug
            while db.query(Tag).filter(Tag.slug == slug).first():
                slug = f"{original_slug}-{counter}"
                counter += 1
            
            tag = Tag(name=tag_name, slug=slug)
            db.add(tag)
            db.flush()  # Get the ID without committing

        # Check if already tagged
        content_type = self._get_content_type(db)
        existing = db.query(TaggedItem).filter(
            TaggedItem.tag_id == tag.id,
            TaggedItem.content_type_id == content_type.id,
            TaggedItem.object_id == self.id
        ).first()

        if existing:
            return False

        # Create the tagged item
        tagged_item = TaggedItem(
            tag_id=tag.id,
            content_type_id=content_type.id,
            object_id=self.id
        )
        db.add(tagged_item)
        return True

    def remove_tag(self, tag_name: str, db: Session) -> bool:
        """
        Remove a tag from this object.
        
        Args:
            tag_name: Name of the tag to remove
            db: Database session
            
        Returns:
            True if tag was removed, False if it wasn't found
        """
        # Find the tag
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            return False

        # Find and remove the tagged item
        content_type = self._get_content_type(db)
        tagged_item = db.query(TaggedItem).filter(
            TaggedItem.tag_id == tag.id,
            TaggedItem.content_type_id == content_type.id,
            TaggedItem.object_id == self.id
        ).first()

        if tagged_item:
            db.delete(tagged_item)
            return True
        return False

    def get_tags(self, db: Session) -> List[Tag]:
        """
        Get all tags for this object.
        
        Args:
            db: Database session
            
        Returns:
            List of Tag instances
        """
        content_type = self._get_content_type(db)
        
        tags = db.query(Tag).join(TaggedItem).filter(
            TaggedItem.content_type_id == content_type.id,
            TaggedItem.object_id == self.id
        ).all()
        
        return tags

    def clear_tags(self, db: Session) -> int:
        """
        Remove all tags from this object.
        
        Args:
            db: Database session
            
        Returns:
            Number of tags that were removed
        """
        content_type = self._get_content_type(db)
        
        count = db.query(TaggedItem).filter(
            TaggedItem.content_type_id == content_type.id,
            TaggedItem.object_id == self.id
        ).count()
        
        db.query(TaggedItem).filter(
            TaggedItem.content_type_id == content_type.id,
            TaggedItem.object_id == self.id
        ).delete()
        
        return count

    def set_tags(self, tag_names: List[str], db: Session) -> None:
        """
        Replace all tags for this object with the given list.
        
        Args:
            tag_names: List of tag names to set
            db: Database session
        """
        # Clear existing tags
        self.clear_tags(db)
        
        # Add new tags
        for tag_name in tag_names:
            self.add_tag(tag_name, db)

    def has_tag(self, tag_name: str, db: Session) -> bool:
        """
        Check if this object has a specific tag.
        
        Args:
            tag_name: Name of the tag to check
            db: Database session
            
        Returns:
            True if object has the tag, False otherwise
        """
        tag = db.query(Tag).filter(Tag.name == tag_name).first()
        if not tag:
            return False

        content_type = self._get_content_type(db)
        tagged_item = db.query(TaggedItem).filter(
            TaggedItem.tag_id == tag.id,
            TaggedItem.content_type_id == content_type.id,
            TaggedItem.object_id == self.id
        ).first()

        return tagged_item is not None

    @hybrid_property
    def tag_names(self) -> List[str]:
        """
        Property to get tag names (requires session context).
        This is a placeholder - actual implementation would need session context.
        """
        # This would be implemented with a session context manager
        # or by passing the session as a parameter
        return []