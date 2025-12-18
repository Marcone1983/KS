import React, { useState, useCallback, useEffect, Suspense } from 'react';
import { View, StyleSheet, Pressable, Dimensions, ActivityIndicator } from 'react-native';
import { Canvas } from '@react-three/fiber/native';
import { useGLTF, Environment } from '@react-three/drei/native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, useAnimatedStyle, withSpring, withSequence, withTiming, runOnJS } from 'react-native-reanimated';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useBossBattle } from '@/hooks/use-boss-battle';
import { useComboSystem } from '@/hooks/use-combo-system';
import { usePowerUps } from '@/hooks/use-powerups';
import { useSounds } from '@/hooks/use-sounds';
import * as THREE from 'three';

const { width, height } = Dimensions.get('window');

// Boss 3D Model Component
function Boss3D({ bossId, health, maxHealth, isAttacking, phase }: { bossId: string; health: number; maxHealth: number; isAttacking: boolean; phase: number }) {
  const healthPercent = health / maxHealth;
  const scale = 1 + (phase * 0.1);
  const color = healthPercent > 0.6 ? '#22c55e' : healthPercent > 0.3 ? '#f97316' : '#ef4444';

  return (
    <group position={[0, 0, 0]} scale={[scale, scale, scale]}>
      {/* Boss Body */}
      <mesh position={[0, 1, 0]}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
      </mesh>
      
      {/* Boss Head */}
      <mesh position={[0, 2, 0]}>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
      </mesh>
      
      {/* Eyes */}
      <mesh position={[-0.2, 2.1, 0.4]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={isAttacking ? 2 : 0.5} />
      </mesh>
      <mesh position={[0.2, 2.1, 0.4]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={isAttacking ? 2 : 0.5} />
      </mesh>
      
      {/* Legs */}
      {[-0.4, 0.4].map((x, i) => (
        <mesh key={i} position={[x, 0.3, 0]}>
          <cylinderGeometry args={[0.15, 0.1, 0.6, 16]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      ))}
      
      {/* Attack indicator */}
      {isAttacking && (
        <mesh position={[0, 1, 1]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#ff0000" emissive="#ff0000" emissiveIntensity={3} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
}

// Arena Environment
function Arena3D() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]}>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.8} />
      </mesh>
      
      {/* Arena walls */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((rotation, i) => (
        <mesh key={i} position={[Math.sin(rotation) * 8, 2, Math.cos(rotation) * 8]} rotation={[0, rotation, 0]}>
          <boxGeometry args={[16, 5, 0.5]} />
          <meshStandardMaterial color="#2d2d44" roughness={0.6} metalness={0.2} />
        </mesh>
      ))}
      
      {/* Ambient particles */}
      {Array.from({ length: 50 }).map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 15, Math.random() * 4, (Math.random() - 0.5) * 15]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#6366f1" emissive="#6366f1" emissiveIntensity={2} />
        </mesh>
      ))}
    </group>
  );
}

// Health Bar Component
function HealthBar({ current, max, label, color }: { current: number; max: number; label: string; color: string }) {
  const percent = Math.max(0, Math.min(100, (current / max) * 100));
  
  return (
    <View style={styles.healthBarContainer}>
      <ThemedText style={styles.healthLabel}>{label}</ThemedText>
      <View style={styles.healthBarBg}>
        <Animated.View style={[styles.healthBarFill, { width: `${percent}%`, backgroundColor: color }]} />
      </View>
      <ThemedText style={styles.healthText}>{Math.floor(current)} / {max}</ThemedText>
    </View>
  );
}

