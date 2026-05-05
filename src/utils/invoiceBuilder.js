/**
 * invoiceBuilder.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility to assemble a structured invoice object from your app's order data
 * and feed it to buildGSTInvoice() in BluetoothPrinter.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Compute per-item GST and totals, then return a print-ready invoice object.
 *
 * @param {object} opts
 * @param {string} opts.invoiceNo
 * @param {object} opts.seller   - Your store config (from AsyncStorage / constants)
 * @param {object} opts.buyer    - Selected customer
 * @param {Array}  opts.items    - Raw cart items: { name, qty, unit, rate, gstPct }
 * @param {string} opts.paymentMode
 * @param {boolean} opts.openDrawer
 * @returns {object}  Invoice ready for buildGSTInvoice()
 */
export function prepareInvoice({ invoiceNo, seller, buyer, items, paymentMode, openDrawer }) {
  const today = new Date();
  const date  = `${String(today.getDate()).padStart(2,'0')}/${String(today.getMonth()+1).padStart(2,'0')}/${today.getFullYear()}`;

  let subtotal  = 0;
  let totalGST  = 0;

  const enrichedItems = items.map((item) => {
    const baseAmount = item.qty * item.rate;
    const gstAmt     = item.gstPct ? (baseAmount * item.gstPct) / 100 : 0;
    const totalAmt   = baseAmount + gstAmt;

    subtotal += baseAmount;
    totalGST += gstAmt;

    return {
      ...item,
      amount: totalAmt,   // printed in the Amount column
    };
  });

  return {
    invoiceNo,
    date,
    seller,
    buyer,
    items      : enrichedItems,
    subtotal,
    totalGST,
    grandTotal : subtotal + totalGST,
    paymentMode,
    openDrawer : openDrawer ?? false,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  SAMPLE DATA — wire this to your real store / customer / cart data
// ─────────────────────────────────────────────────────────────────────────────
export const SAMPLE_SELLER = {
  name   : 'Patidar Wholesale Traders',
  gstin  : '24AABCP1234F1ZX',
  address: 'Shop 12, Gandhi Market, Ahmedabad - 380001',
  phone  : '+91 98765 43210',
};

export const SAMPLE_BUYER = {
  name   : 'Ramesh Provisions Store',
  gstin  : '24BCDEF5678G1ZY',
  address: 'Main Bazar, Anand - 388001',
};

export const SAMPLE_ITEMS = [
  { name: 'Tata Salt (1 kg)',       qty: 10, unit: ' Pcs', rate: 22.00,  gstPct: 5  },
  { name: 'Fortune Sunflower Oil',  qty:  5, unit: ' Ltr', rate: 140.00, gstPct: 5  },
  { name: 'Aashirvaad Atta (5 kg)', qty:  4, unit: ' Bag', rate: 210.00, gstPct: 0  },
  { name: 'Surf Excel Detergent',   qty:  6, unit: ' Pcs', rate: 85.00,  gstPct: 18 },
  { name: 'Maggi Noodles (12 pk)',  qty:  3, unit: ' Box', rate: 192.00, gstPct: 18 },
];
