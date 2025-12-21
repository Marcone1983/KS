// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Modal, TextInput, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface Friend {
  id: string;
  name: string;
  avatar: string;
  level: number;
  status: 'online' | 'offline' | 'playing' | 'away';
  lastSeen?: Date;
  stats: { plants: number; wins: number; hybrids: number };
  isFavorite: boolean;
}

interface FriendRequest {
  id: string;
  from: { name: string; avatar: string; level: number };
  sentAt: Date;
}

const STATUS_COLORS = {
  online: '#22c55e',
  playing: '#3b82f6',
  away: '#f59e0b',
  offline: '#6b7280',
};

const MOCK_FRIENDS: Friend[] = [
  { id: 'f1', name: 'GreenMaster', avatar: '👨‍🌾', level: 45, status: 'online', stats: { plants: 234, wins: 89, hybrids: 56 }, isFavorite: true },
  { id: 'f2', name: 'PlantQueen', avatar: '👸', level: 52, status: 'playing', stats: { plants: 312, wins: 124, hybrids: 78 }, isFavorite: true },
  { id: 'f3', name: 'BugSlayer', avatar: '⚔️', level: 38, status: 'away', stats: { plants: 156, wins: 67, hybrids: 34 }, isFavorite: false },
  { id: 'f4', name: 'SeedSage', avatar: '🧙', level: 61, status: 'online', stats: { plants: 445, wins: 201, hybrids: 112 }, isFavorite: false },
  { id: 'f5', name: 'HerbHero', avatar: '🦸', level: 29, status: 'offline', lastSeen: new Date(Date.now() - 3600000), stats: { plants: 98, wins: 34, hybrids: 21 }, isFavorite: false },
  { id: 'f6', name: 'CannaCrafter', avatar: '🔨', level: 43, status: 'offline', lastSeen: new Date(Date.now() - 86400000), stats: { plants: 187, wins: 78, hybrids: 45 }, isFavorite: false },
];

const MOCK_REQUESTS: FriendRequest[] = [
  { id: 'r1', from: { name: 'NewGrower', avatar: '🌱', level: 12 }, sentAt: new Date(Date.now() - 3600000) },
  { id: 'r2', from: { name: 'ProPlayer', avatar: '🎮', level: 67 }, sentAt: new Date(Date.now() - 7200000) },
];

