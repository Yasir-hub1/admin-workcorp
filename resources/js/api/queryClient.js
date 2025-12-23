import { QueryClient } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 5 * 60 * 1000, // 5 minutes
            cacheTime: 10 * 60 * 1000, // 10 minutes
            onError: (error) => {
                console.error('Query error:', error);
            },
        },
        mutations: {
            onError: (error) => {
                console.error('Mutation error:', error);
            },
        },
    },
});

export default queryClient;
