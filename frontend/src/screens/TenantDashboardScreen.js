import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function TenantDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const tenantId = user?.tenant?.id || 1;
  const tenantName = user?.tenant?.nama_tenant || 'Stan Kantin UINSA';
  const tenantLocation =
    user?.tenant?.lokasi_stan || 'Kantin Belakang Lt. 1 UINSA Kampus 2';

  const [activeTab, setActiveTab] = useState('orders'); // 'orders' | 'menus'
  const [statusFilter, setStatusFilter] = useState('Semua'); // 'Semua' | 'Diproses' | 'Siap Diambil' | 'Selesai'
  const [orders, setOrders] = useState([]);
  const [menus, setMenus] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal Tambah Menu Baru (US-09)
  const [modalVisible, setModalVisible] = useState(false);
  const [newMenuNama, setNewMenuNama] = useState('');
  const [newMenuHarga, setNewMenuHarga] = useState('');
  const [newMenuFoto, setNewMenuFoto] = useState('');
  const [submittingMenu, setSubmittingMenu] = useState(false);

  const fetchData = async () => {
    try {
      const [orderRes, summaryRes, menuRes] = await Promise.all([
        API.get(`/pesanan/tenant/${tenantId}`),
        API.get(`/pesanan/tenant/${tenantId}/ringkasan`),
        API.get(`/menu?id_tenant=${tenantId}`),
      ]);

      if (orderRes.data.success) {
        setOrders(orderRes.data.data);
      }
      if (summaryRes.data.success) {
        setSummary(summaryRes.data.data);
      }
      if (menuRes.data.success) {
        setMenus(menuRes.data.data);
      }
    } catch (err) {
      console.warn('Gagal memuat data tenant:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [tenantId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [tenantId]);

  const handleLogout = () => {
    Alert.alert('Keluar Akun', 'Keluar dari panel dashboard penjual?', [
      { text: 'Batal', style: 'cancel' },
      {
        text: 'Keluar',
        style: 'destructive',
        onPress: () => {
          logout();
          navigation.replace('Login');
        },
      },
    ]);
  };

  // Ubah Status Pesanan (US-08)
  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await API.put(`/pesanan/${orderId}/status`, { status: newStatus });
      if (res.data.success) {
        Alert.alert('Sukses', `Pesanan #${orderId} kini berstatus "${newStatus}".`);
        fetchData();
      }
    } catch (err) {
      Alert.alert('Gagal Mengubah Status', err.message);
    }
  };

  // Toggle Ketersediaan Menu (US-09)
  const handleToggleMenuStatus = async (menuId, currentStatus) => {
    const nextStatus = currentStatus === 'tersedia' ? 'habis' : 'tersedia';
    try {
      const res = await API.patch(`/menu/${menuId}/status`, {
        status_tersedia: nextStatus,
      });
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      Alert.alert('Gagal', err.message);
    }
  };

  // Tambah Menu Baru (US-09)
  const handleCreateMenu = async () => {
    if (!newMenuNama.trim() || !newMenuHarga.trim()) {
      Alert.alert('Perhatian', 'Nama menu dan harga wajib diisi.');
      return;
    }

    setSubmittingMenu(true);
    try {
      const payload = {
        id_tenant: tenantId,
        nama_menu: newMenuNama.trim(),
        harga: parseFloat(newMenuHarga),
        foto:
          newMenuFoto.trim() ||
          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
        status_tersedia: 'tersedia',
      };

      const res = await API.post('/menu', payload);
      if (res.data.success) {
        Alert.alert('Berhasil', 'Menu baru berhasil ditambahkan ke stan kantin Anda!');
        setNewMenuNama('');
        setNewMenuHarga('');
        setNewMenuFoto('');
        setModalVisible(false);
        fetchData();
      }
    } catch (err) {
      Alert.alert('Gagal Menyimpan Menu', err.message);
    } finally {
      setSubmittingMenu(false);
    }
  };

  const openWhatsApp = (phone, orderId, mhsName) => {
    if (!phone) {
      Alert.alert('Info', 'Nomor telepon mahasiswa tidak tersedia.');
      return;
    }
    const cleanPhone = phone.replace(/^0/, '62');
    const msg = encodeURIComponent(
      `Halo Kak ${mhsName}, ini dari ${tenantName} terkait pesanan FastCanteen #${orderId}.`
    );
    Linking.openURL(`https://wa.me/${cleanPhone}?text=${msg}`).catch(() => {
      Alert.alert('Peringatan', 'Tidak dapat membuka aplikasi WhatsApp.');
    });
  };

  const formatIDR = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'Semua') return true;
    return o.status === statusFilter;
  });

  return (
    <View style={styles.container}>
      {/* Banner Khusus jika Super Admin sedang meninjau tampilan tenant */}
      {user?.peran === 'admin' && (
        <View style={styles.adminBanner}>
          <View style={styles.adminBannerLeft}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.orange} />
            <Text style={styles.adminBannerText}>Pratinjau Tampilan Tenant Stan Kantin</Text>
          </View>
          <TouchableOpacity
            style={styles.adminReturnButton}
            onPress={() => navigation.navigate('SuperAdminDashboard')}
            activeOpacity={0.7}
          >
            <Text style={styles.adminReturnText}>Kembali ke Admin</Text>
            <Ionicons name="arrow-forward" size={12} color={COLORS.cardBackground} />
          </TouchableOpacity>
        </View>
      )}

      {/* Header Dashboard Tenant */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.tenantBadgeIcon}>
            <Ionicons name="storefront" size={20} color={COLORS.orange} />
          </View>
          <View>
            <Text style={styles.tenantTitle} numberOfLines={1}>
              {tenantName}
            </Text>
            <Text style={styles.tenantLocationText} numberOfLines={1}>
              {tenantLocation}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        </TouchableOpacity>
      </View>

      {/* Ringkasan Penjualan Hari Ini (US-13) */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Omzet</Text>
          <Text style={styles.summaryValue}>
            {formatIDR(summary?.statistik?.total_pendapatan)}
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Perlu Dimasak</Text>
          <Text style={[styles.summaryValue, { color: COLORS.queueOrange }]}>
            {summary?.statistik?.antrean_diproses || 0} Antrean
          </Text>
        </View>

        <View style={styles.summaryDivider} />

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Siap Diambil</Text>
          <Text style={[styles.summaryValue, { color: COLORS.textSuccess }]}>
            {summary?.statistik?.siap_diambil || 0} Siap
          </Text>
        </View>
      </View>

      {/* Tab Navigasi: Antrean Pesanan vs Kelola Menu */}
      <View style={styles.tabNavRow}>
        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'orders' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Ionicons
            name="receipt-outline"
            size={16}
            color={activeTab === 'orders' ? COLORS.cardBackground : COLORS.textBody}
          />
          <Text
            style={[
              styles.mainTabText,
              activeTab === 'orders' && styles.mainTabTextActive,
            ]}
          >
            Antrean Masuk ({orders.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.mainTabBtn, activeTab === 'menus' && styles.mainTabBtnActive]}
          onPress={() => setActiveTab('menus')}
        >
          <Ionicons
            name="fast-food-outline"
            size={16}
            color={activeTab === 'menus' ? COLORS.cardBackground : COLORS.textBody}
          />
          <Text
            style={[
              styles.mainTabText,
              activeTab === 'menus' && styles.mainTabTextActive,
            ]}
          >
            Kelola Menu ({menus.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Konten Tab Antrean Pesanan */}
      {activeTab === 'orders' && (
        <>
          {/* Sub-Filter Status */}
          <View style={styles.statusFilterRow}>
            {['Semua', 'Diproses', 'Siap Diambil', 'Selesai'].map((st) => {
              const isSelected = statusFilter === st;
              return (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusChip,
                    isSelected && styles.statusChipActive,
                  ]}
                  onPress={() => setStatusFilter(st)}
                >
                  <Text
                    style={[
                      styles.statusChipText,
                      isSelected && styles.statusChipTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {loading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={COLORS.primaryDark} />
              <Text style={styles.loadingText}>Memuat antrean pesanan...</Text>
            </View>
          ) : (
            <FlatList
              data={filteredOrders}
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
                  <Ionicons name="clipboard-outline" size={48} color={COLORS.divider} />
                  <Text style={styles.emptyTitle}>Tidak Ada Pesanan</Text>
                  <Text style={styles.emptySubtitle}>
                    Belum ada antrean masuk pada kategori status ini.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isDiproses = item.status === 'Diproses';
                const isSiap = item.status === 'Siap Diambil';
                const isSelesai = item.status === 'Selesai';

                return (
                  <View style={styles.orderCard}>
                    {/* Top Row: Order ID, Waktu & Jam Pengambilan */}
                    <View style={styles.orderCardTop}>
                      <View>
                        <Text style={styles.orderIdText}>Pesanan #{item.id}</Text>
                        <Text style={styles.orderDateText}>
                          {new Date(item.waktu_transaksi).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </Text>
                      </View>

                      {/* Jam Pengambilan Target (US-05) */}
                      <View style={styles.targetJamBadge}>
                        <Ionicons name="time" size={13} color={COLORS.brownDark} />
                        <Text style={styles.targetJamText}>
                          Ambil: {item.jam_pengambilan}
                        </Text>
                      </View>
                    </View>

                    {/* Info Pemesan Mahasiswa */}
                    <View style={styles.mhsRow}>
                      <View style={styles.mhsInfo}>
                        <Text style={styles.mhsName}>{item.nama_mahasiswa}</Text>
                        <Text style={styles.mhsNim}>
                          {item.nim_mahasiswa ? `NIM ${item.nim_mahasiswa}` : 'Mahasiswa'}
                        </Text>
                      </View>

                      {/* Kontak WhatsApp Mahasiswa */}
                      {item.no_hp_mahasiswa && (
                        <TouchableOpacity
                          style={styles.waBtn}
                          onPress={() =>
                            openWhatsApp(
                              item.no_hp_mahasiswa,
                              item.id,
                              item.nama_mahasiswa
                            )
                          }
                        >
                          <Ionicons
                            name="logo-whatsapp"
                            size={16}
                            color={COLORS.cardBackground}
                          />
                          <Text style={styles.waBtnText}>Chat WA</Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Rincian Menu Dipesan */}
                    <View style={styles.itemsBox}>
                      {item.items &&
                        item.items.map((it, idx) => (
                          <View key={idx} style={styles.itemDetailRow}>
                            <Text style={styles.itemDetailName}>
                              {it.jumlah_pesanan}x {it.nama_menu}
                            </Text>
                            <Text style={styles.itemDetailPrice}>
                              {formatIDR(it.sub_harga)}
                            </Text>
                          </View>
                        ))}
                      {item.catatan && (
                        <Text style={styles.orderCatatan}>
                          Catatan: "{item.catatan}"
                        </Text>
                      )}
                    </View>

                    {/* Baris Total & Status Bayar */}
                    <View style={styles.paymentStatusRow}>
                      <View>
                        <Text style={styles.payMethodLabel}>
                          Bayar: {item.metode_pembayaran}
                        </Text>
                        <Text style={styles.totalPriceText}>
                          {formatIDR(item.total_harga)}
                        </Text>
                      </View>

                      {/* Badge Status Saat Ini */}
                      <View
                        style={[
                          styles.statusBadge,
                          isDiproses && styles.statusBadgeDiproses,
                          isSiap && styles.statusBadgeSiap,
                          isSelesai && styles.statusBadgeSelesai,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isDiproses && styles.statusTextDiproses,
                            isSiap && styles.statusTextSiap,
                            isSelesai && styles.statusTextSelesai,
                          ]}
                        >
                          {item.status}
                        </Text>
                      </View>
                    </View>

                    {/* Action Buttons: US-08 Update Status */}
                    <View style={styles.actionRow}>
                      {isDiproses && (
                        <TouchableOpacity
                          style={styles.readyButton}
                          onPress={() => handleUpdateStatus(item.id, 'Siap Diambil')}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="notifications-outline"
                            size={16}
                            color={COLORS.cardBackground}
                          />
                          <Text style={styles.readyButtonText}>
                            Tandai Siap Diambil
                          </Text>
                        </TouchableOpacity>
                      )}

                      {isSiap && (
                        <TouchableOpacity
                          style={styles.finishButton}
                          onPress={() => handleUpdateStatus(item.id, 'Selesai')}
                          activeOpacity={0.8}
                        >
                          <Ionicons
                            name="checkmark-done-circle-outline"
                            size={16}
                            color={COLORS.cardBackground}
                          />
                          <Text style={styles.finishButtonText}>
                            Selesaikan (Sudah Diambil)
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              }}
            />
          )}
        </>
      )}

      {/* Konten Tab Kelola Menu (US-09) */}
      {activeTab === 'menus' && (
        <View style={styles.menuTabContainer}>
          <TouchableOpacity
            style={styles.addMenuHeaderBtn}
            onPress={() => setModalVisible(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={18} color={COLORS.cardBackground} />
            <Text style={styles.addMenuHeaderBtnText}>+ Tambah Menu Baru</Text>
          </TouchableOpacity>

          <FlatList
            data={menus}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isTersedia = item.status_tersedia === 'tersedia';
              return (
                <View style={styles.tenantMenuCard}>
                  <View style={styles.tenantMenuInfo}>
                    <Text style={styles.tenantMenuName}>{item.nama_menu}</Text>
                    <Text style={styles.tenantMenuPrice}>
                      {formatIDR(item.harga)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.toggleStockBtn,
                      isTersedia
                        ? styles.toggleStockAvailable
                        : styles.toggleStockOut,
                    ]}
                    onPress={() =>
                      handleToggleMenuStatus(item.id, item.status_tersedia)
                    }
                  >
                    <Ionicons
                      name={isTersedia ? 'checkmark-circle' : 'close-circle'}
                      size={15}
                      color={isTersedia ? COLORS.textSuccessDark : COLORS.danger}
                    />
                    <Text
                      style={[
                        styles.toggleStockText,
                        isTersedia
                          ? styles.toggleStockTextAvailable
                          : styles.toggleStockTextOut,
                      ]}
                    >
                      {isTersedia ? 'Tersedia' : 'Habis'}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            }}
          />
        </View>
      )}

      {/* Modal Tambah Menu Baru */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tambah Menu Makanan/Minuman</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nama Menu</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Contoh: Nasi Kulit Crispy Sambal Matah"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newMenuNama}
                  onChangeText={setNewMenuNama}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Harga (Rp)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="Contoh: 15000"
                  placeholderTextColor={COLORS.textSecondary}
                  value={newMenuHarga}
                  onChangeText={setNewMenuHarga}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>URL Foto (Opsional)</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="https://..."
                  placeholderTextColor={COLORS.textSecondary}
                  value={newMenuFoto}
                  onChangeText={setNewMenuFoto}
                />
              </View>

              <TouchableOpacity
                style={styles.saveMenuBtn}
                onPress={handleCreateMenu}
                disabled={submittingMenu}
              >
                {submittingMenu ? (
                  <ActivityIndicator color={COLORS.cardBackground} />
                ) : (
                  <Text style={styles.saveMenuBtnText}>Simpan Menu Baru</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
    backgroundColor: COLORS.primaryDark,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  tenantBadgeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardBackground,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tenantTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.cardBackground,
  },
  tenantLocationText: {
    fontSize: 11,
    color: COLORS.badgeBackground,
    marginTop: 1,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.full,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    ...SHADOWS.soft,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.inactiveElement,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  tabNavRow: {
    flexDirection: 'row',
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    backgroundColor: COLORS.inactiveTab,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 6,
  },
  mainTabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 9,
    borderRadius: RADIUS.sm,
    gap: 6,
  },
  mainTabBtnActive: {
    backgroundColor: COLORS.primaryDark,
  },
  mainTabText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textBody,
  },
  mainTabTextActive: {
    color: COLORS.cardBackground,
  },
  statusFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    gap: 6,
  },
  statusChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.badgeBackground,
  },
  statusChipActive: {
    backgroundColor: COLORS.primary,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  statusChipTextActive: {
    color: COLORS.cardBackground,
    fontWeight: '700',
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
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
  orderCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inactiveElement,
    paddingBottom: 8,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  orderDateText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  targetJamBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.statusWaitingBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  targetJamText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.queueOrange,
  },
  mhsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginVertical: 8,
  },
  mhsInfo: {
    flex: 1,
  },
  mhsName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  mhsNim: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  waBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.whatsappGreen,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  waBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cardBackground,
  },
  itemsBox: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
    marginVertical: 4,
  },
  itemDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  itemDetailName: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  itemDetailPrice: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  orderCatatan: {
    fontSize: 11,
    fontStyle: 'italic',
    color: COLORS.goldenBrown,
    marginTop: 4,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.inactiveElement,
  },
  payMethodLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  totalPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusBadgeDiproses: {
    backgroundColor: COLORS.statusWaitingBg,
  },
  statusBadgeSiap: {
    backgroundColor: COLORS.badgeSuccess,
  },
  statusBadgeSelesai: {
    backgroundColor: COLORS.infoLightBlue,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextDiproses: {
    color: COLORS.queueOrange,
  },
  statusTextSiap: {
    color: COLORS.textSuccessDark,
  },
  statusTextSelesai: {
    color: COLORS.infoDarkBlue,
  },
  actionRow: {
    marginTop: SPACING.md,
  },
  readyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.soft,
  },
  readyButtonText: {
    color: COLORS.cardBackground,
    fontSize: 13,
    fontWeight: '700',
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.infoDarkBlue,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    gap: 6,
  },
  finishButtonText: {
    color: COLORS.cardBackground,
    fontSize: 13,
    fontWeight: '700',
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
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: SPACING.sm,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  menuTabContainer: {
    flex: 1,
    paddingTop: SPACING.sm,
  },
  addMenuHeaderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    marginHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    gap: 6,
    ...SHADOWS.soft,
  },
  addMenuHeaderBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brownDark,
  },
  tenantMenuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.cardBackground,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
  },
  tenantMenuInfo: {
    flex: 1,
  },
  tenantMenuName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  tenantMenuPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  toggleStockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  toggleStockAvailable: {
    backgroundColor: COLORS.badgeSuccess,
  },
  toggleStockOut: {
    backgroundColor: COLORS.dangerBg,
  },
  toggleStockText: {
    fontSize: 11,
    fontWeight: '800',
  },
  toggleStockTextAvailable: {
    color: COLORS.textSuccessDark,
  },
  toggleStockTextOut: {
    color: COLORS.danger,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  inputGroup: {
    marginBottom: SPACING.md,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textBody,
    marginBottom: 6,
  },
  modalInput: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveTab,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  saveMenuBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    marginTop: SPACING.md,
    marginBottom: SPACING.xl,
  },
  saveMenuBtnText: {
    color: COLORS.cardBackground,
    fontSize: 14,
    fontWeight: '700',
  },
  adminBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: SPACING.lg,
    marginTop: Platform.OS === 'ios' ? 48 : 28,
    borderRadius: RADIUS.md,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.brownDark,
  },
  adminReturnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  adminReturnText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.cardBackground,
  },
});
