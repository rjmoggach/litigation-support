"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import type { 
  GalleryResponse, 
  GalleryCreate, 
  ImageResponse 
} from "@/lib/api/types.gen";

// Real API functions using generated client
import {
  listGalleriesApiV1GalleriesGet,
  createGalleryApiV1GalleriesPost,
  updateGalleryApiV1GalleriesGalleryIdPut,
  deleteGalleryApiV1GalleriesGalleryIdDelete,
  getGalleryApiV1GalleriesGalleryIdGet,
  addImagesToGalleryApiV1GalleriesGalleryIdImagesPost,
  removeImagesFromGalleryApiV1GalleriesGalleryIdImagesDelete,
  getGalleryImagesApiV1GalleriesGalleryIdImagesGet,
  listImagesApiV1ImagesGet,
} from "@/lib/api/sdk.gen";

// Types for hook options and results
export interface UseGalleriesOptions {
  skip?: number;
  limit?: number;
  search?: string;
  autoFetch?: boolean;
}

export interface UseGalleriesResult {
  galleries: GalleryResponse[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseGalleryResult {
  gallery: GalleryResponse | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseGalleryImagesResult {
  images: ImageResponse[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export interface UseImagesResult {
  images: ImageResponse[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Global flag to prevent multiple simultaneous requests
let isGlobalFetchInProgress = false;

const createAuthHeaders = (token?: string) => {
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const api = {
  getGalleries: async (options: UseGalleriesOptions = {}, authToken?: string): Promise<{ items: GalleryResponse[]; total: number }> => {
    // Global check to prevent multiple simultaneous requests
    if (isGlobalFetchInProgress) {
      console.log('Preventing duplicate galleries API call');
      return { items: [], total: 0 };
    }
    
    try {
      isGlobalFetchInProgress = true;
      console.log('Making galleries API call with options:', options);
      
      const response = await listGalleriesApiV1GalleriesGet({
        headers: createAuthHeaders(authToken),
        query: {
          skip: options.skip || 0,
          limit: options.limit || 50,
          search: options.search || undefined,
        },
      });
      
      if (response.error) {
        throw new Error(response.error.detail || 'Failed to fetch galleries');
      }
      
      return {
        items: response.data || [],
        total: response.data?.length || 0,
      };
    } finally {
      // Release the lock after a delay to prevent rapid successive calls
      setTimeout(() => {
        isGlobalFetchInProgress = false;
      }, 1000);
    }
  },

  getGallery: async (id: number, authToken?: string): Promise<GalleryResponse> => {
    const response = await getGalleryApiV1GalleriesGalleryIdGet({
      headers: createAuthHeaders(authToken),
      path: { gallery_id: id },
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to fetch gallery');
    }
    
    if (!response.data) {
      throw new Error('Gallery not found');
    }
    
    return response.data;
  },

  getGalleryImages: async (galleryId: number, authToken?: string): Promise<ImageResponse[]> => {
    const response = await getGalleryImagesApiV1GalleriesGalleryIdImagesGet({
      headers: createAuthHeaders(authToken),
      path: { gallery_id: galleryId },
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to fetch gallery images');
    }
    
    return response.data || [];
  },

  getImages: async (options: { skip?: number; limit?: number; search?: string } = {}, authToken?: string): Promise<{ items: ImageResponse[]; total: number }> => {
    const response = await listImagesApiV1ImagesGet({
      headers: createAuthHeaders(authToken),
      query: {
        skip: options.skip || 0,
        limit: options.limit || 50,
        search: options.search || undefined,
      },
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to fetch images');
    }
    
    return {
      items: response.data || [],
      total: response.data?.length || 0,
    };
  },

  createGallery: async (data: GalleryCreate, authToken?: string): Promise<GalleryResponse> => {
    const response = await createGalleryApiV1GalleriesPost({
      headers: createAuthHeaders(authToken),
      body: data,
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to create gallery');
    }
    
    if (!response.data) {
      throw new Error('Failed to create gallery - no data returned');
    }
    
    return response.data;
  },

  updateGallery: async (id: number, data: GalleryCreate, authToken?: string): Promise<GalleryResponse> => {
    const response = await updateGalleryApiV1GalleriesGalleryIdPut({
      headers: createAuthHeaders(authToken),
      path: { gallery_id: id },
      body: data,
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to update gallery');
    }
    
    if (!response.data) {
      throw new Error('Failed to update gallery - no data returned');
    }
    
    return response.data;
  },

  deleteGallery: async (id: number, authToken?: string): Promise<void> => {
    const response = await deleteGalleryApiV1GalleriesGalleryIdDelete({
      headers: createAuthHeaders(authToken),
      path: { gallery_id: id },
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to delete gallery');
    }
  },

  addImagesToGallery: async (galleryId: number, imageIds: number[], authToken?: string): Promise<void> => {
    const response = await addImagesToGalleryApiV1GalleriesGalleryIdImagesPost({
      headers: createAuthHeaders(authToken),
      path: { gallery_id: galleryId },
      body: { image_ids: imageIds },
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to add images to gallery');
    }
  },

  removeImagesFromGallery: async (galleryId: number, imageIds: number[], authToken?: string): Promise<void> => {
    const response = await removeImagesFromGalleryApiV1GalleriesGalleryIdImagesDelete({
      headers: createAuthHeaders(authToken),
      path: { gallery_id: galleryId },
      body: { image_ids: imageIds },
    });
    
    if (response.error) {
      throw new Error(response.error.detail || 'Failed to remove images from gallery');
    }
  },
};

export function useGalleries(options: UseGalleriesOptions = {}): UseGalleriesResult {
  const { data: session } = useSession();
  const [galleries, setGalleries] = useState<GalleryResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const isRequestInProgress = useRef(false);

  // Destructure options to avoid object dependency issues
  const { skip, limit, search, autoFetch = true } = options;
  const authToken = session?.accessToken;

  const fetchGalleries = useCallback(async () => {
    if (!authToken) return;
    
    // Prevent multiple simultaneous requests
    if (isRequestInProgress.current) return;
    
    try {
      isRequestInProgress.current = true;
      setLoading(true);
      setError(null);
      const result = await api.getGalleries({ skip, limit, search }, authToken);
      setGalleries(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
      isRequestInProgress.current = false;
    }
  }, [authToken, skip, limit, search]);

  useEffect(() => {
    if (autoFetch && authToken) {
      fetchGalleries();
    }
  }, [fetchGalleries, autoFetch, authToken]);

  return {
    galleries,
    total,
    loading,
    error,
    refetch: fetchGalleries,
  };
}

export function useGallery(id: number): UseGalleryResult {
  const { data: session } = useSession();
  const [gallery, setGallery] = useState<GalleryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const authToken = session?.accessToken;

  const fetchGallery = useCallback(async () => {
    if (!authToken || !id) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await api.getGallery(id, authToken);
      setGallery(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [id, authToken]);

  useEffect(() => {
    if (authToken && id) {
      fetchGallery();
    }
  }, [fetchGallery, authToken, id]);

  return {
    gallery,
    loading,
    error,
    refetch: fetchGallery,
  };
}

export function useGalleryImages(galleryId: number): UseGalleryImagesResult {
  const { data: session } = useSession();
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const authToken = session?.accessToken;

  const fetchImages = useCallback(async () => {
    if (!authToken || !galleryId) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await api.getGalleryImages(galleryId, authToken);
      setImages(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [galleryId, authToken]);

  useEffect(() => {
    if (authToken && galleryId) {
      fetchImages();
    }
  }, [fetchImages, authToken, galleryId]);

  return {
    images,
    loading,
    error,
    refetch: fetchImages,
  };
}

export function useImages(options: { skip?: number; limit?: number; search?: string } = {}): UseImagesResult {
  const { data: session } = useSession();
  const [images, setImages] = useState<ImageResponse[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { skip, limit, search } = options;
  const authToken = session?.accessToken;

  const fetchImages = useCallback(async () => {
    if (!authToken) return;
    
    try {
      setLoading(true);
      setError(null);
      const result = await api.getImages({ skip, limit, search }, authToken);
      setImages(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, [authToken, skip, limit, search]);

  useEffect(() => {
    if (authToken) {
      fetchImages();
    }
  }, [fetchImages, authToken]);

  return {
    images,
    total,
    loading,
    error,
    refetch: fetchImages,
  };
}

// Gallery mutation hooks
export function useCreateGallery() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const authToken = session?.accessToken;

  const createGallery = useCallback(async (data: GalleryCreate): Promise<GalleryResponse | null> => {
    if (!authToken) {
      setError(new Error('Authentication required'));
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      return await api.createGallery(data, authToken);
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  return { createGallery, loading, error };
}

export function useUpdateGallery() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const authToken = session?.accessToken;

  const updateGallery = useCallback(async (id: number, data: GalleryCreate): Promise<GalleryResponse | null> => {
    if (!authToken) {
      setError(new Error('Authentication required'));
      return null;
    }

    try {
      setLoading(true);
      setError(null);
      return await api.updateGallery(id, data, authToken);
    } catch (err) {
      setError(err as Error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  return { updateGallery, loading, error };
}

export function useDeleteGallery() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const authToken = session?.accessToken;

  const deleteGallery = useCallback(async (id: number): Promise<boolean> => {
    if (!authToken) {
      setError(new Error('Authentication required'));
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      await api.deleteGallery(id, authToken);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  return { deleteGallery, loading, error };
}

export function useGalleryImageActions() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const authToken = session?.accessToken;

  const addImages = useCallback(async (galleryId: number, imageIds: number[]): Promise<boolean> => {
    if (!authToken) {
      setError(new Error('Authentication required'));
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      await api.addImagesToGallery(galleryId, imageIds, authToken);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  const removeImages = useCallback(async (galleryId: number, imageIds: number[]): Promise<boolean> => {
    if (!authToken) {
      setError(new Error('Authentication required'));
      return false;
    }

    try {
      setLoading(true);
      setError(null);
      await api.removeImagesFromGallery(galleryId, imageIds, authToken);
      return true;
    } catch (err) {
      setError(err as Error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [authToken]);

  return { addImages, removeImages, loading, error };
}