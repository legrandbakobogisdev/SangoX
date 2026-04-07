import React, { useState } from 'react';
import { StyleSheet, View, Text, Pressable, TextInput, Dimensions, KeyboardAvoidingView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons, Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

export default function CreateStatusScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | null>(null);

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [9, 16],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {/* Background: Image if picked, otherwise dark */}
      {image ? (
        <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#0f3460' }]} />
      )}

      <BlurView intensity={20} style={StyleSheet.absoluteFill} tint="dark" />

      <KeyboardAvoidingView 
        style={[styles.safeArea, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 10) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? -insets.bottom : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#FFF" />
          </Pressable>
          <Text style={styles.headerTitle}>Nouveau Statut</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Content Area */}
        <View style={styles.content}>
          <TextInput
            style={styles.textInput}
            placeholder="Quoi de neuf ?"
            placeholderTextColor="rgba(255,255,255,0.5)"
            multiline
            value={text}
            onChangeText={setText}
            autoFocus={false}
          />
        </View>

        {/* Bottom Bar */}
        <View style={styles.bottomBar}>
          <View style={styles.tools}>
            <Pressable style={styles.toolBtn} onPress={pickImage}>
              <Feather name="image" size={24} color="#FFF" />
            </Pressable>
            <Pressable style={styles.toolBtn}>
              <Ionicons name="text" size={24} color="#FFF" />
            </Pressable>
            <Pressable style={styles.toolBtn}>
              <Ionicons name="color-palette-outline" size={24} color="#FFF" />
            </Pressable>
          </View>

          <Pressable 
            style={[styles.publishBtn, { opacity: (text || image) ? 1 : 0.5 }]}
            disabled={!text && !image}
            onPress={() => router.back()}
          >
            <Text style={styles.publishText}>Publier</Text>
            <Ionicons name="paper-plane" size={18} color="#000" style={{ marginLeft: 8 }} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    height: 60,
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  closeBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  textInput: {
    color: '#FFF',
    fontSize: 32,
    fontWeight: '500',
    textAlign: 'center',
    width: '100%',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  tools: {
    flexDirection: 'row',
    gap: 20,
  },
  toolBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  publishText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '700',
  },
});
