// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, TextInput, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInUp, useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

type CodexCategory = 'basics' | 'combat' | 'breeding' | 'growing' | 'economy' | 'tips';

interface CodexEntry {
  id: string;
  title: string;
  category: CodexCategory;
  icon: string;
  content: string;
  tips?: string[];
  relatedEntries?: string[];
}

const CODEX_ENTRIES: CodexEntry[] = [
  // Basics
  {
    id: 'getting_started',
    title: 'Iniziare a Giocare',
    category: 'basics',
    icon: '🎮',
    content: 'Benvenuto in Kurstaki Strike! Il tuo obiettivo è proteggere le tue piante dai parassiti usando lo spray e farle crescere fino alla maturazione.\n\nInizia con una pianta base e impara le meccaniche di difesa. Man mano che avanzi, sbloccherai nuove varietà, potenziamenti e funzionalità.',
    tips: ['Completa il tutorial per ottenere ricompense bonus', 'Controlla le sfide giornaliere per guadagnare monete extra', 'Non dimenticare di raccogliere le ricompense giornaliere'],
    relatedEntries: ['controls', 'first_plant'],
  },
  {
    id: 'controls',
    title: 'Controlli',
    category: 'basics',
    icon: '👆',
    content: 'I controlli di Kurstaki Strike sono semplici e intuitivi:\n\n• TOCCA sullo schermo per spruzzare nella direzione indicata\n• TIENI PREMUTO per spray continuo (consuma più munizioni)\n• SCORRI per muovere la visuale\n• PIZZICA per zoomare',
    tips: ['Lo spray continuo è più efficace contro gruppi di nemici', 'Risparmia munizioni per le ondate più difficili'],
  },
  {
    id: 'first_plant',
    title: 'La Tua Prima Pianta',
    category: 'basics',
    icon: '🌱',
    content: 'Ogni giocatore inizia con una pianta base. Questa pianta ha statistiche equilibrate ed è perfetta per imparare le meccaniche di gioco.\n\nLa tua pianta ha una barra della salute (HP). Se raggiunge zero, perdi il livello. Proteggila dai parassiti!',
    tips: ['Tieni d\'occhio la barra HP in alto', 'Usa le pozioni salute quando la pianta è in pericolo'],
  },
  
  // Combat
  {
    id: 'combat_basics',
    title: 'Combattimento Base',
    category: 'combat',
    icon: '⚔️',
    content: 'Il combattimento si svolge in ondate. Ogni ondata porta nuovi parassiti che cercheranno di attaccare la tua pianta.\n\nUsa lo spray per eliminarli prima che raggiungano la pianta. Ogni parassita eliminato ti dà punti e occasionalmente drop di risorse.',
    tips: ['Prioritizza i parassiti più vicini alla pianta', 'I parassiti volanti sono più difficili da colpire'],
    relatedEntries: ['waves', 'pests_guide'],
  },
  {
    id: 'waves',
    title: 'Sistema Ondate',
    category: 'combat',
    icon: '🌊',
    content: 'Le ondate aumentano di difficoltà progressivamente:\n\n• Ondate 1-5: Parassiti base, singoli\n• Ondate 6-10: Gruppi misti\n• Ondate 11-15: Parassiti elite\n• Ondata 16+: Boss e sciami\n\nTra un\'ondata e l\'altra hai qualche secondo per prepararti.',
    tips: ['Usa i power-up prima delle ondate boss', 'Le ondate multiple di 5 hanno ricompense bonus'],
  },
  {
    id: 'pests_guide',
    title: 'Guida ai Parassiti',
    category: 'combat',
    icon: '🐛',
    content: 'Ogni parassita ha caratteristiche uniche:\n\n🟢 AFIDE: Veloce, bassa HP\n🔴 RAGNETTO: Erratico, medio\n🟤 BRUCO: Lento, alta HP\n⚪ MOSCA: Vola, difficile\n🟡 COCCINIGLIA: Si attacca\n🟣 TRIPIDE: Piccolo, veloce\n👑 LOCUSTA: Boss, devastante',
    tips: ['Impara i pattern di movimento di ogni parassita', 'I boss hanno fasi di vulnerabilità'],
  },
  {
    id: 'powerups',
    title: 'Power-up',
    category: 'combat',
    icon: '⚡',
    content: 'I power-up appaiono durante il gioco e offrono bonus temporanei:\n\n💪 DAMAGE BOOST: +50% danno\n🛡️ SHIELD: Protegge la pianta\n❄️ FREEZE: Rallenta nemici\n🔫 MULTISHOT: Colpi multipli\n💚 HEAL: Ripristina HP\n💣 BOMB: Danno ad area',
    tips: ['Raccogli i power-up toccandoli', 'Alcuni power-up si combinano per effetti speciali'],
  },
  
  // Breeding
  {
    id: 'breeding_basics',
    title: 'Introduzione al Breeding',
    category: 'breeding',
    icon: '🧬',
    content: 'Il breeding ti permette di creare nuove varietà di piante combinando i tratti genetici di due piante genitori.\n\nOgni pianta ha 8 tratti genetici (THC, CBD, Yield, ecc.) che vengono ereditati dalla prole con variazioni casuali.',
    tips: ['Piante con tratti simili producono prole più prevedibile', 'Le mutazioni rare possono creare piante leggendarie'],
    relatedEntries: ['genetics', 'rarity_system'],
  },
  {
    id: 'genetics',
    title: 'Sistema Genetico',
    category: 'breeding',
    icon: '🔬',
    content: 'I tratti genetici determinano le caratteristiche della pianta:\n\n• THC (0-100): Potenza offensiva\n• CBD (0-100): Capacità difensiva\n• YIELD (0-100): Produttività\n• FLOWER TIME: Velocità fioritura\n• RESISTANCE: Resistenza parassiti\n• GROWTH: Velocità crescita\n• POTENCY: Efficacia generale\n• TERPENES: Profilo aromatico',
    tips: ['Bilancia i tratti per piante versatili', 'Specializza per ruoli specifici (tank, DPS, support)'],
  },
  {
    id: 'rarity_system',
    title: 'Sistema Rarità',
    category: 'breeding',
    icon: '⭐',
    content: 'La rarità della pianta è determinata dalla media dei suoi tratti:\n\n⬜ COMMON: Media < 55%\n🟦 RARE: Media ≥ 55%\n🟪 EPIC: Media ≥ 70%\n🟨 LEGENDARY: Media ≥ 85%\n\nLe piante più rare hanno statistiche migliori e bonus speciali.',
    tips: ['Le legendary hanno abilità passive uniche', 'Colleziona tutte le rarità per achievement'],
  },
  
  // Growing
  {
    id: 'growing_basics',
    title: 'Coltivazione Base',
    category: 'growing',
    icon: '🌿',
    content: 'La coltivazione avviene nel Growing Lab. Ogni pianta passa attraverso 8 stadi di crescita:\n\n1. Seedling\n2. Young Plant\n3. Mid-Vegetative\n4. Full Vegetative\n5. Pre-Flowering\n6. Early Flowering\n7. Full Flowering\n8. Maturation',
    tips: ['Ogni stadio richiede cure specifiche', 'Il time-lapse accelera la crescita per visualizzazione'],
    relatedEntries: ['nutrients', 'harvest'],
  },
  {
    id: 'nutrients',
    title: 'Nutrienti',
    category: 'growing',
    icon: '💧',
    content: 'Le piante necessitano di nutrienti per crescere:\n\n💧 ACQUA: Base, sempre necessaria\n🟢 AZOTO (N): Fase vegetativa\n🟠 FOSFORO (P): Fioritura\n🟡 POTASSIO (K): Generale\n✨ BOOST: Accelera crescita',
    tips: ['Non eccedere con i nutrienti (bruciatura)', 'Bilancia NPK in base alla fase'],
  },
  {
    id: 'harvest',
    title: 'Raccolta',
    category: 'growing',
    icon: '🌾',
    content: 'Quando la pianta raggiunge lo stadio 8 (Maturation), è pronta per il raccolto.\n\nLa resa dipende da:\n• Tratto YIELD della pianta\n• Cure durante la crescita\n• Bonus da equipaggiamento\n• Ricerche sbloccate',
    tips: ['Aspetta la maturazione completa per resa massima', 'Le foglie gialle indicano che è pronta'],
  },
  
  // Economy
  {
    id: 'currency',
    title: 'Valute',
    category: 'economy',
    icon: '💰',
    content: 'Il gioco utilizza diverse valute:\n\n💰 COINS: Valuta principale\n💎 GEMS: Valuta premium\n🌟 XP: Punti esperienza\n🎫 TICKETS: Eventi speciali',
    tips: ['Guadagna coins completando livelli', 'Le gems si ottengono da achievement e eventi'],
  },
  {
    id: 'shop_guide',
    title: 'Guida allo Shop',
    category: 'economy',
    icon: '🛒',
    content: 'Lo shop offre diverse categorie:\n\n🌱 SEMI: Nuove varietà\n⚗️ POZIONI: Consumabili\n🏺 VASI: Decorazioni\n💡 LAMPADE: Bonus crescita\n👕 SKIN: Personalizzazione',
    tips: ['Controlla le offerte giornaliere', 'Alcuni oggetti sono limitati nel tempo'],
  },
  {
    id: 'trading',
    title: 'Trading',
    category: 'economy',
    icon: '🤝',
    content: 'Il marketplace ti permette di scambiare oggetti con altri giocatori.\n\nPuoi:\n• Vendere oggetti per coins\n• Comprare da altri giocatori\n• Fare offerte personalizzate\n• Scambiare direttamente',
    tips: ['Controlla i prezzi medi prima di vendere', 'Le piante rare valgono di più'],
  },
  
  // Tips
  {
    id: 'pro_tips',
    title: 'Consigli Pro',
    category: 'tips',
    icon: '💡',
    content: 'Consigli avanzati per migliorare:\n\n1. Completa sempre le sfide giornaliere\n2. Investi nelle ricerche prima dei cosmetici\n3. Unisciti a una gilda attiva\n4. Partecipa agli eventi stagionali\n5. Salva le gems per offerte speciali',
    tips: ['La costanza batte l\'intensità', 'Impara dai giocatori più esperti nella community'],
  },
  {
    id: 'common_mistakes',
    title: 'Errori Comuni',
    category: 'tips',
    icon: '⚠️',
    content: 'Evita questi errori da principiante:\n\n❌ Sprecare munizioni su nemici lontani\n❌ Ignorare i power-up\n❌ Non raccogliere ricompense giornaliere\n❌ Breeding casuale senza strategia\n❌ Vendere piante rare per pochi coins',
    tips: ['Impara dagli errori', 'Chiedi consigli nel forum'],
  },
  {
    id: 'faq',
    title: 'FAQ',
    category: 'tips',
    icon: '❓',
    content: 'Domande frequenti:\n\nQ: Come sblocco nuove varietà?\nA: Breeding, shop, o eventi\n\nQ: Cosa succede se perdo?\nA: Perdi il progresso del livello, non la pianta\n\nQ: Come ottengo gems gratis?\nA: Achievement, eventi, sfide speciali\n\nQ: Posso giocare offline?\nA: Sì, ma alcune funzioni richiedono connessione',
  },
];

