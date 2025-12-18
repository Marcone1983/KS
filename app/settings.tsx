import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  ScrollView,
  Switch,
  Alert,
  Linking,
  Platform,
} from "react-native";
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { useSounds } from "@/hooks/use-sounds";

interface Settings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  notificationsEnabled: boolean;
  hapticEnabled: boolean;
}

const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  musicEnabled: true,
  notificationsEnabled: true,
  hapticEnabled: true,
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const { 
    settings: soundSettings, 
    setSoundEnabled, 
    setMusicEnabled, 
    setSoundVolume, 
    setMusicVolume,
    play 
  } = useSounds();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const saved = await AsyncStorage.getItem("settings");
      if (saved) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const updateSetting = async (key: keyof Settings, value: boolean) => {
    if (settings.hapticEnabled) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    
    // Sync with sound system
    if (key === 'soundEnabled') {
      setSoundEnabled(value);
      if (value) play('ui_toggle_on');
    } else if (key === 'musicEnabled') {
      setMusicEnabled(value);
      if (value) play('ui_toggle_on');
    }
    
    try {
      await AsyncStorage.setItem("settings", JSON.stringify(newSettings));
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const handleSoundVolumeChange = (value: number) => {
    setSoundVolume(value);
  };

  const handleMusicVolumeChange = (value: number) => {
    setMusicVolume(value);
  };

  const VolumeSlider = ({ 
    label, 
    value, 
    onValueChange,
    icon,
  }: { 
    label: string; 
    value: number; 
    onValueChange: (value: number) => void;
    icon: any;
  }) => (
    <View style={styles.volumeRow}>
      <View style={styles.volumeHeader}>
        <IconSymbol name={icon} size={22} color={colors.tint} />
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
        <ThemedText style={styles.volumeValue}>{Math.round(value * 100)}%</ThemedText>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={1}
        value={value}
        onValueChange={onValueChange}
        minimumTrackTintColor={colors.tint}
        maximumTrackTintColor={colors.border}
        thumbTintColor={colors.tint}
      />
    </View>
  );

  const handleResetProgress = () => {
    Alert.alert(
      "Reset Progressi",
      "Sei sicuro di voler cancellare tutti i progressi? Questa azione non può essere annullata.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove([
                "gameStats",
                "ownedItems",
                "completedLevel1",
              ]);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Completato", "I progressi sono stati resettati.");
            } catch (error) {
              console.error("Error resetting progress:", error);
            }
          },
        },
      ]
    );
  };

  const SettingRow = ({ 
    icon, 
    label, 
    value, 
    onValueChange 
  }: { 
    icon: any; 
    label: string; 
    value: boolean; 
    onValueChange: (value: boolean) => void;
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <IconSymbol name={icon} size={22} color={colors.tint} />
        <ThemedText style={styles.settingLabel}>{label}</ThemedText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.tint + "80" }}
        thumbColor={value ? colors.tint : colors.textSecondary}
      />
    </View>
  );

  const LinkRow = ({ 
    icon, 
    label, 
    onPress,
    destructive = false,
  }: { 
    icon: any; 
    label: string; 
    onPress: () => void;
    destructive?: boolean;
  }) => (
    <Pressable style={styles.settingRow} onPress={onPress}>
      <View style={styles.settingLeft}>
        <IconSymbol name={icon} size={22} color={destructive ? colors.error : colors.tint} />
        <ThemedText style={[styles.settingLabel, destructive && { color: colors.error }]}>
          {label}
        </ThemedText>
      </View>
      <IconSymbol name="chevron.right" size={18} color={colors.textSecondary} />
    </Pressable>
  );

  return (
    <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <IconSymbol name="chevron.left" size={24} color={colors.text} />
        </Pressable>
        <ThemedText type="title">Impostazioni</ThemedText>
        <View style={styles.placeholder} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Audio Section */}
        <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          AUDIO
        </ThemedText>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="bell.fill"
            label="Effetti sonori"
            value={settings.soundEnabled}
            onValueChange={(v) => updateSetting("soundEnabled", v)}
          />
          {settings.soundEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <VolumeSlider
                icon="speaker.wave.2.fill"
                label="Volume Effetti"
                value={soundSettings.soundVolume}
                onValueChange={handleSoundVolumeChange}
              />
            </>
          )}
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <SettingRow
            icon="sparkles"
            label="Musica"
            value={settings.musicEnabled}
            onValueChange={(v) => updateSetting("musicEnabled", v)}
          />
          {settings.musicEnabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.border }]} />
              <VolumeSlider
                icon="speaker.wave.3.fill"
                label="Volume Musica"
                value={soundSettings.musicVolume}
                onValueChange={handleMusicVolumeChange}
              />
            </>
          )}
        </View>

        {/* Notifications Section */}
        <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          NOTIFICHE
        </ThemedText>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="bell.fill"
            label="Notifiche push"
            value={settings.notificationsEnabled}
            onValueChange={(v) => updateSetting("notificationsEnabled", v)}
          />
        </View>

        {/* Accessibility Section */}
        <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          ACCESSIBILITÀ
        </ThemedText>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <SettingRow
            icon="bolt.fill"
            label="Feedback aptico"
            value={settings.hapticEnabled}
            onValueChange={(v) => updateSetting("hapticEnabled", v)}
          />
        </View>

        {/* About Section */}
        <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          INFORMAZIONI
        </ThemedText>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <LinkRow
            icon="info.circle.fill"
            label="Privacy Policy"
            onPress={() => Linking.openURL("https://example.com/privacy")}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <LinkRow
            icon="info.circle.fill"
            label="Termini di Servizio"
            onPress={() => Linking.openURL("https://example.com/terms")}
          />
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <LinkRow
            icon="info.circle.fill"
            label="Contattaci"
            onPress={() => Linking.openURL("mailto:support@kannasprout.com")}
          />
        </View>

        {/* Danger Zone */}
        <ThemedText style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          ZONA PERICOLOSA
        </ThemedText>
        <View style={[styles.section, { backgroundColor: colors.card }]}>
          <LinkRow
            icon="xmark"
            label="Reset progressi"
            onPress={handleResetProgress}
            destructive
          />
        </View>

        {/* Version */}
        <ThemedText style={[styles.version, { color: colors.textSecondary }]}>
          KannaSprout v1.0.0
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
  },
  backButton: {
    padding: Spacing.xs,
  },
  placeholder: {
    width: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    marginLeft: Spacing.sm,
  },
  section: {
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.md,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  settingLabel: {
    fontSize: 16,
  },
  divider: {
    height: 1,
    marginLeft: Spacing.md + 22 + Spacing.md,
  },
  version: {
    textAlign: "center",
    marginTop: Spacing.xl,
    fontSize: 12,
  },
  volumeRow: {
    padding: Spacing.md,
  },
  volumeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  volumeValue: {
    marginLeft: "auto",
    fontSize: 14,
    fontWeight: "600",
  },
  slider: {
    width: "100%",
    height: 40,
  },
});
