// @ts-nocheck
import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, Switch, Dimensions, Alert, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemedText } from '@/components/themed-text';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

interface SettingsSection {
  title: string;
  icon: string;
  settings: Setting[];
}

interface Setting {
  id: string;
  label: string;
  description?: string;
  type: 'toggle' | 'select' | 'slider' | 'action' | 'link';
  value?: any;
  options?: { label: string; value: any }[];
  action?: () => void;
}

export default function SettingsAdvancedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Settings state
  const [settings, setSettings] = useState({
    // Audio
    masterVolume: 80,
    musicVolume: 70,
    sfxVolume: 90,
    voiceVolume: 100,
    muteAll: false,
    
    // Graphics
    graphicsQuality: 'high',
    particleEffects: true,
    shadowQuality: 'medium',
    antiAliasing: true,
    fps60: true,
    reducedMotion: false,
    
    // Gameplay
    autoAim: false,
    showDamageNumbers: true,
    screenShake: true,
    tutorialHints: true,
    autoSave: true,
    confirmActions: true,
    
    // Notifications
    pushNotifications: true,
    dailyReminder: true,
    eventNotifications: true,
    friendNotifications: true,
    marketNotifications: false,
    
    // Privacy
    showOnline: true,
    allowFriendRequests: true,
    shareStats: true,
    analyticsEnabled: true,
    
    // Accessibility
    colorBlindMode: 'none',
    textSize: 'medium',
    highContrast: false,
    subtitles: true,
    hapticFeedback: true,
    
    // Language
    language: 'it',
    region: 'EU',
  });

  const updateSetting = (key: string, value: any) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const SECTIONS: SettingsSection[] = [
    {
      title: 'Audio',
      icon: '🔊',
      settings: [
        { id: 'muteAll', label: 'Disattiva Audio', type: 'toggle', value: settings.muteAll },
        { id: 'masterVolume', label: 'Volume Principale', description: `${settings.masterVolume}%`, type: 'slider', value: settings.masterVolume },
        { id: 'musicVolume', label: 'Musica', description: `${settings.musicVolume}%`, type: 'slider', value: settings.musicVolume },
        { id: 'sfxVolume', label: 'Effetti Sonori', description: `${settings.sfxVolume}%`, type: 'slider', value: settings.sfxVolume },
        { id: 'voiceVolume', label: 'Voci', description: `${settings.voiceVolume}%`, type: 'slider', value: settings.voiceVolume },
      ],
    },
    {
      title: 'Grafica',
      icon: '🎨',
      settings: [
        { id: 'graphicsQuality', label: 'Qualità Grafica', type: 'select', value: settings.graphicsQuality, options: [
          { label: 'Bassa', value: 'low' },
          { label: 'Media', value: 'medium' },
          { label: 'Alta', value: 'high' },
          { label: 'Ultra', value: 'ultra' },
        ]},
        { id: 'particleEffects', label: 'Effetti Particellari', type: 'toggle', value: settings.particleEffects },
        { id: 'shadowQuality', label: 'Qualità Ombre', type: 'select', value: settings.shadowQuality, options: [
          { label: 'Off', value: 'off' },
          { label: 'Bassa', value: 'low' },
          { label: 'Media', value: 'medium' },
          { label: 'Alta', value: 'high' },
        ]},
        { id: 'antiAliasing', label: 'Anti-Aliasing', type: 'toggle', value: settings.antiAliasing },
        { id: 'fps60', label: '60 FPS', description: 'Maggiore fluidità, più batteria', type: 'toggle', value: settings.fps60 },
        { id: 'reducedMotion', label: 'Riduci Animazioni', type: 'toggle', value: settings.reducedMotion },
      ],
    },
    {
      title: 'Gameplay',
      icon: '🎮',
      settings: [
        { id: 'autoAim', label: 'Mira Assistita', description: 'Aiuto automatico nella mira', type: 'toggle', value: settings.autoAim },
        { id: 'showDamageNumbers', label: 'Numeri Danno', type: 'toggle', value: settings.showDamageNumbers },
        { id: 'screenShake', label: 'Vibrazione Schermo', type: 'toggle', value: settings.screenShake },
        { id: 'tutorialHints', label: 'Suggerimenti Tutorial', type: 'toggle', value: settings.tutorialHints },
        { id: 'autoSave', label: 'Salvataggio Automatico', type: 'toggle', value: settings.autoSave },
        { id: 'confirmActions', label: 'Conferma Azioni', description: 'Chiedi conferma per acquisti', type: 'toggle', value: settings.confirmActions },
      ],
    },
    {
      title: 'Notifiche',
      icon: '🔔',
      settings: [
        { id: 'pushNotifications', label: 'Notifiche Push', type: 'toggle', value: settings.pushNotifications },
        { id: 'dailyReminder', label: 'Promemoria Giornaliero', type: 'toggle', value: settings.dailyReminder },
        { id: 'eventNotifications', label: 'Eventi Speciali', type: 'toggle', value: settings.eventNotifications },
        { id: 'friendNotifications', label: 'Attività Amici', type: 'toggle', value: settings.friendNotifications },
        { id: 'marketNotifications', label: 'Aggiornamenti Market', type: 'toggle', value: settings.marketNotifications },
      ],
    },
    {
      title: 'Privacy',
      icon: '🔒',
      settings: [
        { id: 'showOnline', label: 'Mostra Stato Online', type: 'toggle', value: settings.showOnline },
        { id: 'allowFriendRequests', label: 'Richieste Amicizia', type: 'toggle', value: settings.allowFriendRequests },
        { id: 'shareStats', label: 'Condividi Statistiche', type: 'toggle', value: settings.shareStats },
        { id: 'analyticsEnabled', label: 'Analytics', description: 'Aiutaci a migliorare', type: 'toggle', value: settings.analyticsEnabled },
      ],
    },
    {
      title: 'Accessibilità',
      icon: '♿',
      settings: [
        { id: 'colorBlindMode', label: 'Modalità Daltonici', type: 'select', value: settings.colorBlindMode, options: [
          { label: 'Disattivato', value: 'none' },
          { label: 'Protanopia', value: 'protanopia' },
          { label: 'Deuteranopia', value: 'deuteranopia' },
          { label: 'Tritanopia', value: 'tritanopia' },
        ]},
        { id: 'textSize', label: 'Dimensione Testo', type: 'select', value: settings.textSize, options: [
          { label: 'Piccolo', value: 'small' },
          { label: 'Medio', value: 'medium' },
          { label: 'Grande', value: 'large' },
          { label: 'Extra Grande', value: 'xlarge' },
        ]},
        { id: 'highContrast', label: 'Alto Contrasto', type: 'toggle', value: settings.highContrast },
        { id: 'subtitles', label: 'Sottotitoli', type: 'toggle', value: settings.subtitles },
        { id: 'hapticFeedback', label: 'Feedback Aptico', type: 'toggle', value: settings.hapticFeedback },
      ],
    },
    {
      title: 'Lingua e Regione',
      icon: '🌍',
      settings: [
        { id: 'language', label: 'Lingua', type: 'select', value: settings.language, options: [
          { label: 'Italiano', value: 'it' },
          { label: 'English', value: 'en' },
          { label: 'Español', value: 'es' },
          { label: 'Français', value: 'fr' },
          { label: 'Deutsch', value: 'de' },
        ]},
        { id: 'region', label: 'Regione Server', type: 'select', value: settings.region, options: [
          { label: 'Europa', value: 'EU' },
          { label: 'Nord America', value: 'NA' },
          { label: 'Asia', value: 'AS' },
          { label: 'Oceania', value: 'OC' },
        ]},
      ],
    },
    {
      title: 'Account',
      icon: '👤',
      settings: [
        { id: 'changePassword', label: 'Cambia Password', type: 'action', action: () => Alert.alert('Cambia Password', 'Funzionalità in arrivo') },
        { id: 'linkAccounts', label: 'Collega Account', description: 'Google, Apple, Facebook', type: 'action', action: () => Alert.alert('Collega Account', 'Funzionalità in arrivo') },
        { id: 'exportData', label: 'Esporta Dati', type: 'action', action: () => Alert.alert('Esporta Dati', 'I tuoi dati verranno inviati via email') },
        { id: 'deleteAccount', label: 'Elimina Account', description: 'Azione irreversibile', type: 'action', action: () => Alert.alert('Elimina Account', 'Sei sicuro? Questa azione è irreversibile.', [{ text: 'Annulla' }, { text: 'Elimina', style: 'destructive' }]) },
      ],
    },
    {
      title: 'Informazioni',
      icon: 'ℹ️',
      settings: [
        { id: 'version', label: 'Versione App', description: '1.0.0 (Build 2024.12.21)', type: 'link' },
        { id: 'terms', label: 'Termini di Servizio', type: 'link', action: () => Linking.openURL('https://example.com/terms') },
        { id: 'privacy', label: 'Privacy Policy', type: 'link', action: () => Linking.openURL('https://example.com/privacy') },
        { id: 'licenses', label: 'Licenze Open Source', type: 'link', action: () => Alert.alert('Licenze', 'React Native, Expo, Three.js...') },
        { id: 'support', label: 'Supporto', type: 'link', action: () => Linking.openURL('mailto:support@kurstakistrike.com') },
      ],
    },
  ];

  const renderSetting = (setting: Setting) => {
    switch (setting.type) {
      case 'toggle':
        return (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>{setting.label}</ThemedText>
              {setting.description && <ThemedText style={styles.settingDescription}>{setting.description}</ThemedText>}
            </View>
            <Switch
              value={setting.value}
              onValueChange={(value) => updateSetting(setting.id, value)}
              trackColor={{ false: '#4b5563', true: '#22c55e' }}
              thumbColor="#fff"
            />
          </View>
        );
      
      case 'select':
        return (
          <Pressable 
            style={styles.settingRow}
            onPress={() => {
              Alert.alert(
                setting.label,
                'Seleziona un\'opzione',
                setting.options?.map(opt => ({
                  text: opt.label,
                  onPress: () => updateSetting(setting.id, opt.value),
                })) || []
              );
            }}
          >
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>{setting.label}</ThemedText>
              {setting.description && <ThemedText style={styles.settingDescription}>{setting.description}</ThemedText>}
            </View>
            <View style={styles.selectValue}>
              <ThemedText style={styles.selectValueText}>
                {setting.options?.find(o => o.value === setting.value)?.label}
              </ThemedText>
              <ThemedText style={styles.selectArrow}>›</ThemedText>
            </View>
          </Pressable>
        );
      
      case 'slider':
        return (
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <ThemedText style={styles.settingLabel}>{setting.label}</ThemedText>
              <ThemedText style={styles.settingDescription}>{setting.description}</ThemedText>
            </View>
            <View style={styles.sliderContainer}>
              <Pressable style={styles.sliderButton} onPress={() => updateSetting(setting.id, Math.max(0, setting.value - 10))}>
                <ThemedText style={styles.sliderButtonText}>-</ThemedText>
              </Pressable>
              <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${setting.value}%` }]} />
              </View>
              <Pressable style={styles.sliderButton} onPress={() => updateSetting(setting.id, Math.min(100, setting.value + 10))}>
                <ThemedText style={styles.sliderButtonText}>+</ThemedText>
              </Pressable>
            </View>
          </View>
        );
      
      case 'action':
      case 'link':
        return (
          <Pressable style={styles.settingRow} onPress={setting.action}>
            <View style={styles.settingInfo}>
              <ThemedText style={[styles.settingLabel, setting.id === 'deleteAccount' && styles.dangerText]}>
                {setting.label}
              </ThemedText>
              {setting.description && <ThemedText style={styles.settingDescription}>{setting.description}</ThemedText>}
            </View>
            <ThemedText style={styles.actionArrow}>›</ThemedText>
          </Pressable>
        );
      
      default:
        return null;
    }
  };

  const resetSettings = () => {
    Alert.alert(
      'Ripristina Impostazioni',
      'Vuoi ripristinare tutte le impostazioni ai valori predefiniti?',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Ripristina', style: 'destructive', onPress: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Reset to defaults
        }},
      ]
    );
  };

  const saveSettings = async () => {
    try {
      await AsyncStorage.setItem('game_settings', JSON.stringify(settings));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Salvato', 'Le impostazioni sono state salvate con successo');
    } catch (error) {
      Alert.alert('Errore', 'Impossibile salvare le impostazioni');
    }
  };

  return (
    <LinearGradient colors={['#14532d', '#166534', '#059669']} style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 20) }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <ThemedText style={styles.backText}>← Indietro</ThemedText>
        </Pressable>
        <ThemedText style={styles.headerTitle}>⚙️ Impostazioni</ThemedText>
        <Pressable onPress={saveSettings} style={styles.saveButton}>
          <ThemedText style={styles.saveText}>Salva</ThemedText>
        </Pressable>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, 20) + 80 }]}
      >
        {SECTIONS.map((section, sectionIndex) => (
          <Animated.View key={section.title} entering={FadeIn.delay(sectionIndex * 50)}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <ThemedText style={styles.sectionIcon}>{section.icon}</ThemedText>
                <ThemedText style={styles.sectionTitle}>{section.title}</ThemedText>
              </View>
              <View style={styles.sectionContent}>
                {section.settings.map((setting, index) => (
                  <Animated.View key={setting.id} entering={SlideInRight.delay(index * 30)}>
                    {renderSetting(setting)}
                    {index < section.settings.length - 1 && <View style={styles.divider} />}
                  </Animated.View>
                ))}
              </View>
            </View>
          </Animated.View>
        ))}

        {/* Reset Button */}
        <Pressable style={styles.resetButton} onPress={resetSettings}>
          <ThemedText style={styles.resetButtonText}>Ripristina Impostazioni Predefinite</ThemedText>
        </Pressable>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  backButton: { padding: 8 },
  backText: { color: '#a7f3d0', fontSize: 16 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  saveButton: { backgroundColor: '#22c55e', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  saveText: { color: '#fff', fontWeight: 'bold' },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: 20 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionIcon: { fontSize: 20, marginRight: 8 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sectionContent: { backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 },
  settingInfo: { flex: 1, marginRight: 12 },
  settingLabel: { color: '#fff', fontSize: 16 },
  settingDescription: { color: '#9ca3af', fontSize: 12, marginTop: 2 },
  dangerText: { color: '#ef4444' },
  selectValue: { flexDirection: 'row', alignItems: 'center' },
  selectValueText: { color: '#a7f3d0', fontSize: 14, marginRight: 4 },
  selectArrow: { color: '#9ca3af', fontSize: 20 },
  actionArrow: { color: '#9ca3af', fontSize: 24 },
  sliderContainer: { flexDirection: 'row', alignItems: 'center' },
  sliderButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  sliderButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  sliderTrack: { width: 80, height: 6, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 3, marginHorizontal: 8 },
  sliderFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.1)', marginHorizontal: 16 },
  resetButton: { backgroundColor: 'rgba(239,68,68,0.2)', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20 },
  resetButtonText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
});
