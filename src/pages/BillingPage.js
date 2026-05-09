import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, Dimensions, Platform, Image, Modal, TextInput } from 'react-native';
import ViewShot from 'react-native-view-shot';
import { printImageBase64, divider } from '../utils/BluetoothPrinter';
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

const BillingPage = forwardRef(({ isLight, appStyles, onDeleteCategory }, ref) => {
  const viewShotRef = useRef();
  const kotShotRef = useRef();
  const styles = getStyles(isLight);
  const [kotItem, setKotItem] = useState(null);
  const [bills, setBills] = useState([{ id: Date.now(), cart: {}, payMode: "Cash" }]);
  const [activeBillIndex, setActiveBillIndex] = useState(0);
  const [orderNum, setOrderNum] = useState(1);
  const [orders, setOrders] = useState([]);
  const [printingKOTCat, setPrintingKOTCat] = useState(null);
  const [billExpanded, setBillExpanded] = useState(false);
  const [categories, setCategories] = useState(MENU);
  const [scPrice, setScPrice] = useState(SC_PRICE);
  const [editingItem, setEditingItem] = useState(null); // cartKey


  const [editName, setEditName] = useState("");
  const [editRate, setEditRate] = useState("");

  const scrollViewRef = useRef(null);
  const layoutRefs = useRef({});

  const currentBill = bills[activeBillIndex] || bills[0];
  const cart = currentBill.cart;
  const payMode = currentBill.payMode;

  const updateCurrentBill = (updater) => {
    setBills(prev => {
      const next = [...prev];
      next[activeBillIndex] = updater(next[activeBillIndex]);
      return next;
    });
  };

  const setCart = (updater) => {
    updateCurrentBill(prev => ({
      ...prev,
      cart: typeof updater === 'function' ? updater(prev.cart) : updater
    }));
  };

  const setPayMode = (mode) => {
    updateCurrentBill(prev => ({ ...prev, payMode: mode }));
  };

  const addBill = () => {
    const newBill = { id: Date.now(), cart: {}, payMode: "Cash" };
    setBills(prev => [...prev, newBill]);
    setActiveBillIndex(bills.length);
  };

  const removeBill = (index) => {
    if (bills.length === 1) {
      setBills([{ id: Date.now(), cart: {}, payMode: "Cash" }]);
      return;
    }
    const nextBills = bills.filter((_, i) => i !== index);
    setBills(nextBills);
    setActiveBillIndex(Math.max(0, index - 1));
  };

  const clearCart = () => {
    Alert.alert("Clear Bill", "Remove all items from this bill?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", onPress: () => setCart({}), style: "destructive" }
    ]);
  };

  const openEdit = (cartKey, currentName, currentRate) => {
    setEditingItem(cartKey);
    setEditName(currentName);
    setEditRate(String(Math.round(currentRate)));
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;
    setCart(prev => ({
      ...prev,
      [editingItem]: {
        ...prev[editingItem],
        name: editName,
        rate: parseFloat(editRate) || 0
      }
    }));
    setEditingItem(null);
  };

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
      const savedSC = await loadAsync("sc_price", SC_PRICE);
      
      const savedCats = await loadAsync("menu_categories", null);
      if (savedCats) {
        // Sync items from MENU into the saved category order
        const merged = savedCats.map(sc => {
          const found = MENU.find(m => m.id === sc.id);
          return { ...sc, items: found ? found.items : (sc.items || []) };
        });
        setCategories(merged);
      } else {
        setCategories([...MENU]);
      }

      setOrders(savedOrders);
      setOrderNum(savedOrderNum);
      setScPrice(Number(savedSC));
      setCart({});
    };
    fetchInitData();
  }, []);

  const moveCategory = async (index, direction) => {
    const newCats = [...categories];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newCats.length) return;
    [newCats[index], newCats[targetIndex]] = [newCats[targetIndex], newCats[index]];
    setCategories(newCats);
    await saveAsync("menu_categories", newCats);
  };

  const deleteCategory = (id) => {
    Alert.alert("Delete Category", "Are you sure? This will permanently delete the category and all its items.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", onPress: async () => {
        if (onDeleteCategory) {
          onDeleteCategory(id);
        } else {
          const filtered = categories.filter(c => c.id !== id);
          setCategories(filtered);
          await saveAsync("menu_categories", filtered);
        }
      }, style: "destructive" }
    ]);
  };

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

  const updateQty = (cartKey, delta) => {
    setCart(prev => {
      const ex = prev[cartKey];
      if (!ex) return prev;
      if (ex.isCustom || !ITEM_MAP[baseId(cartKey)]?.byWeight) {
        const newQty = Math.max(0, (ex.qty || 0) + delta);
        if (newQty === 0) {
          const copy = { ...prev };
          delete copy[cartKey];
          return copy;
        }
        return { ...prev, [cartKey]: { ...ex, qty: newQty } };
      }
      return prev;
    });
  };

  const deleteItem = (cartKey) => {
    setCart(prev => {
      const copy = { ...prev };
      delete copy[cartKey];
      return copy;
    });
  };

  const cartEntries = Object.entries(cart)
    .map(([cartKey, entry]) => {
      const itemId = baseId(cartKey);
      const item = ITEM_MAP[itemId];
      
      // Handle custom items
      if (!item && entry.isCustom) {
        return { cartKey, entry, item: null, amount: calcAmt(null, entry, scPrice) };
      }
      
      // Skip invalid items
      if (!item) return null;
      
      return { cartKey, entry, item, amount: calcAmt(item, entry, scPrice) };
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
        name: e.entry?.name || e.item?.name || "Custom Item",
        category: CAT_MAP[e.item?.id] || "custom",
        qty: e.entry.qty || 1,
        grams: e.entry.grams || null,
        withSevChutney: !!e.entry.isSC,
        rate: e.entry.rate !== undefined ? e.entry.rate : (e.item?.price + (e.entry.isSC ? scPrice : 0)),
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
    
    try {
      // 1. Capture and Print
      const uri = await viewShotRef.current.capture();
      // Increase width to 576 for better coverage on most printers (80mm)
      await printImageBase64(uri, { width: 576 });
      
      // 2. Save Order to Admin/Storage
      const now = new Date().toISOString();
      const order = {
        id: orderNum, 
        date: now, 
        shop: DEFAULT_SHOP, 
        payMode,
        items: cartEntries.map(e => ({
          itemId: e.cartKey,
          name: e.entry?.name || e.item?.name || "Custom Item",
          category: CAT_MAP[e.item?.id] || "custom",
          qty: e.entry.qty || 1,
          grams: e.entry.grams || null,
          withSevChutney: !!e.entry.isSC,
          rate: e.entry.rate !== undefined ? e.entry.rate : (e.item?.price + (e.entry.isSC ? scPrice : 0)),
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

      // 3. Clear Bill
      setCart({});
      Alert.alert("Success", `✅ Order #${orderNum} printed and saved!`);
    } catch (err) {
      console.log('Print/Save error:', err);
      Alert.alert("Error", "Could not complete print and save.");
    }
  };

  const printKOT = async () => {
    if (!cartEntries.length) return Alert.alert("Wait", "Cart is empty!");

    const categories = Object.keys(kotGroups);
    
    for (const catLabel of categories) {
      try {
        // Set the state to show only this category in the KOT template
        setPrintingKOTCat(catLabel);
        
        // Wait for a frame to ensure the ViewShot updates
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const uri = await kotShotRef.current.capture();
        await printImageBase64(uri, { width: 576 });
        
        // Brief pause between slips
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (err) {
        console.log('KOT Print error for', catLabel, ':', err);
      }
    }
    
    // Reset after printing all
    setPrintingKOTCat(null);
  };

  // Group items for KOT
  const kotGroups = {};
  cartEntries.forEach(e => {
    const catId = CAT_MAP[e.item?.id] || "other";
    const catLabel = MENU.find(c => c.id === catId)?.label || "Other Items";
    if (!kotGroups[catLabel]) kotGroups[catLabel] = [];
    kotGroups[catLabel].push(e);
  });

  return (
    <View style={styles.layout}>
      {/* ── MENUPANEL (LEFT) ── */}
      <View style={styles.menuPanel}>
        <View style={styles.jumpbar}>
          {categories.map(cat => (
            <TouchableOpacity key={cat.id} style={styles.jumpBtn} onPress={() => scrollTo(cat.id)}>
              <Text style={styles.jumpBtnText}>{cat.emoji} {cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <ScrollView ref={scrollViewRef} style={styles.menuScroll} contentContainerStyle={styles.menuScrollContent}>
          {categories.map((cat, idx) => (
            <View
              key={cat.id}
              style={styles.catSection}
              onLayout={(event) => {
                const layout = event.nativeEvent.layout;
                layoutRefs.current[cat.id] = layout.y;
              }}
            >
              <View style={styles.catHeading}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={styles.catLabel}>{cat.label}</Text>
                </View>
                
                <View style={styles.catControls}>
                  <TouchableOpacity onPress={() => moveCategory(idx, -1)} style={styles.catControlBtn}>
                    <Text style={styles.catControlText}>▲</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => moveCategory(idx, 1)} style={styles.catControlBtn}>
                    <Text style={styles.catControlText}>▼</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteCategory(cat.id)} style={[styles.catControlBtn, { backgroundColor: 'rgba(255,0,0,0.1)' }]}>
                    <Text style={[styles.catControlText, { color: '#ef4444' }]}>🗑️</Text>
                  </TouchableOpacity>
                </View>
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
                        customStyles={appStyles}
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
          
          {/* Bill Tabs */}
          <View style={styles.tabBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
              {bills.map((b, idx) => (
                <TouchableOpacity 
                  key={b.id} 
                  style={[styles.tab, activeBillIndex === idx && styles.tabActive]}
                  onPress={() => setActiveBillIndex(idx)}
                >
                  <Text style={[styles.tabText, activeBillIndex === idx && styles.tabTextActive]}>
                    Bill {idx + 1}
                  </Text>
                  <TouchableOpacity onPress={() => removeBill(idx)} style={styles.tabClose}>
                    <Text style={styles.tabCloseText}>×</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.addTabBtn} onPress={addBill}>
                <Text style={styles.addTabBtnText}>+ New</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>

          <View style={styles.billLogoRow}>
            <Text style={styles.billLogoIcon}>🏪</Text>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.billShopName}>Patidar Bakery</Text>
                <TouchableOpacity onPress={clearCart} style={styles.clearAllBtn}>
                  <Text style={styles.clearAllText}>🗑️ Clear All</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.billShopAddr}>Chambal Naka, Gautampura</Text>
            </View>
          </View>
          <View style={styles.billDivider} />
          <View style={styles.billMetaGrid}>
            <View style={styles.billMeta}>
              <Text style={styles.bmLabel}>Order #</Text>
              <Text style={styles.bmVal}>{orderNum} ({cartEntries.length} items)</Text>
            </View>
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
          <ScrollView 
            style={{ flex: 1 }} 
            contentContainerStyle={{ flexGrow: 1 }}
            overScrollMode="never"
            showsVerticalScrollIndicator={true}
          >
            {cartEntries.length === 0 ? (
              <Text style={styles.billEmpty}>No items added yet</Text>
            ) : (
              cartEntries.map(e => (
                <View key={e.cartKey} style={styles.tr}>
                  <View style={{ flex: 1.8, flexDirection: 'row', alignItems: 'center' }}>
                    <TouchableOpacity onPress={() => deleteItem(e.cartKey)} style={styles.itemClearBtn}>
                      <Text style={styles.itemClearText}>✕</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={{ flex: 1 }} 
                      onPress={() => openEdit(e.cartKey, e.entry?.name || e.item?.name || "Item", e.entry.rate !== undefined ? e.entry.rate : (e.item?.price + (e.entry.isSC ? scPrice : 0)))}
                    >
                      <Text style={styles.tdText} numberOfLines={1}>{e.entry?.name || e.item?.name || "Item"}</Text>
                      {e.entry.isSC && <Text style={styles.scTag}>+SC</Text>}
                    </TouchableOpacity>
                  </View>
                  
                  <View style={[styles.qtyControlRow, { flex: 1.4 }]}>
                    {e.item?.byWeight ? (
                      <View style={styles.qtyEditBox}>
                        <TouchableOpacity onPress={() => setGrams(e.cartKey, Math.max(0, (e.entry.grams || 0) - 100))} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{Math.round(e.entry.grams || 0)}g</Text>
                        <TouchableOpacity onPress={() => setGrams(e.cartKey, (e.entry.grams || 0) + 100)} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.qtyEditBox}>
                        <TouchableOpacity onPress={() => updateQty(e.cartKey, -1)} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>-</Text>
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{e.entry.qty}</Text>
                        <TouchableOpacity onPress={() => updateQty(e.cartKey, 1)} style={styles.qtyBtn}>
                          <Text style={styles.qtyBtnText}>+</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity 
                    style={{ flex: 0.8 }}
                    onPress={() => openEdit(e.cartKey, e.entry?.name || e.item?.name || "Item", e.entry.rate !== undefined ? e.entry.rate : (e.item?.price + (e.entry.isSC ? scPrice : 0)))}
                  >
                    <Text style={[styles.tdText, { textAlign: 'right' }]}>₹{Math.round(e.entry.rate !== undefined ? e.entry.rate : (e.item?.price + (e.entry.isSC ? scPrice : 0)))}</Text>
                  </TouchableOpacity>
                  <Text style={[styles.tdText, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>₹{e.amount.toFixed(0)}</Text>
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
            <TouchableOpacity style={[styles.btnAction, styles.btnKOT]} onPress={printKOT}>
              <Text style={styles.btnKOTText}>🍳 KOT</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnAction, styles.btnPrint, { flex: 2 }]} onPress={printBill}>
              <Text style={styles.btnPrintText}>🖨 Print & Clear</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      {/* ── HIDDEN RECEIPT FOR IMAGE CAPTURE ── */}
      <View style={{ position: 'absolute', left: -5000, top: 0 }}>
        <ViewShot
          ref={viewShotRef}
          options={{ format: "png", quality: 1.0, result: "base64" }}
          style={styles.hiddenReceiptContainer}
        >
          <View style={[styles.hrHeader, { marginBottom: 2 }]}>
            <Text style={[styles.hrShopName, { 
              fontSize: appStyles?.billShopNameSize || 42, 
              fontWeight: appStyles?.billShopNameWeight || '700',
              marginBottom: 0 
            }]}>{appStyles?.shopName || 'Patidar Restaurant'}</Text>
            <View style={[styles.hrMetaRow, { marginBottom: 2 }]}>
              <Text style={[styles.hrMetaText, { fontSize: appStyles?.billMetaSize || 22 }]}>
                Gautampura | {fmtDate(new Date())} {fmtTime(new Date())}
              </Text>
            </View>
          </View>
          <View style={styles.hrTable}>
            <View style={styles.hrTHead}>
              <Text style={[styles.hrTCell, { flex: 2, textAlign: 'center' }]}>ITEM</Text>
              <Text style={[styles.hrTCell, { flex: 1, textAlign: 'center' }]}>QTY</Text>
              <Text style={[styles.hrTCell, { flex: 1, textAlign: 'center' }]}>RATE</Text>
              <Text style={[styles.hrTCell, { flex: 1.2, textAlign: 'center' }]}>AMT</Text>
            </View>
            {cartEntries.map((e, i) => {
              const name = e.entry?.name || e.item?.name || "Item";
              const rate = e.entry.rate !== undefined ? e.entry.rate : (e.item?.price + (e.entry.isSC ? scPrice : 0));
              const qtyDisp = e.item?.byWeight ? Math.round(e.entry.grams) + 'g' : e.entry.qty;
              
              return (
                <View key={i} style={styles.hrTRowOneLine}>
                  <Text style={[styles.hrTTextSmall, { 
                    flex: 2, 
                    textAlign: 'center', 
                    fontSize: appStyles?.billItemSize || 28,
                    fontWeight: appStyles?.billItemWeight || '400'
                  }]}>
                    {name}{e.entry.isSC ? '+SC' : ''}
                  </Text>
                  <Text style={[styles.hrTTextSmall, { 
                    flex: 1, 
                    textAlign: 'center',
                    fontSize: appStyles?.billItemSize || 28
                  }]}>
                    {qtyDisp}
                  </Text>
                  <Text style={[styles.hrTTextSmall, { 
                    flex: 1, 
                    textAlign: 'center',
                    fontSize: appStyles?.billItemSize || 28
                  }]}>
                    {Math.round(rate)}
                  </Text>
                  <Text style={[styles.hrTTextSmall, { 
                    flex: 1.2, 
                    textAlign: 'center', 
                    fontWeight: '900',
                    fontSize: appStyles?.billItemSize || 28
                  }]}>
                    {e.amount.toFixed(0)}
                  </Text>
                </View>
              );
            })}
          </View>
          <View style={styles.hrDivider} />
          <View style={styles.hrTotalRow}>
            <Text style={[styles.hrTotalLabel, { fontSize: (appStyles?.billTotalSize || 60) * 0.5 }]}>TOTAL AMOUNT</Text>
            <Text style={[styles.hrTotalVal, { fontSize: appStyles?.billTotalSize || 60 }]}>₹{total.toFixed(0)}</Text>
          </View>
          <View style={styles.hrDivider} />
          <Text style={styles.hrThanks}>🙏 Thank You! Visit Again 🙏</Text>
        </ViewShot>

        <ViewShot
          ref={kotShotRef}
          options={{ format: "png", quality: 1.0, result: "base64" }}
          style={styles.hiddenKOTContainer}
        >
          <Text style={[styles.kotTitle, { fontSize: appStyles?.kotTitleSize || 48 }]}>KOT / TOKEN</Text>
          <View style={styles.hrDivider} />
          
          {Object.entries(kotGroups)
            .filter(([catLabel]) => !printingKOTCat || catLabel === printingKOTCat)
            .map(([catLabel, items]) => (
            <View key={catLabel} style={styles.kotCatGroup}>
              <Text style={[styles.kotCatHeader, { fontSize: appStyles?.kotCatSize || 26 }]}>{catLabel.toUpperCase()}</Text>
              {items.map((e, i) => (
                <View key={i} style={styles.kotItemRow}>
                  <Text style={[styles.kotItemName, { fontSize: appStyles?.kotItemSize || 34 }]}>{e.item?.name || e.entry?.name}{e.entry.isSC ? ' +SC' : ''}</Text>
                  <Text style={[styles.kotItemQty, { fontSize: appStyles?.kotItemSize || 34 }]}>Qty: {e.item?.byWeight ? Math.round(e.entry.grams) + 'g' : e.entry.qty}</Text>
                </View>
              ))}
              <View style={[styles.hrDivider, { marginVertical: 4, opacity: 0.3 }]} />
            </View>
          ))}
          
          <View style={styles.hrDivider} />
          <Text style={[styles.kotTime, { fontSize: appStyles?.kotTimeSize || 16 }]}>{fmtTime(new Date())}</Text>
        </ViewShot>
      </View>

      {/* ── EDIT MODAL ── */}
      <Modal visible={!!editingItem} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.editModal}>
            <Text style={styles.editTitle}>Edit Item</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Item Name</Text>
              <TextInput 
                style={styles.textInput} 
                value={editName} 
                onChangeText={setEditName}
                placeholder="Item Name"
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rate (₹)</Text>
              <TextInput 
                style={styles.textInput} 
                value={editRate} 
                onChangeText={setEditRate}
                keyboardType="numeric"
                placeholder="Rate"
              />
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setEditingItem(null)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleSaveEdit}>
                <Text style={styles.modalSaveText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    minHeight: 130,
    justifyContent: 'center',
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

  /* Tabs */
  tabBar: {
    flexDirection: 'row',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  tabScroll: {
    flexGrow: 0,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginRight: 4,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: {
    backgroundColor: '#fff',
    borderColor: 'rgba(0,0,0,0.1)',
    borderBottomColor: '#fff',
    marginBottom: -1,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.5)',
  },
  tabTextActive: {
    color: '#000',
  },
  tabClose: {
    padding: 4,
    marginLeft: 4,
  },

  /* ── HIDDEN RECEIPT STYLES ── */
  hiddenReceiptContainer: {
    width: 550, // Increased width to use more horizontal space
    padding: 20,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  hrHeader: {
    alignItems: 'center',
    marginBottom: 5,
    width: '100%',
  },
  hrShopName: {
    fontSize: 48, 
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  hrDivider: {
    height: 2,
    backgroundColor: '#000',
    marginVertical: 6,
    width: '100%',
  },
  hrMetaRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 4,
    width: '100%',
  },
  hrMetaText: {
    fontSize: 22,
    color: '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  hrTable: {
    width: '100%',
    marginBottom: 10,
  },
  hrTHead: {
    flexDirection: 'row',
    borderBottomWidth: 3,
    borderBottomColor: '#000',
    paddingBottom: 8,
    marginBottom: 12,
    justifyContent: 'center',
  },
  hrTCell: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
  },
  hrTRowGroup: {
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
  },
  hrTRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
  },
  hrTText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
  },
  hrTTextSub: {
    fontSize: 26,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
  },
  hrTAmount: {
    fontSize: 36,
    fontWeight: '900',
    color: '#000',
    textAlign: 'center',
    marginTop: 6,
  },
  hrTotalRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 5,
  },
  hrTotalLabel: {
    fontSize: 32,
    fontWeight: '700',
    color: '#000',
  },
  hrTotalVal: {
    fontSize: 60,
    fontWeight: '800',
    color: '#000',
  },
  hrThanks: {
    textAlign: 'center',
    fontSize: 26,
    marginTop: 20,
    fontWeight: '900',
    color: '#000',
    width: '100%',
  },

  hiddenKOTContainer: {
    width: 550, // Full width to match bill
    padding: 30,
    paddingBottom: 60,
    backgroundColor: '#fff',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#000',
  },
  kotTitle: {
    fontSize: 48,
    color: '#000',
    letterSpacing: 4,
    marginBottom: 10,
  },
  kotOrder: {
    fontSize: 24,
    color: '#000',
    marginBottom: 10,
  },
  kotItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  kotItemName: {
    fontSize: 34,
    color: '#000',
  },
  kotItemQty: {
    fontSize: 34,
    color: '#000',
    textAlign: 'right',
  },
  kotTime: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 5,
    color: '#000',
  },
  kotCatGroup: {
    width: '100%',
    marginBottom: 10,
  },
  kotCatHeader: {
    fontSize: 26,
    color: '#fff',
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 8,
    marginTop: 8,
    textAlign: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
  },
  tabClose: {
    marginLeft: 6,
    padding: 2,
  },
  tabCloseText: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.3)',
    fontWeight: 'bold',
  },
  addTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    justifyContent: 'center',
  },
  addTabBtnText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#C49470',
  },

  /* Clear Buttons */
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255,0,0,0.05)',
  },
  clearAllText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#EF4444',
  },
  itemClearBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  itemClearText: {
    fontSize: 10,
    color: '#EF4444',
    fontWeight: 'bold',
  },

  /* Qty Controls */
  qtyControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyEditBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderRadius: 6,
    padding: 2,
  },
  qtyBtn: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  qtyText: {
    marginHorizontal: 8,
    fontSize: 13,
    fontWeight: '700',
    minWidth: 15,
    textAlign: 'center',
  },
  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  editModal: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  editTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.5)',
    marginBottom: 6,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.05)',
    alignItems: 'center',
  },
  modalSave: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  modalCancelText: {
    color: 'rgba(0,0,0,0.6)',
    fontWeight: '700',
  },
  modalSaveText: {
    color: '#fff',
    fontWeight: '800',
  },

  /* Updated Receipt Styles */
  hrTRowOneLine: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  hrTTextSmall: {
    fontSize: 28,
    fontWeight: '500',
    color: '#000',
  },
  catControls: {
    flexDirection: 'row',
    gap: 8,
  },
  catControlBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  catControlText: {
    fontSize: 14,
    color: '#C49470',
  }
});


export default BillingPage;