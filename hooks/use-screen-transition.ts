import { useCallback, useEffect } from 'react';
import { useSharedValue, withTiming, withSpring, withSequence, Easing, runOnJS } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

export type TransitionType = 'fade' | 'slide' | 'scale' | 'flip' | 'bounce';

interface TransitionConfig {
  duration?: number;
  type?: TransitionType;
  haptic?: boolean;
}

export function useScreenTransition(config: TransitionConfig = {}) {
  const { duration = 300, type = 'fade', haptic = true } = config;
  
  const opacity = useSharedValue(0);
  const translateX = useSharedValue(50);
  const translateY = useSharedValue(30);
  const scale = useSharedValue(0.9);
  const rotateY = useSharedValue(90);

  const triggerHaptic = useCallback(() => {
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [haptic]);

  const animateIn = useCallback(() => {
    const timingConfig = { duration, easing: Easing.out(Easing.cubic) };
    const springConfig = { damping: 15, stiffness: 150 };
    
    switch (type) {
      case 'fade':
        opacity.value = withTiming(1, timingConfig);
        break;
      case 'slide':
        opacity.value = withTiming(1, timingConfig);
        translateX.value = withSpring(0, springConfig);
        break;
      case 'scale':
        opacity.value = withTiming(1, timingConfig);
        scale.value = withSpring(1, springConfig);
        break;
      case 'flip':
        opacity.value = withTiming(1, timingConfig);
        rotateY.value = withSpring(0, springConfig);
        break;
      case 'bounce':
        opacity.value = withTiming(1, timingConfig);
        scale.value = withSequence(
          withTiming(1.1, { duration: duration * 0.4 }),
          withSpring(1, springConfig)
        );
        translateY.value = withSequence(
          withTiming(-10, { duration: duration * 0.3 }),
          withSpring(0, springConfig)
        );
        break;
    }
    
    runOnJS(triggerHaptic)();
  }, [type, duration, opacity, translateX, translateY, scale, rotateY, triggerHaptic]);

  const animateOut = useCallback((onComplete?: () => void) => {
    const timingConfig = { duration: duration * 0.5, easing: Easing.in(Easing.cubic) };
    
    switch (type) {
      case 'fade':
        opacity.value = withTiming(0, timingConfig, () => {
          if (onComplete) runOnJS(onComplete)();
        });
        break;
      case 'slide':
        opacity.value = withTiming(0, timingConfig);
        translateX.value = withTiming(-50, timingConfig, () => {
          if (onComplete) runOnJS(onComplete)();
        });
        break;
      case 'scale':
        opacity.value = withTiming(0, timingConfig);
        scale.value = withTiming(0.8, timingConfig, () => {
          if (onComplete) runOnJS(onComplete)();
        });
        break;
      default:
        opacity.value = withTiming(0, timingConfig, () => {
          if (onComplete) runOnJS(onComplete)();
        });
    }
  }, [type, duration, opacity, translateX, scale]);

  const reset = useCallback(() => {
    opacity.value = 0;
    translateX.value = 50;
    translateY.value = 30;
    scale.value = 0.9;
    rotateY.value = 90;
  }, [opacity, translateX, translateY, scale, rotateY]);

  useEffect(() => {
    animateIn();
  }, []);

  const getAnimatedStyle = useCallback(() => {
    switch (type) {
      case 'fade':
        return { opacity: opacity.value };
      case 'slide':
        return { opacity: opacity.value, transform: [{ translateX: translateX.value }] };
      case 'scale':
        return { opacity: opacity.value, transform: [{ scale: scale.value }] };
      case 'flip':
        return { opacity: opacity.value, transform: [{ perspective: 1000 }, { rotateY: `${rotateY.value}deg` }] };
      case 'bounce':
        return { opacity: opacity.value, transform: [{ scale: scale.value }, { translateY: translateY.value }] };
      default:
        return { opacity: opacity.value };
    }
  }, [type, opacity, translateX, translateY, scale, rotateY]);

  return {
    opacity,
    translateX,
    translateY,
    scale,
    rotateY,
    animateIn,
    animateOut,
    reset,
    getAnimatedStyle,
  };
}

// Staggered list animation hook
export function useStaggeredList(itemCount: number, staggerDelay: number = 50) {
  const animations = Array.from({ length: itemCount }, () => ({
    opacity: useSharedValue(0),
    translateY: useSharedValue(20),
  }));

  const animateIn = useCallback(() => {
    animations.forEach((anim, index) => {
      const delay = index * staggerDelay;
      anim.opacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.cubic) });
      anim.translateY.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.cubic) });
    });
  }, [animations, staggerDelay]);

  const getItemStyle = useCallback((index: number) => {
    if (index >= animations.length) return {};
    return {
      opacity: animations[index].opacity.value,
      transform: [{ translateY: animations[index].translateY.value }],
    };
  }, [animations]);

  useEffect(() => {
    const timeout = setTimeout(animateIn, 100);
    return () => clearTimeout(timeout);
  }, []);

  return { getItemStyle, animateIn };
}

// Pulse animation for buttons
export function usePulseAnimation() {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const pulse = useCallback(() => {
    scale.value = withSequence(
      withTiming(1.05, { duration: 100 }),
      withSpring(1, { damping: 10, stiffness: 200 })
    );
    opacity.value = withSequence(
      withTiming(0.8, { duration: 100 }),
      withTiming(1, { duration: 100 })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [scale, opacity]);

  const getStyle = useCallback(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }), [scale, opacity]);

  return { pulse, getStyle, scale, opacity };
}

// Shake animation for errors
export function useShakeAnimation() {
  const translateX = useSharedValue(0);

  const shake = useCallback(() => {
    translateX.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 })
    );
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  }, [translateX]);

  const getStyle = useCallback(() => ({
    transform: [{ translateX: translateX.value }],
  }), [translateX]);

  return { shake, getStyle, translateX };
}

export default useScreenTransition;
