import { create } from 'zustand';

const useNotificationStore = create((set, get) => ({
    // State
    notifications: [],
    unreadCount: 0,

    // Actions
    setNotifications: (notifications) => set({
        notifications,
        unreadCount: notifications.filter(n => !n.read_at).length,
    }),

    addNotification: (notification) => set((state) => ({
        notifications: [notification, ...state.notifications],
        unreadCount: state.unreadCount + 1,
    })),

    markAsRead: (notificationId) => set((state) => ({
        notifications: state.notifications.map(n =>
            n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
    })),

    markAllAsRead: () => set((state) => ({
        notifications: state.notifications.map(n => ({
            ...n,
            read_at: n.read_at || new Date().toISOString(),
        })),
        unreadCount: 0,
    })),

    removeNotification: (notificationId) => set((state) => {
        const notification = state.notifications.find(n => n.id === notificationId);
        const wasUnread = notification && !notification.read_at;

        return {
            notifications: state.notifications.filter(n => n.id !== notificationId),
            unreadCount: wasUnread ? Math.max(0, state.unreadCount - 1) : state.unreadCount,
        };
    }),

    clearAll: () => set({
        notifications: [],
        unreadCount: 0,
    }),
}));

export default useNotificationStore;
