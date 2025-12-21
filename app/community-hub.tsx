// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, FlatList, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInUp, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withTiming } from 'react-native-reanimated';

type TabType = 'chat' | 'guilds' | 'events' | 'forum';

interface ChatMessage {
  id: string;
  username: string;
  avatar: string;
  message: string;
  timestamp: Date;
  isSystem?: boolean;
}

interface Guild {
  id: string;
  name: string;
  tag: string;
  level: number;
  members: number;
  maxMembers: number;
  description: string;
  isOpen: boolean;
  logo: string;
  weeklyXP: number;
}

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  participants: number;
  maxParticipants: number;
  rewards: string[];
  type: 'tournament' | 'challenge' | 'special';
}

interface ForumPost {
  id: string;
  title: string;
  author: string;
  category: string;
  replies: number;
  views: number;
  lastActivity: Date;
  isPinned: boolean;
}

// Mock Data
const MOCK_MESSAGES: ChatMessage[] = [
  { id: '1', username: 'GreenThumb', avatar: '🌱', message: 'Ciao a tutti! Qualcuno ha consigli per il breeding?', timestamp: new Date(Date.now() - 300000), isSystem: false },
  { id: '2', username: 'PlantMaster', avatar: '🌿', message: 'Prova a incrociare varietà con alto THC e CBD per risultati bilanciati', timestamp: new Date(Date.now() - 240000), isSystem: false },
  { id: '3', username: 'System', avatar: '⚙️', message: 'NoviceGrower si è unito alla chat!', timestamp: new Date(Date.now() - 180000), isSystem: true },
  { id: '4', username: 'BugSlayer', avatar: '🔫', message: 'Ho appena battuto il boss Locusta! 500 punti!', timestamp: new Date(Date.now() - 120000), isSystem: false },
  { id: '5', username: 'HerbQueen', avatar: '👑', message: 'Congratulazioni! Quale spray hai usato?', timestamp: new Date(Date.now() - 60000), isSystem: false },
];

const MOCK_GUILDS: Guild[] = [
  { id: '1', name: 'Green Warriors', tag: 'GW', level: 15, members: 48, maxMembers: 50, description: 'La gilda più attiva del server! Cerchiamo giocatori appassionati.', isOpen: true, logo: '⚔️', weeklyXP: 125000 },
  { id: '2', name: 'Plant Protectors', tag: 'PP', level: 12, members: 35, maxMembers: 50, description: 'Difendiamo le piante insieme. Eventi settimanali garantiti.', isOpen: true, logo: '🛡️', weeklyXP: 98000 },
  { id: '3', name: 'Elite Growers', tag: 'EG', level: 20, members: 50, maxMembers: 50, description: 'Solo i migliori. Richiesta esperienza.', isOpen: false, logo: '👑', weeklyXP: 200000 },
  { id: '4', name: 'Casual Farmers', tag: 'CF', level: 8, members: 22, maxMembers: 50, description: 'Gilda rilassata per chi gioca per divertimento.', isOpen: true, logo: '🌻', weeklyXP: 45000 },
];

const MOCK_EVENTS: CommunityEvent[] = [
  { id: '1', title: 'Torneo Settimanale', description: 'Compete per il titolo di miglior difensore!', startTime: new Date(Date.now() + 86400000), endTime: new Date(Date.now() + 172800000), participants: 128, maxParticipants: 256, rewards: ['1000 Coins', 'Badge Esclusivo', 'Spray Leggendario'], type: 'tournament' },
  { id: '2', title: 'Sfida Breeding', description: 'Crea l\'ibrido con le statistiche più alte', startTime: new Date(Date.now()), endTime: new Date(Date.now() + 604800000), participants: 89, maxParticipants: 500, rewards: ['Semi Rari x5', '500 Coins'], type: 'challenge' },
  { id: '3', title: 'Evento Natalizio', description: 'Decorazioni speciali e ricompense festive!', startTime: new Date(Date.now()), endTime: new Date(Date.now() + 1209600000), participants: 456, maxParticipants: 1000, rewards: ['Vaso Natalizio', 'Skin Spray Neve', '2000 Coins'], type: 'special' },
];

