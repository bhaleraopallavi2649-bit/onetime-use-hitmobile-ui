import React, { useState } from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import Svg, {
  Defs,
  LinearGradient,
  Stop,
  Rect,
  G,
  Path,
} from 'react-native-svg';

// Real estate photograph bundled in the project (modern luxury home).
const PROPERTY_PHOTO = require('../../assets/property.jpg');

/**
 * Top-right corner decoration backed by a real real-estate photograph, faded into
 * the cream background to match the reference screenshots. If the image asset ever
 * fails to load, it gracefully falls back to the SVG building illustration so the
 * screen is never left with a broken image.
 */
// Login / Register corner photo: a bright white house with no dark vertical element
// (the older photo has a dark stone chimney that cropped into a black line).
const AUTH_PHOTO = require('../../assets/properties/p8.jpg');

/**
 * Top-right photo for Login / Register. Everything has an explicit pixel size (the
 * photo is NOT stretched with absoluteFill), the box clips its content, and the
 * left + bottom edges are painted over with the page colour so the photo melts into
 * the background with no hard edge or seam. `fade` must equal the page background.
 */
export function PropertyPhotoCorner({ width, height, fade = '#FAF3E8' }: { width: number; height: number; fade?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <PropertyCorner width={width} height={height} />;
  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Image
        source={AUTH_PHOTO}
        onError={() => setFailed(true)}
        resizeMode="cover"
        style={{ width, height }}
      />
      <Svg width={width} height={height} style={{ position: 'absolute', left: 0, top: 0 }}>
        <Defs>
          {/* left edge: solid page colour, easing out to clear */}
          <LinearGradient id="pcLeft" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={fade} stopOpacity="1" />
            <Stop offset="0.25" stopColor={fade} stopOpacity="0.9" />
            <Stop offset="0.55" stopColor={fade} stopOpacity="0.4" />
            <Stop offset="0.85" stopColor={fade} stopOpacity="0.05" />
            <Stop offset="1" stopColor={fade} stopOpacity="0" />
          </LinearGradient>
          {/* bottom edge: clear, then solid page colour at the very bottom */}
          <LinearGradient id="pcDown" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.45" stopColor={fade} stopOpacity="0" />
            <Stop offset="0.75" stopColor={fade} stopOpacity="0.65" />
            <Stop offset="1" stopColor={fade} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill="url(#pcLeft)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#pcDown)" />
      </Svg>
    </View>
  );
}

/**
 * Warm, photo-style illustration of a modern apartment building that sits in the
 * top-right corner and fades into the cream background — matching the reference
 * Login / Register screenshots. Pure SVG so it renders identically on Android and
 * web and can never produce a broken image link or external dependency.
 */
