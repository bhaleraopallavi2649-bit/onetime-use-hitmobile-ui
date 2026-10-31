// ─── WEB-ONLY FALLBACK for expo-secure-store ─────────────────────────────────
// expo-secure-store has no web implementation. This shim re-implements the same
// interface using AsyncStorage (backed by localStorage on web) so the app can
// run in a browser preview without crashing. It is NOT secure storage and must
// never ship to production — Metro only picks this file when platform=web.
// ─────────────────────────────────────────────────────────────────────────────
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'hit_auth_token';

export const tokenStorage = {
  async get(): Promise<string | null> {
    try { return await AsyncStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  async set(token: string): Promise<void> {
    try { await AsyncStorage.setItem(TOKEN_KEY, token); } catch {}
  },
  async clear(): Promise<void> {
    try { await AsyncStorage.removeItem(TOKEN_KEY); } catch {}
  },
};

const POST_DRAFT_KEY = 'hit_ai_post_draft';
const POSTED_LIST_KEY = 'hit_ai_posted_list';

export const postDraftStorage = {
  async get(): Promise<any | null> {
    try { const r = await AsyncStorage.getItem(POST_DRAFT_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
  },
  async set(d: any): Promise<void> {
    try { await AsyncStorage.setItem(POST_DRAFT_KEY, JSON.stringify(d)); } catch {}
  },
  async clear(): Promise<void> {
    try { await AsyncStorage.removeItem(POST_DRAFT_KEY); } catch {}
  },
};

export const postedListStorage = {
  async getAll(): Promise<any[]> {
    try { const r = await AsyncStorage.getItem(POSTED_LIST_KEY); const l = r ? JSON.parse(r) : []; return Array.isArray(l) ? l : []; } catch { return []; }
  },
  async add(item: any): Promise<any[]> {
    try {
      const list = await this.getAll();
      const withId = { ...item, id: item.id || `post_${Date.now()}`, postedAt: Date.now() };
      const matches = (x: any) => (withId.projectId && x.projectId === withId.projectId) || (x.id === withId.id);
      const next = [withId, ...list.filter((x: any) => !matches(x))];
      await AsyncStorage.setItem(POSTED_LIST_KEY, JSON.stringify(next));
      return next;
    } catch { return []; }
  },
  async clear(): Promise<void> {
    try { await AsyncStorage.removeItem(POSTED_LIST_KEY); } catch {}
  },
};

const DISAPPEAR_KEY = 'hit_ai_disappear_ms';
export const disappearStorage = {
  async get(): Promise<number> {
    try { const r = await AsyncStorage.getItem(DISAPPEAR_KEY); const n = r ? Number(r) : 0; return isNaN(n) ? 0 : n; } catch { return 0; }
  },
  async set(ms: number): Promise<void> {
    try { await AsyncStorage.setItem(DISAPPEAR_KEY, String(ms)); } catch {}
  },
};

const CHAT_CLEARED_KEY = 'hit_ai_chat_cleared_before_id';
export const chatClearedBeforeIdStorage = {
  async get(): Promise<string | null> {
    try { return await AsyncStorage.getItem(CHAT_CLEARED_KEY); } catch { return null; }
  },
  async set(id: string): Promise<void> {
    try { await AsyncStorage.setItem(CHAT_CLEARED_KEY, id); } catch {}
  },
  async clear(): Promise<void> {
    try { await AsyncStorage.removeItem(CHAT_CLEARED_KEY); } catch {}
  },
};