// Combo Display
function ComboDisplay({ count, tier, multiplier }: { count: number; tier: string; multiplier: number }) {
  const scale = useSharedValue(1);
  
  useEffect(() => {
    if (count > 0) {
      scale.value = withSequence(
        withSpring(1.3, { damping: 5 }),
        withSpring(1, { damping: 10 })
      );
    }
  }, [count]);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  
  if (count === 0) return null;
  
  const tierColors: Record<string, string> = {
    none: '#ffffff',
    good: '#22c55e',
    great: '#3b82f6',
    excellent: '#a855f7',
    perfect: '#f97316',
    legendary: '#fbbf24',
  };
  
  return (
    <Animated.View style={[styles.comboContainer, animatedStyle]}>
      <ThemedText style={[styles.comboCount, { color: tierColors[tier] || '#ffffff' }]}>
        {count}x COMBO
      </ThemedText>
      <ThemedText style={[styles.comboMultiplier, { color: tierColors[tier] || '#ffffff' }]}>
        {multiplier.toFixed(1)}x Damage
      </ThemedText>
      {tier !== 'none' && (
        <ThemedText style={[styles.comboTier, { color: tierColors[tier] }]}>
          {tier.toUpperCase()}!
        </ThemedText>
      )}
    </Animated.View>
  );
}

// Power-up Display
function PowerUpSlot({ powerUp, remainingTime }: { powerUp: any; remainingTime: number }) {
  const percent = (remainingTime / powerUp.duration) * 100;
  
  return (
    <View style={styles.powerUpSlot}>
      <ThemedText style={styles.powerUpIcon}>{powerUp.icon}</ThemedText>
      <View style={styles.powerUpTimerBg}>
        <View style={[styles.powerUpTimerFill, { width: `${percent}%` }]} />
      </View>
    </View>
  );
}

