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
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import { API_BASE_URL, setServerIP } from '../api/axios';

export default function LoginScreen({ navigation }) {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);

  // Konfigurasi Server IP
  const [currentBaseUrl, setCurrentBaseUrl] = useState(API_BASE_URL);
  const [modalIpVisible, setModalIpVisible] = useState(false);
  const [inputIp, setInputIp] = useState(
    API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '').split(':')[0] || '192.168.18.111'
  );

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
        errorMsg = `Gagal terhubung ke server backend FastCanteen (${currentBaseUrl}).\n\n1. Pastikan server backend sudah dijalankan (npm run dev atau node server.js)\n2. Pastikan HP dan Laptop terhubung ke Wi-Fi yang sama.\n3. Jika IP Wi-Fi laptop berubah, ketuk tombol 'Ubah IP Server' di bawah untuk menyesuaikannya.`;
      }
      Alert.alert('Login Gagal', errorMsg);
    }
  };

  const handleSaveIP = () => {
    if (!inputIp.trim()) {
      Alert.alert('Perhatian', 'Masukkan alamat IP host laptop.');
      return;
    }
    const updatedUrl = setServerIP(inputIp.trim());
    setCurrentBaseUrl(updatedUrl);
    setModalIpVisible(false);
    Alert.alert('Berhasil', `Alamat backend diperbarui ke:\n${updatedUrl}`);
  };

  const handleQuickDemo = (type) => {
    if (type === 'admin_elka') {
      setEmail('elka@uinsa.ac.id');
      setPassword('123456');
    } else if (type === 'admin_rayhan') {
      setEmail('rayhan@uinsa.ac.id');
      setPassword('123456');
    } else if (type === 'admin_putra') {
      setEmail('putra@uinsa.ac.id');
      setPassword('123456');
    } else if (type === 'admin_rizki') {
      setEmail('rizki@uinsa.ac.id');
      setPassword('123456');
    } else if (type === 'mahasiswa') {
      setEmail('mahasiswa@uinsa.ac.id');
      setPassword('123456');
    } else if (type === 'tenant') {
      setEmail('siti@fastcanteen.com');
      setPassword('123456');
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

            <TouchableOpacity
              style={styles.serverChip}
              onPress={() => setModalIpVisible(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="wifi" size={13} color={COLORS.textSuccessTeal} />
              <Text style={styles.serverChipText}>
                {currentBaseUrl.replace('http://', '').replace('/api', '')} · Ubah IP
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Form Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Masuk ke Akun</Text>
          <Text style={styles.cardSubtitle}>
            Tiga Hak Akses: Super Admin, Mahasiswa, atau Stan Tenant Kantin.
          </Text>

          {/* Quick Demo Selector */}
          <Text style={styles.quickLabel}>Pilih Akun Demo Cepat (3 Tampilan):</Text>

          {/* Pilihan Super Admin (4 Orang) */}
          <View style={styles.demoSectionBox}>
            <View style={styles.demoSectionHeader}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.orange} />
              <Text style={styles.demoSectionTitle}>4 Super Admin Resmi UINSA:</Text>
            </View>
            <View style={styles.adminDemoRow}>
              <TouchableOpacity
                style={styles.adminMiniBtn}
                onPress={() => handleQuickDemo('admin_rayhan')}
                activeOpacity={0.7}
              >
                <Text style={styles.adminMiniText}>1. Rayhan</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminMiniBtn}
                onPress={() => handleQuickDemo('admin_putra')}
                activeOpacity={0.7}
              >
                <Text style={styles.adminMiniText}>2. Putra</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminMiniBtn}
                onPress={() => handleQuickDemo('admin_elka')}
                activeOpacity={0.7}
              >
                <Text style={styles.adminMiniText}>3. Elka</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.adminMiniBtn}
                onPress={() => handleQuickDemo('admin_rizki')}
                activeOpacity={0.7}
              >
                <Text style={styles.adminMiniText}>4. Rizki</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Mahasiswa & Tenant Demo */}
          <View style={styles.quickRow}>
            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickDemo('mahasiswa')}
              activeOpacity={0.7}
            >
              <Ionicons name="school-outline" size={16} color={COLORS.primaryDark} />
              <Text style={styles.quickButtonText}>Mahasiswa (Demo)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickButton}
              onPress={() => handleQuickDemo('tenant')}
              activeOpacity={0.7}
            >
              <Ionicons name="storefront-outline" size={16} color={COLORS.goldenBrown} />
              <Text style={[styles.quickButtonText, { color: COLORS.goldenBrown }]}>
                Tenant (Bu Siti)
              </Text>
            </TouchableOpacity>
          </View>

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

        {/* Footer info */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            PjBL Pemrograman Mobile · SIF125113 · Kelompok 3 UINSA
          </Text>
        </View>
      </ScrollView>

      {/* Modal Pengaturan IP Server */}
      <Modal
        visible={modalIpVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalIpVisible(false)}
      >
        <View style={styles.ipModalOverlay}>
          <View style={styles.ipModalCard}>
            <View style={styles.ipModalHeader}>
              <Ionicons name="settings-outline" size={20} color={COLORS.primaryDark} />
              <Text style={styles.ipModalTitle}>Konfigurasi IP Backend</Text>
            </View>

            <Text style={styles.ipModalDesc}>
              Sesuaikan alamat IP Wi-Fi laptop jika berubah saat berpindah jaringan (misal: di kampus atau di rumah).
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Alamat IP Laptop / Port 5000</Text>
              <View style={styles.inputContainer}>
                <Ionicons
                  name="globe-outline"
                  size={18}
                  color={COLORS.textBody}
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Contoh: 192.168.18.111"
                  placeholderTextColor={COLORS.textSecondary}
                  value={inputIp}
                  onChangeText={setInputIp}
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.ipPresetRow}>
              <TouchableOpacity
                style={styles.ipPresetBtn}
                onPress={() => setInputIp('192.168.18.111')}
              >
                <Text style={styles.ipPresetText}>IP Sekarang (192.168.18.111)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.ipPresetBtn}
                onPress={() => setInputIp('10.0.2.2')}
              >
                <Text style={styles.ipPresetText}>Emulator (10.0.2.2)</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.ipModalActions}>
              <TouchableOpacity
                style={styles.ipModalCancelBtn}
                onPress={() => setModalIpVisible(false)}
              >
                <Text style={styles.ipModalCancelText}>Batal</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.ipModalSaveBtn}
                onPress={handleSaveIP}
              >
                <Text style={styles.ipModalSaveText}>Simpan & Terapkan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  serverChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: SPACING.md,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  serverChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSuccessEmerald,
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
  quickLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
    marginBottom: SPACING.xs,
  },
  demoSectionBox: {
    backgroundColor: '#FFF8E1',
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  demoSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    gap: 4,
  },
  demoSectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brownDark,
  },
  adminDemoRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  adminMiniBtn: {
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: '#FFD54F',
  },
  adminMiniText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brownDark,
  },
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  quickButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBackground,
    paddingVertical: 9,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveTab,
    gap: 6,
  },
  quickButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
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
  ipModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  ipModalCard: {
    width: '100%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  ipModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  ipModalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  ipModalDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 17,
  },
  ipPresetRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.lg,
  },
  ipPresetBtn: {
    backgroundColor: COLORS.badgeBackground,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: RADIUS.sm,
  },
  ipPresetText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  ipModalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  ipModalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  ipModalCancelText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  ipModalSaveBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: RADIUS.md,
  },
  ipModalSaveText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.cardBackground,
  },
});
