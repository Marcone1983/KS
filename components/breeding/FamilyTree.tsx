/**
 * Family Tree Component
 * 
 * Interactive visual representation of plant lineage:
 * - Tree structure showing parent-child relationships
 * - Zoomable and pannable canvas
 * - Tap nodes for plant details
 * - Color-coded by rarity
 * - Animated connections
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
import { View, StyleSheet, Dimensions, Pressable, ScrollView, Modal } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring,
  withTiming,
  withRepeat,
  Easing,
  interpolate,
  FadeIn,
  FadeOut
} from 'react-native-reanimated';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Svg, { Line, Circle, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';
import { HybridPlant } from '@/hooks/use-hybrid-storage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const RARITY_COLORS = {
  common: '#9ca3af',
  rare: '#3b82f6',
  epic: '#a855f7',
  legendary: '#f59e0b',
};

// Node dimensions
const NODE_WIDTH = 100;
const NODE_HEIGHT = 80;
const HORIZONTAL_SPACING = 140;
const VERTICAL_SPACING = 120;

interface TreeNode {
  id: string;
  name: string;
  rarity: HybridPlant['rarity'];
  color: string;
  generation: number;
  x: number;
  y: number;
  parentIds: string[];
  childIds: string[];
  isBase?: boolean;
  genetics?: {
    thc: number;
    cbd: number;
  };
}

interface FamilyTreeProps {
  hybrids: HybridPlant[];
  baseVarieties?: Array<{
    id: string;
    name: string;
    rarity: HybridPlant['rarity'];
    color: string;
  }>;
  onNodePress?: (nodeId: string) => void;
  selectedNodeId?: string;
}

// Build tree structure from hybrids
function buildTree(
  hybrids: HybridPlant[], 
  baseVarieties: FamilyTreeProps['baseVarieties'] = []
): TreeNode[] {
  const nodes: Map<string, TreeNode> = new Map();
  
  // Add base varieties as root nodes
  baseVarieties.forEach((variety, index) => {
    nodes.set(variety.id, {
      id: variety.id,
      name: variety.name,
      rarity: variety.rarity,
      color: variety.color,
      generation: 0,
      x: 0,
      y: 0,
      parentIds: [],
      childIds: [],
      isBase: true,
    });
  });

  // Add hybrids
  hybrids.forEach(hybrid => {
    nodes.set(hybrid.id, {
      id: hybrid.id,
      name: hybrid.name,
      rarity: hybrid.rarity,
      color: hybrid.color,
      generation: hybrid.generation,
      x: 0,
      y: 0,
      parentIds: [hybrid.parent1Id, hybrid.parent2Id].filter(Boolean),
      childIds: [],
      genetics: {
        thc: hybrid.genetics.thc,
        cbd: hybrid.genetics.cbd,
      },
    });
  });

  // Build child relationships
  nodes.forEach(node => {
    node.parentIds.forEach(parentId => {
      const parent = nodes.get(parentId);
      if (parent && !parent.childIds.includes(node.id)) {
        parent.childIds.push(node.id);
      }
    });
  });

  // Calculate positions - group by generation
  const generations: Map<number, TreeNode[]> = new Map();
  nodes.forEach(node => {
    const gen = node.generation;
    if (!generations.has(gen)) {
      generations.set(gen, []);
    }
    generations.get(gen)!.push(node);
  });

  // Position nodes
  const maxGen = Math.max(...Array.from(generations.keys()));
  generations.forEach((genNodes, gen) => {
    const totalWidth = genNodes.length * HORIZONTAL_SPACING;
    const startX = -totalWidth / 2 + HORIZONTAL_SPACING / 2;
    
    genNodes.forEach((node, index) => {
      node.x = startX + index * HORIZONTAL_SPACING;
      node.y = gen * VERTICAL_SPACING;
    });
  });

  return Array.from(nodes.values());
}

// Tree Node Component
function TreeNodeComponent({ 
  node, 
  selected, 
  onPress,
  scale 
}: { 
  node: TreeNode; 
  selected: boolean; 
  onPress: () => void;
  scale: number;
}) {
  const pulseAnim = useSharedValue(1);

  React.useEffect(() => {
    if (selected) {
      pulseAnim.value = withRepeat(
        withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      pulseAnim.value = withSpring(1);
    }
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const nodeSize = Math.max(NODE_WIDTH * scale, 60);
  const fontSize = Math.max(10 * scale, 8);

  return (
    <Animated.View
      style={[
        styles.treeNode,
        {
          left: node.x - nodeSize / 2,
          top: node.y - NODE_HEIGHT / 2,
          width: nodeSize,
          height: NODE_HEIGHT * scale,
          borderColor: selected ? '#fff' : RARITY_COLORS[node.rarity],
          backgroundColor: node.isBase ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.9)',
        },
        animatedStyle,
      ]}
    >
      <Pressable onPress={onPress} style={styles.nodeContent}>
        <View style={[styles.nodeColorDot, { backgroundColor: node.color }]} />
        <ThemedText style={[styles.nodeName, { fontSize }]} numberOfLines={2}>
          {node.name}
        </ThemedText>
        <View style={[styles.nodeRarityBadge, { backgroundColor: RARITY_COLORS[node.rarity] }]}>
          <ThemedText style={[styles.nodeRarityText, { fontSize: fontSize - 2 }]}>
            {node.isBase ? 'BASE' : `G${node.generation}`}
          </ThemedText>
        </View>
        {node.genetics && (
          <View style={styles.nodeStats}>
            <ThemedText style={[styles.nodeStatText, { fontSize: fontSize - 2 }]}>
              THC {node.genetics.thc}%
            </ThemedText>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

// Connection Lines Component
function ConnectionLines({ 
  nodes, 
  scale,
  offset 
}: { 
  nodes: TreeNode[]; 
  scale: number;
  offset: { x: number; y: number };
}) {
  const connections: Array<{ from: TreeNode; to: TreeNode }> = [];
  
  nodes.forEach(node => {
    node.parentIds.forEach(parentId => {
      const parent = nodes.find(n => n.id === parentId);
      if (parent) {
        connections.push({ from: parent, to: node });
      }
    });
  });

  // Calculate SVG dimensions
  const minX = Math.min(...nodes.map(n => n.x)) - NODE_WIDTH;
  const maxX = Math.max(...nodes.map(n => n.x)) + NODE_WIDTH;
  const minY = Math.min(...nodes.map(n => n.y)) - NODE_HEIGHT;
  const maxY = Math.max(...nodes.map(n => n.y)) + NODE_HEIGHT;
  
  const svgWidth = (maxX - minX) * scale;
  const svgHeight = (maxY - minY) * scale;

  return (
    <Svg
      width={svgWidth}
      height={svgHeight}
      style={{
        position: 'absolute',
        left: minX * scale + offset.x,
        top: minY * scale + offset.y,
      }}
    >
      <Defs>
        <SvgGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <Stop offset="0%" stopColor="#22c55e" stopOpacity="0.8" />
          <Stop offset="100%" stopColor="#16a34a" stopOpacity="0.8" />
        </SvgGradient>
      </Defs>
      
      {connections.map((conn, index) => {
        const x1 = (conn.from.x - minX) * scale;
        const y1 = (conn.from.y - minY + NODE_HEIGHT / 2) * scale;
        const x2 = (conn.to.x - minX) * scale;
        const y2 = (conn.to.y - minY - NODE_HEIGHT / 2) * scale;
        
        return (
          <React.Fragment key={index}>
            {/* Shadow line */}
            <Line
              x1={x1 + 2}
              y1={y1 + 2}
              x2={x2 + 2}
              y2={y2 + 2}
              stroke="rgba(0,0,0,0.2)"
              strokeWidth={3 * scale}
            />
            {/* Main line */}
            <Line
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="url(#lineGradient)"
              strokeWidth={2 * scale}
              strokeLinecap="round"
            />
            {/* Connection dots */}
            <Circle
              cx={x1}
              cy={y1}
              r={4 * scale}
              fill="#22c55e"
            />
            <Circle
              cx={x2}
              cy={y2}
              r={4 * scale}
              fill="#16a34a"
            />
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// Node Detail Panel
function NodeDetailPanel({ 
  node, 
  onClose,
  hybrids 
}: { 
  node: TreeNode | null; 
  onClose: () => void;
  hybrids: HybridPlant[];
}) {
  if (!node) return null;

  const hybrid = hybrids.find(h => h.id === node.id);
  const children = hybrids.filter(h => h.parent1Id === node.id || h.parent2Id === node.id);

  return (
    <Animated.View 
      entering={FadeIn} 
      exiting={FadeOut}
      style={styles.detailPanel}
    >
      <View style={styles.detailHeader}>
        <View style={[styles.detailColorDot, { backgroundColor: node.color }]} />
        <View style={styles.detailHeaderText}>
          <ThemedText style={[styles.detailName, { color: RARITY_COLORS[node.rarity] }]}>
            {node.name}
          </ThemedText>
          <ThemedText style={styles.detailGeneration}>
            {node.isBase ? 'Varietà Base' : `Generazione ${node.generation}`}
          </ThemedText>
        </View>
        <Pressable onPress={onClose} style={styles.detailClose}>
          <ThemedText style={styles.detailCloseText}>✕</ThemedText>
        </Pressable>
      </View>

      {hybrid && (
        <>
          <View style={styles.detailSection}>
            <ThemedText style={styles.detailSectionTitle}>Genetica</ThemedText>
            <View style={styles.detailStats}>
              <View style={styles.detailStat}>
                <ThemedText style={styles.detailStatValue}>{hybrid.genetics.thc}%</ThemedText>
                <ThemedText style={styles.detailStatLabel}>THC</ThemedText>
              </View>
              <View style={styles.detailStat}>
                <ThemedText style={styles.detailStatValue}>{hybrid.genetics.cbd}%</ThemedText>
                <ThemedText style={styles.detailStatLabel}>CBD</ThemedText>
              </View>
              <View style={styles.detailStat}>
                <ThemedText style={styles.detailStatValue}>{hybrid.genetics.yield}%</ThemedText>
                <ThemedText style={styles.detailStatLabel}>Resa</ThemedText>
              </View>
              <View style={styles.detailStat}>
                <ThemedText style={styles.detailStatValue}>{hybrid.genetics.potency}%</ThemedText>
                <ThemedText style={styles.detailStatLabel}>Potenza</ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.detailSection}>
            <ThemedText style={styles.detailSectionTitle}>Genitori</ThemedText>
            <ThemedText style={styles.detailParents}>
              {hybrid.parent1Name} × {hybrid.parent2Name}
            </ThemedText>
          </View>
        </>
      )}

      {children.length > 0 && (
        <View style={styles.detailSection}>
          <ThemedText style={styles.detailSectionTitle}>Discendenti ({children.length})</ThemedText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {children.map(child => (
              <View key={child.id} style={styles.childBadge}>
                <View style={[styles.childDot, { backgroundColor: child.color }]} />
                <ThemedText style={styles.childName}>{child.name}</ThemedText>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </Animated.View>
  );
}

// Main Family Tree Component
export function FamilyTree({ 
  hybrids, 
  baseVarieties = [],
  onNodePress,
  selectedNodeId 
}: FamilyTreeProps) {
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedScale = useSharedValue(1);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  // Build tree structure
  const nodes = useMemo(() => buildTree(hybrids, baseVarieties), [hybrids, baseVarieties]);

  // Calculate tree bounds
  const bounds = useMemo(() => {
    if (nodes.length === 0) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };
    
    const minX = Math.min(...nodes.map(n => n.x)) - NODE_WIDTH;
    const maxX = Math.max(...nodes.map(n => n.x)) + NODE_WIDTH;
    const minY = Math.min(...nodes.map(n => n.y)) - NODE_HEIGHT;
    const maxY = Math.max(...nodes.map(n => n.y)) + NODE_HEIGHT;
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, [nodes]);

  // Pinch gesture for zoom
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(2, savedScale.value * e.scale));
    })
    .onEnd(() => {
      savedScale.value = scale.value;
    });

  // Pan gesture for movement
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateX.value = savedTranslateX.value + e.translationX;
      translateY.value = savedTranslateY.value + e.translationY;
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const composedGesture = Gesture.Simultaneous(pinchGesture, panGesture);

  const animatedContainerStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ] as const,
    };
  });

  const handleNodePress = useCallback((node: TreeNode) => {
    setSelectedNode(node);
    onNodePress?.(node.id);
  }, [onNodePress]);

  const handleResetView = () => {
    scale.value = withSpring(1);
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    savedScale.value = 1;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  };

  if (nodes.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>Nessun albero genealogico disponibile</ThemedText>
        <ThemedText style={styles.emptySubtext}>Crea ibridi per vedere la loro discendenza</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: RARITY_COLORS.common }]} />
          <ThemedText style={styles.legendText}>Common</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: RARITY_COLORS.rare }]} />
          <ThemedText style={styles.legendText}>Rare</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: RARITY_COLORS.epic }]} />
          <ThemedText style={styles.legendText}>Epic</ThemedText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: RARITY_COLORS.legendary }]} />
          <ThemedText style={styles.legendText}>Legendary</ThemedText>
        </View>
      </View>

      {/* Tree Canvas */}
      <GestureHandlerRootView style={styles.canvasContainer}>
        <GestureDetector gesture={composedGesture}>
          <Animated.View 
            style={[
              styles.canvas,
              {
                width: bounds.width + SCREEN_WIDTH,
                height: bounds.height + SCREEN_HEIGHT / 2,
              },
              animatedContainerStyle,
            ]}
          >
            {/* Connection Lines */}
            <ConnectionLines 
              nodes={nodes} 
              scale={1}
              offset={{ x: SCREEN_WIDTH / 2, y: 100 }}
            />
            
            {/* Tree Nodes */}
            {nodes.map(node => (
              <TreeNodeComponent
                key={node.id}
                node={{
                  ...node,
                  x: node.x + SCREEN_WIDTH / 2,
                  y: node.y + 100,
                }}
                selected={selectedNode?.id === node.id || selectedNodeId === node.id}
                onPress={() => handleNodePress(node)}
                scale={1}
              />
            ))}
          </Animated.View>
        </GestureDetector>
      </GestureHandlerRootView>

      {/* Controls */}
      <View style={styles.controls}>
        <Pressable style={styles.controlButton} onPress={handleResetView}>
          <ThemedText style={styles.controlButtonText}>Reset</ThemedText>
        </Pressable>
        <Pressable 
          style={styles.controlButton} 
          onPress={() => { scale.value = withSpring(Math.min(scale.value + 0.2, 2)); savedScale.value = scale.value; }}
        >
          <ThemedText style={styles.controlButtonText}>+</ThemedText>
        </Pressable>
        <Pressable 
          style={styles.controlButton} 
          onPress={() => { scale.value = withSpring(Math.max(scale.value - 0.2, 0.5)); savedScale.value = scale.value; }}
        >
          <ThemedText style={styles.controlButtonText}>−</ThemedText>
        </Pressable>
      </View>

      {/* Node Detail Panel */}
      <NodeDetailPanel 
        node={selectedNode} 
        onClose={() => setSelectedNode(null)}
        hybrids={hybrids}
      />

      {/* Instructions */}
      <View style={styles.instructions}>
        <ThemedText style={styles.instructionsText}>
          Pizzica per zoom • Trascina per muovere • Tap su nodo per dettagli
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    borderRadius: 16,
    overflow: 'hidden',
  },
  canvasContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    position: 'relative',
  },
  
  // Legend
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#9ca3af',
  },
  
  // Tree Node
  treeNode: {
    position: 'absolute',
    borderRadius: 12,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  nodeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  nodeColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  nodeName: {
    fontWeight: 'bold',
    color: '#166534',
    textAlign: 'center',
  },
  nodeRarityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  nodeRarityText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  nodeStats: {
    marginTop: 2,
  },
  nodeStatText: {
    color: '#6b7280',
  },
  
  // Controls
  controls: {
    position: 'absolute',
    right: 12,
    top: 60,
    gap: 8,
  },
  controlButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(34, 197, 94, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controlButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Detail Panel
  detailPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailColorDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  detailHeaderText: {
    flex: 1,
  },
  detailName: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  detailGeneration: {
    fontSize: 14,
    color: '#6b7280',
  },
  detailClose: {
    padding: 8,
  },
  detailCloseText: {
    fontSize: 20,
    color: '#9ca3af',
  },
  detailSection: {
    marginBottom: 16,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  detailStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailStat: {
    alignItems: 'center',
  },
  detailStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#166534',
  },
  detailStatLabel: {
    fontSize: 11,
    color: '#6b7280',
  },
  detailParents: {
    fontSize: 14,
    color: '#374151',
    backgroundColor: '#f3f4f6',
    padding: 12,
    borderRadius: 8,
  },
  childBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
  },
  childDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  childName: {
    fontSize: 12,
    color: '#374151',
  },
  
  // Instructions
  instructions: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  instructionsText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: '#fff',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default FamilyTree;
