// Tag types for the tagging system

export interface Tag {
  id: number;
  name: string;
  slug: string;
  usage_count: number;
  created_at: string;
}

export interface TaggedItem {
  id: number;
  tag_id: number;
  content_type_id: number;
  object_id: number;
  created_at: string;
  tag?: Tag;
}

export interface TagStats {
  total_tags: number;
  total_tagged_items: number;
  most_used_tags: Tag[];
  recent_tags: Tag[];
}

export interface PopularTag extends Tag {
  popularity_score: number;
  relative_size: "xs" | "sm" | "md" | "lg" | "xl";
}

export interface TagCloudData {
  tags: PopularTag[];
  max_usage_count: number;
  min_usage_count: number;
}

// API request/response types
export interface TagCreateRequest {
  name: string;
  slug?: string;
}

export interface TagUpdateRequest {
  name?: string;
  slug?: string;
}

export interface TagObjectRequest {
  content_type: string;
  object_id: number;
  tag_names: string[];
}

export interface UntagObjectRequest {
  content_type: string;
  object_id: number;
  tag_names: string[];
}

export interface ObjectTagsResponse {
  content_type: string;
  object_id: number;
  tags: Tag[];
}

export interface TaggedObjectResponse {
  content_type: string;
  object_id: number;
  object_data: Record<string, any>;
  tags: Tag[];
}

export interface TaggedObjectsResponse {
  tag: Tag;
  objects: TaggedObjectResponse[];
  total_count: number;
  page: number;
  limit: number;
}

export interface TagAutocompleteResponse {
  suggestions: Tag[];
  query: string;
}

export interface TagListResponse {
  items: Tag[];
  total: number;
  page: number;
  per_page: number;
  pages: number;
}

export interface BulkTagRequest {
  tag_names: string[];
}

export interface BulkTagResponse {
  created_tags: Tag[];
  existing_tags: Tag[];
  failed_tags: string[];
}

// Component prop types
export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  maxTags?: number;
  disabled?: boolean;
  className?: string;
}

export interface TagChipProps {
  tag: Tag | string;
  onRemove?: (tag: Tag | string) => void;
  onClick?: (tag: Tag | string) => void;
  size?: "sm" | "md" | "lg";
  variant?: "default" | "secondary" | "outline" | "destructive";
  removable?: boolean;
  className?: string;
}

export interface TagCloudProps {
  tags: PopularTag[];
  onTagClick?: (tag: Tag) => void;
  maxTags?: number;
  className?: string;
}

export interface TagAutocompleteProps {
  onSelect: (tag: Tag) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export interface TagManagerProps {
  tags: Tag[];
  onTagAdd?: (tag: Tag) => void;
  onTagEdit?: (tag: Tag) => void;
  onTagDelete?: (tag: Tag) => void;
  onBulkDelete?: (tagIds: number[]) => void;
  loading?: boolean;
  className?: string;
}

// Hook types
export interface UseTagsOptions {
  search?: string;
  skip?: number;
  limit?: number;
}

export interface UseTagsResult {
  tags: Tag[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseTagAutocompleteOptions {
  query: string;
  limit?: number;
  enabled?: boolean;
}

export interface UseTagAutocompleteResult {
  suggestions: Tag[];
  loading: boolean;
  error: Error | null;
}

export interface UseTagStatsResult {
  stats: TagStats | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface UseTagCloudResult {
  cloudData: TagCloudData | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Form types
export interface TagFormData {
  name: string;
  slug?: string;
}

export interface TagEditFormData extends TagFormData {
  id: number;
}

// Filter and search types
export interface TagFilter {
  search?: string;
  content_type?: string;
  min_usage?: number;
}

export interface TagSortOptions {
  field: "name" | "usage_count" | "created_at";
  direction: "asc" | "desc";
}

// Error types
export interface TagError {
  message: string;
  field?: string;
  code?: string;
}

export interface TagValidationError {
  name?: string[];
  slug?: string[];
  general?: string[];
}