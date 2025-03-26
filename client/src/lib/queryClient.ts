// Import only what we need to reduce bundle size
import { QueryClient } from "@tanstack/react-query";
import { getSupabase } from "./supabase";

// Get API URL from environment variable or use a default for local development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Simple utility to handle API responses
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

// Check if we're in Netlify environment
const isNetlify = typeof window !== 'undefined' && 
  (window.location.hostname.includes('netlify.app') || 
   window.location.hostname.includes('netlify.com'));

console.log(`Running in ${isNetlify ? 'Netlify' : 'development'} environment`);

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

// Helper function to get API URL
const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // For Netlify, use the function URL
  return '/.netlify/functions/api-direct';
};

// Helper function to get auth token
const getAuthToken = async () => {
  const supabase = getSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
};

// Generic API request function
export const apiRequest = async <T>(
  endpoint: string,
  { data, method = "GET" }: { data?: any; method?: string } = {}
): Promise<T> => {
  const token = await getAuthToken();
  
  const headers: Record<string, string> = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    method,
    headers,
    credentials: "include",
  };

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${getApiUrl()}${endpoint}`, config);

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || response.statusText);
  }

  return response.json();
};

// Minimal type definition for behavior on 401 responses
type UnauthorizedBehavior = "returnNull" | "throw";

// Define QueryFunction type locally to fix the linter error
type QueryFunction<T> = (context: { queryKey: any[] }) => Promise<T>;

// Optimized query function factory with minimal closure size
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> = (options) => {
  return async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    // Get the current session
    const supabase = getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    
    // Handle URL path for Netlify deployment similar to apiRequest function
    let fullUrl;
    if (isNetlify && typeof url === 'string' && url.startsWith('/api/')) {
      const pathWithoutApi = url.replace(/^\/api/, '');
      fullUrl = `/.netlify/functions/api-direct${pathWithoutApi}`;
    } else {
      fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    }
    
    const res = await fetch(fullUrl, {
      credentials: "include",
      headers: token ? { "Authorization": `Bearer ${token}` } : {},
    });

    if (options.on401 === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };
};
