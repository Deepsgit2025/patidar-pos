import React, { useState, useRef, useEffect } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  useWindowDimensions,
  Alert
} from 'react-native';

import BillingPage from './src/pages/BillingPage';
import AdminPage from './src/pages/AdminPage';
import EditMenuModal from './src/components/EditMenuModal';
import StylesModal from './src/components/StylesModal';
import AddItemModal from './src/components/AddItemModal';
import QuickAddModal from './src/components/QuickAddModal';
import { 
  updateMenuItem, 
  deleteMenuItem, 
  removeCategoryAndItems, 
  addItemToMenu,
  ITEM_MAP, 
  MENU 
} from './src/constants/menu';
import { loadAsync, saveAsync } from './src/utils/storage';

/* ─── PREMIUM THEME ───────────────────────── */
const COLORS = {
  bg: "#060B12",
  card: "#111824",
  glass: "rgba(255,255,255,0.04)",
  primary: "#E8730A",
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
  btnBg: "#E8730A",
  // Bill Styles
  shopName: "Patidar Restaurant",
  billShopNameSize: 42,
  billShopNameWeight: '700',
  billMetaSize: 22,
  billMetaWeight: '400',
  billItemSize: 28,
  billItemWeight: '400',
  billTotalSize: 60,
  billThanksSize: 26
};

