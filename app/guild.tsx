import { useRouter } from "expo-router";
import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, TextInput, FlatList, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import * as Haptics from 'expo-haptics';
import { useSounds } from '@/hooks/use-sounds';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence, withTiming } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface GuildMember {
  id: string;
  name: string;
  avatar: string;
  role: 'leader' | 'officer' | 'member';
  level: number;
  contribution: number;
  lastActive: string;
  online: boolean;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  type: 'message' | 'system' | 'event';
}

interface GuildEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  type: 'raid' | 'challenge' | 'donation' | 'war';
  startTime: string;
  endTime: string;
  participants: number;
  maxParticipants: number;
  rewards: { xp: number; coins: number; item?: string };
  status: 'upcoming' | 'active' | 'completed';
}

interface Guild {
  id: string;
  name: string;
  tag: string;
  emblem: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  members: GuildMember[];
  maxMembers: number;
  description: string;
  createdAt: string;
  rank: number;
  totalPower: number;
}

// 3D Guild Emblem
function GuildEmblem3D({ level }: { level: number }) {
  const shieldRef = React.useRef<THREE.Group>(null);
  const glowRef = React.useRef<THREE.Mesh>(null);
  
  const color = level >= 10 ? '#ffd700' : level >= 5 ? '#a855f7' : '#3b82f6';
  
  useFrame((state) => {
    if (shieldRef.current) {
      shieldRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.2;
    }
    if (glowRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1;
      glowRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group ref={shieldRef}>
      {/* Glow */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[0.7, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.2} />
      </mesh>
      
      {/* Shield base */}
      <mesh>
        <cylinderGeometry args={[0.5, 0.4, 0.1, 6]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      
      {/* Shield center */}
      <mesh position={[0, 0, 0.06]}>
        <cylinderGeometry args={[0.3, 0.25, 0.05, 6]} />
        <meshStandardMaterial color="#fff" metalness={0.9} roughness={0.1} />
      </mesh>
      
      {/* Level indicator */}
      <mesh position={[0, 0.4, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Mock data
const MOCK_GUILD: Guild = {
  id: 'g1',
  name: 'Green Warriors',
  tag: 'GW',
  emblem: '🌿',
  level: 7,
  xp: 4500,
  xpToNextLevel: 6000,
  members: [
    { id: 'u1', name: 'GreenMaster', avatar: '👨‍🌾', role: 'leader', level: 45, contribution: 15000, lastActive: 'now', online: true },
    { id: 'u2', name: 'PlantLover', avatar: '👩‍🌾', role: 'officer', level: 38, contribution: 12000, lastActive: '5m ago', online: true },
    { id: 'u3', name: 'BugSlayer', avatar: '🧑‍🌾', role: 'officer', level: 35, contribution: 10000, lastActive: '1h ago', online: false },
    { id: 'u4', name: 'Gardener99', avatar: '👴', role: 'member', level: 28, contribution: 5000, lastActive: '2h ago', online: false },
    { id: 'u5', name: 'NewSprout', avatar: '👶', role: 'member', level: 12, contribution: 1500, lastActive: '30m ago', online: true },
  ],
  maxMembers: 30,
  description: 'La gilda più verde del server! Uniamoci per proteggere le piante.',
  createdAt: '2024-01-15',
  rank: 42,
  totalPower: 158000,
};

const MOCK_EVENTS: GuildEvent[] = [
  {
    id: 'e1',
    name: 'Raid Boss: Locusta Gigante',
    description: 'Sconfiggi il boss insieme alla gilda!',
    icon: '👹',
    type: 'raid',
    startTime: new Date(Date.now() + 3600000).toISOString(),
    endTime: new Date(Date.now() + 7200000).toISOString(),
    participants: 8,
    maxParticipants: 15,
    rewards: { xp: 5000, coins: 10000, item: 'legendary_spray' },
    status: 'upcoming',
  },
  {
    id: 'e2',
    name: 'Sfida Settimanale',
    description: 'Elimina 10000 parassiti come gilda',
    icon: '🏆',
    type: 'challenge',
    startTime: new Date(Date.now() - 86400000).toISOString(),
    endTime: new Date(Date.now() + 518400000).toISOString(),
    participants: 12,
    maxParticipants: 30,
    rewards: { xp: 3000, coins: 5000 },
    status: 'active',
  },
];

const MOCK_MESSAGES: ChatMessage[] = [
  { id: 'm1', senderId: 'u1', senderName: 'GreenMaster', senderAvatar: '👨‍🌾', content: 'Pronti per il raid di stasera?', timestamp: '10:30', type: 'message' },
  { id: 'm2', senderId: 'system', senderName: 'Sistema', senderAvatar: '🤖', content: 'PlantLover ha donato 500 risorse alla gilda!', timestamp: '10:25', type: 'system' },
  { id: 'm3', senderId: 'u2', senderName: 'PlantLover', senderAvatar: '👩‍🌾', content: 'Sì! Ho preparato le pozioni', timestamp: '10:32', type: 'message' },
  { id: 'm4', senderId: 'u5', senderName: 'NewSprout', senderAvatar: '👶', content: 'Posso partecipare anche io?', timestamp: '10:35', type: 'message' },
];

type TabType = 'home' | 'members' | 'chat' | 'events';

export default function GuildScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  
  const [guild, setGuild] = useState<Guild | null>(MOCK_GUILD);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_MESSAGES);
  const [events, setEvents] = useState<GuildEvent[]>(MOCK_EVENTS);
  const [newMessage, setNewMessage] = useState('');
  const [hasGuild, setHasGuild] = useState(true);

  const handleSendMessage = useCallback(() => {
    if (!newMessage.trim()) return;
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    play('ui_tap_light');
    
    const message: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'current_user',
      senderName: 'Tu',
      senderAvatar: '😊',
      content: newMessage.trim(),
      timestamp: new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
      type: 'message',
    };
    
    setMessages(prev => [...prev, message]);
    setNewMessage('');
  }, [newMessage, play]);

  const handleJoinEvent = useCallback((eventId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    play('ui_success');
    
    setEvents(prev => prev.map(e => 
      e.id === eventId ? { ...e, participants: e.participants + 1 } : e
    ));
    
    Alert.alert('✅ Iscritto!', 'Ti sei iscritto all\'evento. Riceverai una notifica quando inizierà.');
  }, [play]);

  const handleCreateGuild = useCallback(() => {
    Alert.prompt(
      'Crea Gilda',
      'Inserisci il nome della tua nuova gilda:',
      [
        { text: 'Annulla', style: 'cancel' },
        { 
          text: 'Crea', 
          onPress: (name) => {
            if (name && name.trim()) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              play('ui_success');
              setHasGuild(true);
              setGuild({
                ...MOCK_GUILD,
                name: name.trim(),
                members: [MOCK_GUILD.members[0]],
                level: 1,
                xp: 0,
              });
            }
          }
        },
      ],
      'plain-text'
    );
  }, [play]);

  // No guild screen
  if (!hasGuild) {
    return (
      <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
        <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ThemedText style={styles.backText}>← Indietro</ThemedText>
            </Pressable>
          </View>
          
          <View style={styles.noGuildContainer}>
            <View style={styles.emblem3D}>
              <Canvas>
                <ambientLight intensity={0.5} />
                <pointLight position={[3, 3, 3]} intensity={1} />
                <PerspectiveCamera makeDefault position={[0, 0, 2.5]} />
                <Suspense fallback={null}>
                  <GuildEmblem3D level={1} />
                </Suspense>
              </Canvas>
            </View>
            
            <ThemedText style={styles.noGuildTitle}>Unisciti a una Gilda!</ThemedText>
            <ThemedText style={styles.noGuildDescription}>
              Le gilde ti permettono di collaborare con altri giocatori, partecipare a eventi esclusivi e guadagnare ricompense speciali.
            </ThemedText>
            
            <Pressable style={styles.createGuildButton} onPress={handleCreateGuild}>
              <ThemedText style={styles.createGuildText}>➕ Crea una Gilda</ThemedText>
            </Pressable>
            
            <Pressable style={styles.browseGuildsButton} onPress={() => Alert.alert('Coming Soon', 'La ricerca gilde sarà disponibile presto!')}>
              <ThemedText style={styles.browseGuildsText}>🔍 Cerca Gilde</ThemedText>
            </Pressable>
          </View>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#1a1a2e', '#16213e', '#0f3460']} style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.content, { paddingTop: Math.max(insets.top, 20) }]}>
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <ThemedText style={styles.backText}>← Indietro</ThemedText>
            </Pressable>
          </View>

          {/* Guild Header */}
          <View style={styles.guildHeader}>
            <View style={styles.emblem3DSmall}>
              <Canvas>
                <ambientLight intensity={0.5} />
                <pointLight position={[3, 3, 3]} intensity={1} />
                <PerspectiveCamera makeDefault position={[0, 0, 2]} />
                <Suspense fallback={null}>
                  <GuildEmblem3D level={guild?.level || 1} />
                </Suspense>
              </Canvas>
            </View>
            <View style={styles.guildInfo}>
              <ThemedText style={styles.guildName}>{guild?.name} [{guild?.tag}]</ThemedText>
              <ThemedText style={styles.guildLevel}>Livello {guild?.level} • Rank #{guild?.rank}</ThemedText>
              <View style={styles.xpBar}>
                <View style={[styles.xpFill, { width: `${((guild?.xp || 0) / (guild?.xpToNextLevel || 1)) * 100}%` }]} />
              </View>
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabs}>
            {(['home', 'members', 'chat', 'events'] as TabType[]).map(tab => (
              <Pressable
                key={tab}
                style={[styles.tab, activeTab === tab && styles.tabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  play('ui_tab_switch');
                  setActiveTab(tab);
                }}
              >
                <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                  {tab === 'home' ? '🏠' : tab === 'members' ? '👥' : tab === 'chat' ? '💬' : '📅'}
                </ThemedText>
              </Pressable>
            ))}
          </View>

          {/* Tab Content */}
          {activeTab === 'home' && (
            <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <ThemedText style={styles.statValue}>{guild?.members.length}/{guild?.maxMembers}</ThemedText>
                  <ThemedText style={styles.statLabel}>Membri</ThemedText>
                </View>
                <View style={styles.statCard}>
                  <ThemedText style={styles.statValue}>{guild?.totalPower?.toLocaleString()}</ThemedText>
                  <ThemedText style={styles.statLabel}>Potenza</ThemedText>
                </View>
                <View style={styles.statCard}>
                  <ThemedText style={styles.statValue}>{guild?.members.filter(m => m.online).length}</ThemedText>
                  <ThemedText style={styles.statLabel}>Online</ThemedText>
                </View>
              </View>
              
              <View style={styles.descriptionCard}>
                <ThemedText style={styles.descriptionTitle}>Descrizione</ThemedText>
                <ThemedText style={styles.descriptionText}>{guild?.description}</ThemedText>
              </View>
              
              <View style={{ height: 100 }} />
            </ScrollView>
          )}

          {activeTab === 'members' && (
            <FlatList
              data={guild?.members}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={styles.memberCard}>
                  <View style={[styles.onlineIndicator, { backgroundColor: item.online ? '#22c55e' : '#6b7280' }]} />
                  <ThemedText style={styles.memberAvatar}>{item.avatar}</ThemedText>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <ThemedText style={styles.memberName}>{item.name}</ThemedText>
                      <View style={[styles.roleBadge, { backgroundColor: item.role === 'leader' ? '#ffd700' : item.role === 'officer' ? '#a855f7' : '#3b82f6' }]}>
                        <ThemedText style={styles.roleText}>{item.role === 'leader' ? '👑' : item.role === 'officer' ? '⭐' : ''}</ThemedText>
                      </View>
                    </View>
                    <ThemedText style={styles.memberLevel}>Lv.{item.level} • {item.contribution.toLocaleString()} contributi</ThemedText>
                  </View>
                </View>
              )}
              contentContainerStyle={styles.membersList}
            />
          )}

          {activeTab === 'chat' && (
            <View style={styles.chatContainer}>
              <FlatList
                data={messages}
                keyExtractor={item => item.id}
                renderItem={({ item }) => (
                  <View style={[styles.messageCard, item.type === 'system' && styles.systemMessage]}>
                    <ThemedText style={styles.messageAvatar}>{item.senderAvatar}</ThemedText>
                    <View style={styles.messageContent}>
                      <ThemedText style={styles.messageSender}>{item.senderName}</ThemedText>
                      <ThemedText style={styles.messageText}>{item.content}</ThemedText>
                    </View>
                    <ThemedText style={styles.messageTime}>{item.timestamp}</ThemedText>
                  </View>
                )}
                contentContainerStyle={styles.messagesList}
                inverted={false}
              />
              
              <View style={styles.chatInput}>
                <TextInput
                  style={styles.input}
                  placeholder="Scrivi un messaggio..."
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  value={newMessage}
                  onChangeText={setNewMessage}
                  onSubmitEditing={handleSendMessage}
                />
                <Pressable style={styles.sendButton} onPress={handleSendMessage}>
                  <ThemedText style={styles.sendText}>📤</ThemedText>
                </Pressable>
              </View>
            </View>
          )}

          {activeTab === 'events' && (
            <FlatList
              data={events}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <View style={[styles.eventCard, { borderColor: item.status === 'active' ? '#22c55e' : '#3b82f6' }]}>
                  <View style={styles.eventHeader}>
                    <ThemedText style={styles.eventIcon}>{item.icon}</ThemedText>
                    <View style={styles.eventInfo}>
                      <ThemedText style={styles.eventName}>{item.name}</ThemedText>
                      <ThemedText style={styles.eventDescription}>{item.description}</ThemedText>
                    </View>
                    <View style={[styles.eventStatus, { backgroundColor: item.status === 'active' ? '#22c55e' : '#3b82f6' }]}>
                      <ThemedText style={styles.eventStatusText}>
                        {item.status === 'active' ? 'ATTIVO' : 'PRESTO'}
                      </ThemedText>
                    </View>
                  </View>
                  
                  <View style={styles.eventDetails}>
                    <ThemedText style={styles.eventParticipants}>
                      👥 {item.participants}/{item.maxParticipants} partecipanti
                    </ThemedText>
                    <View style={styles.eventRewards}>
                      <ThemedText style={styles.rewardText}>⭐ {item.rewards.xp}</ThemedText>
                      <ThemedText style={styles.rewardText}>🪙 {item.rewards.coins}</ThemedText>
                    </View>
                  </View>
                  
                  {item.status !== 'completed' && (
                    <Pressable 
                      style={styles.joinEventButton}
                      onPress={() => handleJoinEvent(item.id)}
                    >
                      <ThemedText style={styles.joinEventText}>Partecipa</ThemedText>
                    </Pressable>
                  )}
                </View>
              )}
              contentContainerStyle={styles.eventsList}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 16 },
  header: { marginBottom: 8 },
  backButton: { padding: 8, alignSelf: 'flex-start' },
  backText: { color: '#fff', fontSize: 16 },
  guildHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  emblem3DSmall: { width: 80, height: 80, marginRight: 12 },
  emblem3D: { width: 150, height: 150, marginBottom: 24 },
  guildInfo: { flex: 1 },
  guildName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  guildLevel: { fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 8 },
  xpBar: { height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  tabs: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  tabActive: { backgroundColor: '#3b82f6' },
  tabText: { fontSize: 20 },
  tabTextActive: { },
  tabContent: { flex: 1 },
  statsGrid: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  statLabel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 4 },
  descriptionCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 },
  descriptionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  descriptionText: { fontSize: 14, color: 'rgba(255,255,255,0.8)', lineHeight: 20 },
  membersList: { paddingBottom: 100 },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 12, marginBottom: 8 },
  onlineIndicator: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  memberAvatar: { fontSize: 32, marginRight: 12 },
  memberInfo: { flex: 1 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center' },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginRight: 8 },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  roleText: { fontSize: 12 },
  memberLevel: { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  chatContainer: { flex: 1 },
  messagesList: { paddingBottom: 16 },
  messageCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, padding: 10, marginBottom: 8 },
  systemMessage: { backgroundColor: 'rgba(34, 197, 94, 0.2)' },
  messageAvatar: { fontSize: 24, marginRight: 10 },
  messageContent: { flex: 1 },
  messageSender: { fontSize: 12, fontWeight: 'bold', color: '#3b82f6', marginBottom: 2 },
  messageText: { fontSize: 14, color: '#fff' },
  messageTime: { fontSize: 10, color: 'rgba(255,255,255,0.5)' },
  chatInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 8 },
  input: { flex: 1, color: '#fff', fontSize: 16, paddingVertical: 8 },
  sendButton: { padding: 8 },
  sendText: { fontSize: 24 },
  eventsList: { paddingBottom: 100 },
  eventCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 2 },
  eventHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  eventIcon: { fontSize: 40, marginRight: 12 },
  eventInfo: { flex: 1 },
  eventName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  eventDescription: { fontSize: 12, color: 'rgba(255,255,255,0.7)' },
  eventStatus: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  eventStatusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  eventDetails: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  eventParticipants: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  eventRewards: { flexDirection: 'row', gap: 12 },
  rewardText: { fontSize: 14, color: '#ffd700' },
  joinEventButton: { backgroundColor: '#22c55e', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  joinEventText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  noGuildContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  noGuildTitle: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  noGuildDescription: { fontSize: 16, color: 'rgba(255,255,255,0.7)', textAlign: 'center', marginBottom: 32, lineHeight: 24 },
  createGuildButton: { backgroundColor: '#22c55e', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16, marginBottom: 16 },
  createGuildText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  browseGuildsButton: { backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 32, paddingVertical: 16, borderRadius: 16 },
  browseGuildsText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
