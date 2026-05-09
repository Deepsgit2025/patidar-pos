import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions
} from 'react-native';

import BillingPage from './src/pages/BillingPage';
import AdminPage from './src/pages/AdminPage';
import QuickAddModal from './src/components/QuickAddModal';
import AddItemModal from './src/components/AddItemModal';
import EditMenuModal from './src/components/EditMenuModal';
import StylesModal from './src/components/StylesModal';
import { addCustomMenuItem, updateMenuItemRate, deleteMenuItem, removeCategoryAndItems, ITEM_MAP, MENU } from './src/constants/menu';
import { loadAsync, saveAsync } from './src/utils/storage';

/* ─── PREMIUM THEME ───────────────────────── */
const COLORS = {
  bg: "#060B12",
  card: "#111824",
  glass: "rgba(255,255,255,0.04)",
  primary: "#FFC300",
  secondary: "#00E676",
  text: "#F8FAFC",
  muted: "#8FA0B8",
  border: "rgba(255,255,255,0.06)"
};

const DEFAULT_STYLES = {
  // Item Card Styles
  cardBg: "#000000",
  cardBorder: "rgba(255, 255, 255, 0.95)",
  textColor: "#FFFFFF",
  priceColor: "#FBBF24",
  btnBg: "#FFC300",
  // Bill Styles
  shopName: "Patidar Restaurant",
  billShopNameSize: 42,
  billShopNameWeight: '700',
  billMetaSize: 22,
  billItemSize: 28,
  billItemWeight: '400',
  billTotalSize: 60,
  billThanksSize: 26
};