export default function BossArenaScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bossId: string }>();
  const insets = useSafeAreaInsets();
  const { play } = useSounds();
  
  const { state: battleState, startBattle, dealDamage, takeDamage, pauseBattle, endBattle, getAvailableBosses } = useBossBattle();
  const { state: comboState, registerHit, resetCombo, getStats } = useComboSystem();
  const { activePowerUps, collectPowerUp, getEffectValue, hasEffect } = usePowerUps();
  
  const [showResults, setShowResults] = useState(false);
  const [battleResult, setBattleResult] = useState<'victory' | 'defeat' | null>(null);
  
  // Start battle on mount
  useEffect(() => {
    const bossId = params.bossId || 'locust_king';
    startBattle(bossId);
    play('trans_enter_game');
  }, [params.bossId]);
  
  // Handle spray attack
  const handleAttack = useCallback(() => {
    if (!battleState.isActive || battleState.isPaused) return;
    
    const baseDamage = 10;
    const damageBoost = getEffectValue('damage');
    const boostedDamage = baseDamage * (1 + damageBoost / 100);
    
    const { damage, isCritical } = registerHit(boostedDamage, false);
    dealDamage(damage, isCritical);
    
    play('spray_hit_leaf_1' as any);
  }, [battleState, getEffectValue, registerHit, dealDamage, play]);
  
  // Check for battle end
  useEffect(() => {
    if (battleState.bossHealth <= 0 && battleState.isActive) {
      setBattleResult('victory');
      setShowResults(true);
      play('prog_challenge_complete' as any);
    } else if (battleState.playerHealth <= 0 && battleState.isActive) {
      setBattleResult('defeat');
      setShowResults(true);
      play('prog_challenge_fail' as any);
    }
  }, [battleState.bossHealth, battleState.playerHealth, battleState.isActive, play]);
  
  const handleExit = useCallback(() => {
    endBattle(false);
    router.back();
  }, [endBattle, router]);
  
  const handleRetry = useCallback(() => {
    setShowResults(false);
    setBattleResult(null);
    resetCombo();
    startBattle(params.bossId || 'locust_king');
  }, [resetCombo, startBattle, params.bossId]);
  
  if (!battleState.boss) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
        <ThemedText>Caricamento Boss Arena...</ThemedText>
      </ThemedView>
    );
  }
  
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* 3D Arena */}
      <View style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 3, 8], fov: 60 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={1} color="#ffffff" />
          <pointLight position={[-10, 5, -10]} intensity={0.5} color="#6366f1" />
          <spotLight position={[0, 10, 0]} angle={0.5} penumbra={0.5} intensity={1} color="#ff6b6b" />
          
          <Suspense fallback={null}>
            <Arena3D />
            <Boss3D 
              bossId={battleState.boss.id}
              health={battleState.bossHealth}
              maxHealth={battleState.boss.maxHealth}
              isAttacking={battleState.currentAttack !== null}
              phase={battleState.currentPhase}
            />
          </Suspense>
        </Canvas>
      </View>
      
      {/* HUD Overlay */}
      <View style={styles.hudOverlay}>
        {/* Top HUD */}
        <View style={styles.topHud}>
          <Pressable onPress={handleExit} style={styles.exitButton}>
            <ThemedText style={styles.exitButtonText}>✕</ThemedText>
          </Pressable>
          
          <View style={styles.bossInfo}>
            <ThemedText style={styles.bossName}>{battleState.boss.name}</ThemedText>
            <ThemedText style={styles.bossPhase}>Fase {battleState.currentPhase + 1}</ThemedText>
          </View>
          
          <Pressable onPress={pauseBattle} style={styles.pauseButton}>
            <ThemedText style={styles.pauseButtonText}>{battleState.isPaused ? '▶' : '⏸'}</ThemedText>
          </Pressable>
        </View>
        
        {/* Health Bars */}
        <View style={styles.healthBars}>
          <HealthBar 
            current={battleState.bossHealth} 
            max={battleState.boss.maxHealth} 
            label="BOSS" 
            color="#ef4444" 
          />
          <HealthBar 
            current={battleState.playerHealth} 
            max={battleState.playerMaxHealth} 
            label="TU" 
            color="#22c55e" 
          />
        </View>
        
        {/* Combo Display */}
        <ComboDisplay 
          count={comboState.count} 
          tier={comboState.comboTier} 
          multiplier={comboState.multiplier} 
        />
        
        {/* Active Power-ups */}
        <View style={styles.powerUpsContainer}>
          {activePowerUps.map((ap) => (
            <PowerUpSlot key={ap.powerUp.id} powerUp={ap.powerUp} remainingTime={ap.remainingTime} />
          ))}
        </View>
        
        {/* Score */}
        <View style={styles.scoreContainer}>
          <ThemedText style={styles.scoreLabel}>SCORE</ThemedText>
          <ThemedText style={styles.scoreValue}>{battleState.score.toLocaleString()}</ThemedText>
        </View>
        
        {/* Attack Button */}
        <View style={[styles.attackArea, { paddingBottom: insets.bottom + 20 }]}>
          <Pressable 
            onPress={handleAttack} 
            style={({ pressed }) => [
              styles.attackButton,
              pressed && styles.attackButtonPressed,
              battleState.isPaused && styles.attackButtonDisabled,
            ]}
            disabled={battleState.isPaused}
          >
            <ThemedText style={styles.attackButtonText}>🎯 SPRAY</ThemedText>
          </Pressable>
        </View>
      </View>
      
      {/* Results Modal */}
      {showResults && (
        <View style={styles.resultsOverlay}>
          <View style={styles.resultsModal}>
            <ThemedText style={[styles.resultTitle, { color: battleResult === 'victory' ? '#22c55e' : '#ef4444' }]}>
              {battleResult === 'victory' ? '🏆 VITTORIA!' : '💀 SCONFITTA'}
            </ThemedText>
            
            <View style={styles.statsContainer}>
              <View style={styles.statRow}>
                <ThemedText style={styles.statLabel}>Score</ThemedText>
                <ThemedText style={styles.statValue}>{battleState.score.toLocaleString()}</ThemedText>
              </View>
              <View style={styles.statRow}>
                <ThemedText style={styles.statLabel}>Max Combo</ThemedText>
                <ThemedText style={styles.statValue}>{comboState.maxCombo}x</ThemedText>
              </View>
              <View style={styles.statRow}>
                <ThemedText style={styles.statLabel}>Colpi Critici</ThemedText>
                <ThemedText style={styles.statValue}>{comboState.criticalHits}</ThemedText>
              </View>
              {battleResult === 'victory' && battleState.boss?.rewards && (
                <>
                  <View style={styles.statRow}>
                    <ThemedText style={styles.statLabel}>Monete</ThemedText>
                    <ThemedText style={[styles.statValue, { color: '#fbbf24' }]}>+{battleState.boss.rewards.coins}</ThemedText>
                  </View>
                  <View style={styles.statRow}>
                    <ThemedText style={styles.statLabel}>XP</ThemedText>
                    <ThemedText style={[styles.statValue, { color: '#22c55e' }]}>+{battleState.boss.rewards.xp}</ThemedText>
                  </View>
                </>
              )}
            </View>
            
            <View style={styles.resultButtons}>
              <Pressable onPress={handleRetry} style={styles.retryButton}>
                <ThemedText style={styles.retryButtonText}>🔄 Riprova</ThemedText>
              </Pressable>
              <Pressable onPress={handleExit} style={styles.exitResultButton}>
                <ThemedText style={styles.exitResultButtonText}>🏠 Esci</ThemedText>
              </Pressable>
            </View>
          </View>
        </View>
      )}
      
      {/* Pause Overlay */}
      {battleState.isPaused && !showResults && (
        <View style={styles.pauseOverlay}>
          <ThemedText style={styles.pauseText}>⏸ PAUSA</ThemedText>
          <Pressable onPress={pauseBattle} style={styles.resumeButton}>
            <ThemedText style={styles.resumeButtonText}>▶ Riprendi</ThemedText>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16 },
  canvasContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  hudOverlay: { flex: 1, justifyContent: 'space-between' },
  topHud: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  exitButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  exitButtonText: { fontSize: 20, color: '#fff' },
  bossInfo: { alignItems: 'center' },
  bossName: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  bossPhase: { fontSize: 14, color: '#a1a1aa' },
  pauseButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  pauseButtonText: { fontSize: 18, color: '#fff' },
  healthBars: { padding: 16, gap: 8 },
  healthBarContainer: { gap: 4 },
  healthLabel: { fontSize: 12, fontWeight: 'bold', color: '#a1a1aa' },
  healthBarBg: { height: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 6, overflow: 'hidden' },
  healthBarFill: { height: '100%', borderRadius: 6 },
  healthText: { fontSize: 12, color: '#fff', textAlign: 'right' },
  comboContainer: { alignItems: 'center', padding: 16 },
  comboCount: { fontSize: 32, fontWeight: 'bold' },
  comboMultiplier: { fontSize: 16 },
  comboTier: { fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  powerUpsContainer: { flexDirection: 'row', justifyContent: 'center', gap: 8, padding: 16 },
  powerUpSlot: { width: 50, height: 50, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  powerUpIcon: { fontSize: 24 },
  powerUpTimerBg: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, backgroundColor: 'rgba(255,255,255,0.2)', borderBottomLeftRadius: 8, borderBottomRightRadius: 8 },
  powerUpTimerFill: { height: '100%', backgroundColor: '#22c55e', borderBottomLeftRadius: 8 },
  scoreContainer: { alignItems: 'center', padding: 8 },
  scoreLabel: { fontSize: 12, color: '#a1a1aa' },
  scoreValue: { fontSize: 28, fontWeight: 'bold', color: '#fbbf24' },
  attackArea: { padding: 20, alignItems: 'center' },
  attackButton: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center', shadowColor: '#ef4444', shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  attackButtonPressed: { transform: [{ scale: 0.95 }], opacity: 0.9 },
  attackButtonDisabled: { opacity: 0.5 },
  attackButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  resultsOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  resultsModal: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24, width: '100%', maxWidth: 350, alignItems: 'center' },
  resultTitle: { fontSize: 32, fontWeight: 'bold', marginBottom: 20 },
  statsContainer: { width: '100%', gap: 12, marginBottom: 24 },
  statRow: { flexDirection: 'row', justifyContent: 'space-between' },
  statLabel: { fontSize: 16, color: '#a1a1aa' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  resultButtons: { flexDirection: 'row', gap: 12 },
  retryButton: { flex: 1, backgroundColor: '#6366f1', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  retryButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  exitResultButton: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  exitResultButtonText: { fontSize: 16, fontWeight: 'bold', color: '#fff' },
  pauseOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', gap: 20 },
  pauseText: { fontSize: 48, fontWeight: 'bold', color: '#fff' },
  resumeButton: { backgroundColor: '#22c55e', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12 },
  resumeButtonText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
});
