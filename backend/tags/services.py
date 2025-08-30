from __future__ import annotations

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_

from tags.models import Tag, ContentType, TaggedItem
from tags.schemas import (
    TagResponse, TagStats, TaggedObjectResponse, TagCloudResponse,
    PopularTagResponse, TagAutocompleteResponse
)


class TagService:
    """Service class for tag management operations"""
    
    def __init__(self, db: Session):
        self.db = db

    def create_tag(self, name: str, slug: Optional[str] = None) -> Tag:
        """
        Create a new tag with optional custom slug.
        
        Args:
            name: Tag name
            slug: Optional custom slug (auto-generated if not provided)
            
        Returns:
            Created Tag instance
            
        Raises:
            ValueError: If tag name already exists
        """
        # Check if tag with this name already exists
        existing = self.db.query(Tag).filter(Tag.name == name).first()
        if existing:
            raise ValueError(f"Tag with name '{name}' already exists")
        
        # Generate slug if not provided
        if not slug:
            slug = Tag.create_slug(name)
        
        # Ensure slug uniqueness
        counter = 1
        original_slug = slug
        while self.db.query(Tag).filter(Tag.slug == slug).first():
            slug = f"{original_slug}-{counter}"
            counter += 1
        
        # Create the tag
        tag = Tag(name=name, slug=slug)
        self.db.add(tag)
        self.db.commit()
        self.db.refresh(tag)
        
        return tag

    def update_tag(self, tag_id: int, name: Optional[str] = None, slug: Optional[str] = None) -> Optional[Tag]:
        """
        Update an existing tag.
        
        Args:
            tag_id: ID of the tag to update
            name: New tag name (optional)
            slug: New tag slug (optional)
            
        Returns:
            Updated Tag instance or None if not found
            
        Raises:
            ValueError: If new name/slug conflicts with existing tag
        """
        tag = self.db.query(Tag).filter(Tag.id == tag_id).first()
        if not tag:
            return None
        
        # Check for name conflicts
        if name and name != tag.name:
            existing = self.db.query(Tag).filter(Tag.name == name, Tag.id != tag_id).first()
            if existing:
                raise ValueError(f"Tag with name '{name}' already exists")
            tag.name = name
        
        # Check for slug conflicts and update
        if slug and slug != tag.slug:
            existing = self.db.query(Tag).filter(Tag.slug == slug, Tag.id != tag_id).first()
            if existing:
                raise ValueError(f"Tag with slug '{slug}' already exists")
            tag.slug = slug
        elif name and not slug:
            # Auto-regenerate slug if name changed but no custom slug provided
            new_slug = Tag.create_slug(name)
            if new_slug != tag.slug:
                # Ensure slug uniqueness
                counter = 1
                original_slug = new_slug
                while self.db.query(Tag).filter(Tag.slug == new_slug, Tag.id != tag_id).first():
                    new_slug = f"{original_slug}-{counter}"
                    counter += 1
                tag.slug = new_slug
        
        self.db.commit()
        self.db.refresh(tag)
        return tag

    def delete_tag(self, tag_id: int) -> bool:
        """
        Delete a tag and all its associated tagged items.
        
        Args:
            tag_id: ID of the tag to delete
            
        Returns:
            True if tag was deleted, False if not found
        """
        tag = self.db.query(Tag).filter(Tag.id == tag_id).first()
        if not tag:
            return False
        
        # Tagged items will be cascade deleted due to foreign key constraint
        self.db.delete(tag)
        self.db.commit()
        return True

    def get_tag_by_id(self, tag_id: int) -> Optional[Tag]:
        """Get a tag by its ID"""
        return self.db.query(Tag).filter(Tag.id == tag_id).first()

    def get_tag_by_slug(self, slug: str) -> Optional[Tag]:
        """Get a tag by its slug"""
        return self.db.query(Tag).filter(Tag.slug == slug).first()

    def get_tag_by_name(self, name: str) -> Optional[Tag]:
        """Get a tag by its name"""
        return self.db.query(Tag).filter(Tag.name == name).first()

    def get_or_create_tags(self, tag_names: List[str]) -> List[Tag]:
        """
        Get existing tags or create new ones for the given names.
        
        Args:
            tag_names: List of tag names
            
        Returns:
            List of Tag instances
        """
        tags = []
        for name in tag_names:
            tag = self.get_tag_by_name(name)
            if not tag:
                tag = self.create_tag(name)
            tags.append(tag)
        return tags

    def list_tags(self, skip: int = 0, limit: int = 100, search: Optional[str] = None) -> List[Tag]:
        """
        List tags with optional search and pagination.
        
        Args:
            skip: Number of records to skip
            limit: Maximum number of records to return
            search: Optional search query
            
        Returns:
            List of Tag instances
        """
        query = self.db.query(Tag)
        
        if search:
            query = query.filter(Tag.name.ilike(f"%{search}%"))
        
        return query.offset(skip).limit(limit).all()

    def count_tags(self, search: Optional[str] = None) -> int:
        """
        Count total number of tags.
        
        Args:
            search: Optional search query
            
        Returns:
            Total count of tags
        """
        query = self.db.query(Tag)
        
        if search:
            query = query.filter(Tag.name.ilike(f"%{search}%"))
        
        return query.count()

    def get_tag_stats(self) -> TagStats:
        """
        Get tag usage statistics.
        
        Returns:
            TagStats with various metrics
        """
        # Total counts
        total_tags = self.db.query(Tag).count()
        total_tagged_items = self.db.query(TaggedItem).count()
        
        # Most used tags (top 10)
        most_used_subquery = (
            self.db.query(
                TaggedItem.tag_id,
                func.count(TaggedItem.id).label('usage_count')
            )
            .group_by(TaggedItem.tag_id)
            .subquery()
        )
        
        most_used_tags = (
            self.db.query(Tag)
            .join(most_used_subquery, Tag.id == most_used_subquery.c.tag_id)
            .order_by(desc(most_used_subquery.c.usage_count))
            .limit(10)
            .all()
        )
        
        # Recent tags (last 10 created)
        recent_tags = (
            self.db.query(Tag)
            .order_by(desc(Tag.created_at))
            .limit(10)
            .all()
        )
        
        # Convert to response objects
        most_used_responses = [self._tag_to_response(tag) for tag in most_used_tags]
        recent_responses = [self._tag_to_response(tag) for tag in recent_tags]
        
        return TagStats(
            total_tags=total_tags,
            total_tagged_items=total_tagged_items,
            most_used_tags=most_used_responses,
            recent_tags=recent_responses
        )

    def _tag_to_response(self, tag: Tag) -> TagResponse:
        """
        Convert Tag model to TagResponse schema.
        
        Args:
            tag: Tag model instance
            
        Returns:
            TagResponse schema
        """
        # Get usage count
        usage_count = (
            self.db.query(TaggedItem)
            .filter(TaggedItem.tag_id == tag.id)
            .count()
        )
        
        return TagResponse(
            id=tag.id,
            name=tag.name,
            slug=tag.slug,
            usage_count=usage_count,
            created_at=tag.created_at
        )

    def _calculate_popularity_score(self, usage_count: int, max_count: int, min_count: int) -> float:
        """
        Calculate popularity score for tag cloud.
        
        Args:
            usage_count: Number of times this tag is used
            max_count: Maximum usage count among all tags
            min_count: Minimum usage count among all tags
            
        Returns:
            Popularity score between 0.0 and 1.0
        """
        if max_count == min_count:
            return 1.0
        
        return (usage_count - min_count) / (max_count - min_count)

    def _get_size_class(self, popularity_score: float) -> str:
        """
        Get CSS size class based on popularity score.
        
        Args:
            popularity_score: Score between 0.0 and 1.0
            
        Returns:
            CSS size class
        """
        if popularity_score >= 0.8:
            return "xl"
        elif popularity_score >= 0.6:
            return "lg"
        elif popularity_score >= 0.4:
            return "md"
        elif popularity_score >= 0.2:
            return "sm"
        else:
            return "xs"

    # Object tagging methods
    def tag_object(self, content_type: str, object_id: int, tag_names: List[str]) -> List[TaggedItem]:
        """
        Add tags to an object.
        
        Args:
            content_type: Content type in format 'app_label.model'
            object_id: ID of the object to tag
            tag_names: List of tag names to apply
            
        Returns:
            List of created TaggedItem instances
            
        Raises:
            ValueError: If content_type format is invalid
        """
        # Parse content type
        try:
            app_label, model_name = content_type.split('.')
        except ValueError:
            raise ValueError(f"Invalid content_type format: {content_type}. Expected 'app_label.model'")
        
        # Get or create ContentType
        content_type_obj = self.db.query(ContentType).filter(
            ContentType.app_label == app_label,
            ContentType.model == model_name.lower()
        ).first()
        
        if not content_type_obj:
            # Create new content type (this assumes the model exists)
            content_type_obj = ContentType(
                app_label=app_label,
                model=model_name.lower(),
                table_name=f"{model_name.lower()}s"  # Simple pluralization
            )
            self.db.add(content_type_obj)
            self.db.flush()
        
        # Get or create tags
        tags = self.get_or_create_tags(tag_names)
        
        # Create tagged items (skip if already exists)
        created_items = []
        for tag in tags:
            existing = self.db.query(TaggedItem).filter(
                TaggedItem.tag_id == tag.id,
                TaggedItem.content_type_id == content_type_obj.id,
                TaggedItem.object_id == object_id
            ).first()
            
            if not existing:
                tagged_item = TaggedItem(
                    tag_id=tag.id,
                    content_type_id=content_type_obj.id,
                    object_id=object_id
                )
                self.db.add(tagged_item)
                created_items.append(tagged_item)
        
        if created_items:
            self.db.commit()
            for item in created_items:
                self.db.refresh(item)
        
        return created_items

    def untag_object(self, content_type: str, object_id: int, tag_names: List[str]) -> int:
        """
        Remove tags from an object.
        
        Args:
            content_type: Content type in format 'app_label.model'
            object_id: ID of the object to untag
            tag_names: List of tag names to remove
            
        Returns:
            Number of tags that were removed
            
        Raises:
            ValueError: If content_type format is invalid
        """
        # Parse content type
        try:
            app_label, model_name = content_type.split('.')
        except ValueError:
            raise ValueError(f"Invalid content_type format: {content_type}. Expected 'app_label.model'")
        
        # Get ContentType
        content_type_obj = self.db.query(ContentType).filter(
            ContentType.app_label == app_label,
            ContentType.model == model_name.lower()
        ).first()
        
        if not content_type_obj:
            return 0
        
        # Get tags by name
        tags = self.db.query(Tag).filter(Tag.name.in_(tag_names)).all()
        if not tags:
            return 0
        
        tag_ids = [tag.id for tag in tags]
        
        # Delete tagged items
        deleted_count = self.db.query(TaggedItem).filter(
            TaggedItem.tag_id.in_(tag_ids),
            TaggedItem.content_type_id == content_type_obj.id,
            TaggedItem.object_id == object_id
        ).delete(synchronize_session=False)
        
        self.db.commit()
        return deleted_count

    def get_object_tags(self, content_type: str, object_id: int) -> List[Tag]:
        """
        Get all tags for a specific object.
        
        Args:
            content_type: Content type in format 'app_label.model'
            object_id: ID of the object
            
        Returns:
            List of Tag instances
            
        Raises:
            ValueError: If content_type format is invalid
        """
        # Parse content type
        try:
            app_label, model_name = content_type.split('.')
        except ValueError:
            raise ValueError(f"Invalid content_type format: {content_type}. Expected 'app_label.model'")
        
        # Get ContentType
        content_type_obj = self.db.query(ContentType).filter(
            ContentType.app_label == app_label,
            ContentType.model == model_name.lower()
        ).first()
        
        if not content_type_obj:
            return []
        
        # Get tags
        tags = self.db.query(Tag).join(TaggedItem).filter(
            TaggedItem.content_type_id == content_type_obj.id,
            TaggedItem.object_id == object_id
        ).all()
        
        return tags

    def get_tagged_objects(
        self, 
        tag_slug: str, 
        content_type_filter: Optional[str] = None,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Get all objects tagged with a specific tag.
        
        Args:
            tag_slug: Slug of the tag
            content_type_filter: Optional content type filter
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            Dictionary with tag info and tagged objects
            
        Raises:
            ValueError: If tag not found or invalid content_type format
        """
        # Get tag
        tag = self.get_tag_by_slug(tag_slug)
        if not tag:
            raise ValueError(f"Tag with slug '{tag_slug}' not found")
        
        # Build query
        query = self.db.query(TaggedItem).filter(TaggedItem.tag_id == tag.id)
        
        # Apply content type filter if provided
        if content_type_filter:
            try:
                app_label, model_name = content_type_filter.split('.')
            except ValueError:
                raise ValueError(f"Invalid content_type format: {content_type_filter}. Expected 'app_label.model'")
            
            content_type_obj = self.db.query(ContentType).filter(
                ContentType.app_label == app_label,
                ContentType.model == model_name.lower()
            ).first()
            
            if content_type_obj:
                query = query.filter(TaggedItem.content_type_id == content_type_obj.id)
        
        # Get paginated results
        tagged_items = query.offset(skip).limit(limit).all()
        total_count = query.count()
        
        # Group by content type
        objects_by_type: Dict[str, List[Dict[str, Any]]] = {}
        
        for item in tagged_items:
            ct = item.content_type
            content_type_key = f"{ct.app_label}.{ct.model}"
            
            if content_type_key not in objects_by_type:
                objects_by_type[content_type_key] = []
            
            objects_by_type[content_type_key].append({
                "object_id": item.object_id,
                "content_type": content_type_key,
                "created_at": item.created_at
            })
        
        return {
            "tag": self._tag_to_response(tag),
            "objects_by_type": objects_by_type,
            "total_count": total_count,
            "skip": skip,
            "limit": limit
        }

    def clear_object_tags(self, content_type: str, object_id: int) -> int:
        """
        Remove all tags from an object.
        
        Args:
            content_type: Content type in format 'app_label.model'
            object_id: ID of the object
            
        Returns:
            Number of tags that were removed
            
        Raises:
            ValueError: If content_type format is invalid
        """
        # Parse content type
        try:
            app_label, model_name = content_type.split('.')
        except ValueError:
            raise ValueError(f"Invalid content_type format: {content_type}. Expected 'app_label.model'")
        
        # Get ContentType
        content_type_obj = self.db.query(ContentType).filter(
            ContentType.app_label == app_label,
            ContentType.model == model_name.lower()
        ).first()
        
        if not content_type_obj:
            return 0
        
        # Delete all tagged items for this object
        deleted_count = self.db.query(TaggedItem).filter(
            TaggedItem.content_type_id == content_type_obj.id,
            TaggedItem.object_id == object_id
        ).delete(synchronize_session=False)
        
        self.db.commit()
        return deleted_count

    # Search and discovery methods
    def autocomplete(self, query: str, limit: int = 10) -> List[Tag]:
        """
        Get tag suggestions using fuzzy search with trigram similarity.
        
        Args:
            query: Search query (minimum 2 characters)
            limit: Maximum number of suggestions (default 10)
            
        Returns:
            List of Tag instances ordered by usage frequency
            
        Raises:
            ValueError: If query is too short
        """
        if len(query.strip()) < 2:
            raise ValueError("Query must be at least 2 characters long")
        
        query = query.strip()
        
        # First try exact prefix match
        exact_matches = (
            self.db.query(Tag)
            .filter(Tag.name.ilike(f"{query}%"))
            .limit(limit)
            .all()
        )
        
        if len(exact_matches) >= limit:
            return exact_matches
        
        # Then try trigram similarity search (PostgreSQL only)
        try:
            # Use trigram similarity for fuzzy matching
            fuzzy_matches = (
                self.db.query(Tag)
                .filter(func.similarity(Tag.name, query) > 0.1)
                .filter(~Tag.name.ilike(f"{query}%"))  # Exclude exact matches
                .order_by(desc(func.similarity(Tag.name, query)))
                .limit(limit - len(exact_matches))
                .all()
            )
            
            return exact_matches + fuzzy_matches
        except Exception:
            # Fallback to ILIKE search if trigram is not available
            fallback_matches = (
                self.db.query(Tag)
                .filter(Tag.name.ilike(f"%{query}%"))
                .filter(~Tag.name.ilike(f"{query}%"))  # Exclude exact matches
                .limit(limit - len(exact_matches))
                .all()
            )
            
            return exact_matches + fallback_matches

    def search_tags(
        self, 
        query: Optional[str] = None,
        content_type_filter: Optional[str] = None,
        min_usage: int = 0,
        skip: int = 0,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Advanced tag search with filtering options.
        
        Args:
            query: Optional search query
            content_type_filter: Filter by content type
            min_usage: Minimum usage count
            skip: Number of records to skip
            limit: Maximum number of records to return
            
        Returns:
            Dictionary with search results and metadata
        """
        # Base query
        query_obj = self.db.query(Tag)
        
        # Apply search filter
        if query and len(query.strip()) >= 2:
            query = query.strip()
            try:
                # Try trigram similarity search
                query_obj = query_obj.filter(
                    func.similarity(Tag.name, query) > 0.1
                ).order_by(desc(func.similarity(Tag.name, query)))
            except Exception:
                # Fallback to ILIKE search
                query_obj = query_obj.filter(Tag.name.ilike(f"%{query}%"))
        
        # Apply usage filter
        if min_usage > 0:
            usage_subquery = (
                self.db.query(
                    TaggedItem.tag_id,
                    func.count(TaggedItem.id).label('usage_count')
                )
                .group_by(TaggedItem.tag_id)
                .having(func.count(TaggedItem.id) >= min_usage)
                .subquery()
            )
            
            query_obj = query_obj.join(usage_subquery, Tag.id == usage_subquery.c.tag_id)
        
        # Apply content type filter
        if content_type_filter:
            try:
                app_label, model_name = content_type_filter.split('.')
                content_type_obj = self.db.query(ContentType).filter(
                    ContentType.app_label == app_label,
                    ContentType.model == model_name.lower()
                ).first()
                
                if content_type_obj:
                    query_obj = query_obj.join(TaggedItem).filter(
                        TaggedItem.content_type_id == content_type_obj.id
                    ).distinct()
            except ValueError:
                pass  # Invalid format, ignore filter
        
        # Get total count before pagination
        total_count = query_obj.count()
        
        # Apply pagination
        tags = query_obj.offset(skip).limit(limit).all()
        
        # Convert to response objects
        tag_responses = [self._tag_to_response(tag) for tag in tags]
        
        return {
            "tags": tag_responses,
            "total_count": total_count,
            "skip": skip,
            "limit": limit,
            "query": query,
            "filters": {
                "content_type": content_type_filter,
                "min_usage": min_usage
            }
        }

    def get_popular_tags(self, limit: int = 30) -> List[PopularTagResponse]:
        """
        Get popular tags for tag cloud display.
        
        Args:
            limit: Maximum number of tags to return
            
        Returns:
            List of PopularTagResponse with popularity scores
        """
        # Get usage counts
        usage_subquery = (
            self.db.query(
                TaggedItem.tag_id,
                func.count(TaggedItem.id).label('usage_count')
            )
            .group_by(TaggedItem.tag_id)
            .subquery()
        )
        
        # Get tags with usage counts
        popular_tags = (
            self.db.query(Tag, usage_subquery.c.usage_count)
            .join(usage_subquery, Tag.id == usage_subquery.c.tag_id)
            .order_by(desc(usage_subquery.c.usage_count))
            .limit(limit)
            .all()
        )
        
        if not popular_tags:
            return []
        
        # Calculate min/max for normalization
        usage_counts = [count for _, count in popular_tags]
        max_count = max(usage_counts)
        min_count = min(usage_counts)
        
        # Build response objects
        responses = []
        for tag, usage_count in popular_tags:
            popularity_score = self._calculate_popularity_score(usage_count, max_count, min_count)
            size_class = self._get_size_class(popularity_score)
            
            response = PopularTagResponse(
                id=tag.id,
                name=tag.name,
                slug=tag.slug,
                usage_count=usage_count,
                created_at=tag.created_at,
                popularity_score=popularity_score,
                relative_size=size_class
            )
            responses.append(response)
        
        return responses

    def get_tag_cloud_data(self, max_tags: int = 30) -> TagCloudResponse:
        """
        Get data for tag cloud visualization.
        
        Args:
            max_tags: Maximum number of tags to include
            
        Returns:
            TagCloudResponse with popular tags and metadata
        """
        popular_tags = self.get_popular_tags(max_tags)
        
        if not popular_tags:
            return TagCloudResponse(
                tags=[],
                max_usage_count=0,
                min_usage_count=0
            )
        
        usage_counts = [tag.usage_count for tag in popular_tags]
        
        return TagCloudResponse(
            tags=popular_tags,
            max_usage_count=max(usage_counts),
            min_usage_count=min(usage_counts)
        )

    def get_related_tags(self, tag_slug: str, limit: int = 10) -> List[Tag]:
        """
        Get tags that are commonly used together with the given tag.
        
        Args:
            tag_slug: Slug of the reference tag
            limit: Maximum number of related tags to return
            
        Returns:
            List of related Tag instances
        """
        # Get the reference tag
        tag = self.get_tag_by_slug(tag_slug)
        if not tag:
            return []
        
        # Find objects that have this tag
        tagged_objects = (
            self.db.query(TaggedItem.content_type_id, TaggedItem.object_id)
            .filter(TaggedItem.tag_id == tag.id)
            .subquery()
        )
        
        # Find other tags used on the same objects
        related_tag_counts = (
            self.db.query(
                Tag,
                func.count(TaggedItem.id).label('co_occurrence_count')
            )
            .join(TaggedItem, Tag.id == TaggedItem.tag_id)
            .join(
                tagged_objects,
                and_(
                    TaggedItem.content_type_id == tagged_objects.c.content_type_id,
                    TaggedItem.object_id == tagged_objects.c.object_id
                )
            )
            .filter(Tag.id != tag.id)  # Exclude the reference tag itself
            .group_by(Tag.id)
            .order_by(desc(func.count(TaggedItem.id)))
            .limit(limit)
            .all()
        )
        
        return [tag for tag, count in related_tag_counts]