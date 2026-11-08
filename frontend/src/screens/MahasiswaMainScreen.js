import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  ScrollView,
  Modal,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import API, { API_BASE_URL, setServerIP } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { pilihDanUnggahBukti } from '../utils/uploadBukti';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function MahasiswaMainScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { user, logout } = useAuth();
  const {
    items: cartItems,
    addToCart,
    removeFromCart,
    totalAmount,
    totalCount,
    activeTenant,
  } = useCart();

  // Tab Navigasi Aktif: 'beranda' | 'pesanan' | 'riwayat' | 'profil'
  const [activeTab, setActiveTab] = useState(
    route?.params?.initialTab || route?.params?.tab || 'beranda'
  );

  // Status sinkronisasi tab jika ada parameter rute baru
  useEffect(() => {
    if (route?.params?.initialTab) {
      setActiveTab(route.params.initialTab);
    } else if (route?.params?.tab) {
      setActiveTab(route.params.tab);
    }
  }, [route?.params]);

  // ==========================================
  // DATA STATES: BERANDA (Menu & Tenant)
  // ==========================================
  const [menus, setMenus] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loadingMenu, setLoadingMenu] = useState(true);
  const [refreshingMenu, setRefreshingMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  // ==========================================
  // DATA STATES: PESANAN & RIWAYAT (US-11)
  // ==========================================
  const [orders, setOrders] = useState([]);
  const [uploadingId, setUploadingId] = useState(null); // pesanan yang sedang unggah ulang bukti
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [refreshingOrders, setRefreshingOrders] = useState(false);
  const [riwayatFilter, setRiwayatFilter] = useState('Semua'); // 'Semua' | 'Selesai' | 'Dibatalkan'

  // ==========================================
  // DATA STATES: NOTIFIKASI IN-APP (Poin 7)
  // ==========================================
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [modalNotifVisible, setModalNotifVisible] = useState(false);
  const [activeToastNotif, setActiveToastNotif] = useState(null);
  const [lastNotifId, setLastNotifId] = useState(null);

  // ==========================================
  // DATA STATES: PROFIL & MODAL IP
  // ==========================================
  const [modalIpVisible, setModalIpVisible] = useState(false);
  const [currentBaseUrl, setCurrentBaseUrl] = useState(API_BASE_URL);
  const [inputIp, setInputIp] = useState(
    API_BASE_URL.replace(/^https?:\/\//, '').replace(/\/api\/?$/, '').split(':')[0] || '192.168.1.252'
  );
  const [pingTesting, setPingTesting] = useState(false);
  const [pingStatus, setPingStatus] = useState(null);

  // ------------------------------------------
  // FETCH NOTIFIKASI
  // ------------------------------------------
  const fetchNotifications = async () => {
    if (!user || !user.id) return;
    try {
      const res = await API.get(`/notifikasi/user/${user.id}`);
      if (res.data.success) {
        setNotifications(res.data.data);
        setUnreadNotifCount(res.data.unread_count || 0);

        if (res.data.data.length > 0) {
          const newest = res.data.data[0];
          if (!newest.is_read && newest.id !== lastNotifId) {
            setLastNotifId(newest.id);
            setActiveToastNotif(newest);
            setTimeout(() => {
              setActiveToastNotif(null);
            }, 6000);
          }
        }
      }
    } catch (err) {
      console.warn('Gagal memuat notifikasi FastCanteen:', err.message);
    }
  };

  const handleMarkAsRead = async (notifId) => {
    try {
      await API.put(`/notifikasi/${notifId}/baca`);
      fetchNotifications();
    } catch (err) {
      console.warn('Gagal menandai notifikasi dibaca:', err.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await API.put(`/notifikasi/user/${user.id}/baca-semua`);
      fetchNotifications();
    } catch (err) {
      console.warn('Gagal menandai semua dibaca:', err.message);
    }
  };

  // ------------------------------------------
  // FETCH MENU & TENANT (BERANDA)
  // ------------------------------------------
  const fetchMenuData = async () => {
    try {
      const [menuRes, tenantRes] = await Promise.all([
        API.get('/menu'),
        API.get('/tenant'),
      ]);

      if (menuRes.data.success) {
        setMenus(menuRes.data.data);
      }
      if (tenantRes.data.success) {
        setTenants(tenantRes.data.data);
      }
    } catch (err) {
      console.warn('Gagal memuat menu FastCanteen:', err.message);
    } finally {
      setLoadingMenu(false);
      setRefreshingMenu(false);
    }
  };

  // ------------------------------------------
  // FETCH PESANAN MAHASISWA
  // ------------------------------------------
  const fetchOrders = async () => {
    if (!user || !user.id) return;
    try {
      const res = await API.get(`/pesanan/mahasiswa/${user.id}`);
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.warn('Gagal memuat pesanan mahasiswa:', err.message);
    } finally {
      setLoadingOrders(false);
      setRefreshingOrders(false);
    }
  };

  useEffect(() => {
    fetchMenuData();
    if (user?.id) {
      fetchOrders();
      fetchNotifications();

      // Realtime in-app polling (Poin 7)
      const interval = setInterval(() => {
        fetchOrders();
        fetchNotifications();
      }, 8000);
      return () => clearInterval(interval);
    }
  }, [user?.id, lastNotifId]);

  // Unggah ulang bukti pembayaran yang ditolak tenant
  const handleUnggahUlang = async (order) => {
    try {
      setUploadingId(order.id);
      const hasil = await pilihDanUnggahBukti(order.id);
      if (!hasil.canceled) {
        Alert.alert('Bukti Terkirim', 'Bukti pembayaran baru Anda sedang diverifikasi oleh stan.');
        fetchOrders();
      }
    } catch (err) {
      Alert.alert('Gagal Mengunggah', err.response?.data?.message || err.message);
    } finally {
      setUploadingId(null);
    }
  };

  // Refresh handlers
  const onRefreshMenu = useCallback(() => {
    setRefreshingMenu(true);
    fetchMenuData();
  }, []);

  const onRefreshOrders = useCallback(() => {
    setRefreshingOrders(true);
    fetchOrders();
    fetchNotifications();
  }, [user]);

  // Pesanan Aktif vs Riwayat (US-11 & Skema V2)
  const activeOrders = orders.filter((o) => {
    const st = o.status_pesanan || o.status;
    return st === 'Menunggu' || st === 'Diproses' || st === 'Siap Diambil';
  });

  const historyOrders = orders.filter((o) => {
    const st = o.status_pesanan || o.status;
    if (st !== 'Selesai' && st !== 'Dibatalkan') return false;
    if (riwayatFilter === 'Selesai') return st === 'Selesai';
    if (riwayatFilter === 'Dibatalkan') return st === 'Dibatalkan';
    return true;
  });

  const completedOrdersCount = orders.filter((o) => (o.status_pesanan || o.status) === 'Selesai').length;
  const totalExpenditure = orders
    .filter((o) => (o.status_pesanan || o.status) === 'Selesai')
    .reduce((sum, o) => sum + Number(o.total_harga || 0), 0);

  // Helper format rupiah
  const formatIDR = (val) => {
    return 'Rp ' + Number(val || 0).toLocaleString('id-ID');
  };

  const getCartQuantity = (menuId) => {
    const item = cartItems.find((i) => i.id === menuId);
    return item ? item.quantity : 0;
  };

  const handleLogout = () => {
    Alert.alert('Keluar Akun', 'Apakah Anda yakin ingin keluar dari FastCanteen?', [
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

  const handleSaveIP = () => {
    if (!inputIp.trim()) {
      Alert.alert('Perhatian', 'Silakan masukkan alamat IP laptop/server.');
      return;
    }
    const newUrl = setServerIP(inputIp.trim());
    setCurrentBaseUrl(newUrl);
    setModalIpVisible(false);
    Alert.alert('Berhasil', `Alamat server berhasil disesuaikan ke:\n${newUrl}`);
    fetchMenuData();
    fetchOrders();
  };

  const handleTestPing = async () => {
    setPingTesting(true);
    setPingStatus(null);
    try {
      const res = await API.get('/health', { timeout: 4000 });
      if (res.data.success) {
        setPingStatus({ ok: true, msg: 'Server Backend Terhubung Normal! 🚀' });
      } else {
        setPingStatus({ ok: false, msg: 'Respon server tidak valid' });
      }
    } catch (err) {
      setPingStatus({ ok: false, msg: 'Gagal terhubung: ' + err.message });
    } finally {
      setPingTesting(false);
    }
  };

  const openWhatsApp = (phone, tenantName) => {
    if (!phone) {
      Alert.alert('Info', `Nomor kontak untuk ${tenantName} belum tersedia.`);
      return;
    }
    const cleanPhone = phone.replace(/^0/, '62');
    const url = `https://wa.me/${cleanPhone}?text=Halo%20${encodeURIComponent(
      tenantName
    )},%20saya%20ingin%20menanyakan%20pesanan%20FastCanteen%20saya`;
    Linking.openURL(url).catch(() => {
      Alert.alert('Gagal', 'Tidak dapat membuka aplikasi WhatsApp.');
    });
  };

  // Filter Menu Beranda
  const filteredMenus = menus.filter((menu) => {
    const matchesTenant =
      selectedTenantId === null || menu.id_tenant === selectedTenantId;
    const matchesSearch =
      menu.nama_menu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (menu.nama_tenant && menu.nama_tenant.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTenant && matchesSearch;
  });

  // ==========================================
  // RENDER: STEP TRACKER STATUS PESANAN (Skema V2)
  // ==========================================
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

    const step1Active = true; // Menunggu konfirmasi
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

        {/* Garis 1 */}
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

        {/* Garis 2 */}
        <View style={[styles.trackerLine, step3Active && styles.trackerLineActive]} />

        {/* Step 3: Siap Diambil */}
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

        {/* Garis 3 */}
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

  // ==========================================
  // VIEW TAB 1: BERANDA
  // ==========================================
  const renderBerandaHeader = () => (
    <View style={styles.headerContainer}>
      {/* Banner Khusus jika Super Admin sedang pratinjau tampilan mahasiswa */}
      {user?.peran === 'admin' && (
        <View style={styles.adminBanner}>
          <View style={styles.adminBannerLeft}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.orange} />
            <Text style={styles.adminBannerText}>Pratinjau Akun Super Admin</Text>
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

      {/* Top Greeting */}
      <View style={styles.topRow}>
        <View style={styles.userInfo}>
          <Text style={styles.greetingText}>
            Halo, {user?.nama ? user.nama.split(' ')[0] : 'Mahasiswa'} 👋
          </Text>
          <View style={styles.badgeNimRow}>
            <View style={styles.nimBadge}>
              <Text style={styles.nimText}>
                {user?.nim ? `NIM: ${user.nim}` : 'UINSA Kampus 2'}
              </Text>
            </View>
            <View style={styles.canteenTag}>
              <Ionicons name="storefront-outline" size={12} color={COLORS.primaryDark} />
              <Text style={styles.canteenTagText}>Kantin Belakang</Text>
            </View>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {/* Tombol Lonceng Notifikasi (Poin 7) */}
          <TouchableOpacity
            style={styles.quickActiveBadgeBtn}
            onPress={() => setModalNotifVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={19} color={COLORS.primaryDark} />
            {unreadNotifCount > 0 && (
              <View style={[styles.quickOrderBadge, { backgroundColor: COLORS.danger }]}>
                <Text style={styles.quickOrderBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Tombol Pesanan Aktif */}
          <TouchableOpacity
            style={styles.quickActiveBadgeBtn}
            onPress={() => setActiveTab('pesanan')}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={18} color={COLORS.primaryDark} />
            {activeOrders.length > 0 && (
              <View style={styles.quickOrderBadge}>
                <Text style={styles.quickOrderBadgeText}>{activeOrders.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Banner Pre-Order Kampus */}
      <View style={styles.heroBanner}>
        <View style={styles.heroTextCol}>
          <Text style={styles.heroTag}>WAKTU ISTIRAHAT KULIAH EFISIEN</Text>
          <Text style={styles.heroTitle}>Pesan Duluan, Ambil Tanpa Antre</Text>
          <Text style={styles.heroDesc}>
            Pilih jam istirahat Anda dan santap makanan hangat tepat waktu di kantin.
          </Text>
        </View>
        <Ionicons name="time" size={46} color={COLORS.orange} style={styles.heroIcon} />
      </View>

      {/* Kolom Pencarian */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={19} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari menu favorit, geprek, jus, soto..."
          placeholderTextColor={COLORS.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Filter Stan Kantin */}
      <Text style={styles.sectionTitle}>Pilih Stan Kantin:</Text>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={[{ id: null, nama_tenant: '✨ Semua Stan' }, ...tenants]}
        keyExtractor={(item) => String(item.id ?? 'all')}
        contentContainerStyle={styles.tenantFilterList}
        renderItem={({ item }) => {
          const isSelected = selectedTenantId === item.id;
          return (
            <TouchableOpacity
              style={[
                styles.tenantFilterChip,
                isSelected && styles.tenantFilterChipActive,
              ]}
              onPress={() => setSelectedTenantId(item.id)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tenantFilterText,
                  isSelected && styles.tenantFilterTextActive,
                ]}
              >
                {item.nama_tenant}
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );

  const renderMenuItem = ({ item }) => {
    const qty = getCartQuantity(item.id);
    const isAvailable = item.status_tersedia === 'tersedia';

    return (
      <View style={styles.menuCard}>
        <Image
          source={{
            uri:
              item.foto ||
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
          }}
          style={styles.menuImage}
          resizeMode="cover"
        />

        <View style={styles.menuDetails}>
          <View style={styles.tenantTagRow}>
            <Ionicons name="storefront" size={11} color={COLORS.goldenBrown} />
            <Text style={styles.tenantNameText} numberOfLines={1}>
              {item.nama_tenant}
            </Text>
          </View>

          <Text style={styles.menuNameText} numberOfLines={2}>
            {item.nama_menu}
          </Text>

          <Text style={styles.menuPriceText}>{formatIDR(item.harga)}</Text>

          <View style={styles.actionRow}>
            {!isAvailable ? (
              <View style={styles.outOfStockBadge}>
                <Text style={styles.outOfStockText}>Stok Habis</Text>
              </View>
            ) : qty === 0 ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => addToCart(item)}
                activeOpacity={0.8}
              >
                <Ionicons name="add" size={16} color={COLORS.brownDark} />
                <Text style={styles.addButtonText}>Tambah</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.qtyController}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => removeFromCart(item.id)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="remove" size={14} color={COLORS.primaryDark} />
                </TouchableOpacity>
                <Text style={styles.qtyNumberText}>{qty}</Text>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => addToCart(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="add" size={14} color={COLORS.primaryDark} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderBerandaView = () => (
    <View style={styles.tabContentContainer}>
      {loadingMenu ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>Memuat menu FastCanteen...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMenus}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMenuItem}
          ListHeaderComponent={renderBerandaHeader}
          contentContainerStyle={[
            styles.listContent,
            cartItems.length > 0 && { paddingBottom: 160 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshingMenu}
              onRefresh={onRefreshMenu}
              colors={[COLORS.primaryDark]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="restaurant-outline" size={48} color={COLORS.divider} />
              <Text style={styles.emptyTitle}>Menu Tidak Ditemukan</Text>
              <Text style={styles.emptySubtitle}>
                Silakan coba kata kunci lain atau pilih stan kantin yang berbeda.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Cart Checkout Bar (Tepat di atas Bottom Navbar) */}
      {cartItems.length > 0 && (
        <View style={styles.floatingCartContainer}>
          <View style={styles.cartInfoCol}>
            <View style={styles.cartCountBadge}>
              <Text style={styles.cartCountText}>{totalCount} Menu</Text>
            </View>
            <Text style={styles.cartTenantText} numberOfLines={1}>
              {activeTenant?.nama_tenant || 'FastCanteen'}
            </Text>
            <Text style={styles.cartPriceText}>{formatIDR(totalAmount)}</Text>
          </View>

          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={() => navigation.navigate('CartCheckout')}
            activeOpacity={0.85}
          >
            <Text style={styles.checkoutButtonText}>Lanjut Bayar</Text>
            <Ionicons name="arrow-forward" size={16} color={COLORS.brownDark} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  // ==========================================
  // VIEW TAB 2: PESANAN AKTIF (US-11 & Skema V2)
  // ==========================================
  const renderPesananView = () => (
    <View style={styles.tabContentContainer}>
      {/* Top Header */}
      <View style={styles.sectionHeaderBar}>
        <View>
          <Text style={styles.sectionHeaderTitle}>Pesanan Berjalan</Text>
          <Text style={styles.sectionHeaderSubtitle}>
            Pantau status masak dan konfirmasi pesanan di stan kantin
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {/* Tombol Lonceng Notifikasi */}
          <TouchableOpacity
            onPress={() => setModalNotifVisible(true)}
            style={styles.refreshIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={19} color={COLORS.primaryDark} />
            {unreadNotifCount > 0 && (
              <View style={[styles.quickOrderBadge, { backgroundColor: COLORS.danger, top: -2, right: -2 }]}>
                <Text style={styles.quickOrderBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRefreshOrders}
            style={styles.refreshIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={19} color={COLORS.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>

      {loadingOrders ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>Memeriksa status pesanan aktif...</Text>
        </View>
      ) : (
        <FlatList
          data={activeOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.ordersListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshingOrders}
              onRefresh={onRefreshOrders}
              colors={[COLORS.primaryDark]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="fast-food-outline" size={48} color={COLORS.primaryDark} />
              </View>
              <Text style={styles.emptyTitle}>Tidak Ada Pesanan Aktif</Text>
              <Text style={styles.emptySubtitle}>
                Anda belum memiliki pesanan yang sedang diproses. Pre-order sekarang agar tidak perlu antre di kantin.
              </Text>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => setActiveTab('beranda')}
                activeOpacity={0.85}
              >
                <Ionicons name="restaurant" size={16} color={COLORS.cardBackground} />
                <Text style={styles.primaryActionButtonText}>Pesan Makanan Sekarang</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const stPesanan = item.status_pesanan || item.status || 'Menunggu';
            const stBayar = item.status_pembayaran || 'Sudah Dibayar';
            const isSiapDiambil = stPesanan === 'Siap Diambil';

            return (
              <View style={styles.orderCard}>
                {/* Banner Siap Diambil */}
                {isSiapDiambil && (
                  <View style={styles.readyAlertBanner}>
                    <Ionicons
                      name="notifications"
                      size={20}
                      color={COLORS.textSuccessDark}
                    />
                    <View style={styles.readyAlertTextCol}>
                      <Text style={styles.readyAlertTitle}>
                        Makanan Anda Sudah Siap! 🎉
                      </Text>
                      <Text style={styles.readyAlertSubtitle}>
                        Silakan langsung ke {item.nama_tenant} ({item.lokasi_stan})
                        tanpa perlu antre di kasir.
                      </Text>
                    </View>
                  </View>
                )}

                {/* Info Header Pesanan */}
                <View style={styles.orderCardHeader}>
                  <View style={{ flex: 1 }}>
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
                      stBayar === 'Bukti Ditolak' && styles.payBadgeDitolak,
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
                        stBayar === 'Bukti Ditolak' && styles.payBadgeDitolakText,
                      ]}
                    >
                      {stBayar}
                    </Text>
                  </View>
                </View>

                {/* Step Tracker Visual */}
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
                  {item.catatan ? (
                    <Text style={styles.catatanText}>
                      Catatan: {item.catatan}
                    </Text>
                  ) : null}
                </View>

                {/* Info Verifikasi Pembayaran */}
                {stBayar === 'Menunggu Verifikasi' && item.metode_pembayaran !== 'Tunai' && (
                  <View style={styles.verifNoticeMhs}>
                    <Ionicons name="hourglass-outline" size={16} color={COLORS.brownDark} />
                    <Text style={styles.verifNoticeMhsText}>
                      Bukti pembayaran Anda sedang diverifikasi oleh stan. Pesanan dimasak setelah
                      pembayaran terverifikasi.
                    </Text>
                  </View>
                )}
                {stBayar === 'Bukti Ditolak' && stPesanan === 'Menunggu' && (
                  <View style={[styles.verifNoticeMhs, styles.verifNoticeMhsRejected]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.verifNoticeMhsText, { color: COLORS.dangerDark }]}>
                        Bukti pembayaran ditolak
                        {item.catatan_verifikasi ? `: ${item.catatan_verifikasi}` : '.'} (penolakan{' '}
                        {item.jumlah_penolakan || 1} dari 3)
                      </Text>
                      <TouchableOpacity
                        style={styles.reuploadBtn}
                        onPress={() => handleUnggahUlang(item)}
                        disabled={uploadingId === item.id}
                        activeOpacity={0.85}
                      >
                        {uploadingId === item.id ? (
                          <ActivityIndicator color={COLORS.cardBackground} />
                        ) : (
                          <>
                            <Ionicons name="cloud-upload-outline" size={15} color={COLORS.cardBackground} />
                            <Text style={styles.reuploadBtnText}>Unggah Ulang Bukti</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                {/* Footer Biaya & Tombol Hubungi WhatsApp */}
                <View style={styles.orderCardFooter}>
                  <View>
                    <Text style={styles.payMethodText}>
                      {item.metode_pembayaran}
                    </Text>
                    <Text style={styles.totalPrice}>
                      {formatIDR(item.total_harga)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.whatsappBtn}
                    onPress={() => openWhatsApp(item.no_hp_tenant, item.nama_tenant)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="logo-whatsapp" size={16} color={COLORS.whatsappGreen} />
                    <Text style={styles.whatsappBtnText}>Hubungi Stan</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );

  // ==========================================
  // VIEW TAB 3: RIWAYAT PESANAN
  // ==========================================
  const renderRiwayatView = () => (
    <View style={styles.tabContentContainer}>
      {/* Header Bar */}
      <View style={styles.sectionHeaderBar}>
        <View>
          <Text style={styles.sectionHeaderTitle}>Riwayat Transaksi</Text>
          <Text style={styles.sectionHeaderSubtitle}>
            Daftar pesanan yang telah selesai dan riwayat belanja Anda
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <TouchableOpacity
            onPress={() => setModalNotifVisible(true)}
            style={styles.refreshIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="notifications-outline" size={19} color={COLORS.primaryDark} />
            {unreadNotifCount > 0 && (
              <View style={[styles.quickOrderBadge, { backgroundColor: COLORS.danger, top: -2, right: -2 }]}>
                <Text style={styles.quickOrderBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onRefreshOrders}
            style={styles.refreshIconBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="refresh" size={19} color={COLORS.primaryDark} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Filter Chip: Semua | Selesai | Dibatalkan */}
      <View style={styles.historyFilterRow}>
        {['Semua', 'Selesai', 'Dibatalkan'].map((f) => {
          const isSel = riwayatFilter === f;
          return (
            <TouchableOpacity
              key={f}
              style={[
                styles.historyFilterChip,
                isSel && styles.historyFilterChipActive,
              ]}
              onPress={() => setRiwayatFilter(f)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.historyFilterText,
                  isSel && styles.historyFilterTextActive,
                ]}
              >
                {f}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loadingOrders ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>Memuat riwayat transaksi...</Text>
        </View>
      ) : (
        <FlatList
          data={historyOrders}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.ordersListContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshingOrders}
              onRefresh={onRefreshOrders}
              colors={[COLORS.primaryDark]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="time-outline" size={48} color={COLORS.divider} />
              </View>
              <Text style={styles.emptyTitle}>Belum Ada Riwayat Pesanan</Text>
              <Text style={styles.emptySubtitle}>
                Pesanan yang telah selesai diambil di kantin akan tersimpan rapi di sini.
              </Text>
              <TouchableOpacity
                style={styles.primaryActionButton}
                onPress={() => setActiveTab('beranda')}
                activeOpacity={0.85}
              >
                <Text style={styles.primaryActionButtonText}>Pesan Sekarang</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const stPesanan = item.status_pesanan || item.status || 'Selesai';
            const stBayar = item.status_pembayaran || 'Sudah Dibayar';
            const isSelesai = stPesanan === 'Selesai';

            return (
              <View style={styles.orderCard}>
                <View style={styles.orderCardHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tenantName}>{item.nama_tenant}</Text>
                    <Text style={styles.stanLocation}>
                      {item.waktu_transaksi
                        ? new Date(item.waktu_transaksi).toLocaleString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }) + ' WIB'
                        : 'Waktu Transaksi'}
                    </Text>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <View
                      style={[
                        styles.statusPillBadge,
                        stBayar === 'Sudah Dibayar'
                          ? { backgroundColor: COLORS.badgeSuccess }
                          : { backgroundColor: COLORS.statusWaitingBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          stBayar === 'Sudah Dibayar'
                            ? { color: COLORS.textSuccessDark }
                            : { color: COLORS.urgentOrange },
                        ]}
                      >
                        {stBayar}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.statusPillBadge,
                        isSelesai
                          ? { backgroundColor: COLORS.infoLightBlue }
                          : { backgroundColor: COLORS.dangerBg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          isSelesai
                            ? { color: COLORS.infoDarkBlue }
                            : { color: COLORS.dangerDark },
                        ]}
                      >
                        {stPesanan}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Items Summary */}
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
                </View>

                {/* Total & Tombol Pesan Lagi */}
                <View style={styles.orderCardFooter}>
                  <View>
                    <Text style={styles.payMethodText}>
                      {item.metode_pembayaran}
                    </Text>
                    <Text style={styles.totalPrice}>
                      {formatIDR(item.total_harga)}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.reorderBtn}
                    onPress={() => {
                      if (item.id_tenant) {
                        setSelectedTenantId(item.id_tenant);
                      }
                      setActiveTab('beranda');
                    }}
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

  // ==========================================
  // VIEW TAB 4: PROFIL MAHASISWA
  // ==========================================
  const renderProfilView = () => {
    const initials = user?.nama
      ? user.nama
          .split(' ')
          .map((n) => n[0])
          .slice(0, 2)
          .join('')
          .toUpperCase()
      : 'MH';

    return (
      <ScrollView
        style={styles.tabContentContainer}
        contentContainerStyle={styles.profileScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Card Header */}
        <View style={styles.profileHeroCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <Text style={styles.profileNameText}>{user?.nama || 'Mahasiswa UINSA'}</Text>
          <View style={styles.roleTag}>
            <Ionicons name="school" size={13} color={COLORS.goldenBrown} />
            <Text style={styles.roleTagText}>Mahasiswa UINSA Kampus 2</Text>
          </View>
        </View>

        {/* Statistik Cepat Mahasiswa */}
        <View style={styles.quickStatRow}>
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>{completedOrdersCount}</Text>
            <Text style={styles.quickStatLabel}>Pesanan Selesai</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>{activeOrders.length}</Text>
            <Text style={styles.quickStatLabel}>Pesanan Aktif</Text>
          </View>
          <View style={styles.quickStatDivider} />
          <View style={styles.quickStatCard}>
            <Text style={styles.quickStatValue}>{formatIDR(totalExpenditure)}</Text>
            <Text style={styles.quickStatLabel}>Total Belanja</Text>
          </View>
        </View>

        {/* Informasi Detail Akun */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Data Mahasiswa</Text>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="card-outline" size={18} color={COLORS.primaryDark} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Nomor Induk Mahasiswa (NIM)</Text>
              <Text style={styles.infoValue}>{user?.nim || 'Tidak tercatat'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="mail-outline" size={18} color={COLORS.primaryDark} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Email Kampus</Text>
              <Text style={styles.infoValue}>{user?.email || '-'}</Text>
            </View>
          </View>

          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="call-outline" size={18} color={COLORS.primaryDark} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Nomor WhatsApp</Text>
              <Text style={styles.infoValue}>{user?.no_hp || '-'}</Text>
            </View>
          </View>
        </View>

        {/* TABEL DATA USER (Revisi Poin 3) */}
        <View style={styles.userTableSection}>
          <View style={styles.tableCardHeader}>
            <Ionicons name="server" size={16} color={COLORS.primaryDark} />
            <Text style={styles.tableCardTitle}>Tabel User (Entitas `pengguna`)</Text>
          </View>

          <View style={styles.tableContainer}>
            <View style={styles.tableHeaderRow}>
              <Text style={[styles.tableColHeader, { flex: 1.2 }]}>Kolom</Text>
              <Text style={[styles.tableColHeader, { flex: 2 }]}>Data Akun</Text>
            </View>

            <View style={styles.tableDataRow}>
              <Text style={[styles.tableKeyText, { flex: 1.2 }]}>id (PK)</Text>
              <Text style={[styles.tableValText, { flex: 2, fontWeight: '700' }]}>#{user?.id || '1'}</Text>
            </View>

            <View style={[styles.tableDataRow, styles.tableDataRowAlt]}>
              <Text style={[styles.tableKeyText, { flex: 1.2 }]}>nama</Text>
              <Text style={[styles.tableValText, { flex: 2 }]}>{user?.nama || '-'}</Text>
            </View>

            <View style={styles.tableDataRow}>
              <Text style={[styles.tableKeyText, { flex: 1.2 }]}>nim</Text>
              <Text style={[styles.tableValText, { flex: 2 }]}>{user?.nim || '-'}</Text>
            </View>

            <View style={[styles.tableDataRow, styles.tableDataRowAlt]}>
              <Text style={[styles.tableKeyText, { flex: 1.2 }]}>email</Text>
              <Text style={[styles.tableValText, { flex: 2 }]}>{user?.email || '-'}</Text>
            </View>

            <View style={styles.tableDataRow}>
              <Text style={[styles.tableKeyText, { flex: 1.2 }]}>no_hp</Text>
              <Text style={[styles.tableValText, { flex: 2 }]}>{user?.no_hp || '-'}</Text>
            </View>

            <View style={[styles.tableDataRow, styles.tableDataRowAlt]}>
              <Text style={[styles.tableKeyText, { flex: 1.2 }]}>peran</Text>
              <View style={styles.roleTableBadge}>
                <Text style={styles.roleTableBadgeText}>{user?.peran || 'mahasiswa'}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Pengaturan Jaringan & Server */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Koneksi Server Backend</Text>

          <View style={styles.serverCardRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="wifi-outline" size={18} color={COLORS.orange} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoLabel}>Alamat API Aktif</Text>
              <Text style={styles.serverUrlText} numberOfLines={1}>
                {currentBaseUrl}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.changeIpBtn}
              onPress={() => setModalIpVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.changeIpBtnText}>Ubah IP</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tentang Kantin Kampus */}
        <View style={styles.infoSection}>
          <Text style={styles.infoSectionTitle}>Lokasi Kantin</Text>
          <View style={styles.infoRow}>
            <View style={styles.infoIconBox}>
              <Ionicons name="location-outline" size={18} color={COLORS.primaryDark} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>Kantin Belakang UINSA Kampus 2</Text>
              <Text style={styles.infoValue}>
                Lantai 1 (Penyetan & Aneka Nasi) & Lantai 2 (Kopi & Minuman Segar)
              </Text>
            </View>
          </View>
        </View>

        {/* Tombol Logout */}
        <TouchableOpacity
          style={styles.logoutFullBtn}
          onPress={handleLogout}
          activeOpacity={0.8}
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.danger} />
          <Text style={styles.logoutFullBtnText}>Keluar dari Akun</Text>
        </TouchableOpacity>

        <Text style={styles.versionFooterText}>
          FastCanteen Mobile v1.0.0 · PjBL Pemrograman Mobile UINSA
        </Text>
      </ScrollView>
    );
  };

  // ==========================================
  // RENDER UTAMA DENGAN NAVBAR BAWAH
  // ==========================================
  return (
    <View style={styles.mainContainer}>
      {/* Konten Tab Aktif */}
      <View style={styles.activeTabContainer}>
        {activeTab === 'beranda' && renderBerandaView()}
        {activeTab === 'pesanan' && renderPesananView()}
        {activeTab === 'riwayat' && renderRiwayatView()}
        {activeTab === 'profil' && renderProfilView()}
      </View>

      {/* ==========================================
          BOTTOM NAVIGATION BAR (NAVBAR)
         ========================================== */}
      <View
        style={[
          styles.bottomNavBar,
          { paddingBottom: Math.max(insets.bottom, 8) },
        ]}
      >
        {/* 1. Beranda */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('beranda')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.navIconContainer,
              activeTab === 'beranda' && styles.navIconContainerActive,
            ]}
          >
            <Ionicons
              name={activeTab === 'beranda' ? 'home' : 'home-outline'}
              size={22}
              color={
                activeTab === 'beranda'
                  ? COLORS.primaryDark
                  : COLORS.textSecondary
              }
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'beranda' && styles.navLabelActive,
            ]}
          >
            Beranda
          </Text>
        </TouchableOpacity>

        {/* 2. Pesanan (Dengan Badge Antrean Aktif) */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('pesanan')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.navIconContainer,
              activeTab === 'pesanan' && styles.navIconContainerActive,
            ]}
          >
            <Ionicons
              name={activeTab === 'pesanan' ? 'restaurant' : 'restaurant-outline'}
              size={22}
              color={
                activeTab === 'pesanan'
                  ? COLORS.primaryDark
                  : COLORS.textSecondary
              }
            />
            {activeOrders.length > 0 && (
              <View style={styles.navBadge}>
                <Text style={styles.navBadgeText}>{activeOrders.length}</Text>
              </View>
            )}
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'pesanan' && styles.navLabelActive,
            ]}
          >
            Pesanan
          </Text>
        </TouchableOpacity>

        {/* 3. Riwayat */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('riwayat')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.navIconContainer,
              activeTab === 'riwayat' && styles.navIconContainerActive,
            ]}
          >
            <Ionicons
              name={activeTab === 'riwayat' ? 'time' : 'time-outline'}
              size={22}
              color={
                activeTab === 'riwayat'
                  ? COLORS.primaryDark
                  : COLORS.textSecondary
              }
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'riwayat' && styles.navLabelActive,
            ]}
          >
            Riwayat
          </Text>
        </TouchableOpacity>

        {/* 4. Profil */}
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('profil')}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.navIconContainer,
              activeTab === 'profil' && styles.navIconContainerActive,
            ]}
          >
            <Ionicons
              name={activeTab === 'profil' ? 'person' : 'person-outline'}
              size={22}
              color={
                activeTab === 'profil'
                  ? COLORS.primaryDark
                  : COLORS.textSecondary
              }
            />
          </View>
          <Text
            style={[
              styles.navLabel,
              activeTab === 'profil' && styles.navLabelActive,
            ]}
          >
            Profil
          </Text>
        </TouchableOpacity>
      </View>

      {/* ==========================================
          MODAL UBAH IP SERVER
         ========================================== */}
      <Modal
        visible={modalIpVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalIpVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderRow}>
              <Ionicons name="server-outline" size={22} color={COLORS.primaryDark} />
              <Text style={styles.modalTitle}>Sesuaikan IP Backend</Text>
            </View>

            <Text style={styles.modalDesc}>
              Pastikan HP dan Laptop terhubung ke Wi-Fi yang sama (misal jaringan Wi-Fi kos/kampus).
            </Text>

            <View style={styles.inputIpGroup}>
              <Ionicons name="globe-outline" size={18} color={COLORS.textBody} />
              <TextInput
                style={styles.modalIpInput}
                placeholder="Contoh: 192.168.1.252"
                placeholderTextColor={COLORS.textSecondary}
                value={inputIp}
                onChangeText={setInputIp}
                autoCapitalize="none"
              />
            </View>

            {/* Quick preset buttons */}
            <View style={styles.presetRow}>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setInputIp('192.168.1.252')}
              >
                <Text style={styles.presetChipText}>IP Wi-Fi (192.168.1.252)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.presetChip}
                onPress={() => setInputIp('10.0.2.2')}
              >
                <Text style={styles.presetChipText}>Emulator (10.0.2.2)</Text>
              </TouchableOpacity>
            </View>

            {/* Status Ping */}
            {pingStatus && (
              <View
                style={[
                  styles.pingResultBanner,
                  pingStatus.ok
                    ? { backgroundColor: COLORS.badgeSuccess }
                    : { backgroundColor: COLORS.dangerBg },
                ]}
              >
                <Ionicons
                  name={pingStatus.ok ? 'checkmark-circle' : 'alert-circle'}
                  size={16}
                  color={pingStatus.ok ? COLORS.textSuccessDark : COLORS.dangerDark}
                />
                <Text
                  style={[
                    styles.pingResultText,
                    pingStatus.ok
                      ? { color: COLORS.textSuccessDark }
                      : { color: COLORS.dangerDark },
                  ]}
                >
                  {pingStatus.msg}
                </Text>
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.pingBtn}
                onPress={handleTestPing}
                disabled={pingTesting}
              >
                {pingTesting ? (
                  <ActivityIndicator size="small" color={COLORS.primaryDark} />
                ) : (
                  <Text style={styles.pingBtnText}>Tes Ping</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalIpVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Tutup</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveIP}
              >
                <Text style={styles.modalSaveBtnText}>Simpan</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==========================================
          TOAST / FLOATING BANNER NOTIFIKASI REALTIME (Poin 7)
         ========================================== */}
      {activeToastNotif && (
        <View style={[styles.floatingToast, { top: (insets?.top || 25) + 8 }]}>
          <View style={styles.toastLeft}>
            <View style={styles.toastIconCircle}>
              <Ionicons name="notifications" size={18} color={COLORS.cardBackground} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.toastTitle}>{activeToastNotif.judul}</Text>
              <Text style={styles.toastMsg} numberOfLines={2}>
                {activeToastNotif.pesan}
              </Text>
            </View>
          </View>
          <View style={styles.toastActionRow}>
            <TouchableOpacity
              style={styles.toastOpenBtn}
              onPress={() => {
                handleMarkAsRead(activeToastNotif.id);
                setActiveToastNotif(null);
                setActiveTab('pesanan');
              }}
            >
              <Text style={styles.toastOpenBtnText}>Lihat</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.toastCloseBtn}
              onPress={() => setActiveToastNotif(null)}
            >
              <Ionicons name="close" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ==========================================
          MODAL DAFTAR NOTIFIKASI MAHASISWA (Poin 7)
         ========================================== */}
      <Modal
        visible={modalNotifVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalNotifVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%', paddingBottom: 16 }]}>
            <View style={styles.modalHeaderRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="notifications" size={22} color={COLORS.primaryDark} />
                <Text style={styles.modalTitle}>Notifikasi Pesanan</Text>
                {unreadNotifCount > 0 && (
                  <View style={styles.notifBadgeSmall}>
                    <Text style={styles.notifBadgeSmallText}>{unreadNotifCount} Baru</Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setModalNotifVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {unreadNotifCount > 0 && (
              <TouchableOpacity
                style={styles.markAllBtn}
                onPress={handleMarkAllAsRead}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-done" size={14} color={COLORS.primary} />
                <Text style={styles.markAllBtnText}>Tandai Semua Sudah Dibaca</Text>
              </TouchableOpacity>
            )}

            {notifications.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: 'center' }}>
                <Ionicons name="notifications-off-outline" size={44} color={COLORS.divider} />
                <Text style={{ marginTop: 8, fontSize: 13, color: COLORS.textSecondary, fontWeight: '600' }}>
                  Belum ada notifikasi
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 }}>
                  Pembaruan status dari stan kantin akan muncul di sini.
                </Text>
              </View>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ gap: 8, paddingVertical: 6 }}
                renderItem={({ item }) => {
                  const isUnread = !item.is_read;
                  return (
                    <TouchableOpacity
                      style={[
                        styles.notifCardItem,
                        isUnread && styles.notifCardItemUnread,
                      ]}
                      onPress={() => {
                        handleMarkAsRead(item.id);
                        if (item.id_pesanan) {
                          setModalNotifVisible(false);
                          setActiveTab('pesanan');
                        }
                      }}
                      activeOpacity={0.75}
                    >
                      <View style={styles.notifCardIconCol}>
                        <View
                          style={[
                            styles.notifItemCircle,
                            item.tipe === 'siap_diambil'
                              ? { backgroundColor: COLORS.badgeSuccess }
                              : item.tipe === 'status_diproses'
                              ? { backgroundColor: COLORS.statusWaitingBg }
                              : { backgroundColor: COLORS.badgeBackground },
                          ]}
                        >
                          <Ionicons
                            name={
                              item.tipe === 'siap_diambil'
                                ? 'bag-check'
                                : item.tipe === 'status_diproses'
                                ? 'flame'
                                : 'chatbubble-ellipses'
                            }
                            size={16}
                            color={
                              item.tipe === 'siap_diambil'
                                ? COLORS.textSuccessDark
                                : item.tipe === 'status_diproses'
                                ? COLORS.queueOrange
                                : COLORS.primaryDark
                            }
                          />
                        </View>
                      </View>

                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text style={[styles.notifItemTitle, isUnread && { fontWeight: '800', color: COLORS.primaryDark }]}>
                            {item.judul}
                          </Text>
                          {isUnread && <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.notifItemMsg}>{item.pesan}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Ionicons name="time-outline" size={11} color={COLORS.textSecondary} />
                          <Text style={styles.notifItemDate}>
                            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                            {new Date(item.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: COLORS.backgroundMain,
  },
  activeTabContainer: {
    flex: 1,
  },
  tabContentContainer: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 110,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.textSecondary,
    fontSize: 14,
  },

  // ==========================================
  // STYLES BERANDA
  // ==========================================
  headerContainer: {
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inactiveElement,
  },
  adminBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FED7AA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  adminBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  adminBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.brownDark,
  },
  adminReturnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
  adminReturnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cardBackground,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  userInfo: {
    flex: 1,
  },
  greetingText: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  badgeNimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  nimBadge: {
    backgroundColor: COLORS.badgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
  },
  nimText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textBody,
  },
  canteenTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  canteenTagText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  quickActiveBadgeBtn: {
    position: 'relative',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickOrderBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: COLORS.orange,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  quickOrderBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brownDark,
  },
  heroBanner: {
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: SPACING.md,
  },
  heroTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.orange,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.cardBackground,
    lineHeight: 22,
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 12,
    color: '#D1E7DD',
    lineHeight: 16,
  },
  heroIcon: {
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
  },
  searchInput: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  tenantFilterList: {
    paddingVertical: 2,
    gap: 8,
  },
  tenantFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBackground,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
  },
  tenantFilterChipActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  tenantFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  tenantFilterTextActive: {
    color: COLORS.cardBackground,
    fontWeight: '700',
  },
  menuCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    ...SHADOWS.soft,
  },
  menuImage: {
    width: 90,
    height: 90,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBackground,
  },
  menuDetails: {
    flex: 1,
    marginLeft: SPACING.md,
    justifyContent: 'space-between',
  },
  tenantTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tenantNameText: {
    fontSize: 11,
    color: COLORS.goldenBrown,
    fontWeight: '700',
  },
  menuNameText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  menuPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
    marginTop: 4,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brownDark,
  },
  outOfStockBadge: {
    backgroundColor: COLORS.badgeBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  outOfStockText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  qtyController: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBackground,
    borderRadius: RADIUS.full,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  qtyBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyNumberText: {
    paddingHorizontal: 10,
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },

  // Floating Cart Bar (di atas navbar bawah)
  floatingCartContainer: {
    position: 'absolute',
    bottom: 74,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    ...SHADOWS.floating,
  },
  cartInfoCol: {
    flex: 1,
  },
  cartCountBadge: {
    backgroundColor: COLORS.orange,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginBottom: 2,
  },
  cartCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.brownDark,
  },
  cartTenantText: {
    fontSize: 11,
    color: '#D1E7DD',
    fontWeight: '600',
  },
  cartPriceText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.cardBackground,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    gap: 6,
  },
  checkoutButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brownDark,
  },

  // ==========================================
  // STYLES PESANAN & RIWAYAT
  // ==========================================
  sectionHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.cardBackground,
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inactiveElement,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  sectionHeaderSubtitle: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  refreshIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ordersListContent: {
    padding: SPACING.lg,
    paddingBottom: 110,
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
  statusPillBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
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
    width: 24,
    height: 24,
    borderRadius: 12,
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
    color: COLORS.textSecondary,
    fontWeight: '600',
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
    marginBottom: 16,
  },
  trackerLineActive: {
    backgroundColor: COLORS.primaryDark,
  },
  itemsSummary: {
    borderTopWidth: 1,
    borderTopColor: COLORS.inactiveElement,
    paddingTop: SPACING.sm,
    marginTop: 4,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 12,
    color: COLORS.textBody,
    flex: 1,
  },
  itemPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  catatanText: {
    fontSize: 11,
    fontStyle: 'italic',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: COLORS.inactiveElement,
    paddingTop: SPACING.sm,
    marginTop: SPACING.sm,
  },
  payMethodText: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  totalPrice: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  whatsappBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8FDF0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 6,
    borderWidth: 1,
    borderColor: '#B9F6CA',
  },
  whatsappBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#137333',
  },
  reorderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBackground,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  reorderBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  historyFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: COLORS.cardBackground,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inactiveElement,
  },
  historyFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.inputBackground,
  },
  historyFilterChipActive: {
    backgroundColor: COLORS.primaryDark,
  },
  historyFilterText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  historyFilterTextActive: {
    color: COLORS.cardBackground,
    fontWeight: '700',
  },

  // ==========================================
  // STYLES PROFIL
  // ==========================================
  profileScrollContent: {
    padding: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 120,
  },
  profileHeroCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    ...SHADOWS.card,
    marginBottom: SPACING.lg,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
    borderWidth: 3,
    borderColor: COLORS.orange,
  },
  avatarText: {
    fontSize: 24,
    fontWeight: '900',
    color: COLORS.cardBackground,
    letterSpacing: 1,
  },
  profileNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  roleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    gap: 5,
    marginTop: 6,
  },
  roleTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.goldenBrown,
  },
  quickStatRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    ...SHADOWS.soft,
    alignItems: 'center',
  },
  quickStatCard: {
    flex: 1,
    alignItems: 'center',
  },
  quickStatValue: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  quickStatLabel: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  quickStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.inactiveElement,
  },
  infoSection: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    ...SHADOWS.soft,
  },
  infoSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.md,
    gap: 12,
  },
  infoIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 1,
  },
  serverCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  serverUrlText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
    marginTop: 2,
  },
  changeIpBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
  },
  changeIpBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.cardBackground,
  },
  logoutFullBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 12,
    borderRadius: RADIUS.lg,
    marginTop: SPACING.sm,
    gap: 8,
  },
  logoutFullBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.danger,
  },
  versionFooterText: {
    textAlign: 'center',
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: SPACING.lg,
  },

  // ==========================================
  // STYLES BOTTOM NAVIGATION BAR
  // ==========================================
  bottomNavBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.cardBackground,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.inactiveElement,
    ...SHADOWS.card,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  navIconContainer: {
    position: 'relative',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
  },
  navIconContainerActive: {
    backgroundColor: '#E8F5E9',
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  navLabelActive: {
    color: COLORS.primaryDark,
    fontWeight: '800',
  },
  navBadge: {
    position: 'absolute',
    top: 0,
    right: 4,
    backgroundColor: COLORS.orange,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  navBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: COLORS.brownDark,
  },

  // ==========================================
  // STYLES EMPTY STATE
  // ==========================================
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: SPACING.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.inputBackground,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: SPACING.lg,
  },
  primaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    gap: 8,
    ...SHADOWS.soft,
  },
  primaryActionButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.cardBackground,
  },

  // ==========================================
  // STYLES MODAL IP
  // ==========================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '100%',
    maxWidth: 380,
    ...SHADOWS.floating,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  modalDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 17,
    marginBottom: SPACING.md,
  },
  inputIpGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    gap: 8,
    marginBottom: SPACING.sm,
  },
  modalIpInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  presetRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: SPACING.md,
  },
  presetChip: {
    backgroundColor: COLORS.inputBackground,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
  },
  presetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  pingResultBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderRadius: RADIUS.sm,
    gap: 8,
    marginBottom: SPACING.md,
  },
  pingResultText: {
    fontSize: 11,
    fontWeight: '700',
    flex: 1,
  },
  modalBtnRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 10,
    marginTop: SPACING.sm,
  },
  pingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBackground,
  },
  pingBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  modalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  modalSaveBtn: {
    backgroundColor: COLORS.primaryDark,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: RADIUS.md,
  },
  modalSaveBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.cardBackground,
  },
  // Revisi Poin 2 & Poin 5: Status Meta Row & Badges
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
  // Revisi Poin 3: Tabel User (pengguna)
  userTableSection: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.card,
  },
  tableCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: SPACING.sm,
  },
  tableCardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    borderRadius: RADIUS.sm,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.badgeBackground,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inactiveElement,
  },
  tableColHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
  },
  tableDataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.inactiveElement,
  },
  tableDataRowAlt: {
    backgroundColor: COLORS.inputBackground,
  },
  tableKeyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tableValText: {
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  roleTableBadge: {
    backgroundColor: COLORS.badgeBackground,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  roleTableBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.goldenBrown,
    textTransform: 'capitalize',
  },
  // Revisi Poin 7: Floating Toast Notifikasi
  floatingToast: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.primary,
    ...SHADOWS.floating,
    zIndex: 9999,
  },
  toastLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  toastIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  toastMsg: {
    fontSize: 12,
    color: COLORS.textBody,
    marginTop: 2,
  },
  toastActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginLeft: 6,
  },
  toastOpenBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
  },
  toastOpenBtnText: {
    color: COLORS.cardBackground,
    fontSize: 11,
    fontWeight: '700',
  },
  toastCloseBtn: {
    padding: 4,
  },
  // Modal Notifikasi Styles
  notifBadgeSmall: {
    backgroundColor: COLORS.danger,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  notifBadgeSmallText: {
    color: COLORS.cardBackground,
    fontSize: 10,
    fontWeight: '800',
  },
  markAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    gap: 4,
    marginBottom: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
  },
  notifCardItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    padding: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  notifCardItemUnread: {
    backgroundColor: COLORS.cardBackground,
    borderColor: COLORS.primary,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  notifCardIconCol: {
    justifyContent: 'flex-start',
  },
  notifItemCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifItemTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  notifItemMsg: {
    fontSize: 12,
    color: COLORS.textBody,
    marginTop: 2,
  },
  notifItemDate: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  payBadgeDitolak: {
    backgroundColor: COLORS.dangerBg,
  },
  payBadgeDitolakText: {
    color: COLORS.dangerDark,
  },
  verifNoticeMhs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.statusWaitingBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  verifNoticeMhsRejected: {
    backgroundColor: COLORS.dangerBg,
  },
  verifNoticeMhsText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    color: COLORS.brownDark,
  },
  reuploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
    marginTop: SPACING.sm,
  },
  reuploadBtnText: {
    color: COLORS.cardBackground,
    fontSize: 13,
    fontWeight: '700',
  },
});