import axios from 'axios';
import useAuthStore from '../store/authStore';

// Create axios instance
const apiClient = axios.create({
    baseURL: '/api/v1',
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    withCredentials: true, // Important for Sanctum
});

// Request interceptor
apiClient.interceptors.request.use(
    (config) => {
        // You can add auth token here if needed
        const token = localStorage.getItem('auth_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
apiClient.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // Handle errors globally
        if (error.response) {
            // Handle 401 Unauthorized
            if (error.response.status === 401) {
                // Clear token and logout from store
                // Don't navigate here - let PrivateRoute handle it
                useAuthStore.getState().logout();
            }

            // Handle 403 Forbidden
            if (error.response.status === 403) {
                console.error('No tienes permisos para realizar esta acción');
            }

            // Handle 404 Not Found
            if (error.response.status === 404) {
                console.error('Recurso no encontrado');
            }

            // Handle 422 Validation Error
            if (error.response.status === 422) {
                console.error('Errores de validación:', error.response.data.errors);
            }

            // Handle 500 Server Error
            if (error.response.status === 500) {
                console.error('Error del servidor');
            }
        }

        return Promise.reject(error);
    }
);

export default apiClient;
