/**
 * Genetic Preview Component
 * 
 * Shows predicted genetic outcomes before breeding:
 * - Trait inheritance probabilities
 * - Expected genetic ranges
 * - Rarity prediction
 * - Trait distribution graph
 * - Bonus/malus indicators for specific combinations
 */

import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  withRepeat,
  Easing 
} from 'react-native-reanimated';
import { GeneticTraits, HybridPlant } from '@/hooks/use-hybrid-storage';

const { width } = Dimensions.get('window');

// Trait labels in Italian
const TRAIT_LABELS: Record<keyof GeneticTraits, string> = {
  thc: 'THC',
  cbd: 'CBD',
  yield: 'Resa',
  flowerTime: 'Fioritura',
  resistance: 'Resistenza',
  growth: 'Crescita',
  potency: 'Potenza',
  terpenes: 'Terpeni',
};

// Trait colors
const TRAIT_COLORS: Record<string, string> = {
  thc: '#a855f7',
  cbd: '#22c55e',
  yield: '#f59e0b',
  flowerTime: '#3b82f6',
  resistance: '#ef4444',
  growth: '#10b981',
  potency: '#ec4899',
};

// Rarity colors and thresholds
const RARITY_CONFIG = {
  legendary: { color: '#f59e0b', threshold: 85, label: 'Leggendaria' },
  epic: { color: '#a855f7', threshold: 70, label: 'Epica' },
  rare: { color: '#3b82f6', threshold: 55, label: 'Rara' },
  common: { color: '#9ca3af', threshold: 0, label: 'Comune' },
};

// Bonus combinations
const BONUS_COMBINATIONS: Array<{
  trait1: keyof GeneticTraits;
  trait2: keyof GeneticTraits;
  bonus: number;
  description: string;
}> = [
  { trait1: 'thc', trait2: 'potency', bonus: 5, description: 'Sinergia THC-Potenza' },
  { trait1: 'cbd', trait2: 'resistance', bonus: 5, description: 'Sinergia CBD-Resistenza' },
  { trait1: 'yield', trait2: 'growth', bonus: 5, description: 'Sinergia Resa-Crescita' },
  { trait1: 'resistance', trait2: 'growth', bonus: 3, description: 'Pianta Robusta' },
];

interface GeneticPreviewProps {
  parent1: {
    name: string;
    genetics: GeneticTraits;
    rarity?: HybridPlant['rarity'];
  } | null;
  parent2: {
    name: string;
    genetics: GeneticTraits;
    rarity?: HybridPlant['rarity'];
  } | null;
  showDetails?: boolean;
}

// Calculate predicted genetics
function calculatePrediction(g1: GeneticTraits, g2: GeneticTraits) {
  const traits: (keyof GeneticTraits)[] = ['thc', 'cbd', 'yield', 'flowerTime', 'resistance', 'growth', 'potency'];
  
  const predictions: Record<string, { min: number; max: number; expected: number; variance: number }> = {};
  
  traits.forEach(trait => {
    const v1 = g1[trait] as number;
    const v2 = g2[trait] as number;
    
    const expected = (v1 + v2) / 2;
    const variance = Math.abs(v1 - v2) / 4 + 10; // Base variance + difference factor
    
    predictions[trait] = {
      min: Math.max(0, Math.round(expected - variance)),
      max: Math.min(100, Math.round(expected + variance)),
      expected: Math.round(expected),
      variance: Math.round(variance),
    };
  });
  
  return predictions;
}

// Calculate rarity probability
function calculateRarityProbabilities(predictions: Record<string, { expected: number; variance: number }>) {
  const avgExpected = Object.values(predictions).reduce((sum, p) => sum + p.expected, 0) / 7;
  const avgVariance = Object.values(predictions).reduce((sum, p) => sum + p.variance, 0) / 7;
  
  // Simplified probability calculation
  const legendaryChance = Math.max(0, Math.min(100, (avgExpected - 75) * 3 + avgVariance * 0.5));
  const epicChance = Math.max(0, Math.min(100 - legendaryChance, (avgExpected - 60) * 3));
  const rareChance = Math.max(0, Math.min(100 - legendaryChance - epicChance, (avgExpected - 45) * 3));
  const commonChance = 100 - legendaryChance - epicChance - rareChance;
  
  return {
    legendary: Math.round(legendaryChance),
    epic: Math.round(epicChance),
    rare: Math.round(rareChance),
    common: Math.round(commonChance),
  };
}

// Check for bonus combinations
function checkBonuses(g1: GeneticTraits, g2: GeneticTraits) {
  const bonuses: Array<{ description: string; bonus: number }> = [];
  
  BONUS_COMBINATIONS.forEach(combo => {
    const avg1 = ((g1[combo.trait1] as number) + (g2[combo.trait1] as number)) / 2;
    const avg2 = ((g1[combo.trait2] as number) + (g2[combo.trait2] as number)) / 2;
    
    if (avg1 >= 70 && avg2 >= 70) {
      bonuses.push({ description: combo.description, bonus: combo.bonus });
    }
  });
  
  return bonuses;
}

