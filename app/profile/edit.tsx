import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, Pressable, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import CustomHeader from '@/components/CustomHeader';

export default function EditProfileFieldScreen() {
  const { field, title, description, value } = useLocalSearchParams<{ 
    field: string; 
    title: string; 
    description: string; 
    value: string;
  }>();
  
  const { colors } = useTheme();
  const { updateUser, actionLoading } = useAuth();
  const router = useRouter();
  
  const [newValue, setNewValue] = useState(value || '');

  const handleSave = async () => {
    try {
      await updateUser({ [field as string]: newValue });
      router.back();
    } catch (error) {
      console.error('Save failed:', error);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CustomHeader title={title} />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Text style={[styles.description, { color: colors.textMuted }]}>
            {description}
          </Text>
          
          <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <TextInput
              style={[styles.input, { color: colors.text }]}
              value={newValue}
              onChangeText={setNewValue}
              placeholder={`Enter ${title.toLowerCase()}...`}
              placeholderTextColor={colors.textMuted}
              autoFocus
              multiline={field === 'about'}
            />
          </View>

          <Pressable 
            style={({ pressed }) => [
              styles.saveBtn, 
              { backgroundColor: colors.primary },
              (pressed || actionLoading) && { opacity: 0.8 }
            ]}
            onPress={handleSave}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <Text style={styles.saveBtnText}>Save</Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  inputContainer: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 32,
  },
  input: {
    fontSize: 16,
    fontWeight: '500',
    minHeight: 24,
  },
  saveBtn: {
    height: 56,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    // Shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
});
