// Shared marketplace-style property card. Extracted from marketplace.tsx so the
// exact same UI/layout/styling is reused by both the Marketplace screen and the
// Projects screen (project cards render through this component too).
//
// The card reads its display data from a loose `project` object that may be
// either the backend's nested shape (project.media.coverImage, project.pricing,
// project.configuration) OR the app's flattened Project shape — every helper
// falls back across both, so a flat Project can be passed straight through.
import React from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import {
  MapPin, Eye, Share2, CheckCircle, Star, Tag, MoreVertical,
} from 'lucide-react-native';
import { MarketplaceListing } from '../lib/api';
import { colors } from '../theme';
import { photoFor } from '../lib/propertyPhotos';

/* ── helpers (identical behavior to the former marketplace.tsx inline copy) ── */
export function fmtPrice(n: number): string {
  if (!n) return '—';
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(0)}L`;
  return `₹${n.toLocaleString('en-IN')}`;
}

export function coverUrl(listing: MarketplaceListing): string | null {
  const p = listing.project as any;
  if (!p) return null;
  const ci = p.media?.coverImage ?? p.coverImage;
  if (!ci) return null;
  return typeof ci === 'string' ? ci : ci.url ?? null;
}

export function getCity(listing: MarketplaceListing): string {
  return (listing.project as any)?.city || '';
}

export function getProjectName(listing: MarketplaceListing): string {
  return (listing.project as any)?.projectName || (listing.project as any)?.name || 'Project';
}

export function getBhk(listing: MarketplaceListing): string[] {
  return (listing.project as any)?.configuration?.bhkOptions ?? (listing.project as any)?.bhkOptions ?? [];
}

export function getProject(listing: MarketplaceListing): any {
  return (listing.project as any) || {};
}

export function getPrice(listing: MarketplaceListing): number {
  const p = getProject(listing);
  return p?.pricing?.startingPrice ?? p?.startingPrice ?? (listing as any)?.expectedValue ?? 0;
}

export function getArea(listing: MarketplaceListing): string {
  const p = getProject(listing);
  return p?.configuration?.carpetAreaRange ?? p?.configuration?.plotSizeRange ??
    p?.carpetAreaRange ?? p?.plotSizeRange ?? '';
}

// Human-readable property label (mirrors web getPropertyLabel)
export function propertyLabel(listing: MarketplaceListing): string {
  const p = getProject(listing);
  if (p?.propertyType) return p.propertyType;
  if (p?.category) return p.category;
  if (p?.projectType === 'plot' || p?.type === 'plot') return 'Plot';
  return 'Apartment';
}

export function getProjectId(listing: MarketplaceListing): string {
  const p = getProject(listing);
  return String(p?._id || p?.id || '');
}

export function getSlug(listing: MarketplaceListing): string {
  return getProject(listing)?.slug || '';
}

// Derive price-per-sqft from starting price and the lower-bound of an area range.
export function pricePerSqFt(listing: MarketplaceListing): string | null {
  const price = getPrice(listing);
  const area = getArea(listing);
  if (!price || !area) return null;
  const lower = area.toLowerCase();
  if (/(acre|hectare|guntha|bigha)/.test(lower)) return null;
  const m = lower.match(/\d[\d,]*/);
  if (!m) return null;
  const sqft = Number(m[0].replace(/,/g, ''));
  if (!sqft || sqft <= 0) return null;
  return `₹${Math.round(price / sqft).toLocaleString('en-IN')}/sqft`;
}

/* A listing with no cover gets a bundled stock photo (varies per listing) instead of an empty box. */

const TAG_BG = '#F7EBDA';
const TAG_TEXT = '#6E5B43';
const NAVY = '#17233A';
const PHOTO = 66; // square photo edge (compact card, matches the Projects reference)

// Status chip (Projects + Marketplace share this card).
function statusChip(status: string): { label: string; bg: string; text: string; border: string } | null {
  if (!status) return null;
  if (status === 'pre-launch') return { label: 'Pre Launch', bg: '#FDE6D3', text: '#B4510A', border: '#F8D2B2' };
  if (status === 'ready-to-move' || status === 'ready') return { label: 'Ready', bg: '#DDF2DF', text: '#2F7A3A', border: '#C4E5C8' };
  if (status === 'under-construction') return { label: 'Under Construction', bg: '#FFFDF9', text: NAVY, border: '#EADFCF' };
  return { label: status, bg: '#FFFDF9', text: NAVY, border: '#EADFCF' };
}

/* -- Listing card shared by Projects and Marketplace --
   Compact card: small square photo on the left, details on the right and, on the
   last row, the status / match line on the left with the View Project / Share
   pills on the right. */
export default function ListingCard({ l, matchCount, onView, onShare, onMenu }: {
  l: MarketplaceListing; matchCount: number; onView: () => void; onShare: () => void;
  // Optional 3-dot menu (used by the Projects screen). When omitted, no kebab shows.
  onMenu?: () => void;
}) {
  const cover = coverUrl(l);
  const p = getProject(l);
  const bhk = getBhk(l).slice(0, 2);
  const area = getArea(l);
  const price = getPrice(l);
  const perSqft = pricePerSqFt(l);
  const isStd = !!(l as any).isStd; // synthetic card from a published project (not a marketplace listing)
  const isSelling = !isStd && l.listingType === 'selling';
  const hasCommission = !isStd && Number(l.commissionValue) > 0;
  const commLabel = l.commissionType === 'percentage'
    ? `${l.commissionValue}%`
    : `₹${Number(l.commissionValue).toLocaleString('en-IN')}`;

  // "Earn ₹X at Y%" for percentage commissions with a known price.
  const earnLine = (hasCommission && l.commissionType === 'percentage' && price > 0)
    ? `Earn ${fmtPrice((price * Number(l.commissionValue)) / 100)} at ${l.commissionValue}%`
    : null;

  const rawStatus = String(p?.projectStatus || '');
  const chip = statusChip(rawStatus);
  // Reference layout: when the card already has a live-match line (or is a
  // pre-launch project) the status chip sits under the photo, otherwise it sits
  // on the bottom row next to the buttons.
  const chipUnderPhoto = !!chip && (matchCount > 0 || rawStatus === 'pre-launch');

  const chipView = chip ? (
    <View style={[mc.statusChip, { backgroundColor: chip.bg, borderColor: chip.border }]}>
      <Text style={[mc.statusText, { color: chip.text }]} numberOfLines={1}>{chip.label}</Text>
    </View>
  ) : null;

  return (
    <View style={mc.card}>
      <View style={mc.top}>
        {/* Left column: square photo (+ status chip when it belongs under the photo) */}
        <View style={{ minWidth: PHOTO, gap: 5, alignItems: 'flex-start' }}>
          <View style={mc.imgWrap}>
            <Image
              source={cover ? { uri: cover } : photoFor(getProjectId(l) || getProjectName(l))}
              style={StyleSheet.absoluteFill}
              resizeMode="cover"
            />
            {/* STD / LISTED / REQ badge */}
            <View style={[mc.badge, { backgroundColor: isStd ? '#17233A' : isSelling ? '#1F8A5B' : colors.indigo }]}>
              <Text style={mc.badgeText}>{isStd ? 'STD' : isSelling ? 'LISTED' : 'REQ'}</Text>
            </View>
            {/* commission badge (below the type badge so the two never overlap) */}
            {hasCommission && (
              <View style={mc.commBadge}>
                <Star size={8} color="#fff" />
                <Text style={mc.commBadgeText}>{commLabel}</Text>
              </View>
            )}
          </View>
          {chipUnderPhoto && chipView}
        </View>

        {/* Content */}
        <View style={mc.content}>
          <View style={mc.nameRow}>
            <Text style={mc.name} numberOfLines={1}>{getProjectName(l)}</Text>
            {/* 3-dot menu (Projects screen only) */}
            {onMenu && (
              <Pressable onPress={onMenu} hitSlop={12} style={mc.kebab}>
                <MoreVertical size={16} color={NAVY} />
              </Pressable>
            )}
          </View>
          {getCity(l) ? (
            <View style={mc.locRow}>
              <MapPin size={10} color={colors.brand} />
              <Text style={mc.loc} numberOfLines={1}>
                {p?.location ? `${String(p.location).split(',')[0]}, ` : ''}{getCity(l).split(',')[0]}
              </Text>
            </View>
          ) : null}

          {/* BHK + area + type badges */}
          <View style={mc.tagRow}>
            {bhk.length > 0 && (
              <View style={mc.tag}><Text style={mc.tagText}>{bhk.join(', ')}</Text></View>
            )}
            {area ? (
              <View style={mc.tag}><Text style={mc.tagText}>{area}</Text></View>
            ) : null}
            <View style={mc.tag}><Text style={mc.tagText}>{propertyLabel(l)}</Text></View>
          </View>

          {/* Price + per sqft */}
          <View style={mc.priceRow}>
            <Text style={mc.price}>{fmtPrice(price)}</Text>
            {perSqft ? (
              <View style={mc.perSqftPill}><Text style={mc.perSqft}>{perSqft}</Text></View>
            ) : null}
          </View>

          {/* RERA / Gated / Loan */}
          {(p?.reraApproved || p?.configuration?.gatedCommunity || p?.pricing?.bankLoanAvailable) && (
            <View style={mc.chipsRow}>
              {p?.reraApproved && (
                <View style={[mc.chip, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
                  <CheckCircle size={9} color={colors.greenText} />
                  <Text style={[mc.chipText, { color: colors.greenText }]}>RERA</Text>
                </View>
              )}
              {p?.configuration?.gatedCommunity && (
                <View style={mc.chip}><Text style={mc.chipText}>Gated</Text></View>
              )}
              {p?.pricing?.bankLoanAvailable && (
                <View style={[mc.chip, { backgroundColor: colors.greenBg, borderColor: colors.greenBorder }]}>
                  <Text style={[mc.chipText, { color: colors.greenText }]}>Loan</Text>
                </View>
              )}
            </View>
          )}

          {/* Bottom row: match / earn / status on the left, small actions on the right */}
          <View style={mc.bottomRow}>
            <View style={{ flex: 1, flexShrink: 1 }}>
              {matchCount > 0 ? (
                <View style={mc.matchRow}>
                  <View style={mc.matchDot} />
                  <Text style={mc.matchText} numberOfLines={2}>{matchCount} live {matchCount === 1 ? 'buyer matches' : 'buyers match'} this</Text>
                </View>
              ) : earnLine ? (
                <View style={mc.matchRow}>
                  <Tag size={10} color={colors.greenText} />
                  <Text style={[mc.matchText, { color: colors.greenText }]} numberOfLines={2}>{earnLine}</Text>
                </View>
              ) : !chipUnderPhoto && chipView ? (
                <View style={{ alignItems: 'flex-start' }}>{chipView}</View>
              ) : null}
            </View>
            <View style={mc.miniActions}>
              <Pressable onPress={onView} hitSlop={6} style={mc.miniBtn}>
                <Eye size={12} color={NAVY} />
                <Text style={mc.miniText} numberOfLines={1}>View Project</Text>
              </Pressable>
              <Pressable onPress={onShare} hitSlop={6} style={mc.miniBtn}>
                <Share2 size={12} color={colors.brand} />
                <Text style={mc.miniText} numberOfLines={1}>Share</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

const mc = StyleSheet.create({
  card: {
    backgroundColor: '#FFFDF9', borderRadius: 16, borderWidth: 1, borderColor: '#F3E8D8', padding: 10,
    shadowColor: '#B9803F', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  top: { flexDirection: 'row', gap: 10 },
  imgWrap: { width: PHOTO, height: PHOTO, borderRadius: 12, overflow: 'hidden', position: 'relative', backgroundColor: '#EFE2D2' },
  badge: { position: 'absolute', top: 4, left: 4, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontSize: 7.5, fontWeight: '800', color: '#fff', letterSpacing: 0.3 },
  commBadge: { position: 'absolute', bottom: 4, left: 4, flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: colors.brand, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 5 },
  commBadgeText: { fontSize: 7.5, fontWeight: '800', color: '#fff' },
  statusChip: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 8.5, fontWeight: '600' },
  content: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 14, fontWeight: '800', color: NAVY, flex: 1 },
  kebab: { padding: 1, marginRight: -2 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  loc: { fontSize: 9.5, color: '#5F6C86', fontWeight: '500', flex: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  tag: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8, backgroundColor: TAG_BG },
  tagText: { fontSize: 8.5, fontWeight: '600', color: TAG_TEXT },
  priceRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  price: { fontSize: 17, fontWeight: '800', color: NAVY, letterSpacing: -0.3 },
  perSqftPill: { paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 8, backgroundColor: TAG_BG },
  perSqft: { fontSize: 8.5, color: TAG_TEXT, fontWeight: '600' },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  matchDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3F8A2E' },
  matchText: { fontSize: 9, fontWeight: '500', color: '#2F4A2A', flexShrink: 1 },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, borderWidth: 1, backgroundColor: TAG_BG, borderColor: TAG_BG },
  chipText: { fontSize: 8.5, fontWeight: '600', color: TAG_TEXT },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginTop: 'auto', paddingTop: 2 },
  miniActions: { flexDirection: 'row', gap: 6, flexShrink: 0 },
  miniBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, height: 26, borderRadius: 9, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#EFE3D1', shadowColor: '#B9803F', shadowOpacity: 0.1, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 },
  miniText: { fontSize: 9.5, fontWeight: '700', color: NAVY },
});
