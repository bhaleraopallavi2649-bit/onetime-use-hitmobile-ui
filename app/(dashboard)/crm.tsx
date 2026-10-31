// Home Dashboard.
// Top navbar (menu + logo + upload) → dark welcome card (greeting + views/leads,
// AI tab only) → the AI Leads / CRM / Project switcher, which swaps between three
// embedded screens: LeadMatchingHub, CrmLeadsScreen and the PropertyMap.

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, Pressable, StyleSheet, Animated, useWindowDimensions, ScrollView,
} from 'react-native';
import { HeaderPhoto } from '../../src/components/AuthDecor';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Menu, Plus, Zap, ShoppingBag, BarChart3, Home, Sparkle,
} from 'lucide-react-native';
import {
  crmBridgeApi, CrmAnalytics, analyticsApi,
} from '../../src/lib/api';
import { useAuth } from '../../src/lib/authContext';
import { useSidebar } from '../../src/lib/sidebarContext';
import { colors } from '../../src/theme';
// Reused screens rendered as embedded tab content (no duplication).
import CrmLeadsScreen from './crm-leads';
import LeadMatchingHub from './lead-matching';
import PropertyMap from '../../src/components/PropertyMap';
import ChatEmbedded from '../../src/components/ChatEmbedded';

// 'marketplace' is the Project segment. The name is historical — the segment was
// a marketplace before it became the map — and is left alone because renaming it
// would touch every reference for no behavioural gain.
// 'aichat' is the AI segment: the HIT AI Assistant conversation list / thread
// (it used to be the "Chats" pill inside Lead Matching).
type OverviewTab = 'ai' | 'aichat' | 'crm' | 'marketplace';

