import React, { useEffect, useState } from 'react';
import { View, Text, Switch, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';
import {
  pushTersedia,
  bacaPreferensiPush,
  aktifkanPush,
  matikanPush,
  kirimNotifikasiUji,
} from '../utils/pushNotifications';

// Kartu pengaturan Push Notification: saklar on/off + tombol kirim notifikasi uji.
// Dipakai di Profil Mahasiswa dan Dashboard Tenant.
export default function PushNotifikasiCard({ style }) {
  const { user } = useAuth();
  const [aktif, setAktif] = useState(false);
  const [bekerja, setBekerja] = useState(false);
  const [mengirim, setMengirim] = useState(false);
  const tersedia = pushTersedia();

  useEffect(() => {
    let batal = false;
    if (user?.id) {
      bacaPreferensiPush(user.id).then((v) => {
        if (!batal) setAktif(v);
      });
    }
    return () => {
      batal = true;
    };
  }, [user?.id]);

  const ubahSaklar = async (nilai) => {
    setBekerja(true);
    try {
      if (nilai) {
        await aktifkanPush(user.id);
        setAktif(true);
      } else {
        await matikanPush(user.id);
        setAktif(false);
      }
    } catch (err) {
      Alert.alert(
        nilai ? 'Gagal Mengaktifkan' : 'Gagal Menonaktifkan',
        err.response?.data?.message || err.message || 'Terjadi kesalahan.'
      );
    } finally {
      setBekerja(false);
    }
  };

  const kirimUji = async () => {
    setMengirim(true);
    try {
      const res = await kirimNotifikasiUji();
      Alert.alert('Terkirim', res.message || 'Notifikasi uji dikirim. Cek bilah notifikasi perangkat Anda.');
    } catch (err) {
      Alert.alert('Gagal Mengirim', err.response?.data?.message || err.message || 'Terjadi kesalahan.');
    } finally {
      setMengirim(false);
    }
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.row}>
        <View style={styles.iconBox}>
          <Ionicons name="notifications-outline" size={20} color={COLORS.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifikasi Push</Text>
          <Text style={styles.desc}>
            {tersedia
              ? aktif
                ? 'Aktif: info pesanan dikirim ke perangkat ini.'
                : 'Nonaktif: perangkat ini tidak menerima notifikasi.'
              : 'Modul expo-notifications belum terpasang.'}
          </Text>
        </View>
        {bekerja ? (
          <ActivityIndicator color={COLORS.primaryDark} />
        ) : (
          <Switch
            value={aktif}
            onValueChange={ubahSaklar}
            disabled={!tersedia}
            trackColor={{ false: COLORS.inactiveElement, true: COLORS.primary }}
            thumbColor={COLORS.cardBackground}
          />
        )}
      </View>

      <TouchableOpacity
        style={[styles.testBtn, (!aktif || !tersedia) && styles.testBtnDisabled]}
        onPress={kirimUji}
        disabled={!aktif || !tersedia || mengirim}
        activeOpacity={0.8}
      >
        {mengirim ? (
          <ActivityIndicator color={COLORS.primaryDark} />
        ) : (
          <>
            <Ionicons name="paper-plane-outline" size={16} color={COLORS.primaryDark} />
            <Text style={styles.testBtnText}>Kirim Notifikasi Uji</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOWS.soft,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.badgeBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary },
  desc: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, lineHeight: 16 },
  testBtn: {
    marginTop: SPACING.md,
    height: 42,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  testBtnDisabled: { opacity: 0.4 },
  testBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.primaryDark },
});
