import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function OrderHistoryScreen({ navigation }) {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOrders = async () => {
    if (!user || !user.id) return;
    try {
      const res = await API.get(`/pesanan/mahasiswa/${user.id}`);
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.warn('Gagal memuat riwayat pesanan:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [user]);

  const formatIDR = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  const renderStatusTracker = (status) => {
    if (status === 'Dibatalkan') {
      return (
        <View style={styles.cancelledBannerBox}>
          <Ionicons name="close-circle" size={16} color={COLORS.danger} />
          <Text style={styles.cancelledBannerText}>Pesanan Dibatalkan</Text>
        </View>
      );
    }

    const isMenunggu = status === 'Menunggu';
    const isDiproses = status === 'Diproses';
    const isSiap = status === 'Siap Diambil';
    const isSelesai = status === 'Selesai';

    const step1Active = true;
    const step2Active = isDiproses || isSiap || isSelesai;
    const step3Active = isSiap || isSelesai;
    const step4Active = isSelesai;

    return (
      <View style={styles.trackerContainer}>
        {/* Step 1: Menunggu */}
        <View style={styles.trackerStep}>
          <View style={[styles.stepCircle, step1Active && styles.stepCircleActive]}>
            <Ionicons name="time" size={11} color={COLORS.cardBackground} />
          </View>
          <Text style={[styles.stepText, step1Active && styles.stepTextActive]}>
            Menunggu
          </Text>
        </View>

        <View style={[styles.trackerLine, step2Active && styles.trackerLineActive]} />

        {/* Step 2: Dimasak */}
        <View style={styles.trackerStep}>
          <View style={[styles.stepCircle, step2Active && styles.stepCircleActive]}>
            <Ionicons
              name="flame"
              size={11}
              color={step2Active ? COLORS.cardBackground : COLORS.textSecondary}
            />
          </View>
          <Text style={[styles.stepText, step2Active && styles.stepTextActive]}>
            Dimasak
          </Text>
        </View>

        <View style={[styles.trackerLine, step3Active && styles.trackerLineActive]} />

        {/* Step 3: Siap */}
        <View style={styles.trackerStep}>
          <View style={[styles.stepCircle, step3Active && styles.stepCircleActive]}>
            <Ionicons
              name="checkmark"
              size={12}
              color={step3Active ? COLORS.cardBackground : COLORS.textSecondary}
            />
          </View>
          <Text style={[styles.stepText, step3Active && styles.stepTextActive]}>
            Siap
          </Text>
        </View>

        <View style={[styles.trackerLine, step4Active && styles.trackerLineActive]} />

        {/* Step 4: Selesai */}
        <View style={styles.trackerStep}>
          <View style={[styles.stepCircle, step4Active && styles.stepCircleActive]}>
            <Ionicons
              name="happy"
              size={11}
              color={step4Active ? COLORS.cardBackground : COLORS.textSecondary}
            />
          </View>
          <Text style={[styles.stepText, step4Active && styles.stepTextActive]}>
            Selesai
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.primaryDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Riwayat & Status Pesanan</Text>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshIconBtn}>
          <Ionicons name="refresh" size={20} color={COLORS.primaryDark} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>Memuat riwayat pesanan...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primaryDark]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={54} color={COLORS.divider} />
              <Text style={styles.emptyTitle}>Belum Ada Riwayat Pesanan</Text>
              <Text style={styles.emptySubtitle}>
                Pre-order makanan Anda sekarang untuk menghindari antrean di kantin kampus.
              </Text>
              <TouchableOpacity
                style={styles.orderNowBtn}
                onPress={() => navigation.navigate('Menu')}
              >
                <Text style={styles.orderNowBtnText}>Pesan Sekarang</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const stPesanan = item.status_pesanan || item.status || 'Menunggu';
            const stBayar = item.status_pembayaran || 'Sudah Dibayar';
            const isSiapDiambil = stPesanan === 'Siap Diambil';

            return (
              <View style={styles.orderCard}>
                {/* Banner Siap Diambil jika status Siap Diambil (US-10) */}
                {isSiapDiambil && (
                  <View style={styles.readyAlertBanner}>
                    <Ionicons
                      name="notifications"
                      size={18}
                      color={COLORS.textSuccessDark}
                    />
                    <View style={styles.readyAlertTextCol}>
                      <Text style={styles.readyAlertTitle}>
                        Makanan Anda Sudah Siap! 🎉
                      </Text>
                      <Text style={styles.readyAlertSubtitle}>
                        Silakan langsung ke {item.nama_tenant} ({item.lokasi_stan})
                        tanpa perlu mengantre.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Top Info */}
                <View style={styles.orderCardHeader}>
                  <View>
                    <Text style={styles.tenantName}>{item.nama_tenant}</Text>
                    <Text style={styles.stanLocation}>{item.lokasi_stan}</Text>
                  </View>
                  <View style={styles.idBadge}>
                    <Text style={styles.idBadgeText}>#{item.id}</Text>
                  </View>
                </View>

                {/* Status Pembayaran & Waktu Transaksi (Revisi Poin 2 & Poin 5) */}
                <View style={styles.statusMetaRow}>
                  <View style={styles.metaTimeBadge}>
                    <Ionicons name="time-outline" size={13} color={COLORS.textSecondary} />
                    <Text style={styles.metaTimeText}>
                      {new Date(item.waktu_transaksi).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} WIB
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.payBadgeMhs,
                      stBayar === 'Sudah Dibayar' ? styles.payBadgeLunas : styles.payBadgeBelum,
                    ]}
                  >
                    <Ionicons
                      name={stBayar === 'Sudah Dibayar' ? 'checkmark-circle' : 'hourglass-outline'}
                      size={12}
                      color={stBayar === 'Sudah Dibayar' ? COLORS.textSuccessDark : COLORS.urgentOrange}
                    />
                    <Text
                      style={[
                        styles.payBadgeMhsText,
                        stBayar === 'Sudah Dibayar' ? styles.payBadgeLunasText : styles.payBadgeBelumText,
                      ]}
                    >
                      {stBayar}
                    </Text>
                  </View>
                </View>

                {/* Tracker Visual Status */}
                {renderStatusTracker(stPesanan)}

                {/* Rincian Menu */}
                <View style={styles.itemsSummary}>
                  {item.items &&
                    item.items.map((it, idx) => (
                      <View key={idx} style={styles.itemRow}>
                        <Text style={styles.itemName}>
                          {it.jumlah_pesanan}x {it.nama_menu}
                        </Text>
                        <Text style={styles.itemPrice}>
                          {formatIDR(it.sub_harga)}
                        </Text>
                      </View>
                    ))}
                  {item.catatan && (
                    <Text style={styles.catatanText}>
                      Catatan: {item.catatan}
                    </Text>
                  )}
                </View>

                {/* Footer Biaya */}
                <View style={styles.orderCardFooter}>
                  <View>
                    <Text style={styles.payMethodText}>
                      {item.metode_pembayaran} ·{' '}
                      {new Date(item.waktu_transaksi).toLocaleDateString('id-ID')}
                    </Text>
                    <Text style={styles.totalPrice}>
                      {formatIDR(item.total_harga)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.reorderBtn}
                    onPress={() => navigation.navigate('Menu')}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="repeat" size={14} color={COLORS.primaryDark} />
                    <Text style={styles.reorderBtnText}>Pesan Lagi</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
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
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  refreshIconBtn: {
    padding: 6,
  },
  listContent: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    ...SHADOWS.soft,
  },
  readyAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeSuccess,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    gap: 10,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.textSuccessDark,
  },
  readyAlertTextCol: {
    flex: 1,
  },
  readyAlertTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textSuccessDark,
  },
  readyAlertSubtitle: {
    fontSize: 11,
    color: COLORS.textSuccessEmerald,
    marginTop: 2,
    lineHeight: 15,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  tenantName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  stanLocation: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  idBadge: {
    backgroundColor: COLORS.badgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  idBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textBody,
  },
  pickupTimeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginTop: SPACING.sm,
    gap: 5,
  },
  pickupTimeLabel: {
    fontSize: 11,
    color: COLORS.textBody,
  },
  pickupTimeValue: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.goldenBrown,
  },
  trackerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
  },
  trackerStep: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.inactiveElement,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepCircleActive: {
    backgroundColor: COLORS.primaryDark,
  },
  stepText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  stepTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  trackerLine: {
    flex: 1,
    height: 2,
    backgroundColor: COLORS.inactiveElement,
    marginHorizontal: 4,
    marginBottom: 14,
  },
  trackerLineActive: {
    backgroundColor: COLORS.primaryDark,
  },
  itemsSummary: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  itemName: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  catatanText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.inactiveElement,
    paddingTop: 8,
    marginTop: 4,
  },
  payMethodText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  reorderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: SPACING.xl,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: SPACING.lg,
  },
  orderNowBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: SPACING.xl,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
  },
  orderNowBtnText: {
    color: COLORS.cardBackground,
    fontSize: 13,
    fontWeight: '700',
  },
  statusMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  metaTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaTimeText: {
    fontSize: 12,
    color: COLORS.textBody,
    fontWeight: '600',
  },
  payBadgeMhs: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  payBadgeLunas: {
    backgroundColor: COLORS.badgeSuccess,
  },
  payBadgeBelum: {
    backgroundColor: COLORS.statusWaitingBg,
  },
  payBadgeMhsText: {
    fontSize: 10,
    fontWeight: '700',
  },
  payBadgeLunasText: {
    color: COLORS.textSuccessDark,
  },
  payBadgeBelumText: {
    color: COLORS.urgentOrange,
  },
  cancelledBannerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    padding: 10,
    borderRadius: RADIUS.md,
    gap: 8,
    marginVertical: 8,
  },
  cancelledBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.danger,
  },
});
