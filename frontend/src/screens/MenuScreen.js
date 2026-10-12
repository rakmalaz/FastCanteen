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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

export default function MenuScreen({ navigation }) {
  const { user, logout } = useAuth();
  const { items: cartItems, addToCart, removeFromCart, totalAmount, totalCount, activeTenant } = useCart();

  const [menus, setMenus] = useState([]);
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState(null);

  const fetchData = async () => {
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
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, []);

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

  // Filter menu berdasarkan tenant dan kata kunci pencarian
  const filteredMenus = menus.filter((menu) => {
    const matchesTenant =
      selectedTenantId === null || menu.id_tenant === selectedTenantId;
    const matchesSearch =
      menu.nama_menu.toLowerCase().includes(searchQuery.toLowerCase()) ||
      menu.nama_tenant.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTenant && matchesSearch;
  });

  const formatIDR = (val) => {
    return 'Rp ' + Number(val).toLocaleString('id-ID');
  };

  const getCartQuantity = (menuId) => {
    const item = cartItems.find((i) => i.id === menuId);
    return item ? item.quantity : 0;
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Banner Khusus jika Super Admin sedang meninjau tampilan mahasiswa */}
      {user?.peran === 'admin' && (
        <View style={styles.adminBanner}>
          <View style={styles.adminBannerLeft}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.orange} />
            <Text style={styles.adminBannerText}>Pratinjau Tampilan Mahasiswa</Text>
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

      {/* Top User Greeting & Navigation */}
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

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.actionIconButton}
            onPress={() => navigation.navigate('OrderHistory')}
            activeOpacity={0.7}
          >
            <Ionicons name="receipt-outline" size={20} color={COLORS.primaryDark} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionIconButton, styles.logoutButton]}
            onPress={handleLogout}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
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
        <Ionicons name="time" size={48} color={COLORS.orange} style={styles.heroIcon} />
      </View>

      {/* Kolom Pencarian */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={19} color={COLORS.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Cari makanan favorit, soto, jus..."
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
        {/* Foto Menu */}
        <Image
          source={{
            uri:
              item.foto ||
              'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
          }}
          style={styles.menuImage}
          resizeMode="cover"
        />

        {/* Informasi Menu */}
        <View style={styles.menuDetails}>
          {/* Stan Info Badge */}
          <View style={styles.tenantTagRow}>
            <Ionicons name="storefront" size={12} color={COLORS.goldenBrown} />
            <Text style={styles.tenantNameText} numberOfLines={1}>
              {item.nama_tenant}
            </Text>
          </View>

          {/* Nama Makanan */}
          <Text style={styles.menuNameText} numberOfLines={2}>
            {item.nama_menu}
          </Text>

          {/* Harga */}
          <Text style={styles.menuPriceText}>{formatIDR(item.harga)}</Text>

          {/* Baris Aksi / Status Stok */}
          <View style={styles.actionRow}>
            {isAvailable ? (
              qty > 0 ? (
                /* Stepper Jumlah di Keranjang */
                <View style={styles.stepperContainer}>
                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => removeFromCart(item.id)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="remove" size={16} color={COLORS.primaryDark} />
                  </TouchableOpacity>

                  <Text style={styles.stepperText}>{qty}</Text>

                  <TouchableOpacity
                    style={styles.stepperBtn}
                    onPress={() => addToCart(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="add" size={16} color={COLORS.primaryDark} />
                  </TouchableOpacity>
                </View>
              ) : (
                /* Tombol Tambah ke Keranjang */
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => addToCart(item)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="cart-outline" size={15} color={COLORS.brownDark} />
                  <Text style={styles.addButtonText}>Pesan</Text>
                </TouchableOpacity>
              )
            ) : (
              /* Stok Habis Badge */
              <View style={styles.outOfStockBadge}>
                <Ionicons name="alert-circle-outline" size={13} color={COLORS.danger} />
                <Text style={styles.outOfStockText}>Stok Habis</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryDark} />
          <Text style={styles.loadingText}>Memuat menu FastCanteen...</Text>
        </View>
      ) : (
        <FlatList
          data={filteredMenus}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderMenuItem}
          ListHeaderComponent={renderHeader}
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
              <Ionicons name="restaurant-outline" size={48} color={COLORS.divider} />
              <Text style={styles.emptyTitle}>Menu Tidak Ditemukan</Text>
              <Text style={styles.emptySubtitle}>
                Silakan coba kata kunci lain atau pilih stan kantin yang berbeda.
              </Text>
            </View>
          }
        />
      )}

      {/* Floating Bottom Bar Keranjang (US-04) */}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundMain,
  },
  listContent: {
    paddingBottom: 110,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundMain,
  },
  loadingText: {
    marginTop: SPACING.md,
    fontSize: 14,
    color: COLORS.textBody,
  },
  headerContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: Platform.OS === 'ios' ? 50 : 25,
    paddingBottom: SPACING.md,
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
    gap: 6,
  },
  nimBadge: {
    backgroundColor: COLORS.badgeBackground,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
    backgroundColor: COLORS.badgeSuccess,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  canteenTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSuccessDark,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  actionIconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.cardBackground,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.inactiveTab,
    ...SHADOWS.soft,
  },
  logoutButton: {
    borderColor: COLORS.dangerBg,
    backgroundColor: COLORS.cardBackground,
  },
  heroBanner: {
    flexDirection: 'row',
    backgroundColor: COLORS.primaryDark,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg,
    ...SHADOWS.card,
  },
  heroTextCol: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  heroTag: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.orange,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.cardBackground,
    marginBottom: 4,
  },
  heroDesc: {
    fontSize: 11,
    color: COLORS.badgeBackground,
    lineHeight: 15,
  },
  heroIcon: {
    opacity: 0.9,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.inactiveTab,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    marginBottom: SPACING.lg,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  tenantFilterList: {
    paddingBottom: SPACING.sm,
    gap: SPACING.sm,
  },
  tenantFilterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.badgeBackground,
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
    borderRadius: RADIUS.lg,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.inactiveElement,
    ...SHADOWS.soft,
  },
  menuImage: {
    width: 95,
    height: 95,
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
    fontWeight: '600',
    color: COLORS.goldenBrown,
    flex: 1,
  },
  menuNameText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginVertical: 2,
    lineHeight: 18,
  },
  menuPriceText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: RADIUS.md,
    gap: 5,
    ...SHADOWS.soft,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.brownDark,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.badgeBackground,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },
  stepperBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primaryDark,
    paddingHorizontal: 6,
  },
  outOfStockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    gap: 4,
  },
  outOfStockText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.danger,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
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
  },
  floatingCartContainer: {
    position: 'absolute',
    bottom: 20,
    left: SPACING.lg,
    right: SPACING.lg,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.floating,
  },
  cartInfoCol: {
    flex: 1,
  },
  cartCountBadge: {
    backgroundColor: COLORS.badgeSuccess,
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    marginBottom: 2,
  },
  cartCountText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.textSuccessDark,
  },
  cartTenantText: {
    fontSize: 11,
    color: COLORS.badgeBackground,
    fontWeight: '500',
  },
  cartPriceText: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.cardBackground,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.orange,
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderRadius: RADIUS.lg,
    gap: 6,
    ...SHADOWS.card,
  },
  checkoutButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.brownDark,
  },
  adminBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    borderWidth: 1,
    borderColor: '#FFE082',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.sm,
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
