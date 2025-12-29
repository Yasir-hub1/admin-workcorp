import { create } from 'zustand';

const NOTES_WIDGET_STORAGE_KEY = 'ui.notesWidgetOpen';
const readNotesWidgetOpen = () => {
    try {
        const raw = localStorage.getItem(NOTES_WIDGET_STORAGE_KEY);
        if (raw === null) return true; // default abierto
        return raw === 'true';
    } catch {
        return true;
    }
};

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

    // Notes widget (persistente)
    notesWidgetOpen: readNotesWidgetOpen(),
    setNotesWidgetOpen: (open) => set(() => {
        try {
            localStorage.setItem(NOTES_WIDGET_STORAGE_KEY, String(!!open));
        } catch {
            // ignore
        }
        return { notesWidgetOpen: !!open };
    }),
    toggleNotesWidget: () => set((state) => {
        const next = !state.notesWidgetOpen;
        try {
            localStorage.setItem(NOTES_WIDGET_STORAGE_KEY, String(next));
        } catch {
            // ignore
        }
        return { notesWidgetOpen: next };
    }),
}));

export default useUIStore;