export function PropertyCorner({ width, height }: { width: number; height: number }) {
  return (
    <Svg width={width} height={height} viewBox="0 0 220 300" fill="none">
      <Defs>
        {/* fade the whole illustration out toward the left into the cream bg */}
        <LinearGradient id="fadeLeft" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#FFF8EE" stopOpacity="1" />
          <Stop offset="0.45" stopColor="#FFF8EE" stopOpacity="0.35" />
          <Stop offset="1" stopColor="#FFF8EE" stopOpacity="0" />
        </LinearGradient>
        {/* fade out toward the bottom */}
        <LinearGradient id="fadeDown" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0.55" stopColor="#FFF8EE" stopOpacity="0" />
          <Stop offset="1" stopColor="#FFF8EE" stopOpacity="1" />
        </LinearGradient>
        {/* warm sky wash */}
        <LinearGradient id="sky" x1="0" y1="0" x2="0.3" y2="1">
          <Stop offset="0" stopColor="#F6E7D2" />
          <Stop offset="1" stopColor="#EBD9C2" />
        </LinearGradient>
        {/* building facade warm tone */}
        <LinearGradient id="facade" x1="0" y1="0" x2="1" y2="0.2">
          <Stop offset="0" stopColor="#F3E6D4" />
          <Stop offset="1" stopColor="#E7D3B9" />
        </LinearGradient>
        <LinearGradient id="facade2" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor="#EADBC4" />
          <Stop offset="1" stopColor="#DCC6A6" />
        </LinearGradient>
      </Defs>

      {/* sky */}
      <Rect x="0" y="0" width="220" height="300" fill="url(#sky)" />

      {/* ── Building block (right tower) ── */}
      <G>
        <Rect x="118" y="30" width="78" height="260" fill="url(#facade)" />
        {/* balcony floors */}
        {Array.from({ length: 9 }).map((_, i) => {
          const y = 48 + i * 26;
          return (
            <G key={`r-${i}`}>
              <Rect x="124" y={y} width="30" height="16" rx="1.5" fill="#D8C2A2" opacity={0.85} />
              <Rect x="160" y={y} width="30" height="16" rx="1.5" fill="#CBB289" opacity={0.85} />
              {/* balcony rail shadow */}
              <Rect x="124" y={y + 16} width="66" height="3" fill="#C9AE82" opacity={0.5} />
            </G>
          );
        })}
      </G>

      {/* ── Secondary block (left, slightly lower / set back) ── */}
      <G>
        <Rect x="70" y="70" width="52" height="220" fill="url(#facade2)" opacity={0.95} />
        {Array.from({ length: 7 }).map((_, i) => {
          const y = 88 + i * 28;
          return (
            <G key={`l-${i}`}>
              <Rect x="76" y={y} width="18" height="18" rx="1.5" fill="#C9B390" opacity={0.8} />
              <Rect x="100" y={y} width="16" height="18" rx="1.5" fill="#BFA67F" opacity={0.8} />
            </G>
          );
        })}
      </G>

      {/* soft foliage hint at lower left of the art */}
      <Path
        d="M60 250 q18 -40 40 -20 q-6 24 -24 34 q-20 8 -16 -14 Z"
        fill="#B7C29A"
        opacity={0.55}
      />

      {/* fades so it blends into the cream background */}
      <Rect x="0" y="0" width="220" height="300" fill="url(#fadeLeft)" />
      <Rect x="0" y="0" width="220" height="300" fill="url(#fadeDown)" />
    </Svg>
  );
}

/**
 * Subtle cream wave that sits at the bottom of the screen, echoing the soft
 * decorative curves in the reference screenshots.
 */
export function BottomWave({ width }: { width: number }) {
  const h = 120;
  return (
    <Svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} fill="none">
      <Defs>
        <LinearGradient id="wave1" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#F4E4CF" />
          <Stop offset="1" stopColor="#F1DCC0" />
        </LinearGradient>
      </Defs>
      <Path
        d={`M0 ${h} L0 55 Q ${width * 0.3} 20 ${width * 0.55} 48 T ${width} 42 L ${width} ${h} Z`}
        fill="url(#wave1)"
        opacity={0.7}
      />
      <Path
        d={`M0 ${h} L0 80 Q ${width * 0.4} 55 ${width * 0.7} 78 T ${width} 72 L ${width} ${h} Z`}
        fill="#EAD6BA"
        opacity={0.6}
      />
    </Svg>
  );
}

/**
 * Faded real-estate photo for the right-hand side of the dashboard header
 * (reference: building banner behind the Upload button). Uses the bundled
 * property photo; a white gradient from the left keeps the text readable.
 * Decorative only, never intercepts touches.
 */
export function HeaderPhoto({ width, height, fadeColor = '#FFFFFF' }: { width: number; height: number; fadeColor?: string }) {
  // Unique gradient id per colour so two instances on one screen cannot clash.
  const gid = `hdrFade-${fadeColor.replace('#', '')}`;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', right: 0, top: 0, width, height, overflow: 'hidden' }}>
      <Image source={PROPERTY_PHOTO} resizeMode="cover" style={{ width, height, opacity: 0.55 }} />
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={fadeColor} stopOpacity="1" />
            <Stop offset="0.55" stopColor={fadeColor} stopOpacity="0.45" />
            <Stop offset="1" stopColor={fadeColor} stopOpacity="0.05" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width={width} height={height} fill={`url(#${gid})`} />
      </Svg>
    </View>
  );
}

/**
 * Soft leaves in the bottom-left corner (reference: profile and groups pages).
 * Decorative only: it never intercepts touches and sits behind the content.
 */
