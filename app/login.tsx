import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Phone, Lock, User, Mail, ArrowRight, ShieldCheck, Home, Check, Eye, EyeOff, HardHat, Building2 } from 'lucide-react-native';
import { authApi, employeeApi } from '../src/lib/api';
import { useAuth } from '../src/lib/authContext';
import { useToast } from '../src/components/Toast';
import { colors } from '../src/theme';
import { PropertyPhotoCorner, BottomWave } from '../src/components/AuthDecor';

type Screen = 'login' | 'register' | 'forgot-phone' | 'otp' | 'reset-mpin';

const MUTED = colors.muted;

// Platform serif family for headings (built-in fonts — no asset bundling needed).
const SERIF = Platform.select({
  android: 'serif',
  ios: 'Georgia',
  default: 'Georgia, "Times New Roman", serif',
});

// ── Warm orange / cream palette (matches reference screenshots) ──
const O = {
  primary: '#D97316',     // primary orange (button / logo / icons)
  deep: '#C05E0C',        // deep orange (pressed / accents)
  cream: '#FAF3E8',       // warm cream background
  cardCream: '#FBF6EE',   // card / input fill
  beige: '#EFE2CF',       // soft beige borders
  white: '#FFFFFF',
  navy: '#17233A',        // dark navy headings
  sub: '#6B7280',         // secondary text
  border: '#E7DAC6',      // input border
};

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { checkAuth } = useAuth();
  const toast = useToast();
  const { width } = useWindowDimensions();

  const [screen, setScreen] = useState<Screen>('login');
  const [loading, setLoading] = useState(false);

  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [mpin, setMpin] = useState('');
  const [confirmMpin, setConfirmMpin] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [role, setRole] = useState<'user' | 'employee' | 'captain'>('user');
  const [companyName, setCompanyName] = useState('');
  const [isResetFlow, setIsResetFlow] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');

  const [showMpin, setShowMpin] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const formatPhone = (p: string) => (p.startsWith('+') ? p : `+91${p}`);
  const validatePhone = (p: string) => /^(?:\+91)?[6-9]\d{9}$/.test(p);
  const validateMpin = (m: string) => /^\d{4,6}$/.test(m);

  const resetFields = () => {
    setMpin(''); setConfirmMpin(''); setOtpCode(''); setName(''); setEmail(''); setCompanyName('');
    setShowMpin(false); setShowConfirm(false);
  };

  const onLogin = async () => {
    if (!validatePhone(phone)) return toast.error('Enter a valid phone number (e.g. 9970119846)');
    if (!validateMpin(mpin)) return toast.error('MPIN should be 4-6 digits');
    try {
      setLoading(true);
      const formatted = formatPhone(phone);
      const { user } = await authApi.login(formatted, mpin);
      if (user.role === 'employee') {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          toast.error('Location permission is mandatory for field workforce.');
          setLoading(false);
          return;
        }
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        await employeeApi.submitLocation(pos.coords.latitude, pos.coords.longitude);
      }
      toast.success('Welcome back!');
      await checkAuth();
      router.replace('/(dashboard)/crm');
    } catch (e: any) {
      toast.error(e?.message || 'Invalid phone or MPIN');
      setLoading(false);
    }
  };

  const onRegister = async () => {
    if (!name.trim()) return toast.error('Name is required');
    if (!validatePhone(phone)) return toast.error('Enter a valid phone number');
    if (!validateMpin(mpin)) return toast.error('MPIN should be 4-6 digits');
    if (mpin !== confirmMpin) return toast.error('MPINs do not match');
    if (role === 'captain' && !companyName.trim()) return toast.error('Company name is required for captain');
    try {
      setLoading(true);
      const formatted = formatPhone(phone);
      setPhone(formatted);
      const res = await authApi.register({
        name, phone: formatted, mpin, email, role,
        ...(role === 'captain' && { companyName: companyName.trim() }),
      });
      if ((res as any).bypassed) {
        toast.success('Registered successfully!');
        await checkAuth();
        router.replace('/(dashboard)/crm');
        return;
      }
      toast.success('OTP sent successfully');
      setIsResetFlow(false);
      setScreen('otp');
    } catch (e: any) {
      toast.error(e?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const onForgot = async () => {
    if (!validatePhone(forgotPhone)) return toast.error('Enter a valid registered phone number');
    try {
      setLoading(true);
      const formatted = formatPhone(forgotPhone);
      setForgotPhone(formatted);
      await authApi.forgotMpin(formatted);
      setIsResetFlow(true);
      setScreen('otp');
      toast.success('OTP sent for verification');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const onOtp = async () => {
    if (otpCode.length < 6) return toast.error('Enter a valid 6-digit OTP');
    try {
      setLoading(true);
      if (isResetFlow) {
        setScreen('reset-mpin');
      } else {
        await authApi.verifyOtp(phone, otpCode);
        toast.success('Verification successful!');
        await checkAuth();
        router.replace('/(dashboard)/crm');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const onReset = async () => {
    if (!validateMpin(mpin)) return toast.error('New MPIN should be 4-6 digits');
    if (mpin !== confirmMpin) return toast.error('MPINs do not match');
    try {
      setLoading(true);
      await authApi.resetMpin(forgotPhone, otpCode, mpin);
      toast.success('MPIN reset successful! Please login.');
      resetFields();
      setForgotPhone('');
      setIsResetFlow(false);
      setScreen('login');
    } catch (e: any) {
      toast.error(e?.message || 'Reset failed');
      if (e?.message?.toLowerCase?.().includes('otp')) setScreen('otp');
    } finally {
      setLoading(false);
    }
  };

  const isOrangeScreen = screen === 'login' || screen === 'register';
  const pageBg = isOrangeScreen ? O.cream : colors.cream;

  // decorative art sizing (top-right corner)
  const artW = Math.min(width * 0.62, 270);
  const artH = Math.round(artW * 1.05);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1, backgroundColor: pageBg }}
    >
      {/* ── Top-right property illustration (login + register only) ── */}
      {isOrangeScreen && (
        <View pointerEvents="none" style={[st.cornerArt, { width: artW, height: artH, top: 0, right: 0 }]}>
          <PropertyPhotoCorner width={artW} height={artH} fade={O.cream} />
        </View>
      )}
      {/* ── Bottom decorative wave ── */}
      {isOrangeScreen && (
        <View pointerEvents="none" style={st.bottomWave}>
          <BottomWave width={width} />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════ LOGIN ══════════ */}
        {screen === 'login' && (
          <View style={o.wrap}>
            {/* Brand (centered row: logo + wordmark) */}
            <View style={o.brandCenter}>
              <View style={o.logoSquare}>
                <Home size={30} color={O.white} strokeWidth={2.4} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={o.brandName}>HomeInTown</Text>
                <Text style={o.brandTag}>SALES INTELLIGENCE</Text>
              </View>
            </View>

            <View style={o.card}>
              <View style={o.accentBar} />
              <Text style={o.h1}>Welcome</Text>
              <Text style={o.sub}>Enter your credentials to continue</Text>

              <View style={{ height: 22 }} />

              <OField icon={<Phone size={20} color={O.primary} />}>
                <TextInput placeholder="Mobile Number" placeholderTextColor={O.sub} keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={[o.input, { fontSize: 16 }]} />
              </OField>

              <View style={{ height: 14 }} />

              <OField icon={<Lock size={20} color={O.primary} />} right={
                <Pressable onPress={() => setShowMpin((v) => !v)} hitSlop={10}>
                  {showMpin ? <Eye size={20} color={O.sub} /> : <EyeOff size={20} color={O.sub} />}
                </Pressable>
              }>
                <TextInput placeholder="Enter MPIN" placeholderTextColor={O.sub} secureTextEntry={!showMpin} maxLength={6} keyboardType="number-pad" value={mpin} onChangeText={setMpin} style={[o.input, { fontSize: 17 }]} />
              </OField>

              <View style={{ height: 22 }} />

              <OButton loading={loading} onPress={onLogin} label="Login" icon={<ArrowRight size={20} color={O.white} />} />

              <View style={o.rowBetween}>
                <Pressable onPress={() => { resetFields(); setForgotPhone(''); setScreen('forgot-phone'); }}>
                  <Text style={o.linkNavy}>Forgot MPIN?</Text>
                </Pressable>
                <Pressable onPress={() => { resetFields(); setScreen('register'); }}>
                  <Text style={o.linkNavy}>New User? <Text style={o.linkOrange}>Register</Text></Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ══════════ REGISTER ══════════ */}
        {screen === 'register' && (
          <View style={o.wrap}>
            {/* Brand (top-left row) */}
            <View style={o.brandLeft}>
              <View style={o.logoSquare}>
                <Home size={28} color={O.white} strokeWidth={2.4} />
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={o.brandName}>HomeInTown</Text>
                <Text style={o.brandTag}>SALES INTELLIGENCE</Text>
              </View>
            </View>

            <View style={o.accentBarLeft} />
            <Text style={o.h2}>Create Account</Text>
            <Text style={o.joinSerif}>Join HomeInTown</Text>
            <Text style={[o.sub, { marginTop: 8, maxWidth: 360 }]}>Sign up to access your projects, marketplace inventory and lead pipeline.</Text>

            <View style={{ height: 18 }} />

            <View style={o.card}>
              <OField icon={<User size={20} color={O.primary} />}>
                <TextInput placeholder="Full Name" placeholderTextColor={O.sub} value={name} onChangeText={setName} style={o.input} />
              </OField>
              <View style={{ height: 12 }} />
              <OField icon={<Phone size={20} color={O.primary} />}>
                <TextInput placeholder="Mobile Number" placeholderTextColor={O.sub} keyboardType="phone-pad" value={phone} onChangeText={setPhone} style={o.input} />
              </OField>
              <View style={{ height: 12 }} />
              <OField icon={<Mail size={20} color={O.primary} />}>
                <TextInput placeholder="Email (Optional)" placeholderTextColor={O.sub} keyboardType="email-address" autoCapitalize="none" value={email} onChangeText={setEmail} style={o.input} />
              </OField>

              <View style={{ height: 14 }} />

              {/* Role cards */}
              <View style={o.roleRow}>
                {([
                  ['user', 'Investor', <User size={18} key="u" />],
                  ['employee', 'Field', <HardHat size={18} key="f" />],
                  ['captain', 'Builder', <Building2 size={18} key="b" />],
                ] as const).map(([r, label, icon]) => {
                  const active = role === r;
                  return (
                    <Pressable key={r} onPress={() => setRole(r)} style={[o.roleCard, active ? o.roleCardActive : o.roleCardIdle]}>
                      {React.cloneElement(icon as React.ReactElement, { color: active ? O.white : O.primary })}
                      <Text style={[o.roleCardText, { color: active ? O.white : O.navy }]} numberOfLines={1}>{label}</Text>
                      {active && (
                        <View style={o.roleCheck}>
                          <Check size={11} color={O.primary} strokeWidth={3.5} />
                        </View>
                      )}
                    </Pressable>
                  );
                })}
              </View>

              {role === 'captain' && (
                <>
                  <View style={{ height: 12 }} />
                  <OField icon={<User size={20} color={O.primary} />}>
                    <TextInput placeholder="Company Name *" placeholderTextColor={O.sub} value={companyName} onChangeText={setCompanyName} style={o.input} />
                  </OField>
                </>
              )}

              <View style={{ height: 12 }} />

              <View style={o.mpinRow}>
                <View style={{ flex: 1 }}>
                  <OField icon={<Lock size={18} color={O.primary} />} right={
                    <Pressable onPress={() => setShowMpin((v) => !v)} hitSlop={8}>
                      {showMpin ? <Eye size={18} color={O.sub} /> : <EyeOff size={18} color={O.sub} />}
                    </Pressable>
                  }>
                    <TextInput placeholder="Set MPIN" placeholderTextColor={O.sub} secureTextEntry={!showMpin} maxLength={6} keyboardType="number-pad" value={mpin} onChangeText={setMpin} style={[o.input, { fontSize: 14 }]} />
                  </OField>
                </View>
                <View style={{ flex: 1 }}>
                  <OField icon={<Lock size={18} color={O.primary} />} right={
                    <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                      {showConfirm ? <Eye size={18} color={O.sub} /> : <EyeOff size={18} color={O.sub} />}
                    </Pressable>
                  }>
                    <TextInput placeholder="Confirm" placeholderTextColor={O.sub} secureTextEntry={!showConfirm} maxLength={6} keyboardType="number-pad" value={confirmMpin} onChangeText={setConfirmMpin} style={[o.input, { fontSize: 14 }]} />
                  </OField>
                </View>
              </View>

              <View style={{ height: 18 }} />

              <OButton loading={loading} onPress={onRegister} label="Register" icon={<ArrowRight size={20} color={O.white} />} />

              <Pressable onPress={() => { resetFields(); setScreen('login'); }} style={{ alignItems: 'center', marginTop: 14 }}>
                <Text style={o.subSm}>Already have an account? <Text style={o.linkOrange}>Login</Text></Text>
              </Pressable>
            </View>
          </View>
        )}

        {/* ══════════ Legacy themed screens (unchanged) ══════════ */}
        {(screen === 'forgot-phone' || screen === 'otp' || screen === 'reset-mpin') && (
          <>
            <View style={s.logoHeader}>
              <View style={s.logoRow}>
                <View style={s.logoBox}>
                  <Text style={s.logoLetter}>H</Text>
                </View>
                <View>
                  <Text style={s.logoTitle}>HomeInTown</Text>
                  <Text style={s.logoSub}>SALES INTELLIGENCE</Text>
                </View>
              </View>
            </View>

            <View style={s.card}>
              {screen === 'forgot-phone' && (
                <View style={{ gap: 24 }}>
                  <View style={s.centerGap}>
                    <View style={s.iconCircle}><Lock size={40} color={colors.brand} /></View>
                    <Text style={s.h2}>Forgot MPIN</Text>
                    <Text style={s.subtext}>Enter your registered phone number</Text>
                  </View>
                  <Field icon={<Phone size={20} color={MUTED} />}>
                    <TextInput placeholder="Mobile Number" placeholderTextColor={MUTED} keyboardType="phone-pad" value={forgotPhone} onChangeText={setForgotPhone} style={[s.input, { fontSize: 17, fontFamily: 'monospace' }]} />
                  </Field>
                  <PrimaryButton loading={loading} onPress={onForgot} label="Send OTP" icon={<ArrowRight size={20} color="#fff" />} />
                  <Pressable onPress={() => setScreen('login')} style={{ alignItems: 'center' }}>
                    <Text style={s.mutedSm}>Back to <Text style={s.linkBrandInline}>Login</Text></Text>
                  </Pressable>
                </View>
              )}

              {screen === 'otp' && (
                <View style={{ gap: 32 }}>
                  <View style={s.centerGap}>
                    <View style={s.iconCircle}>{isResetFlow ? <Lock size={40} color={colors.brand} /> : <ShieldCheck size={40} color={colors.brand} />}</View>
                    <Text style={s.h1}>{isResetFlow ? 'Reset MPIN' : 'Verify Phone'}</Text>
                    <Text style={s.subtext}>{isResetFlow ? 'Enter OTP sent to' : 'Sent to'} <Text style={s.boldMono}>{isResetFlow ? forgotPhone : phone}</Text></Text>
                  </View>
                  <View>
                    <Text style={[s.mutedSm, { marginBottom: 8, paddingLeft: 4 }]}>6-Digit OTP Code</Text>
                    <TextInput
                      placeholder="000000"
                      placeholderTextColor={MUTED}
                      keyboardType="number-pad"
                      maxLength={6}
                      value={otpCode}
                      onChangeText={(t) => setOtpCode(t.replace(/\D/g, ''))}
                      style={[s.otpInput, { letterSpacing: otpCode ? 12 : 0 }]}
                    />
                  </View>
                  <PrimaryButton loading={loading} onPress={onOtp} label={isResetFlow ? 'Next' : 'Verify & Sign Up'} />
                  <View style={[s.rowBetween, { paddingHorizontal: 8 }]}>
                    <Pressable onPress={() => setScreen(isResetFlow ? 'forgot-phone' : 'register')}>
                      <Text style={s.mutedSm}>Resend Code</Text>
                    </Pressable>
                    <Pressable onPress={() => { setIsResetFlow(false); resetFields(); setScreen('login'); }}>
                      <Text style={s.linkBrand}>Back to Login</Text>
                    </Pressable>
                  </View>
                </View>
              )}

              {screen === 'reset-mpin' && (
                <View style={{ gap: 32 }}>
                  <View style={s.centerGap}>
                    <View style={s.iconCircle}><Lock size={40} color={colors.brand} /></View>
                    <Text style={s.h1}>New MPIN</Text>
                    <Text style={[s.subtext, { textAlign: 'center' }]}>Create a new MPIN for <Text style={s.boldMono}>{forgotPhone}</Text></Text>
                  </View>
                  <View style={{ gap: 16 }}>
                    <Field icon={<Lock size={20} color={MUTED} />}>
                      <TextInput placeholder="Enter New MPIN" placeholderTextColor={MUTED} secureTextEntry maxLength={6} keyboardType="number-pad" value={mpin} onChangeText={setMpin} style={[s.input, { fontSize: 19 }]} />
                    </Field>
                    <Field icon={<Lock size={20} color={MUTED} />}>
                      <TextInput placeholder="Confirm New MPIN" placeholderTextColor={MUTED} secureTextEntry maxLength={6} keyboardType="number-pad" value={confirmMpin} onChangeText={setConfirmMpin} style={[s.input, { fontSize: 19 }]} />
                    </Field>
                  </View>
                  <PrimaryButton loading={loading} onPress={onReset} label="Save New MPIN" />
                  <Pressable onPress={() => setScreen('otp')} style={{ alignItems: 'center' }}>
                    <Text style={s.mutedSm}>Back to OTP</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Orange field with left icon + optional right adornment ──
function OField({ icon, children, right }: { icon: React.ReactNode; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <View style={o.field}>
      <View style={{ marginRight: 12 }}>{icon}</View>
      {children}
      {right ? <View style={{ marginLeft: 8 }}>{right}</View> : null}
    </View>
  );
}

// ── Orange primary button ──
function OButton({ loading, onPress, label, icon }: { loading?: boolean; onPress: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={({ pressed }) => [o.btn, { backgroundColor: pressed ? O.deep : O.primary, opacity: loading ? 0.7 : 1 }]}>
      {loading ? (
        <ActivityIndicator color={O.white} />
      ) : (
        <>
          <Text style={o.btnText}>{label}</Text>
          {icon}
        </>
      )}
    </Pressable>
  );
}

// ── Legacy field / button for unchanged screens ──
function Field({ icon, children, compact }: { icon: React.ReactNode; children: React.ReactNode; compact?: boolean }) {
  return (
    <View style={[s.field, compact && { paddingVertical: 2 }]}>
      <View style={{ marginRight: 12 }}>{icon}</View>
      {children}
    </View>
  );
}

function PrimaryButton({ loading, onPress, label, icon }: { loading?: boolean; onPress: () => void; label: string; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} disabled={loading} style={[s.primaryBtn, { opacity: loading ? 0.6 : 1 }]}>
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <>
          <Text style={s.primaryBtnText}>{label}</Text>
          {icon}
        </>
      )}
    </Pressable>
  );
}

const st = StyleSheet.create({
  cornerArt: { position: 'absolute', zIndex: 0 },
  bottomWave: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 0 },
});

// ── Orange / cream styles (Login + Register) ──
const o = StyleSheet.create({
  wrap: { width: '100%', maxWidth: 460, alignSelf: 'center' },
  brandCenter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  brandLeft: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
  logoSquare: {
    width: 56, height: 56, borderRadius: 16, backgroundColor: O.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: O.deep, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 5,
  },
  brandName: { fontSize: 21, fontWeight: '800', color: O.navy, letterSpacing: 0.2 },
  brandTag: { fontSize: 10, fontWeight: '700', color: O.primary, letterSpacing: 3, marginTop: 1 },
  accentBar: { width: 48, height: 5, borderRadius: 3, backgroundColor: O.primary, marginBottom: 14 },
  accentBarLeft: { width: 48, height: 5, borderRadius: 3, backgroundColor: O.primary, marginBottom: 12 },
  card: {
    width: '100%', padding: 22, borderRadius: 26, backgroundColor: O.cardCream,
    borderWidth: 1, borderColor: O.beige,
    shadowColor: O.deep, shadowOpacity: 0.1, shadowRadius: 24, shadowOffset: { width: 0, height: 14 }, elevation: 5,
  },
  h1: { fontFamily: SERIF, fontSize: 42, fontWeight: '700', color: O.navy, letterSpacing: -0.5 },
  h2: { fontFamily: SERIF, fontSize: 36, fontWeight: '700', color: O.navy, letterSpacing: -0.5 },
  joinSerif: { fontFamily: SERIF, fontSize: 27, fontWeight: '700', fontStyle: 'italic', color: O.primary, marginTop: 2 },
  sub: { color: O.sub, fontSize: 15, marginTop: 4, lineHeight: 21 },
  subSm: { color: O.sub, fontSize: 13 },
  field: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: O.cardCream,
    borderWidth: 1.5, borderColor: O.border, borderRadius: 14, paddingHorizontal: 16, minHeight: 56,
  },
  input: { flex: 1, color: O.navy, paddingVertical: 15, fontSize: 15 },
  roleRow: { flexDirection: 'row', gap: 8 },
  roleCard: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.5,
  },
  roleCardActive: { backgroundColor: O.primary, borderColor: O.primary },
  roleCardIdle: { backgroundColor: O.cardCream, borderColor: O.border },
  roleCardText: { fontWeight: '700', fontSize: 12.5 },
  roleCheck: { width: 16, height: 16, borderRadius: 8, backgroundColor: O.white, alignItems: 'center', justifyContent: 'center', marginLeft: 2 },
  mpinRow: { flexDirection: 'row', gap: 12 },
  btn: {
    width: '100%', borderRadius: 14, paddingVertical: 17,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: O.deep, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  btnText: {
    color: O.white, fontWeight: '700', fontSize: 16.5,
    textShadowColor: 'transparent', textShadowRadius: 0, textShadowOffset: { width: 0, height: 0 },
    includeFontPadding: false,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, paddingHorizontal: 2 },
  linkNavy: { color: O.navy, fontSize: 13.5, fontWeight: '700' },
  linkOrange: { color: O.primary, fontWeight: '800' },
});

const s = StyleSheet.create({
  logoHeader: { alignItems: 'center', marginBottom: 24 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  logoBox: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { color: '#fff', fontWeight: 'bold', fontSize: 19 },
  logoTitle: { fontSize: 19, fontWeight: 'bold', color: colors.ink },
  logoSub: { fontSize: 9, fontWeight: 'bold', color: colors.brand, letterSpacing: 2 },
  card: {
    width: '100%', maxWidth: 448, alignSelf: 'center', padding: 24, borderRadius: 24,
    backgroundColor: colors.white, borderWidth: 1, borderColor: colors.line,
    shadowColor: colors.brand, shadowOpacity: 0.05, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 3,
  },
  centerGap: { alignItems: 'center', gap: 8 },
  h1: { fontSize: 33, fontWeight: 'bold', color: colors.ink },
  h2: { fontSize: 27, fontWeight: 'bold', color: colors.ink },
  subtext: { color: colors.muted2 },
  field: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.cream, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 16 },
  input: { flex: 1, color: colors.ink, paddingVertical: 14 },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 4 },
  linkBrand: { color: colors.brand, fontSize: 13, fontWeight: 'bold' },
  linkBrandInline: { color: colors.brand, fontWeight: 'bold' },
  mutedSm: { color: colors.muted, fontSize: 13 },
  boldMono: { color: colors.ink, fontWeight: 'bold', fontFamily: 'monospace' },
  iconCircle: { width: 80, height: 80, backgroundColor: colors.brandTint, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.brand + '33' },
  otpInput: { width: '100%', backgroundColor: colors.cream, borderWidth: 2, borderColor: colors.line, borderRadius: 16, paddingVertical: 20, textAlign: 'center', fontSize: 33, fontWeight: 'bold', color: colors.brand },
  primaryBtn: {
    width: '100%', backgroundColor: colors.brand, borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: colors.brand, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  primaryBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 15 },
});