const MOCK_POSTS: ForumPost[] = [
  { id: '1', title: '📌 Regole del Forum - Leggere prima di postare', author: 'Admin', category: 'Annunci', replies: 0, views: 1520, lastActivity: new Date(Date.now() - 86400000 * 7), isPinned: true },
  { id: '2', title: '📌 Guida Completa al Breeding', author: 'PlantMaster', category: 'Guide', replies: 45, views: 3200, lastActivity: new Date(Date.now() - 3600000), isPinned: true },
  { id: '3', title: 'Miglior strategia contro il Boss Locusta?', author: 'NewPlayer123', category: 'Strategie', replies: 23, views: 890, lastActivity: new Date(Date.now() - 1800000), isPinned: false },
  { id: '4', title: 'Showcase: La mia collezione di ibridi leggendari', author: 'LegendaryBreeder', category: 'Showcase', replies: 67, views: 2100, lastActivity: new Date(Date.now() - 7200000), isPinned: false },
  { id: '5', title: 'Bug: Spray non funziona dopo update', author: 'BugReporter', category: 'Bug Report', replies: 12, views: 450, lastActivity: new Date(Date.now() - 14400000), isPinned: false },
];

const EVENT_COLORS = {
  tournament: '#ef4444',
  challenge: '#f59e0b',
  special: '#a855f7',
};

