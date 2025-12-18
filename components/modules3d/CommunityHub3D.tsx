import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList, TextInput, ScrollView } from 'react-native';
import { Canvas, useFrame } from '@react-three/fiber/native';
import { PerspectiveCamera, OrbitControls, Text as DreiText, Sparkles } from '@react-three/drei/native';
import * as THREE from 'three';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, Easing } from 'react-native-reanimated';

const { width, height } = Dimensions.get('window');

const THEME = {
  background: '#1a1a2e',
  primary: '#228B22',
  accent: '#FFD700',
  text: '#FFFFFF',
  cardBg: '#2a2a4e',
  inputBg: '#3a3a5e',
};

interface Guild {
  id: string;
  name: string;
  emblemColor: string;
  members: number;
  level: number;
}

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
  timestamp: Date;
}

interface CommunityEvent {
  id: string;
  title: string;
  description: string;
  startDate: Date;
  endDate: Date;
  participants: number;
}

// 3D Guild Emblem Component
function GuildEmblem3D({ color, isSelected }: { color: string; isSelected: boolean }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.1;
    }
    if (ringRef.current && isSelected) {
      ringRef.current.rotation.z += 0.02;
    }
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial color={color} metalness={0.8} roughness={0.2} />
      </mesh>
      {isSelected && (
        <mesh ref={ringRef}>
          <torusGeometry args={[0.7, 0.05, 16, 100]} />
          <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={0.5} />
        </mesh>
      )}
      <Sparkles count={20} scale={1.5} size={2} speed={0.5} color={color} />
    </group>
  );
}

// 3D Bulletin Board
function BulletinBoard3D() {
  const boardRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (boardRef.current) {
      boardRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
    }
  });

  return (
    <group ref={boardRef}>
      <mesh position={[0, 0, -0.1]}>
        <boxGeometry args={[3, 2, 0.1]} />
        <meshStandardMaterial color="#5c4033" />
      </mesh>
      <mesh position={[0, 0.7, 0]}>
        <boxGeometry args={[2.5, 0.3, 0.05]} />
        <meshStandardMaterial color="#f5f5dc" />
      </mesh>
      <DreiText position={[0, 0.7, 0.03]} fontSize={0.15} color={THEME.primary}>
        Community Board
      </DreiText>
      {[-0.5, 0, 0.5].map((y, i) => (
        <mesh key={i} position={[0, y - 0.2, 0.02]}>
          <planeGeometry args={[2.2, 0.25]} />
          <meshStandardMaterial color="#fffacd" />
        </mesh>
      ))}
    </group>
  );
}

