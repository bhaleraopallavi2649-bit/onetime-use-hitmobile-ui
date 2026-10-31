import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TextInput, Pressable,
  StyleSheet, ActivityIndicator, Image, useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LogOut, Save, Edit3 } from 'lucide-react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { BottomWave, LeafDecor } from '../../src/components/AuthDecor';
import { useAuth } from '../../src/lib/authContext';
import { usersApi, analyticsApi } from '../../src/lib/api';
import { useToast } from '../../src/components/Toast';
import { colors } from '../../src/theme';

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrator', builder: 'Builder', agent: 'Agent',
  captain: 'Captain', employee: 'Employee', user: 'Investor', unassigned: 'Unassigned',
};

const ROLE_COLOR: Record<string, string> = {
  admin: '#EF4444', builder: colors.brand, captain: colors.purple,
  agent: colors.blue, employee: colors.green, user: colors.slate, unassigned: colors.muted,
};

// Orange gradient behind the hero, with the bundled property photo faded in on
// the right (reference). Pure decoration: sits behind the content and never
// intercepts touches.
function HeroBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="heroGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#D9640F" />
            <Stop offset="0.55" stopColor="#EE8228" />
            <Stop offset="1" stopColor="#F7A24E" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#heroGrad)" />
      </Svg>
      <Image
        source={require('../../assets/property.jpg')}
        resizeMode="cover"
        style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '58%', opacity: 0.28 }}
      />
      <Svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="heroFade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0.3" stopColor="#EE8228" stopOpacity="0.95" />
            <Stop offset="1" stopColor="#EE8228" stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100" height="100" fill="url(#heroFade)" />
      </Svg>
    </View>
  );
}

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { width: winW } = useWindowDimensions();
  const { user, setUser, logout } = useAuth();
  const toast = useToast();

  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [companyName, setCompanyName] = useState(user?.companyName ?? '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stats, setStats] = useState({ totalVisits: 0, uniqueLeads: 0 });

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const fresh = await usersApi.getMe();
        if (!active) return;
        setUser(fresh);
        setName(fresh.name ?? '');
        setEmail(fresh.email ?? '');
        setCompanyName(fresh.companyName ?? '');
      } catch { /* keep context data */ }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (['admin', 'builder'].includes(user?.role ?? '')) {
      analyticsApi.ownerAnalytics()
        .then((d: any) => setStats({ totalVisits: d?.totalVisits ?? 0, uniqueLeads: d?.uniqueLeads ?? 0 }))
        .catch(() => {});
    }
  }, [user?.role]);

  const dirty = name.trim() !== (user?.name ?? '') || email.trim() !== (user?.email ?? '') || companyName.trim() !== (user?.companyName ?? '');

  const handleSave = async () => {
    if (!name.trim()) { toast.show('Name cannot be empty', 'error'); return; }
    setSaving(true);
    try {
      const updated = await usersApi.updateProfile({ name: name.trim(), email: email.trim() || undefined, companyName: companyName.trim() || undefined });
      setUser(updated);
      setEditing(false);
      toast.show('Profile updated ✓', 'success');
    } catch (e: any) {
      toast.show(e?.message || 'Failed to update', 'error');
    } finally { setSaving(false); }
  };

  const role = user?.role ?? 'user';
  const roleColor = ROLE_COLOR[role] || colors.muted;
  const initial = (user?.name || '?').charAt(0).toUpperCase();
  const joined = user && (user as any).createdAt ? new Date((user as any).createdAt).getFullYear() : null;
  const hasStats = ['admin', 'builder'].includes(role);

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* Soft wave and leaves at the bottom of the page (decorative, behind content). */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
        <BottomWave width={winW} />
      </View>
      <LeafDecor />

      {/* Orange hero banner */}
      <View style={s.hero}>
        <HeroBackdrop />

        {/* Top row: sign out */}
        <View style={s.heroTop}>
          <View>
            <Text style={s.heroTopLabel}>My Profile</Text>
            <View style={s.heroTopUnderline} />
          </View>
          <Pressable
            onPress={logout}
            style={({ pressed }) => [s.signOutBtn, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel="Sign out"
          >
            <LogOut size={16} color={colors.brandDark} />
            <Text style={s.signOutText}>Sign Out</Text>
          </Pressable>
        </View>

        {/* Avatar + identity */}
        <View style={s.heroBody}>
          {/* Avatar */}
          <View style={s.avatarWrap}>
            {user?.businessLogoUrl ? (
              <Image source={{ uri: user.businessLogoUrl }} style={s.avatarImg} />
            ) : (
              <View style={s.avatarFallback}>
                <Text style={s.avatarLetter}>{initial}</Text>
              </View>
            )}
            <View style={s.onlineDot} />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={s.heroName} numberOfLines={1}>{user?.name || 'Unknown'}</Text>
            <View style={s.roleBadge}>
              <Text style={s.roleBadgeText}>{ROLE_LABEL[role] || role}</Text>
            </View>
            {user?.phone && <Text style={s.heroPhone}>{user.phone}</Text>}
          </View>

          {/* Edit button */}
          <Pressable
            onPress={() => setEditing(e => !e)}
            style={({ pressed }) => [s.editBtn, editing && s.editBtnActive, pressed && { opacity: 0.75 }]}
            accessibilityRole="button"
            accessibilityLabel={editing ? 'Close edit profile' : 'Edit profile'}
          >
            <Edit3 size={18} color={editing ? '#fff' : colors.brandDark} />
          </Pressable>
        </View>

        {/* Stats row (admin/builder only) */}
        {hasStats && (
          <View style={s.heroStats}>
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{stats.totalVisits.toLocaleString()}</Text>
              <Text style={s.heroStatLabel}>Page Views</Text>
            </View>
            <View style={s.heroStatDivider} />
            <View style={s.heroStat}>
              <Text style={s.heroStatNum}>{stats.uniqueLeads.toLocaleString()}</Text>
              <Text style={s.heroStatLabel}>Leads</Text>
            </View>
            {joined && (
              <>
                <View style={s.heroStatDivider} />
                <View style={s.heroStat}>
                  <Text style={s.heroStatNum}>{joined}</Text>
                  <Text style={s.heroStatLabel}>Joined</Text>
                </View>
              </>
            )}
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 16 }}>
        {/* Edit form — shown when editing */}
        {editing && (
          <View style={s.formCard}>
            <Text style={s.sectionLabel}>Edit Profile</Text>

            {[
              { label: 'Full Name *', value: name, onChange: setName, placeholder: 'Your name' },
              { label: 'Email', value: email, onChange: setEmail, placeholder: 'you@example.com', keyboardType: 'email-address' as const },
              { label: 'Company Name', value: companyName, onChange: setCompanyName, placeholder: 'Optional' },
            ].map(f => (
              <View key={f.label} style={s.fieldWrap}>
                <Text style={s.fieldLabel}>{f.label}</Text>
                <TextInput
                  value={f.value} onChangeText={f.onChange}
                  placeholder={f.placeholder} placeholderTextColor={colors.muted}
                  autoCapitalize={f.keyboardType === 'email-address' ? 'none' : 'words'}
                  keyboardType={f.keyboardType}
                  style={s.input}
                />
              </View>
            ))}

            {/* Phone read-only */}
            <View style={s.fieldWrap}>
              <Text style={s.fieldLabel}>Phone (cannot be changed)</Text>
              <View style={[s.input, s.inputDisabled]}>
                <Text style={{ color: colors.muted2 }}>{user?.phone || '—'}</Text>
              </View>
            </View>

            <Pressable onPress={handleSave} disabled={!dirty || saving}
              style={[s.saveBtn, (!dirty || saving) && { opacity: 0.5 }]}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Save size={15} color="#fff" />
                  <Text style={s.saveBtnText}>Save Changes</Text>
                </>
              )}
            </Pressable>
          </View>
        )}

        {/* Account details card */}
        <View style={s.detailsCard}>
          <Text style={s.sectionLabel}>Account Details</Text>
          <View style={s.sectionUnderline} />
          {[
            { label: 'Name',    value: user?.name || '—' },
            { label: 'Phone',   value: user?.phone || '—' },
            { label: 'Email',   value: user?.email || '—' },
            { label: 'Company', value: user?.companyName || '—' },
            { label: 'Role',    value: ROLE_LABEL[role] || role },
          ].map(d => (
            <View key={d.label} style={s.detailRow}>
              <Text style={s.detailLabel}>{d.label}</Text>
              <Text style={s.detailValue} numberOfLines={1}>{d.value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FDF3E6' },

  // Hero
  hero: { backgroundColor: '#EE8228', paddingHorizontal: 18, paddingBottom: 18, overflow: 'hidden', position: 'relative' },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, marginBottom: 16 },
  heroTopLabel: { fontSize: 13, fontWeight: '700', color: '#fff', letterSpacing: 1.2, textTransform: 'uppercase' },
  heroTopUnderline: { width: 30, height: 3, borderRadius: 2, backgroundColor: '#FFE2C2', marginTop: 5 },
  // Reference Sign Out: cream pill, orange icon and label.
  signOutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, backgroundColor: '#FFF3E4', paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.7)' },
  signOutText: { fontSize: 13, fontWeight: '700', color: colors.brandDark },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  avatarWrap: { position: 'relative' },
  // Cream ring around the avatar, as in the reference.
  avatarFallback: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: 'rgba(255,243,228,0.9)', shadowColor: colors.brandDark, shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4 },
  avatarImg: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: 'rgba(255,243,228,0.9)' },
  avatarLetter: { color: '#fff', fontSize: 30, fontWeight: '700' },
  onlineDot: { position: 'absolute', width: 18, height: 18, borderRadius: 9, bottom: 2, right: 2, backgroundColor: '#22C55E', borderWidth: 3, borderColor: '#FFF3E4' },
  heroName: { fontSize: 22, fontWeight: '700', color: '#fff', marginBottom: 6 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20, backgroundColor: '#FFF3E4' },
  roleBadgeText: { fontSize: 13, fontWeight: '600', color: colors.brandDark },
  heroPhone: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.95)', marginTop: 6 },
  editBtn: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: 'rgba(255,243,228,0.45)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  editBtnActive: { backgroundColor: colors.brandDark, borderColor: colors.brandDark },
  // Glass stats card: translucent cream, navy numbers.
  heroStats: { flexDirection: 'row', backgroundColor: 'rgba(255,243,228,0.45)', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)' },
  heroStat: { flex: 1, alignItems: 'center', gap: 3 },
  heroStatNum: { fontSize: 22, fontWeight: '700', color: colors.ink },
  heroStatLabel: { fontSize: 10, color: '#4B5563', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  heroStatDivider: { width: 1, marginVertical: 4, backgroundColor: 'rgba(23,35,58,0.14)' },

  // Form
  formCard: { backgroundColor: '#FFFBF6', borderRadius: 20, borderWidth: 1, borderColor: '#EFE2D2', padding: 18, gap: 12, shadowColor: colors.brandDark, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.ink, textTransform: 'uppercase', letterSpacing: 1.2 },
  // Short orange underline under a section title (reference).
  sectionUnderline: { width: 32, height: 3, borderRadius: 2, backgroundColor: colors.brand, marginTop: 5, marginBottom: 6 },
  fieldWrap: { gap: 5 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: colors.ink },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: colors.ink, backgroundColor: colors.cream },
  inputDisabled: { backgroundColor: colors.slateBg, justifyContent: 'center' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: colors.brand, paddingVertical: 14, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },

  // Details
  detailsCard: { backgroundColor: '#FFFBF6', borderRadius: 20, borderWidth: 1, borderColor: '#EFE2D2', paddingHorizontal: 18, paddingTop: 18, paddingBottom: 6, gap: 0, shadowColor: colors.brandDark, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#EDE0CE' },
  detailLabel: { fontSize: 14, color: colors.ink, fontWeight: '400' },
  detailValue: { fontSize: 14, fontWeight: '700', color: colors.ink, maxWidth: '60%' },
});
