// Lightweight 1:1 chat embedded in the Lead Matching hub.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, Pressable, StyleSheet, TextInput,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { ChevronLeft, ChevronRight, Send, MessageSquare, CheckCheck } from 'lucide-react-native';
import { chatApi, ChatSession, ChatMessage } from '../lib/api';
import { useAuth } from '../lib/authContext';
import { useSocket } from '../hooks/useSocket';
import { useToast } from './Toast';
import { colors } from '../theme';
import { PageBackdrop, GradientCircle } from './AuthDecor';

function timeStr(iso: string) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
function diffStr(iso: string) {
  if (!iso) return '';
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

const initial = (name?: string) => (name || '?').charAt(0).toUpperCase();

const SUB = '#5F6C86';
const LINE = '#F3E8D8';

// Module-level so FlatList sees one stable component type instead of a new one
// on every parent render.
const SessionSeparator = () => <View style={{ height: 10 }} />;

const SessionRow = React.memo(function SessionRow({ session, partnerName, onPress }: {
  session: ChatSession;
  partnerName?: string;
  onPress: (session: ChatSession) => void;
}) {
  // The AI assistant is a service, so "Online" is accurate for it. People have no
  // presence data, so no dot is drawn for them.
  const isAssistant = /assistant/i.test(partnerName || '');
  return (
    <Pressable onPress={() => onPress(session)} style={s.sessionRow}>
      <View>
        <GradientCircle size={60} letter={initial(partnerName)} fontSize={26} />
        {isAssistant && <View style={s.onlineDot} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.name} numberOfLines={1}>{partnerName || 'Unknown'}</Text>
        <Text style={s.lastMsg} numberOfLines={1}>{session.lastMessage || 'Start chatting'}</Text>
      </View>
      {session.unreadCount > 0 && (
        <View style={s.badge}><Text style={s.badgeText}>{session.unreadCount}</Text></View>
      )}
      <View style={s.timePill}><Text style={s.time}>{diffStr(session.updatedAt)}</Text></View>
      <ChevronRight size={22} color="#8B93A7" />
    </Pressable>
  );
});

const MessageRow = React.memo(function MessageRow({ msg, isMe }: {
  msg: ChatMessage;
  isMe: boolean;
}) {
  return (
    <View style={[s.msgRow, isMe ? s.msgRowMe : null]}>
      {!isMe && (
        <View style={s.avatarSmall}>
          <GradientCircle size={36} letter={initial(msg.sender.name)} fontSize={15} />
        </View>
      )}
      <View style={[s.bubble, isMe ? s.bubbleMe : s.bubbleThem]}>
        <Text style={s.bubbleText}>{msg.content}</Text>
        <View style={[s.metaRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
          <Text style={[s.bubbleTime, isMe && { color: '#7A4A1E' }]}>
            {timeStr(msg.createdAt)}
          </Text>
          {/* "Sent" tick: the message is on the server. There is no read-receipt
              data, so this does not claim the other person has read it. */}
          {isMe && <CheckCheck size={15} color={colors.brand} />}
        </View>
      </View>
    </View>
  );
});

export default function ChatEmbedded() {
  const { user } = useAuth();
  const toast = useToast();
  const socket = useSocket();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [active, setActive] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState('');
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const loadSessions = useCallback(async () => {
    try {
      setSessions(await chatApi.getSessions());
    } catch { /* silent */ }
    finally { setLoadingSessions(false); }
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    const unsub = socket.onMessage((msg: any) => {
      const sid = msg.session || msg.sessionId;
      if (sid !== active?.id) return;
      setMessages(prev => [...prev, {
        id: String(msg._id || msg.id || Date.now()),
        sender: { id: String(msg.sender?._id || ''), name: msg.sender?.name || '', role: msg.sender?.role || '' },
        content: msg.content || '',
        messageType: msg.messageType || 'text',
        createdAt: msg.createdAt || new Date().toISOString(),
      }]);
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 100);
    });
    return unsub;
  }, [active?.id, socket.onMessage]);

  // useCallback matters here: this is the onPress handed to every memoised
  // SessionRow. As a plain function it was rebuilt on each render, changing the
  // row's props and defeating the memo entirely. `activeIdRef` keeps the "leave
  // previous chat" behaviour without putting `active` in the dependency list.
  const activeIdRef = useRef<string | null>(null);
  useEffect(() => { activeIdRef.current = active?.id ?? null; }, [active?.id]);

  const openSession = useCallback(async (session: ChatSession) => {
    const previousId = activeIdRef.current;
    if (previousId) socket.leaveChat(previousId);
    setActive(session);
    setMessages([]);
    setLoadingMsgs(true);
    socket.joinChat(session.id);
    try {
      setMessages(await chatApi.getMessages(session.id));
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 150);
    } catch { /* silent */ }
    finally { setLoadingMsgs(false); }
    chatApi.markRead(session.id).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.joinChat, socket.leaveChat]);

  const send = () => {
    if (!text.trim() || !active) return;
    socket.sendMessage({ sessionId: active.id, content: text.trim() });
    setText('');
  };

  const getPartner = useCallback(
    (session: ChatSession) => session.participants.find(p => p.id !== user?.id),
    [user?.id]
  );

  // Stable renderItem + separator. Both used to be inline arrows, so the session
  // list rebuilt every row on any parent render, and the separator was treated
  // as a brand-new component type each time (remounting all separators).
  const renderSession = useCallback(
    ({ item: session }: { item: ChatSession }) => (
      <SessionRow session={session} partnerName={getPartner(session)?.name} onPress={openSession} />
    ),
    [getPartner, openSession]
  );

  // The composer's `text` state lives in this component, so before memoisation
  // every keystroke re-rendered every message bubble in the thread.
  const renderMessage = useCallback(
    ({ item: msg }: { item: ChatMessage }) => (
      <MessageRow msg={msg} isMe={msg.sender.id === user?.id} />
    ),
    [user?.id]
  );

  if (!active) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FFF9F2' }}>
        <PageBackdrop />
        {loadingSessions ? <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} /> : sessions.length === 0 ? (
          <View style={s.empty}>
            <MessageSquare size={28} color={colors.muted} />
            <Text style={s.emptyText}>No conversations yet</Text>
          </View>
        ) : (
          <FlatList
            data={sessions}
            keyExtractor={s => s.id}
            renderItem={renderSession}
            ItemSeparatorComponent={SessionSeparator}
            contentContainerStyle={{ padding: 14 }}
          />
        )}
      </View>
    );
  }

  const partner = getPartner(active);
  // The AI assistant is a service, so "Online" is accurate for it. For people
  // there is no presence data, so their role is shown instead of a guess.
  const isAssistant = /assistant/i.test(partner?.name || '');
  const roleLabel = partner?.role ? partner.role.charAt(0).toUpperCase() + partner.role.slice(1) : '';
  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FFF9F2' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <PageBackdrop />
      <View style={s.threadHeader}>
        <Pressable onPress={() => { socket.leaveChat(active.id); setActive(null); setMessages([]); }} style={{ padding: 4 }} hitSlop={8}>
          <ChevronLeft size={26} color={colors.ink} />
        </Pressable>
        <View>
          <GradientCircle size={54} letter={initial(partner?.name || '')} fontSize={24} />
          {isAssistant && <View style={s.onlineDot} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.headName} numberOfLines={1}>{partner?.name || 'Unknown'}</Text>
          {isAssistant ? <Text style={s.statusText}>Online</Text> : roleLabel ? <Text style={s.statusText}>{roleLabel}</Text> : null}
        </View>
      </View>
      {loadingMsgs ? <ActivityIndicator color={colors.brand} style={{ marginTop: 40 }} /> : (
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={m => m.id}
          contentContainerStyle={{ padding: 14, gap: 14 }}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: false })}
          renderItem={renderMessage}
        />
      )}
      <View style={s.composer}>
        <TextInput value={text} onChangeText={setText} placeholder="Type a message…" placeholderTextColor={SUB}
          style={s.composerInput}
          multiline onSubmitEditing={send} />
        <Pressable onPress={send} disabled={!text.trim()} style={[s.sendBtn, !text.trim() && { opacity: 0.7 }]}>
          <Send size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  empty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyText: { fontSize: 13, color: colors.muted },
  sessionRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14, gap: 14,
    backgroundColor: '#FFFDF9', borderRadius: 20, borderWidth: 1, borderColor: '#F6D9B8',
    shadowColor: '#B9803F', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  avatarSmall: { marginRight: 8, alignSelf: 'flex-start' },
  onlineDot: { position: 'absolute', right: 1, bottom: 1, width: 15, height: 15, borderRadius: 8, backgroundColor: '#22C55E', borderWidth: 2.5, borderColor: '#FFFDF9' },
  msgRow: { flexDirection: 'row' },
  msgRowMe: { justifyContent: 'flex-end' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  // Message bubbles — these were inline style objects rebuilt on every render.
  bubble: {
    maxWidth: '78%', paddingHorizontal: 15, paddingVertical: 11, borderRadius: 20,
    shadowColor: '#B9803F', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1,
  },
  bubbleMe: { backgroundColor: '#FDD9B5', borderWidth: 1, borderColor: '#F8C58E', borderBottomRightRadius: 6 },
  bubbleThem: { backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: LINE, borderTopLeftRadius: 6 },
  bubbleText: { fontSize: 15, lineHeight: 22, fontWeight: '500', color: colors.ink },
  bubbleTime: { fontSize: 12, color: SUB },
  headName: { fontSize: 18, fontWeight: '800', color: colors.ink },
  statusText: { fontSize: 14, color: colors.ink, marginTop: 2 },
  composer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#FFF9F2', borderTopWidth: 1, borderTopColor: '#F0E3D0' },
  composerInput: { flex: 1, minHeight: 48, maxHeight: 110, borderWidth: 1, borderColor: '#F0E3D0', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, fontSize: 15, color: colors.ink, backgroundColor: '#FFFDF9' },
  sendBtn: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 18, fontWeight: '800', color: colors.ink },
  timePill: { position: 'absolute', top: 12, right: 44, backgroundColor: '#F7EBDA', borderRadius: 11, paddingHorizontal: 10, paddingVertical: 3 },
  time: { fontSize: 12, fontWeight: '600', color: '#3B2F20' },
  lastMsg: { fontSize: 14.5, color: SUB, marginTop: 3 },
  badge: { minWidth: 20, height: 20, borderRadius: 10, backgroundColor: colors.brand, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 },
  badgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  threadHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 12, paddingVertical: 12,
    marginHorizontal: 12, marginTop: 10, marginBottom: 4, borderRadius: 20,
    backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#F6CFA3',
    shadowColor: '#B9803F', shadowOpacity: 0.12, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2,
  },
});
