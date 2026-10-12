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

export default function SuperAdminDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();

  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'tenants' | 'orders' | 'students'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [tenantsList, setTenantsList] = useState([]);
  const [ordersList, setOrdersList] = useState([]);
  const [studentsList, setStudentsList] = useState([]);
  const [selectedOrderFilter, setSelectedOrderFilter] = useState('Semua');

  // Modal Register Tenant
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formNamaPemilik, setFormNamaPemilik] = useState('');
  const [formNamaTenant, setFormNamaTenant] = useState('');
  const [formLokasiStan, setFormLokasiStan] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formKataSandi, setFormKataSandi] = useState('123456');
  const [formNoHp, setFormNoHp] = useState('');
  const [submittingTenant, setSubmittingTenant] = useState(false);

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, tenantsRes, ordersRes, studentsRes] = await Promise.all([
        API.get('/admin/overview'),
        API.get('/admin/tenants'),
        API.get('/admin/orders'),
        API.get('/admin/students'),
      ]);

      if (overviewRes.data.success) {
        setOverviewData(overviewRes.data.data);
      }
      if (tenantsRes.data.success) {
        setTenantsList(tenantsRes.data.data);
      }
      if (ordersRes.data.success) {
        setOrdersList(ordersRes.data.data);
      }
      if (studentsRes.data.success) {
        setStudentsList(studentsRes.data.data);
      }
    } catch (err) {
      console.warn('Gagal memuat data Super Admin Dashboard:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDashboardData();
  }, []);

  const handleRegisterTenantSubmit = async () => {
    if (
      !formNamaPemilik.trim() ||
      !formNamaTenant.trim() ||
      !formLokasiStan.trim() ||
      !formEmail.trim() ||
      !formKataSandi.trim()
    ) {
      Alert.alert('Perhatian', 'Mohon lengkapi semua kolom wajib.');
      return;
    }

    setSubmittingTenant(true);
    try {
      const payload = {
        nama_pemilik: formNamaPemilik.trim(),
        nama_tenant: formNamaTenant.trim(),
        lokasi_stan: formLokasiStan.trim(),
        email: formEmail.trim(),
        kata_sandi: formKataSandi.trim(),
        no_hp: formNoHp.trim() || null,
      };

      const res = await API.post('/admin/tenants', payload);
      if (res.data.success) {
        Alert.alert(
          'Sukses Mendaftarkan Stan',
          `Stan "${formNamaTenant}" berhasil didaftarkan!\n\nEmail login stan: ${formEmail}\nKata Sandi: ${formKataSandi}`,
          [{ text: 'OK' }]
        );
        setIsModalOpen(false);
        setFormNamaPemilik('');
        setFormNamaTenant('');
        setFormLokasiStan('');
        setFormEmail('');
        setFormKataSandi('123456');
        setFormNoHp('');
        fetchDashboardData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Gagal mendaftarkan tenant';
      Alert.alert('Gagal Pendaftaran', msg);
    } finally {
      setSubmittingTenant(false);
    }
  };

  const handleDeleteTenant = (tenant) => {
    Alert.alert(
      'Konfirmasi Hapus Tenant',
      `Yakin ingin menghapus "${tenant.nama_tenant}" dari sistem FastCanteen? Semua menu terkait akan ikut dihapus.`,
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Ya, Hapus',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await API.delete(`/admin/tenants/${tenant.id}`);
              if (res.data.success) {
                Alert.alert('Berhasil', res.data.message);
                fetchDashboardData();
              }
            } catch (err) {
              Alert.alert('Gagal Hapus', err.response?.data?.message || err.message);
            }
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert('Keluar Akun Super Admin', 'Apakah Anda yakin ingin keluar?', [
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

  const formatRupiah = (num) => {
    return 'Rp ' + Number(num || 0).toLocaleString('id-ID');
  };

  // 4 Super Admin Resmi UINSA
  const officialAdmins = overviewData?.super_admins || [
    {
      nim: '09020625073',
      nama: 'Rayhan Akmal Azhari',
      email: 'rayhan@uinsa.ac.id',
      role_label: 'Super Admin 1 · Database & System Architect',
      status: 'Aktif',
    },
    {
      nim: '09040625094',
      nama: 'Putra Mahardhika Surasa',
      email: 'putra@uinsa.ac.id',
      role_label: 'Super Admin 2 · Frontend & UI/UX Specialist',
      status: 'Aktif',
    },
    {
      nim: '09010625007',
      nama: 'Elka Putra Prasetiyo',
      email: 'elka@uinsa.ac.id',
      role_label: 'Super Admin 3 · Fullstack & API Integration Lead',
      status: 'Aktif',
    },
    {
      nim: '09030625107',
      nama: 'Rizki Ridhwan Arif S.',
      email: 'rizki@uinsa.ac.id',
      role_label: 'Super Admin 4 · Quality Assurance & Business Operations',
      status: 'Aktif',
    },
  ];

  const filteredOrders = ordersList.filter((ord) => {
    if (selectedOrderFilter === 'Semua') return true;
    return ord.status === selectedOrderFilter;
  });

  return (
    <View style={styles.container}>
      {/* Header Utama Super Admin */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerTitleContainer}>
            <View style={styles.badgeAdmin}>
              <Ionicons name="shield-checkmark" size={14} color={COLORS.orange} />
              <Text style={styles.badgeAdminText}>SUPER ADMIN PANEL</Text>
            </View>
            <Text style={styles.headerTitle}>FastCanteen UINSA</Text>
            <Text style={styles.headerSubtitle}>
              Kantin Belakang Kampus 2 · {user?.nama || 'Super Admin'} ({user?.nim || 'UINSA'})
            </Text>
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
          </TouchableOpacity>
        </View>

        {/* Quick View Role Switcher (untuk pengujian tampilan dosen & demo) */}
        <View style={styles.rolePreviewContainer}>
          <Text style={styles.rolePreviewLabel}>Pratinjau Tampilan Lain:</Text>
          <View style={styles.rolePreviewRow}>
            <TouchableOpacity
              style={styles.previewBtn}
              onPress={() => navigation.navigate('Menu')}
              activeOpacity={0.7}
            >
              <Ionicons name="school-outline" size={14} color={COLORS.primaryDark} />
              <Text style={styles.previewBtnText}>Tampilan Mahasiswa</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.previewBtn, { borderColor: COLORS.goldenBrown }]}
              onPress={() => navigation.navigate('TenantDashboard')}
              activeOpacity={0.7}
            >
              <Ionicons name="storefront-outline" size={14} color={COLORS.goldenBrown} />
              <Text style={[styles.previewBtnText, { color: COLORS.goldenBrown }]}>
                Tampilan Tenant
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Navigation Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabScroll}
        >
          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'overview' && styles.tabItemActive]}
            onPress={() => setActiveTab('overview')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="analytics-outline"
              size={16}
              color={activeTab === 'overview' ? COLORS.primaryDark : COLORS.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'overview' && styles.tabTextActive]}
            >
              Overview & Tim
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'tenants' && styles.tabItemActive]}
            onPress={() => setActiveTab('tenants')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="storefront-outline"
              size={16}
              color={activeTab === 'tenants' ? COLORS.primaryDark : COLORS.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'tenants' && styles.tabTextActive]}
            >
              Kelola Tenant ({tenantsList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'orders' && styles.tabItemActive]}
            onPress={() => setActiveTab('orders')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="receipt-outline"
              size={16}
              color={activeTab === 'orders' ? COLORS.primaryDark : COLORS.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}
            >
              Semua Pesanan ({ordersList.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabItem, activeTab === 'students' && styles.tabItemActive]}
            onPress={() => setActiveTab('students')}
            activeOpacity={0.7}
          >
            <Ionicons
              name="people-outline"
              size={16}
              color={activeTab === 'students' ? COLORS.primaryDark : COLORS.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === 'students' && styles.tabTextActive]}
            >
              Mahasiswa ({studentsList.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Konten Sesuai Tab */}
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>Memuat data kendali Super Admin...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentScroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primaryDark]}
            />
          }
        >
          {/* ===================== TAB 1: OVERVIEW & 4 SUPER ADMIN ===================== */}
          {activeTab === 'overview' && (
            <View>
              {/* Metric Cards Grid */}
              <View style={styles.metricGrid}>
                <View style={styles.metricCard}>
                  <View style={[styles.metricIconBox, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="storefront" size={20} color={COLORS.primaryDark} />
                  </View>
                  <Text style={styles.metricNumber}>
                    {overviewData?.statistik?.total_tenant || tenantsList.length}
                  </Text>
                  <Text style={styles.metricLabel}>Stan Tenant Kantin</Text>
                  <Text style={styles.metricSub}>Didaftarkan Admin</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconBox, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="receipt" size={20} color={COLORS.queueOrange} />
                  </View>
                  <Text style={styles.metricNumber}>
                    {overviewData?.statistik?.total_pesanan || ordersList.length}
                  </Text>
                  <Text style={styles.metricLabel}>Total Pre-Order</Text>
                  <Text style={styles.metricSub}>Masuk ke Sistem</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconBox, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="fast-food" size={20} color={COLORS.infoDarkBlue} />
                  </View>
                  <Text style={styles.metricNumber}>
                    {overviewData?.statistik?.total_menu || 0}
                  </Text>
                  <Text style={styles.metricLabel}>Menu Makanan</Text>
                  <Text style={styles.metricSub}>Tersedia di Kantin</Text>
                </View>

                <View style={styles.metricCard}>
                  <View style={[styles.metricIconBox, { backgroundColor: '#E0F2F1' }]}>
                    <Ionicons name="cash" size={20} color={COLORS.textSuccessDark} />
                  </View>
                  <Text style={styles.metricNumber}>
                    {formatRupiah(overviewData?.statistik?.total_omzet)}
                  </Text>
                  <Text style={styles.metricLabel}>Omzet Transaksi</Text>
                  <Text style={styles.metricSub}>Perputaran Kantin</Text>
                </View>
              </View>

              {/* Status Pesanan Realtime */}
              <View style={styles.cardSection}>
                <Text style={styles.sectionTitle}>Status Pesanan Kantin Hari Ini</Text>
                <View style={styles.statusRow}>
                  <View style={[styles.statusBox, { backgroundColor: '#FFF8E1' }]}>
                    <Text style={[styles.statusBoxNum, { color: COLORS.queueOrange }]}>
                      {overviewData?.statistik?.status_breakdown?.diproses || 0}
                    </Text>
                    <Text style={styles.statusBoxLabel}>Sedang Dimasak</Text>
                  </View>
                  <View style={[styles.statusBox, { backgroundColor: '#E8F5E9' }]}>
                    <Text style={[styles.statusBoxNum, { color: COLORS.textSuccessTeal }]}>
                      {overviewData?.statistik?.status_breakdown?.siap_diambil || 0}
                    </Text>
                    <Text style={styles.statusBoxLabel}>Siap Diambil</Text>
                  </View>
                  <View style={[styles.statusBox, { backgroundColor: '#EDE7F6' }]}>
                    <Text style={[styles.statusBoxNum, { color: '#512DA8' }]}>
                      {overviewData?.statistik?.status_breakdown?.selesai || 0}
                    </Text>
                    <Text style={styles.statusBoxLabel}>Selesai Diambil</Text>
                  </View>
                </View>
              </View>

              {/* SECTION: 4 SUPER ADMIN RESMI FASTCANTEEN */}
              <View style={styles.cardSection}>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={styles.sectionTitle}>Tim Super Admin FastCanteen</Text>
                    <Text style={styles.sectionSubtitle}>
                      4 Pengembang & Penanggung Jawab Sistem PjBL UIN Sunan Ampel
                    </Text>
                  </View>
                  <View style={styles.adminCounterChip}>
                    <Ionicons name="people" size={14} color={COLORS.primaryDark} />
                    <Text style={styles.adminCounterText}>4 Admin</Text>
                  </View>
                </View>

                {officialAdmins.map((adm, index) => {
                  const isCurrent = user?.nim === adm.nim || user?.email === adm.email;
                  return (
                    <View
                      key={adm.nim || index}
                      style={[styles.adminCard, isCurrent && styles.adminCardActive]}
                    >
                      <View style={styles.adminAvatarBox}>
                        <Text style={styles.adminAvatarText}>{index + 1}</Text>
                      </View>
                      <View style={styles.adminInfoBox}>
                        <View style={styles.adminNameRow}>
                          <Text style={styles.adminName}>{adm.nama}</Text>
                          {isCurrent && (
                            <View style={styles.youBadge}>
                              <Text style={styles.youBadgeText}>Anda</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.adminNim}>NIM: {adm.nim}</Text>
                        <Text style={styles.adminRole}>{adm.role_label}</Text>
                        <View style={styles.adminContactRow}>
                          <Ionicons name="mail-outline" size={12} color={COLORS.textSecondary} />
                          <Text style={styles.adminEmail}>{adm.email}</Text>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>

              {/* Pesanan Terbaru */}
              {overviewData?.pesanan_terbaru?.length > 0 && (
                <View style={styles.cardSection}>
                  <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>Aktivitas Pesanan Terbaru</Text>
                    <TouchableOpacity onPress={() => setActiveTab('orders')}>
                      <Text style={styles.seeAllText}>Lihat Semua</Text>
                    </TouchableOpacity>
                  </View>
                  {overviewData.pesanan_terbaru.map((ord) => (
                    <View key={ord.id} style={styles.recentOrderItem}>
                      <View style={styles.recentOrderLeft}>
                        <Text style={styles.recentOrderId}>#{ord.id} · {ord.nama_mahasiswa}</Text>
                        <Text style={styles.recentOrderTenant}>{ord.nama_tenant}</Text>
                        <Text style={styles.recentOrderTime}>
                          Ambil jam: {ord.jam_pengambilan} ({ord.metode_pembayaran})
                        </Text>
                      </View>
                      <View style={styles.recentOrderRight}>
                        <Text style={styles.recentOrderTotal}>
                          {formatRupiah(ord.total_harga)}
                        </Text>
                        <View
                          style={[
                            styles.badgeStatus,
                            ord.status === 'Siap Diambil'
                              ? styles.badgeSiap
                              : ord.status === 'Selesai'
                              ? styles.badgeSelesai
                              : styles.badgeDiproses,
                          ]}
                        >
                          <Text style={styles.badgeStatusText}>{ord.status}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* ===================== TAB 2: KELOLA STAN TENANT ===================== */}
          {activeTab === 'tenants' && (
            <View>
              {/* Banner Penjelasan Alur Tenant */}
              <View style={styles.infoBanner}>
                <Ionicons name="information-circle" size={24} color={COLORS.primaryDark} />
                <View style={styles.infoBannerContent}>
                  <Text style={styles.infoBannerTitle}>Kebijakan Pendaftaran Tenant</Text>
                  <Text style={styles.infoBannerDesc}>
                    Tenant stan kantin <Text style={{ fontWeight: 'bold' }}>TIDAK BISA mendaftar sendiri</Text> dari aplikasi publik. Hanya Super Admin yang berhak mendaftarkan akun dan stan kantin baru.
                  </Text>
                </View>
              </View>

              {/* Action Bar: Tombol Tambah Tenant */}
              <View style={styles.actionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Daftar Stan Tenant Kantin</Text>
                  <Text style={styles.sectionSubtitle}>
                    Total {tenantsList.length} stan terdaftar di Kantin Belakang Kampus 2
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.btnPrimaryAdd}
                  onPress={() => setIsModalOpen(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle" size={18} color={COLORS.cardBackground} />
                  <Text style={styles.btnPrimaryAddText}>+ Daftarkan Tenant</Text>
                </TouchableOpacity>
              </View>

              {/* List Tenants */}
              {tenantsList.map((t) => (
                <View key={t.id} style={styles.tenantCard}>
                  <View style={styles.tenantCardHeader}>
                    <View style={styles.tenantLogoCircle}>
                      <Ionicons name="storefront" size={22} color={COLORS.primaryDark} />
                    </View>
                    <View style={styles.tenantMainInfo}>
                      <Text style={styles.tenantName}>{t.nama_tenant}</Text>
                      <View style={styles.locationChipRow}>
                        <Ionicons name="location-outline" size={13} color={COLORS.goldenBrown} />
                        <Text style={styles.tenantLocation}>{t.lokasi_stan}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.tenantMetaBox}>
                    <View style={styles.tenantMetaRow}>
                      <Text style={styles.tenantMetaLabel}>Pengelola / Pemilik:</Text>
                      <Text style={styles.tenantMetaValue}>{t.nama_pemilik || '-'}</Text>
                    </View>
                    <View style={styles.tenantMetaRow}>
                      <Text style={styles.tenantMetaLabel}>Email Login:</Text>
                      <Text style={[styles.tenantMetaValue, { color: COLORS.infoDarkBlue }]}>
                        {t.email_pemilik || '-'}
                      </Text>
                    </View>
                    <View style={styles.tenantMetaRow}>
                      <Text style={styles.tenantMetaLabel}>WhatsApp / HP:</Text>
                      <Text style={styles.tenantMetaValue}>{t.no_hp_pemilik || '-'}</Text>
                    </View>
                  </View>

                  {/* Statistik Tenant */}
                  <View style={styles.tenantStatsRow}>
                    <View style={styles.tenantStatCol}>
                      <Text style={styles.tenantStatNum}>{t.total_menu || 0}</Text>
                      <Text style={styles.tenantStatLabel}>Menu Aktif</Text>
                    </View>
                    <View style={styles.tenantStatDivider} />
                    <View style={styles.tenantStatCol}>
                      <Text style={styles.tenantStatNum}>{t.total_pesanan || 0}</Text>
                      <Text style={styles.tenantStatLabel}>Pesanan Masuk</Text>
                    </View>
                    <View style={styles.tenantStatDivider} />
                    <View style={styles.tenantStatCol}>
                      <Text style={[styles.tenantStatNum, { color: COLORS.primaryDark }]}>
                        {formatRupiah(t.total_pendapatan)}
                      </Text>
                      <Text style={styles.tenantStatLabel}>Omzet Stan</Text>
                    </View>
                  </View>

                  {/* Footer Tombol Hapus */}
                  <View style={styles.tenantCardFooter}>
                    <TouchableOpacity
                      style={styles.deleteTenantBtn}
                      onPress={() => handleDeleteTenant(t)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
                      <Text style={styles.deleteTenantBtnText}>Hapus Stan</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ===================== TAB 3: SEMUA PESANAN ===================== */}
          {activeTab === 'orders' && (
            <View>
              <Text style={styles.sectionTitle}>Monitoring Seluruh Pesanan Kantin</Text>
              <Text style={styles.sectionSubtitle}>
                Pantau pesanan yang masuk ke seluruh tenant secara terpusat
              </Text>

              {/* Filter Status Chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterChipScroll}
              >
                {['Semua', 'Diproses', 'Siap Diambil', 'Selesai'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.filterChip,
                      selectedOrderFilter === st && styles.filterChipActive,
                    ]}
                    onPress={() => setSelectedOrderFilter(st)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        selectedOrderFilter === st && styles.filterChipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {filteredOrders.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="receipt-outline" size={48} color={COLORS.divider} />
                  <Text style={styles.emptyTitle}>Belum Ada Pesanan</Text>
                  <Text style={styles.emptySubtitle}>
                    Tidak ada pesanan dengan status "{selectedOrderFilter}".
                  </Text>
                </View>
              ) : (
                filteredOrders.map((ord) => (
                  <View key={ord.id} style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <View>
                        <Text style={styles.orderIdText}>Pesanan #{ord.id}</Text>
                        <Text style={styles.orderTenantText}>Stan: {ord.nama_tenant}</Text>
                      </View>
                      <View
                        style={[
                          styles.badgeStatus,
                          ord.status === 'Siap Diambil'
                            ? styles.badgeSiap
                            : ord.status === 'Selesai'
                            ? styles.badgeSelesai
                            : styles.badgeDiproses,
                        ]}
                      >
                        <Text style={styles.badgeStatusText}>{ord.status}</Text>
                      </View>
                    </View>

                    <View style={styles.orderStudentBox}>
                      <Ionicons name="person" size={14} color={COLORS.primaryDark} />
                      <Text style={styles.orderStudentName}>
                        {ord.nama_mahasiswa} ({ord.nim_mahasiswa || 'Mahasiswa UINSA'})
                      </Text>
                    </View>

                    {/* Detail Items */}
                    <View style={styles.orderItemsList}>
                      {ord.items?.map((it, idx) => (
                        <View key={idx} style={styles.orderItemRow}>
                          <Text style={styles.orderItemQty}>{it.jumlah_pesanan}x</Text>
                          <Text style={styles.orderItemName}>{it.nama_menu}</Text>
                          <Text style={styles.orderItemPrice}>
                            {formatRupiah(it.sub_harga)}
                          </Text>
                        </View>
                      ))}
                    </View>

                    <View style={styles.orderDivider} />

                    <View style={styles.orderFooterRow}>
                      <View>
                        <Text style={styles.orderPickupText}>
                          Ambil: {ord.jam_pengambilan} ({ord.metode_pembayaran})
                        </Text>
                        {ord.catatan ? (
                          <Text style={styles.orderNoteText}>Catatan: "{ord.catatan}"</Text>
                        ) : null}
                      </View>
                      <Text style={styles.orderTotalAmount}>
                        {formatRupiah(ord.total_harga)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}

          {/* ===================== TAB 4: DATA MAHASISWA ===================== */}
          {activeTab === 'students' && (
            <View>
              <Text style={styles.sectionTitle}>Data Mahasiswa Terdaftar</Text>
              <Text style={styles.sectionSubtitle}>
                Daftar akun mahasiswa UIN Sunan Ampel yang menggunakan FastCanteen
              </Text>

              {studentsList.length === 0 ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="school-outline" size={48} color={COLORS.divider} />
                  <Text style={styles.emptyTitle}>Belum Ada Mahasiswa</Text>
                  <Text style={styles.emptySubtitle}>
                    Belum ada mahasiswa yang mendaftarkan akun.
                  </Text>
                </View>
              ) : (
                studentsList.map((mhs) => (
                  <View key={mhs.id} style={styles.studentCard}>
                    <View style={styles.studentAvatar}>
                      <Ionicons name="school" size={20} color={COLORS.primaryDark} />
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{mhs.nama}</Text>
                      <Text style={styles.studentNim}>NIM: {mhs.nim || '-'}</Text>
                      <Text style={styles.studentEmail}>{mhs.email}</Text>
                      {mhs.no_hp && (
                        <Text style={styles.studentPhone}>WhatsApp: {mhs.no_hp}</Text>
                      )}
                    </View>
                    <View style={styles.studentStats}>
                      <Text style={styles.studentOrderCount}>
                        {mhs.total_pesanan || 0} order
                      </Text>
                      <Text style={styles.studentSpending}>
                        {formatRupiah(mhs.total_belanja)}
                      </Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </ScrollView>
      )}

      {/* ===================== MODAL DAFTARKAN TENANT BARU ===================== */}
      <Modal
        visible={isModalOpen}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Daftarkan Stan Tenant Baru</Text>
                <Text style={styles.modalSubtitle}>
                  Super Admin FastCanteen · Daftarkan stan & akun login
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIsModalOpen(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={24} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.modalScroll}
            >
              {/* Form Nama Stan */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Nama Stan / Tenant <Text style={{ color: COLORS.danger }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Contoh: Kantin Soto Ayam Cak Amin"
                  placeholderTextColor={COLORS.textSecondary}
                  value={formNamaTenant}
                  onChangeText={setFormNamaTenant}
                />
              </View>

              {/* Form Lokasi Stan */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Lokasi Stan Kantin <Text style={{ color: COLORS.danger }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Contoh: Stan 04 - Lt. 1 Kantin Belakang Kampus 2"
                  placeholderTextColor={COLORS.textSecondary}
                  value={formLokasiStan}
                  onChangeText={setFormLokasiStan}
                />
              </View>

              {/* Form Nama Pemilik */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Nama Pengelola / Pemilik <Text style={{ color: COLORS.danger }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Contoh: Bapak Amin Syukur"
                  placeholderTextColor={COLORS.textSecondary}
                  value={formNamaPemilik}
                  onChangeText={setFormNamaPemilik}
                />
              </View>

              {/* Form No HP / WhatsApp */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nomor WhatsApp / HP Pengelola</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Contoh: 081234567890"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="phone-pad"
                  value={formNoHp}
                  onChangeText={setFormNoHp}
                />
              </View>

              <View style={styles.formDivider} />
              <Text style={styles.formSectionHeader}>Akun Login Stan Tenant</Text>

              {/* Form Email Login Tenant */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Email Login Stan <Text style={{ color: COLORS.danger }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Contoh: cakamin@fastcanteen.com"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={formEmail}
                  onChangeText={setFormEmail}
                />
              </View>

              {/* Form Kata Sandi Tenant */}
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>
                  Kata Sandi Stan <Text style={{ color: COLORS.danger }}>*</Text>
                </Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Minimal 6 karakter (default: 123456)"
                  placeholderTextColor={COLORS.textSecondary}
                  value={formKataSandi}
                  onChangeText={setFormKataSandi}
                />
              </View>

              <View style={styles.modalNotice}>
                <Ionicons name="key-outline" size={16} color={COLORS.goldenBrown} />
                <Text style={styles.modalNoticeText}>
                  Setelah didaftarkan, berikan email dan kata sandi di atas kepada pengelola stan agar dapat login ke sistem.
                </Text>
              </View>

              {/* Tombol Simpan */}
              <TouchableOpacity
                style={styles.btnSubmitModal}
                onPress={handleRegisterTenantSubmit}
                disabled={submittingTenant}
                activeOpacity={0.8}
              >
                {submittingTenant ? (
                  <ActivityIndicator color={COLORS.cardBackground} />
                ) : (
                  <View style={styles.btnSubmitInner}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.cardBackground} />
                    <Text style={styles.btnSubmitText}>Daftarkan Stan Sekarang</Text>
                  </View>
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
    backgroundColor: COLORS.cardBackground,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inactiveElement,
    ...SHADOWS.soft,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  headerTitleContainer: {
    flex: 1,
  },
  badgeAdmin: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  badgeAdminText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brownDark,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  headerSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  logoutBtn: {
    padding: 8,
    backgroundColor: COLORS.dangerBg,
    borderRadius: RADIUS.md,
  },
  rolePreviewContainer: {
    backgroundColor: '#F7F7F0',
    marginHorizontal: SPACING.lg,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
  },
  rolePreviewLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 6,
  },
  rolePreviewRow: {
    flexDirection: 'row',
    gap: 8,
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  previewBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  tabScroll: {
    paddingHorizontal: SPACING.lg,
    gap: 8,
    marginTop: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.badgeBackground,
    gap: 6,
  },
  tabItemActive: {
    backgroundColor: '#E8F5E9',
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  contentScroll: {
    padding: SPACING.lg,
    paddingBottom: 40,
  },
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: SPACING.lg,
  },
  metricCard: {
    width: '48%',
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.soft,
  },
  metricIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  metricNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
    marginTop: 2,
  },
  metricSub: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  cardSection: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    ...SHADOWS.soft,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  adminCounterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  adminCounterText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.md,
  },
  statusBox: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
  },
  statusBoxNum: {
    fontSize: 20,
    fontWeight: '800',
  },
  statusBoxLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textBody,
    marginTop: 2,
    textAlign: 'center',
  },
  adminCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAF7',
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  adminCardActive: {
    borderColor: COLORS.primaryDark,
    backgroundColor: '#F4FAF6',
  },
  adminAvatarBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  adminAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.cardBackground,
  },
  adminInfoBox: {
    flex: 1,
  },
  adminNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  youBadge: {
    backgroundColor: COLORS.orange,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: RADIUS.full,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: COLORS.brownDark,
  },
  adminNim: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryDark,
    marginTop: 1,
  },
  adminRole: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  adminContactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    gap: 4,
  },
  adminEmail: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  recentOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBackground,
  },
  recentOrderLeft: {
    flex: 1,
  },
  recentOrderId: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  recentOrderTenant: {
    fontSize: 12,
    color: COLORS.primaryDark,
    fontWeight: '600',
  },
  recentOrderTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  recentOrderRight: {
    alignItems: 'flex-end',
  },
  recentOrderTotal: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  badgeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginTop: 4,
  },
  badgeDiproses: {
    backgroundColor: '#FFF3E0',
  },
  badgeSiap: {
    backgroundColor: '#E8F5E9',
  },
  badgeSelesai: {
    backgroundColor: '#EDE7F6',
  },
  badgeStatusText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textBody,
  },
  infoBanner: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  infoBannerContent: {
    flex: 1,
  },
  infoBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  infoBannerDesc: {
    fontSize: 12,
    color: COLORS.textBody,
    marginTop: 2,
    lineHeight: 17,
  },
  actionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  btnPrimaryAdd: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.soft,
  },
  btnPrimaryAddText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cardBackground,
  },
  tenantCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  tenantCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  tenantLogoCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  tenantMainInfo: {
    flex: 1,
  },
  tenantName: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  locationChipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 4,
  },
  tenantLocation: {
    fontSize: 12,
    color: COLORS.goldenBrown,
    fontWeight: '600',
  },
  tenantMetaBox: {
    backgroundColor: '#FAFAF7',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.md,
    gap: 4,
  },
  tenantMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tenantMetaLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  tenantMetaValue: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textBody,
  },
  tenantStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.inputBackground,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inputBackground,
  },
  tenantStatCol: {
    alignItems: 'center',
  },
  tenantStatNum: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  tenantStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  tenantStatDivider: {
    width: 1,
    backgroundColor: COLORS.inactiveElement,
  },
  tenantCardFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: SPACING.sm,
  },
  deleteTenantBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  deleteTenantBtnText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '700',
  },
  filterChipScroll: {
    gap: 8,
    marginVertical: SPACING.md,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.cardBackground,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
  },
  filterChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  filterChipTextActive: {
    color: COLORS.cardBackground,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: SPACING.lg,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  orderCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.soft,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  orderIdText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  orderTenantText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.goldenBrown,
    marginTop: 1,
  },
  orderStudentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F5F9F6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  orderStudentName: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  orderItemsList: {
    gap: 4,
    marginVertical: 4,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderItemQty: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
    width: 28,
  },
  orderItemName: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textBody,
  },
  orderItemPrice: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  orderDivider: {
    height: 1,
    backgroundColor: COLORS.inputBackground,
    marginVertical: SPACING.sm,
  },
  orderFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderPickupText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  orderNoteText: {
    fontSize: 11,
    color: COLORS.queueOrange,
    fontStyle: 'italic',
    marginTop: 2,
  },
  orderTotalAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.soft,
  },
  studentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  studentNim: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  studentEmail: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  studentPhone: {
    fontSize: 11,
    color: COLORS.textBody,
  },
  studentStats: {
    alignItems: 'flex-end',
  },
  studentOrderCount: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.queueOrange,
  },
  studentSpending: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    padding: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalScroll: {
    paddingBottom: 20,
  },
  formGroup: {
    marginBottom: SPACING.md,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textBody,
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    fontSize: 13,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
  },
  formDivider: {
    height: 1,
    backgroundColor: COLORS.inputBackground,
    marginVertical: SPACING.sm,
  },
  formSectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginBottom: SPACING.md,
  },
  modalNotice: {
    flexDirection: 'row',
    backgroundColor: '#FFF8E1',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    gap: 8,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  modalNoticeText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.goldenBrown,
    lineHeight: 16,
  },
  btnSubmitModal: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.soft,
  },
  btnSubmitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  btnSubmitText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.cardBackground,
  },
});