export default function App() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  
  const [view, setView] = useState("billing");
  const [showEditMenu, setShowEditMenu] = useState(false);
  const [showStyles, setShowStyles] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  const [appStyles, setAppStyles] = useState(DEFAULT_STYLES);
  const [isLight, setIsLight] = useState(false);
  const [menuKey, setMenuKey] = useState(0);
  const [categories, setCategories] = useState([...MENU]);
  
  const billingPageRef = useRef(null);

  useEffect(() => {
    const loadInitData = async () => {
      // 1. Load custom rates and apply
      const customRates = await loadAsync("custom_rates", {});
      Object.keys(customRates).forEach(id => {
        const data = customRates[id];
        if (typeof data === 'object') {
          updateMenuItem(id, data.rate, data.withSevChutney);
        } else {
          updateMenuItem(id, data);
        }
      });

      // 2. Load deleted items and remove
      const deletedItems = await loadAsync("deleted_items", []);
      deletedItems.forEach(id => {
        deleteMenuItem(id);
      });

      // 3. Load custom menu items
      const customMenu = await loadAsync("custom_menu", []);
      customMenu.forEach(itemData => {
        addItemToMenu(itemData);
      });

      // 4. Load app styles
      const savedStyles = await loadAsync("app_styles", DEFAULT_STYLES);
      setAppStyles(savedStyles);

      setCategories([...MENU]);
      setMenuKey(prev => prev + 1);
    };
    loadInitData();
  }, []);

  const handleUpdateItem = async (itemId, newRate, withSevChutney) => {
    updateMenuItem(itemId, newRate, withSevChutney);
    const customRates = await loadAsync("custom_rates", {});
    customRates[itemId] = { rate: newRate, withSevChutney };
    await saveAsync("custom_rates", customRates);
    setMenuKey(prev => prev + 1);
  };

  const handleDeleteItem = async (itemId) => {
    deleteMenuItem(itemId);
    
    // Remove from custom_menu storage if exists
    const customMenu = await loadAsync("custom_menu", []);
    const filteredMenu = customMenu.filter(m => m.id !== itemId);
    await saveAsync("custom_menu", filteredMenu);

    // Track in deleted_items for future loads
    const deletedItems = await loadAsync("deleted_items", []);
    if (!deletedItems.includes(itemId)) {
      deletedItems.push(itemId);
      await saveAsync("deleted_items", deletedItems);
    }
    
    setCategories([...MENU]);
    setMenuKey(prev => prev + 1);
  };

  const handleDeleteCategory = async (categoryId) => {
    removeCategoryAndItems(categoryId);

    // Clean up storage
    const customMenu = await loadAsync("custom_menu", []);
    const filteredMenu = customMenu.filter(m => m.categoryId !== categoryId);
    await saveAsync("custom_menu", filteredMenu);

    const savedCats = await loadAsync("menu_categories", []);
    const filteredCats = savedCats.filter(c => c.id !== categoryId);
    await saveAsync("menu_categories", filteredCats);

    setCategories([...MENU]);
    setMenuKey(prev => prev + 1);
  };

  const handleAddItem = async (itemData) => {
    const result = addItemToMenu(itemData);
    if (result) {
      // Persist
      const customMenu = await loadAsync("custom_menu", []);
      customMenu.push(itemData);
      await saveAsync("custom_menu", customMenu);

      // Update state
      setCategories([...MENU]);
      setMenuKey(prev => prev + 1);
      setShowAddItem(false);

      // Show success message
      const msg = itemData.categoryName 
        ? `Item added under new category '${itemData.categoryName}'!` 
        : "Item added!";
      Alert.alert("Success", msg);

      // Auto-scroll logic in BillingPage
      setTimeout(() => {
        if (billingPageRef.current && billingPageRef.current.scrollTo) {
          billingPageRef.current.scrollTo(result.category.id);
        }
      }, 500);
    }
  };

  const handleQuickAdd = (item) => {
    if (billingPageRef.current && billingPageRef.current.addCustomItem) {
      billingPageRef.current.addCustomItem(item);
    }
  };

  const handleSaveStyles = async (newStyles) => {
    setAppStyles(newStyles);
    await saveAsync("app_styles", newStyles);
    setMenuKey(prev => prev + 1);
  };

  return (
    <SafeAreaView style={[styles.container, isLight && { backgroundColor: "#FFFFFF" }]}>
      <StatusBar barStyle={isLight ? "dark-content" : "light-content"} backgroundColor={isLight ? "#FFFFFF" : COLORS.bg} />
      
      {/* ── TOP NAVBAR ── */}
      <View style={[styles.topnav, isTablet && styles.topnavTablet, isLight && { backgroundColor: "#FFFFFF", borderColor: "rgba(0,0,0,0.1)" }]}>
        <TouchableOpacity 
          style={styles.brand} 
          onPress={() => setView(view === "billing" ? "admin" : "billing")}
        >
          <Text style={styles.logo}>{view === "billing" ? "🍔" : "📊"}</Text>
          <Text style={[styles.brandText, isLight && { color: "#000" }]}>{view === "billing" ? "Patidar POS" : "Admin Panel"}</Text>
        </TouchableOpacity>
        
        <View style={styles.navActions}>
          {view === "billing" && (
            <>
              <TouchableOpacity 
                style={[styles.navBtn, styles.quickAddBtn]} 
                onPress={() => setShowQuickAdd(true)}
              >
                <Text style={styles.quickAddBtnText}>⚡ Quick</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.navBtn, styles.addItemBtn]} 
                onPress={() => setShowAddItem(true)}
              >
                <Text style={styles.addItemBtnText}>+ Item</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.navBtn, isLight && { borderColor: "rgba(0,0,0,0.1)" }]} 
                onPress={() => setIsLight(!isLight)}
              >
                <Text style={[styles.navBtnText, isLight && { color: "#000" }]}>{isLight ? '🌙' : '☀️'}</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity 
            style={[styles.navBtn, isLight && { borderColor: "rgba(0,0,0,0.1)" }]} 
            onPress={() => setShowEditMenu(true)}
          >
            <Text style={[styles.navBtnText, isLight && { color: "#000" }]}>⚙️ Menu</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.navBtn, isLight && { borderColor: "rgba(0,0,0,0.1)" }]} 
            onPress={() => setShowStyles(true)}
          >
            <Text style={[styles.navBtnText, isLight && { color: "#000" }]}>🎨 Style</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── MAIN CONTENT ── */}
      <View style={[styles.main, isLight && { backgroundColor: "#F1F5F9" }]}>
        {view === "billing" ? (
          <BillingPage 
            key={menuKey}
            ref={billingPageRef}
            isLight={isLight}
            appStyles={appStyles}
            categories={categories}
            onDeleteCategory={handleDeleteCategory}
          />
        ) : (
          <AdminPage shop="default" />
        )}
      </View>

      {/* ── MODALS ── */}
      <QuickAddModal
        visible={showQuickAdd}
        onClose={() => setShowQuickAdd(false)}
        onAdd={handleQuickAdd}
      />

      <AddItemModal
        visible={showAddItem}
        onClose={() => setShowAddItem(false)}
        categories={categories}
        onSave={handleAddItem}
      />

      <EditMenuModal 
        key={`e_${menuKey}`}
        visible={showEditMenu}
        onClose={() => setShowEditMenu(false)}
        onUpdate={handleUpdateItem}
        onDelete={handleDeleteItem}
      />

      <StylesModal
        visible={showStyles}
        onClose={() => setShowStyles(false)}
        onSave={handleSaveStyles}
        currentStyles={appStyles}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  },
  topnav: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: 20, 
    paddingVertical: 14, 
    backgroundColor: "#111824", 
    borderBottomWidth: 1, 
    borderColor: COLORS.border 
  },
  topnavTablet: { 
    paddingHorizontal: 32, 
    paddingVertical: 18 
  },
  brand: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: 10 
  },
  logo: { 
    fontSize: 28 
  },
  brandText: { 
    color: "#FFFFFF", 
    fontWeight: "900", 
    fontSize: 22, 
    letterSpacing: 0.5 
  },
  navActions: { 
    flexDirection: "row", 
    gap: 12 
  },
  navBtn: { 
    backgroundColor: "rgba(255,255,255,0.06)", 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 14, 
    borderWidth: 1, 
    borderColor: "rgba(255,255,255,0.1)" 
  },
  navBtnText: { 
    color: "#FFF", 
    fontWeight: "700", 
    fontSize: 14 
  },
  addItemBtn: {
    backgroundColor: "#E8730A",
    borderColor: "rgba(255,255,255,0.2)",
  },
  addItemBtnText: {
    color: "#FFF",
    fontWeight: "900",
    fontSize: 14,
  },
  quickAddBtn: {
    backgroundColor: "rgba(0, 230, 118, 0.15)",
    borderColor: "rgba(0, 230, 118, 0.3)",
  },
  quickAddBtnText: {
    color: "#00E676",
    fontWeight: "900",
    fontSize: 14,
  },
  main: { 
    flex: 1, 
    backgroundColor: COLORS.bg 
  }
});