export default function App() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [view, setView] = useState("billing");
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [appStyles, setAppStyles] = useState(DEFAULT_STYLES);
  const [isLight, setIsLight] = useState(false);
  const [menuKey, setMenuKey] = useState(0);
  const billingPageRef = useRef(null);

  useEffect(() => {
    const loadInitData = async () => {
      // 1. Load added custom items
      const customItems = await loadAsync("custom_menu", []);
      if (customItems.length > 0) {
        customItems.forEach(data => {
          if (!ITEM_MAP[data.item.id]) {
            addCustomMenuItem(data.item, data.categoryId, data.emoji);
          }
        });
      }

      // 2. Load custom rates and apply
      const customRates = await loadAsync("custom_rates", {});
      Object.keys(customRates).forEach(id => {
        updateMenuItemRate(id, customRates[id]);
      });

      // 3. Load deleted items and remove
      const deletedItems = await loadAsync("deleted_items", []);
      deletedItems.forEach(id => {
        deleteMenuItem(id);
      });

      // 4. Load app styles
      const savedStyles = await loadAsync("app_styles", DEFAULT_STYLES);
      setAppStyles(savedStyles);

      setMenuKey(prev => prev + 1);
    };
    loadInitData();
  }, []);

  const handleQuickAdd = (item) => {
    if (billingPageRef.current) {
      billingPageRef.current.addCustomItem(item);
    }
  };

  const handleAddNewItem = async (newItem, categoryId, emoji) => {
    try {
      addCustomMenuItem(newItem, categoryId, emoji);

      const existingCustomItems = await loadAsync("custom_menu", []);
      existingCustomItems.push({ item: newItem, categoryId, emoji });
      await saveAsync("custom_menu", existingCustomItems);

      let savedCats = await loadAsync("menu_categories", null);
      if (!savedCats) {
        savedCats = [...MENU];
      }

      const exists = savedCats.some(c => c.id === categoryId || c.label.toLowerCase() === categoryId.toLowerCase());
      if (!exists) {
        const newCat = MENU.find(c => c.id === categoryId || c.label.toLowerCase() === categoryId.toLowerCase());
        if (newCat) {
          const updatedCats = [...savedCats, newCat];
          await saveAsync("menu_categories", updatedCats);
        }
      }

      setMenuKey(prev => prev + 1);
    } catch (err) {
      console.error("Error adding item:", err);
      alert("Error adding item.");
    }
  };

  const handleUpdateItem = async (itemId, newRate) => {
    updateMenuItemRate(itemId, newRate);
    setMenuKey(prev => prev + 1);

    const customRates = await loadAsync("custom_rates", {});
    customRates[itemId] = newRate;
    await saveAsync("custom_rates", customRates);
  };

  const handleDeleteItem = async (itemId) => {
    deleteMenuItem(itemId);
    
    // Remove from custom_menu storage
    const customItems = await loadAsync("custom_menu", []);
    const filteredItems = customItems.filter(ci => ci.item.id !== itemId);
    await saveAsync("custom_menu", filteredItems);

    // Track in deleted_items for future loads
    const deletedItems = await loadAsync("deleted_items", []);
    if (!deletedItems.includes(itemId)) {
      deletedItems.push(itemId);
      await saveAsync("deleted_items", deletedItems);
    }
    
    setMenuKey(prev => prev + 1);
  };

  const handleDeleteCategory = async (categoryId) => {
    // 1. Remove from MENU and Maps
    removeCategoryAndItems(categoryId);

    // 2. Remove items of this category from custom_menu storage
    const customItems = await loadAsync("custom_menu", []);
    const filteredItems = customItems.filter(ci => ci.categoryId !== categoryId);
    await saveAsync("custom_menu", filteredItems);

    // 3. Remove from menu_categories storage
    const savedCats = await loadAsync("menu_categories", []);
    const filteredCats = savedCats.filter(c => c.id !== categoryId);
    await saveAsync("menu_categories", filteredCats);

    setMenuKey(prev => prev + 1);
  };

  const handleSaveStyles = async (newStyles) => {
    setAppStyles(newStyles);
    await saveAsync("app_styles", newStyles);
    setMenuKey(prev => prev + 1);
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: "#FFFFFF" }]}>
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} backgroundColor={isLight ? "#FFFFFF" : COLORS.bg} />

      <View style={[styles.topnav, isTablet && styles.topnavTablet, isLight && { backgroundColor: "#FFFFFF", borderColor: "rgba(0,0,0,0.1)" }]}>
        <View style={styles.brand}>
          <Text style={styles.logo}>✨</Text>
          <Text style={[styles.brandText, isLight && { color: "#000" }]}>{view === "admin" ? "Admin Panel" : "Patidar Restaurant"}</Text>
        </View>

        <View style={styles.navActions}>
          <TouchableOpacity
            style={[styles.editMenuBtn, isLight && { borderColor: "rgba(0,0,0,0.2)" }]}
            onPress={() => setView(view === "billing" ? "admin" : "billing")}
          >
            <Text style={[styles.editMenuText, isLight && { color: "#000" }]}>{view === "billing" ? "📊 Admin" : "🛒 POS"}</Text>
          </TouchableOpacity>

          {view === "billing" && (
            <>
              <TouchableOpacity
                style={[styles.editMenuBtn, isLight && { borderColor: "rgba(0,0,0,0.2)" }]}
                onPress={() => setIsLight(!isLight)}
              >
                <Text style={[styles.editMenuText, isLight && { color: "#000" }]}>{isLight ? '🌙' : '☀️'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.editMenuBtn, isLight && { borderColor: "rgba(0,0,0,0.2)" }]}
                onPress={() => setShowEditMenu(true)}
              >
                <Text style={[styles.editMenuText, isLight && { color: "#000" }]}>⚙️ Edit</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.stylesBtn, isLight && { borderColor: "rgba(0,0,0,0.2)" }]}
                onPress={() => setShowStyles(true)}
              >
                <Text style={[styles.stylesText, isLight && { color: "#000" }]}>🎨 Style</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.addItemBtn, isLight && { borderColor: "rgba(0,0,0,0.2)" }]}
                onPress={() => setShowAddItem(true)}
              >
                <Text style={[styles.addItemText, isLight && { color: "#000" }]}>✨ Add</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickAddBtn}
                onPress={() => setShowQuickAdd(true)}
              >
                <Text style={styles.quickAddText}>➕ Quick</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <View style={[styles.main, isLight && { backgroundColor: "#F1F5F9" }]}>
        {view === "billing" ? (
          <BillingPage 
            key={menuKey} 
            ref={billingPageRef} 
            isLight={isLight} 
            appStyles={appStyles} 
            onDeleteCategory={handleDeleteCategory}
          />
        ) : (
          <AdminPage shop="default" />
        )}
      </View>

      <QuickAddModal key={`q_${menuKey}`} visible={showQuickAdd} onClose={() => setShowQuickAdd(false)} onAdd={handleQuickAdd} />
      <AddItemModal key={`a_${menuKey}`} visible={showAddItem} onClose={() => setShowAddItem(false)} onAdd={handleAddNewItem} />
      <EditMenuModal key={`e_${menuKey}`} visible={showEditMenu} onClose={() => setShowEditMenu(false)} onUpdate={handleUpdateItem} onDelete={handleDeleteItem} />
      <StylesModal visible={showStyles} onClose={() => setShowStyles(false)} currentStyles={appStyles} onSave={handleSaveStyles} />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topnav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 14, backgroundColor: COLORS.bg, borderBottomWidth: 1, borderColor: COLORS.border },
  topnavTablet: { paddingHorizontal: 32, paddingVertical: 18 },
  brand: { flexDirection: "row", alignItems: "center", gap: 10 },
  logo: { fontSize: 24 },
  brandText: { color: "#FFFFFF", fontWeight: "800", fontSize: 20, letterSpacing: 0.5 },
  navActions: { flexDirection: "row", gap: 8 },
  editMenuBtn: { backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  editMenuText: { color: "#FFF", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  stylesBtn: { backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 10, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  stylesText: { color: "#FFF", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  addItemBtn: { backgroundColor: "rgba(255,255,255,0.1)", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  addItemText: { color: "#FFF", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  quickAddBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20, shadowColor: COLORS.primary, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 6 },
  quickAddText: { color: "#050B14", fontWeight: "800", fontSize: 14, letterSpacing: 0.5 },
  main: { flex: 1, backgroundColor: COLORS.bg, padding: 12 }
});