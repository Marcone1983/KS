import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, findNodeHandle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';

const TUTORIAL_COMPLETED_KEY = 'tutorial_completed';

const Spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const BorderRadius = { sm: 8, md: 12, lg: 16 };
const Colors = { primaryGreen: '#2D7D46', gold: '#FFD700', darkBackground: 'rgba(26, 26, 46, 0.85)' };

interface TutorialStep {
  id: number;
  text: string;
  targetRef?: React.RefObject<View>;
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  onFinish: () => void;
}

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({ steps, onFinish }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetLayout, setTargetLayout] = useState<{ x: number; y: number; width: number; height: number } | null>(null);

  useEffect(() => {
    const checkTutorialStatus = async () => {
      try {
        const hasCompleted = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
        if (hasCompleted === null) {
          setIsVisible(true);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
      } catch (error) {
        console.error('Failed to load tutorial status from AsyncStorage', error);
      }
    };
    checkTutorialStatus();
  }, []);

  const currentStep = steps[currentStepIndex];

  useEffect(() => {
    if (isVisible && currentStep && currentStep.targetRef && currentStep.targetRef.current) {
      const handle = findNodeHandle(currentStep.targetRef.current);
      if (handle) {
        currentStep.targetRef.current.measureInWindow((x, y, width, height) => {
          setTargetLayout({ x, y, width, height });
        });
      }
    } else {
      setTargetLayout(null);
    }
  }, [currentStepIndex, isVisible, currentStep]);

  const handleNextStep = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleFinish();
    }
  };

  const handleFinish = async () => {
    try {
      await AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true');
      setIsVisible(false);
      onFinish();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to save tutorial status to AsyncStorage', error);
    }
  };

  if (!isVisible || !currentStep) {
    return null;
  }

  const getTooltipStyle = () => {
    if (!targetLayout) {
      return styles.tooltipCenter;
    }
    switch (currentStep.position) {
      case 'top':
        return { top: targetLayout.y - Spacing.lg, left: targetLayout.x };
      case 'bottom':
        return { top: targetLayout.y + targetLayout.height + Spacing.lg, left: targetLayout.x };
      case 'left':
        return { top: targetLayout.y, left: targetLayout.x - Spacing.xl * 2 };
      case 'right':
        return { top: targetLayout.y, left: targetLayout.x + targetLayout.width + Spacing.lg };
      default:
        return styles.tooltipCenter;
    }
  };

  const getArrowRotation = () => {
      if (!targetLayout) return '0deg';
      switch (currentStep.position) {
          case 'top': return '180deg';
          case 'bottom': return '0deg';
          case 'left': return '90deg';
          case 'right': return '270deg';
          default: return '0deg';
      }
  }

  return (
    <Modal transparent visible={isVisible} animationType="fade">
      <View style={styles.container}>
        {targetLayout && (
          <View style={[styles.highlight, { top: targetLayout.y, left: targetLayout.x, width: targetLayout.width, height: targetLayout.height }]} />
        )}
        <ThemedView style={[styles.tooltip, getTooltipStyle()]} darkColor={Colors.darkBackground} lightColor="#FFFFFF">
          <ThemedText type="defaultSemiBold" style={styles.text}>{currentStep.text}</ThemedText>
          {targetLayout && (
              <ThemedText style={{ fontSize: 24, color: Colors.gold, transform: [{ rotate: getArrowRotation() }] }}>↓</ThemedText>
          )}
          <TouchableOpacity style={styles.button} onPress={handleNextStep}>
            <ThemedText style={styles.buttonText}>{currentStepIndex === steps.length - 1 ? 'Fine' : 'Avanti'}</ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  highlight: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: Colors.gold,
    borderRadius: BorderRadius.md,
    backgroundColor: 'transparent',
  },
  tooltip: {
    position: 'absolute',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    maxWidth: '80%',
    alignItems: 'center',
  },
  tooltipCenter: {
      top: '50%' as any,
      left: '10%' as any,
      transform: [{ translateY: -50 }],
  },
  text: {
    marginBottom: Spacing.md,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  button: {
    backgroundColor: Colors.primaryGreen,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});

export default TutorialOverlay;
