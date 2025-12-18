// @ts-nocheck
import { useRouter } from "expo-router";
import { useState, useEffect } from "react";
import { 
  StyleSheet, 
  View, 
  Pressable, 
  ScrollView,
  ActivityIndicator,
  Linking,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import * as WebBrowser from "expo-web-browser";
import { LinearGradient } from "expo-linear-gradient";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { trpc } from "@/lib/trpc";

const PREMIUM_PRICE = 10.00; // $10 USD una tantum

const PREMIUM_BENEFITS = [
  { icon: "🎮", title: "Tutti i Livelli", desc: "Accesso illimitato a tutti i livelli del gioco" },
  { icon: "🌿", title: "Piante Esclusive", desc: "Sblocca plant03 e plant04 premium" },
  { icon: "🚫", title: "Zero Pubblicità", desc: "Esperienza di gioco senza interruzioni" },
  { icon: "💰", title: "Bonus x2", desc: "Guadagni GLeaf raddoppiati" },
  { icon: "✨", title: "Spray Speciali", desc: "Tutti i tipi di spray sbloccati" },
  { icon: "🏆", title: "Accesso VIP", desc: "Nuovi contenuti in anteprima" },
];

export default function PaywallScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);

  // tRPC mutations for PayPal
  const createOrderMutation = trpc.createPayPalOrder.useMutation();
  const captureOrderMutation = trpc.capturePayPalOrder.useMutation();

  const handlePayPalCheckout = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsProcessing(true);
    setPaymentStatus("processing");
    setErrorMessage("");

    try {
      // Create PayPal order via backend
      const result = await createOrderMutation.mutateAsync({
        amount: PREMIUM_PRICE.toString(),
        currency: "USD",
        description: "Kurstaki Strike Premium - Sblocco Completo",
      });

      if (result.orderId && result.approvalUrl) {
        setOrderId(result.orderId);
        
        // Open PayPal approval URL
        if (Platform.OS === "web") {
          window.location.href = result.approvalUrl;
        } else {
          const browserResult = await WebBrowser.openAuthSessionAsync(
            result.approvalUrl,
            "kurstakistrike://paypal/callback"
          );
          
          if (browserResult.type === "success") {
            // Capture the order after approval
            await capturePayment(result.orderId);
          } else {
            setPaymentStatus("idle");
            setIsProcessing(false);
          }
        }
      } else {
        throw new Error("Failed to create PayPal order");
      }
    } catch (error: any) {
      console.error("Payment error:", error);
      setPaymentStatus("error");
      setErrorMessage(error.message || "Errore durante il pagamento");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setIsProcessing(false);
    }
  };

  const capturePayment = async (orderIdToCapture: string) => {
    try {
      const captureResult = await captureOrderMutation.mutateAsync({
        orderId: orderIdToCapture,
      });

      if (captureResult.success) {
        // Mark as premium
        await AsyncStorage.setItem("isPremium", "true");
        await AsyncStorage.setItem("premiumDate", new Date().toISOString());
        await AsyncStorage.setItem("paypalOrderId", orderIdToCapture);
        
        // Update game stats
        const stats = await AsyncStorage.getItem("gameStats");
        const parsed = stats ? JSON.parse(stats) : {};
        await AsyncStorage.setItem("gameStats", JSON.stringify({
          ...parsed,
          isPremium: true,
          premiumDate: new Date().toISOString(),
        }));

        setPaymentStatus("success");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        
        // Navigate back after success
        setTimeout(() => {
          router.replace("/(tabs)");
        }, 2000);
      } else {
        throw new Error("Payment capture failed");
      }
    } catch (error: any) {
      console.error("Capture error:", error);
      setPaymentStatus("error");
      setErrorMessage(error.message || "Errore nella conferma del pagamento");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkip = () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.back();
  };

  const handleRestorePurchase = async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setIsProcessing(true);
    
    try {
      const isPremium = await AsyncStorage.getItem("isPremium");
      const savedOrderId = await AsyncStorage.getItem("paypalOrderId");
      
      if (isPremium === "true" && savedOrderId) {
        setPaymentStatus("success");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
        setTimeout(() => router.back(), 1500);
      } else {
        setErrorMessage("Nessun acquisto trovato da ripristinare");
        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        }
      }
    } catch (error) {
      console.error("Restore error:", error);
      setErrorMessage("Errore nel ripristino dell'acquisto");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <LinearGradient colors={["#0f172a", "#1e293b", "#334155"]} style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 40 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Close Button */}
        <Pressable style={styles.closeButton} onPress={handleSkip}>
          <ThemedText style={styles.closeText}>✕</ThemedText>
        </Pressable>

        {/* Logo */}
        <Image
          source={require("@/assets/images/logo.png")}
          style={styles.logo}
          contentFit="contain"
        />

        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.crownContainer}>
            <ThemedText style={styles.crownEmoji}>👑</ThemedText>
          </View>
          <ThemedText style={styles.heroTitle}>
            Kurstaki Strike Premium
          </ThemedText>
          <ThemedText style={styles.heroSubtitle}>
            Sblocca l'esperienza completa per sempre
          </ThemedText>
        </View>

        {/* Price Badge */}
        <View style={styles.priceBadge}>
          <ThemedText style={styles.priceText}>${PREMIUM_PRICE.toFixed(2)}</ThemedText>
          <ThemedText style={styles.priceSubtext}>Una tantum • Per sempre tuo</ThemedText>
        </View>

        {/* Benefits List */}
        <View style={styles.benefitsCard}>
          <ThemedText style={styles.benefitsTitle}>
            Cosa ottieni:
          </ThemedText>
          {PREMIUM_BENEFITS.map((benefit, index) => (
            <View key={index} style={styles.benefitItem}>
              <ThemedText style={styles.benefitIcon}>{benefit.icon}</ThemedText>
              <View style={styles.benefitTextContainer}>
                <ThemedText style={styles.benefitTitle}>{benefit.title}</ThemedText>
                <ThemedText style={styles.benefitDesc}>{benefit.desc}</ThemedText>
              </View>
            </View>
          ))}
        </View>

        {/* Payment Status */}
        {paymentStatus === "success" && (
          <View style={styles.successBanner}>
            <ThemedText style={styles.successEmoji}>✅</ThemedText>
            <ThemedText style={styles.successText}>
              Pagamento completato! Benvenuto in Premium!
            </ThemedText>
          </View>
        )}

        {paymentStatus === "error" && (
          <View style={styles.errorBanner}>
            <ThemedText style={styles.errorEmoji}>❌</ThemedText>
            <ThemedText style={styles.errorText}>
              {errorMessage || "Errore nel pagamento. Riprova."}
            </ThemedText>
          </View>
        )}

        {/* PayPal Button */}
        <Pressable
          style={[
            styles.paypalButton,
            isProcessing && styles.buttonDisabled,
          ]}
          onPress={handlePayPalCheckout}
          disabled={isProcessing || paymentStatus === "success"}
        >
          {isProcessing ? (
            <ActivityIndicator color="#003087" size="small" />
          ) : (
            <View style={styles.paypalButtonContent}>
              <ThemedText style={styles.paypalButtonText}>Paga con </ThemedText>
              <ThemedText style={styles.paypalLogo}>PayPal</ThemedText>
            </View>
          )}
        </Pressable>

        {/* Security Badge */}
        <View style={styles.securityBadge}>
          <ThemedText style={styles.securityIcon}>🔒</ThemedText>
          <ThemedText style={styles.securityText}>
            Pagamento sicuro tramite PayPal
          </ThemedText>
        </View>

        {/* Restore Purchase */}
        <Pressable 
          style={styles.restoreButton}
          onPress={handleRestorePurchase}
          disabled={isProcessing}
        >
          <ThemedText style={styles.restoreText}>
            Ripristina acquisto precedente
          </ThemedText>
        </Pressable>

        {/* Skip Button */}
        <Pressable style={styles.skipButton} onPress={handleSkip}>
          <ThemedText style={styles.skipText}>
            Continua con versione gratuita
          </ThemedText>
        </Pressable>

        {/* Terms */}
        <ThemedText style={styles.terms}>
          Acquistando accetti i nostri Termini di Servizio e la Privacy Policy.
          Il pagamento è processato in modo sicuro tramite PayPal.
          Nessun abbonamento, pagamento unico.
        </ThemedText>
      </ScrollView>
    </LinearGradient>
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
    padding: 20,
    alignItems: "center",
  },
  closeButton: {
    position: "absolute",
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeText: {
    color: "#fff",
    fontSize: 20,
  },
  logo: {
    width: 180,
    height: 80,
    marginBottom: 20,
  },
  heroSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  crownContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  crownEmoji: {
    fontSize: 50,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "#9ca3af",
    textAlign: "center",
  },
  priceBadge: {
    backgroundColor: "#ffd700",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 24,
  },
  priceText: {
    fontSize: 42,
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
    backgroundColor: "rgba(255,255,255,0.05)",
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  benefitsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 16,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
  },
  benefitIcon: {
    fontSize: 28,
    width: 44,
    textAlign: "center",
  },
  benefitTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  benefitTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  benefitDesc: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
  },
  successBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
  },
  successEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  successText: {
    color: "#22c55e",
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    width: "100%",
  },
  errorEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  errorText: {
    color: "#ef4444",
    fontSize: 14,
    flex: 1,
  },
  paypalButton: {
    backgroundColor: "#ffc439",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  paypalButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  paypalButtonText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#003087",
  },
  paypalLogo: {
    fontSize: 20,
    fontWeight: "800",
    color: "#003087",
    fontStyle: "italic",
  },
  securityBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  securityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  securityText: {
    fontSize: 13,
    color: "#9ca3af",
  },
  restoreButton: {
    padding: 16,
    marginBottom: 8,
  },
  restoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#60a5fa",
  },
  skipButton: {
    padding: 16,
    marginBottom: 16,
  },
  skipText: {
    fontSize: 14,
    color: "#6b7280",
  },
  terms: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 16,
    paddingHorizontal: 20,
  },
});