// One segment of the AI Leads / CRM / Project switcher.
//
// The three segments sit inside a single connected pill (s.tabPill), so the
// active one reads as a filled pill within a light track rather than as three
// separate cards. The fill is an absolutely-positioned layer whose opacity is
// animated: that keeps the transition smooth while guaranteeing all three
// segments stay exactly the same height and perfectly aligned (a scale/translate
// animation would push the active segment out of the shared container).
function SectionTab({ active, icon, label, badge, onPress }: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  badge?: boolean;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: active ? 1 : 0,
      duration: 170,
      useNativeDriver: true,
    }).start();
  }, [active, anim]);

  return (
    <Pressable
      style={s.segment}
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Animated.View pointerEvents="none" style={[s.segmentFill, { opacity: anim }]} />
      <View style={s.segmentInner}>
        <View style={s.segmentIcon}>
          {icon}
          {badge && <View style={s.hotDotInline} />}
        </View>
        <Text style={[s.segmentLabel, active && s.segmentLabelActive]} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function greetingText(): string {
  const h = new Date().getHours();
  if (h < 12) return 'GOOD MORNING';
  if (h < 17) return 'GOOD AFTERNOON';
  return 'GOOD EVENING';
}

export default function HomeDashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const { openSidebar } = useSidebar();
  const { width: winW } = useWindowDimensions();

  const [analytics, setAnalytics] = useState<CrmAnalytics | null>(null);
  const [stats, setStats] = useState({ views: 0, leads: 0 });
  const [loading, setLoading] = useState(true);
  // Active Overview tab — AI Lead Matching is the default view.
  const [tab, setTab] = useState<OverviewTab>('ai');
  // True while an AI Lead Matching conversation is active → hide the welcome banner.
  const [chatActive, setChatActive] = useState(false);
  // Bumped on every "AI Leads" tap so the hub returns to its default landing page.
  const [aiResetKey, setAiResetKey] = useState(0);

  // Agents can also list/upload projects (backend ProjectController.create allows
  // builder/agent/admin/captain), so include 'agent' here to match permissions.
  const canUpload = ['admin', 'builder', 'captain', 'agent'].includes(user?.role ?? '');

  // Two requests, both for the chrome this screen owns: the welcome card's
  // views/leads totals and the CRM segment's hot-lead dot. The tab contents fetch
  // their own data.
  //
  // This used to also pull the full public project list and then a match count
  // for every project in it — a second copy of a list the Project tab fetches
  // anyway — to feed a property-reels section that had been switched off with
  // `{false && ...}`. Both requests went out on every dashboard open.
  const load = useCallback(async () => {
    try {
      const [overview, crm] = await Promise.allSettled([
        analyticsApi.overview(),
        crmBridgeApi.getAnalytics(),
      ]);

      if (overview.status === 'fulfilled' && Array.isArray(overview.value)) {
        const views = overview.value.reduce((s: number, p: any) => s + (p.totalVisits || 0), 0);
        const leads = overview.value.reduce((s: number, p: any) => s + (p.uniqueLeads || 0), 0);
        setStats({ views, leads });
      }

      if (crm.status === 'fulfilled') setAnalytics(crm.value);
    } catch { /* silent — the banner just shows placeholders */ }
    finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const crmHot = analytics?.hot ?? 0;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Top Navbar ── */}
      <View style={s.navbar}>
        <HeaderPhoto width={Math.round(winW * 0.6)} height={66} />
        <View style={s.navLeft}>
          <Pressable onPress={openSidebar} hitSlop={8} style={s.menuBtn}>
            <Menu size={24} color={colors.ink} />
          </Pressable>
          <View style={s.logoBox}><Home size={22} color="#fff" strokeWidth={2.4} /></View>
          <View>
            <Text style={s.brandName}>HomeInTown</Text>
            <Text style={s.brandTagline}>Your Dream Home, Our Priority</Text>
          </View>
        </View>
        {canUpload && (
          <Pressable style={s.uploadBtn} onPress={() => router.push('/(dashboard)/add-project' as any)}>
            <Plus size={16} color="#fff" strokeWidth={2.5} />
            <Text style={s.uploadText}>Upload</Text>
          </Pressable>
        )}
      </View>

      {/* ── Welcome Banner (only on AI tab, hidden once a chat is active) ── */}
      {tab === 'ai' && !chatActive && (
        <View style={s.welcomeCard}>
          <View style={s.welcomeGlow} />
          <View style={s.welcomeInner}>
            <View>
              <Text style={s.greeting}>{greetingText()}</Text>
              <Text style={s.welcomeName}>{user?.name || 'Welcome'}</Text>
            </View>
            <View style={s.welcomeStats}>
              <View style={s.welcomeStat}>
                <Text style={s.welcomeStatNum}>{loading ? '—' : stats.views}</Text>
                <Text style={s.welcomeStatLabel}>VIEWS</Text>
              </View>
              <View style={s.welcomeStat}>
                <Text style={s.welcomeStatNum}>{loading ? '—' : stats.leads}</Text>
                <Text style={s.welcomeStatLabel}>LEADS</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* ── Tab Switcher (always visible): AI Leads · CRM · Project ──
          A single connected pill: light track, active segment filled brand. */}
      <View style={s.tabRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.tabTrack}
          contentContainerStyle={s.tabPill}
          accessibilityRole="tablist"
        >
          <SectionTab
            active={tab === 'ai'}
            // Always bump the reset signal — tapping "Lead Matching" should land on the
            // default page whether we're switching to it or already on it.
            onPress={() => { setTab('ai'); setAiResetKey((k) => k + 1); }}
            icon={<Zap size={15} color={colors.brand} />}
            label="Lead Matching"
          />
          <SectionTab
            active={tab === 'aichat'}
            onPress={() => setTab('aichat')}
            icon={<Sparkle size={14} color={colors.brand} fill={colors.brand} />}
            label="AI"
          />
          <SectionTab
            active={tab === 'crm'}
            onPress={() => setTab('crm')}
            icon={<BarChart3 size={15} color={colors.brand} />}
            label="CRM"
            badge={crmHot > 0}
          />
          <SectionTab
            active={tab === 'marketplace'}
            onPress={() => setTab('marketplace')}
            icon={<ShoppingBag size={15} color={colors.brand} />}
            label="Project"
          />
        </ScrollView>
      </View>

      {/* ── CRM tab ── */}
      {tab === 'crm' && (
        <View style={{ flex: 1 }}>
          <CrmLeadsScreen embedded />
        </View>
      )}

      {/* ── Project tab: full Google-map property view ── */}
      {tab === 'marketplace' && (
        <View style={{ flex: 1 }}>
          <PropertyMap isAdmin={user?.role === 'admin'} />
        </View>
      )}

      {/* ── AI tab: HIT AI Assistant conversations ── */}
      {tab === 'aichat' && (
        <View style={{ flex: 1 }}>
          <ChatEmbedded />
        </View>
      )}

      {/* ── AI Lead Matching tab: the AI Lead Matching hub (banner is now above) ── */}
      {tab === 'ai' && (
        <View style={{ flex: 1 }}>
          {/* The actual AI Lead Matching feature (AI Lead Matching / Groups / Chats) */}
          <View style={{ flex: 1 }}>
            <LeadMatchingHub embedded onChatActiveChange={setChatActive} resetSignal={aiResetKey} />
          </View>
        </View>
      )}

    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream },

  // Navbar
  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: colors.white, overflow: 'hidden',
    borderBottomWidth: 1, borderBottomColor: colors.line,
  },
  navLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuBtn: { padding: 2 },
  logoBox: { width: 42, height: 42, borderRadius: 13, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontWeight: '700', fontSize: 12 },
  brandName: { fontSize: 17, fontWeight: '700', color: colors.ink, letterSpacing: 0.2 },
  brandTagline: { fontSize: 9.5, fontWeight: '600', color: colors.brand, marginTop: 1 },
  uploadBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.brand, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 22, shadowColor: colors.brandDark, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 3 },
  uploadText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  // Welcome card — deep teal surface so it stands out from cream background
  welcomeCard: {
    marginHorizontal: 12, marginTop: 12,
    borderRadius: 16, backgroundColor: colors.brandDark,
    padding: 16, overflow: 'hidden', position: 'relative',
  },
  welcomeGlow: { position: 'absolute', width: 130, height: 130, borderRadius: 65, backgroundColor: 'rgba(255,255,255,0.06)', top: -50, right: -30 },
  welcomeInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greeting: { color: 'rgba(255,255,255,0.70)', fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  welcomeName: { color: '#fff', fontSize: 21, fontWeight: '700', marginTop: 3 },
  welcomeStats: { flexDirection: 'row', gap: 18 },
  welcomeStat: { alignItems: 'center' },
  welcomeStatNum: { color: '#fff', fontSize: 19, fontWeight: '700' },
  welcomeStatLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 8, fontWeight: '700', letterSpacing: 0.6, marginTop: 1 },

  // CRM "hot lead" badge, overlaid on that segment's icon.
  hotDotInline: { position: 'absolute', top: -3, right: -4, width: 7, height: 7, borderRadius: 4, backgroundColor: '#EF4444', borderWidth: 1, borderColor: colors.white },

  // ── Section switcher: one connected pill ──────────────────────────────────
  tabRow: { paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFF9F2' },
  // Four separate outlined pills (Lead Matching · AI · CRM · Project).
  // One rounded section; only the buttons inside it slide sideways.
  tabTrack: {
    flexGrow: 0,
    backgroundColor: '#FFF3E4',
    borderWidth: 1,
    borderColor: '#F6DFC3',
    borderRadius: 24,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 6,
    paddingVertical: 6,
  },
  segment: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#F3DDC2',
    backgroundColor: '#FFFBF5',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  segmentFill: {
    position: 'absolute', top: 0, right: 0, bottom: 0, left: 0,
    backgroundColor: '#FDE6CC',
    borderWidth: 1,
    borderColor: '#F3B684',
    borderRadius: 18,
  },
  segmentInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  segmentIcon: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  segmentLabel: { fontSize: 12.5, fontWeight: '600', color: colors.ink },
  segmentLabelActive: { color: colors.ink, fontWeight: '700' },

});