// Guild Card Component
function GuildCard({ guild, isSelected, onSelect }: { guild: Guild; isSelected: boolean; onSelect: () => void }) {
  const scale = useSharedValue(1);
  
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <TouchableOpacity onPress={onSelect} activeOpacity={0.8}>
      <Animated.View style={[styles.guildCard, isSelected && styles.guildCardSelected, animatedStyle]}>
        <View style={styles.guildEmblemContainer}>
          <Canvas style={styles.emblemCanvas}>
            <ambientLight intensity={0.5} />
            <pointLight position={[5, 5, 5]} intensity={1} />
            <PerspectiveCamera makeDefault position={[0, 0, 2]} />
            <GuildEmblem3D color={guild.emblemColor} isSelected={isSelected} />
          </Canvas>
        </View>
        <View style={styles.guildInfo}>
          <Text style={styles.guildName}>{guild.name}</Text>
          <Text style={styles.guildStats}>Level {guild.level} • {guild.members} members</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Chat Message Component
function ChatMessageItem({ message }: { message: ChatMessage }) {
  return (
    <View style={styles.chatMessage}>
      <Text style={styles.chatSender}>{message.sender}</Text>
      <Text style={styles.chatText}>{message.message}</Text>
      <Text style={styles.chatTime}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

// Event Card Component
function EventCard({ event }: { event: CommunityEvent }) {
  return (
    <View style={styles.eventCard}>
      <Text style={styles.eventTitle}>{event.title}</Text>
      <Text style={styles.eventDescription}>{event.description}</Text>
      <View style={styles.eventFooter}>
        <Text style={styles.eventParticipants}>{event.participants} participants</Text>
        <TouchableOpacity style={styles.joinButton}>
          <Text style={styles.joinButtonText}>Join</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function CommunityHub3D() {
  const [activeTab, setActiveTab] = useState<'guilds' | 'chat' | 'events' | 'board'>('guilds');
  const [selectedGuild, setSelectedGuild] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', sender: 'PlantMaster', message: 'Anyone want to trade rare seeds?', timestamp: new Date() },
    { id: '2', sender: 'GreenThumb', message: 'I have some legendary fertilizer!', timestamp: new Date() },
    { id: '3', sender: 'PestSlayer', message: 'Just beat wave 50!', timestamp: new Date() },
  ]);
  const [guilds] = useState<Guild[]>([
    { id: '1', name: 'Green Warriors', emblemColor: '#228B22', members: 150, level: 25 },
    { id: '2', name: 'Golden Harvesters', emblemColor: '#FFD700', members: 89, level: 18 },
    { id: '3', name: 'Shadow Gardeners', emblemColor: '#8B008B', members: 67, level: 15 },
    { id: '4', name: 'Fire Farmers', emblemColor: '#FF4500', members: 234, level: 32 },
  ]);
  const [events] = useState<CommunityEvent[]>([
    { id: '1', title: 'Weekend Pest Hunt', description: 'Compete to kill the most pests!', startDate: new Date(), endDate: new Date(), participants: 1250 },
    { id: '2', title: 'Breeding Championship', description: 'Create the rarest plant hybrid', startDate: new Date(), endDate: new Date(), participants: 890 },
  ]);

  const sendMessage = () => {
    if (chatInput.trim()) {
      const newMessage: ChatMessage = {
        id: Date.now().toString(),
        sender: 'You',
        message: chatInput,
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      setChatInput('');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'guilds':
        return (
          <FlatList
            data={guilds}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <GuildCard
                guild={item}
                isSelected={selectedGuild === item.id}
                onSelect={() => setSelectedGuild(item.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
          />
        );
      case 'chat':
        return (
          <View style={styles.chatContainer}>
            <FlatList
              data={messages}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => <ChatMessageItem message={item} />}
              contentContainerStyle={styles.chatList}
            />
            <View style={styles.chatInputContainer}>
              <TextInput
                style={styles.chatTextInput}
                value={chatInput}
                onChangeText={setChatInput}
                placeholder="Type a message..."
                placeholderTextColor="#888"
              />
              <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                <Text style={styles.sendButtonText}>Send</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      case 'events':
        return (
          <FlatList
            data={events}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <EventCard event={item} />}
            contentContainerStyle={styles.listContent}
          />
        );
      case 'board':
        return (
          <View style={styles.boardContainer}>
            <Canvas style={styles.boardCanvas}>
              <ambientLight intensity={0.6} />
              <pointLight position={[5, 5, 5]} intensity={1} />
              <PerspectiveCamera makeDefault position={[0, 0, 4]} />
              <OrbitControls enableZoom={false} />
              <BulletinBoard3D />
            </Canvas>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community Hub</Text>
      
      <View style={styles.tabBar}>
        {(['guilds', 'chat', 'events', 'board'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.background,
    paddingTop: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: THEME.accent,
    textAlign: 'center',
    marginBottom: 20,
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: THEME.cardBg,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: THEME.primary,
  },
  tabText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: THEME.text,
  },
  listContent: {
    padding: 16,
  },
  guildCard: {
    flexDirection: 'row',
    backgroundColor: THEME.cardBg,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  guildCardSelected: {
    borderWidth: 2,
    borderColor: THEME.accent,
  },
  guildEmblemContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: 'hidden',
  },
  emblemCanvas: {
    width: 80,
    height: 80,
  },
  guildInfo: {
    flex: 1,
    marginLeft: 16,
  },
  guildName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  guildStats: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  chatContainer: {
    flex: 1,
  },
  chatList: {
    padding: 16,
  },
  chatMessage: {
    backgroundColor: THEME.cardBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  chatSender: {
    fontSize: 14,
    fontWeight: 'bold',
    color: THEME.accent,
  },
  chatText: {
    fontSize: 16,
    color: THEME.text,
    marginTop: 4,
  },
  chatTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'right',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: THEME.cardBg,
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: THEME.inputBg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: THEME.text,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: THEME.primary,
    borderRadius: 20,
    paddingHorizontal: 20,
    marginLeft: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: THEME.text,
    fontWeight: 'bold',
  },
  eventCard: {
    backgroundColor: THEME.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.accent,
  },
  eventDescription: {
    fontSize: 14,
    color: THEME.text,
    marginTop: 8,
  },
  eventFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  eventParticipants: {
    fontSize: 14,
    color: '#888',
  },
  joinButton: {
    backgroundColor: THEME.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  joinButtonText: {
    color: THEME.text,
    fontWeight: 'bold',
  },
  boardContainer: {
    flex: 1,
    margin: 16,
  },
  boardCanvas: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
});
