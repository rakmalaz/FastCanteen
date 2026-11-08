import React, { useEffect, useState } from 'react';
import { Alert, Modal, View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING } from '../constants/theme';
import { deteksiTone } from '../utils/dialogTone';

// =====================================================================
// Dialog bertema FastCanteen.
// Menggantikan kotak dialog bawaan Android pada SEMUA pemanggilan
// Alert.alert(...) di aplikasi (konfirmasi, peringatan, sukses, gagal),
// dengan tampilan yang sama seperti kartu sukses pre-order.
//
// Pemakaian tidak berubah:
//   Alert.alert('Judul', 'Pesan', [{ text: 'Batal', style: 'cancel' }, { text: 'Ya', onPress }])
// Opsional parameter ke-4: { tone: 'success'|'error'|'warning'|'info'|'confirm'|'danger',
//                            cancelable: true, onDismiss: () => {} }
// =====================================================================

const TONES = {
  success: { icon: 'checkmark', ring: COLORS.badgeSuccess, circle: COLORS.primary, iconColor: '#FFFFFF', title: COLORS.primaryDark, btn: COLORS.primary, btnText: '#FFFFFF' },
  error: { icon: 'close', ring: COLORS.dangerBg, circle: COLORS.danger, iconColor: '#FFFFFF', title: COLORS.dangerDark, btn: COLORS.danger, btnText: '#FFFFFF' },
  warning: { icon: 'alert', ring: COLORS.statusWaitingBg, circle: COLORS.orange, iconColor: COLORS.brownDark, title: COLORS.brownDark, btn: COLORS.orange, btnText: COLORS.brownDark },
  info: { icon: 'information', ring: COLORS.infoLightBlue, circle: COLORS.infoBlue, iconColor: '#FFFFFF', title: COLORS.primaryDark, btn: COLORS.primary, btnText: '#FFFFFF' },
  confirm: { icon: 'help', ring: COLORS.badgeSuccess, circle: COLORS.primary, iconColor: '#FFFFFF', title: COLORS.primaryDark, btn: COLORS.primary, btnText: '#FFFFFF' },
  danger: { icon: 'alert', ring: COLORS.dangerBg, circle: COLORS.danger, iconColor: '#FFFFFF', title: COLORS.dangerDark, btn: COLORS.danger, btnText: '#FFFFFF' },
};

// ---------- antrean dialog (di luar React agar bisa dipanggil dari mana saja) ----------
let subscriber = null;
let pending = [];
let nextId = 1;

export function showDialog(title, message, buttons, options) {
  const dialog = { id: nextId++, title, message, buttons, options };
  if (subscriber) subscriber(dialog);
  else pending.push(dialog); // host belum aktif: tampilkan begitu siap
}

// Pasang sekali: semua Alert.alert di aplikasi memakai dialog bertema
export function installDialog() {
  if (Alert.__fastCanteenPatched) return;
  Alert.__fastCanteenPatched = true;
  Alert.alert = (title, message, buttons, options) => showDialog(title, message, buttons, options);
}

// ---------- komponen tampilan ----------
export default function DialogHost() {
  const [queue, setQueue] = useState([]);

  useEffect(() => {
    subscriber = (dialog) => setQueue((q) => [...q, dialog]);
    if (pending.length > 0) {
      setQueue((q) => [...q, ...pending]);
      pending = [];
    }
    return () => {
      subscriber = null;
    };
  }, []);

  const current = queue[0];
  const tutup = () => setQueue((q) => q.slice(1));

  const tekanTombol = (tombol) => {
    tutup();
    if (tombol && tombol.onPress) {
      // beri jeda singkat agar dialog berikutnya (jika ada) tampil rapi setelah ini tertutup
      setTimeout(() => tombol.onPress(), 60);
    }
  };

  const tutupDenganLatar = () => {
    if (!current) return;
    if (current.options && current.options.cancelable) {
      tutup();
      if (current.options.onDismiss) setTimeout(() => current.options.onDismiss(), 60);
    }
    // perilaku bawaan Alert: tidak bisa ditutup dengan ketuk luar kecuali cancelable: true
  };

  const daftarTombol =
    current && Array.isArray(current.buttons) && current.buttons.length > 0
      ? current.buttons
      : [{ text: 'OK' }];
  const tone = current
    ? TONES[deteksiTone(current.title, current.message, current.buttons, current.options)] || TONES.info
    : TONES.info;
  const sebaris = daftarTombol.length <= 2;

  return (
    <Modal visible={!!current} transparent animationType="fade" onRequestClose={tutupDenganLatar} statusBarTranslucent>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={tutupDenganLatar}>
        {current && (
          <View style={styles.card} onStartShouldSetResponder={() => true}>
            <View style={[styles.ring, { backgroundColor: tone.ring }]}>
              <View style={[styles.circle, { backgroundColor: tone.circle }]}>
                <Ionicons name={tone.icon} size={44} color={tone.iconColor} />
              </View>
            </View>

            {!!current.title && <Text style={[styles.title, { color: tone.title }]}>{current.title}</Text>}

            {!!current.message && (
              <ScrollView style={styles.messageBox} showsVerticalScrollIndicator={false}>
                <Text style={styles.message}>{String(current.message)}</Text>
              </ScrollView>
            )}

            <View style={[styles.actions, sebaris ? styles.actionsRow : styles.actionsColumn]}>
              {daftarTombol.map((tombol, index) => {
                const batal = tombol.style === 'cancel';
                const hancur = tombol.style === 'destructive';
                const warnaIsi = hancur ? COLORS.danger : tone.btn;
                const warnaTeks = hancur ? '#FFFFFF' : tone.btnText;
                return (
                  <TouchableOpacity
                    key={`${tombol.text}-${index}`}
                    style={[
                      styles.button,
                      sebaris && styles.buttonFlex,
                      batal
                        ? styles.buttonOutline
                        : { backgroundColor: warnaIsi },
                    ]}
                    onPress={() => tekanTombol(tombol)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.buttonText, { color: batal ? COLORS.textBody : warnaTeks }]}>
                      {tombol.text || 'OK'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(26, 28, 25, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: COLORS.cardBackground,
    borderRadius: 24,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
    paddingBottom: SPACING.xl,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  ring: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  circle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  messageBox: {
    maxHeight: 220,
    alignSelf: 'stretch',
    marginTop: 8,
  },
  message: {
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.textBody,
    textAlign: 'center',
  },
  actions: {
    alignSelf: 'stretch',
    marginTop: SPACING.xl,
    gap: 10,
  },
  actionsRow: {
    flexDirection: 'row',
  },
  actionsColumn: {
    flexDirection: 'column',
  },
  button: {
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonFlex: {
    flex: 1,
  },
  buttonOutline: {
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});