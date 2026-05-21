import type {  Notification  } from '../../types/models';
import { initialNotifications } from "../../data/mock/notifications.mock";

const STORAGE_KEY = 'mcs_notifications';

const load = (): Notification[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : initialNotifications;
};

const save = (data: Notification[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const notificationService = {
  listByUser: async (userEmail: string, onlyUnread: boolean = false): Promise<Notification[]> => {
    let list = load().filter(n => n.user_email === userEmail);
    if (onlyUnread) {
        list = list.filter(n => !n.read_at);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  },

  getUnreadCount: async (userEmail: string): Promise<number> => {
    return load().filter(n => n.user_email === userEmail && !n.read_at).length;
  },

  create: async (notif: Omit<Notification, 'id' | 'created_at'>): Promise<Notification> => {
    const list = load();
    const newNotif: Notification = {
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
        ...notif
    };
    list.unshift(newNotif); // Add to top
    save(list);
    return newNotif;
  },

  markAsRead: async (id: string): Promise<void> => {
    const list = load();
    const idx = list.findIndex(n => n.id === id);
    if (idx !== -1) {
        list[idx].read_at = new Date().toISOString();
        save(list);
    }
  },

  markAllAsRead: async (userEmail: string): Promise<void> => {
    const list = load();
    const now = new Date().toISOString();
    let changed = false;
    
    list.forEach(n => {
        if (n.user_email === userEmail && !n.read_at) {
            n.read_at = now;
            changed = true;
        }
    });

    if (changed) save(list);
  },

  // Helper to check duplication for automated triggers
  exists: async (userEmail: string, type: string, entityId: string): Promise<boolean> => {
      const list = load();
      return list.some(n => n.user_email === userEmail && n.type === type && n.entity_id === entityId);
  }
};
