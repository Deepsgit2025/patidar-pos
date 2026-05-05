/**
 * BluetoothPrinter.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Direct ESC/POS thermal printing over Bluetooth SPP (Serial Port Profile).
 * Zero-latency: keeps the BT socket OPEN between jobs — no 3-second handshake.
 *
 * Library: react-native-bluetooth-escpos-printer
 * Targets : Android 12+ (API 31+) / Xiaomi HyperOS + POS-80C 80 mm printer
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Platform, PermissionsAndroid, Alert } from 'react-native';
import BluetoothEscposPrinter from 'react-native-bluetooth-escpos-printer';

// ─── Singleton connection state ───────────────────────────────────────────────
const PrinterState = {
  isConnected: false,
  connectedDevice: null,   // { name, address }
  isConnecting: false,
};

// ─── ESC/POS Constants ────────────────────────────────────────────────────────
export const ESC = '\x1B';
export const GS  = '\x1D';
export const FS  = '\x1C';

export const ESCPOS = {
  // Initialise / Reset
  INIT            : `${ESC}@`,

  // Alignment
  ALIGN_LEFT      : `${ESC}a\x00`,
  ALIGN_CENTER    : `${ESC}a\x01`,
  ALIGN_RIGHT     : `${ESC}a\x02`,

  // Bold
  BOLD_ON         : `${ESC}E\x01`,
  BOLD_OFF        : `${ESC}E\x00`,

  // Underline
  UNDERLINE_ON    : `${ESC}-\x01`,
  UNDERLINE_OFF   : `${ESC}-\x00`,

  // Font size — normal / double-width / double-height / double-size
  FONT_NORMAL     : `${GS}!\x00`,
  FONT_DOUBLE_W   : `${GS}!\x20`,
  FONT_DOUBLE_H   : `${GS}!\x10`,
  FONT_DOUBLE     : `${GS}!\x30`,   // 2× width + 2× height

  // Line feed / carriage return
  LF              : '\n',
  CR              : '\r',

  // Paper cut
  CUT_FULL        : `${GS}V\x00`,           // Full cut
  CUT_PARTIAL     : `${GS}V\x01`,           // Partial cut (leaves 1 point)
  CUT_FEED_FULL   : `${GS}V\x42\x0A`,      // Feed 10 lines then full cut

  // Cash drawer — kick pin 2 (most common wiring)
  CASH_DRAWER     : `${ESC}p\x00\x19\xFA`, // Pin 2, 25 ms ON, 250 ms OFF

  // Character sets
  CHARSET_PC437   : `${ESC}t\x00`,
  CHARSET_PC858   : `${ESC}t\x13`,

  // Line spacing
  LINE_SPACING_DEFAULT : `${ESC}2`,
  LINE_SPACING_SET     : (n) => `${ESC}3${String.fromCharCode(n)}`,
};

// Printer column width for 80 mm paper at 42 chars/line (font A)
export const COLS = 42;

// ─────────────────────────────────────────────────────────────────────────────
//  PERMISSION MANAGEMENT  (Android 12+ / API 31+)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Requests all Bluetooth + location permissions required on Android 12+.
 * On Android < 12 it falls back to the legacy ACCESS_FINE_LOCATION grant.
 *
 * @returns {Promise<boolean>} true if all required permissions were granted
 */