// Trait Range Bar Component
function TraitRangeBar({ 
  trait, 
  prediction, 
  parent1Value, 
  parent2Value 
}: { 
  trait: string;
  prediction: { min: number; max: number; expected: number };
  parent1Value: number;
  parent2Value: number;
}) {
  const rangeWidth = prediction.max - prediction.min;
  const expectedPosition = (prediction.expected / 100) * 100;
  
  return (
    <View style={styles.traitRow}>
      <ThemedText style={styles.traitLabel}>{TRAIT_LABELS[trait as keyof GeneticTraits]}</ThemedText>
      
      <View style={styles.traitBarContainer}>
        {/* Background */}
        <View style={styles.traitBarBg} />
        
        {/* Range indicator */}
        <View 
          style={[
            styles.traitRange, 
            { 
              left: `${prediction.min}%`, 
              width: `${rangeWidth}%`,
              backgroundColor: TRAIT_COLORS[trait] + '40',
            }
          ]} 
        />
        
        {/* Parent 1 marker */}
        <View 
          style={[
            styles.parentMarker, 
            { left: `${parent1Value}%`, backgroundColor: '#22c55e' }
          ]} 
        />
        
        {/* Parent 2 marker */}
        <View 
          style={[
            styles.parentMarker, 
            { left: `${parent2Value}%`, backgroundColor: '#3b82f6' }
          ]} 
        />
        
        {/* Expected value marker */}
        <View 
          style={[
            styles.expectedMarker, 
            { left: `${expectedPosition}%`, backgroundColor: TRAIT_COLORS[trait] }
          ]} 
        />
      </View>
      
      <View style={styles.traitValues}>
        <ThemedText style={styles.rangeText}>{prediction.min}-{prediction.max}</ThemedText>
        <ThemedText style={[styles.expectedText, { color: TRAIT_COLORS[trait] }]}>
          ~{prediction.expected}
        </ThemedText>
      </View>
    </View>
  );
}

// Rarity Probability Bar
function RarityProbabilityBar({ probabilities }: { probabilities: Record<string, number> }) {
  return (
    <View style={styles.rarityContainer}>
      <ThemedText style={styles.sectionTitle}>Probabilità Rarità</ThemedText>
      
      <View style={styles.rarityBarContainer}>
        {probabilities.legendary > 0 && (
          <View 
            style={[
              styles.raritySegment, 
              { width: `${probabilities.legendary}%`, backgroundColor: RARITY_CONFIG.legendary.color }
            ]} 
          />
        )}
        {probabilities.epic > 0 && (
          <View 
            style={[
              styles.raritySegment, 
              { width: `${probabilities.epic}%`, backgroundColor: RARITY_CONFIG.epic.color }
            ]} 
          />
        )}
        {probabilities.rare > 0 && (
          <View 
            style={[
              styles.raritySegment, 
              { width: `${probabilities.rare}%`, backgroundColor: RARITY_CONFIG.rare.color }
            ]} 
          />
        )}
        {probabilities.common > 0 && (
          <View 
            style={[
              styles.raritySegment, 
              { width: `${probabilities.common}%`, backgroundColor: RARITY_CONFIG.common.color }
            ]} 
          />
        )}
      </View>
      
      <View style={styles.rarityLegend}>
        {Object.entries(probabilities).map(([rarity, prob]) => (
          prob > 0 && (
            <View key={rarity} style={styles.rarityLegendItem}>
              <View 
                style={[
                  styles.rarityDot, 
                  { backgroundColor: RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG].color }
                ]} 
              />
              <ThemedText style={styles.rarityLegendText}>
                {RARITY_CONFIG[rarity as keyof typeof RARITY_CONFIG].label}: {prob}%
              </ThemedText>
            </View>
          )
        ))}
      </View>
    </View>
  );
}

// Bonus Indicator
function BonusIndicator({ bonuses }: { bonuses: Array<{ description: string; bonus: number }> }) {
  if (bonuses.length === 0) return null;
  
  return (
    <View style={styles.bonusContainer}>
      <ThemedText style={styles.sectionTitle}>Bonus Attivi</ThemedText>
      {bonuses.map((bonus, index) => (
        <View key={index} style={styles.bonusItem}>
          <ThemedText style={styles.bonusIcon}>✨</ThemedText>
          <ThemedText style={styles.bonusText}>{bonus.description}</ThemedText>
          <ThemedText style={styles.bonusValue}>+{bonus.bonus}%</ThemedText>
        </View>
      ))}
    </View>
  );
}

