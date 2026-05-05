/**
 * PrinterSetupScreen.js
 * ─────────────────────────────────────────────────────────────────────────────
 * UI screen for pairing and testing the Bluetooth thermal printer.
 * Also demonstrates a full test-print with a sample GST invoice.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, StatusBar,
  SafeAreaView, Alert,
} from 'react-native';
import { useBluetooth } from '../utils/useBluetooth';
import { SAMPLE_SELLER, SAMPLE_BUYER, SAMPLE_ITEMS } from '../utils/invoiceBuilder';

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg       : '#0F1117',
  surface  : '#1A1D27',
  card     : '#222536',
  border   : '#2E3149',
  accent   : '#5B8AF0',
  success  : '#34C78A',
  error    : '#F05B5B',
  warn     : '#F0A85B',
  text     : '#E8EAF2',
  muted    : '#7A7F9A',
};

// ─────────────────────────────────────────────────────────────────────────────

export default function PrinterSetupScreen() {
  const {
    devices, connected, activePrinter, isLoading, printStatus,
    refreshDevices, connectToPrinter, disconnectPrinter, printInvoice,
  } = useBluetooth();

  const [invoiceCounter, setInvoiceCounter] = useState(1001);

  useEffect(() => {
    refreshDevices();
  }, []);

  // ── Test print ──────────────────────────────────────────────────────────
  const handleTestPrint = async () => {
    const result = await printInvoice({
      invoiceNo  : `INV-${invoiceCounter}`,
      seller     : SAMPLE_SELLER,
      buyer      : SAMPLE_BUYER,
      items      : SAMPLE_ITEMS,
      paymentMode: 'Cash',
      openDrawer : true,
    });

    if (result.success) {
      setInvoiceCounter((n) => n + 1);
      Alert.alert('✓ Printed', `Invoice INV-${invoiceCounter} sent successfully.`);
    }
  };

  // ── Device row ───────────────────────────────────────────────────────────
  const renderDevice = ({ item }) => {
    const isActive = activePrinter?.address === item.address;
    return (
      <TouchableOpacity
        style={[styles.deviceRow, isActive && styles.deviceRowActive]}
        onPress={() => connectToPrinter(item.address, item.name)}
        disabled={isLoading}
      >
        <View style={styles.deviceIcon}>
          <Text style={{ fontSize: 20 }}>🖨️</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.deviceName}>{item.name || 'Unknown Device'}</Text>
          <Text style={styles.deviceMac}>{item.address}</Text>
        </View>
        {isActive && connected ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>CONNECTED</Text>
          </View>
        ) : (
          <Text style={[styles.badgeText, { color: C.accent }]}>Tap to connect</Text>
        )}
      </TouchableOpacity>
    );
  };

  // ── Status pill ───────────────────────────────────────────────────────────
  const statusColor = {
    printing: C.warn,
    done    : C.success,
    error   : C.error,
  }[printStatus] ?? C.muted;

  const statusLabel = {
    printing: '⏳ Printing…',
    done    : '✓ Print Success',
    error   : '✗ Print Failed',
  }[printStatus] ?? '';

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Printer Setup</Text>
        <Text style={styles.headerSub}>80mm ESC/POS · Bluetooth SPP</Text>
      </View>

      {/* ── Connection Card ─────────────────────────────────────────────── */}
      <View style={styles.card}>
        <View style={styles.connRow}>
          <View style={[styles.dot, { backgroundColor: connected ? C.success : C.error }]} />
          <Text style={styles.connLabel}>
            {connected
              ? `Connected: ${activePrinter?.name ?? '—'}`
              : 'Not Connected'}
          </Text>
          {connected && (
            <TouchableOpacity onPress={disconnectPrinter}>
              <Text style={[styles.linkBtn, { color: C.error }]}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </View>
        {printStatus ? (
          <Text style={[styles.statusPill, { color: statusColor }]}>{statusLabel}</Text>
        ) : null}
      </View>

      {/* ── Device List ──────────────────────────────────────────────────── */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Paired Devices</Text>
          <TouchableOpacity onPress={refreshDevices} disabled={isLoading}>
            <Text style={styles.linkBtn}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator color={C.accent} style={{ marginTop: 24 }} />
        ) : devices.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>📡</Text>
            <Text style={styles.emptyText}>No paired Bluetooth devices found.</Text>
            <Text style={styles.emptyHint}>
              Pair your POS-80C printer in Android Settings → Bluetooth first.
            </Text>
          </View>
        ) : (
          <FlatList
            data={devices}
            keyExtractor={(item) => item.address}
            renderItem={renderDevice}
            contentContainerStyle={{ paddingBottom: 12 }}
          />
        )}
      </View>

      {/* ── Test Print Button ────────────────────────────────────────────── */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.printBtn, !connected && styles.printBtnDisabled]}
          onPress={handleTestPrint}
          disabled={!connected || printStatus === 'printing'}
        >
          {printStatus === 'printing' ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.printBtnText}>🖨  Print Test GST Invoice</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe        : { flex: 1, backgroundColor: C.bg },

  header      : { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerTitle : { fontSize: 24, fontWeight: '700', color: C.text },
  headerSub   : { fontSize: 13, color: C.muted, marginTop: 2 },

  card        : { marginHorizontal: 16, backgroundColor: C.surface, borderRadius: 14,
                  padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  connRow     : { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot         : { width: 10, height: 10, borderRadius: 5 },
  connLabel   : { flex: 1, fontSize: 14, color: C.text },
  linkBtn     : { fontSize: 13, color: C.accent, fontWeight: '600' },
  statusPill  : { marginTop: 8, fontSize: 13, fontWeight: '600' },

  section     : { flex: 1, marginHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between',
                   alignItems: 'center', marginBottom: 10 },
  sectionTitle : { fontSize: 15, fontWeight: '700', color: C.text },

  deviceRow   : { flexDirection: 'row', alignItems: 'center', gap: 12,
                  backgroundColor: C.card, borderRadius: 12, padding: 14,
                  marginBottom: 8, borderWidth: 1, borderColor: C.border },
  deviceRowActive: { borderColor: C.accent },
  deviceIcon  : { width: 40, height: 40, borderRadius: 10,
                  backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' },
  deviceName  : { fontSize: 14, fontWeight: '600', color: C.text },
  deviceMac   : { fontSize: 11, color: C.muted, marginTop: 2 },
  badge       : { backgroundColor: C.success + '22', paddingHorizontal: 8,
                  paddingVertical: 4, borderRadius: 6 },
  badgeText   : { fontSize: 10, fontWeight: '700', color: C.success },

  emptyState  : { alignItems: 'center', paddingTop: 40 },
  emptyEmoji  : { fontSize: 40 },
  emptyText   : { fontSize: 15, color: C.muted, marginTop: 12, textAlign: 'center' },
  emptyHint   : { fontSize: 12, color: C.muted + '99', marginTop: 6, textAlign: 'center',
                  paddingHorizontal: 20 },

  footer      : { padding: 16 },
  printBtn    : { backgroundColor: C.accent, borderRadius: 14, padding: 16,
                  alignItems: 'center' },
  printBtnDisabled: { backgroundColor: C.muted + '55' },
  printBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
