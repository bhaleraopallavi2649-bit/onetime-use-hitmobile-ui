import React from 'react';
import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import type { GroupRoom } from '../../lib/api';
import type { RoomProfile } from '../../lib/groupChat/avatars';
import { roomDisplayName, roomLines, roomTypeLabel } from '../../lib/groupChat/rooms';
import { timeStr } from '../../lib/groupChat/formatting';
import RoomAvatar from './RoomAvatar';

// ── Room list row ──
// One row for BOTH sections. Joined and discoverable rows previously had their
// own near-identical components (and the discover variant was additionally
// duplicated between an inline list and a modal), which let the two drift apart.
// `joined` is the only thing that differs: the trailing slot shows either
// activity time + unread badge, or a Join button.
const GroupRow = React.memo(function GroupRow({ room, joined, joining, onPress, onJoin, cache }: {
  room: GroupRoom;
  joined: boolean;
  joining?: boolean;
  onPress?: (room: GroupRoom) => void;
  onJoin?: (room: GroupRoom) => void;
  // The avatar fallback cache, not the avatar itself — the row's picture comes
  // from room.avatar when the server has one. Renamed from `profilePictures`
  // (and off `any`) so that subordinate role is legible at the call site.
  cache: Record<string, RoomProfile>;
}) {
  const { primary, secondary } = roomLines(room);
  const typeLabel = roomTypeLabel(room);
  const unread = joined ? (room.unreadCount || 0) : 0;

  return (
    <Pressable
      onPress={joined ? () => onPress?.(room) : undefined}
      disabled={!joined}
      style={[s.roomRow, room.isUniversal && s.roomRowPinned]}
    >
      <View style={[s.roomAvatar, room.isUniversal && { backgroundColor: colors.brand }]}>
        <RoomAvatar room={room} cache={cache} />
      </View>

      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.roomNameRow}>
          <Text style={[s.roomName, room.isUniversal && { color: colors.brand }]} numberOfLines={1}>
            {roomDisplayName(room)}
          </Text>
          {!!typeLabel && (
            <View style={s.roomTypeChip}>
              <Text style={s.roomTypeChipText}>{typeLabel}</Text>
            </View>
          )}
        </View>

        <Text style={s.roomMeta} numberOfLines={1}>{primary}</Text>
        {!!secondary && <Text style={s.roomMetaSecondary} numberOfLines={1}>{secondary}</Text>}
      </View>

      {joined ? (
        <View style={s.roomTrailing}>
          <Text style={s.roomTime}>{timeStr(room.lastActivity)}</Text>
          {unread > 0 && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadBadgeText}>{unread > 99 ? '99+' : unread}</Text>
            </View>
          )}
        </View>
      ) : (
        <Pressable
          onPress={() => onJoin?.(room)}
          disabled={joining}
          style={[s.smallJoin, joining && { opacity: 0.6 }]}
          accessibilityRole="button"
          accessibilityLabel={`Join ${roomDisplayName(room)}`}
        >
          {joining
            ? <ActivityIndicator size="small" color={colors.brand} />
            : <Text style={s.smallJoinText}>Join Group</Text>}
        </Pressable>
      )}
    </Pressable>
  );
});

// Kept named `s` so the JSX body above is byte-identical to what it was inside
// GroupChatEmbedded.tsx. Every one of these keys was measured at exactly one
// reference, all of them in this component, so none of them are shared.
const s = StyleSheet.create({
  // Each group is its own rounded card with a soft shadow (reference), instead of
  // a flat row in one long white list.
  roomRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12, marginHorizontal: 12,
    backgroundColor: '#FFFBF6', borderRadius: 16, borderWidth: 1, borderColor: '#EFE2D2',
    shadowColor: colors.brandDark, shadowOpacity: 0.07, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
  roomRowPinned: { backgroundColor: '#FFF6EC' },
  roomAvatar: { width: 54, height: 54, borderRadius: 27, backgroundColor: '#FBE9D6', borderWidth: 1, borderColor: '#F0D9BE', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  roomNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  roomName: { fontSize: 15, fontWeight: '700', color: colors.ink, flexShrink: 1 },
  roomTypeChip: { flexShrink: 0, backgroundColor: '#FBE9D6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  roomTypeChipText: { fontSize: 10, fontWeight: '700', color: colors.brandDark, letterSpacing: 0.2 },
  roomMeta: { fontSize: 12, color: colors.muted2, marginTop: 2 },
  roomMetaSecondary: { fontSize: 12, fontWeight: '500', color: colors.muted2, marginTop: 1 },
  roomTrailing: { alignItems: 'flex-end', gap: 5 },
  roomTime: { fontSize: 12, color: colors.muted2 },
  unreadBadge: { minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  unreadBadgeText: { fontSize: 10.5, fontWeight: '700', color: '#fff' },
  // "Join Group": white pill with an orange outline and dark label (reference),
  // 40dp tall so it is easy to hit.
  smallJoin: { minWidth: 92, minHeight: 40, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: colors.brand },
  smallJoinText: { fontSize: 13, fontWeight: '600', color: colors.ink },
});

export default GroupRow;
