import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { memo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import Animated, { FadeInLeft, FadeInRight } from 'react-native-reanimated';

interface MessageBubbleProps {
  _id: string;
  text: string;
  isSelf: boolean;
  time: string;
  onLongPress?: () => void;
  onReply?: () => void;
  status?: 'sent' | 'delivered' | 'read' | 'sending';
  isEdited?: boolean;
  isDeleted?: boolean;
  replyTo?: {
    _id: string;
    text?: string;
    content?: string;
    senderId: string;
  };
  shouldAnimate?: boolean;
  editedText?: string;
  deletedTextMine?: string;
  deletedTextTheirs?: string;
}

export const MessageBubble = memo<MessageBubbleProps>(({
  text,
  isSelf,
  time,
  onLongPress,
  onReply,
  status,
  isEdited,
  isDeleted,
  replyTo,
  shouldAnimate = false,
  editedText,
  deletedTextMine,
  deletedTextTheirs,
}) => {
  const swipeableRef = useRef<Swipeable>(null);

  const renderSwipeActions = () => (
    <View style={[
      styles.swipeActionContainer,
      isSelf
        ? { alignItems: 'flex-start', paddingLeft: 20 }
        : { alignItems: 'flex-end', paddingRight: 20 },
    ]}>
      <Ionicons name="arrow-undo" size={24} color="#9cc1c4" />
    </View>
  );

  const handleSwipeOpen = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onReply?.();
    setTimeout(() => {
      swipeableRef.current?.close();
    }, 0);
  };

  return (
    <Animated.View
      entering={shouldAnimate
        ? (isSelf ? FadeInRight : FadeInLeft).springify().damping(20).mass(0.8)
        : undefined}
    >
      <Swipeable
        ref={swipeableRef}
        renderRightActions={isSelf ? renderSwipeActions : undefined}
        renderLeftActions={!isSelf ? renderSwipeActions : undefined}
        onSwipeableWillOpen={handleSwipeOpen}
        friction={2}
        rightThreshold={40}
        leftThreshold={40}
      >
        <Pressable
          onLongPress={() => {
            if (isDeleted) return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            onLongPress?.();
          }}
          style={[
            styles.messageWrapper,
            isSelf ? styles.myMessageWrapper : styles.theirMessageWrapper,
          ]}
        >
          <View style={[
            styles.messageBubble,
            isSelf ? styles.myBubble : styles.theirBubble,
            isDeleted && styles.deletedBubble,
          ]}>

            {/* Reply preview inside bubble */}
            {replyTo && !isDeleted && (
              <View style={[
                styles.replyPreview,
                isSelf ? styles.replyPreviewMine : styles.replyPreviewTheirs,
              ]}>
                <View style={[
                  styles.replyBar,
                  isSelf ? styles.replyBarMine : styles.replyBarTheirs,
                ]} />
                <View style={styles.replyContent}>
                  <Text style={[
                    styles.replyAuthor,
                    isSelf ? styles.replyAuthorMine : styles.replyAuthorTheirs,
                  ]} numberOfLines={1}>
                    {isSelf ? 'Vous' : 'Contact'}
                  </Text>
                  <Text
                    style={[
                      styles.replyText,
                      isSelf ? styles.replyTextMine : styles.replyTextTheirs,
                    ]}
                    numberOfLines={2}
                  >
                    {replyTo.content || replyTo.text}
                  </Text>
                </View>
              </View>
            )}

            {/* Message content */}
            {isDeleted ? (
              <View style={styles.deletedContent}>
                <Ionicons name="ban-outline" size={14} color="#999" />
                <Text style={styles.deletedText}>{isSelf ? (deletedTextMine || 'Vous avez supprimé ce message') : (deletedTextTheirs || 'Ce message a été supprimé')}</Text>
              </View>
            ) : (
              <Text style={[
                styles.messageText,
                isSelf ? styles.myMessageText : styles.theirMessageText,
              ]}>
                {text}
              </Text>
            )}

            {/* Footer: time + edited + status */}
            <View style={styles.messageMeta}>
              {isEdited && !isDeleted && (
                <Text style={[
                  styles.editedLabel,
                  isSelf ? styles.editedLabelMine : styles.editedLabelTheirs,
                ]}>
                  {editedText || 'modifié'}
                </Text>
              )}
              <Text style={[
                styles.messageTime,
                isSelf ? styles.myMessageTime : styles.theirMessageTime,
              ]}>
                {time}
              </Text>
              {isSelf && !isDeleted && (
                <View style={styles.statusIcons}>
                  {status === 'sending' ? (
                    <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.6)" />
                  ) : status === 'read' ? (
                    <Ionicons name="checkmark-done" size={16} color="#45B1FF" />
                  ) : status === 'delivered' ? (
                    <Ionicons name="checkmark-done" size={16} color="rgba(255,255,255,0.6)" />
                  ) : (
                    <Ionicons name="checkmark" size={16} color="rgba(255,255,255,0.6)" />
                  )}
                </View>
              )}
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  // Row-level: positions the bubble left or right
  messageWrapper: {
    marginBottom: 15,
    flexDirection: 'row',
  },
  myMessageWrapper: {
    justifyContent: 'flex-end',
    paddingRight: 15,
    paddingLeft: 60,
  },
  theirMessageWrapper: {
    justifyContent: 'flex-start',
    paddingLeft: 15,
    paddingRight: 60,
  },
  // The actual bubble
  messageBubble: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
  },
  myBubble: {
    backgroundColor: '#9cc1c4',
    borderBottomRightRadius: 5,
  },
  theirBubble: {
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 5,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  deletedBubble: {
    opacity: 0.7,
  },
  // Text
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFF',
  },
  theirMessageText: {
    color: '#1a1a1a',
  },
  // Footer row
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  messageTime: {
    fontSize: 10,
  },
  myMessageTime: {
    color: 'rgba(255,255,255,0.7)',
  },
  theirMessageTime: {
    color: '#999',
  },
  statusIcons: {
    marginLeft: 4,
  },
  editedLabel: {
    fontSize: 10,
    fontStyle: 'italic',
    marginRight: 4,
  },
  editedLabelMine: {
    color: 'rgba(255,255,255,0.6)',
  },
  editedLabelTheirs: {
    color: '#aaa',
  },
  // Swipe action
  swipeActionContainer: {
    justifyContent: 'center',
    width: 60,
  },
  // Deleted message
  deletedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deletedText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#999',
  },
  // Reply preview inside bubble
  replyPreview: {
    borderRadius: 10,
    padding: 8,
    marginBottom: 6,
    flexDirection: 'row',
  },
  replyPreviewMine: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  replyPreviewTheirs: {
    backgroundColor: '#F5F5F5',
  },
  replyBar: {
    position: 'absolute',
    left: 8,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 2,
  },
  replyBarMine: {
    backgroundColor: '#FFF',
  },
  replyBarTheirs: {
    backgroundColor: '#9cc1c4',
  },
  replyContent: {
    marginLeft: 16,
    flex: 1,
  },
  replyAuthor: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  replyAuthorMine: {
    color: 'rgba(255,255,255,0.9)',
  },
  replyAuthorTheirs: {
    color: '#9cc1c4',
  },
  replyText: {
    fontSize: 12,
    lineHeight: 16,
  },
  replyTextMine: {
    color: 'rgba(255,255,255,0.7)',
  },
  replyTextTheirs: {
    color: '#888',
  },
});
