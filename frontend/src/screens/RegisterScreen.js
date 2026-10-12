import React, { useState } from 'react';
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

export default function RegisterScreen({ navigation }) {
  const { register, loading } = useAuth();
  const [nama, setNama] = useState('');
  const [nim, setNim] = useState('');
  const [email, setEmail] = useState('');
  const [noHp, setNoHp] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  const handleRegister = async () => {
    if (!nama.trim() || !email.trim() || !password.trim()) {
      Alert.alert('Perhatian', 'Nama, email, dan kata sandi wajib diisi.');
      return;
    }

    if (!nim.trim()) {
      Alert.alert('Perhatian', 'NIM mahasiswa wajib diisi untuk verifikasi kampus.');
      return;
    }

    const payload = {
      nama: nama.trim(),
      email: email.trim(),
      kata_sandi: password,
      peran: 'mahasiswa',
      no_hp: noHp.trim() || null,
      nim: nim.trim(),
    };

    const res = await register(payload);
    if (res.success) {
      Alert.alert(
        'Registrasi Berhasil',
        `Selamat datang di FastCanteen, ${nama}! Akun mahasiswa Anda telah aktif.`,
        [
          {
            text: 'Mulai Pre-Order',
            onPress: () => {
              navigation.replace('Menu');
            },
          },
        ]
      );
    } else {
      Alert.alert('Registrasi Gagal', res.message);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primaryDark} />
          <Text style={styles.backText}>Kembali ke Login</Text>
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Daftar Akun Mahasiswa</Text>
          <Text style={styles.pageSubtitle}>
            Buat akun mahasiswa untuk memesan makanan pre-order di Kantin Belakang UINSA Kampus 2 tanpa antre.
          </Text>
        </View>

        {/* Info Banner untuk Tenant */}
        <View style={styles.tenantNoticeBanner}>
          <Ionicons name="information-circle" size={22} color={COLORS.goldenBrown} />
          <View style={styles.tenantNoticeTextCol}>
            <Text style={styles.tenantNoticeTitle}>Pengelola Stan Tenant Kantin?</Text>
            <Text style={styles.tenantNoticeDesc}>
              Stan tenant tidak dapat mendaftar mandiri. Akun tenant didaftarkan resmi oleh tim <Text style={{ fontWeight: 'bold' }}>Super Admin FastCanteen</Text>. Silakan hubungi Super Admin atau login jika akun sudah dibuatkan.
            </Text>
          </View>
        </View>

        {/* Card Form */}
        <View style={styles.card}>
          {/* Nama Lengkap */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nama Lengkap Mahasiswa</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="person-outline"
                size={18}
                color={COLORS.textBody}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Contoh: Muhammad Ali"
                placeholderTextColor={COLORS.textSecondary}
                value={nama}
                onChangeText={setNama}
              />
            </View>
          </View>

          {/* Mahasiswa: NIM */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>NIM (Nomor Induk Mahasiswa UINSA)</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="card-outline"
                size={18}
                color={COLORS.textBody}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Contoh: 09010625001"
                placeholderTextColor={COLORS.textSecondary}
                value={nim}
                onChangeText={setNim}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="mail-outline"
                size={18}
                color={COLORS.textBody}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="nama@uinsa.ac.id"
                placeholderTextColor={COLORS.textSecondary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* No WhatsApp */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nomor WhatsApp</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="logo-whatsapp"
                size={18}
                color={COLORS.whatsappGreen}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="081234567890"
                placeholderTextColor={COLORS.textSecondary}
                value={noHp}
                onChangeText={setNoHp}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          {/* Kata Sandi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Kata Sandi</Text>
            <View style={styles.inputContainer}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={COLORS.textBody}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder="Minimal 6 karakter"
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
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tombol Daftar */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.cardBackground} />
            ) : (
              <View style={styles.buttonInner}>
                <Text style={styles.submitButtonText}>
                  {role === 'mahasiswa' ? 'Daftar sebagai Mahasiswa' : 'Daftar Stan Kantin'}
                </Text>
                <Ionicons name="checkmark-circle" size={18} color={COLORS.cardBackground} />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundMain,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
    paddingBottom: SPACING.xxxl,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginLeft: 6,
  },
  titleSection: {
    marginBottom: SPACING.lg,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  pageSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  tenantNoticeBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  tenantNoticeTextCol: {
    flex: 1,
  },
  tenantNoticeTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldenBrown,
  },
  tenantNoticeDesc: {
    fontSize: 11,
    color: COLORS.textBody,
    marginTop: 2,
    lineHeight: 16,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  inputGroup: {
    marginBottom: SPACING.md,
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
    paddingVertical: Platform.OS === 'ios' ? 12 : 9,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    padding: 6,
  },
  submitButton: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.md,
    ...SHADOWS.soft,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  submitButtonText: {
    color: COLORS.cardBackground,
    fontSize: 15,
    fontWeight: '700',
  },
});
