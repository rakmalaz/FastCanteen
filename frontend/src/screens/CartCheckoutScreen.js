import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function CartCheckoutScreen({ navigation }) {
  const { user } = useAuth();
  const {
    items,
    activeTenant,
    addToCart,
    removeFromCart,
    deleteItem,
    clearCart,
    totalAmount,
    totalCount,
  } = useCart();

  // Jam Pengambilan Presets sesuai pola jadwal istirahat UINSA Kampus 2
  const JAM_PRESETS = [
    '10:15 WIB (Istirahat Sesi 1)',
    '11:45 WIB (Istirahat Dhuhur)',
    '13:00 WIB (Selesai Kuliah)',
    '15:30 WIB (Istirahat Sore)',
  ];

  const [selectedJam, setSelectedJam] = useState(JAM_PRESETS[1]);
  const [customJam, setCustomJam] = useState('');
  const [useCustomJam, setUseCustomJam] = useState(false);
  const [catatan, setCatatan] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('QRIS'); // 'QRIS' | 'E-Wallet' | 'Tunai'
  const [submitting, setSubmitting] = useState(false);
  const [buktiUploaded, setBuktiUploaded] = useState(true); // US-07 default simulasi bukti valid

  const formatIDR = (val) => {
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const effectiveJam = useCustomJam
    ? customJam.trim() || '12:00 WIB'
    : selectedJam;

  const handleCheckout = async () => {
    if (items.length === 0) {
      Alert.alert('Keranjang Kosong', 'Pilih menu makanan terlebih dahulu.');
      return;
    }

    if (!user || !user.id) {
      Alert.alert('Sesi Berakhir', 'Silakan masuk ke akun terlebih dahulu.', [
        { text: 'Masuk', onPress: () => navigation.replace('Login') },
      ]);
      return;
    }

    setSubmitting(true);
    try {
      const orderPayload = {
        id_mahasiswa: user.id,
        id_tenant: activeTenant?.id || items[0].id_tenant,
        jam_pengambilan: effectiveJam,
        metode_pembayaran: paymentMethod,
        catatan: catatan.trim() || null,
        bukti_pembayaran:
          paymentMethod !== 'Tunai' && buktiUploaded
            ? 'https://via.placeholder.com/400?text=Bukti+QRIS+Terverifikasi+FastCanteen'
            : null,
        items: items.map((item) => ({
          id_menu: item.id,
          jumlah_pesanan: item.quantity,
        })),
      };

      const res = await API.post('/pesanan', orderPayload);

      if (res.data.success) {
        clearCart();
        Alert.alert(
          'Pre-Order Berhasil! 🎉',
          `Pesanan #${res.data.data.id_pesanan} telah diteruskan ke ${activeTenant?.nama_tenant}. Silakan ambil pada ${effectiveJam}.`,
          [
            {
              text: 'Lihat Status Pesanan',
              onPress: () => navigation.replace('MahasiswaMain', { initialTab: 'pesanan' }),
            },
          ]
        );
      } else {
        Alert.alert('Gagal Memesan', res.data.message || 'Terjadi kesalahan.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.message || err.message || 'Gagal memproses pesanan';
      Alert.alert('Kesalahan', msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="cart-outline" size={64} color={COLORS.divider} />
        <Text style={styles.emptyTitle}>Keranjang Pre-Order Kosong</Text>
        <Text style={styles.emptySubtitle}>
          Pilih makanan dari stan kantin favorit Anda sebelum jam istirahat.
        </Text>
        <TouchableOpacity
          style={styles.browseButton}
          onPress={() => navigation.navigate('Menu')}
          activeOpacity={0.8}
        >
          <Text style={styles.browseButtonText}>Lihat Menu Makanan</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle}>Checkout Pre-Order</Text>
          <Text style={styles.headerSubtitle} numberOfLines={1}>
            {activeTenant?.nama_tenant || 'Stan Kantin'}
          </Text>
        </View>
        <TouchableOpacity onPress={clearCart} style={styles.clearBtn}>
          <Text style={styles.clearBtnText}>Hapus</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Info Stan & Lokasi Pengambilan */}
        <View style={styles.tenantBanner}>
          <Ionicons name="location" size={20} color={COLORS.primaryDark} />
          <View style={styles.tenantBannerTextCol}>
            <Text style={styles.tenantBannerTitle}>
              {activeTenant?.nama_tenant}
            </Text>
            <Text style={styles.tenantBannerSubtitle}>
              {activeTenant?.lokasi_stan || 'Kantin Belakang UINSA Kampus 2'}
            </Text>
          </View>
        </View>

        {/* Daftar Item Menu */}
        <Text style={styles.sectionHeader}>Daftar Menu Dipesan ({totalCount})</Text>
        <View style={styles.card}>
          {items.map((item, index) => (
            <View key={item.id}>
              <View style={styles.itemRow}>
                <Image
                  source={{
                    uri:
                      item.foto ||
                      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
                  }}
                  style={styles.itemImage}
                />
                <View style={styles.itemInfoCol}>
                  <Text style={styles.itemName} numberOfLines={1}>
                    {item.nama_menu}
                  </Text>
                  <Text style={styles.itemPrice}>{formatIDR(item.harga)}</Text>
                </View>

                {/* Stepper */}
                <View style={styles.stepperBox}>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => removeFromCart(item.id)}
                  >
                    <Ionicons name="remove" size={14} color={COLORS.primaryDark} />
                  </TouchableOpacity>
                  <Text style={styles.stepCount}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.stepBtn}
                    onPress={() => addToCart(item)}
                  >
                    <Ionicons name="add" size={14} color={COLORS.primaryDark} />
                  </TouchableOpacity>
                </View>

                {/* Hapus per item */}
                <TouchableOpacity
                  onPress={() => deleteItem(item.id)}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
                </TouchableOpacity>
              </View>
              {index < items.length - 1 && <View style={styles.itemDivider} />}
            </View>
          ))}
        </View>

        {/* Pemilihan Jam Pengambilan (US-04) */}
        <Text style={styles.sectionHeader}>⏰ Jam Pengambilan di Kantin</Text>
        <View style={styles.card}>
          <Text style={styles.helperText}>
            Pilih estimasi waktu Anda tiba di stan agar tenant menyiapkan tepat waktu:
          </Text>

          <View style={styles.jamChipsContainer}>
            {JAM_PRESETS.map((jam) => {
              const isSelected = !useCustomJam && selectedJam === jam;
              return (
                <TouchableOpacity
                  key={jam}
                  style={[
                    styles.jamChip,
                    isSelected && styles.jamChipActive,
                  ]}
                  onPress={() => {
                    setSelectedJam(jam);
                    setUseCustomJam(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={isSelected ? COLORS.cardBackground : COLORS.textBody}
                  />
                  <Text
                    style={[
                      styles.jamChipText,
                      isSelected && styles.jamChipTextActive,
                    ]}
                  >
                    {jam}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Opsi Tulis Jam Sendiri */}
          <TouchableOpacity
            style={[
              styles.jamChip,
              useCustomJam && styles.jamChipActive,
              { marginTop: SPACING.sm },
            ]}
            onPress={() => setUseCustomJam(!useCustomJam)}
          >
            <Ionicons
              name="create-outline"
              size={14}
              color={useCustomJam ? COLORS.cardBackground : COLORS.textBody}
            />
            <Text
              style={[
                styles.jamChipText,
                useCustomJam && styles.jamChipTextActive,
              ]}
            >
              Tulis Jam Custom Lainnya
            </Text>
          </TouchableOpacity>

          {useCustomJam && (
            <TextInput
              style={styles.customJamInput}
              placeholder="Contoh: 12:15 WIB"
              placeholderTextColor={COLORS.textSecondary}
              value={customJam}
              onChangeText={setCustomJam}
            />
          )}
        </View>

        {/* Catatan untuk Tenant */}
        <Text style={styles.sectionHeader}>📝 Catatan Tambahan (Opsional)</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.notesInput}
            placeholder="Contoh: Sambal dipisah, tidak pakai seledri, dll."
            placeholderTextColor={COLORS.textSecondary}
            value={catatan}
            onChangeText={setCatatan}
            multiline
            numberOfLines={2}
          />
        </View>

        {/* Metode Pembayaran (US-06) */}
        <Text style={styles.sectionHeader}>💳 Metode Pembayaran</Text>
        <View style={styles.card}>
          {/* Opsi QRIS */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'QRIS' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('QRIS')}
            activeOpacity={0.8}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIconBox, { backgroundColor: COLORS.orange }]}>
                <Ionicons name="qr-code" size={18} color={COLORS.brownDark} />
              </View>
              <View>
                <Text style={styles.paymentName}>QRIS Kampus UINSA</Text>
                <Text style={styles.paymentSub}>BCA, Mandiri, BRI, GoPay, OVO, ShopeePay</Text>
              </View>
            </View>
            <Ionicons
              name={paymentMethod === 'QRIS' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'QRIS' ? COLORS.primaryDark : COLORS.textSecondary}
            />
          </TouchableOpacity>

          {/* Opsi E-Wallet */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'E-Wallet' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('E-Wallet')}
            activeOpacity={0.8}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIconBox, { backgroundColor: COLORS.infoLightBlue }]}>
                <Ionicons name="wallet-outline" size={18} color={COLORS.infoDarkBlue} />
              </View>
              <View>
                <Text style={styles.paymentName}>E-Wallet Langsung</Text>
                <Text style={styles.paymentSub}>DANA, GoPay, ShopeePay Kampus</Text>
              </View>
            </View>
            <Ionicons
              name={paymentMethod === 'E-Wallet' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'E-Wallet' ? COLORS.primaryDark : COLORS.textSecondary}
            />
          </TouchableOpacity>

          {/* Opsi Tunai */}
          <TouchableOpacity
            style={[
              styles.paymentOption,
              paymentMethod === 'Tunai' && styles.paymentOptionActive,
            ]}
            onPress={() => setPaymentMethod('Tunai')}
            activeOpacity={0.8}
          >
            <View style={styles.paymentLeft}>
              <View style={[styles.paymentIconBox, { backgroundColor: COLORS.badgeBackground }]}>
                <Ionicons name="cash-outline" size={18} color={COLORS.textBody} />
              </View>
              <View>
                <Text style={styles.paymentName}>Bayar Tunai di Stan</Text>
                <Text style={styles.paymentSub}>Bayar saat ambil pesanan di stan</Text>
              </View>
            </View>
            <Ionicons
              name={paymentMethod === 'Tunai' ? 'radio-button-on' : 'radio-button-off'}
              size={20}
              color={paymentMethod === 'Tunai' ? COLORS.primaryDark : COLORS.textSecondary}
            />
          </TouchableOpacity>

          {/* Panel Informasi QRIS & Bukti Pembayaran (US-07) */}
          {paymentMethod !== 'Tunai' && (
            <View style={styles.qrisInfoBox}>
              <View style={styles.qrisHeaderRow}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.activeGreen} />
                <Text style={styles.qrisTitle}>Simulasi Pembayaran Non-Tunai</Text>
              </View>
              <Text style={styles.qrisDesc}>
                Sistem FastCanteen memverifikasi bukti transaksi secara otomatis untuk
                mempercepat penerimaan pesanan oleh pihak tenant.
              </Text>
              <View style={styles.proofBadge}>
                <Ionicons name="checkmark-circle" size={14} color={COLORS.textSuccessDark} />
                <Text style={styles.proofBadgeText}>Bukti Valid Terlampir Otomatis</Text>
              </View>
            </View>
          )}
        </View>

        {/* Rincian Pembayaran */}
        <Text style={styles.sectionHeader}>🧾 Ringkasan Biaya</Text>
        <View style={styles.card}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Subtotal ({totalCount} menu)</Text>
            <Text style={styles.summaryValue}>{formatIDR(totalAmount)}</Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Biaya Layanan Kampus</Text>
            <Text style={[styles.summaryValue, { color: COLORS.activeGreen }]}>
              GRATIS
            </Text>
          </View>
          <View style={styles.itemDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.totalLabel}>Total Pembayaran</Text>
            <Text style={styles.totalValue}>{formatIDR(totalAmount)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Button Konfirmasi */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomPriceCol}>
          <Text style={styles.bottomPriceLabel}>Total Tagihan:</Text>
          <Text style={styles.bottomPriceValue}>{formatIDR(totalAmount)}</Text>
        </View>

        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleCheckout}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color={COLORS.brownDark} />
          ) : (
            <View style={styles.confirmButtonInner}>
              <Text style={styles.confirmButtonText}>Konfirmasi Pre-Order</Text>
              <Ionicons name="checkmark-circle" size={18} color={COLORS.brownDark} />
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundMain,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.cardBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inactiveElement,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.inputBackground,
  },
  headerTitleCol: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.goldenBrown,
    fontWeight: '600',
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  clearBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
  scrollContent: {
    padding: SPACING.lg,
    paddingBottom: 110,
  },
  tenantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    gap: 10,
  },
  tenantBannerTextCol: {
    flex: 1,
  },
  tenantBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tenantBannerSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
    marginTop: SPACING.sm,
  },
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    ...SHADOWS.soft,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.inputBackground,
  },
  itemInfoCol: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  itemPrice: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '800',
    marginTop: 2,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBackground,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  stepBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  stepCount: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
    paddingHorizontal: 6,
  },
  deleteBtn: {
    marginLeft: SPACING.md,
    padding: 4,
  },
  itemDivider: {
    height: 1,
    backgroundColor: COLORS.inactiveElement,
    marginVertical: 8,
  },
  helperText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  jamChipsContainer: {
    gap: 8,
  },
  jamChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBackground,
    paddingVertical: 9,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    gap: 6,
  },
  jamChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  jamChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  jamChipTextActive: {
    color: COLORS.cardBackground,
    fontWeight: '700',
  },
  customJamInput: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveTab,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    fontSize: 13,
    marginTop: SPACING.sm,
    color: COLORS.textPrimary,
  },
  notesInput: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveTab,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: 6,
  },
  paymentOptionActive: {
    backgroundColor: COLORS.inputBackground,
  },
  paymentLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  paymentIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paymentName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  paymentSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  qrisInfoBox: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primaryDark,
  },
  qrisHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  qrisTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  qrisDesc: {
    fontSize: 11,
    color: COLORS.textBody,
    lineHeight: 15,
  },
  proofBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeSuccess,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    gap: 5,
  },
  proofBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSuccessDark,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textBody,
  },
  summaryValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBackground,
    borderTopWidth: 1,
    borderTopColor: COLORS.inactiveElement,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...SHADOWS.card,
  },
  bottomPriceCol: {
    flex: 1,
  },
  bottomPriceLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  bottomPriceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  confirmButton: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
    ...SHADOWS.soft,
  },
  confirmButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  confirmButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brownDark,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xxl,
    backgroundColor: COLORS.backgroundMain,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: SPACING.xl,
  },
  browseButton: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 12,
    borderRadius: RADIUS.md,
  },
  browseButtonText: {
    color: COLORS.cardBackground,
    fontSize: 14,
    fontWeight: '700',
  },
});
