import React, { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function LoginScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Perhatian', 'Silakan masukkan email dan kata sandi Anda.');
      return;
    }

    const res = await login(email.trim(), password);
    if (res.success) {
      if (res.user.peran === 'admin') {
        navigation.replace('SuperAdminDashboard');
      } else if (res.user.peran === 'tenant') {
        navigation.replace('TenantDashboard');
      } else {
        navigation.replace('Menu');
      }
    } else {
      let errorMsg = res.message;
      if (
        res.message?.toLowerCase().includes('network error') ||
        res.message?.toLowerCase().includes('terjadi kendala') ||
        res.message?.toLowerCase().includes('gagal terhubung')
      ) {
        errorMsg = 'Gagal terhubung ke server backend FastCanteen.\n\n1. Pastikan server backend sudah dijalankan (node server.js)\n2. Pastikan HP dan laptop terhubung ke Wi-Fi yang sama.';
      }
      Alert.alert('Login Gagal', errorMsg);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 24 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Branding */}
        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="fast-food" size={38} color={COLORS.orange} />
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.titleFast}>Fast</Text>
            <Text style={styles.titleCanteen}>Canteen</Text>
          </View>
          <Text style={styles.subtitle}>
            Pre-Order Makanan Kantin Belakang UINSA Kampus 2
          </Text>
          <View style={styles.chipRow}>
            <View style={styles.locationChip}>
              <Ionicons name="location-sharp" size={14} color={COLORS.primaryDark} />
              <Text style={styles.locationText}>Kantin Belakang Lt. 1 & 2</Text>
            </View>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Masuk ke Akun</Text>
          <Text style={styles.cardSubtitle}>
            Silakan masukkan email kampus atau NIM serta kata sandi Anda.
          </Text>

          {/* Input Email / NIM */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email UINSA / NIM Mahasiswa</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-circle-outline"
                size={20}
                color={COLORS.textBody}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="mahasiswa@uinsa.ac.id atau NIM"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Input Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={20}
                color={COLORS.textBody}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Masukkan kata sandi"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secureText}
              />
              <TouchableOpacity
                onPress={() => setSecureText(!secureText)}
                style={styles.eyeIcon}
              >
                <Ionicons
                  name={secureText ? 'eye-outline' : 'eye-off-outline'}
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tautan Lupa Kata Sandi */}
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('LupaSandi')}
            activeOpacity={0.7}
          >
            <Text style={styles.forgotLinkText}>Lupa kata sandi?</Text>
          </TouchableOpacity>

          {/* Tombol Masuk */}
          <TouchableOpacity
            style={styles.loginButton}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.cardBackground} />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.loginButtonText}>Masuk ke FastCanteen</Text>
                <Ionicons name="arrow-forward" size={18} color={COLORS.cardBackground} />
              </View>
            )}
          </TouchableOpacity>

          {/* Tautan Daftar */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Belum punya akun? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')}>
              <Text style={styles.registerLink}>Daftar Sekarang</Text>
            </TouchableOpacity>
          </View>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  forgotLink: {
    alignSelf: 'flex-end',
    marginTop: -SPACING.xs,
    marginBottom: SPACING.md,
    paddingVertical: 4,
  },
  forgotLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundMain,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xxl,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
  },
  logoBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleFast: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.primaryDark,
    letterSpacing: -0.5,
  },
  titleCanteen: {
    fontSize: 32,
    fontWeight: '800',
    color: COLORS.goldenBrown,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textBody,
    marginTop: SPACING.xs,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: SPACING.sm,
  },
  locationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBackground,
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xxl,
    ...SHADOWS.card,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  inputGroup: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textBody,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveTab,
  },
  inputIcon: {
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.OS === 'ios' ? 14 : 11,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    padding: 6,
  },
  loginButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.soft,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loginButtonText: {
    color: COLORS.cardBackground,
    fontSize: 15,
    fontWeight: '700',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.lg,
  },
  registerText: {
    fontSize: 13,
    color: COLORS.textBody,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  footer: {
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  footerText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
});
