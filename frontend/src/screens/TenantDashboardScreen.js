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
  Image,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API, { resolveBuktiUrl } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

// Alasan cepat saat menolak bukti pembayaran
const ALASAN_TOLAK = [
  'Nominal tidak sesuai',
  'Gambar buram atau tidak jelas',
  'Transaksi tidak ada di mutasi',
  'Bukti bukan untuk pesanan ini',
];

export default function TenantDashboardScreen({ navigation }) {
  const { user, logout } = useAuth();
  const tenantId = user?.tenant?.id ?? (user?.peran === 'admin' ? 1 : undefined);
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

  // Modal Kirim Notifikasi Langsung ke Mahasiswa (Poin 7)
  const [notifModalVisible, setNotifModalVisible] = useState(false);

  // Modal Lihat Bukti Pembayaran (US-07)
  const [buktiModalUri, setBuktiModalUri] = useState(null);
  const [buktiError, setBuktiError] = useState(false);
  const tutupBukti = () => {
    setBuktiModalUri(null);
    setBuktiError(false);
  };

  // Modal Tolak Bukti Pembayaran (verifikasi)
  const [rejectOrder, setRejectOrder] = useState(null);
  const [rejectNote, setRejectNote] = useState('');
  const [verifLoading, setVerifLoading] = useState(false);
  const [targetOrderForNotif, setTargetOrderForNotif] = useState(null);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [sendingNotif, setSendingNotif] = useState(false);

    const fetchData = async () => {
    if (!tenantId) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
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
    const timer = setInterval(fetchData, 10000);
    return () => clearInterval(timer);
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
      const res = await API.put(`/pesanan/${orderId}/status`, { status_pesanan: newStatus });
      if (res.data.success) {
        Alert.alert('Sukses 🎉', `Pesanan #${orderId} kini berstatus "${newStatus}". Notifikasi otomatis dikirim ke mahasiswa.`);
        fetchData();
      }
    } catch (err) {
      Alert.alert('Gagal Mengubah Status', err.response?.data?.message || err.message);
    }
  };

  // Kirim Notifikasi Langsung / Custom ke Mahasiswa (Poin 7)
  const openNotifModal = (order) => {
    setTargetOrderForNotif(order);
    setNotifTitle(`Update Pesanan #${order.id} dari ${tenantName}`);
    setNotifMessage('');
    setNotifModalVisible(true);
  };

  const handleSendCustomNotification = async () => {
    if (!targetOrderForNotif) return;
    if (!notifMessage.trim()) {
      Alert.alert('Pesan Kosong', 'Harap tulis pesan notifikasi untuk mahasiswa.');
      return;
    }

    setSendingNotif(true);
    try {
      const res = await API.post('/notifikasi', {
        id_penerima: targetOrderForNotif.id_mahasiswa,
        id_pengirim: user?.id,
        id_pesanan: targetOrderForNotif.id,
        judul: notifTitle.trim() || `Notifikasi dari ${tenantName}`,
        pesan: notifMessage.trim(),
        tipe: 'info',
      });

      if (res.data.success) {
        Alert.alert('Notifikasi Terkirim! 🔔', `Pesan berhasil dikirim langsung ke ${targetOrderForNotif.nama_mahasiswa}.`);
        setNotifModalVisible(false);
        setNotifMessage('');
        setTargetOrderForNotif(null);
      }
    } catch (err) {
      Alert.alert('Gagal Mengirim', err.response?.data?.message || err.message);
    } finally {
      setSendingNotif(false);
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
      Alert.alert('Gagal', err.response?.data?.message || err.message);
    }
  };

  // Tambah Menu Baru (US-09)
  const handleCreateMenu = async () => {
    // Ambil hanya angka: "15.000" atau "15,000" menjadi 15000
    const hargaAngka = Number(newMenuHarga.replace(/[^0-9]/g, ''));
    if (!newMenuNama.trim() || !hargaAngka) {
      Alert.alert('Perhatian', 'Nama menu dan harga (angka lebih dari 0) wajib diisi.');
      return;
    }

    setSubmittingMenu(true);
    try {
      const payload = {
        id_tenant: tenantId,
        nama_menu: newMenuNama.trim(),
        harga: hargaAngka,
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
      Alert.alert('Gagal Menyimpan Menu', err.response?.data?.message || err.message);
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

  // ---------- Verifikasi pembayaran ----------
  const perluVerifikasi = (o) =>
    o.metode_pembayaran !== 'Tunai' &&
    o.status_pembayaran === 'Menunggu Verifikasi' &&
    (o.status_pesanan || o.status) === 'Menunggu';

  const jumlahPerluVerifikasi = orders.filter(perluVerifikasi).length;

  // Bukti contoh (placeholder) dari versi lama aplikasi bukan bukti pembayaran sungguhan
  const adaBuktiAsli = (nilai) => !!nilai && !/placeholder\.com/i.test(nilai);

  const kirimVerifikasi = async (orderId, aksi, catatan) => {
    setVerifLoading(true);
    try {
      const res = await API.put(`/pesanan/${orderId}/verifikasi`, {
        aksi,
        catatan,
        id_verifikator: user?.id,
      });
      if (res.data.success) {
        const dibatalkan = res.data.data?.status_pesanan === 'Dibatalkan';
        if (aksi === 'valid') {
          Alert.alert(
            'Pembayaran Terverifikasi',
            `Pembayaran pesanan #${orderId} sudah diverifikasi. Pesanan sekarang bisa diproses.`,
            [{ text: 'OK' }],
            { tone: 'success' }
          );
        } else if (aksi === 'minta_ulang' && !dibatalkan) {
          Alert.alert(
            'Permintaan Unggah Ulang Terkirim',
            `Pembeli pesanan #${orderId} sudah diberi tahu dan dapat mengunggah bukti pembayaran yang baru.`,
            [{ text: 'OK' }],
            { tone: 'warning' }
          );
        } else if (aksi === 'minta_ulang') {
          Alert.alert(
            'Pesanan Dibatalkan',
            `Bukti pembayaran pesanan #${orderId} sudah ditolak 3 kali, sehingga pesanan dibatalkan otomatis.`,
            [{ text: 'OK' }],
            { tone: 'danger' }
          );
        } else {
          Alert.alert(
            'Pesanan Dibatalkan',
            `Pesanan #${orderId} dibatalkan karena bukti pembayaran tidak valid. Pembeli sudah diberi tahu.`,
            [{ text: 'OK' }],
            { tone: 'danger' }
          );
        }
        fetchData();
      }
    } catch (err) {
      Alert.alert('Gagal Memverifikasi', err.response?.data?.message || err.message);
    } finally {
      setVerifLoading(false);
      setRejectOrder(null);
      setRejectNote('');
    }
  };

  const handleVerifikasiValid = (order) => {
    Alert.alert(
      'Verifikasi Pembayaran',
      `Pastikan uang ${formatIDR(order.total_harga)} sudah masuk ke rekening atau e-wallet Anda. Lanjutkan?`,
      [
        { text: 'Batal', style: 'cancel' },
        { text: 'Ya, Pembayaran Valid', onPress: () => kirimVerifikasi(order.id, 'valid') },
      ]
    );
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'Semua') return true;
    if (statusFilter === 'Perlu Verifikasi') return perluVerifikasi(o);
    const currentStatus = o.status_pesanan || o.status;
    return currentStatus === statusFilter;
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
            {summary?.statistik?.perlu_dimasak || 0} Antrean
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
          <View style={styles.statusFilterWrap}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={[styles.statusFilterRow, { alignItems: 'center', marginTop: 0 }]}
            >
              {['Semua', 'Perlu Verifikasi', 'Menunggu', 'Diproses', 'Siap Diambil', 'Selesai'].map((st) => {
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
                      {st === 'Perlu Verifikasi' && jumlahPerluVerifikasi > 0
                        ? `Perlu Verifikasi (${jumlahPerluVerifikasi})`
                        : st}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
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
                const stPesanan = item.status_pesanan || item.status || 'Menunggu';
                const stBayar = item.status_pembayaran || 'Sudah Dibayar';
                const isMenunggu = stPesanan === 'Menunggu';
                const isDiproses = stPesanan === 'Diproses';
                const isSiap = stPesanan === 'Siap Diambil';
                const isSelesai = stPesanan === 'Selesai';
                const isDibatalkan = stPesanan === 'Dibatalkan';
                const isTunai = item.metode_pembayaran === 'Tunai';
                const menungguVerif = !isTunai && stBayar === 'Menunggu Verifikasi' && isMenunggu;
                const buktiDitolak = !isTunai && stBayar === 'Bukti Ditolak' && isMenunggu;
                const terkunci = !isTunai && stBayar !== 'Sudah Dibayar' && isMenunggu; // belum boleh dimasak

                return (
                  <View style={styles.orderCard}>
                    {/* Top Row: Order ID, Waktu */}
                    <View style={styles.orderCardTop}>
                      <View>
                        <Text style={styles.orderIdText}>Pesanan #{item.id}</Text>
                        <Text style={styles.orderDateText}>
                          {new Date(item.waktu_transaksi).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })} WIB
                        </Text>
                      </View>

                      {/* Badge Status Pembayaran (Revisi Poin 2) */}
                      <View
                        style={[
                          styles.payStatusBadge,
                          stBayar === 'Sudah Dibayar'
                            ? styles.payStatusLunas
                            : styles.payStatusBelum,
                          stBayar === 'Bukti Ditolak' && styles.payStatusDitolak,
                        ]}
                      >
                        <Ionicons
                          name={stBayar === 'Sudah Dibayar' ? 'checkmark-circle' : 'time-outline'}
                          size={12}
                          color={stBayar === 'Sudah Dibayar' ? COLORS.textSuccessDark : COLORS.urgentOrange}
                        />
                        <Text
                          style={[
                            styles.payStatusBadgeText,
                            stBayar === 'Sudah Dibayar'
                              ? styles.payStatusLunasText
                              : styles.payStatusBelumText,
                            stBayar === 'Bukti Ditolak' && styles.payStatusDitolakText,
                          ]}
                        >
                          {stBayar}
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

                      {/* Tombol Kontak WhatsApp */}
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
                          <Text style={styles.waBtnText}>WA</Text>
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

                    {/* Baris Total & Status Pesanan */}
                    <View style={styles.paymentStatusRow}>
                      <View>
                        <Text style={styles.payMethodLabel}>
                          Metode: {item.metode_pembayaran}
                        </Text>
                        <Text style={styles.totalPriceText}>
                          {formatIDR(item.total_harga)}
                        </Text>
                      </View>

                      {/* Badge Status Pemesanan Saat Ini */}
                      <View
                        style={[
                          styles.statusBadge,
                          isMenunggu && styles.statusBadgeMenunggu,
                          isDiproses && styles.statusBadgeDiproses,
                          isSiap && styles.statusBadgeSiap,
                          isSelesai && styles.statusBadgeSelesai,
                          isDibatalkan && styles.statusBadgeDibatalkan,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isMenunggu && styles.statusTextMenunggu,
                            isDiproses && styles.statusTextDiproses,
                            isSiap && styles.statusTextSiap,
                            isSelesai && styles.statusTextSelesai,
                            isDibatalkan && styles.statusTextDibatalkan,
                          ]}
                        >
                          {stPesanan}
                        </Text>
                      </View>
                    </View>

                    {/* Bukti Pembayaran (US-07) */}
                    {item.metode_pembayaran !== 'Tunai' &&
                      (adaBuktiAsli(item.bukti_pembayaran) ? (
                        <TouchableOpacity
                          style={styles.buktiBtn}
                          onPress={() => setBuktiModalUri(resolveBuktiUrl(item.bukti_pembayaran))}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="receipt-outline" size={15} color={COLORS.primaryDark} />
                          <Text style={styles.buktiBtnText}>Lihat Bukti Pembayaran</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={styles.buktiMissing}>Belum ada bukti pembayaran</Text>
                      ))}

                    {/* Verifikasi Pembayaran */}
                    {menungguVerif && (
                      <View style={styles.verifBox}>
                        <Text style={styles.verifHint}>
                          Cek mutasi rekening atau e-wallet Anda: harus ada uang masuk{' '}
                          {formatIDR(item.total_harga)}, lalu verifikasi.
                        </Text>
                        <View style={styles.verifRow}>
                          <TouchableOpacity
                            style={styles.verifValidBtn}
                            onPress={() => handleVerifikasiValid(item)}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="shield-checkmark" size={15} color={COLORS.cardBackground} />
                            <Text style={styles.verifValidText}>Pembayaran Valid</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.verifRejectBtn}
                            onPress={() => {
                              setRejectNote('');
                              setRejectOrder(item);
                            }}
                            activeOpacity={0.85}
                          >
                            <Ionicons name="close-circle-outline" size={15} color={COLORS.danger} />
                            <Text style={styles.verifRejectText}>Tolak</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                    {buktiDitolak && (
                      <Text style={styles.verifWaiting}>
                        Menunggu pembeli mengunggah ulang bukti ({item.jumlah_penolakan || 0}/3 ditolak)
                        {item.catatan_verifikasi ? `. Alasan: ${item.catatan_verifikasi}` : ''}
                      </Text>
                    )}

                    {/* Action Buttons: US-08 Update Status & Kirim Notif (Poin 7) */}
                    <View style={styles.actionRow}>
                      {/* Tombol Kirim Pesan / Notifikasi Custom */}
                      {!isSelesai && !isDibatalkan && (
                        <TouchableOpacity
                          style={styles.notifDirectBtn}
                          onPress={() => openNotifModal(item)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="chatbubble-ellipses" size={14} color={COLORS.cardBackground} />
                          <Text style={styles.notifDirectBtnText}>Kirim Pesan</Text>
                        </TouchableOpacity>
                      )}

                      {isMenunggu && (
                        <>
                          {!terkunci && (
                            <TouchableOpacity
                              style={styles.processButton}
                              onPress={() => handleUpdateStatus(item.id, 'Diproses')}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="flame" size={15} color={COLORS.cardBackground} />
                              <Text style={styles.readyButtonText}>Terima & Masak</Text>
                            </TouchableOpacity>
                          )}
                          {!(menungguVerif || buktiDitolak) && (
                            <TouchableOpacity
                              style={styles.cancelOrderBtn}
                              onPress={() =>
                                Alert.alert('Tolak Pesanan', `Tolak pesanan #${item.id}?`, [
                                  { text: 'Batal', style: 'cancel' },
                                  {
                                    text: 'Tolak',
                                    style: 'destructive',
                                    onPress: () => handleUpdateStatus(item.id, 'Dibatalkan'),
                                  },
                                ])
                              }
                              activeOpacity={0.8}
                            >
                              <Ionicons name="close" size={15} color={COLORS.danger} />
                            </TouchableOpacity>
                          )}
                        </>
                      )}

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
                  onChangeText={(teks) => setNewMenuHarga(teks.replace(/[^0-9]/g, ''))}
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

      {/* Modal Tolak Bukti Pembayaran */}
      <Modal
        visible={!!rejectOrder}
        animationType="slide"
        transparent
        onRequestClose={() => setRejectOrder(null)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Area gelap di atas: ketuk untuk menutup */}
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            onPress={() => setRejectOrder(null)}
          />

          <View style={styles.rejectSheet}>
            <View style={styles.rejectHandle} />

            <View style={styles.rejectHeader}>
              <View style={styles.rejectHeaderIcon}>
                <Ionicons name="close-circle" size={26} color={COLORS.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rejectTitle}>Tolak Bukti Pembayaran</Text>
                <Text style={styles.rejectSubtitle} numberOfLines={2}>
                  Pesanan #{rejectOrder?.id} • {rejectOrder?.nama_mahasiswa} •{' '}
                  {formatIDR(rejectOrder?.total_harga)}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setRejectOrder(null)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.rejectSection}>Pilih alasan</Text>
              {ALASAN_TOLAK.map((alasan) => {
                const dipilih = rejectNote === alasan;
                return (
                  <TouchableOpacity
                    key={alasan}
                    style={[styles.rejectOption, dipilih && styles.rejectOptionActive]}
                    onPress={() => setRejectNote(alasan)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.rejectRadio, dipilih && styles.rejectRadioActive]}>
                      {dipilih && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
                    </View>
                    <Text style={[styles.rejectOptionText, dipilih && styles.rejectOptionTextActive]}>
                      {alasan}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <Text style={styles.rejectSection}>Atau tulis alasan sendiri</Text>
              <TextInput
                style={styles.rejectInput}
                placeholder="Contoh: nominal kurang Rp 2.000"
                placeholderTextColor={COLORS.textSecondary}
                value={rejectNote}
                onChangeText={setRejectNote}
                maxLength={200}
                multiline
              />

              <View style={styles.rejectHint}>
                <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
                <Text style={styles.rejectHintText}>
                  Pembeli diberi kesempatan mengunggah bukti baru (maksimal 3 kali penolakan). Pilih
                  "Tolak & Batalkan" hanya jika bukti jelas tidak valid.
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.rejectAskBtn, styles.rejectBtnRow]}
                disabled={verifLoading}
                onPress={() => kirimVerifikasi(rejectOrder.id, 'minta_ulang', rejectNote)}
                activeOpacity={0.85}
              >
                {verifLoading ? (
                  <ActivityIndicator color={COLORS.cardBackground} />
                ) : (
                  <>
                    <Ionicons name="cloud-upload-outline" size={18} color={COLORS.cardBackground} />
                    <Text style={styles.rejectAskText}>Minta Unggah Ulang</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.rejectCancelOrderBtn, styles.rejectBtnRow]}
                disabled={verifLoading}
                onPress={() =>
                  Alert.alert(
                    'Tolak & Batalkan Pesanan',
                    `Batalkan pesanan #${rejectOrder?.id} karena bukti tidak valid? Pembeli tidak bisa mengunggah ulang.`,
                    [
                      { text: 'Kembali', style: 'cancel' },
                      {
                        text: 'Ya, Batalkan',
                        style: 'destructive',
                        onPress: () => kirimVerifikasi(rejectOrder.id, 'tolak_batal', rejectNote),
                      },
                    ]
                  )
                }
                activeOpacity={0.85}
              >
                <Ionicons name="close-circle-outline" size={18} color={COLORS.danger} />
                <Text style={styles.rejectCancelOrderText}>Tolak & Batalkan Pesanan</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.rejectBackBtn}
                onPress={() => setRejectOrder(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.rejectBackText}>Batal</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Lihat Bukti Pembayaran (US-07) */}
      <Modal
        visible={!!buktiModalUri}
        animationType="fade"
        transparent
        onRequestClose={tutupBukti}
      >
        <View style={styles.buktiOverlay}>
          <TouchableOpacity
            style={styles.buktiClose}
            onPress={tutupBukti}
            activeOpacity={0.8}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
          {buktiModalUri && !buktiError ? (
            <Image
              source={{ uri: buktiModalUri }}
              style={styles.buktiFull}
              resizeMode="contain"
              onError={() => setBuktiError(true)}
            />
          ) : null}
          {buktiModalUri && buktiError ? (
            <View style={styles.buktiErrorBox}>
              <Ionicons name="image-outline" size={44} color="#FFFFFF" />
              <Text style={styles.buktiErrorText}>
                Gambar bukti tidak dapat dimuat. File mungkin sudah terhapus dari server, atau server
                tidak dapat dijangkau.
              </Text>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* Modal Kirim Notifikasi Langsung ke Mahasiswa (Poin 7) */}
      <Modal
        visible={notifModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotifModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="notifications" size={20} color={COLORS.primaryDark} />
                <Text style={styles.modalTitle}>Kirim Notifikasi Mahasiswa</Text>
              </View>
              <TouchableOpacity onPress={() => setNotifModalVisible(false)}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ marginBottom: 12, backgroundColor: COLORS.badgeBackground, padding: 10, borderRadius: RADIUS.md }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.textPrimary }}>
                Penerima: {targetOrderForNotif?.nama_mahasiswa}
              </Text>
              <Text style={{ fontSize: 12, color: COLORS.textSecondary }}>
                Pesanan #{targetOrderForNotif?.id} • Stan: {tenantName}
              </Text>
            </View>

            <Text style={styles.modalLabel}>Judul Notifikasi</Text>
            <TextInput
              style={styles.modalInput}
              value={notifTitle}
              onChangeText={setNotifTitle}
              placeholder="Contoh: Pesanan Segera Disajikan"
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.modalLabel}>Isi Pesan Notifikasi *</Text>
            <TextInput
              style={[styles.modalInput, { height: 90, textAlignVertical: 'top' }]}
              value={notifMessage}
              onChangeText={setNotifMessage}
              placeholder="Tulis pesan untuk mahasiswa pemesan (misal: Pesananmu hampir siap, sambal sudah dipisah ya!)..."
              placeholderTextColor={COLORS.textSecondary}
              multiline
              numberOfLines={4}
            />

            <TouchableOpacity
              style={[styles.saveMenuBtn, { backgroundColor: COLORS.primary }]}
              onPress={handleSendCustomNotification}
              disabled={sendingNotif}
            >
              {sendingNotif ? (
                <ActivityIndicator color={COLORS.cardBackground} />
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Ionicons name="send" size={16} color={COLORS.cardBackground} />
                  <Text style={styles.saveMenuBtnText}>Kirim Notifikasi Sekarang</Text>
                </View>
              )}
            </TouchableOpacity>
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
  payStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    gap: 4,
  },
  payStatusLunas: {
    backgroundColor: COLORS.badgeSuccess,
  },
  payStatusBelum: {
    backgroundColor: COLORS.statusWaitingBg,
  },
  payStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  payStatusLunasText: {
    color: COLORS.textSuccessDark,
  },
  payStatusBelumText: {
    color: COLORS.urgentOrange,
  },
  statusBadgeMenunggu: {
    backgroundColor: COLORS.badgeBackground,
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
  statusBadgeDibatalkan: {
    backgroundColor: COLORS.dangerBg,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  statusTextMenunggu: {
    color: COLORS.textBody,
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
  statusTextDibatalkan: {
    color: COLORS.danger,
  },
  actionRow: {
    marginTop: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  notifDirectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.goldenBrown,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    gap: 4,
  },
  notifDirectBtnText: {
    color: COLORS.cardBackground,
    fontSize: 12,
    fontWeight: '700',
  },
  processButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.orange,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    gap: 6,
    ...SHADOWS.soft,
  },
  cancelOrderBtn: {
    backgroundColor: COLORS.dangerBg,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readyButton: {
    flex: 1,
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
    flex: 1,
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
  buktiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
  },
  buktiBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  buktiMissing: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.danger,
    marginTop: SPACING.sm,
  },
  buktiOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  buktiFull: {
    width: '94%',
    height: '78%',
  },
  buktiClose: {
    position: 'absolute',
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  payStatusDitolak: {
    backgroundColor: COLORS.dangerBg,
  },
  payStatusDitolakText: {
    color: COLORS.dangerDark,
  },
  verifBox: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.statusWaitingBg,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  verifHint: {
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.brownDark,
    fontWeight: '600',
  },
  verifRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  verifValidBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  verifValidText: {
    color: COLORS.cardBackground,
    fontSize: 13,
    fontWeight: '700',
  },
  verifRejectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 10,
    paddingHorizontal: SPACING.lg,
  },
  verifRejectText: {
    color: COLORS.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  verifWaiting: {
    marginTop: SPACING.sm,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.dangerDark,
    fontWeight: '600',
  },
  rejectInput: {
    backgroundColor: COLORS.inputBackground,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    minHeight: 64,
    fontSize: 13,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  rejectAskBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  rejectAskText: {
    color: COLORS.cardBackground,
    fontSize: 14,
    fontWeight: '700',
  },
  rejectCancelOrderBtn: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.danger,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  rejectCancelOrderText: {
    color: COLORS.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  statusFilterWrap: {
    height: 50,
    flexGrow: 0,
    flexShrink: 0,
    justifyContent: 'center',
  },
  buktiErrorBox: {
    width: '84%',
    alignItems: 'center',
    gap: SPACING.md,
  },
  buktiErrorText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  modalCard: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    padding: SPACING.xl,
    paddingBottom: 28,
    maxHeight: '85%',
  },
  rejectSheet: {
    backgroundColor: COLORS.cardBackground,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.sm,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  rejectHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.divider,
    marginBottom: SPACING.md,
  },
  rejectHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.sm,
  },
  rejectHeaderIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.dangerBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  rejectSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  rejectSection: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginTop: SPACING.md,
    marginBottom: 8,
    letterSpacing: 0.3,
  },
  rejectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.inputBackground,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  rejectOptionActive: {
    backgroundColor: COLORS.dangerBg,
    borderColor: COLORS.danger,
  },
  rejectRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.divider,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectRadioActive: {
    backgroundColor: COLORS.danger,
    borderColor: COLORS.danger,
  },
  rejectOptionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textBody,
  },
  rejectOptionTextActive: {
    color: COLORS.dangerDark,
  },
  rejectHint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: SPACING.md,
  },
  rejectHintText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
  },
  rejectBtnRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  rejectBackBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  rejectBackText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});