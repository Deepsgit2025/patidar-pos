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
import QuickAddModal from './src/components/QuickAddModal';
import AddItemModal from './src/components/AddItemModal';
import EditMenuModal from './src/components/EditMenuModal';
import { addCustomMenuItem, updateMenuItemRate, deleteMenuItem, ITEM_MAP } from './src/constants/menu';
import { loadAsync, saveAsync } from './src/utils/storage';

/* ─── PREMIUM THEME ───────────────────────── */
const COLORS = {
  bg: "#060B12",          // Deep aquamorphic night
  card: "#111824",        // Surfacing
  glass: "rgba(255,255,255,0.04)",
  primary: "#FFC300",     // Realme Yellow
  secondary: "#00E676",   // Aquamomorphic fluid green
  text: "#F8FAFC",
  muted: "#8FA0B8",
  border: "rgba(255,255,255,0.06)"
};

export default function App() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [isLight, setIsLight] = useState(false);
  const [menuKey, setMenuKey] = useState(0); // to force re-render on new item
  const billingPageRef = useRef(null);

  useEffect(() => {
    const loadCustomItems = async () => {
      // 1. Load added custom items
      const customItems = await loadAsync("custom_menu", []);
      if (customItems.length > 0) {
        customItems.forEach(data => {
          if (!ITEM_MAP[data.item.id]) {
            addCustomMenuItem(data.item, data.categoryId);
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

      setMenuKey(prev => prev + 1);
    };
    loadCustomItems();
  }, []);

  const handleQuickAdd = (item) => {
    if (billingPageRef.current) {
      billingPageRef.current.addCustomItem(item);
    }
  };

  const handleAddNewItem = async (newItem, categoryId) => {
    addCustomMenuItem(newItem, categoryId);
    setMenuKey(prev => prev + 1);
    
    // Save to AsyncStorage to persist across reloads
    const existingCustomItems = await loadAsync("custom_menu", []);
    existingCustomItems.push({ item: newItem, categoryId });
    await saveAsync("custom_menu", existingCustomItems);
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
    setMenuKey(prev => prev + 1);

    const deletedItems = await loadAsync("deleted_items", []);
    if (!deletedItems.includes(itemId)) {
      deletedItems.push(itemId);
      await saveAsync("deleted_items", deletedItems);
    }
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: "#FFFFFF" }]}>
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} backgroundColor={isLight ? "#FFFFFF" : COLORS.bg} />

      {/* ── TOP NAV ───────────────────────── */}
      <View style={[styles.topnav, isTablet && styles.topnavTablet, isLight && { backgroundColor: "#FFFFFF", borderColor: "rgba(0,0,0,0.1)" }]}>

        {/* BRAND */}
        <View style={styles.brand}>
          <Text style={styles.logo}>✨</Text>
          <Text style={[styles.brandText, isLight && { color: "#000" }]}>Patidar POS</Text>
        </View>

        <View style={styles.navActions}>
          <TouchableOpacity 
            style={[styles.editMenuBtn, isLight && { borderColor: "rgba(0,0,0,0.2)" }]}
            onPress={() => setIsLight(!isLight)}
          >
            <Text style={[styles.editMenuText, isLight && { color: "#000" }]}>{isLight ? '🌙 Dark' : '☀️ Light'}</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.editMenuBtn, isLight && { borderColor: "rgba(0,0,0,0.2)" }]}
            onPress={() => setShowEditMenu(true)}
          >
            <Text style={[styles.editMenuText, isLight && { color: "#000" }]}>⚙️ Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.addItemBtn, isLight && { borderColor: "rgba(0,0,0,0.2)" }]}
            onPress={() => setShowAddItem(true)}
          >
            <Text style={[styles.addItemText, isLight && { color: "#000" }]}>✨ Add Item</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.quickAddBtn}
            onPress={() => setShowQuickAdd(true)}
          >
            <Text style={styles.quickAddText}>➕ Quick Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MAIN CONTENT ───────────────────── */}
      <View style={[styles.main, isLight && { backgroundColor: "#F1F5F9" }]}>
        <BillingPage key={menuKey} ref={billingPageRef} isLight={isLight} />
      </View>

      {/* QUICK ADD MODAL */}
      <QuickAddModal 
        visible={showQuickAdd} 
        onClose={() => setShowQuickAdd(false)} 
        onAdd={handleQuickAdd} 
      />

      {/* ADD ITEM MODAL */}
      <AddItemModal 
        visible={showAddItem} 
        onClose={() => setShowAddItem(false)} 
        onAdd={handleAddNewItem} 
      />

      {/* EDIT MENU MODAL */}
      <EditMenuModal
        visible={showEditMenu}
        onClose={() => setShowEditMenu(false)}
        onUpdate={handleUpdateItem}
        onDelete={handleDeleteItem}
      />

    </SafeAreaView>
  );
}

/* ───────────────── STYLES ───────────────── */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },

  /* ── NAVBAR ── */
  topnav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.bg,
    borderBottomWidth: 1,
    borderColor: COLORS.border
  },

  topnavTablet: {
    paddingHorizontal: 32,
    paddingVertical: 18,
  },

  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },

  logo: {
    fontSize: 24
  },

  brandText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 20,
    letterSpacing: 0.5,
  },

  navActions: {
    flexDirection: "row",
    gap: 8
  },

  editMenuBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)"
  },

  editMenuText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
  },

  addItemBtn: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)"
  },

  addItemText: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
  },

  quickAddBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },

  quickAddText: {
    color: "#050B14",
    fontWeight: "800",
    fontSize: 14,
    letterSpacing: 0.5,
  },

  /* ── MAIN ── */
  main: {
    flex: 1,
    backgroundColor: COLORS.bg,
    padding: 12
  }
});