import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useQuests, Quest, QuestType, QuestReward } from '@/hooks/use-quests';
import { useSounds } from '@/hooks/use-sounds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TYPE_COLORS: Record<QuestType, string> = {
  main: '#fbbf24',
  side: '#3b82f6',
  daily: '#22c55e',
  weekly: '#a855f7',
  event: '#ef4444',
};

const TYPE_NAMES: Record<QuestType, string> = {
  main: 'Storia',
  side: 'Secondarie',
  daily: 'Giornaliere',
  weekly: 'Settimanali',
  event: 'Evento',
};

const REWARD_ICONS: Record<string, string> = {
  coins: '🪙',
  gems: '💎',
  xp: '⭐',
  skill_points: '🔮',
  item: '📦',
  chest: '🎁',
};

function ProgressBar({ current, target, color }: { current: number; target: number; color: string }) {
  const progress = Math.min(current / target, 1);
  return (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

function QuestCard({ quest, onPress }: { quest: Quest; onPress: () => void }) {
  const scale = useSharedValue(1);
  const color = TYPE_COLORS[quest.type];
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePress = () => {
    scale.value = withSequence(withSpring(0.95), withSpring(1));
    onPress();
  };
  
  const totalProgress = quest.objectives.reduce((sum, obj) => sum + obj.current, 0);
  const totalTarget = quest.objectives.reduce((sum, obj) => sum + obj.target, 0);
  const isCompleted = quest.status === 'completed';
  const isClaimed = quest.status === 'claimed';
  
  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.questCard,
          { borderLeftColor: color },
          isCompleted && styles.questCardCompleted,
          isClaimed && styles.questCardClaimed,
        ]}
      >
        <View style={styles.questHeader}>
          <ThemedText style={styles.questIcon}>{quest.icon}</ThemedText>
          <View style={styles.questTitleContainer}>
            <ThemedText style={styles.questTitle} numberOfLines={1}>{quest.title}</ThemedText>
            <ThemedText style={[styles.questType, { color }]}>{TYPE_NAMES[quest.type]}</ThemedText>
          </View>
          {isCompleted && !isClaimed && (
            <View style={styles.claimBadge}>
              <ThemedText style={styles.claimBadgeText}>!</ThemedText>
            </View>
          )}
        </View>
        
        <ThemedText style={styles.questDescription} numberOfLines={2}>{quest.description}</ThemedText>
        
        <View style={styles.questProgress}>
          <ProgressBar current={totalProgress} target={totalTarget} color={color} />
          <ThemedText style={styles.progressText}>{totalProgress}/{totalTarget}</ThemedText>
        </View>
        
        <View style={styles.rewardsPreview}>
          {quest.rewards.slice(0, 3).map((reward, i) => (
            <View key={i} style={styles.rewardPreviewItem}>
              <ThemedText style={styles.rewardPreviewIcon}>{REWARD_ICONS[reward.type]}</ThemedText>
              <ThemedText style={styles.rewardPreviewAmount}>{reward.amount}</ThemedText>
            </View>
          ))}
        </View>
      </Pressable>
    </Animated.View>
  );
}

function RewardItem({ reward }: { reward: QuestReward }) {
  return (
    <View style={styles.rewardItem}>
      <ThemedText style={styles.rewardIcon}>{REWARD_ICONS[reward.type]}</ThemedText>
      <ThemedText style={styles.rewardAmount}>+{reward.amount}</ThemedText>
    </View>
  );
}

