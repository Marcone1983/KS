import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useSkillTree, Skill, SkillCategory } from '@/hooks/use-skill-tree';
import { useSounds } from '@/hooks/use-sounds';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SKILL_SIZE = 70;
const GRID_SPACING = 90;

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  offense: '#ef4444',
  defense: '#22c55e',
  utility: '#3b82f6',
  mastery: '#a855f7',
};

const CATEGORY_NAMES: Record<SkillCategory, string> = {
  offense: 'Offesa',
  defense: 'Difesa',
  utility: 'Utilità',
  mastery: 'Maestria',
};

function SkillNode({ skill, onPress, canUnlock }: { skill: Skill; onPress: () => void; canUnlock: boolean }) {
  const scale = useSharedValue(1);
  const isUnlocked = skill.currentLevel > 0;
  const isMaxed = skill.currentLevel >= skill.maxLevel;
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  const handlePress = () => {
    scale.value = withSequence(
      withSpring(0.9, { damping: 10 }),
      withSpring(1, { damping: 10 })
    );
    onPress();
  };
  
  const borderColor = isMaxed 
    ? '#fbbf24' 
    : isUnlocked 
      ? CATEGORY_COLORS[skill.category] 
      : canUnlock 
        ? 'rgba(255,255,255,0.5)' 
        : 'rgba(255,255,255,0.2)';
  
  const bgColor = isUnlocked 
    ? `${CATEGORY_COLORS[skill.category]}40` 
    : 'rgba(0,0,0,0.5)';
  
  return (
    <Animated.View style={[animatedStyle]}>
      <Pressable
        onPress={handlePress}
        style={[
          styles.skillNode,
          {
            borderColor,
            backgroundColor: bgColor,
            opacity: canUnlock || isUnlocked ? 1 : 0.5,
          },
        ]}
      >
        <ThemedText style={styles.skillIcon}>{skill.icon}</ThemedText>
        {isUnlocked && (
          <View style={styles.levelBadge}>
            <ThemedText style={styles.levelText}>
              {skill.currentLevel}/{skill.maxLevel}
            </ThemedText>
          </View>
        )}
        {isMaxed && (
          <View style={styles.maxedBadge}>
            <ThemedText style={styles.maxedText}>MAX</ThemedText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

function SkillConnection({ from, to, unlocked }: { from: Skill; to: Skill; unlocked: boolean }) {
  const fromX = (from.position.x + 4) * GRID_SPACING + SKILL_SIZE / 2;
  const fromY = from.position.y * GRID_SPACING + SKILL_SIZE / 2;
  const toX = (to.position.x + 4) * GRID_SPACING + SKILL_SIZE / 2;
  const toY = to.position.y * GRID_SPACING + SKILL_SIZE / 2;
  
  const length = Math.sqrt(Math.pow(toX - fromX, 2) + Math.pow(toY - fromY, 2));
  const angle = Math.atan2(toY - fromY, toX - fromX) * 180 / Math.PI;
  
  return (
    <View
      style={[
        styles.connection,
        {
          left: fromX,
          top: fromY,
          width: length,
          transform: [{ rotate: `${angle}deg` }],
          backgroundColor: unlocked ? '#22c55e' : 'rgba(255,255,255,0.2)',
        },
      ]}
    />
  );
}

export default function SkillTreeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  const { state, canUnlockSkill, unlockSkill, resetSkillTree, getTotalBonus, getSkillsByCategory } = useSkillTree();
  
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | 'all'>('all');
  
  const handleSkillPress = useCallback((skill: Skill) => {
    setSelectedSkill(skill);
    play('ui_tap_1' as any);
  }, [play]);
  
  const handleUnlock = useCallback(() => {
    if (selectedSkill && canUnlockSkill(selectedSkill.id)) {
      unlockSkill(selectedSkill.id);
      play('shop_buy' as any);
      setSelectedSkill({ ...selectedSkill, currentLevel: selectedSkill.currentLevel + 1 });
    }
  }, [selectedSkill, canUnlockSkill, unlockSkill, play]);
  
  const handleReset = useCallback(() => {
    resetSkillTree();
    play('ui_back' as any);
    setSelectedSkill(null);
  }, [resetSkillTree, play]);
  
  const skills = Object.values(state.skills);
  const filteredSkills = selectedCategory === 'all' 
    ? skills 
    : skills.filter(s => s.category === selectedCategory);
  
  // Calculate connections
  const connections: { from: Skill; to: Skill; unlocked: boolean }[] = [];
  skills.forEach(skill => {
    skill.prerequisites.forEach(prereqId => {
      const prereq = state.skills[prereqId];
      if (prereq) {
        connections.push({
          from: prereq,
          to: skill,
          unlocked: prereq.currentLevel > 0,
        });
      }
    });
  });
  
  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>←</ThemedText>
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText style={styles.title}>Skill Tree</ThemedText>
          <ThemedText style={styles.pointsText}>
            🔮 {state.skillPoints} Punti Skill
          </ThemedText>
        </View>
        <Pressable onPress={handleReset} style={styles.resetButton}>
          <ThemedText style={styles.resetText}>Reset</ThemedText>
        </Pressable>
      </View>
      
      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
        <Pressable
          onPress={() => setSelectedCategory('all')}
          style={[styles.categoryButton, selectedCategory === 'all' && styles.categoryButtonActive]}
        >
          <ThemedText style={styles.categoryButtonText}>Tutti</ThemedText>
        </Pressable>
        {(Object.keys(CATEGORY_COLORS) as SkillCategory[]).map(cat => (
          <Pressable
            key={cat}
            onPress={() => setSelectedCategory(cat)}
            style={[
              styles.categoryButton,
              selectedCategory === cat && styles.categoryButtonActive,
              { borderColor: CATEGORY_COLORS[cat] },
            ]}
          >
            <ThemedText style={[styles.categoryButtonText, { color: CATEGORY_COLORS[cat] }]}>
              {CATEGORY_NAMES[cat]}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>
      
      {/* Skill Tree */}
      <ScrollView 
        style={styles.treeContainer}
        contentContainerStyle={styles.treeContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.tree}>
            {/* Connections */}
            {connections.map((conn, i) => (
              <SkillConnection key={i} from={conn.from} to={conn.to} unlocked={conn.unlocked} />
            ))}
            
            {/* Skill Nodes */}
            {filteredSkills.map(skill => (
              <View
                key={skill.id}
                style={[
                  styles.skillPosition,
                  {
                    left: (skill.position.x + 4) * GRID_SPACING,
                    top: skill.position.y * GRID_SPACING,
                  },
                ]}
              >
                <SkillNode
                  skill={skill}
                  onPress={() => handleSkillPress(skill)}
                  canUnlock={canUnlockSkill(skill.id)}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>
      
      {/* Bonuses Summary */}
      <View style={styles.bonusSummary}>
        <ThemedText style={styles.bonusTitle}>Bonus Attivi</ThemedText>
        <View style={styles.bonusRow}>
          <ThemedText style={styles.bonusText}>⚔️ +{getTotalBonus('damage')}% DMG</ThemedText>
          <ThemedText style={styles.bonusText}>❤️ +{getTotalBonus('health')} HP</ThemedText>
          <ThemedText style={styles.bonusText}>🎯 +{getTotalBonus('crit_chance')}% Crit</ThemedText>
        </View>
      </View>
      
      {/* Skill Detail Modal */}
      <Modal visible={selectedSkill !== null} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedSkill(null)}>
          <View style={styles.modalContent}>
            {selectedSkill && (
              <>
                <View style={[styles.modalHeader, { backgroundColor: CATEGORY_COLORS[selectedSkill.category] }]}>
                  <ThemedText style={styles.modalIcon}>{selectedSkill.icon}</ThemedText>
                  <ThemedText style={styles.modalName}>{selectedSkill.name}</ThemedText>
                  <ThemedText style={styles.modalLevel}>
                    Livello {selectedSkill.currentLevel}/{selectedSkill.maxLevel}
                  </ThemedText>
                </View>
                
                <View style={styles.modalBody}>
                  <ThemedText style={styles.modalDescription}>{selectedSkill.description}</ThemedText>
                  
                  <View style={styles.modalEffects}>
                    {selectedSkill.effects.map((effect, i) => (
                      <ThemedText key={i} style={styles.effectText}>
                        {effect.type}: +{effect.value * (selectedSkill.currentLevel || 1)}
                        {effect.percentage ? '%' : ''}
                      </ThemedText>
                    ))}
                  </View>
                  
                  {selectedSkill.currentLevel < selectedSkill.maxLevel && (
                    <View style={styles.costContainer}>
                      <ThemedText style={styles.costLabel}>Costo prossimo livello:</ThemedText>
                      <ThemedText style={styles.costValue}>
                        🔮 {selectedSkill.cost[selectedSkill.currentLevel]}
                      </ThemedText>
                    </View>
                  )}
                  
                  {selectedSkill.prerequisites.length > 0 && (
                    <View style={styles.prereqContainer}>
                      <ThemedText style={styles.prereqLabel}>Prerequisiti:</ThemedText>
                      {selectedSkill.prerequisites.map(prereqId => {
                        const prereq = state.skills[prereqId];
                        return (
                          <ThemedText 
                            key={prereqId} 
                            style={[
                              styles.prereqText,
                              { color: prereq?.currentLevel > 0 ? '#22c55e' : '#ef4444' }
                            ]}
                          >
                            {prereq?.currentLevel > 0 ? '✓' : '✗'} {prereq?.name}
                          </ThemedText>
                        );
                      })}
                    </View>
                  )}
                </View>
                
                <View style={styles.modalActions}>
                  {selectedSkill.currentLevel < selectedSkill.maxLevel && (
                    <Pressable
                      onPress={handleUnlock}
                      style={[
                        styles.unlockButton,
                        !canUnlockSkill(selectedSkill.id) && styles.unlockButtonDisabled,
                      ]}
                      disabled={!canUnlockSkill(selectedSkill.id)}
                    >
                      <ThemedText style={styles.unlockButtonText}>
                        {canUnlockSkill(selectedSkill.id) ? 'Sblocca' : 'Non disponibile'}
                      </ThemedText>
                    </Pressable>
                  )}
                  <Pressable onPress={() => setSelectedSkill(null)} style={styles.closeButton}>
                    <ThemedText style={styles.closeButtonText}>Chiudi</ThemedText>
                  </Pressable>
                </View>
              </>
            )}
          </View>
        </Pressable>
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
  pointsText: { fontSize: 16, color: '#a855f7' },
  resetButton: { paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 8 },
  resetText: { fontSize: 14, color: '#ef4444' },
  categoryFilter: { maxHeight: 50, paddingHorizontal: 16 },
  categoryButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', marginRight: 8 },
  categoryButtonActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  categoryButtonText: { fontSize: 14, color: '#fff' },
  treeContainer: { flex: 1 },
  treeContent: { padding: 20 },
  tree: { width: GRID_SPACING * 10, height: GRID_SPACING * 6, position: 'relative' },
  skillPosition: { position: 'absolute' },
  skillNode: { width: SKILL_SIZE, height: SKILL_SIZE, borderRadius: SKILL_SIZE / 2, borderWidth: 3, justifyContent: 'center', alignItems: 'center' },
  skillIcon: { fontSize: 28 },
  levelBadge: { position: 'absolute', bottom: -5, backgroundColor: '#22c55e', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  levelText: { fontSize: 10, color: '#fff', fontWeight: 'bold' },
  maxedBadge: { position: 'absolute', top: -5, backgroundColor: '#fbbf24', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 10 },
  maxedText: { fontSize: 10, color: '#000', fontWeight: 'bold' },
  connection: { position: 'absolute', height: 3, transformOrigin: 'left center' },
  bonusSummary: { padding: 16, backgroundColor: 'rgba(255,255,255,0.05)', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  bonusTitle: { fontSize: 14, color: '#a1a1aa', marginBottom: 8 },
  bonusRow: { flexDirection: 'row', justifyContent: 'space-around' },
  bonusText: { fontSize: 14, color: '#fff' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 20, width: '100%', maxWidth: 350, overflow: 'hidden' },
  modalHeader: { padding: 20, alignItems: 'center' },
  modalIcon: { fontSize: 48 },
  modalName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  modalLevel: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  modalBody: { padding: 20, gap: 16 },
  modalDescription: { fontSize: 16, color: '#a1a1aa', textAlign: 'center' },
  modalEffects: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 8 },
  effectText: { fontSize: 14, color: '#22c55e' },
  costContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  costLabel: { fontSize: 14, color: '#a1a1aa' },
  costValue: { fontSize: 16, fontWeight: 'bold', color: '#a855f7' },
  prereqContainer: { gap: 4 },
  prereqLabel: { fontSize: 14, color: '#a1a1aa' },
  prereqText: { fontSize: 14 },
  modalActions: { flexDirection: 'row', padding: 16, gap: 12 },
  unlockButton: { flex: 1, backgroundColor: '#22c55e', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  unlockButtonDisabled: { backgroundColor: '#374151', opacity: 0.5 },
  unlockButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  closeButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
});
