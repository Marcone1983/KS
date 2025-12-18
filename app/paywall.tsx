import { useRouter } from "expo-router";
import { useState } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Colors, PayPalColors, Spacing, BorderRadius } from "@/constants/theme";
import { useColorScheme } from "@/hooks/use-color-scheme";

const PREMIUM_PRICE = 10; // $10 USD

const PREMIUM_BENEFITS = [
  { icon: "🎮", text: "Tutti i livelli sbloccati" },
  { icon: "🌿", text: "Piante esclusive premium" },
  { icon: "🚫", text: "Nessuna pubblicità" },
  { icon: "💰", text: "Bonus GLeaf giornalieri x2" },
  { icon: "✨", text: "Skin e cosmetici esclusivi" },
  { icon: "🏆", text: "Accesso anticipato nuovi contenuti" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? "dark"];
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");

  const handlePayPalCheckout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    setPaymentStatus("processing");

    try {
      // In production, this would call your backend to create a PayPal order
      // For now, we'll simulate the payment flow
      
      // Option 1: Open PayPal checkout in browser (production)
      // const paypalUrl = await createPayPalOrder(); // Backend call
      // await WebBrowser.openBrowserAsync(paypalUrl);
      
      // Option 2: Simulate successful payment for demo
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark as premium
      await AsyncStorage.setItem("isPremium", "true");
      
      // Update game stats
      const stats = await AsyncStorage.getItem("gameStats");
      const parsed = stats ? JSON.parse(stats) : {};
      await AsyncStorage.setItem("gameStats", JSON.stringify({
        ...parsed,
        isPremium: true,
      }));

      setPaymentStatus("success");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Navigate back after success
      setTimeout(() => {
        router.back();
      }, 1500);
      
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentStatus("error");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const handleRestorePurchase = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsProcessing(true);
    
    try {
      // In production, verify with backend
      const isPremium = await AsyncStorage.getItem("isPremium");
      
      if (isPremium === "true") {
        setPaymentStatus("success");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setTimeout(() => router.back(), 1500);
      } else {
        // No purchase found
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (error) {
      console.error("Restore error:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + Spacing.md, paddingBottom: insets.bottom + Spacing.xl }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close Button */}
        <Pressable style={styles.closeButton} onPress={handleSkip}>
          <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
        </Pressable>

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={[styles.crownContainer, { backgroundColor: colors.gold + "20" }]}>
            <IconSymbol name="crown.fill" size={64} color={colors.gold} />
          </View>
          <ThemedText type="title" style={styles.heroTitle}>
            KannaSprout Premium
          </ThemedText>
          <ThemedText style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Sblocca l'esperienza completa
          </ThemedText>
        </View>

        {/* Price Badge */}
        <View style={[styles.priceBadge, { backgroundColor: colors.gold }]}>
          <ThemedText style={styles.priceText}>${PREMIUM_PRICE}</ThemedText>
          <ThemedText style={styles.priceSubtext}>Una tantum • Per sempre</ThemedText>
        </View>

        {/* Benefits List */}
        <View style={[styles.benefitsCard, { backgroundColor: colors.card }]}>
          <ThemedText type="subtitle" style={styles.benefitsTitle}>
            Cosa ottieni:
          </ThemedText>
          {PREMIUM_BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <ThemedText style={styles.benefitIcon}>{benefit.icon}</ThemedText>
              <ThemedText style={styles.benefitText}>{benefit.text}</ThemedText>
            </View>
          ))}
        </View>

        {/* Payment Status */}
        {paymentStatus === "success" && (
          <View style={[styles.statusBanner, { backgroundColor: colors.success + "20" }]}>
            <IconSymbol name="checkmark" size={24} color={colors.success} />
            <ThemedText style={{ color: colors.success, fontWeight: "600" }}>
              Pagamento completato! Benvenuto in Premium!
            </ThemedText>
          </View>
        )}

        {paymentStatus === "error" && (
          <View style={[styles.statusBanner, { backgroundColor: colors.error + "20" }]}>
            <IconSymbol name="xmark" size={24} color={colors.error} />
            <ThemedText style={{ color: colors.error, fontWeight: "600" }}>
              Errore nel pagamento. Riprova.
            </ThemedText>
          </View>
        )}

        {/* PayPal Button */}
        <Pressable
          style={[
            styles.paypalButton,
            { backgroundColor: PayPalColors.yellow },
            isProcessing && styles.buttonDisabled,
          ]}
          onPress={handlePayPalCheckout}
          disabled={isProcessing || paymentStatus === "success"}
        >
          {isProcessing ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <ThemedText style={styles.paypalButtonText}>Paga con</ThemedText>
              <ThemedText style={[styles.paypalButtonText, { fontWeight: "800", color: PayPalColors.blue }]}>
                PayPal
              </ThemedText>
            </>
          )}
        </Pressable>

        {/* Restore Purchase */}
        <Pressable 
          style={styles.restoreButton}
          onPress={handleRestorePurchase}
          disabled={isProcessing}
        >
          <ThemedText style={[styles.restoreText, { color: colors.tint }]}>
            Ripristina acquisto
          </ThemedText>
        </Pressable>

        {/* Skip Button */}
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <ThemedText style={[styles.skipText, { color: colors.textSecondary }]}>
            Continua con versione limitata
          </ThemedText>
        </Pressable>

        {/* Terms */}
        <ThemedText style={[styles.terms, { color: colors.textSecondary }]}>
          Acquistando accetti i nostri Termini di Servizio e la Privacy Policy.
          Il pagamento è processato in modo sicuro tramite PayPal.
        </ThemedText>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.md,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    padding: Spacing.sm,
    zIndex: 10,
  },
  heroSection: {
    alignItems: "center",
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
  },
  crownContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  heroTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  heroSubtitle: {
    fontSize: 16,
    textAlign: "center",
  },
  priceBadge: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  priceText: {
    fontSize: 36,
    fontWeight: "800",
    color: "#000",
  },
  priceSubtext: {
    fontSize: 14,
    color: "#000",
    opacity: 0.7,
  },
  benefitsCard: {
    width: "100%",
    padding: Spacing.lg,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  benefitsTitle: {
    marginBottom: Spacing.md,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.md,
  },
  benefitIcon: {
    fontSize: 24,
    width: 32,
    textAlign: "center",
  },
  benefitText: {
    fontSize: 16,
    flex: 1,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    width: "100%",
  },
  paypalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  paypalButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  restoreButton: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
  skipButton: {
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  skipText: {
    fontSize: 14,
  },
  terms: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: Spacing.lg,
  },
});
