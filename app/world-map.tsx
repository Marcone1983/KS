import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useWorldMap, Zone, ZoneDifficulty } from '@/hooks/use-world-map';
import { useSounds } from '@/hooks/use-sounds';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_WIDTH = SCREEN_WIDTH * 1.5;
const MAP_HEIGHT = SCREEN_HEIGHT * 1.2;

function ZoneNode({ zone, isUnlocked, progress, isSelected, onPress }: { zone: Zone; isUnlocked: boolean; progress?: { stars: number; bossDefeated: boolean }; isSelected: boolean; onPress: () => void }) {
  const { zoneColors, difficultyColors } = useWorldMap();
  const pulse = useSharedValue(1);
  React.useEffect(() => { if (isUnlocked && !progress?.bossDefeated && zone.bossId) pulse.value = withRepeat(withTiming(1.2, { duration: 1000 }), -1, true); else pulse.value = 1; }, [isUnlocked, progress, zone.bossId]);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: pulse.value }] }));
  const x = (zone.position.x / 100) * MAP_WIDTH;
  const y = (zone.position.y / 100) * MAP_HEIGHT;
  return (
    <Pressable onPress={onPress} style={[styles.zoneNode, { left: x - 30, top: y - 30, opacity: isUnlocked ? 1 : 0.3 }]}>
      <Animated.View style={[styles.zoneIconContainer, { backgroundColor: isUnlocked ? zoneColors[zone.type] : '#374151', borderColor: isSelected ? '#fff' : 'transparent' }, animatedStyle]}>
        <ThemedText style={styles.zoneIcon}>{zone.icon}</ThemedText>
        {zone.bossId && <View style={[styles.bossBadge, { backgroundColor: progress?.bossDefeated ? '#22c55e' : '#ef4444' }]}><ThemedText style={styles.bossIcon}>{progress?.bossDefeated ? '✓' : '💀'}</ThemedText></View>}
      </Animated.View>
      {progress && progress.stars > 0 && (
        <View style={styles.starsContainer}>{[1, 2, 3].map(i => (<ThemedText key={i} style={[styles.star, { opacity: i <= progress.stars ? 1 : 0.3 }]}>⭐</ThemedText>))}</View>
      )}
      <View style={[styles.difficultyBadge, { backgroundColor: difficultyColors[zone.difficulty] }]}><ThemedText style={styles.difficultyText}>{zone.difficulty[0].toUpperCase()}</ThemedText></View>
    </Pressable>
  );
}

