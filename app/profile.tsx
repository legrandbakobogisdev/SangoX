import React from 'react';
import { StyleSheet, View, Text, Pressable, Image, ScrollView, Platform, Clipboard, Alert } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'expo-router';
import { User, Camera, Copy, PencilLine, Check } from 'lucide-react-native';
import CustomHeader from '@/components/CustomHeader';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';

const ProfileField = ({ label, value, onEdit, isCopyable = false }: any) => {
  const { colors } = useTheme();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    Clipboard.setString(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <View style={[styles.fieldRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.fieldRight}>
        <Text style={[styles.fieldValue, { color: colors.textMuted }]} numberOfLines={1}>
          {value}
        </Text>
        {isCopyable ? (
          <Pressable onPress={handleCopy} style={styles.iconBtn}>
            {copied ? <Check size={18} color="#28A745" /> : <Copy size={18} color={colors.textMuted} />}
          </Pressable>
        ) : (
          <Pressable onPress={onEdit} style={styles.iconBtn}>
            <PencilLine size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default function ProfileScreen() {
  const themeContext = useTheme();
  const { colors, theme } = themeContext;
  const { user, updateUser, actionLoading } = useAuth();
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const [hasImageChanged, setHasImageChanged] = React.useState(false);

  if (!user) return null;

  const handleSaveImage = async () => {
    // In the future, this is where we would upload to Cloudinary/Backend
    // For now we just reset the 'changed' flag
    setHasImageChanged(false);
    Alert.alert(t('success'), t('profile_updated'));
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await updateUser({ profilePhotoUrl: result.assets[0].uri });
        setHasImageChanged(true);
      }
    } catch (error) {
      console.error('Image Picker Error:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const saveText = i18n.language.startsWith('fr') ? 'Sauvegarder' : 'Save';
  const uid = user?._id || user?.id || '1424903002';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Background Wallpaper */}
      {themeContext.wallpaper && (
        <Image 
          source={{ uri: themeContext.wallpaper }} 
          style={StyleSheet.absoluteFill} 
        />
      )}
      <CustomHeader 
        title="" 
        showBack={true} 
        backText="" 
        rightAction={
          <Pressable 
            disabled={!hasImageChanged || actionLoading}
            onPress={handleSaveImage}
            style={({ pressed }) => [
              { opacity: hasImageChanged ? (pressed ? 0.6 : 1) : 0.35 },
              styles.headerActionBtn
            ]}
          >
            <Text style={[styles.headerActionText, { color: colors.primary }]}>
              {saveText}
            </Text>
          </Pressable>
        }
      />
      
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarWrapper, { borderColor: colors.border }]}>
            {user.profilePhotoUrl ? (
              <Image source={{ uri: user.profilePhotoUrl }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.secondary }]}>
                <User size={60} color={colors.text} />
              </View>
            )}
            <Pressable 
              style={[styles.editAvatarBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={pickImage}
            >
              <Camera size={20} color={colors.text} />
            </Pressable>
          </View>
        </View>

        <View style={styles.contentWrap}>
           <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Your profile</Text>
           
           <View style={[styles.fieldsCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
             <ProfileField 
               label="Nickname" 
               value={user.username || '@user'} 
               onEdit={() => router.push({
                 pathname: '/profile/edit',
                 params: { field: 'username', title: 'Nickname', description: 'This nickname will be visible to your contacts in SangoX.', value: user.username }
               })} 
             />
             <ProfileField 
               label="First Name" 
               value={user.firstName || 'Not set'} 
               onEdit={() => router.push({
                 pathname: '/profile/edit',
                 params: { field: 'firstName', title: 'First Name', description: 'Your first name helps friends identify you.', value: user.firstName }
               })} 
             />
             <ProfileField 
               label="Last Name" 
               value={user.lastName || 'Not set'} 
               onEdit={() => router.push({
                 pathname: '/profile/edit',
                 params: { field: 'lastName', title: 'Last Name', description: 'Enter your last name for completeness.', value: user.lastName }
               })} 
             />
             <ProfileField 
               label="Phone" 
               value={user.phoneNumber || 'Not set'} 
               onEdit={() => router.push({
                 pathname: '/profile/edit',
                 params: { field: 'phoneNumber', title: 'Phone Number', description: 'Your phone number is used for security and contact sync.', value: user.phoneNumber }
               })} 
             />
             <ProfileField 
               label="About" 
               value={user.about || 'Hey there! I am using SangoX'} 
               onEdit={() => router.push({
                 pathname: '/profile/edit',
                 params: { field: 'about', title: 'About', description: 'Write a short bio or status.', value: user.about }
               })} 
             />
             <ProfileField 
               label="Email" 
               value={user.email} 
               isCopyable={true} 
             />
           </View>
        </View>

        {/* User explicitly asked NOT to put logout here */}
        {/* <Pressable style={[styles.logoutBtn, { backgroundColor: colors.surface }]}>
             <Text style={styles.logoutText}>Log out</Text>
        </Pressable> */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerActionText: {
    fontSize: 16,
    fontWeight: '700',
  },
  scrollContent: { paddingBottom: 40 },
  avatarSection: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1,
    position: 'relative',
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  contentWrap: {
    paddingHorizontal: 20,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    paddingLeft: 4,
  },
  fieldsCard: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: 15,
    fontWeight: '500',
    width: 80,
  },
  fieldRight: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  fieldValue: {
    fontSize: 15,
    fontWeight: '500',
    marginRight: 10,
    textAlign: 'right',
  },
  iconBtn: {
    padding: 4,
  },
  logoutBtn: {
    marginTop: 'auto',
    marginHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#DC3545',
  },
});