export function LeafDecor() {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, bottom: 0 }}>
      <Svg width={110} height={150} viewBox="0 0 110 150">
        <Path d="M10 150 C 4 110 18 70 52 40 C 58 82 46 122 10 150 Z" fill="#F0A35C" opacity={0.55} />
        <Path d="M30 150 C 30 118 52 92 88 80 C 84 112 62 140 30 150 Z" fill="#E8731C" opacity={0.4} />
        <Path d="M0 150 C 0 128 14 108 36 98 C 36 122 22 142 0 150 Z" fill="#C25A0C" opacity={0.35} />
      </Svg>
    </View>
  );
}

/**
 * Full-screen warm cream backdrop used by the inner screens (Settings,
 * Notifications, Marketplace, Projects, Role Distribution ...):
 * soft vertical cream gradient, an orange/peach wave along the bottom edge and a
 * leaf branch in the bottom-left corner. Decorative only (never takes touches);
 * render it as the FIRST child of the screen root so content sits above it.
 */
export function PageBackdrop() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="pbBg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFF9F2" />
            <Stop offset="1" stopColor="#FBEEDC" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#pbBg)" />
      </Svg>

      {/* orange / peach wave along the bottom */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 150 }}>
        <Svg width="100%" height="150" viewBox="0 0 360 150" preserveAspectRatio="none">
          <Defs>
            <LinearGradient id="pbWaveA" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#F9E3C8" stopOpacity="0.9" />
              <Stop offset="1" stopColor="#F6C48E" stopOpacity="0.95" />
            </LinearGradient>
            <LinearGradient id="pbWaveB" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#F7D3A8" stopOpacity="0.55" />
              <Stop offset="1" stopColor="#EE8F3F" stopOpacity="0.85" />
            </LinearGradient>
          </Defs>
          <Path d="M0 150 L0 70 C 90 40 170 40 250 62 C 300 76 335 70 360 52 L360 150 Z" fill="url(#pbWaveA)" />
          <Path d="M0 150 L0 112 C 80 92 170 96 250 108 C 300 115 335 108 360 92 L360 150 Z" fill="url(#pbWaveB)" />
        </Svg>
      </View>

      {/* leaf branch, bottom-left */}
      <View style={{ position: 'absolute', left: 0, bottom: 0 }}>
        <Svg width={96} height={140} viewBox="0 0 96 140">
          <Path d="M8 140 C 14 100 24 70 40 30" stroke="#C98A4B" strokeWidth={1.6} fill="none" opacity={0.7} />
          <Path d="M40 30 C 52 52 50 78 34 96 C 24 74 28 50 40 30 Z" fill="#D9A064" opacity={0.75} />
          <Path d="M26 78 C 44 82 56 98 54 118 C 36 114 24 100 26 78 Z" fill="#E7B67C" opacity={0.7} />
          <Path d="M14 112 C 2 100 0 84 6 70 C 20 80 24 98 14 112 Z" fill="#C98A4B" opacity={0.6} />
          <Path d="M20 128 C 34 118 50 124 60 136 C 44 142 28 140 20 128 Z" fill="#F0B070" opacity={0.65} />
        </Svg>
      </View>
    </View>
  );
}

/**
 * Screen header surface with the faded real-estate photo on the right edge
 * (reference: Settings / Notifications / Marketplace / Projects headers).
 * Children are laid out in a row on top of the photo.
 */
export function PhotoHeader({
  children,
  height = 76,
  photoWidth = 190,
  fade = '#FFF9F1',
  style,
}: {
  children: React.ReactNode;
  height?: number;
  photoWidth?: number;
  fade?: string;
  style?: any;
}) {
  return (
    <View
      style={[
        {
          height,
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          backgroundColor: fade,
          borderBottomWidth: 1,
          borderBottomColor: '#F0E3D0',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <HeaderPhoto width={photoWidth} height={height} fadeColor={fade} />
      {children}
    </View>
  );
}

/** Orange gradient fill that sits behind a button / avatar (absolute, no touches). */
export function OrangeFill({ radius }: { radius?: number }) {
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, radius != null && { borderRadius: radius, overflow: 'hidden' }]}>
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="ofOrange" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#F5873A" />
            <Stop offset="1" stopColor="#E26512" />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#ofOrange)" />
      </Svg>
    </View>
  );
}

/** Round avatar with the orange gradient and a white initial. */
export function GradientCircle({ size, letter, fontSize }: { size: number; letter: string; fontSize?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <OrangeFill />
      <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: fontSize ?? Math.round(size * 0.4) }}>{letter}</Text>
    </View>
  );
}
