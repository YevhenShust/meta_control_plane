// Shared utilities for API layer - mock handling and common functions

// Check if we should use mock data
export const useMock = import.meta.env.VITE_USE_MOCK === '1';

// Helper function for loading mock data with error handling
export async function loadMockData<T>(path: string, key: string): Promise<T[]> {
  try {
    const mockData = await import(`../../../data/${path}.data.json`);
    return (mockData[key] || []) as T[];
  } catch (e) {
    console.debug(`[API] Error loading mock data from ${path}:`, e);
    return [];
  }
}
