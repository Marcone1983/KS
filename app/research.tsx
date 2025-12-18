import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

interface ResearchNode {
  id: string;
  name: string;
  description: string;
  icon: string;
  tier: number;
  unlocked: boolean;
  researched: boolean;
  cost: number;
  requires: string[];
  effect: string;
}

const RESEARCH_TREE: ResearchNode[] = [
  // Tier 1
  { id: 'basic_spray', name: 'Spray Base', description: 'Tecnologia spray di base', icon: '💧', tier: 1, unlocked: true, researched: true, cost: 0, requires: [], effect: 'Sblocca spray' },
  { id: 'plant_care', name: 'Cura Piante', description: 'Conoscenze base sulla cura', icon: '🌱', tier: 1, unlocked: true, researched: true, cost: 0, requires: [], effect: 'Sblocca cura' },
  // Tier 2
  { id: 'enhanced_spray', name: 'Spray Potenziato', description: 'Formula spray migliorata', icon: '💪', tier: 2, unlocked: true, researched: false, cost: 500, requires: ['basic_spray'], effect: '+25% danno spray' },
  { id: 'pest_knowledge', name: 'Conoscenza Parassiti', description: 'Studio dei parassiti', icon: '🔬', tier: 2, unlocked: true, researched: false, cost: 400, requires: ['plant_care'], effect: 'Mostra punti deboli' },
  // Tier 3
  { id: 'bio_spray', name: 'Bio Spray', description: 'Spray biologico avanzato', icon: '🧬', tier: 3, unlocked: false, researched: false, cost: 1000, requires: ['enhanced_spray'], effect: 'Danno nel tempo' },
  { id: 'immunity', name: 'Sistema Immunitario', description: 'Difese naturali pianta', icon: '🛡️', tier: 3, unlocked: false, researched: false, cost: 800, requires: ['pest_knowledge'], effect: 'Resistenza +50%' },
  // Tier 4
  { id: 'nano_spray', name: 'Nano Spray', description: 'Nanotecnologia applicata', icon: '⚡', tier: 4, unlocked: false, researched: false, cost: 2000, requires: ['bio_spray'], effect: 'Penetra armature' },
  { id: 'symbiosis', name: 'Simbiosi', description: 'Alleanza con insetti utili', icon: '🐝', tier: 4, unlocked: false, researched: false, cost: 1500, requires: ['immunity'], effect: 'Alleati automatici' },
];

