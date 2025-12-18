import React, { useState, useEffect, useRef, Suspense } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, Text as DreiText } from '@react-three/drei/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import * as THREE from 'three';

// --- THEME COLORS ---
const COLORS = {
  background: '#1a1a2e',
  primary: '#228B22', // Verde
  accent: '#FFD700',   // Oro
  text: '#FFFFFF',
};

// --- TUTORIAL STEPS ---
const tutorialSteps = [
  {
    title: 'Benvenuto nella Guida 3D',
    description: 'Questo è il Codex Interattivo. Usa le dita per ruotare, zoomare e muovere l\'oggetto 3D.',
    modelAction: 'rotate',
  },
  {
    title: 'Analisi dei Componenti',
    description: 'Tocca le diverse parti del modello per ottenere informazioni dettagliate. Prova a toccare il cubo.',
    modelAction: 'highlight',
  },
  {
    title: 'Animazioni Step-by-Step',
    description: 'Osserva come l\'oggetto si anima per mostrare il suo funzionamento. L\'animazione si avvierà a breve.',
    modelAction: 'animate',
  },
  {
    title: 'Salvataggio Progressi',
    description: 'I tuoi progressi nel tutorial vengono salvati automaticamente. Chiudi e riapri per vedere.',
    modelAction: 'idle',
  },
];

// --- 3D COMPONENT ---
const InteractiveModel = ({ modelAction, onObjectPress }) => {
  const meshRef = useRef<THREE.Mesh>(null!);
  const [isPressed, setIsPressed] = useState(false);

  useFrame((state, delta) => {
    if (meshRef.current) {
      if (modelAction === 'rotate') {
        meshRef.current.rotation.y += delta * 0.5;
        meshRef.current.rotation.x += delta * 0.2;
      } else if (modelAction === 'animate') {
        meshRef.current.scale.x = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        meshRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
        meshRef.current.scale.z = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.2;
      } else {
        meshRef.current.rotation.y = withTiming(0);
        meshRef.current.rotation.x = withTiming(0);
        meshRef.current.scale.set(1, 1, 1);
      }
    }
  });

  const handlePress = () => {
    setIsPressed(!isPressed);
    onObjectPress('Cubo Principale');
  };

  return (
    <mesh ref={meshRef} position={[0, 0, 0]} onClick={handlePress} scale={isPressed ? 1.2 : 1}>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color={modelAction === 'highlight' && isPressed ? COLORS.accent : COLORS.primary} wireframe={false} />
    </mesh>
  );
};

// --- MAIN COMPONENT ---
const CodexGuide3D = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [info, setInfo] = useState('');

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ translateY: translateY.value }],
    };
  });

  useEffect(() => {
    const loadProgress = async () => {
      try {
        const savedStep = await AsyncStorage.getItem('@codexGuideStep');
        if (savedStep !== null) {
          setCurrentStep(parseInt(savedStep, 10));
        }
      } catch (e) {
        console.error('Failed to load progress.', e);
      } finally {
        setIsLoading(false);
        animateIn();
      }
    };
    loadProgress();
  }, []);

  useEffect(() => {
    const saveProgress = async () => {
      try {
        await AsyncStorage.setItem('@codexGuideStep', currentStep.toString());
      } catch (e) {
        console.error('Failed to save progress.', e);
      }
    };
    if (!isLoading) {
      saveProgress();
      animateIn();
    }
  }, [currentStep, isLoading]);

  const animateIn = () => {
    opacity.value = withTiming(0, { duration: 150 }, () => {
        translateY.value = withTiming(20, { duration: 150 }, () => {
            opacity.value = withTiming(1, { duration: 500, easing: Easing.out(Easing.ease) });
            translateY.value = withTiming(0, { duration: 500, easing: Easing.out(Easing.ease) });
        });
    });
  };

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      setInfo('');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setInfo('');
    }
  };

  const handleObjectPress = (objectName: string) => {
    if (tutorialSteps[currentStep].modelAction === 'highlight') {
      setInfo(`Hai selezionato: ${objectName}. Questo componente è cruciale per...`);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.canvasContainer}>
        <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
          <ambientLight intensity={0.8} />
          <pointLight position={[10, 10, 10]} intensity={1} />
          <Suspense fallback={null}>
            <InteractiveModel modelAction={tutorialSteps[currentStep].modelAction} onObjectPress={handleObjectPress} />
            <DreiText position={[0, 2.5, 0]} color={COLORS.accent} fontSize={0.5} anchorX="center" anchorY="middle">
              Codex Guide
            </DreiText>
          </Suspense>
          <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
        </Canvas>
      </View>
      <Animated.View style={[styles.tutorialContainer, animatedStyle]}>
        <Text style={styles.title}>{tutorialSteps[currentStep].title}</Text>
        <Text style={styles.description}>{tutorialSteps[currentStep].description}</Text>
        {info ? <Text style={styles.infoText}>{info}</Text> : null}
        <View style={styles.navigationContainer}>
          <TouchableOpacity style={styles.button} onPress={handlePrev} disabled={currentStep === 0}>
            <Text style={[styles.buttonText, currentStep === 0 && styles.disabledButtonText]}>Indietro</Text>
          </TouchableOpacity>
          <Text style={styles.stepIndicator}>{`${currentStep + 1} / ${tutorialSteps.length}`}</Text>
          <TouchableOpacity style={styles.button} onPress={handleNext} disabled={currentStep === tutorialSteps.length - 1}>
            <Text style={[styles.buttonText, currentStep === tutorialSteps.length - 1 && styles.disabledButtonText]}>Avanti</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  canvasContainer: {
    flex: 3,
  },
  tutorialContainer: {
    flex: 2,
    padding: 20,
    backgroundColor: '#2a2a3e',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.accent,
    marginBottom: 10,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  infoText: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: 15,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 25,
  },
  buttonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButtonText: {
    color: '#a9a9a9',
  },
  stepIndicator: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: 'bold',
  },
});

export default CodexGuide3D;
