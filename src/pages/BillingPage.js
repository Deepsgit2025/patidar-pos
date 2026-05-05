import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions, Platform } from 'react-native';
import { COLORS } from '../constants/theme';
import { MENU, ITEM_MAP, CAT_MAP, SC_PRICE } from '../constants/menu';
import { calcAmt, scKey, baseId, fmtDate, fmtTime } from '../utils/helpers';
import { loadAsync, saveAsync } from '../utils/storage';
import ItemCard from '../components/ItemCard';
import * as Print from 'expo-print';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

// Items that should print on individual small slips
const SLIP_ITEMS = ['kachori', 'samosa', 'poha', 'jalebi', 'imarti', 'lassi', 'chai', 'aalovada'];

const DEFAULT_SHOP = "default";

const BillingPage = forwardRef(({ isLight }, ref) => {
  const styles = getStyles(isLight);
  const [cart, setCart] = useState({});
  const [payMode, setPayMode] = useState("Cash");
  const [orderNum, setOrderNum] = useState(1);
  const [orders, setOrders] = useState([]);
  const [billExpanded, setBillExpanded] = useState(false);
  const scrollViewRef = useRef(null);
  const layoutRefs = useRef({});

  useImperativeHandle(ref, () => ({
    addCustomItem: (item) => {
      const customKey = `custom_${Date.now()}`;
      setCart(prev => ({
        ...prev,
        [customKey]: {
          qty: item.qty,
          rate: item.rate,
          name: item.name,
          isCustom: true
        }
      }));
    }
  }));

  useEffect(() => {
    const fetchInitData = async () => {
      const savedOrders = await loadAsync("orders_" + DEFAULT_SHOP, []);
      const savedOrderNum = await loadAsync("orderNum_" + DEFAULT_SHOP, 1);
      setOrders(savedOrders);
      setOrderNum(savedOrderNum);
      setCart({});
    };
    fetchInitData();
  }, []);

  const scrollTo = (id) => {
    const y = layoutRefs.current[id];
    if (y !== undefined && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y, animated: true });
    }
  };

  const addPlain = (itemId) => {
    setCart(prev => {
      const item = ITEM_MAP[itemId];
      const ex = prev[itemId];
      if (item.byWeight) return { ...prev, [itemId]: ex ?? { grams: 0 } };
      return { ...prev, [itemId]: ex ? { ...ex, qty: ex.qty + 1 } : { qty: 1, isSC: false } };
    });
  };

  const addSC = (itemId) => {
    const k = scKey(itemId);
    setCart(prev => {
      const ex = prev[k];
      return { ...prev, [k]: ex ? { ...ex, qty: ex.qty + 1 } : { qty: 1, isSC: true } };
    });
  };

  const removeByKey = (cartKey) => {
    setCart(prev => {
      const copy = { ...prev };
      if (!copy[cartKey]) return copy;
      const itemId = baseId(cartKey);
      const item = ITEM_MAP[itemId];
      if (!item.byWeight && copy[cartKey].qty > 1) {
        copy[cartKey] = { ...copy[cartKey], qty: copy[cartKey].qty - 1 };
      } else {
        delete copy[cartKey];
      }
      return copy;
    });
  };

  const setGrams = (id, g) => {
    const newG = Math.max(0, parseFloat(g) || 0);
    setCart(p => ({ ...p, [id]: { ...p[id], grams: newG } }));
  };

  const cartEntries = Object.entries(cart)
    .map(([cartKey, entry]) => {
      const itemId = baseId(cartKey);
      const item = ITEM_MAP[itemId];
      
      // Handle custom items
      if (!item && entry.isCustom) {
        return { cartKey, entry, item: null, amount: calcAmt(null, entry) };
      }
      
      // Skip invalid items
      if (!item) return null;
      
      return { cartKey, entry, item, amount: calcAmt(item, entry) };
    })
    .filter(Boolean);

  const total = cartEntries.reduce((s, e) => s + e.amount, 0);

  const handleQuickAdd = (item) => {
    // Create a custom item entry
    const customKey = `custom_${Date.now()}`;
    setCart(prev => ({
      ...prev,
      [customKey]: {
        qty: item.qty,
        rate: item.rate,
        name: item.name,
        isCustom: true
      }
    }));
  };

  const isSlipItem = (itemId) => {
    if (!itemId) return false;
    const baseItemId = baseId(itemId);
    // Check if the base item ID is in the slip items list
    return SLIP_ITEMS.includes(baseItemId) || 
           SLIP_ITEMS.some(slip => baseItemId === slip);
  };

  const printIndividualSlips = async () => {
    if (!cartEntries.length) return Alert.alert("Wait", "Cart is empty!");

    const slipEntries = cartEntries.filter(e => isSlipItem(e.cartKey));
    if (!slipEntries.length) {
      Alert.alert("Info", "No items for individual slips");
      return;
    }

    const slipHtmls = [];
    slipEntries.forEach(e => {
      const qty = e.item?.byWeight ? 1 : (e.entry.qty || 1);
      const itemName = e.item?.name || e.entry?.name || "Item";
      for (let i = 0; i < qty; i++) {
        const slipHtml = `
          <html>
          <body style="font-family: Arial; width: 150px; padding: 15px; margin: 0; text-align: center;">
            <p style="font-size: 20px; font-weight: bold; margin: 0;">
              ${itemName}
            </p>
          </body>
          </html>
        `;
        slipHtmls.push(slipHtml);
      }
    });

    try {
      for (let i = 0; i < slipHtmls.length; i++) {
        await Print.printAsync({ html: slipHtmls[i] });
      }
    } catch (err) {
      console.log("Print error", err);
    }
  };

  const handleSave = async () => {
    if (!cartEntries.length) return Alert.alert("Error", "Cart is empty!");
    const now = new Date().toISOString();
    const order = {
      id: orderNum, date: now, shop: DEFAULT_SHOP, payMode,
      items: cartEntries.map(e => ({
        itemId: e.cartKey,
        name: e.item?.name || e.entry?.name || "Custom Item",
        category: CAT_MAP[e.item?.id] || "custom",
        qty: e.entry.qty || 1,
        grams: e.entry.grams || null,
        withSevChutney: !!e.entry.isSC,
        rate: e.entry.rate || (e.item?.price + (e.entry.isSC ? SC_PRICE : 0)),
        unit: e.item?.unit || "unit",
        amount: e.amount,
      })),
      total,
    };
    const updated = [...orders, order];
    setOrders(updated);
    await saveAsync("orders_" + DEFAULT_SHOP, updated);

    const nextNum = orderNum + 1;
    setOrderNum(nextNum);
    await saveAsync("orderNum_" + DEFAULT_SHOP, nextNum);

    setCart({});
    Alert.alert("Success", `✅ Order #${orderNum} saved!`);
  };

  const printHtmlContent = async (htmlContent) => {
    if (Platform.OS === 'web') {
      const iframe = document.createElement('iframe');
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = 'none';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow.document;
      doc.open();
      doc.write(htmlContent);
      doc.close();
      
      setTimeout(() => {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(iframe);
        }, 1000);
      }, 500);
    } else {
      try {
        await Print.printAsync({ html: htmlContent });
      } catch (err) {
        console.log('Print error:', err);
      }
    }
  };

  const printBill = async () => {
    if (!cartEntries.length) return Alert.alert("Wait", "Cart is empty!");
    const html = `
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @page { margin: 0; }
          body { font-family: sans-serif; width: 300px; padding: 15px; margin: 0 auto; color: #000; }
          .cut-line { text-align: center; border-bottom: 2px dashed #000; line-height: 0.1em; margin: 30px 0 10px 0; }
          .cut-line span { background: #fff; padding: 0 10px; font-size: 14px; }
        </style>
      </head>
      <body>
        <h2 style="text-align: center; margin: 0;">Patidar Bakery</h2>
        <p style="text-align: center; font-size: 12px; margin: 5px 0;">Chambal Naka, Gautampura</p>
        <hr style="border: 0; border-top: 1px solid #ccc; margin: 10px 0;"/>
        <div style="font-size: 12px; margin-bottom: 10px; display: flex; justify-content: space-between;">
          <span style="font-weight: bold;">Pay: ${payMode}</span>
          <span>${fmtDate(new Date())} ${fmtTime(new Date())}</span>
        </div>
        <table style="width: 100%; font-size: 12px; text-align: left; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #ccc;">
            <th style="padding: 4px 0;">Item</th>
            <th style="padding: 4px 0; text-align: center;">Qty</th>
            <th style="padding: 4px 0; text-align: right;">Amt</th>
          </tr>
          ${cartEntries.map(e => {
            const itemName = e.item?.name || e.entry?.name || "Custom Item";
            const itemQty = e.item?.byWeight ? Math.round(e.entry.grams || 0) + 'g' : e.entry.qty;
            return `
              <tr>
                <td style="padding: 4px 0;">${itemName}${e.entry.isSC ? ' +SC' : ''}</td>
                <td style="padding: 4px 0; text-align: center;">${itemQty}</td>
                <td style="padding: 4px 0; text-align: right;">Rs.${e.amount.toFixed(2)}</td>
              </tr>
            `;
          }).join('')}
        </table>
        <hr style="border: 0; border-top: 1px solid #ccc; margin: 10px 0;"/>
        <h3 style="text-align: right; margin: 10px 0;">Total: Rs.${total.toFixed(2)}</h3>
        <p style="text-align: center; font-size: 12px; margin-top: 10px;">Thank you, visit again!</p>
        <div class="cut-line"><span>✄ Cut Here</span></div>
      </body>
      </html>
    `;
    await printHtmlContent(html);
  };

  const printKOT = async () => {
    if (!cartEntries.length) return Alert.alert("Wait", "Cart is empty!");

    // Group items by name and SC variant
    const groupedItems = {};
    cartEntries.forEach(e => {
      const itemName = e.item?.name || e.entry?.name || "Custom Item";
      const scSuffix = e.entry.isSC ? '_SC' : '';
      const key = itemName + scSuffix;
      
      if (!groupedItems[key]) {
        groupedItems[key] = {
          name: itemName,
          isSC: e.entry.isSC,
          totalQty: 0,
          isWeight: e.item?.byWeight
        };
      }
      
      // Calculate quantity
      if (e.item?.byWeight) {
        groupedItems[key].totalQty += e.entry.grams || 0;
      } else {
        groupedItems[key].totalQty += e.entry.qty || 1;
      }
    });

    const kotHtml = `
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
        <style>
          @page { margin: 0; }
          body { font-family: sans-serif; width: 300px; margin: 0 auto; color: #000; }
          .slip { padding: 20px 15px 10px 15px; }
          .cut-line { text-align: center; border-bottom: 2px dashed #000; line-height: 0.1em; margin: 20px 0; }
          .cut-line span { background: #fff; padding: 0 10px; font-size: 14px; }
          .header { text-align: center; margin-bottom: 15px; }
          .title { font-size: 20px; font-weight: bold; margin: 0 0 5px 0; text-transform: uppercase; white-space: nowrap; }
          .meta { font-size: 14px; margin: 2px 0; }
          .item-name { font-size: 28px; font-weight: bold; text-align: center; margin: 20px 0 10px 0; }
          .item-qty { font-size: 24px; font-weight: bold; text-align: center; margin: 10px 0 10px 0; }
        </style>
      </head>
      <body>
        ${Object.values(groupedItems).map((item, index, array) => `
          <div class="slip">
            <div class="header">
              <h2 class="title">Patidar Restaurant</h2>
              <p class="meta">${fmtDate(new Date())} ${fmtTime(new Date())}</p>
            </div>
            <div class="item-name">${item.name}${item.isSC ? ' +SC' : ''}</div>
            <div class="item-qty">Qty: ${item.isWeight ? Math.round(item.totalQty) + 'g' : item.totalQty}</div>
          </div>
          ${index !== array.length - 1 ? '<div class="cut-line"><span>✄ Cut Here</span></div>' : ''}
        `).join('')}
        <p style="text-align: center; margin-top: 20px; font-size: 12px;">--- End of KOT ---</p>
      </body>
      </html>
    `;

    await printHtmlContent(kotHtml);
  };

  return (
    <View style={styles.layout}>
      {/* ── MENUPANEL (LEFT) ── */}
      <View style={styles.menuPanel}>
        <View style={styles.jumpbar}>
          {MENU.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.jumpBtn} onPress={() => scrollTo(cat.id)}>
              <Text style={styles.jumpBtnText}>{cat.emoji} {cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView ref={scrollViewRef} style={styles.menuScroll} contentContainerStyle={styles.menuScrollContent}>
          {MENU.map(cat => (
            <View
              key={cat.id}
              style={styles.catSection}
              onLayout={(event) => {
                const layout = event.nativeEvent.layout;
                layoutRefs.current[cat.id] = layout.y;
              }}
            >
              <View style={styles.catHeading}>
                <Text style={styles.catEmoji}>{cat.emoji}</Text>
                <Text style={styles.catLabel}>{cat.label}</Text>
              </View>

              <View style={styles.itemsGrid}>
                {cat.items.map(item => (
                  <View key={item.id} style={styles.gridItem}>
                    <ItemCard
                      item={item}
                      plainEntry={cart[item.id] || null}
                      scEntry={cart[scKey(item.id)] || null}
                      onAddPlain={addPlain}
                      onAddSC={addSC}
                      onRemove={removeByKey}
                      onGrams={setGrams}
                    />
                  </View>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* ── BILL PANEL (RIGHT/BOTTOM) ── */}
      <View
        style={[
          styles.billPanel,
          !isTablet && { height: billExpanded ? "75%" : 120 }
        ]}
      >
        <View style={styles.billHeader}>
          {!isTablet && (
            <TouchableOpacity onPress={() => setBillExpanded(!billExpanded)} style={{ paddingBottom: 6 }}>
              <Text style={{ color: "#C49470", fontWeight: "900", textAlign: "center", textTransform: "uppercase", letterSpacing: 1, fontSize: 11 }}>
                {billExpanded ? "▼ Collapse Bill" : "▲ Expand Bill"}
              </Text>
            </TouchableOpacity>
          )}
          <View style={styles.billLogoRow}>
            <Text style={styles.billLogoIcon}>🏪</Text>
            <View>
              <Text style={styles.billShopName}>Patidar Bakery & Restaurant</Text>
              <Text style={styles.billShopAddr}>Chambal Naka, Gautampura</Text>
            </View>
          </View>
          <View style={styles.billDivider} />
          <View style={styles.billMetaGrid}>
            <View style={styles.billMeta}><Text style={styles.bmLabel}>Order #</Text><Text style={styles.bmVal}>{orderNum}</Text></View>
            <View style={styles.billMeta}><Text style={styles.bmLabel}>Date</Text><Text style={styles.bmVal}>{fmtDate(new Date())}</Text></View>
            <View style={styles.billMeta}><Text style={styles.bmLabel}>Time</Text><Text style={styles.bmVal}>{fmtTime(new Date())}</Text></View>
          </View>
          <View style={styles.payRow}>
            <Text style={styles.payLabel}>Pay:</Text>
            {["Cash", "UPI"].map(m => (
              <TouchableOpacity key={m} style={[styles.payChip, payMode === m && styles.payChipOn]} onPress={() => setPayMode(m)}>
                <Text style={[styles.payChipText, payMode === m && styles.payChipTextOn]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.billTableArea}>
          <View style={styles.tblHead}>
            <Text style={[styles.th, { flex: 2 }]}>Item</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'center' }]}>Qty</Text>
            <Text style={[styles.th, { flex: 1, textAlign: 'right' }]}>Rate</Text>
            <Text style={[styles.th, { flex: 1.2, textAlign: 'right' }]}>Amt</Text>
          </View>
          <ScrollView style={{ flex: 1 }}>
            {cartEntries.length === 0 ? (
              <Text style={styles.billEmpty}>No items added yet</Text>
            ) : (
              cartEntries.map(e => (
                <View key={e.cartKey} style={styles.tr}>
                  <View style={{ flex: 2, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text style={styles.tdText}>{e.item?.name || e.entry?.name || "Custom Item"}</Text>
                    {e.entry.isSC && <Text style={styles.scTag}> +SC</Text>}
                  </View>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'center' }]}>{e.item?.byWeight
                    ? `${Math.round(e.entry.grams || 0)}g`
                    : e.entry.qty}</Text>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'right' }]}>₹{e.entry.rate || (e.item?.price + (e.entry.isSC ? SC_PRICE : 0))}</Text>
                  <Text style={[styles.tdText, { flex: 1.2, textAlign: 'right' }]}>₹{e.amount.toFixed(2)}</Text>
                </View>
              ))
            )}
          </ScrollView>
        </View>

        <View style={styles.billFoot}>
          <View style={styles.billTotal}>
            <Text style={styles.billTotalText}>Total</Text>
            <Text style={styles.billTotalAmt}>₹{total.toFixed(2)}</Text>

          </View>
          <Text style={styles.billThanks}>🙏 Thank you, visit again!</Text>
          <View style={styles.billActions}>
            <TouchableOpacity
              style={[styles.btnAction, styles.btnKOT]}
              onPress={printKOT}
            >
              <Text style={styles.btnKOTText}>🍳 KOT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnAction, styles.btnPrint]} onPress={printBill}>
              <Text style={styles.btnPrintText}>🖨 Print</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

const getStyles = (isLight) => StyleSheet.create({
  layout: {
    flex: 1,
    flexDirection: isTablet ? "row" : "column",
    backgroundColor: isLight ? "#F1F5F9" : "#0E0A0A",
  },

  /* ── MENU ── */
  menuPanel: {
    flex: 1,
  },

  gridItem: {
    width: isTablet ? "31%" : "48%",
  },

  jumpbar: {
    flexDirection: "row",
    paddingVertical: isTablet ? 14 : 10,
    paddingHorizontal: isTablet ? 18 : 10,
    backgroundColor: isLight ? "#FFFFFF" : "rgba(0, 0, 0, 0.85)",
    borderBottomWidth: 1,
    borderBottomColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(77, 72, 69, 0.15)",
  },

  jumpBtn: {
    backgroundColor: "rgba(138, 212, 17, 0.08)",
    paddingVertical: isTablet ? 8 : 6,
    paddingHorizontal: isTablet ? 20 : 14,
    borderRadius: 24,
    marginRight: isTablet ? 10 : 8,
    borderWidth: 1,
    borderColor: "rgba(196, 148, 112, 0.2)",
  },

  jumpBtnText: {
    color: isLight ? "rgba(0,0,0,0.8)" : "rgba(255, 216, 216, 0.65)",
    fontSize: isTablet ? 13 : 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  menuScrollContent: {
    padding: isTablet ? 20 : 12,
    paddingBottom: isTablet ? 60 : 220,
  },

  catSection: {
    marginBottom: isTablet ? 28 : 20,
  },

  catHeading: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: isTablet ? 12 : 8,
    paddingBottom: isTablet ? 10 : 6,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(196, 148, 112, 0.14)",
  },

  catEmoji: {
    fontSize: isTablet ? 22 : 18,
    marginRight: isTablet ? 8 : 6,
  },

  catLabel: {
    fontSize: isTablet ? 17 : 15,
    fontWeight: "800",
    color: "#C49470",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  itemsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: isTablet ? 12 : 0,
  },

  /* ── BILL PANEL ── */
  billPanel: {
    width: isTablet ? 380 : "100%",
    position: isTablet ? "relative" : "absolute",
    bottom: isTablet ? undefined : 0,
    left: isTablet ? undefined : 0,
    backgroundColor: isLight ? "#FFFFFF" : "rgba(255, 255, 255, 0.88)",
    borderTopLeftRadius: isTablet ? 0 : 24,
    borderTopRightRadius: isTablet ? 0 : 24,
    borderLeftWidth: isTablet ? 1 : 0,
    borderTopWidth: isTablet ? 0 : 1,
    borderColor: isLight ? "rgba(0,0,0,0.1)" : "rgba(0, 0, 0, 0.18)",
    shadowColor: "#000000ff",
    shadowOffset: { width: isTablet ? -6 : 0, height: isTablet ? 0 : -6 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 18,
  },

  /* HEADER */
  billHeader: {
    padding: isTablet ? 18 : 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },

  billLogoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: isTablet ? 10 : 6,
  },

  billLogoIcon: {
    fontSize: isTablet ? 24 : 20,
    marginRight: isTablet ? 10 : 6,
  },

  billShopName: {
    fontSize: isTablet ? 16 : 13,
    fontWeight: "800",
    color: "#000000ff",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  billShopAddr: {
    fontSize: isTablet ? 11 : 10,
    color: "rgba(0, 0, 0, 0.7)",
    letterSpacing: 0.5,
  },

  billMetaGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: isTablet ? 10 : 6,
  },

  bmLabel: {
    fontSize: isTablet ? 10 : 9,
    color: "rgba(0, 0, 0, 0.7)",
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  bmVal: {
    fontSize: isTablet ? 12 : 11,
    color: "rgba(0, 0, 0, 0.8)",
    fontWeight: "600",
  },

  /* PAYMENT */
  payRow: {
    flexDirection: "row",
    marginTop: isTablet ? 10 : 6,
    gap: 5,
  },

  payChip: {
    flex: 1,
    paddingVertical: isTablet ? 9 : 6,
    borderRadius: isTablet ? 12 : 9,
    backgroundColor: "rgba(196, 148, 112, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.15)",
    alignItems: "center",
  },

  payChipOn: {
    backgroundColor: "  rgba(0, 0, 0, 0.22)",
    borderColor: "#000000ff",
    shadowColor: "#C49470",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
  },

  payChipText: {
    color: "rgba(0, 0, 0, 0.4)",
    fontSize: isTablet ? 12 : 11,
    fontWeight: "600",
  },

  payChipTextOn: {
    color: "#000000ff",
    fontWeight: "900",
    fontSize: isTablet ? 12 : 11,
  },

  /* TABLE */
  billTableArea: {
    flex: 1,
  },

  tblHead: {
    flexDirection: "row",
    paddingHorizontal: isTablet ? 18 : 10,
    paddingVertical: isTablet ? 10 : 6,
    backgroundColor: "rgba(0, 0, 0, 0.04)",
  },

  th: {
    fontSize: isTablet ? 10 : 9,
    color: "rgba(0, 0, 0, 0.7)",
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  tr: {
    flexDirection: "row",
    paddingVertical: isTablet ? 10 : 7,
    paddingHorizontal: isTablet ? 18 : 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(196, 148, 112, 0.07)",
  },

  tdText: {
    color: "rgba(0, 0, 0, 0.75)",
    fontSize: isTablet ? 13 : 12,
  },

  scTag: {
    backgroundColor: "rgba(196, 148, 112, 0.25)",
    color: "#000000ff",
    fontSize: isTablet ? 10 : 9,
    paddingHorizontal: 6,
    borderRadius: 6,
    marginLeft: 4,
    fontWeight: "800",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.35)",
  },

  billEmpty: {
    textAlign: "center",
    padding: isTablet ? 30 : 20,
    color: "rgba(0, 0, 0, 0.6)",
    fontSize: isTablet ? 14 : 13,
    letterSpacing: 0.5,
  },

  /* FOOTER */
  billFoot: {
    padding: isTablet ? 18 : 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
  },

  billTotal: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: isTablet ? 12 : 8,
    alignItems: "center",
  },

  billTotalText: {
    fontSize: isTablet ? 14 : 13,
    color: "rgba(0, 0, 0, 0.5)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  billTotalAmt: {
    fontSize: isTablet ? 22 : 17,
    fontWeight: "900",
    color: "#000000ff",
    letterSpacing: 0.3,
    textShadowColor: "rgba(196,148,112,0.4)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },

  billThanks: {
    textAlign: "center",
    fontSize: isTablet ? 10 : 9,
    color: "rgba(0, 0, 0, 1)",
    marginBottom: isTablet ? 10 : 6,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },

  /* BUTTONS */
  billActions: {
    flexDirection: "row",
    gap: isTablet ? 8 : 5,
  },

  btnAction: {
    flex: 1,
    paddingVertical: isTablet ? 13 : 10,
    borderRadius: isTablet ? 14 : 11,
    alignItems: "center",
  },

  btnKOT: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.3)",
  },

  btnKOTText: {
    color: "#000000ff",
    fontWeight: "800",
    fontSize: isTablet ? 13 : 11,
    letterSpacing: 0.5,
  },

  btnSlip: {
    backgroundColor: "rgba(100, 200, 100, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(100, 200, 100, 0.4)",
  },

  btnSlipText: {
    color: "#000000ff",
    fontSize: isTablet ? 13 : 11,
    fontWeight: "700",
  },

  btnPrint: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(96, 165, 250, 0.3)",
  },

  btnPrintText: {
    color: "#000000ff",
    fontSize: isTablet ? 13 : 11,
    fontWeight: "700",
  },

  btnSave: {
    backgroundColor: "rgba(0, 0, 0,0.1)",
    borderWidth: 1,
    borderColor: "#C49470",
    shadowColor: "#C49470",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  },

  btnSaveText: {
    color: "#000000ff",
    fontWeight: "900",
    fontSize: isTablet ? 14 : 12,
    letterSpacing: 0.5,
  },
});

export default BillingPage;