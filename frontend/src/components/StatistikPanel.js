import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../constants/theme';

const formatRupiah = (num) => 'Rp ' + Number(num || 0).toLocaleString('id-ID');

const NAMA_HARI = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

// "2026-11-20" -> { hari: 'Jum', tgl: '20/11' } (dihitung dari string agar tidak geser zona waktu)
const labelTanggal = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  const hari = NAMA_HARI[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return { hari, tgl: `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}` };
};

const formatWaktu = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  return d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const PERIODE = [7, 14, 30];

/**
 * Panel statistik & keuangan satu tenant.
 * props: data (hasil API statistik), loading, hari, onChangeHari
 */
export default function StatistikPanel({ data, loading, hari = 7, onChangeHari }) {
  if (loading && !data) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primaryDark} />
        <Text style={styles.mutedText}>Memuat statistik...</Text>
      </View>
    );
  }
  if (!data) {
    return (
      <View style={styles.center}>
        <Ionicons name="stats-chart-outline" size={40} color={COLORS.divider} />
        <Text style={styles.mutedText}>Statistik belum tersedia.</Text>
      </View>
    );
  }

  const r = data.ringkasan;
  const harian = data.harian || [];
  const maxOmzet = Math.max(...harian.map((h) => h.omzet), 1);
  const totalPeriode = harian.reduce((s, h) => s + h.omzet, 0);
  const totalMetode = (data.per_metode || []).reduce((s, m) => s + m.omzet, 0) || 1;
  const rapat = harian.length > 7; // 14/30 hari: label dirapatkan

  return (
    <View>
      {/* Kartu ringkasan keuangan */}
      <View style={styles.grid}>
        <View style={[styles.kpiCard, styles.kpiWide]}>
          <Text style={styles.kpiLabel}>Total Omzet</Text>
          <Text style={[styles.kpiValue, { fontSize: 22, color: COLORS.primaryDark }]}>
            {formatRupiah(r.total_omzet)}
          </Text>
          <Text style={styles.kpiHint}>Dari {r.pesanan_berbayar} pesanan berbayar</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Hari Ini</Text>
          <Text style={styles.kpiValue}>{formatRupiah(r.omzet_hari_ini)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>7 Hari Terakhir</Text>
          <Text style={styles.kpiValue}>{formatRupiah(r.omzet_7_hari)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Bulan Ini</Text>
          <Text style={styles.kpiValue}>{formatRupiah(r.omzet_bulan_ini)}</Text>
        </View>
        <View style={styles.kpiCard}>
          <Text style={styles.kpiLabel}>Rata-rata / Pesanan</Text>
          <Text style={styles.kpiValue}>{formatRupiah(r.rata_rata_pesanan)}</Text>
        </View>
      </View>

      {/* Ringkasan status pesanan */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Status Pesanan</Text>
        <View style={styles.statusRow}>
          <View style={styles.statusCol}>
            <Text style={styles.statusNum}>{r.total_pesanan}</Text>
            <Text style={styles.statusLabel}>Total</Text>
          </View>
          <View style={styles.statusCol}>
            <Text style={[styles.statusNum, { color: COLORS.queueOrange }]}>{r.pesanan_aktif}</Text>
            <Text style={styles.statusLabel}>Aktif</Text>
          </View>
          <View style={styles.statusCol}>
            <Text style={[styles.statusNum, { color: COLORS.textSuccess }]}>{r.pesanan_selesai}</Text>
            <Text style={styles.statusLabel}>Selesai</Text>
          </View>
          <View style={styles.statusCol}>
            <Text style={[styles.statusNum, { color: COLORS.danger }]}>{r.pesanan_dibatalkan}</Text>
            <Text style={styles.statusLabel}>Batal</Text>
          </View>
        </View>
      </View>

      {/* Grafik omzet harian */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Omzet Harian</Text>
          {onChangeHari && (
            <View style={styles.periodeRow}>
              {PERIODE.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodeChip, hari === p && styles.periodeChipActive]}
                  onPress={() => onChangeHari(p)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.periodeText, hari === p && styles.periodeTextActive]}>{p} hr</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
        <Text style={styles.sectionSub}>
          Total {data.periode_hari} hari: {formatRupiah(totalPeriode)}
        </Text>

        <View style={styles.chartArea}>
          {harian.map((h) => {
            const tinggi = h.omzet > 0 ? Math.max((h.omzet / maxOmzet) * 100, 4) : 2;
            const lbl = labelTanggal(h.tanggal);
            return (
              <View key={h.tanggal} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { height: `${tinggi}%`, backgroundColor: h.omzet > 0 ? COLORS.primary : COLORS.inactiveElement },
                    ]}
                  />
                </View>
                {rapat ? null : <Text style={styles.barLabel}>{lbl.hari}</Text>}
                {rapat ? null : <Text style={styles.barLabelSmall}>{lbl.tgl.slice(0, 2)}</Text>}
              </View>
            );
          })}
        </View>
        {rapat && (
          <View style={styles.chartAxisRow}>
            <Text style={styles.barLabelSmall}>{labelTanggal(harian[0].tanggal).tgl}</Text>
            <Text style={styles.barLabelSmall}>{labelTanggal(harian[harian.length - 1].tanggal).tgl}</Text>
          </View>
        )}
        {totalPeriode === 0 && <Text style={styles.emptyInline}>Belum ada pemasukan pada periode ini.</Text>}
      </View>

      {/* Metode pembayaran */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Pemasukan per Metode Bayar</Text>
        {(data.per_metode || []).length === 0 ? (
          <Text style={styles.emptyInline}>Belum ada data.</Text>
        ) : (
          data.per_metode.map((m) => (
            <View key={m.metode_pembayaran} style={styles.metodeRow}>
              <View style={styles.metodeTop}>
                <Text style={styles.metodeName}>{m.metode_pembayaran}</Text>
                <Text style={styles.metodeVal}>
                  {formatRupiah(m.omzet)} · {m.jumlah}x
                </Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${Math.max((m.omzet / totalMetode) * 100, 3)}%` }]} />
              </View>
            </View>
          ))
        )}
      </View>

      {/* Menu terlaris */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Menu Terlaris</Text>
        {(data.menu_terlaris || []).length === 0 ? (
          <Text style={styles.emptyInline}>Belum ada menu terjual.</Text>
        ) : (
          data.menu_terlaris.map((mn, i) => (
            <View key={mn.nama_menu} style={styles.listRow}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{i + 1}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle} numberOfLines={1}>{mn.nama_menu}</Text>
                <Text style={styles.listSub}>{mn.total_terjual} porsi terjual</Text>
              </View>
              <Text style={styles.listAmount}>{formatRupiah(mn.pendapatan)}</Text>
            </View>
          ))
        )}
      </View>

      {/* Daftar keuangan: transaksi masuk */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Daftar Pemasukan Terbaru</Text>
        {(data.transaksi_terbaru || []).length === 0 ? (
          <Text style={styles.emptyInline}>Belum ada transaksi berbayar.</Text>
        ) : (
          data.transaksi_terbaru.map((t) => (
            <View key={t.id} style={styles.listRow}>
              <View style={[styles.rankBadge, { backgroundColor: COLORS.badgeSuccess }]}>
                <Ionicons name="arrow-down" size={14} color={COLORS.textSuccessDark} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle} numberOfLines={1}>
                  #{t.id} · {t.nama_mahasiswa}
                </Text>
                <Text style={styles.listSub}>
                  {t.metode_pembayaran} · {formatWaktu(t.waktu_transaksi)}
                </Text>
              </View>
              <Text style={[styles.listAmount, { color: COLORS.textSuccess }]}>+ {formatRupiah(t.total_harga)}</Text>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: 10 },
  mutedText: { fontSize: 13, color: COLORS.textSecondary },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
  kpiCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.soft,
  },
  kpiWide: { flexBasis: '100%' },
  kpiLabel: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600', marginBottom: 4 },
  kpiValue: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  kpiHint: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  sectionCard: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: 12,
    ...SHADOWS.soft,
  },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 8 },
  sectionSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: -4, marginBottom: 12 },
  statusRow: { flexDirection: 'row' },
  statusCol: { flex: 1, alignItems: 'center' },
  statusNum: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  statusLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  periodeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  periodeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.badgeBackground,
  },
  periodeChipActive: { backgroundColor: COLORS.primaryDark },
  periodeText: { fontSize: 11, fontWeight: '700', color: COLORS.textBody },
  periodeTextActive: { color: COLORS.cardBackground },
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', height: 130, gap: 3 },
  barCol: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  barTrack: { width: '100%', flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  barFill: { width: '78%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barLabel: { fontSize: 10, color: COLORS.textBody, fontWeight: '700', marginTop: 4 },
  barLabelSmall: { fontSize: 9, color: COLORS.textSecondary },
  chartAxisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  emptyInline: { fontSize: 12, color: COLORS.textSecondary, marginTop: 8 },
  metodeRow: { marginBottom: 10 },
  metodeTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  metodeName: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  metodeVal: { fontSize: 12, color: COLORS.textBody },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: COLORS.inactiveTab, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: COLORS.orange, borderRadius: 4 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.inactiveElement,
  },
  rankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.statusWaitingBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { fontSize: 12, fontWeight: '800', color: COLORS.brownDark },
  listTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textPrimary },
  listSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  listAmount: { fontSize: 13, fontWeight: '800', color: COLORS.primaryDark },
});