export default function QuestsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  const { 
    state, 
    acceptQuest, 
    claimRewards, 
    getQuestsByType, 
    getActiveQuests, 
    getAvailableQuests,
    getCurrentChapter,
  } = useQuests();
  
  const [selectedType, setSelectedType] = useState<QuestType | 'active'>('active');
  const [selectedQuest, setSelectedQuest] = useState<Quest | null>(null);
  const [showRewardsModal, setShowRewardsModal] = useState(false);
  const [claimedRewards, setClaimedRewards] = useState<QuestReward[]>([]);
  
  const getFilteredQuests = useCallback((): Quest[] => {
    if (selectedType === 'active') {
      return getActiveQuests();
    }
    return getQuestsByType(selectedType as QuestType);
  }, [selectedType, getActiveQuests, getQuestsByType]);
  
  const handleQuestPress = useCallback((quest: Quest) => {
    setSelectedQuest(quest);
    play('ui_tap_1' as any);
  }, [play]);
  
  const handleAccept = useCallback(() => {
    if (selectedQuest && selectedQuest.status === 'available') {
      acceptQuest(selectedQuest.id);
      play('ui_success' as any);
      setSelectedQuest(null);
    }
  }, [selectedQuest, acceptQuest, play]);
  
  const handleClaim = useCallback(() => {
    if (selectedQuest && selectedQuest.status === 'completed') {
      const rewards = claimRewards(selectedQuest.id);
      if (rewards) {
        setClaimedRewards(rewards);
        setShowRewardsModal(true);
        play('shop_buy_rare' as any);
      }
      setSelectedQuest(null);
    }
  }, [selectedQuest, claimRewards, play]);
  
  const filteredQuests = getFilteredQuests();
  const currentChapter = getCurrentChapter();
  
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>←</ThemedText>
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.title}>Missioni</ThemedText>
          <ThemedText style={styles.chapterText}>Capitolo {currentChapter}</ThemedText>
        </View>
        <View style={styles.statsContainer}>
          <ThemedText style={styles.statsText}>✓ {state.totalQuestsCompleted}</ThemedText>
        </View>
      </View>
      
      {/* Type Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <Pressable
          onPress={() => setSelectedType('active')}
          style={[styles.filterButton, selectedType === 'active' && styles.filterButtonActive]}
        >
          <ThemedText style={[styles.filterText, selectedType === 'active' && styles.filterTextActive]}>
            Attive ({getActiveQuests().length})
          </ThemedText>
        </Pressable>
        {(Object.keys(TYPE_COLORS) as QuestType[]).map(type => (
          <Pressable
            key={type}
            onPress={() => setSelectedType(type)}
            style={[
              styles.filterButton,
              selectedType === type && styles.filterButtonActive,
              { borderColor: TYPE_COLORS[type] },
            ]}
          >
            <ThemedText style={[
              styles.filterText,
              selectedType === type && { color: TYPE_COLORS[type] },
            ]}>
              {TYPE_NAMES[type]}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
      
      {/* Quest List */}
      <ScrollView 
        style={styles.questList}
        contentContainerStyle={[styles.questListContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {filteredQuests.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyIcon}>📜</ThemedText>
            <ThemedText style={styles.emptyText}>
              {selectedType === 'active' 
                ? 'Nessuna missione attiva. Accetta una missione per iniziare!'
                : 'Nessuna missione disponibile in questa categoria.'}
            </ThemedText>
          </View>
        ) : (
          filteredQuests.map(quest => (
            <QuestCard key={quest.id} quest={quest} onPress={() => handleQuestPress(quest)} />
          ))
        )}
      </ScrollView>
      
      {/* Quest Detail Modal */}
      <Modal visible={selectedQuest !== null} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedQuest && (
              <>
                <View style={[styles.modalHeader, { backgroundColor: TYPE_COLORS[selectedQuest.type] }]}>
                  <ThemedText style={styles.modalIcon}>{selectedQuest.icon}</ThemedText>
                  <ThemedText style={styles.modalTitle}>{selectedQuest.title}</ThemedText>
                  <ThemedText style={styles.modalType}>{TYPE_NAMES[selectedQuest.type]}</ThemedText>
                </View>
                
                <ScrollView style={styles.modalBody}>
                  <ThemedText style={styles.modalDescription}>{selectedQuest.description}</ThemedText>
                  
                  <ThemedText style={styles.sectionTitle}>Obiettivi</ThemedText>
                  {selectedQuest.objectives.map((obj, i) => (
                    <View key={i} style={styles.objectiveItem}>
                      <ThemedText style={[styles.objectiveCheck, obj.completed && styles.objectiveCompleted]}>
                        {obj.completed ? '✓' : '○'}
                      </ThemedText>
                      <View style={styles.objectiveContent}>
                        <ThemedText style={styles.objectiveText}>{obj.description}</ThemedText>
                        <ProgressBar 
                          current={obj.current} 
                          target={obj.target} 
                          color={TYPE_COLORS[selectedQuest.type]} 
                        />
                        <ThemedText style={styles.objectiveProgress}>
                          {obj.current}/{obj.target}
                        </ThemedText>
                      </View>
                    </View>
                  ))}
                  
                  <ThemedText style={styles.sectionTitle}>Ricompense</ThemedText>
                  <View style={styles.rewardsGrid}>
                    {selectedQuest.rewards.map((reward, i) => (
                      <RewardItem key={i} reward={reward} />
                    ))}
                  </View>
                </ScrollView>
                
                <View style={styles.modalActions}>
                  <Pressable onPress={() => setSelectedQuest(null)} style={styles.closeButton}>
                    <ThemedText style={styles.closeButtonText}>Chiudi</ThemedText>
                  </Pressable>
                  
                  {selectedQuest.status === 'available' && (
                    <Pressable onPress={handleAccept} style={styles.acceptButton}>
                      <ThemedText style={styles.acceptButtonText}>Accetta</ThemedText>
                    </Pressable>
                  )}
                  
                  {selectedQuest.status === 'completed' && (
                    <Pressable onPress={handleClaim} style={styles.claimButton}>
                      <ThemedText style={styles.claimButtonText}>Riscuoti</ThemedText>
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Rewards Claimed Modal */}
      <Modal visible={showRewardsModal} transparent animationType="fade">
        <View style={styles.rewardsOverlay}>
          <View style={styles.rewardsContent}>
            <ThemedText style={styles.rewardsTitle}>🎉 Ricompense Ottenute!</ThemedText>
            <View style={styles.rewardsClaimedGrid}>
              {claimedRewards.map((reward, i) => (
                <View key={i} style={styles.rewardClaimedItem}>
                  <ThemedText style={styles.rewardClaimedIcon}>{REWARD_ICONS[reward.type]}</ThemedText>
                  <ThemedText style={styles.rewardClaimedAmount}>+{reward.amount}</ThemedText>
                </View>
              ))}
            </View>
            <Pressable onPress={() => setShowRewardsModal(false)} style={styles.continueButton}>
              <ThemedText style={styles.continueButtonText}>Continua</ThemedText>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: '#fff' },
  headerCenter: { flex: 1, alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#fff' },
  chapterText: { fontSize: 14, color: '#a1a1aa' },
  statsContainer: { paddingHorizontal: 12, paddingVertical: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  statsText: { fontSize: 14, color: '#22c55e' },
  filterContainer: { maxHeight: 50, paddingHorizontal: 16 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginRight: 8 },
  filterButtonActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  filterText: { fontSize: 14, color: '#a1a1aa' },
  filterTextActive: { color: '#fff' },
  questList: { flex: 1 },
  questListContent: { padding: 16, gap: 12 },
  questCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 16, borderLeftWidth: 4, gap: 8 },
  questCardCompleted: { backgroundColor: 'rgba(34,197,94,0.1)' },
  questCardClaimed: { opacity: 0.5 },
  questHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  questIcon: { fontSize: 32 },
  questTitleContainer: { flex: 1 },
  questTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  questType: { fontSize: 12 },
  claimBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
  claimBadgeText: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  questDescription: { fontSize: 14, color: '#a1a1aa' },
  questProgress: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  progressText: { fontSize: 12, color: '#a1a1aa', minWidth: 50, textAlign: 'right' },
  rewardsPreview: { flexDirection: 'row', gap: 12 },
  rewardPreviewItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  rewardPreviewIcon: { fontSize: 16 },
  rewardPreviewAmount: { fontSize: 12, color: '#a1a1aa' },
  emptyState: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyText: { fontSize: 16, color: '#a1a1aa', textAlign: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' },
  modalHeader: { padding: 24, alignItems: 'center', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalIcon: { fontSize: 48 },
  modalTitle: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  modalType: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  modalBody: { padding: 20, maxHeight: 300 },
  modalDescription: { fontSize: 16, color: '#a1a1aa', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff', marginBottom: 12 },
  objectiveItem: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  objectiveCheck: { fontSize: 20, color: '#a1a1aa' },
  objectiveCompleted: { color: '#22c55e' },
  objectiveContent: { flex: 1, gap: 4 },
  objectiveText: { fontSize: 14, color: '#fff' },
  objectiveProgress: { fontSize: 12, color: '#a1a1aa' },
  rewardsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  rewardItem: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8 },
  rewardIcon: { fontSize: 24 },
  rewardAmount: { fontSize: 16, fontWeight: 'bold', color: '#22c55e' },
  modalActions: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  closeButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  acceptButton: { flex: 1, backgroundColor: '#3b82f6', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  acceptButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  claimButton: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  claimButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  rewardsOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  rewardsContent: { backgroundColor: '#1a1a2e', borderRadius: 24, padding: 24, alignItems: 'center', width: '100%', maxWidth: 350 },
  rewardsTitle: { fontSize: 24, fontWeight: 'bold', color: '#fbbf24', marginBottom: 20 },
  rewardsClaimedGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 16, marginBottom: 24 },
  rewardClaimedItem: { alignItems: 'center', gap: 4 },
  rewardClaimedIcon: { fontSize: 40 },
  rewardClaimedAmount: { fontSize: 18, fontWeight: 'bold', color: '#22c55e' },
  continueButton: { backgroundColor: '#fbbf24', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 12 },
  continueButtonText: { fontSize: 16, fontWeight: 'bold', color: '#000' },
});
