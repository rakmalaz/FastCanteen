import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '../constants/theme';
import {
  aktifkanNotifikasi,
  nonaktifkanNotifikasi,
  bacaStatusNotifikasi,
  kirimNotifikasiUji,
} from '../utils/notifications';

// Saklar notifikasi per HP: nyalakan sekali, setelah itu otomatis aktif tiap login.
// Matikan untuk "mode senyap".
export default function PushNotifikasiCard() {
  const [aktif, setAktif] = useState(false);
  const [sibuk, setSibuk] = useState(null); // 'saklar' | 'uji' | null

  useEffect(() => {
    let hidup = true;
    bacaStatusNotifikasi().then((s) => hidup && setAktif(s));
    return () => {
      hidup = false;
    };
  }, []);

  const ubahSaklar = async (nilai) => {
    setSibuk('saklar');
    try {
      if (nilai) {
        await aktifkanNotifikasi();
      } else {
        await nonaktifkanNotifikasi();
      }
      setAktif(nilai);
    } catch (e) {
      Alert.alert(
        nilai ? 'Gagal Mengaktifkan' : 'Gagal Menonaktifkan',
        e.response?.data?.message || e.message
      );
    } finally {
      setSibuk(null);
    }
  };

  const handleUji = async () => {
    setSibuk('uji');
    try {
      const data = await kirimNotifikasiUji();
      Alert.alert('Server', data.message || 'Notifikasi uji dikirim');
    } catch (e) {
      Alert.alert('Gagal', e.response?.data?.message || e.message);
    } finally {
      setSibuk(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Ionicons
          name={aktif ? 'notifications-outline' : 'notifications-off-outline'}
          size={20}
          color={COLORS.primaryDark}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Notifikasi Pesanan</Text>
          <Text style={styles.status}>{aktif ? 'Aktif di HP ini' : 'Senyap (nonaktif)'}</Text>
        </View>
        {sibuk === 'saklar' ? (
          <ActivityIndicator size="small" color={COLORS.primaryDark} />
        ) : (
          <Switch
            value={aktif}
            onValueChange={ubahSaklar}
            disabled={!!sibuk}
            trackColor={{ false: COLORS.inactiveTab, true: COLORS.primary }}
            thumbColor="#fff"
          />
        )}
      </View>

      <Text style={styles.desc}>
        {aktif
          ? 'Status pesanan masuk ke HP ini walau aplikasi ditutup. Cukup diaktifkan sekali di HP ini.'
          : 'Notifikasi di HP ini dimatikan. Riwayat notifikasi tetap tersimpan di dalam aplikasi.'}
      </Text>

      {aktif && (
        <TouchableOpacity style={styles.btnOutline} onPress={handleUji} disabled={!!sibuk} activeOpacity={0.8}>
          {sibuk === 'uji' ? (
            <ActivityIndicator size="small" color={COLORS.primaryDark} />
          ) : (
            <Text style={styles.btnOutlineText}>Kirim Notifikasi Uji</Text>
          )}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.inactiveTab,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  status: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  desc: { fontSize: 12, color: COLORS.textSecondary, marginTop: SPACING.md },
  btnOutline: {
    marginTop: SPACING.md,
    height: 38,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnOutlineText: { color: COLORS.primaryDark, fontWeight: '700', fontSize: 13 },
});
