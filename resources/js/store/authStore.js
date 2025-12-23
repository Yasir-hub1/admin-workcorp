import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useAuthStore = create(
    persist(
        (set, get) => ({
            // State
            user: null,
            token: null,
            isAuthenticated: false,
            permissions: [],
            roles: [],

            // Actions
            setUser: (user) => {
                if (!user) {
                    set({
                        user: null,
                        isAuthenticated: false,
                        permissions: [],
                        roles: [],
                    });
                    return;
                }

                // Extract permissions and roles from user object
                // Handle both array of strings and array of objects
                let permissions = [];
                if (user.permission_names && Array.isArray(user.permission_names)) {
                    permissions = user.permission_names;
                } else if (user.permissions && Array.isArray(user.permissions)) {
                    permissions = user.permissions.map(p => typeof p === 'string' ? p : p.name);
                }

                let roles = [];
                if (user.role_names && Array.isArray(user.role_names)) {
                    roles = user.role_names;
                } else if (user.roles && Array.isArray(user.roles)) {
                    roles = user.roles.map(r => typeof r === 'string' ? r : r.name);
                }
                
                set({
                    user,
                    isAuthenticated: !!user,
                    permissions,
                    roles,
                });
            },

            setToken: (token) => {
                set({ token });
                if (token) {
                    localStorage.setItem('auth_token', token);
                } else {
                    localStorage.removeItem('auth_token');
                }
            },

            logout: () => {
                set({
                    user: null,
                    token: null,
                    isAuthenticated: false,
                    permissions: [],
                    roles: [],
                });
                localStorage.removeItem('auth_token');
            },

            hasPermission: (permission) => {
                const state = get();
                // Super Admin has all permissions
                if (state.isSuperAdmin()) {
                    return true;
                }
                // Check if user has the specific permission
                // Permissions should always be an array of strings after setUser processing
                if (Array.isArray(state.permissions)) {
                    return state.permissions.includes(permission);
                }
                return false;
            },

            hasRole: (role) => {
                const { roles } = get();
                if (Array.isArray(roles)) {
                    return roles.some(r => {
                        if (typeof r === 'string') {
                            return r === role;
                        }
                        return r.name === role || r === role;
                    });
                }
                return false;
            },

            isSuperAdmin: () => {
                return get().hasRole('super_admin');
            },

            isJefeArea: () => {
                return get().hasRole('jefe_area');
            },

            isPersonal: () => {
                return get().hasRole('personal');
            },
        }),
        {
            name: 'auth-storage', // name of the item in localStorage
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
                permissions: state.permissions,
                roles: state.roles,
            }),
        }
    )
);

export default useAuthStore;
