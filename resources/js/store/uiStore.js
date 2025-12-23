import { create } from 'zustand';

const useUIStore = create((set) => ({
    // Sidebar state
    sidebarOpen: true,
    toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    // Loading state
    isLoading: false,
    setLoading: (loading) => set({ isLoading: loading }),

    // Modal state
    modals: {},
    openModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: true }
    })),
    closeModal: (modalId) => set((state) => ({
        modals: { ...state.modals, [modalId]: false }
    })),
    isModalOpen: (modalId) => (state) => state.modals[modalId] || false,

    // Breadcrumbs
    breadcrumbs: [],
    setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

    // Page title
    pageTitle: '',
    setPageTitle: (title) => set({ pageTitle: title }),

    // Theme
    theme: 'light',
    toggleTheme: () => set((state) => ({
        theme: state.theme === 'light' ? 'dark' : 'light'
    })),
    setTheme: (theme) => set({ theme }),
}));

export default useUIStore;
