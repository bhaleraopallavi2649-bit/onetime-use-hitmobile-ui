// ─── WEB-ONLY FALLBACK ───────────────────────────────────────────────────────
// react-native-maps ships native-only code that Metro's web bundler cannot
// handle. This file is resolved ONLY on web (Metro platform=web picks .web.tsx
// over .tsx). The original PropertyMap.tsx is untouched for Android builds.
// ─────────────────────────────────────────────────────────────────────────────
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function PropertyMap({ isAdmin = false }: { isAdmin?: boolean }) {
  return (
    <View style={s.root}>
      <View style={s.card}>
        <Text style={s.icon}>🗺️</Text>
        <Text style={s.title}>Map view</Text>
        <Text style={s.body}>
          Interactive map is available in the Android app.{'\n'}
          (react-native-maps is not available in browser preview.)
        </Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { maxWidth: 300, alignItems: 'center', backgroundColor: colors.white, borderRadius: 16, padding: 28, borderWidth: 1, borderColor: colors.line },
  icon: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 15, fontWeight: '700', color: colors.ink, marginBottom: 8 },
  body: { fontSize: 13, color: colors.muted2, textAlign: 'center', lineHeight: 20 },
});