const CATEGORY_INFO = {
  basics: { icon: '📚', name: 'Basi', color: '#22c55e' },
  combat: { icon: '⚔️', name: 'Combattimento', color: '#ef4444' },
  breeding: { icon: '🧬', name: 'Breeding', color: '#a855f7' },
  growing: { icon: '🌿', name: 'Coltivazione', color: '#16a34a' },
  economy: { icon: '💰', name: 'Economia', color: '#f59e0b' },
  tips: { icon: '💡', name: 'Consigli', color: '#3b82f6' },
};

export default function CodexScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CodexCategory | 'all'>('all');
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);

  const filteredEntries = CODEX_ENTRIES.filter(entry => {
    const matchesSearch = entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === 'all' || entry.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleEntry = (id: string) => {
    setExpandedEntry(expandedEntry === id ? null : id);
  };

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>📖 Codex</ThemedText>
        <View style={{ width: 60 }} />
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca nel codex..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
        <Pressable
          style={[styles.categoryChip, activeCategory === 'all' && styles.categoryChipActive]}
          onPress={() => setActiveCategory('all')}
        >
          <ThemedText style={styles.categoryChipText}>📚 Tutti</ThemedText>
        </Pressable>
        {(Object.keys(CATEGORY_INFO) as CodexCategory[]).map(cat => (
          <Pressable
            key={cat}
            style={[
              styles.categoryChip, 
              activeCategory === cat && styles.categoryChipActive,
              activeCategory === cat && { borderColor: CATEGORY_INFO[cat].color }
            ]}
            onPress={() => setActiveCategory(cat)}
          >
            <ThemedText style={styles.categoryChipText}>
              {CATEGORY_INFO[cat].icon} {CATEGORY_INFO[cat].name}
            </ThemedText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Entries List */}
      <ScrollView 
        style={styles.entriesContainer} 
        contentContainerStyle={[styles.entriesContent, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
      >
        {filteredEntries.map((entry, index) => (
          <Animated.View key={entry.id} entering={FadeIn.delay(index * 30)}>
            <Pressable 
              style={[
                styles.entryCard,
                expandedEntry === entry.id && styles.entryCardExpanded
              ]}
              onPress={() => toggleEntry(entry.id)}
            >
              <View style={styles.entryHeader}>
                <View style={[styles.entryIcon, { backgroundColor: CATEGORY_INFO[entry.category].color + '30' }]}>
                  <ThemedText style={styles.entryIconText}>{entry.icon}</ThemedText>
                </View>
                <View style={styles.entryTitleContainer}>
                  <ThemedText style={styles.entryTitle}>{entry.title}</ThemedText>
                  <View style={[styles.categoryBadge, { backgroundColor: CATEGORY_INFO[entry.category].color + '30' }]}>
                    <ThemedText style={[styles.categoryBadgeText, { color: CATEGORY_INFO[entry.category].color }]}>
                      {CATEGORY_INFO[entry.category].name}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.expandIcon}>
                  {expandedEntry === entry.id ? '▼' : '▶'}
                </ThemedText>
              </View>

              {expandedEntry === entry.id && (
                <Animated.View entering={SlideInUp.duration(200)} style={styles.entryContent}>
                  <ThemedText style={styles.contentText}>{entry.content}</ThemedText>
                  
                  {entry.tips && entry.tips.length > 0 && (
                    <View style={styles.tipsContainer}>
                      <ThemedText style={styles.tipsTitle}>💡 Suggerimenti</ThemedText>
                      {entry.tips.map((tip, i) => (
                        <View key={i} style={styles.tipRow}>
                          <ThemedText style={styles.tipBullet}>•</ThemedText>
                          <ThemedText style={styles.tipText}>{tip}</ThemedText>
                        </View>
                      ))}
                    </View>
                  )}

                  {entry.relatedEntries && entry.relatedEntries.length > 0 && (
                    <View style={styles.relatedContainer}>
                      <ThemedText style={styles.relatedTitle}>📎 Voci Correlate</ThemedText>
                      <View style={styles.relatedList}>
                        {entry.relatedEntries.map(relId => {
                          const related = CODEX_ENTRIES.find(e => e.id === relId);
                          if (!related) return null;
                          return (
                            <Pressable 
                              key={relId} 
                              style={styles.relatedChip}
                              onPress={() => {
                                setExpandedEntry(relId);
                                setActiveCategory('all');
                              }}
                            >
                              <ThemedText style={styles.relatedChipText}>
                                {related.icon} {related.title}
                              </ThemedText>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  )}
                </Animated.View>
              )}
            </Pressable>
          </Animated.View>
        ))}

        {filteredEntries.length === 0 && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyIcon}>🔍</ThemedText>
            <ThemedText style={styles.emptyText}>Nessun risultato trovato</ThemedText>
            <ThemedText style={styles.emptySubtext}>Prova con altri termini di ricerca</ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Stats Footer */}
      <View style={styles.footer}>
        <ThemedText style={styles.footerText}>
          {filteredEntries.length} voci • {CODEX_ENTRIES.length} totali
        </ThemedText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  searchContainer: { paddingHorizontal: 20, marginBottom: 10 },
  searchInput: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 16 },
  categoryScroll: { maxHeight: 50, paddingHorizontal: 15, marginBottom: 10 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', marginRight: 8, borderWidth: 2, borderColor: 'transparent' },
  categoryChipActive: { backgroundColor: 'rgba(255,255,255,0.2)' },
  categoryChipText: { color: '#fff', fontSize: 13 },
  entriesContainer: { flex: 1 },
  entriesContent: { paddingHorizontal: 20 },
  entryCard: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, marginBottom: 10, overflow: 'hidden' },
  entryCardExpanded: { backgroundColor: 'rgba(255,255,255,0.15)' },
  entryHeader: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  entryIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  entryIconText: { fontSize: 22 },
  entryTitleContainer: { flex: 1 },
  entryTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  categoryBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  categoryBadgeText: { fontSize: 11 },
  expandIcon: { color: '#9ca3af', fontSize: 12 },
  entryContent: { paddingHorizontal: 14, paddingBottom: 14 },
  contentText: { color: '#d1d5db', fontSize: 14, lineHeight: 22 },
  tipsContainer: { marginTop: 16, backgroundColor: 'rgba(34,197,94,0.1)', borderRadius: 12, padding: 12 },
  tipsTitle: { color: '#22c55e', fontSize: 14, fontWeight: 'bold', marginBottom: 8 },
  tipRow: { flexDirection: 'row', marginBottom: 4 },
  tipBullet: { color: '#22c55e', marginRight: 8 },
  tipText: { color: '#a7f3d0', fontSize: 13, flex: 1 },
  relatedContainer: { marginTop: 16 },
  relatedTitle: { color: '#9ca3af', fontSize: 13, marginBottom: 8 },
  relatedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  relatedChip: { backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  relatedChipText: { color: '#fff', fontSize: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  emptySubtext: { color: '#9ca3af', fontSize: 14 },
  footer: { padding: 10, alignItems: 'center' },
  footerText: { color: '#a7f3d0', fontSize: 12 },
});
