import React, { useRef, useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, SafeAreaView, TextInput, FlatList, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei/native';
import * as THREE from 'three';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';

const LIKES_KEY = '@Garden3DShare:likes';
const COMMENTS_KEY = '@Garden3DShare:comments';

const Plant = (props: any) => {
  const mesh = useRef<THREE.Mesh>(null!);
  const [hovered, setHover] = useState(false);

  useFrame((state, delta) => {
    mesh.current.rotation.y += delta * 0.5;
    mesh.current.position.y = Math.sin(state.clock.elapsedTime + props.position[0]) * 0.2;
  });

  return (
    <mesh 
      {...props} 
      ref={mesh} 
      scale={hovered ? 1.2 : 1}
      onPointerOver={() => setHover(true)}
      onPointerOut={() => setHover(false)}
    >
      <coneGeometry args={[0.5, 1.5, 8]} />
      <meshStandardMaterial color={"#228B22"} emissive={hovered ? "#FFD700" : "#000"} />
    </mesh>
  );
};

const Garden3DShare = () => {
    const [likes, setLikes] = useState(0);
    const [comments, setComments] = useState<string[]>([]);
    const [commentText, setCommentText] = useState('');
    const likeButtonScale = useSharedValue(1);

    useEffect(() => {
        const loadData = async () => {
            try {
                const storedLikes = await AsyncStorage.getItem(LIKES_KEY);
                if (storedLikes !== null) setLikes(JSON.parse(storedLikes));

                const storedComments = await AsyncStorage.getItem(COMMENTS_KEY);
                if (storedComments !== null) setComments(JSON.parse(storedComments));
            } catch (e) {
                Alert.alert("Errore", "Impossibile caricare i dati salvati.");
            }
        };
        loadData();
    }, []);

    useEffect(() => {
        const saveData = async () => {
            try {
                await AsyncStorage.setItem(LIKES_KEY, JSON.stringify(likes));
            } catch (e) {
                 Alert.alert("Errore", "Impossibile salvare i like.");
            }
        };
        saveData();
    }, [likes]);

    useEffect(() => {
        const saveData = async () => {
            try {
                await AsyncStorage.setItem(COMMENTS_KEY, JSON.stringify(comments));
            } catch (e) {
                 Alert.alert("Errore", "Impossibile salvare i commenti.");
            }
        };
        if(comments.length > 0) saveData();
    }, [comments]);

    const handleLike = () => {
        setLikes(prevLikes => prevLikes + 1);
        likeButtonScale.value = withSpring(1.2, { damping: 2, stiffness: 80 }, () => {
            likeButtonScale.value = withSpring(1);
        });
    };

    const handleAddComment = () => {
        if (commentText.trim()) {
            setComments(prevComments => [...prevComments, commentText.trim()]);
            setCommentText('');
        }
    };

    const animatedStyle = useAnimatedStyle(() => {
        return {
            transform: [{ scale: likeButtonScale.value }],
        };
    });

  return (
    <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
            <Text style={styles.title}>Giardino 3D Condiviso</Text>
            <Canvas style={styles.canvas}>
                <ambientLight intensity={0.8} />
                <spotLight position={[10, 15, 10]} angle={0.2} penumbra={1} intensity={2} castShadow />
                <pointLight position={[-10, -10, -10]} intensity={1.5}/>
                <PerspectiveCamera makeDefault position={[0, 6, 14]} fov={75} />
                <OrbitControls enableZoom={true} enablePan={true} />
                <Plant position={[0, 0, 0]} />
                <Plant position={[2.5, 0, -2]} />
                <Plant position={[-2.5, 0, -2]} />
                <Plant position={[4, 0, 1]} />
                <Plant position={[-4, 0, 1]} />
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.75, 0]} receiveShadow>
                    <planeGeometry args={[20, 20]} />
                    <meshStandardMaterial color="#1a1a2e" />
                </mesh>
                 <fog attach="fog" args={['#1a1a2e', 10, 25]} />
            </Canvas>
            <View style={styles.uiContainer}>
                <View style={styles.interactionBar}>
                    <Animated.View style={[animatedStyle]}>
                        <TouchableOpacity onPress={handleLike} style={styles.interactionButton}>
                            <Text style={styles.buttonText}>💚 {likes}</Text>
                        </TouchableOpacity>
                    </Animated.View>
                    <TouchableOpacity onPress={() => Alert.alert("Condiviso!", "Il tuo giardino è stato condiviso.")} style={[styles.interactionButton, {backgroundColor: '#FFD700'}]}>
                        <Text style={[styles.buttonText, {color: '#1a1a2e'}]}>Condividi</Text>
                    </TouchableOpacity>
                </View>
                <FlatList
                    data={comments}
                    renderItem={({ item }) => <Text style={styles.commentText}>- {item}</Text>}
                    keyExtractor={(item, index) => index.toString()}
                    style={styles.commentList}
                    ListHeaderComponent={<Text style={styles.commentsTitle}>Commenti</Text>}
                />
                <View style={styles.commentInputContainer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Lascia un commento..."
                        placeholderTextColor="#888"
                        value={commentText}
                        onChangeText={setCommentText}
                    />
                    <TouchableOpacity onPress={handleAddComment} style={styles.sendButton}>
                        <Text style={styles.sendButtonText}>Invia</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  title: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 15,
    fontFamily: Platform.OS === 'ios' ? 'Avenir-Heavy' : 'Roboto',
  },
  canvas: {
      flex: 0.6,
  },
  uiContainer: {
      flex: 0.4,
      paddingHorizontal: 20,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      backgroundColor: 'rgba(0,0,0,0.2)',
      paddingTop: 10,
  },
  interactionBar: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'center',
      paddingVertical: 10,
  },
  interactionButton: {
      backgroundColor: '#228B22',
      paddingVertical: 12,
      paddingHorizontal: 25,
      borderRadius: 25,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
  },
  buttonText: {
      color: '#FFFFFF',
      fontWeight: 'bold',
      fontSize: 16,
  },
  commentsTitle: {
      color: '#FFD700',
      fontSize: 18,
      fontWeight: '600',
      marginBottom: 10,
  },
  commentList: {
      flex: 1,
      marginTop: 5,
  },
  commentText: {
      color: '#fff',
      fontSize: 15,
      marginBottom: 8,
      fontStyle: 'italic',
  },
  commentInputContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderTopWidth: 1,
      borderTopColor: '#3a3a4e',
      paddingVertical: 10,
      marginBottom: 5,
  },
  input: {
      flex: 1,
      height: 45,
      backgroundColor: '#2a2a3e',
      borderRadius: 22,
      paddingHorizontal: 15,
      color: '#fff',
      marginRight: 10,
      fontSize: 16,
  },
  sendButton: {
      backgroundColor: '#228B22',
      paddingVertical: 12,
      paddingHorizontal: 18,
      borderRadius: 22,
  },
  sendButtonText: {
      color: '#fff',
      fontWeight: 'bold',
      fontSize: 16,
  }
});

export default Garden3DShare;