// Main Component
export function GeneticPreview({ parent1, parent2, showDetails = true }: GeneticPreviewProps) {
  // Calculate predictions
  const { predictions, rarityProbabilities, bonuses } = useMemo(() => {
    if (!parent1 || !parent2) {
      return { predictions: null, rarityProbabilities: null, bonuses: [] };
    }
    
    const preds = calculatePrediction(parent1.genetics, parent2.genetics);
    const rarityProbs = calculateRarityProbabilities(preds);
    const bons = checkBonuses(parent1.genetics, parent2.genetics);
    
    return { predictions: preds, rarityProbabilities: rarityProbs, bonuses: bons };
  }, [parent1, parent2]);

  // Not enough parents selected
  if (!parent1 || !parent2 || !predictions || !rarityProbabilities) {
    return (
      <View style={styles.emptyContainer}>
        <ThemedText style={styles.emptyText}>
          Seleziona entrambi i genitori per vedere la preview genetica
        </ThemedText>
      </View>
    );
  }

  const traits: (keyof GeneticTraits)[] = ['thc', 'cbd', 'yield', 'resistance', 'growth', 'potency'];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['rgba(255,255,255,0.95)', 'rgba(255,255,255,0.9)']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText style={styles.title}>Preview Genetica</ThemedText>
          <View style={styles.parentNames}>
            <View style={styles.parentBadge}>
              <View style={[styles.parentDot, { backgroundColor: '#22c55e' }]} />
              <ThemedText style={styles.parentName} numberOfLines={1}>
                {parent1.name}
              </ThemedText>
            </View>
            <ThemedText style={styles.crossSymbol}>×</ThemedText>
            <View style={styles.parentBadge}>
              <View style={[styles.parentDot, { backgroundColor: '#3b82f6' }]} />
              <ThemedText style={styles.parentName} numberOfLines={1}>
                {parent2.name}
              </ThemedText>
            </View>
          </View>
        </View>

        {/* Trait Predictions */}
        {showDetails && (
          <View style={styles.traitsContainer}>
            <ThemedText style={styles.sectionTitle}>Range Genetico Previsto</ThemedText>
            {traits.map(trait => (
              <TraitRangeBar
                key={trait}
                trait={trait}
                prediction={predictions[trait]}
                parent1Value={parent1.genetics[trait] as number}
                parent2Value={parent2.genetics[trait] as number}
              />
            ))}
          </View>
        )}

        {/* Rarity Probabilities */}
        <RarityProbabilityBar probabilities={rarityProbabilities} />

        {/* Bonuses */}
        <BonusIndicator bonuses={bonuses} />

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>THC Atteso</ThemedText>
            <ThemedText style={[styles.summaryValue, { color: TRAIT_COLORS.thc }]}>
              ~{predictions.thc.expected}%
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>CBD Atteso</ThemedText>
            <ThemedText style={[styles.summaryValue, { color: TRAIT_COLORS.cbd }]}>
              ~{predictions.cbd.expected}%
            </ThemedText>
          </View>
          <View style={styles.summaryItem}>
            <ThemedText style={styles.summaryLabel}>Resa Attesa</ThemedText>
            <ThemedText style={[styles.summaryValue, { color: TRAIT_COLORS.yield }]}>
              ~{predictions.yield.expected}%
            </ThemedText>
          </View>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  gradient: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#166534',
    textAlign: 'center',
    marginBottom: 8,
  },
  parentNames: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  parentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    maxWidth: (width - 80) / 2,
  },
  parentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  parentName: {
    fontSize: 12,
    color: '#374151',
  },
  crossSymbol: {
    fontSize: 16,
    color: '#9ca3af',
    marginHorizontal: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  traitsContainer: {
    marginBottom: 16,
  },
  traitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  traitLabel: {
    width: 70,
    fontSize: 11,
    color: '#6b7280',
    fontWeight: '500',
  },
  traitBarContainer: {
    flex: 1,
    height: 16,
    position: 'relative',
    marginHorizontal: 8,
  },
  traitBarBg: {
    position: 'absolute',
    top: 6,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#e5e7eb',
    borderRadius: 2,
  },
  traitRange: {
    position: 'absolute',
    top: 4,
    height: 8,
    borderRadius: 4,
  },
  parentMarker: {
    position: 'absolute',
    top: 2,
    width: 4,
    height: 12,
    borderRadius: 2,
    marginLeft: -2,
  },
  expectedMarker: {
    position: 'absolute',
    top: 0,
    width: 8,
    height: 16,
    borderRadius: 4,
    marginLeft: -4,
    borderWidth: 2,
    borderColor: '#fff',
  },
  traitValues: {
    width: 60,
    alignItems: 'flex-end',
  },
  rangeText: {
    fontSize: 9,
    color: '#9ca3af',
  },
  expectedText: {
    fontSize: 11,
    fontWeight: '600',
  },
  rarityContainer: {
    marginBottom: 16,
  },
  rarityBarContainer: {
    flexDirection: 'row',
    height: 24,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
  },
  raritySegment: {
    height: '100%',
  },
  rarityLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 8,
  },
  rarityLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rarityDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 4,
  },
  rarityLegendText: {
    fontSize: 11,
    color: '#6b7280',
  },
  bonusContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  bonusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  bonusIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  bonusText: {
    flex: 1,
    fontSize: 12,
    color: '#166534',
  },
  bonusValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#9ca3af',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
  },
});

export default GeneticPreview;
