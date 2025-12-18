// @ts-nocheck
import React, { Suspense, useState, useMemo, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator, SafeAreaView, Dimensions } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing } from 'react-native-reanimated';
import * as THREE from 'three';

// --- THEME COLORS ---
const COLORS = {
  background: '#1a1a2e',
  text: '#FFFFFF',
  primary: '#228B22', // Verde
  accent: '#FFD700',   // Oro
  card: '#2c2c54',
  placeholder: '#888',
};

// --- DUMMY DATA ---
const ENCYCLOPEDIA_DATA = [
  {
    id: '1',
    name: 'Drago Antico',
    category: 'Creature Mitiche',
    description: 'Un potente drago dalle scaglie dure come la roccia e un soffio di fuoco devastante. Vive nelle montagne più alte e sorveglia tesori dimenticati.',
    modelPath: 'dragon.glb', // Placeholder path
    scale: 0.1,
    stats: { Attacco: 95, Difesa: 80, Velocità: 70, Magia: 90 },
  },
  {
    id: '2',
    name: 'Golem di Cristallo',
    category: 'Costrutti Elementali',
    description: 'Un costrutto animato dalla magia elementale della terra. Il suo corpo di cristallo rifrange la luce, accecando i nemici, ed è quasi impenetrabile.',
    modelPath: 'golem.glb', // Placeholder path
    scale: 0.08,
    stats: { Attacco: 70, Difesa: 98, Velocità: 30, Magia: 50 },
  },
  {
    id: '3',
    name: 'Fenice Dorata',
    category: 'Creature Mitiche',
    description: 'Un uccello immortale che rinasce dalle proprie ceneri. Le sue lacrime hanno poteri curativi e il suo canto infonde coraggio.',
    modelPath: 'phoenix.glb', // Placeholder path
    scale: 0.12,
    stats: { Attacco: 60, Difesa: 65, Velocità: 95, Magia: 98 },
  },
];

// --- 3D MODEL COMPONENT ---
const Model = ({ modelPath, scale }) => {
  const meshRef = useRef();
  // Since we can't load external .glb files, we'll create a procedural geometry
  // as a stand-in for each creature.

  const geometry = useMemo(() => {
    switch (modelPath) {
      case 'dragon.glb':
        return new THREE.TorusKnotGeometry(10, 3, 100, 16);
      case 'golem.glb':
        return new THREE.BoxGeometry(15, 15, 15);
      case 'phoenix.glb':
        return new THREE.ConeGeometry(10, 20, 32);
      default:
        return new THREE.SphereGeometry(10, 32, 32);
    }
  }, [modelPath]);

  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.5;
    }
  });

  return (
    <mesh ref={meshRef} scale={scale} geometry={geometry}>
      <meshStandardMaterial color={COLORS.accent} roughness={0.3} metalness={0.8} />
    </mesh>
  );
};

// --- LIST ITEM COMPONENT ---
const ListItem = ({ item, onPress }) => (
  <TouchableOpacity onPress={onPress} style={styles.listItemContainer}>
    <View style={styles.listItemTextContainer}>
        <Text style={styles.listItemTitle}>{item.name}</Text>
        <Text style={styles.listItemCategory}>{item.category}</Text>
    </View>
    <Text style={styles.arrow}>›</Text>
  </TouchableOpacity>
);

// --- MAIN COMPONENT ---
const Encyclopedia3D = () => {
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState([]);

  const detailOpacity = useSharedValue(0);
  const detailTransform = useSharedValue(30);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const favs = await AsyncStorage.getItem('encyclopedia_favorites');
        if (favs !== null) {
          setFavorites(JSON.parse(favs));
        }
      } catch (e) {
        console.error('Failed to load favorites.', e);
      }
    };
    loadFavorites();
  }, []);

  const handleSelectItem = (item) => {
    setSelectedItem(item);
    detailOpacity.value = withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) });
    detailTransform.value = withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) });
  };

  const handleCloseDetail = () => {
    detailOpacity.value = withTiming(0, { duration: 400 });
    detailTransform.value = withTiming(30, { duration: 400 });
    setTimeout(() => setSelectedItem(null), 400);
  };

  const filteredData = useMemo(() =>
    ENCYCLOPEDIA_DATA.filter(item =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase())
    ), [searchTerm]);

  const animatedDetailStyle = useAnimatedStyle(() => ({
    opacity: detailOpacity.value,
    transform: [{ translateY: detailTransform.value }],
  }));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Enciclopedia</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Cerca creatura o categoria..."
          placeholderTextColor={COLORS.placeholder}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <FlatList
        data={filteredData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ListItem item={item} onPress={() => handleSelectItem(item)} />}
        contentContainerStyle={styles.listContent}
      />

      {selectedItem && (
        <Animated.View style={[styles.detailContainer, animatedDetailStyle]}>
            <TouchableOpacity style={styles.closeButton} onPress={handleCloseDetail}>
                <Text style={styles.closeButtonText}>Chiudi</Text>
            </TouchableOpacity>

            <View style={styles.modelContainer}>
                <Canvas camera={{ position: [0, 0, 40], fov: 50 }}>
                    <ambientLight intensity={0.8} />
                    <pointLight position={[10, 10, 10]} intensity={1} />
                    <Suspense fallback={<ActivityIndicator color={COLORS.accent} />}>
                        <Model modelPath={selectedItem.modelPath} scale={selectedItem.scale} />
                        <Environment preset="night" />
                    </Suspense>
                    <OrbitControls enableZoom={true} enablePan={false} />
                </Canvas>
            </View>

            <View style={styles.detailContent}>
                <Text style={styles.detailTitle}>{selectedItem.name}</Text>
                <Text style={styles.detailCategory}>{selectedItem.category}</Text>
                <Text style={styles.detailDescription}>{selectedItem.description}</Text>
                <View style={styles.statsContainer}>
                    {Object.entries(selectedItem.stats).map(([key, value]) => (
                        <View key={key} style={styles.statItem}>
                            <Text style={styles.statKey}>{key}</Text>
                            <Text style={styles.statValue}>{value}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Animated.View>
      )}
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.primary,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.text,
    textAlign: 'center',
  },
  searchContainer: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  searchInput: {
    backgroundColor: COLORS.card,
    color: COLORS.text,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  listItemContainer: {
    backgroundColor: COLORS.card,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  listItemTextContainer: {},
  listItemTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
  },
  listItemCategory: {
    fontSize: 14,
    color: COLORS.accent,
    marginTop: 4,
  },
  arrow: {
    fontSize: 24,
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  detailContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    zIndex: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 20,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  closeButtonText: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modelContainer: {
    height: '45%',
    width: '100%',
    backgroundColor: '#11111f',
  },
  detailContent: {
    flex: 1,
    padding: 20,
  },
  detailTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 5,
  },
  detailCategory: {
    fontSize: 16,
    color: COLORS.accent,
    marginBottom: 15,
    fontStyle: 'italic',
  },
  detailDescription: {
    fontSize: 16,
    color: COLORS.text,
    lineHeight: 24,
  },
  statsContainer: {
    marginTop: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
  },
  statItem: {
    backgroundColor: COLORS.card,
    borderRadius: 8,
    padding: 10,
    alignItems: 'center',
    width: '45%',
    marginBottom: 10,
  },
  statKey: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 20,
    color: COLORS.text,
    fontWeight: 'bold',
    marginTop: 5,
  },
});

export default Encyclopedia3D;