function ZoneDetailModal({ zone, progress, isUnlocked, onClose, onEnter }: { zone: Zone; progress?: { stars: number; bossDefeated: boolean; timesCleared: number; bestTime: number }; isUnlocked: boolean; onClose: () => void; onEnter: () => void }) {
  const { zoneColors, difficultyColors } = useWorldMap();
  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={[styles.modalHeader, { backgroundColor: zoneColors[zone.type] }]}>
            <ThemedText style={styles.modalIcon}>{zone.icon}</ThemedText>
            <ThemedText style={styles.modalName}>{zone.name}</ThemedText>
            <View style={styles.modalBadges}>
              <View style={[styles.badge, { backgroundColor: difficultyColors[zone.difficulty] }]}><ThemedText style={styles.badgeText}>{zone.difficulty}</ThemedText></View>
              <View style={styles.badge}><ThemedText style={styles.badgeText}>Lv.{zone.requiredLevel}+</ThemedText></View>
            </View>
          </View>
          <View style={styles.modalBody}>
            <ThemedText style={styles.description}>{zone.description}</ThemedText>
            {progress && (
              <View style={styles.progressSection}>
                <View style={styles.progressRow}><ThemedText style={styles.progressLabel}>Completamenti</ThemedText><ThemedText style={styles.progressValue}>{progress.timesCleared}</ThemedText></View>
                <View style={styles.progressRow}><ThemedText style={styles.progressLabel}>Miglior Tempo</ThemedText><ThemedText style={styles.progressValue}>{progress.bestTime > 0 ? `${Math.floor(progress.bestTime / 60)}:${(progress.bestTime % 60).toString().padStart(2, '0')}` : '-'}</ThemedText></View>
                <View style={styles.progressRow}><ThemedText style={styles.progressLabel}>Stelle</ThemedText><View style={styles.starsRow}>{[1, 2, 3].map(i => (<ThemedText key={i} style={[styles.starLarge, { opacity: i <= progress.stars ? 1 : 0.3 }]}>⭐</ThemedText>))}</View></View>
              </View>
            )}
            <View style={styles.enemiesSection}>
              <ThemedText style={styles.sectionTitle}>Nemici</ThemedText>
              <View style={styles.enemyList}>{zone.enemies.map((enemy, idx) => (<View key={idx} style={styles.enemyBadge}><ThemedText style={styles.enemyText}>{enemy}</ThemedText></View>))}</View>
            </View>
            {zone.bossId && (
              <View style={styles.bossSection}>
                <ThemedText style={styles.sectionTitle}>Boss</ThemedText>
                <View style={[styles.bossBanner, { backgroundColor: progress?.bossDefeated ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)' }]}>
                  <ThemedText style={styles.bossName}>💀 {zone.bossId.replace('_', ' ').toUpperCase()}</ThemedText>
                  <ThemedText style={styles.bossStatus}>{progress?.bossDefeated ? '✓ Sconfitto' : '⚔️ Non sconfitto'}</ThemedText>
                </View>
              </View>
            )}
            <View style={styles.dropsSection}>
              <ThemedText style={styles.sectionTitle}>Drop Possibili</ThemedText>
              <View style={styles.dropList}>{zone.drops.map((drop, idx) => (<View key={idx} style={styles.dropItem}><ThemedText style={styles.dropName}>{drop.itemId}</ThemedText><ThemedText style={styles.dropChance}>{Math.floor(drop.chance * 100)}%</ThemedText></View>))}</View>
            </View>
          </View>
          <View style={styles.modalActions}>
            <Pressable onPress={onEnter} disabled={!isUnlocked} style={[styles.enterButton, !isUnlocked && styles.enterButtonDisabled]}><ThemedText style={styles.enterText}>{isUnlocked ? '⚔️ Entra nella Zona' : `🔒 Richiede Lv.${zone.requiredLevel}`}</ThemedText></Pressable>
            <Pressable onPress={onClose} style={styles.closeButton}><ThemedText style={styles.closeText}>Chiudi</ThemedText></Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function WorldMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  const { state, allZones, isZoneUnlocked, getZoneProgress, zoneColors } = useWorldMap();
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);

  const handleZonePress = useCallback((zone: Zone) => { setSelectedZone(zone); play('ui_tap_1' as any); }, [play]);
  const handleEnterZone = useCallback(() => { if (selectedZone) { play('trans_enter_game' as any); router.push({ pathname: '/zone-battle', params: { zoneId: selectedZone.id } } as any); } }, [selectedZone, play, router]);

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}><ThemedText style={styles.backText}>←</ThemedText></Pressable>
        <ThemedText style={styles.title}>Mappa del Mondo</ThemedText>
        <View style={styles.statsBadge}><ThemedText style={styles.statsText}>⭐ {state.totalStars} | 💀 {state.bossesDefeated}</ThemedText></View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mapContainer}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.mapContent, { width: MAP_WIDTH, height: MAP_HEIGHT }]}>
          {/* Zone connections */}
          {allZones.map(zone => zone.connections.map(connId => {
            const connZone = allZones.find(z => z.id === connId);
            if (!connZone || zone.id > connId) return null;
            const x1 = (zone.position.x / 100) * MAP_WIDTH;
            const y1 = (zone.position.y / 100) * MAP_HEIGHT;
            const x2 = (connZone.position.x / 100) * MAP_WIDTH;
            const y2 = (connZone.position.y / 100) * MAP_HEIGHT;
            const bothUnlocked = isZoneUnlocked(zone.id) && isZoneUnlocked(connId);
            return (<View key={`${zone.id}-${connId}`} style={[styles.connection, { left: Math.min(x1, x2), top: Math.min(y1, y2), width: Math.abs(x2 - x1) || 2, height: Math.abs(y2 - y1) || 2, backgroundColor: bothUnlocked ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)', transform: [{ rotate: `${Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI}deg` }] }]} />);
          }))}
          {/* Zone nodes */}
          {allZones.map(zone => (<ZoneNode key={zone.id} zone={zone} isUnlocked={isZoneUnlocked(zone.id)} progress={getZoneProgress(zone.id)} isSelected={selectedZone?.id === zone.id} onPress={() => handleZonePress(zone)} />))}
        </ScrollView>
      </ScrollView>
      <View style={[styles.legend, { paddingBottom: insets.bottom + 16 }]}>
        <ThemedText style={styles.legendTitle}>Legenda</ThemedText>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {Object.entries(zoneColors).map(([type, color]) => (<View key={type} style={styles.legendItem}><View style={[styles.legendColor, { backgroundColor: color }]} /><ThemedText style={styles.legendText}>{type}</ThemedText></View>))}
        </ScrollView>
      </View>
      {selectedZone && (<ZoneDetailModal zone={selectedZone} progress={getZoneProgress(selectedZone.id)} isUnlocked={isZoneUnlocked(selectedZone.id)} onClose={() => setSelectedZone(null)} onEnter={handleEnterZone} />)}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  backText: { fontSize: 24, color: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  statsBadge: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  statsText: { fontSize: 12, color: '#fff' },
  mapContainer: { flexGrow: 1 },
  mapContent: { backgroundColor: '#1a1a2e', position: 'relative' },
  connection: { position: 'absolute', height: 3, borderRadius: 2 },
  zoneNode: { position: 'absolute', width: 60, height: 60, alignItems: 'center' },
  zoneIconContainer: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 3 },
  zoneIcon: { fontSize: 24 },
  bossBadge: { position: 'absolute', top: -5, right: -5, width: 20, height: 20, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  bossIcon: { fontSize: 10 },
  starsContainer: { flexDirection: 'row', marginTop: 2 },
  star: { fontSize: 10 },
  difficultyBadge: { position: 'absolute', bottom: -5, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 },
  difficultyText: { fontSize: 8, color: '#fff', fontWeight: 'bold' },
  legend: { padding: 16, backgroundColor: 'rgba(0,0,0,0.5)' },
  legendTitle: { fontSize: 14, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  legendColor: { width: 16, height: 16, borderRadius: 8, marginRight: 4 },
  legendText: { fontSize: 12, color: '#a1a1aa', textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#1a1a2e', borderRadius: 20, width: '100%', maxHeight: '90%', overflow: 'hidden' },
  modalHeader: { padding: 20, alignItems: 'center' },
  modalIcon: { fontSize: 48 },
  modalName: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  modalBadges: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, color: '#fff', textTransform: 'capitalize' },
  modalBody: { padding: 16, gap: 16 },
  description: { fontSize: 14, color: '#a1a1aa', textAlign: 'center' },
  progressSection: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12, gap: 8 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressLabel: { fontSize: 14, color: '#a1a1aa' },
  progressValue: { fontSize: 14, fontWeight: 'bold', color: '#fff' },
  starsRow: { flexDirection: 'row' },
  starLarge: { fontSize: 16 },
  enemiesSection: { gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  enemyList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  enemyBadge: { backgroundColor: 'rgba(239,68,68,0.2)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  enemyText: { fontSize: 12, color: '#ef4444', textTransform: 'capitalize' },
  bossSection: { gap: 8 },
  bossBanner: { padding: 12, borderRadius: 12, alignItems: 'center' },
  bossName: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  bossStatus: { fontSize: 12, color: '#a1a1aa', marginTop: 4 },
  dropsSection: { gap: 8 },
  dropList: { gap: 4 },
  dropItem: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, borderRadius: 8 },
  dropName: { fontSize: 12, color: '#fff', textTransform: 'capitalize' },
  dropChance: { fontSize: 12, color: '#fbbf24' },
  modalActions: { padding: 16, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  enterButton: { backgroundColor: '#22c55e', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  enterButtonDisabled: { backgroundColor: '#374151' },
  enterText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  closeButton: { backgroundColor: 'rgba(255,255,255,0.05)', paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  closeText: { fontSize: 14, color: '#a1a1aa' },
});
