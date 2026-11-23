import React, { useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { ArrowLeft, Send } from 'lucide-react-native';
import { Avatar, Badge, Button, Card, SegmentedTabs } from '../components/UI';
import { useApp } from '../context/AppContext';
import { breakpoints, colors, radii } from '../theme/tokens';

export function MessagesInboxScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= breakpoints.desktop;
  const {
    conversations,
    selectedConversationId,
    setSelectedConversationId,
    updateRequestStatus,
    sendReply,
    loadConversationMessages,
    openHostProfileByUsername,
  } = useApp();

  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing'>('all');
  const [mobileShowThread, setMobileShowThread] = useState(false);
  const [draft, setDraft] = useState('');

  const filtered = conversations.filter((c) => {
    if (filter === 'all') return true;
    return c.direction === filter;
  });

  const activeConv =
    conversations.find((c) => c.id === selectedConversationId) || filtered[0] || conversations[0];

  useEffect(() => {
    if (activeConv?.id) {
      loadConversationMessages(activeConv.id);
    }
  }, [activeConv?.id]);

  const handleSend = () => {
    if (!activeConv || !draft.trim()) return;
    sendReply(activeConv.id, draft);
    setDraft('');
  };

  const renderList = () => (
    <View style={[styles.listPane, isDesktop && styles.listPaneDesktop]}>
      <View style={styles.listHeader}>
        <Text style={styles.title}>Requests &amp; Chat</Text>
        <SegmentedTabs
          options={[
            { key: 'all', label: 'All' },
            { key: 'incoming', label: 'Incoming' },
            { key: 'outgoing', label: 'Sent' },
          ]}
          value={filter}
          onChange={setFilter}
        />
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
        {filtered.length === 0 ? (
          <View style={{ padding: 24, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.ink }}>
              No messages found
            </Text>
            <Text style={{ fontSize: 13, color: colors.muted, textAlign: 'center' }}>
              Your inbox is clear. Messages and stay requests will appear here.
            </Text>
          </View>
        ) : (
          filtered.map((c) => {
            const isSel = c.id === activeConv?.id;
            const lastMsg = c.messages[c.messages.length - 1];
            const tone =
              c.status === 'accepted'
                ? 'green'
                : c.status === 'tentative'
                ? 'blue'
                : c.status === 'declined'
                ? 'neutral'
                : 'amber';
            return (
              <Pressable
                key={c.id}
                onPress={() => {
                  setSelectedConversationId(c.id);
                  if (!isDesktop) setMobileShowThread(true);
                }}
                style={[styles.convRow, isSel && isDesktop && styles.convRowActive]}
              >
                <Avatar initials={c.otherInitials} color={c.otherColor} size={40} uri={c.otherAvatarUrl} />
                <View style={{ flex: 1, gap: 3 }}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.convName}>{c.otherName}</Text>
                    <Text style={styles.convTime}>{c.time}</Text>
                  </View>
                  <Text style={styles.convPreview} numberOfLines={1}>
                    {c.dates ? `${c.dates} · ` : ''}
                    {lastMsg?.body}
                  </Text>
                  <View style={styles.rowBetween}>
                    {c.status ? <Badge label={c.status.toUpperCase()} tone={tone} /> : <View />}
                    {c.unread && <View style={styles.unreadDot} />}
                  </View>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );

  const renderThread = () => {
    if (!activeConv) return null;
    return (
      <View style={styles.threadPane}>
        <View style={styles.threadHeader}>
          <View style={styles.rowGap10}>
            {!isDesktop && (
              <Pressable onPress={() => setMobileShowThread(false)} style={{ padding: 4 }}>
                <ArrowLeft size={18} color={colors.ink} />
              </Pressable>
            )}
            <Pressable
              onPress={() => openHostProfileByUsername(activeConv.otherUsername)}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}
            >
              <Avatar initials={activeConv.otherInitials} color={activeConv.otherColor} size={38} uri={activeConv.otherAvatarUrl} />
              <View style={{ flex: 1 }}>
                <Text style={styles.convName}>{activeConv.otherName}</Text>
                <Text style={styles.threadSub}>
                  {activeConv.dates ? `${activeConv.dates} · ` : ''}View Profile →
                </Text>
              </View>
            </Pressable>
          </View>

          {activeConv.direction === 'incoming' && (
            <View style={styles.statusBtns}>
              <Button
                label={activeConv.status === 'accepted' ? 'Accepted ✓' : 'Accept'}
                variant="green"
                size="sm"
                onPress={() => updateRequestStatus(activeConv.id, 'accepted')}
              />
              <Button
                label="Tentative"
                variant="outline"
                size="sm"
                onPress={() => updateRequestStatus(activeConv.id, 'tentative')}
              />
              <Button
                label="Decline"
                variant="ghost"
                size="sm"
                onPress={() => updateRequestStatus(activeConv.id, 'declined')}
              />
            </View>
          )}
        </View>

        <ScrollView contentContainerStyle={styles.messagesScroll}>
          {activeConv.messages.map((m) => (
            <View
              key={m.id}
              style={[styles.bubble, m.isMine ? styles.bubbleMine : styles.bubbleTheirs]}
            >
              <Text style={[styles.bubbleText, m.isMine && { color: colors.white }]}>{m.body}</Text>
              <Text style={[styles.bubbleTime, m.isMine && { color: '#94A3B8' }]}>{m.time}</Text>
            </View>
          ))}
        </ScrollView>

        <View style={styles.composerBar}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Write a reply..."
            onSubmitEditing={handleSend}
            style={styles.composerInput}
          />
          <Pressable onPress={handleSend} style={styles.sendBtn}>
            <Send size={15} color={colors.white} />
            <Text style={styles.sendTxt}>Send</Text>
          </Pressable>
        </View>
      </View>
    );
  };

  if (isDesktop) {
    return (
      <View style={styles.desktopWrap}>
        {renderList()}
        {renderThread()}
      </View>
    );
  }

  return <View style={{ flex: 1 }}>{mobileShowThread ? renderThread() : renderList()}</View>;
}

const styles = StyleSheet.create({
  desktopWrap: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.canvas,
  },
  listPane: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  listPaneDesktop: {
    flex: 0,
    width: 340,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  listHeader: {
    padding: 16,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.ink,
  },
  convRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radii.md,
    backgroundColor: colors.canvas,
  },
  convRowActive: {
    backgroundColor: colors.brandSoft,
    borderWidth: 1,
    borderColor: 'rgba(243,112,0,0.35)',
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowGap10: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  convName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ink,
  },
  convTime: {
    fontSize: 11,
    color: colors.subtle,
  },
  convPreview: {
    fontSize: 12,
    color: colors.muted,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.brand,
  },
  threadPane: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  threadHeader: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 14,
    gap: 10,
  },
  threadSub: {
    fontSize: 11,
    color: colors.muted,
  },
  statusBtns: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  messagesScroll: {
    padding: 16,
    gap: 10,
  },
  bubble: {
    maxWidth: '82%',
    padding: 13,
    borderRadius: radii.lg,
    gap: 4,
  },
  bubbleTheirs: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bubbleMine: {
    alignSelf: 'flex-end',
    backgroundColor: colors.ink,
  },
  bubbleText: {
    fontSize: 13,
    color: colors.ink,
    lineHeight: 19,
  },
  bubbleTime: {
    fontSize: 10,
    color: colors.subtle,
    alignSelf: 'flex-end',
  },
  composerBar: {
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
  },
  composerInput: {
    flex: 1,
    backgroundColor: colors.canvas,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    color: colors.ink,
  },
  sendBtn: {
    backgroundColor: colors.brand,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sendTxt: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
