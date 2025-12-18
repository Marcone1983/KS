import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: string;
  level: number;
  maxLevel: number;
  xpRequired: number;
  currentXp: number;
  bonuses: string[];
}

const SKILLS: Skill[] = [
  { id: 'accuracy', name: 'Precisione', description: 'Migliora la mira dello spray', icon: '🎯', level: 5, maxLevel: 20, xpRequired: 1000, currentXp: 750, bonuses: ['+5% precisione per livello'] },
  { id: 'speed', name: 'Velocità', description: 'Aumenta la velocità di movimento', icon: '⚡', level: 3, maxLevel: 15, xpRequired: 800, currentXp: 200, bonuses: ['+3% velocità per livello'] },
  { id: 'endurance', name: 'Resistenza', description: 'Riduce il consumo di stamina', icon: '💪', level: 7, maxLevel: 20, xpRequired: 1200, currentXp: 900, bonuses: ['-2% consumo stamina per livello'] },
  { id: 'knowledge', name: 'Conoscenza', description: 'Bonus XP e scoperte', icon: '📚', level: 2, maxLevel: 10, xpRequired: 600, currentXp: 450, bonuses: ['+10% XP per livello'] },
  { id: 'luck', name: 'Fortuna', description: 'Aumenta drop e critici', icon: '🍀', level: 4, maxLevel: 15, xpRequired: 900, currentXp: 100, bonuses: ['+2% chance critico', '+5% drop rate'] },
  { id: 'crafting', name: 'Artigianato', description: 'Migliora il crafting', icon: '🔨', level: 1, maxLevel: 10, xpRequired: 500, currentXp: 300, bonuses: ['-5% materiali richiesti'] },
];

export default function SkillsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [skills, setSkills] = useState<Skill[]>(SKILLS);
  const [skillPoints, setSkillPoints] = useState(3);

  const totalLevel = skills.reduce((sum, s) => sum + s.level, 0);

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top, 20) + 20, paddingBottom: Math.max(insets.bottom, 20) + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <ThemedText style={styles.backText}>← Indietro</ThemedText>
          </Pressable>
          <View style={styles.pointsDisplay}>
            <ThemedText style={styles.pointsText}>⭐ {skillPoints} punti</ThemedText>
          </View>
        </View>

        <Image source={require('@/assets/images/logo.png')} style={styles.logo} contentFit="contain" />
        <ThemedText style={styles.title}>Skills</ThemedText>
        <ThemedText style={styles.subtitle}>Livello totale: {totalLevel}</ThemedText>

        <View style={styles.skillsList}>
          {skills.map((skill) => (
            <View key={skill.id} style={styles.skillCard}>
              <View style={styles.skillHeader}>
                <ThemedText style={styles.skillIcon}>{skill.icon}</ThemedText>
                <View style={styles.skillInfo}>
                  <ThemedText style={styles.skillName}>{skill.name}</ThemedText>
                  <ThemedText style={styles.skillDesc}>{skill.description}</ThemedText>
                </View>
                <View style={styles.levelBadge}>
                  <ThemedText style={styles.levelText}>Lv.{skill.level}</ThemedText>
                </View>
              </View>
              <View style={styles.xpContainer}>
                <View style={styles.xpBar}>
                  <View style={[styles.xpFill, { width: `${(skill.currentXp / skill.xpRequired) * 100}%` }]} />
                </View>
                <ThemedText style={styles.xpText}>{skill.currentXp}/{skill.xpRequired} XP</ThemedText>
              </View>
              <View style={styles.bonusesList}>
                {skill.bonuses.map((bonus, idx) => (
                  <ThemedText key={idx} style={styles.bonusText}>• {bonus}</ThemedText>
                ))}
              </View>
            </View>
          ))}
        </View>
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
  pointsDisplay: { backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  pointsText: { color: '#fbbf24', fontSize: 14, fontWeight: 'bold' },
  logo: { width: 200, height: 80, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#a7f3d0', textAlign: 'center', marginBottom: 24 },
  skillsList: { gap: 12 },
  skillCard: { backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: 16, padding: 16 },
  skillHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  skillIcon: { fontSize: 36, marginRight: 12 },
  skillInfo: { flex: 1 },
  skillName: { fontSize: 18, fontWeight: 'bold', color: '#166534' },
  skillDesc: { fontSize: 12, color: '#6b7280' },
  levelBadge: { backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  levelText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  xpContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  xpBar: { flex: 1, height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginRight: 8, overflow: 'hidden' },
  xpFill: { height: '100%', backgroundColor: '#6366f1', borderRadius: 4 },
  xpText: { fontSize: 10, color: '#6b7280' },
  bonusesList: { paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  bonusText: { fontSize: 12, color: '#166534' },
});
