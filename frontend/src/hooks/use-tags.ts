"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Tag,
  TagStats,
  TagCloudData,
  UseTagsOptions,
  UseTagsResult,
  UseTagAutocompleteOptions,
  UseTagAutocompleteResult,
  UseTagStatsResult,
  UseTagCloudResult,
  TagCreateRequest,
  TagUpdateRequest,
} from "@/types/tags";

// Real API functions using generated client
import { listTagsApiV1TagsGet, getTagStatsApiV1TagsStatsGet, getTagCloudApiV1TagsCloudGet, autocompleteTagsApiV1TagsAutocompleteGet, createTagApiV1TagsPost, updateTagApiV1TagsTagIdPut, deleteTagApiV1TagsTagIdDelete } from "@/lib/api";

// Global flag to prevent multiple simultaneous requests
let isGlobalFetchInProgress = false;

const api = {
  getTags: async (options: UseTagsOptions = {}): Promise<{ items: Tag[]; total: number }> => {
    // Global check to prevent multiple simultaneous requests
    if (isGlobalFetchInProgress) {
      console.log('Preventing duplicate tags API call');
      return { items: [], total: 0 };
    }
    
    try {
      isGlobalFetchInProgress = true;
      console.log('Making tags API call with options:', options);
      
      const response = await listTagsApiV1TagsGet({
        query: {
          skip: options.skip || 0,
          limit: options.limit || 50,
          search: options.search || undefined,
        },
      });
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch tags');
      }
      
      return {
        items: response.data?.items || [],
        total: response.data?.total || 0,
      };
    } finally {
      // Release the lock after a delay to prevent rapid successive calls
      setTimeout(() => {
        isGlobalFetchInProgress = false;
      }, 1000);
    }
  },

  getTagStats: async (): Promise<TagStats> => {
    const response = await getTagStatsApiV1TagsStatsGet();
    
    if (response.error) {
      throw new Error('Failed to fetch tag stats');
    }
    
    return response.data || {
      total_tags: 0,
      total_tagged_items: 0,
      most_used_tags: [],
      recent_tags: [],
    };
  },

  getTagCloud: async (maxTags: number = 30): Promise<TagCloudData> => {
    const response = await getTagCloudApiV1TagsCloudGet({
      query: { max_tags: maxTags },
    });
    
    if (response.error) {
      throw new Error('Failed to fetch tag cloud');
    }
    
    return response.data || {
      tags: [],
      max_usage_count: 0,
      min_usage_count: 0,
    };
  },

  autocomplete: async (query: string, limit: number = 10): Promise<Tag[]> => {
    if (query.length < 2) return [];
    
    const response = await autocompleteTagsApiV1TagsAutocompleteGet({
      query: { q: query, limit },
    });
    
    if (response.error) {
      throw new Error('Failed to fetch autocomplete suggestions');
    }
    
    return response.data?.suggestions || [];
  },

  createTag: async (data: TagCreateRequest): Promise<Tag> => {
    const response = await createTagApiV1TagsPost({
      body: data,
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to create tag');
    }
    
    return response.data!;
  },

  updateTag: async (id: number, data: TagUpdateRequest): Promise<Tag> => {
    const response = await updateTagApiV1TagsTagIdPut({
      path: { tag_id: id },
      body: data,
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to update tag');
    }
    
    return response.data!;
  },

  deleteTag: async (id: number): Promise<void> => {
    const response = await deleteTagApiV1TagsTagIdDelete({
      path: { tag_id: id },
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to delete tag');
    }
  },
};

export function useTags(options: UseTagsOptions = {}): UseTagsResult {
  const [tags, setTags] = useState<Tag[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isRequestInProgress = useRef(false);

  // Destructure options to avoid object dependency issues
  const { skip, limit, search } = options;

  const fetchTags = useCallback(async () => {
    // Prevent multiple simultaneous requests
    if (isRequestInProgress.current) return;
    
    try {
      isRequestInProgress.current = true;
      setLoading(true);
      setError(null);
      const result = await api.getTags({ skip, limit, search });
      setTags(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
      isRequestInProgress.current = false;
    }
  }, [skip, limit, search]);

  useEffect(() => {
    // Only fetch on mount, not on every dependency change
    fetchTags();
  }, []); // Empty dependency array

  return {
    tags,
    total,
    loading,
    error,
    refetch: fetchTags,
  };
}

export function useTagAutocomplete(options: UseTagAutocompleteOptions): UseTagAutocompleteResult {
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!options.enabled || options.query.length < 2) {
      setSuggestions([]);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.autocomplete(options.query, options.limit);
        setSuggestions(result);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timer);
  }, [options.query, options.limit, options.enabled]);

  return {
    suggestions,
    loading,
    error,
  };
}

export function useTagStats(): UseTagStatsResult {
  const [stats, setStats] = useState<TagStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getTagStats();
      setStats(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
  };
}

export function useTagCloud(maxTags: number = 30): UseTagCloudResult {
  const [cloudData, setCloudData] = useState<TagCloudData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchCloudData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await api.getTagCloud(maxTags);
      setCloudData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [maxTags]);

  useEffect(() => {
    fetchCloudData();
  }, [fetchCloudData]);

  return {
    cloudData,
    loading,
    error,
    refetch: fetchCloudData,
  };
}

// Tag mutation hooks
export function useCreateTag() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createTag = useCallback(async (data: TagCreateRequest): Promise<Tag | null> => {
    try {
      setLoading(true);
      setError(null);
      return await api.createTag(data);
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { createTag, loading, error };
}

export function useUpdateTag() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const updateTag = useCallback(async (id: number, data: TagUpdateRequest): Promise<Tag | null> => {
    try {
      setLoading(true);
      setError(null);
      return await api.updateTag(id, data);
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { updateTag, loading, error };
}

export function useDeleteTag() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const deleteTag = useCallback(async (id: number): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);
      await api.deleteTag(id);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { deleteTag, loading, error };
}