import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import apiClient from '../api/client';
import useAuthStore from '../store/authStore';

export const useAuth = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user, token, setUser, setToken, logout: logoutStore } = useAuthStore();

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: async (credentials) => {
            const response = await apiClient.post('/auth/login', credentials);
            return response.data;
        },
        onSuccess: (data) => {
            const { user, token } = data.data;
            setUser(user);
            setToken(token);
            toast.success('¡Bienvenido! Inicio de sesión exitoso');
            navigate('/dashboard');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Error al iniciar sesión';
            toast.error(message);
        },
    });

    // Register mutation
    const registerMutation = useMutation({
        mutationFn: async (userData) => {
            const response = await apiClient.post('/auth/register', userData);
            return response.data;
        },
        onSuccess: (data) => {
            const { user, token } = data.data;
            setUser(user);
            setToken(token);
            toast.success('¡Registro exitoso! Bienvenido');
            navigate('/dashboard');
        },
        onError: (error) => {
            const message = error.response?.data?.message || 'Error al registrarse';
            toast.error(message);
        },
    });

    // Logout mutation
    const logoutMutation = useMutation({
        mutationFn: async () => {
            const response = await apiClient.post('/auth/logout');
            return response.data;
        },
        onSuccess: () => {
            logoutStore();
            queryClient.clear();
            toast.success('Sesión cerrada correctamente');
            navigate('/login');
        },
        onError: () => {
            // Even if API fails, logout locally
            logoutStore();
            queryClient.clear();
            navigate('/login');
        },
    });

    // Get current user query
    // Only fetch once when component mounts and token exists
    // Use token from store, fallback to localStorage for initial load
    const currentToken = token || localStorage.getItem('auth_token');
    const { data: currentUser, isLoading: isLoadingUser, refetch: refetchUser } = useQuery({
        queryKey: ['auth', 'me'],
        queryFn: async () => {
            const response = await apiClient.get('/auth/me');
            return response.data.data;
        },
        enabled: !!currentToken && !user, // Only fetch if token exists and user is not in store
        staleTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: false, // Prevent refetch on window focus
        refetchOnMount: false, // Prevent refetch on mount if data exists
        retry: false, // Don't retry on error to prevent loops
        onSuccess: (data) => {
            // Only update if user data is actually different to prevent unnecessary re-renders
            if (!user || user.id !== data.id) {
                setUser(data);
            }
        },
        onError: (error) => {
            // Only logout if it's a 401 (unauthorized)
            if (error.response?.status === 401) {
                logoutStore();
                // Don't navigate here, let the router handle it
            }
        },
    });

    return {
        user,
        currentUser,
        isLoadingUser,
        isAuthenticated: !!user,
        loginMutation,
        registerMutation,
        logoutMutation,
        isLoading: loginMutation.isPending || registerMutation.isPending || logoutMutation.isPending || isLoadingUser,
        login: loginMutation.mutate,
        isLoggingIn: loginMutation.isPending,
        register: registerMutation.mutate,
        isRegistering: registerMutation.isPending,
        logout: logoutMutation.mutate,
        isLoggingOut: logoutMutation.isPending,
        refetchUser,
    };
};

export default useAuth;