export async function requestBluetoothPermissions() {
  if (Platform.OS !== 'android') return true;

  const apiLevel = Platform.Version; // integer, e.g. 33

  try {
    if (apiLevel >= 31) {
      // Android 12+ — Nearby Devices permissions
      const grants = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
        // Fine location still needed for BT scan on some OEMs (incl. Xiaomi HyperOS)
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);

      const allGranted = Object.values(grants).every(
        (status) => status === PermissionsAndroid.RESULTS.GRANTED
      );

      if (!allGranted) {
        const denied = Object.entries(grants)
          .filter(([, v]) => v !== PermissionsAndroid.RESULTS.GRANTED)
          .map(([k]) => k)
          .join(', ');
        console.warn('[BTPrinter] Permissions denied:', denied);

        Alert.alert(
          'Bluetooth Permission Required',
          'Please grant Nearby Devices and Location permissions in Settings to use the printer.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } else {
      // Android < 12
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        {
          title: 'Location Permission',
          message: 'Bluetooth scanning requires location access on this Android version.',
          buttonPositive: 'Grant',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    }
  } catch (err) {
    console.error('[BTPrinter] Permission request error:', err);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  CONNECTION MANAGEMENT
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the list of already-paired Bluetooth devices.
 * The user must have paired the printer via Android Settings first.
 *
 * @returns {Promise<Array<{name: string, address: string}>>}
 */
export async function getPairedDevices() {
  const hasPermission = await requestBluetoothPermissions();
  if (!hasPermission) return [];

  try {
    const devices = await BluetoothEscposPrinter.getDeviceList();
    console.log('[BTPrinter] Paired devices:', devices);
    return devices || [];
  } catch (err) {
    console.error('[BTPrinter] getDeviceList error:', err);
    return [];
  }
}

/**
 * Connects to a paired printer and keeps the socket open.
 * Calling this while already connected to the same device is a no-op.
 *
 * @param {string} macAddress  - Bluetooth MAC address  e.g. "DC:0D:30:XX:XX:XX"
 * @param {string} [deviceName] - Human-readable name for logging
 * @returns {Promise<boolean>} true on success
 */
export async function connectToPrinter(macAddress, deviceName = 'Printer') {
  if (PrinterState.isConnecting) {
    console.warn('[BTPrinter] Connection already in progress.');
    return false;
  }

  // Already connected to the same device — reuse the open socket
  if (PrinterState.isConnected && PrinterState.connectedDevice?.address === macAddress) {
    console.log('[BTPrinter] Reusing existing connection to', deviceName);
    return true;
  }

  // If connected to a *different* device, disconnect first
  if (PrinterState.isConnected) {
    await disconnectPrinter();
  }

  const hasPermission = await requestBluetoothPermissions();
  if (!hasPermission) return false;

  PrinterState.isConnecting = true;
  try {
    console.log(`[BTPrinter] Connecting to ${deviceName} (${macAddress})…`);
    await BluetoothEscposPrinter.connect(macAddress);

    PrinterState.isConnected = true;
    PrinterState.connectedDevice = { name: deviceName, address: macAddress };
    PrinterState.isConnecting = false;

    console.log(`[BTPrinter] ✓ Connected to ${deviceName}`);
    return true;
  } catch (err) {
    PrinterState.isConnected = false;
    PrinterState.connectedDevice = null;
    PrinterState.isConnecting = false;
    console.error('[BTPrinter] Connection failed:', err);
    return false;
  }
}

/**
 * Disconnects and clears the printer state.
 */
export async function disconnectPrinter() {
  try {
    await BluetoothEscposPrinter.disconnect();
  } catch (_) {
    // Ignore — socket may already be closed
  } finally {
    PrinterState.isConnected = false;
    PrinterState.connectedDevice = null;
    PrinterState.isConnecting = false;
    console.log('[BTPrinter] Disconnected.');
  }
}

/**
 * Returns the current connection status snapshot.
 */
export function getPrinterState() {
  return { ...PrinterState };
}

// ─────────────────────────────────────────────────────────────────────────────
//  RAW ESC/POS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pads / truncates a string to exactly `width` characters.
 */
function padEnd(str, width) {
  const s = String(str ?? '');
  if (s.length >= width) return s.slice(0, width);
  return s + ' '.repeat(width - s.length);
}

/**
 * Right-aligns a string within `width` characters.
 */
function padStart(str, width) {
  const s = String(str ?? '');
  if (s.length >= width) return s.slice(0, width);
  return ' '.repeat(width - s.length) + s;
}

/**
 * Centers a string within `width` characters.
 */
function center(str, width) {
  const s = String(str ?? '');
  if (s.length >= width) return s.slice(0, width);
  const total = width - s.length;
  const left  = Math.floor(total / 2);
  const right = total - left;
  return ' '.repeat(left) + s + ' '.repeat(right);
}

/**
 * Divider line of `char` repeated `width` times.
 */
function divider(char = '-', width = COLS) {
  return char.repeat(width);
}

/**
 * Formats a 4-column table row.
 * Widths must sum to ≤ COLS.
 *
 * @param {string} col1 - Item name
 * @param {string} col2 - Qty
 * @param {string} col3 - Rate
 * @param {string} col4 - Amount
 * @param {number[]} widths - [w1, w2, w3, w4] defaults to [20, 5, 8, 9]
 */
function tableRow(col1, col2, col3, col4, widths = [20, 5, 8, 9]) {
  const [w1, w2, w3, w4] = widths;
  return (
    padEnd(col1, w1) +
    padEnd(col2, w2) +
    padStart(col3, w3) +
    padStart(col4, w4)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  GST WHOLESALE INVOICE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds a complete raw ESC/POS byte-string for a wholesale GST invoice.
 *
 * @param {object} invoice
 * @param {string} invoice.invoiceNo
 * @param {string} invoice.date           - "DD/MM/YYYY"
 * @param {object} invoice.seller         - { name, gstin, address, phone }
 * @param {object} invoice.buyer          - { name, gstin, address }
 * @param {Array}  invoice.items          - [{ name, qty, unit, rate, gstPct, amount }]
 * @param {number} invoice.subtotal
 * @param {number} invoice.totalGST
 * @param {number} invoice.grandTotal
 * @param {string} [invoice.paymentMode]  - "Cash" | "UPI" | "Credit"
 * @param {boolean} [invoice.openDrawer]  - Fire cash-drawer pulse (default false)
 *
 * @returns {string}  Raw ESC/POS command string ready to send to the printer
 */
export function buildGSTInvoice(invoice) {
  const {
    invoiceNo,
    date,
    seller,
    buyer,
    items,
    subtotal,
    totalGST,
    grandTotal,
    paymentMode = 'Cash',
    openDrawer  = false,
  } = invoice;

  const lines = [];

  const add = (...parts) => lines.push(...parts);

  // ── Init ──────────────────────────────────────────────────────────────────
  add(ESCPOS.INIT);
  add(ESCPOS.CHARSET_PC437);

  // ── Store Header ──────────────────────────────────────────────────────────
  add(ESCPOS.ALIGN_CENTER);
  add(ESCPOS.BOLD_ON);
  add(ESCPOS.FONT_DOUBLE);
  add(seller.name + ESCPOS.LF);
  add(ESCPOS.FONT_NORMAL);
  add(ESCPOS.BOLD_OFF);
  add(`GSTIN: ${seller.gstin}` + ESCPOS.LF);
  add(seller.address + ESCPOS.LF);
  add(`Ph: ${seller.phone}` + ESCPOS.LF);

  add(ESCPOS.ALIGN_LEFT);
  add(divider('=') + ESCPOS.LF);

  // ── Invoice Meta ──────────────────────────────────────────────────────────
  add(ESCPOS.BOLD_ON);
  add('TAX INVOICE' + ESCPOS.LF);
  add(ESCPOS.BOLD_OFF);

  // Invoice No (left) | Date (right) on one line
  add(padEnd(`Bill No: ${invoiceNo}`, COLS - 16) + padStart(`Date: ${date}`, 16) + ESCPOS.LF);

  add(divider('-') + ESCPOS.LF);

  // ── Buyer Info ────────────────────────────────────────────────────────────
  add(`To: ${ESCPOS.BOLD_ON}${buyer.name}${ESCPOS.BOLD_OFF}` + ESCPOS.LF);
  if (buyer.gstin) add(`GSTIN: ${buyer.gstin}` + ESCPOS.LF);
  if (buyer.address) add(buyer.address + ESCPOS.LF);

  add(divider('=') + ESCPOS.LF);

  // ── Column Headers ────────────────────────────────────────────────────────
  add(ESCPOS.BOLD_ON);
  add(tableRow('ITEM', 'QTY', 'RATE', 'AMOUNT') + ESCPOS.LF);
  add(ESCPOS.BOLD_OFF);
  add(divider('-') + ESCPOS.LF);

  // ── Line Items ────────────────────────────────────────────────────────────
  items.forEach((item) => {
    // Item name (may wrap — keep it on its own line if long)
    const nameLine = item.name.length <= 20
      ? tableRow(item.name, `${item.qty}${item.unit}`, item.rate.toFixed(2), item.amount.toFixed(2))
      : item.name.slice(0, COLS);            // Long names: full-width, details below

    add(nameLine + ESCPOS.LF);

    // If name was truncated, print detail row indented
    if (item.name.length > 20) {
      add(tableRow('', `${item.qty}${item.unit}`, item.rate.toFixed(2), item.amount.toFixed(2)) + ESCPOS.LF);
    }

    // GST detail line (smaller / no bold)
    if (item.gstPct) {
      const gstAmt = ((item.amount * item.gstPct) / (100 + item.gstPct)).toFixed(2);
      add(`  GST@${item.gstPct}%: ${gstAmt}` + ESCPOS.LF);
    }
  });

  add(divider('-') + ESCPOS.LF);

  // ── Totals ────────────────────────────────────────────────────────────────
  const totW1 = COLS - 10;
  add(padEnd('Subtotal:', totW1)        + padStart(`${subtotal.toFixed(2)}`, 10) + ESCPOS.LF);
  add(padEnd('Total GST:', totW1)       + padStart(`${totalGST.toFixed(2)}`, 10) + ESCPOS.LF);
  add(divider('=') + ESCPOS.LF);

  add(ESCPOS.BOLD_ON);
  add(padEnd('GRAND TOTAL:', totW1)     + padStart(`Rs.${grandTotal.toFixed(2)}`, 10) + ESCPOS.LF);
  add(ESCPOS.BOLD_OFF);

  add(divider('-') + ESCPOS.LF);

  // ── Payment Mode ──────────────────────────────────────────────────────────
  add(`Payment: ${ESCPOS.BOLD_ON}${paymentMode}${ESCPOS.BOLD_OFF}` + ESCPOS.LF);
  add(ESCPOS.LF);

  // ── Footer ────────────────────────────────────────────────────────────────
  add(ESCPOS.ALIGN_CENTER);
  add('** Thank You — Visit Again **' + ESCPOS.LF);
  add('Goods once sold will not be returned.' + ESCPOS.LF);
  add(ESCPOS.LF + ESCPOS.LF + ESCPOS.LF); // feed before cut

  // ── Paper Cut ─────────────────────────────────────────────────────────────
  add(ESCPOS.CUT_FEED_FULL);

  // ── Cash Drawer ───────────────────────────────────────────────────────────
  if (openDrawer) {
    add(ESCPOS.CASH_DRAWER);
  }

  return lines.join('');
}

// ─────────────────────────────────────────────────────────────────────────────
//  PRINT DISPATCHER  (keeps socket alive between calls)
// ─────────────────────────────────────────────────────────────────────────────

const CHUNK_SIZE     = 512;   // bytes — prevents BT buffer overflow on cheap printers
const CHUNK_DELAY_MS = 30;    // ms between chunks
const RETRY_LIMIT    = 2;

/**
 * Splits a raw ESC/POS string into `CHUNK_SIZE`-byte segments and sends each
 * one with a short delay to avoid overflowing the printer's 4 KB BT buffer.
 */
async function sendChunked(rawStr) {
  for (let offset = 0; offset < rawStr.length; offset += CHUNK_SIZE) {
    const chunk = rawStr.slice(offset, offset + CHUNK_SIZE);
    await BluetoothEscposPrinter.printerWriteText(chunk);
    await new Promise((r) => setTimeout(r, CHUNK_DELAY_MS));
  }
}

/**
 * Prints a raw ESC/POS string.
 * - Auto-reconnects if socket was dropped (e.g. printer restarted).
 * - Retries once on transient failure.
 * - Leaves the BT socket OPEN for the next job.
 *
 * @param {string} rawEscPos   - Output of buildGSTInvoice() or any ESC/POS builder
 * @param {string} macAddress  - Target printer MAC
 * @param {string} [deviceName]
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function printRaw(rawEscPos, macAddress, deviceName = 'Printer') {
  let attempt = 0;

  while (attempt <= RETRY_LIMIT) {
    attempt++;

    // Ensure socket is open
    if (!PrinterState.isConnected) {
      console.log(`[BTPrinter] Not connected — reconnecting (attempt ${attempt})…`);
      const ok = await connectToPrinter(macAddress, deviceName);
      if (!ok) {
        return {
          success: false,
          error : 'Could not connect to printer. Check that it is powered on and paired.',
        };
      }
    }

    try {
      await sendChunked(rawEscPos);
      console.log('[BTPrinter] ✓ Print job sent successfully.');
      return { success: true };
    } catch (err) {
      console.error(`[BTPrinter] Print error (attempt ${attempt}):`, err);

      // Mark as disconnected so the next attempt reconnects
      PrinterState.isConnected = false;
      PrinterState.connectedDevice = null;

      if (attempt > RETRY_LIMIT) {
        const msg = classifyError(err);
        Alert.alert('Print Failed', msg);
        return { success: false, error: msg };
      }

      // Brief wait before retry
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  return { success: false, error: 'Unknown print error.' };
}

/**
 * Maps raw BT/printer errors to user-friendly messages.
 */
function classifyError(err) {
  const msg = (err?.message || String(err)).toLowerCase();

  if (msg.includes('socket') || msg.includes('broken pipe') || msg.includes('econnreset')) {
    return 'Printer connection lost. Ensure the printer is on and within range.';
  }
  if (msg.includes('buffer') || msg.includes('overflow')) {
    return 'Printer buffer full. Wait a moment and try again.';
  }
  if (msg.includes('permission')) {
    return 'Bluetooth permission denied. Please allow Nearby Devices access in Settings.';
  }
  if (msg.includes('timeout')) {
    return 'Connection timed out. Move the tablet closer to the printer.';
  }
  return `Printer error: ${err?.message || err}`;
}
