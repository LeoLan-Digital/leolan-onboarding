import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Modal,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

const API_URL = 'https://n8n.leolan.net/webhook/admin-customers?key=LeoLan2026Admin!';

type Customer = {
  customerCode: string;
  name: string;
  email: string;
  phone: string;
  paket: string;
  sector: string;
  status: 'active' | 'setup_pending' | 'inactive';
  waStatus: 'connected' | 'pending' | 'none';
  createdAt: string | null;
  active: boolean;
  messagesUsed: number;
  messagesLimit: number;
  addons: string[];
};

function StatusBadge({ status }: { status: Customer['status'] }) {
  const config = {
    active: { label: '✅ Aktiv', bg: '#1a3a2a', color: '#30d158', border: '#30d158' },
    setup_pending: { label: '🆕 Einrichten', bg: '#3a3000', color: '#ffd60a', border: '#ffd60a' },
    inactive: { label: '⚠️ Inaktiv', bg: '#3a1a1a', color: '#ff453a', border: '#ff453a' },
  }[status] ?? { label: status, bg: '#2c2c2e', color: '#8a9bbf', border: '#8a9bbf' };

  return (
    <View style={[styles.badge, { backgroundColor: config.bg, borderColor: config.border }]}>
      <Text style={[styles.badgeText, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function WaBadge({ waStatus }: { waStatus: Customer['waStatus'] }) {
  const config = {
    connected: { label: '🟢 WA Connected', color: '#30d158' },
    pending: { label: '⏳ WA Pending', color: '#ffd60a' },
    none: { label: '⚫ WA nicht eingerichtet', color: '#636366' },
  }[waStatus] ?? { label: waStatus, color: '#8a9bbf' };

  return (
    <Text style={[styles.waBadge, { color: config.color }]}>{config.label}</Text>
  );
}

function SkeletonCard() {
  return (
    <View style={styles.skeletonCard}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonLine} />
      <View style={styles.skeletonLineShort} />
    </View>
  );
}

function CustomerCard({ customer, onPress }: { customer: Customer; onPress: () => void }) {
  const paketLabel = customer.paket === 'pro' ? '⭐ Pro' : customer.paket === 'starter' ? 'Starter' : customer.paket.toUpperCase();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <View style={styles.cardTitleRow}>
          <Text style={styles.customerName} numberOfLines={1}>{customer.name || '—'}</Text>
          <View style={styles.paketBadge}>
            <Text style={styles.paketText}>{paketLabel}</Text>
          </View>
        </View>
        <StatusBadge status={customer.status} />
      </View>
      <WaBadge waStatus={customer.waStatus} />
      <View style={styles.cardMeta}>
        <Text style={styles.metaText}>{customer.customerCode}</Text>
        {customer.email ? <Text style={styles.metaText} numberOfLines={1}> · {customer.email}</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

function DetailModal({ customer, visible, onClose }: { customer: Customer | null; visible: boolean; onClose: () => void }) {
  if (!customer) return null;

  const rows: { label: string; value: string }[] = [
    { label: 'Kunden-ID', value: customer.customerCode },
    { label: 'Sektor', value: customer.sector },
    { label: 'Paket', value: customer.paket },
    { label: 'E-Mail', value: customer.email || '—' },
    { label: 'Telefon', value: customer.phone || '—' },
    { label: 'Status', value: customer.status },
    { label: 'WhatsApp', value: customer.waStatus },
    { label: 'Nachrichten', value: customer.messagesLimit ? `${customer.messagesUsed} / ${customer.messagesLimit}` : '—' },
    { label: 'Addons', value: customer.addons?.join(', ') || '—' },
    { label: 'Erstellt', value: customer.createdAt ? new Date(customer.createdAt).toLocaleDateString('de-DE') : '—' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.modalContainer}>
        <StatusBar barStyle="light-content" />
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle} numberOfLines={1}>{customer.name}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView contentContainerStyle={styles.modalBody}>
          <View style={styles.statusRow}>
            <StatusBadge status={customer.status} />
            <WaBadge waStatus={customer.waStatus} />
          </View>

          <View style={styles.detailSection}>
            {rows.map((r) => (
              <View key={r.label} style={styles.detailRow}>
                <Text style={styles.detailLabel}>{r.label}</Text>
                <Text style={styles.detailValue}>{r.value}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function CustomersScreen() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Customer | null>(null);

  const fetchCustomers = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(API_URL, { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setCustomers(data.customers || []);
    } catch (e: any) {
      setError(e.message || 'Fehler beim Laden');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchCustomers();
    }, [fetchCustomers])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCustomers();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Kunden</Text>
        {!loading && (
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{customers.length}</Text>
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.list}>
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoading(true); fetchCustomers(); }}>
            <Text style={styles.retryText}>Erneut versuchen</Text>
          </TouchableOpacity>
        </View>
      ) : customers.length === 0 ? (
        <View style={styles.centerBox}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>Noch keine Kunden</Text>
        </View>
      ) : (
        <FlatList
          data={customers}
          keyExtractor={(c) => c.customerCode + c.email}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <CustomerCard customer={item} onPress={() => setSelected(item)} />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#5e81f4"
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}

      <DetailModal
        customer={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0d1526' },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  headerTitle: { color: '#ffffff', fontSize: 22, fontWeight: '700', flex: 1 },
  countBadge: {
    backgroundColor: 'rgba(94,129,244,0.18)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countText: { color: '#5e81f4', fontSize: 13, fontWeight: '600' },

  list: { padding: 16 },

  card: {
    backgroundColor: '#17212b',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  cardTitleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, marginRight: 8 },
  customerName: { color: '#ffffff', fontSize: 15, fontWeight: '600', flex: 1 },
  paketBadge: {
    backgroundColor: 'rgba(94,129,244,0.18)',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  paketText: { color: '#5e81f4', fontSize: 11, fontWeight: '600' },

  badge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
  },
  badgeText: { fontSize: 11, fontWeight: '600' },

  waBadge: { fontSize: 12, marginBottom: 6 },

  cardMeta: { flexDirection: 'row', flexWrap: 'wrap' },
  metaText: { color: '#8a9bbf', fontSize: 12 },

  // Skeleton
  skeletonCard: {
    backgroundColor: '#17212b',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  skeletonTitle: { height: 16, backgroundColor: '#253040', borderRadius: 6, width: '60%', marginBottom: 10 },
  skeletonLine: { height: 12, backgroundColor: '#1e2d3d', borderRadius: 4, width: '80%', marginBottom: 8 },
  skeletonLineShort: { height: 12, backgroundColor: '#1e2d3d', borderRadius: 4, width: '45%' },

  // Center states
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorIcon: { fontSize: 40, marginBottom: 12 },
  errorText: { color: '#ff453a', fontSize: 14, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#5e81f4', borderRadius: 10, paddingHorizontal: 20, paddingVertical: 10 },
  retryText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: '#8a9bbf', fontSize: 16 },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#0d1526' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  closeBtn: {
    width: 36, height: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    justifyContent: 'center', alignItems: 'center',
  },
  closeBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  modalTitle: { flex: 1, color: '#ffffff', fontSize: 17, fontWeight: '700', textAlign: 'center' },
  modalBody: { padding: 20 },
  statusRow: { flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 20 },
  detailSection: {
    backgroundColor: '#17212b',
    borderRadius: 14,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)',
  },
  detailLabel: { color: '#8a9bbf', fontSize: 14 },
  detailValue: { color: '#ffffff', fontSize: 14, fontWeight: '500', maxWidth: '60%', textAlign: 'right' },
});
