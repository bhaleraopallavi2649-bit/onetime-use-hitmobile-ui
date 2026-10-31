import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell, CheckCheck, TrendingUp, MessageSquare, ShoppingBag,
  Zap, Users, Star, Settings, AlertCircle, ChevronRight,
} from 'lucide-react-native';
import { notificationsApi, AppNotification } from '../../src/lib/api';
import { SkeletonRow } from '../../src/components/Skeleton';
import EmptyState from '../../src/components/EmptyState';
import MenuButton from '../../src/components/MenuButton';
import { colors } from '../../src/theme';
import { PageBackdrop, PhotoHeader } from '../../src/components/AuthDecor';

/* ── Type config ── */
const TYPE_CONFIG: Record<string, { icon: React.ReactNode; bg: string; accent: string; label: string }> = {
  lead_stage_change:  { icon: <TrendingUp size={24} color={colors.blueText} />,   bg: colors.blueBg,   accent: colors.blueText,   label: 'Lead Update' },
  lead_assigned:      { icon: <Users size={24} color={colors.indigoText} />,       bg: colors.indigoBg, accent: colors.indigoText,  label: 'Lead Assigned' },
  lead_follow_up:     { icon: <AlertCircle size={24} color={colors.amberText} />, bg: colors.amberBg,  accent: colors.amberText,   label: 'Follow-up' },
  new_chat_message:   { icon: <MessageSquare size={24} color={colors.cyanText} />, bg: colors.cyanBg,  accent: colors.cyanText,   label: 'Message' },
  marketplace_action: { icon: <ShoppingBag size={24} color={colors.purpleText} />, bg: colors.purpleBg, accent: colors.purpleText, label: 'Marketplace' },
  commission_update:  { icon: <Star size={24} color={colors.greenText} />,         bg: colors.greenBg, accent: colors.greenText,   label: 'Commission' },
  new_listing:        { icon: <ShoppingBag size={24} color={colors.pinkText} />,   bg: colors.pinkBg,  accent: colors.pinkText,    label: 'New Listing' },
  lead_match:         { icon: <Zap size={26} color={colors.brand} />,              bg: '#FDEBDA', accent: '#7A3E0C',          label: 'Lead Match' },
  system:             { icon: <Settings size={24} color={colors.slateText} />,     bg: colors.slateBg,  accent: colors.slateText,  label: 'System' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.system;
}

/* ── Time helpers ── */
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function dateLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* ── Group notifications by date ── */
function groupByDate(items: AppNotification[]): { label: string; items: AppNotification[] }[] {
  const map = new Map<string, AppNotification[]>();
  items.forEach(n => {
    const lbl = dateLabel(n.createdAt);
    if (!map.has(lbl)) map.set(lbl, []);
    map.get(lbl)!.push(n);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await notificationsApi.list({ limit: 50 });
      setItems(res.notifications);
      setUnread(res.unreadCount);
    } catch { /* silent */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handlePress = async (n: AppNotification) => {
    if (n.read) return;
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: true } : x));
    setUnread(u => Math.max(0, u - 1));
    notificationsApi.markRead(n.id).catch(() => {
      setItems(prev => prev.map(x => x.id === n.id ? { ...x, read: false } : x));
      setUnread(u => u + 1);
    });
  };

  const handleMarkAll = async () => {
    if (markingAll || unread === 0) return;
    setMarkingAll(true);
    const prev = items;
    setItems(list => list.map(x => ({ ...x, read: true })));
    setUnread(0);
    notificationsApi.markAllRead().catch(() => { setItems(prev); }).finally(() => setMarkingAll(false));
  };

  const groups = groupByDate(items);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageBackdrop />
      {/* Header */}
      <PhotoHeader height={76} photoWidth={200} style={{ justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 }}>
          <MenuButton color={colors.brand} />
          <View>
            <Text style={s.title}>Notifications</Text>
            <Text style={s.sub}>{unread > 0 ? `${unread} unread` : 'All caught up'}</Text>
          </View>
        </View>
        <Pressable onPress={handleMarkAll} disabled={unread === 0 || markingAll}
          style={[s.markAllBtn, unread === 0 && { opacity: 0.5 }]}>
          <CheckCheck size={18} color={unread === 0 ? colors.muted : colors.brand} />
          <Text style={[s.markAllText, { color: unread === 0 ? colors.muted : '#7A3E0C' }]}>Mark all</Text>
        </Pressable>
      </PhotoHeader>

      {loading ? (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
          {[0,1,2,3,4].map(i => <SkeletonRow key={i} />)}
        </ScrollView>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell size={28} color={colors.muted} />}
          title="No notifications yet"
          subtitle="Lead updates, messages and marketplace activity will show up here."
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={colors.brand} />}
        >
          {groups.map(group => (
            <View key={group.label}>
              {/* Date group header */}
              <View style={s.groupHeader}>
                <View style={s.groupLine} />
                <Text style={s.groupLabel}>{group.label}</Text>
                <View style={s.groupLine} />
              </View>

              {/* Notifications in group */}
              <View style={s.groupItems}>
                {group.items.map(n => {
                  const cfg = getTypeConfig(n.type);
                  return (
                    <Pressable key={n.id} onPress={() => handlePress(n)}
                      style={[s.card, !n.read && s.cardUnread]}>

                      {/* Type icon */}
                      <View style={[s.iconBox, { backgroundColor: cfg.bg }]}>
                        {cfg.icon}
                      </View>

                      {/* Content */}
                      <View style={{ flex: 1 }}>
                        <View style={s.cardTop}>
                          <View style={[s.typePill, { backgroundColor: '#FDEBDA' }]}>
                            <Text style={[s.typeText, { color: '#7A3E0C' }]}>{cfg.label}</Text>
                          </View>
                          <View style={s.timeWrap}>
                            <Text style={s.timeText}>{timeAgo(n.createdAt)}</Text>
                            {!n.read && <View style={s.unreadDot} />}
                          </View>
                        </View>
                        <Text style={s.cardTitle} numberOfLines={2}>
                          {n.title || 'Notification'}
                        </Text>
                        {n.message ? (
                          <Text style={s.cardMsg} numberOfLines={2}>{n.message}</Text>
                        ) : null}
                      </View>

                      <View style={s.chev}><ChevronRight size={20} color={colors.brand} /></View>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF9F2' },
  title: { fontSize: 25, fontWeight: '800', color: colors.ink },
  sub: { fontSize: 13.5, color: '#64718C', marginTop: 1 },
  markAllBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 11,
    borderRadius: 22, borderWidth: 1, borderColor: '#F0DFC8', backgroundColor: '#FFFDF9',
    shadowColor: '#B9803F', shadowOpacity: 0.14, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  markAllText: { fontSize: 15, fontWeight: '800' },

  // Date group
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 12 },
  groupLine: { flex: 1, height: 1, backgroundColor: '#E9D5B8' },
  groupLabel: { fontSize: 13.5, fontWeight: '800', color: colors.ink, textTransform: 'uppercase', letterSpacing: 0.4 },
  groupItems: { paddingHorizontal: 16, gap: 14 },

  // Card
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: '#FFFDF9', borderRadius: 20,
    borderWidth: 1, borderColor: '#F3E8D8', paddingVertical: 16, paddingLeft: 16, paddingRight: 40,
    shadowColor: '#B9803F', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardUnread: { backgroundColor: '#FFFDF9', borderColor: '#F3E8D8' },
  iconBox: { width: 62, height: 62, borderRadius: 18, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  typePill: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  typeText: { fontSize: 12.5, fontWeight: '700' },
  timeWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { fontSize: 12.5, color: '#64718C' },
  cardTitle: { fontSize: 16, fontWeight: '800', color: colors.ink, lineHeight: 22 },
  cardMsg: { fontSize: 13.5, color: '#5F6C86', marginTop: 5, lineHeight: 21 },
  unreadDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.brand, flexShrink: 0 },
  chev: { position: 'absolute', right: 12, top: 0, bottom: 0, justifyContent: 'center' },
});
