import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { stackClientApp } from "./stack";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Cache-Control": "no-cache",
  };
  
  // Get current user from Stack Auth to include user ID in headers
  try {
    const user = await stackClientApp.getUser();
    if (user) {
      headers["x-stack-user-id"] = user.id;
    }
  } catch (error) {
    // User not authenticated, continue without header
  }
  
  return headers;
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const headers = await getAuthHeaders();
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  
  const res = await fetch(url, {
    method,
    headers,
    cache: "no-store",
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const headers = await getAuthHeaders();
    
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
      cache: "no-store",
      headers,
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000, // 5 minutes - reasonable cache time instead of Infinity
      gcTime: 10 * 60 * 1000, // 10 minutes - garbage collection time (previously cacheTime)
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
