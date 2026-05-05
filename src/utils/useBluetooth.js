/**
 * useBluetooth.js
 * ─────────────────────────────────────────────────────────────────────────────
 * React hook that encapsulates the full Bluetooth printer lifecycle:
 *   • Permission requests on mount
 *   • Device list fetching
 *   • Connection / disconnection with a persistent open socket
 *   • Print job dispatch with retry + error handling
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  requestBluetoothPermissions,
  getPairedDevices,
  connectToPrinter,
  disconnectPrinter,
  getPrinterState,
  printRaw,
  buildGSTInvoice,
} from '../utils/BluetoothPrinter';
import { prepareInvoice } from '../utils/invoiceBuilder';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SAVED_PRINTER_KEY = '@bt_printer_mac';

export function useBluetooth() {
  const [devices,      setDevices]      = useState([]);
  const [connected,    setConnected]    = useState(false);
  const [activePrinter,setActivePrinter]= useState(null);  // { name, address }
  const [isLoading,    setIsLoading]    = useState(false);
  const [printStatus,  setPrintStatus]  = useState(null);  // null | 'printing' | 'done' | 'error'

  // Keep a ref to the latest connection state for use inside callbacks
  const connectionRef = useRef({ connected: false, printer: null });
  connectionRef.current = { connected, printer: activePrinter };

  // ── On mount: request permissions + auto-reconnect to last used printer ──
  useEffect(() => {
    let mounted = true;

    (async () => {
      await requestBluetoothPermissions();
      const savedMac = await AsyncStorage.getItem(SAVED_PRINTER_KEY);
      if (savedMac && mounted) {
        const pairedList = await getPairedDevices();
        const device = pairedList.find((d) => d.address === savedMac);
        if (device) {
          await handleConnect(device.address, device.name);
        }
      }
    })();

    return () => {
      mounted = false;
      // Keep socket open — only disconnect on explicit user action or app close
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Refresh device list ──────────────────────────────────────────────────
  const refreshDevices = useCallback(async () => {
    setIsLoading(true);
    try {
      const list = await getPairedDevices();
      setDevices(list);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Connect ──────────────────────────────────────────────────────────────
  const handleConnect = useCallback(async (macAddress, deviceName) => {
    setIsLoading(true);
    try {
      const ok = await connectToPrinter(macAddress, deviceName);
      if (ok) {
        setConnected(true);
        setActivePrinter({ name: deviceName, address: macAddress });
        await AsyncStorage.setItem(SAVED_PRINTER_KEY, macAddress);
      }
      return ok;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // ── Disconnect ───────────────────────────────────────────────────────────
  const handleDisconnect = useCallback(async () => {
    await disconnectPrinter();
    setConnected(false);
    setActivePrinter(null);
    await AsyncStorage.removeItem(SAVED_PRINTER_KEY);
  }, []);

  // ── Print GST Invoice ────────────────────────────────────────────────────
  /**
   * @param {object} rawInvoiceData  - Same shape as prepareInvoice() input
   */
  const printInvoice = useCallback(async (rawInvoiceData) => {
    if (!connectionRef.current.printer) {
      setPrintStatus('error');
      return { success: false, error: 'No printer selected.' };
    }

    setPrintStatus('printing');
    try {
      // Build structured invoice with GST calculations
      const invoice    = prepareInvoice(rawInvoiceData);
      // Generate raw ESC/POS string
      const escPosData = buildGSTInvoice(invoice);
      // Send to printer (with auto-reconnect + retry)
      const result     = await printRaw(
        escPosData,
        connectionRef.current.printer.address,
        connectionRef.current.printer.name
      );

      // Sync React state with actual connection state
      const state = getPrinterState();
      setConnected(state.isConnected);

      setPrintStatus(result.success ? 'done' : 'error');
      return result;
    } catch (err) {
      console.error('[useBluetooth] printInvoice error:', err);
      setPrintStatus('error');
      return { success: false, error: err?.message || String(err) };
    }
  }, []);

  // ── Print arbitrary raw ESC/POS ──────────────────────────────────────────
  const printRawData = useCallback(async (escPosString) => {
    if (!connectionRef.current.printer) {
      return { success: false, error: 'No printer selected.' };
    }
    setPrintStatus('printing');
    const result = await printRaw(
      escPosString,
      connectionRef.current.printer.address,
      connectionRef.current.printer.name
    );
    setPrintStatus(result.success ? 'done' : 'error');
    return result;
  }, []);

  return {
    // State
    devices,
    connected,
    activePrinter,
    isLoading,
    printStatus,
    // Actions
    refreshDevices,
    connectToPrinter : handleConnect,
    disconnectPrinter: handleDisconnect,
    printInvoice,
    printRawData,
  };
}
