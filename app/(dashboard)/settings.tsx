// Settings screen — account, profile, notifications and app info.
import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Linking } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ChevronLeft, User, Bell, Shield, HelpCircle, FileText, Info,
  ChevronRight, LogOut,
} from 'lucide-react-native';
import { useAuth } from '../../src/lib/authContext';
import { colors } from '../../src/theme';
import { PageBackdrop, PhotoHeader, GradientCircle } from '../../src/components/AuthDecor';

const CARD_BG = '#FFFDF9';
const CARD_LINE = '#F3E8D8';
const TILE_BG = '#FDEBDA';
const SUB = '#64718C';

function Row({ icon, label, sub, onPress, danger }: {
  icon: React.ReactNode; label: string; sub?: string; onPress?: () => void; danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={s.row}>
      <View style={[s.rowIcon, danger && { backgroundColor: '#FDE8E6' }]}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      <ChevronRight size={20} color={colors.brand} />
    </Pressable>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <View style={s.sectionHead}>
      <View style={s.sectionBar} />
      <Text style={s.sectionLabel}>{children}</Text>
    </View>
  );
}

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <PageBackdrop />

      {/* Header */}
      <PhotoHeader height={64}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={s.backBtn}>
          <ChevronLeft size={26} color={colors.ink} />
        </Pressable>
        <Text style={s.title}>Settings</Text>
        <View style={{ width: 34 }} />
      </PhotoHeader>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: insets.bottom + 120 }} showsVerticalScrollIndicator={false}>
        {/* Profile card */}
        <Pressable onPress={() => router.push('/(dashboard)/profile' as any)} style={[s.card, s.profileCard]}>
          <GradientCircle size={74} letter={(user?.name || '?').charAt(0).toUpperCase()} fontSize={30} />
          <View style={{ flex: 1 }}>
            <Text style={s.profileName} numberOfLines={1}>{user?.name || 'User'}</Text>
            <Text style={s.profileRole}>{(user?.role || '').charAt(0).toUpperCase() + (user?.role || '').slice(1)}</Text>
          </View>
          <ChevronRight size={20} color={colors.brand} />
        </Pressable>

        {/* Account */}
        <View style={s.section}>
          <SectionLabel>ACCOUNT</SectionLabel>
          <View style={s.card}>
            <Row icon={<User size={24} color={colors.brand} />} label="Edit Profile" sub="Name, email, company" onPress={() => router.push('/(dashboard)/profile' as any)} />
            <View style={s.divider} />
            <Row icon={<Bell size={24} color={colors.brand} />} label="Notifications" sub="View your alerts" onPress={() => router.push('/(dashboard)/notifications' as any)} />
          </View>
        </View>

        {/* Support & Legal */}
        <View style={s.section}>
          <SectionLabel>SUPPORT & LEGAL</SectionLabel>
          <View style={s.card}>
            <Row icon={<HelpCircle size={24} color={colors.brand} />} label="Help & Support" sub="homeintown.in" onPress={() => Linking.openURL('https://homeintown.in')} />
            <View style={s.divider} />
            <Row icon={<Shield size={24} color={colors.brand} />} label="Privacy Policy" onPress={() => Linking.openURL('https://homeintown.in/privacy')} />
            <View style={s.divider} />
            <Row icon={<FileText size={24} color={colors.brand} />} label="Terms of Service" onPress={() => Linking.openURL('https://homeintown.in/terms')} />
          </View>
        </View>

        {/* About (+ Sign out) */}
        <View style={s.section}>
          <SectionLabel>ABOUT</SectionLabel>
          <View style={s.card}>
            <Row icon={<Info size={24} color={colors.brand} />} label="App Version" sub="1.0.0" />
            <View style={s.divider} />
            <Row icon={<LogOut size={24} color={colors.red} />} label="Sign Out" danger onPress={() => logout()} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FFF9F2' },
  backBtn: { width: 34, padding: 2 },
  title: { flex: 1, textAlign: 'center', fontSize: 24, fontWeight: '800', color: colors.ink },
  card: {
    backgroundColor: CARD_BG, borderRadius: 20, borderWidth: 1, borderColor: CARD_LINE, overflow: 'hidden',
    shadowColor: '#B9803F', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 16, paddingVertical: 16 },
  profileName: { fontSize: 20, fontWeight: '800', color: colors.ink },
  profileRole: { fontSize: 14, color: SUB, fontWeight: '500', marginTop: 4 },
  section: { gap: 8 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 2, marginTop: 6 },
  sectionBar: { width: 4, height: 16, borderRadius: 2, backgroundColor: colors.brand },
  sectionLabel: { fontSize: 14, fontWeight: '800', color: colors.ink, letterSpacing: 0.4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 16, paddingVertical: 14 },
  rowIcon: { width: 60, height: 52, borderRadius: 16, backgroundColor: TILE_BG, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 16.5, fontWeight: '800', color: colors.ink },
  rowSub: { fontSize: 13.5, color: SUB, marginTop: 3 },
  divider: { height: 1, backgroundColor: '#F4EADB', marginLeft: 92, marginRight: 16 },
});
