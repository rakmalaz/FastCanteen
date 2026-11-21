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
import API from '../api/axios';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const MIN_SANDI = 6;

// Lupa kata sandi dalam 2 langkah:
//  1) verifikasi identitas (email/NIM + nomor HP terdaftar)
//  2) buat kata sandi baru
export default function LupaSandiScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [langkah, setLangkah] = useState(1);
  const [identitas, setIdentitas] = useState('');
  const [noHp, setNoHp] = useState('');
  const [tokenReset, setTokenReset] = useState('');
  const [nama, setNama] = useState('');
  const [sandiBaru, setSandiBaru] = useState('');
  const [konfirmasi, setKonfirmasi] = useState('');
  const [tampilSandi, setTampilSandi] = useState(false);
  const [loading, setLoading] = useState(false);

  const pesanError = (err) =>
    err.response?.data?.message || err.message || 'Terjadi kesalahan. Coba lagi.';

  const verifikasi = async () => {
    if (!identitas.trim() || !noHp.trim()) {
      Alert.alert('Perhatian', 'Isi email/NIM dan nomor HP yang terdaftar.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/lupa-sandi/verifikasi', {
        identitas: identitas.trim(),
        no_hp: noHp.trim(),
      });
      setTokenReset(res.data.token_reset);
      setNama(res.data.data?.nama || '');
      setLangkah(2);
    } catch (err) {
      Alert.alert('Verifikasi Gagal', pesanError(err));
    } finally {
      setLoading(false);
    }
  };

  const simpanSandiBaru = async () => {
    if (sandiBaru.length < MIN_SANDI) {
      Alert.alert('Perhatian', `Kata sandi baru minimal ${MIN_SANDI} karakter.`);
      return;
    }
    if (sandiBaru !== konfirmasi) {
      Alert.alert('Perhatian', 'Konfirmasi kata sandi tidak sama.');
      return;
    }
    setLoading(true);
    try {
      const res = await API.post('/auth/lupa-sandi/reset', {
        token_reset: tokenReset,
        kata_sandi_baru: sandiBaru,
      });
      Alert.alert('Berhasil', res.data.message, [
        { text: 'Masuk', onPress: () => navigation.replace('Login') },
      ]);
    } catch (err) {
      Alert.alert('Gagal', pesanError(err), [
        // Sesi reset habis / token tidak valid: ulangi dari langkah 1
        err.response?.status === 401
          ? { text: 'Ulangi', onPress: () => { setLangkah(1); setTokenReset(''); } }
          : { text: 'OK' },
      ]);
    } finally {
      setLoading(false);
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
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (langkah === 2 ? setLangkah(1) : navigation.goBack())}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={COLORS.primaryDark} />
          <Text style={styles.backText}>{langkah === 2 ? 'Kembali ke verifikasi' : 'Kembali ke Login'}</Text>
        </TouchableOpacity>

        <View style={styles.header}>
          <View style={styles.logoBadge}>
            <Ionicons name="key" size={34} color={COLORS.orange} />
          </View>
          <Text style={styles.title}>Lupa Kata Sandi</Text>
          <Text style={styles.subtitle}>
            {langkah === 1
              ? 'Verifikasi akun Anda dengan email/NIM dan nomor HP yang terdaftar.'
              : `Halo${nama ? `, ${nama}` : ''}! Buat kata sandi baru untuk akun Anda.`}
          </Text>
        </View>

        {/* Penanda langkah */}
        <View style={styles.stepRow}>
          <View style={[styles.stepDot, styles.stepDotActive]}>
            <Text style={styles.stepDotText}>1</Text>
          </View>
          <View style={[styles.stepLine, langkah === 2 && styles.stepLineActive]} />
          <View style={[styles.stepDot, langkah === 2 && styles.stepDotActive]}>
            <Text style={[styles.stepDotText, langkah !== 2 && { color: COLORS.textSecondary }]}>2</Text>
          </View>
        </View>

        <View style={styles.card}>
          {langkah === 1 ? (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Email UINSA / NIM</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="person-circle-outline" size={20} color={COLORS.textBody} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="mahasiswa@uinsa.ac.id atau NIM"
                    placeholderTextColor={COLORS.textSecondary}
                    value={identitas}
                    onChangeText={setIdentitas}
                    autoCapitalize="none"
                    keyboardType="email-address"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Nomor HP Terdaftar</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="call-outline" size={20} color={COLORS.textBody} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="08xxxxxxxxxx"
                    placeholderTextColor={COLORS.textSecondary}
                    value={noHp}
                    onChangeText={setNoHp}
                    keyboardType="phone-pad"
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.infoText}>
                  Nomor HP harus sama dengan yang dipakai saat pendaftaran akun. Akun Super Admin tidak dapat
                  direset mandiri.
                </Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={verifikasi} disabled={loading} activeOpacity={0.8}>
                {loading ? (
                  <ActivityIndicator color={COLORS.cardBackground} />
                ) : (
                  <View style={styles.btnInner}>
                    <Text style={styles.primaryBtnText}>Verifikasi Akun</Text>
                    <Ionicons name="arrow-forward" size={18} color={COLORS.cardBackground} />
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Kata Sandi Baru</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textBody} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder={`Minimal ${MIN_SANDI} karakter`}
                    placeholderTextColor={COLORS.textSecondary}
                    value={sandiBaru}
                    onChangeText={setSandiBaru}
                    secureTextEntry={!tampilSandi}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => setTampilSandi(!tampilSandi)} style={styles.eyeIcon}>
                    <Ionicons
                      name={tampilSandi ? 'eye-off-outline' : 'eye-outline'}
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Ulangi Kata Sandi Baru</Text>
                <View style={styles.inputContainer}>
                  <Ionicons name="lock-closed-outline" size={20} color={COLORS.textBody} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Ketik ulang kata sandi"
                    placeholderTextColor={COLORS.textSecondary}
                    value={konfirmasi}
                    onChangeText={setKonfirmasi}
                    secureTextEntry={!tampilSandi}
                    autoCapitalize="none"
                  />
                </View>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.infoText}>Selesaikan dalam 10 menit, atau ulangi verifikasi.</Text>
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={simpanSandiBaru} disabled={loading} activeOpacity={0.8}>
                {loading ? (
                  <ActivityIndicator color={COLORS.cardBackground} />
                ) : (
                  <View style={styles.btnInner}>
                    <Text style={styles.primaryBtnText}>Simpan Kata Sandi</Text>
                    <Ionicons name="checkmark" size={18} color={COLORS.cardBackground} />
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundMain },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: SPACING.xxl,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginBottom: SPACING.lg },
  backText: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark },
  header: { alignItems: 'center', marginBottom: SPACING.lg },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.primaryDark },
  subtitle: { fontSize: 13, color: COLORS.textBody, marginTop: SPACING.xs, textAlign: 'center', lineHeight: 19 },
  stepRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SPACING.lg },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.inactiveTab,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: { backgroundColor: COLORS.primaryDark },
  stepDotText: { fontSize: 13, fontWeight: '800', color: COLORS.cardBackground },
  stepLine: { width: 56, height: 3, backgroundColor: COLORS.inactiveTab, marginHorizontal: 6, borderRadius: 2 },
  stepLineActive: { backgroundColor: COLORS.primaryDark },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    ...SHADOWS.card,
  },
  inputGroup: { marginBottom: SPACING.lg },
  label: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 6 },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  inputIcon: { marginRight: SPACING.sm },
  input: { flex: 1, fontSize: 14, color: COLORS.textPrimary },
  eyeIcon: { padding: 4 },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
  },
  infoText: { flex: 1, fontSize: 12, color: COLORS.textSecondary, lineHeight: 17 },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryBtnText: { color: COLORS.cardBackground, fontSize: 15, fontWeight: '800' },
});
