// Import only what we need to reduce bundle size
import { QueryClient } from "@tanstack/react-query";

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

// Simplified API request function
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Handle URL path for Netlify deployment
  let fullUrl;
  
  if (isNetlify) {
    // For Netlify, remove /api prefix when going to functions
    const pathWithoutApi = url.replace(/^\/api/, '');
    fullUrl = `/.netlify/functions/api-direct${pathWithoutApi}`;
    console.log(`Netlify API request: ${method} ${url} -> ${fullUrl}`);
  } else {
    // For local development
    fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    console.log(`Development API request: ${method} ${fullUrl}`);
  }
  
  console.log(`Making ${method} request to ${fullUrl}${data ? ' with data' : ''}`);
  
  try {
    const res = await fetch(fullUrl, {
      method,
      headers: data ? { "Content-Type": "application/json" } : {},
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`API Error (${res.status}): ${errorText}`);
      throw new Error(`${res.status}: ${errorText || res.statusText}`);
    }
    
    return res;
  } catch (error) {
    console.error(`API Request failed: ${error}`);
    throw error;
  }
}

// Minimal type definition for behavior on 401 responses
type UnauthorizedBehavior = "returnNull" | "throw";

// Optimized query function factory with minimal closure size
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> = (options) => {
  return async ({ queryKey }) => {
    const url = queryKey[0] as string;
    
    // Handle URL path for Netlify deployment similar to apiRequest function
    let fullUrl;
    if (isNetlify && typeof url === 'string' && url.startsWith('/api/')) {
      const pathWithoutApi = url.replace(/^\/api/, '');
      fullUrl = `/.netlify/functions/api${pathWithoutApi}`;
    } else {
      fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    }
    
    const res = await fetch(fullUrl, {
      credentials: "include",
    });

    if (options.on401 === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };
};

// Create a query client with default options
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});