export default function FriendsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState(MOCK_FRIENDS);
  const [requests, setRequests] = useState(MOCK_REQUESTS);
  const [activeTab, setActiveTab] = useState<'friends' | 'requests' | 'search'>('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addUsername, setAddUsername] = useState('');

  const onlineFriends = friends.filter(f => f.status !== 'offline');
  const offlineFriends = friends.filter(f => f.status === 'offline');

  const filteredFriends = friends.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleFavorite = (friendId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFriends(prev => prev.map(f => 
      f.id === friendId ? { ...f, isFavorite: !f.isFavorite } : f
    ));
  };

  const acceptRequest = (requestId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const request = requests.find(r => r.id === requestId);
    if (request) {
      setFriends(prev => [...prev, {
        id: `f${Date.now()}`,
        name: request.from.name,
        avatar: request.from.avatar,
        level: request.from.level,
        status: 'offline',
        stats: { plants: 0, wins: 0, hybrids: 0 },
        isFavorite: false,
      }]);
      setRequests(prev => prev.filter(r => r.id !== requestId));
    }
  };

  const declineRequest = (requestId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setRequests(prev => prev.filter(r => r.id !== requestId));
  };

  const removeFriend = (friendId: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    setFriends(prev => prev.filter(f => f.id !== friendId));
    setShowProfileModal(false);
  };

  const sendFriendRequest = () => {
    if (!addUsername.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setAddUsername('');
    setShowAddModal(false);
  };

  const formatLastSeen = (date: Date) => {
    const diff = Date.now() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}g fa`;
    if (hours > 0) return `${hours}h fa`;
    return 'Poco fa';
  };

  const renderFriend = (friend: Friend, index: number) => (
    <Animated.View key={friend.id} entering={SlideInRight.delay(index * 50)}>
      <Pressable 
        style={styles.friendCard}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setSelectedFriend(friend);
          setShowProfileModal(true);
        }}
      >
        <View style={styles.friendAvatar}>
          <ThemedText style={styles.avatarText}>{friend.avatar}</ThemedText>
          <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[friend.status] }]} />
        </View>
        
        <View style={styles.friendInfo}>
          <View style={styles.friendNameRow}>
            <ThemedText style={styles.friendName}>{friend.name}</ThemedText>
            {friend.isFavorite && <ThemedText style={styles.favoriteIcon}>⭐</ThemedText>}
          </View>
          <ThemedText style={styles.friendLevel}>Livello {friend.level}</ThemedText>
          <ThemedText style={[styles.friendStatus, { color: STATUS_COLORS[friend.status] }]}>
            {friend.status === 'online' ? 'Online' : 
             friend.status === 'playing' ? 'In gioco' :
             friend.status === 'away' ? 'Assente' :
             friend.lastSeen ? `Visto ${formatLastSeen(friend.lastSeen)}` : 'Offline'}
          </ThemedText>
        </View>

        <View style={styles.friendActions}>
          <Pressable style={styles.actionButton} onPress={() => toggleFavorite(friend.id)}>
            <ThemedText style={styles.actionIcon}>{friend.isFavorite ? '⭐' : '☆'}</ThemedText>
          </Pressable>
          {friend.status !== 'offline' && (
            <Pressable style={[styles.actionButton, styles.inviteButton]}>
              <ThemedText style={styles.inviteText}>Invita</ThemedText>
            </Pressable>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );

  const renderRequest = (request: FriendRequest, index: number) => (
    <Animated.View key={request.id} entering={FadeIn.delay(index * 100)}>
      <View style={styles.requestCard}>
        <View style={styles.requestAvatar}>
          <ThemedText style={styles.avatarText}>{request.from.avatar}</ThemedText>
        </View>
        <View style={styles.requestInfo}>
          <ThemedText style={styles.requestName}>{request.from.name}</ThemedText>
          <ThemedText style={styles.requestLevel}>Livello {request.from.level}</ThemedText>
        </View>
        <View style={styles.requestActions}>
          <Pressable style={styles.acceptButton} onPress={() => acceptRequest(request.id)}>
            <ThemedText style={styles.acceptText}>✓</ThemedText>
          </Pressable>
          <Pressable style={styles.declineButton} onPress={() => declineRequest(request.id)}>
            <ThemedText style={styles.declineText}>✗</ThemedText>
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>👥 Amici</ThemedText>
        <Pressable style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <ThemedText style={styles.addButtonText}>+ Aggiungi</ThemedText>
        </Pressable>
      </View>

      {/* Stats Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statItem}>
          <ThemedText style={styles.statValue}>{friends.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Amici</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: '#22c55e' }]}>{onlineFriends.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Online</ThemedText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <ThemedText style={[styles.statValue, { color: '#f59e0b' }]}>{requests.length}</ThemedText>
          <ThemedText style={styles.statLabel}>Richieste</ThemedText>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['friends', 'requests', 'search'] as const).map(tab => (
          <Pressable
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <ThemedText style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'friends' ? `👥 Amici (${friends.length})` : 
               tab === 'requests' ? `📬 Richieste (${requests.length})` : 
               '🔍 Cerca'}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      {/* Search (for search tab or friends filter) */}
      {(activeTab === 'search' || activeTab === 'friends') && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'search' ? "Cerca giocatori..." : "Filtra amici..."}
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {/* Content */}
      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
      >
        {activeTab === 'friends' && (
          <>
            {/* Favorites */}
            {filteredFriends.filter(f => f.isFavorite).length > 0 && (
              <>
                <ThemedText style={styles.sectionTitle}>⭐ Preferiti</ThemedText>
                {filteredFriends.filter(f => f.isFavorite).map((f, i) => renderFriend(f, i))}
              </>
            )}

            {/* Online */}
            {filteredFriends.filter(f => !f.isFavorite && f.status !== 'offline').length > 0 && (
              <>
                <ThemedText style={styles.sectionTitle}>🟢 Online</ThemedText>
                {filteredFriends.filter(f => !f.isFavorite && f.status !== 'offline').map((f, i) => renderFriend(f, i))}
              </>
            )}

            {/* Offline */}
            {filteredFriends.filter(f => !f.isFavorite && f.status === 'offline').length > 0 && (
              <>
                <ThemedText style={styles.sectionTitle}>⚫ Offline</ThemedText>
                {filteredFriends.filter(f => !f.isFavorite && f.status === 'offline').map((f, i) => renderFriend(f, i))}
              </>
            )}

            {filteredFriends.length === 0 && (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyIcon}>👥</ThemedText>
                <ThemedText style={styles.emptyText}>Nessun amico trovato</ThemedText>
              </View>
            )}
          </>
        )}

        {activeTab === 'requests' && (
          <>
            {requests.length > 0 ? (
              requests.map((r, i) => renderRequest(r, i))
            ) : (
              <View style={styles.emptyState}>
                <ThemedText style={styles.emptyIcon}>📭</ThemedText>
                <ThemedText style={styles.emptyText}>Nessuna richiesta di amicizia</ThemedText>
              </View>
            )}
          </>
        )}

        {activeTab === 'search' && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyIcon}>🔍</ThemedText>
            <ThemedText style={styles.emptyText}>Cerca giocatori per nome</ThemedText>
            <ThemedText style={styles.emptySubtext}>Inserisci almeno 3 caratteri</ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Profile Modal */}
      <Modal visible={showProfileModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedFriend && (
              <>
                <View style={styles.profileAvatar}>
                  <ThemedText style={styles.profileAvatarText}>{selectedFriend.avatar}</ThemedText>
                </View>
                <ThemedText style={styles.profileName}>{selectedFriend.name}</ThemedText>
                <ThemedText style={styles.profileLevel}>Livello {selectedFriend.level}</ThemedText>
                
                <View style={[styles.profileStatus, { backgroundColor: STATUS_COLORS[selectedFriend.status] + '30' }]}>
                  <View style={[styles.statusDotLarge, { backgroundColor: STATUS_COLORS[selectedFriend.status] }]} />
                  <ThemedText style={[styles.profileStatusText, { color: STATUS_COLORS[selectedFriend.status] }]}>
                    {selectedFriend.status === 'online' ? 'Online' : 
                     selectedFriend.status === 'playing' ? 'In gioco' :
                     selectedFriend.status === 'away' ? 'Assente' : 'Offline'}
                  </ThemedText>
                </View>

                <View style={styles.profileStats}>
                  <View style={styles.profileStatItem}>
                    <ThemedText style={styles.profileStatValue}>{selectedFriend.stats.plants}</ThemedText>
                    <ThemedText style={styles.profileStatLabel}>Piante</ThemedText>
                  </View>
                  <View style={styles.profileStatItem}>
                    <ThemedText style={styles.profileStatValue}>{selectedFriend.stats.wins}</ThemedText>
                    <ThemedText style={styles.profileStatLabel}>Vittorie</ThemedText>
                  </View>
                  <View style={styles.profileStatItem}>
                    <ThemedText style={styles.profileStatValue}>{selectedFriend.stats.hybrids}</ThemedText>
                    <ThemedText style={styles.profileStatLabel}>Ibridi</ThemedText>
                  </View>
                </View>

                <View style={styles.profileActions}>
                  <Pressable style={styles.profileButton} onPress={() => setShowProfileModal(false)}>
                    <ThemedText style={styles.profileButtonText}>Chiudi</ThemedText>
                  </Pressable>
                  <Pressable style={[styles.profileButton, styles.visitButton]}>
                    <ThemedText style={styles.visitButtonText}>Visita</ThemedText>
                  </Pressable>
                  <Pressable style={[styles.profileButton, styles.removeButton]} onPress={() => removeFriend(selectedFriend.id)}>
                    <ThemedText style={styles.removeButtonText}>Rimuovi</ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Friend Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.addModalContent}>
            <ThemedText style={styles.addModalTitle}>Aggiungi Amico</ThemedText>
            <TextInput
              style={styles.addInput}
              placeholder="Nome utente"
              placeholderTextColor="#9ca3af"
              value={addUsername}
              onChangeText={setAddUsername}
              autoCapitalize="none"
            />
            <View style={styles.addModalActions}>
              <Pressable style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
                <ThemedText style={styles.cancelButtonText}>Annulla</ThemedText>
              </Pressable>
              <Pressable style={styles.sendButton} onPress={sendFriendRequest}>
                <ThemedText style={styles.sendButtonText}>Invia Richiesta</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  addButton: { backgroundColor: '#22c55e', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 20, borderRadius: 16, paddingVertical: 12, marginBottom: 10 },
  statItem: { alignItems: 'center' },
  statValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  statLabel: { color: '#9ca3af', fontSize: 11 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  tabs: { flexDirection: 'row', paddingHorizontal: 10, marginBottom: 10 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 4, borderRadius: 12 },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  tabText: { color: '#a7f3d0', fontSize: 12 },
  tabTextActive: { color: '#fff', fontWeight: 'bold' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 10 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 15 },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 20 },
  sectionTitle: { color: '#fff', fontSize: 14, fontWeight: 'bold', marginTop: 12, marginBottom: 8 },
  friendCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14, marginBottom: 8 },
  friendAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { fontSize: 26 },
  statusDot: { position: 'absolute', bottom: 0, right: 0, width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: '#166534' },
  friendInfo: { flex: 1 },
  friendNameRow: { flexDirection: 'row', alignItems: 'center' },
  friendName: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginRight: 4 },
  favoriteIcon: { fontSize: 12 },
  friendLevel: { color: '#9ca3af', fontSize: 12 },
  friendStatus: { fontSize: 11 },
  friendActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionButton: { padding: 8 },
  actionIcon: { fontSize: 20 },
  inviteButton: { backgroundColor: '#3b82f6', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6 },
  inviteText: { color: '#fff', fontSize: 12, fontWeight: 'bold' },
  requestCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, padding: 14, marginBottom: 8 },
  requestAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  requestInfo: { flex: 1 },
  requestName: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  requestLevel: { color: '#9ca3af', fontSize: 12 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
  acceptText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  declineButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  declineText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#fff', fontSize: 16, marginBottom: 4 },
  emptySubtext: { color: '#9ca3af', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#166534', borderRadius: 24, padding: 24, width: '100%', maxWidth: 320, alignItems: 'center' },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  profileAvatarText: { fontSize: 40 },
  profileName: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  profileLevel: { color: '#a7f3d0', fontSize: 14, marginBottom: 12 },
  profileStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, marginBottom: 16 },
  statusDotLarge: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  profileStatusText: { fontSize: 13, fontWeight: 'bold' },
  profileStats: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginBottom: 20 },
  profileStatItem: { alignItems: 'center' },
  profileStatValue: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  profileStatLabel: { color: '#9ca3af', fontSize: 11 },
  profileActions: { flexDirection: 'row', gap: 8, width: '100%' },
  profileButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  profileButtonText: { color: '#fff', fontSize: 13 },
  visitButton: { backgroundColor: '#3b82f6' },
  visitButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  removeButton: { backgroundColor: '#ef4444' },
  removeButtonText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  addModalContent: { backgroundColor: '#166534', borderRadius: 24, padding: 24, width: '100%', maxWidth: 320 },
  addModalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 16 },
  addInput: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 16, marginBottom: 16 },
  addModalActions: { flexDirection: 'row', gap: 10 },
  cancelButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 14 },
  sendButton: { flex: 1, backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  sendButtonText: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
});