export default function CommunityHubScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<TabType>('chat');
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const chatScrollRef = useRef<ScrollView>(null);
  const onlineCount = useSharedValue(247);

  // Animate online counter
  useEffect(() => {
    const interval = setInterval(() => {
      onlineCount.value = 240 + Math.floor(Math.random() * 20);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    
    const msg: ChatMessage = {
      id: Date.now().toString(),
      username: 'Tu',
      avatar: '😎',
      message: newMessage,
      timestamp: new Date(),
      isSystem: false,
    };
    
    setMessages(prev => [...prev, msg]);
    setNewMessage('');
    
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  };

  const formatTimeAgo = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    
    if (minutes < 60) return `${minutes}m fa`;
    if (hours < 24) return `${hours}h fa`;
    return `${days}g fa`;
  };

  const renderChat = () => (
    <KeyboardAvoidingView 
      style={styles.chatContainer} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView 
        ref={chatScrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
      >
        {messages.map((msg, index) => (
          <Animated.View 
            key={msg.id} 
            entering={FadeIn.delay(index * 50)}
            style={[styles.messageRow, msg.isSystem && styles.systemMessage]}
          >
            <View style={styles.avatarContainer}>
              <ThemedText style={styles.avatar}>{msg.avatar}</ThemedText>
            </View>
            <View style={styles.messageContent}>
              <View style={styles.messageHeader}>
                <ThemedText style={[styles.username, msg.isSystem && styles.systemUsername]}>
                  {msg.username}
                </ThemedText>
                <ThemedText style={styles.timestamp}>{formatTime(msg.timestamp)}</ThemedText>
              </View>
              <ThemedText style={[styles.messageText, msg.isSystem && styles.systemText]}>
                {msg.message}
              </ThemedText>
            </View>
          </Animated.View>
        ))}
      </ScrollView>
      
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.chatInput}
          placeholder="Scrivi un messaggio..."
          placeholderTextColor="#9ca3af"
          value={newMessage}
          onChangeText={setNewMessage}
          onSubmitEditing={sendMessage}
        />
        <Pressable style={styles.sendButton} onPress={sendMessage}>
          <ThemedText style={styles.sendButtonText}>Invia</ThemedText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );

  const renderGuilds = () => (
    <ScrollView style={styles.guildsContainer}>
      <View style={styles.guildActions}>
        <Pressable style={styles.createGuildButton}>
          <ThemedText style={styles.createGuildText}>+ Crea Gilda</ThemedText>
        </Pressable>
      </View>
      
      {MOCK_GUILDS.map((guild, index) => (
        <Animated.View key={guild.id} entering={SlideInUp.delay(index * 100)}>
          <Pressable style={styles.guildCard}>
            <View style={styles.guildHeader}>
              <View style={styles.guildLogo}>
                <ThemedText style={styles.guildLogoText}>{guild.logo}</ThemedText>
              </View>
              <View style={styles.guildInfo}>
                <View style={styles.guildNameRow}>
                  <ThemedText style={styles.guildName}>{guild.name}</ThemedText>
                  <View style={styles.guildTag}>
                    <ThemedText style={styles.guildTagText}>[{guild.tag}]</ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.guildLevel}>Livello {guild.level}</ThemedText>
              </View>
              <View style={styles.guildStatus}>
                {guild.isOpen ? (
                  <View style={styles.openBadge}>
                    <ThemedText style={styles.openBadgeText}>Aperta</ThemedText>
                  </View>
                ) : (
                  <View style={styles.closedBadge}>
                    <ThemedText style={styles.closedBadgeText}>Chiusa</ThemedText>
                  </View>
                )}
              </View>
            </View>
            
            <ThemedText style={styles.guildDescription}>{guild.description}</ThemedText>
            
            <View style={styles.guildStats}>
              <View style={styles.guildStat}>
                <ThemedText style={styles.guildStatValue}>{guild.members}/{guild.maxMembers}</ThemedText>
                <ThemedText style={styles.guildStatLabel}>Membri</ThemedText>
              </View>
              <View style={styles.guildStat}>
                <ThemedText style={styles.guildStatValue}>{(guild.weeklyXP / 1000).toFixed(0)}K</ThemedText>
                <ThemedText style={styles.guildStatLabel}>XP Settimanale</ThemedText>
              </View>
            </View>
            
            {guild.isOpen && guild.members < guild.maxMembers && (
              <Pressable style={styles.joinButton}>
                <ThemedText style={styles.joinButtonText}>Unisciti</ThemedText>
              </Pressable>
            )}
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );

  const renderEvents = () => (
    <ScrollView style={styles.eventsContainer}>
      {MOCK_EVENTS.map((event, index) => (
        <Animated.View key={event.id} entering={FadeIn.delay(index * 100)}>
          <Pressable style={[styles.eventCard, { borderLeftColor: EVENT_COLORS[event.type] }]}>
            <View style={styles.eventHeader}>
              <View style={[styles.eventTypeBadge, { backgroundColor: EVENT_COLORS[event.type] }]}>
                <ThemedText style={styles.eventTypeText}>
                  {event.type === 'tournament' ? '🏆' : event.type === 'challenge' ? '⚔️' : '🎉'} {event.type.toUpperCase()}
                </ThemedText>
              </View>
              <ThemedText style={styles.eventParticipants}>
                {event.participants}/{event.maxParticipants} partecipanti
              </ThemedText>
            </View>
            
            <ThemedText style={styles.eventTitle}>{event.title}</ThemedText>
            <ThemedText style={styles.eventDescription}>{event.description}</ThemedText>
            
            <View style={styles.eventRewards}>
              <ThemedText style={styles.rewardsLabel}>Ricompense:</ThemedText>
              <View style={styles.rewardsList}>
                {event.rewards.map((reward, i) => (
                  <View key={i} style={styles.rewardBadge}>
                    <ThemedText style={styles.rewardText}>{reward}</ThemedText>
                  </View>
                ))}
              </View>
            </View>
            
            <Pressable style={styles.participateButton}>
              <ThemedText style={styles.participateButtonText}>Partecipa</ThemedText>
            </Pressable>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );

  const renderForum = () => (
    <ScrollView style={styles.forumContainer}>
      <View style={styles.forumActions}>
        <Pressable style={styles.newPostButton}>
          <ThemedText style={styles.newPostText}>+ Nuovo Post</ThemedText>
        </Pressable>
      </View>
      
      {MOCK_POSTS.map((post, index) => (
        <Animated.View key={post.id} entering={FadeIn.delay(index * 50)}>
          <Pressable style={[styles.postCard, post.isPinned && styles.pinnedPost]}>
            <View style={styles.postHeader}>
              <View style={styles.categoryBadge}>
                <ThemedText style={styles.categoryText}>{post.category}</ThemedText>
              </View>
              <ThemedText style={styles.postTime}>{formatTimeAgo(post.lastActivity)}</ThemedText>
            </View>
            
            <ThemedText style={styles.postTitle}>{post.title}</ThemedText>
            
            <View style={styles.postFooter}>
              <ThemedText style={styles.postAuthor}>di {post.author}</ThemedText>
              <View style={styles.postStats}>
                <ThemedText style={styles.postStat}>💬 {post.replies}</ThemedText>
                <ThemedText style={styles.postStat}>👁️ {post.views}</ThemedText>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      ))}
    </ScrollView>
  );

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>Community Hub</ThemedText>
        <View style={styles.onlineIndicator}>
          <View style={styles.onlineDot} />
          <ThemedText style={styles.onlineText}>{onlineCount.value} online</ThemedText>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {(['chat', 'guilds', 'events', 'forum'] as TabType[]).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'chat' ? '💬 Chat' : 
               tab === 'guilds' ? '⚔️ Gilde' : 
               tab === 'events' ? '🎉 Eventi' : '📝 Forum'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      <View style={[styles.content, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        {activeTab === 'chat' && renderChat()}
        {activeTab === 'guilds' && renderGuilds()}
        {activeTab === 'events' && renderEvents()}
        {activeTab === 'forum' && renderForum()}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  onlineIndicator: { flexDirection: 'row', alignItems: 'center' },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#22c55e', marginRight: 6 },
  onlineText: { color: '#a7f3d0', fontSize: 12 },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4, borderRadius: 12 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabText: { color: '#a7f3d0', fontSize: 12 },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1 },
  
  // Chat styles
  chatContainer: { flex: 1 },
  messagesContainer: { flex: 1, paddingHorizontal: 15 },
  messagesContent: { paddingVertical: 10 },
  messageRow: { flexDirection: 'row', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 10 },
  systemMessage: { backgroundColor: 'rgba(34,197,94,0.1)' },
  avatarContainer: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  avatar: { fontSize: 20 },
  messageContent: { flex: 1 },
  messageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  username: { color: '#22c55e', fontWeight: 'bold', fontSize: 14 },
  systemUsername: { color: '#f59e0b' },
  timestamp: { color: '#6b7280', fontSize: 12 },
  messageText: { color: '#fff', fontSize: 14, lineHeight: 20 },
  systemText: { color: '#a7f3d0', fontStyle: 'italic' },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 15, paddingVertical: 10, backgroundColor: 'rgba(0,0,0,0.2)' },
  chatInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', marginRight: 10 },
  sendButton: { backgroundColor: '#22c55e', borderRadius: 20, paddingHorizontal: 20, justifyContent: 'center' },
  sendButtonText: { color: '#fff', fontWeight: 'bold' },
  
  // Guilds styles
  guildsContainer: { flex: 1, paddingHorizontal: 15 },
  guildActions: { marginBottom: 15 },
  createGuildButton: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  createGuildText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  guildCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12 },
  guildHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  guildLogo: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  guildLogoText: { fontSize: 24 },
  guildInfo: { flex: 1 },
  guildNameRow: { flexDirection: 'row', alignItems: 'center' },
  guildName: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginRight: 8 },
  guildTag: { backgroundColor: 'rgba(34,197,94,0.3)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  guildTagText: { color: '#22c55e', fontSize: 12 },
  guildLevel: { color: '#a7f3d0', fontSize: 14 },
  guildStatus: {},
  openBadge: { backgroundColor: 'rgba(34,197,94,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  openBadgeText: { color: '#22c55e', fontSize: 12 },
  closedBadge: { backgroundColor: 'rgba(239,68,68,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  closedBadgeText: { color: '#ef4444', fontSize: 12 },
  guildDescription: { color: '#d1d5db', fontSize: 14, marginBottom: 12 },
  guildStats: { flexDirection: 'row', marginBottom: 12 },
  guildStat: { flex: 1 },
  guildStatValue: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  guildStatLabel: { color: '#9ca3af', fontSize: 12 },
  joinButton: { backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  joinButtonText: { color: '#fff', fontWeight: 'bold' },
  
  // Events styles
  eventsContainer: { flex: 1, paddingHorizontal: 15 },
  eventCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12, borderLeftWidth: 4 },
  eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  eventTypeBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  eventTypeText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  eventParticipants: { color: '#9ca3af', fontSize: 12 },
  eventTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  eventDescription: { color: '#d1d5db', fontSize: 14, marginBottom: 12 },
  eventRewards: { marginBottom: 12 },
  rewardsLabel: { color: '#a7f3d0', fontSize: 12, marginBottom: 6 },
  rewardsList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  rewardBadge: { backgroundColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  rewardText: { color: '#22c55e', fontSize: 12 },
  participateButton: { backgroundColor: '#22c55e', borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  participateButtonText: { color: '#fff', fontWeight: 'bold' },
  
  // Forum styles
  forumContainer: { flex: 1, paddingHorizontal: 15 },
  forumActions: { marginBottom: 15 },
  newPostButton: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  newPostText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  postCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 14, marginBottom: 10 },
  pinnedPost: { borderWidth: 1, borderColor: '#f59e0b' },
  postHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  categoryBadge: { backgroundColor: 'rgba(34,197,94,0.2)', paddingHorizontal: 10, paddingVertical: 2, borderRadius: 8 },
  categoryText: { color: '#22c55e', fontSize: 11 },
  postTime: { color: '#6b7280', fontSize: 12 },
  postTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 8 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  postAuthor: { color: '#9ca3af', fontSize: 12 },
  postStats: { flexDirection: 'row', gap: 12 },
  postStat: { color: '#6b7280', fontSize: 12 },
});
