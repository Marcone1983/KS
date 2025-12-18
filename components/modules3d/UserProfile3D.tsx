import React, { useRef, useState, useEffect, Suspense } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, Text as DreiText, Box, Sphere, Torus } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

// Theme Colors
const COLORS = {
  background: '#1a1a2e',
  primary: '#228B22', // Green
  accent: '#FFD700',   // Gold
  text: '#FFFFFF'
};

// --- 3D Components ---

const Avatar = () => {
  const mesh = useRef<THREE.Mesh>(null!);
  useFrame((state, delta) => (mesh.current.rotation.y += delta * 0.5));

  return (
    <group>
        <Sphere ref={mesh} args={[1, 32, 32]}>
            <meshStandardMaterial color={COLORS.primary} wireframe />
        </Sphere>
        <DreiText position={[0, 1.5, 0]} color={COLORS.text} fontSize={0.3} anchorX="center" anchorY="middle">
            Player 1
        </DreiText>
    </group>
  );
};

const StatChart = () => {
    const group = useRef<THREE.Group>(null!);
    useFrame((state, delta) => (group.current.rotation.y += delta * 0.3));

    return (
        <group ref={group}>
            {[...Array(5)].map((_, i) => (
                <Box key={i} args={[0.2, Math.random() * 2 + 0.5, 0.2]} position={[(i - 2) * 0.5, 0, 0]}>
                    <meshStandardMaterial color={i % 2 === 0 ? COLORS.primary : COLORS.accent} />
                </Box>
            ))}
        </group>
    );
};

const AchievementBadge = ({ position, texture }: { position: [number, number, number], texture?: THREE.Texture }) => {
    const mesh = useRef<THREE.Mesh>(null!);
    const [isHovered, setIsHovered] = useState(false);
    useFrame((state, delta) => {
        mesh.current.rotation.y += delta * 0.5;
        mesh.current.rotation.x = withTiming(isHovered ? Math.PI / 4 : 0);
    });

    return (
        <Torus ref={mesh} args={[0.5, 0.1, 16, 100]} position={position} onPointerOver={() => setIsHovered(true)} onPointerOut={() => setIsHovered(false)}>
            <meshStandardMaterial color={isHovered ? 'hotpink' : COLORS.accent} map={texture} />
        </Torus>
    );
};

// --- UI Components ---

const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeaderText}>{title}</Text>
);

const ActivityItem = ({ activity }: { activity: string }) => {
    const opacity = useSharedValue(0);
    const translateY = useSharedValue(20);

    useEffect(() => {
        opacity.value = withTiming(1, { duration: 500 });
        translateY.value = withTiming(0, { duration: 500 });
    }, []);

    const animatedStyle = useAnimatedStyle(() => {
        return {
            opacity: opacity.value,
            transform: [{ translateY: translateY.value }]
        };
    });

    return (
        <Animated.View style={[styles.activityItem, animatedStyle]}>
            <Text style={styles.activityText}>{activity}</Text>
        </Animated.View>
    );
};

// --- Main Component ---

const UserProfile3D = () => {
    const [username, setUsername] = useState('Player 1');
    const [activities, setActivities] = useState([
        'Completed Level 10',
        'Unlocked a new skin',
        'Achieved a 5-day streak'
    ]);

    useEffect(() => {
        const loadData = async () => {
            try {
                const storedUsername = await AsyncStorage.getItem('username');
                if (storedUsername) setUsername(storedUsername);
            } catch (e) {
                console.error("Failed to load username.", e);
            }
        };
        loadData();
    }, []);

    const handleSaveUsername = async () => {
        try {
            await AsyncStorage.setItem('username', 'NewPlayer');
            setUsername('NewPlayer');
        } catch (e) {
            console.error("Failed to save username.", e);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <SectionHeader title="3D Avatar" />
            <View style={styles.canvasContainer}>
                <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <Suspense fallback={null}>
                        <Avatar />
                    </Suspense>
                    <OrbitControls enableZoom={false} />
                </Canvas>
            </View>

            <SectionHeader title="Animated Stats" />
            <View style={styles.canvasContainer}>
                <Canvas camera={{ position: [0, 2, 5], fov: 50 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <Suspense fallback={null}>
                        <StatChart />
                    </Suspense>
                    <OrbitControls enableZoom={false} />
                </Canvas>
            </View>

            <SectionHeader title="Rotatable Badges" />
            <View style={styles.canvasContainer}>
                <Canvas camera={{ position: [0, 0, 8], fov: 50 }}>
                    <ambientLight intensity={0.5} />
                    <pointLight position={[10, 10, 10]} />
                    <Suspense fallback={null}>
                        <AchievementBadge position={[-2, 0, 0]} />
                        <AchievementBadge position={[0, 0, 0]} />
                        <AchievementBadge position={[2, 0, 0]} />
                    </Suspense>
                    <OrbitControls enableZoom={false} />
                </Canvas>
            </View>

            <SectionHeader title="Activity History" />
            <View style={styles.activityContainer}>
                {activities.map((activity, index) => (
                    <ActivityItem key={index} activity={activity} />
                ))}
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSaveUsername}>
                <Text style={styles.buttonText}>Save Username</Text>
            </TouchableOpacity>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    canvasContainer: {
        width: width,
        height: 300,
        backgroundColor: '#000',
        marginBottom: 20,
    },
    sectionHeaderText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
        fontFamily: 'System', // iOS-style
    },
    activityContainer: {
        paddingHorizontal: 20,
    },
    activityItem: {
        backgroundColor: '#2a2a3e',
        padding: 15,
        borderRadius: 10,
        marginBottom: 10,
    },
    activityText: {
        color: COLORS.text,
        fontSize: 16,
    },
    button: {
        backgroundColor: COLORS.primary,
        padding: 15,
        borderRadius: 10,
        margin: 20,
        alignItems: 'center',
    },
    buttonText: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default UserProfile3D;