export default function ResearchScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [research, setResearch] = useState<ResearchNode[]>(RESEARCH_TREE);
  const [researchPoints, setResearchPoints] = useState(1500);
  const [selectedNode, setSelectedNode] = useState<ResearchNode | null>(null);

  const canResearch = (node: ResearchNode): boolean => {
    if (node.researched || !node.unlocked) return false;
    if (researchPoints < node.cost) return false;
    return node.requires.every(reqId => research.find(r => r.id === reqId)?.researched);
  };

  const handleResearch = (nodeId: string) => {
    const node = research.find(n => n.id === nodeId);
    if (!node || !canResearch(node)) return;

    setResearchPoints(prev => prev - node.cost);
    setResearch(prev => prev.map(n => {
      if (n.id === nodeId) return { ...n, researched: true };
      // Unlock nodes that require this one
      if (n.requires.includes(nodeId)) return { ...n, unlocked: true };
      return n;
    }));
  };

  const tiers = [1, 2, 3, 4];

  return (
    <LinearGradient
      colors={['#14532d', '#166534', '#059669']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <View style={styles.pointsDisplay}>
            <ThemedText style={styles.pointsIcon}>🔬</ThemedText>
            <ThemedText style={styles.pointsText}>{researchPoints}</ThemedText>
          </View>
        </View>

        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
        />

        <ThemedText style={styles.title}>Albero Ricerca</ThemedText>
        <ThemedText style={styles.subtitle}>Sblocca nuove tecnologie</ThemedText>

        {/* Research Tree */}
        <View style={styles.treeContainer}>
          {tiers.map(tier => (
            <View key={tier} style={styles.tierRow}>
              <ThemedText style={styles.tierLabel}>Tier {tier}</ThemedText>
              <View style={styles.nodesRow}>
                {research.filter(n => n.tier === tier).map(node => (
                  <Pressable
                    key={node.id}
                    style={[
                      styles.nodeCard,
                      node.researched && styles.researchedNode,
                      !node.unlocked && styles.lockedNode,
                      selectedNode?.id === node.id && styles.selectedNode,
                    ]}
                    onPress={() => setSelectedNode(node)}
                  >
                    <ThemedText style={styles.nodeIcon}>{node.icon}</ThemedText>
                    <ThemedText style={styles.nodeName} numberOfLines={1}>{node.name}</ThemedText>
                    {node.researched ? (
                      <ThemedText style={styles.researchedBadge}>✓</ThemedText>
                    ) : !node.unlocked ? (
                      <ThemedText style={styles.lockedBadge}>🔒</ThemedText>
                    ) : (
                      <ThemedText style={styles.costBadge}>🔬 {node.cost}</ThemedText>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Selected Node Details */}
        {selectedNode && (
          <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
              <ThemedText style={styles.detailsIcon}>{selectedNode.icon}</ThemedText>
              <View style={styles.detailsInfo}>
                <ThemedText style={styles.detailsName}>{selectedNode.name}</ThemedText>
                <ThemedText style={styles.detailsDesc}>{selectedNode.description}</ThemedText>
              </View>
            </View>
            <View style={styles.effectBox}>
              <ThemedText style={styles.effectLabel}>Effetto:</ThemedText>
              <ThemedText style={styles.effectValue}>{selectedNode.effect}</ThemedText>
            </View>
            {!selectedNode.researched && selectedNode.unlocked && (
              <Pressable
                style={[styles.researchButton, !canResearch(selectedNode) && styles.researchButtonDisabled]}
                onPress={() => handleResearch(selectedNode.id)}
                disabled={!canResearch(selectedNode)}
              >
                <ThemedText style={styles.researchButtonText}>
                  {canResearch(selectedNode) ? `Ricerca (🔬 ${selectedNode.cost})` : 'Punti insufficienti'}
                </ThemedText>
              </Pressable>
            )}
            {selectedNode.researched && (
              <ThemedText style={styles.alreadyResearched}>✓ Già ricercato</ThemedText>
            )}
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  pointsDisplay: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pointsIcon: { fontSize: 20, marginRight: 4 },
  pointsText: { color: '#22d3ee', fontSize: 16, fontWeight: 'bold' },
  logo: { width: 200, height: 80, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a7f3d0', textAlign: 'center', marginBottom: 24 },
  treeContainer: { gap: 20, marginBottom: 24 },
  tierRow: { gap: 8 },
  tierLabel: { color: '#a7f3d0', fontSize: 14, fontWeight: 'bold' },
  nodesRow: { flexDirection: 'row', gap: 12, justifyContent: 'center' },
  nodeCard: { width: (Dimensions.get('window').width - 64) / 2, backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 12, padding: 12, alignItems: 'center' },
  researchedNode: { backgroundColor: '#dcfce7', borderWidth: 2, borderColor: '#22c55e' },
  lockedNode: { opacity: 0.5 },
  selectedNode: { borderWidth: 3, borderColor: '#3b82f6' },
  nodeIcon: { fontSize: 32, marginBottom: 4 },
  nodeName: { fontSize: 12, fontWeight: 'bold', color: '#166534', textAlign: 'center' },
  researchedBadge: { color: '#22c55e', fontSize: 16, marginTop: 4 },
  lockedBadge: { fontSize: 16, marginTop: 4 },
  costBadge: { color: '#6b7280', fontSize: 10, marginTop: 4 },
  detailsCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16 },
  detailsHeader: { flexDirection: 'row', marginBottom: 12 },
  detailsIcon: { fontSize: 48, marginRight: 12 },
  detailsInfo: { flex: 1 },
  detailsName: { fontSize: 20, fontWeight: 'bold', color: '#166534' },
  detailsDesc: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  effectBox: { backgroundColor: '#f3f4f6', borderRadius: 8, padding: 12, marginBottom: 12 },
  effectLabel: { fontSize: 12, color: '#6b7280' },
  effectValue: { fontSize: 16, fontWeight: 'bold', color: '#166534' },
  researchButton: { backgroundColor: '#3b82f6', borderRadius: 12, padding: 14, alignItems: 'center' },
  researchButtonDisabled: { backgroundColor: '#9ca3af' },
  researchButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  alreadyResearched: { color: '#22c55e', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});
