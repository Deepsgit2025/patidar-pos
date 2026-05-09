import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Dimensions, ScrollView } from 'react-native';
import ItemCard from './ItemCard';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const PRESET_COLORS = [
  "#000000", "#111824", "#1E293B", "#312E81", "#701A75", 
  "#991B1B", "#166534", "#065F46", "#374151", "#525252"
];

const BTN_COLORS = [
  "#FFC300", "#34D399", "#FBBF24", "#60A5FA", "#F87171", "#A78BFA"
];

const WEIGHTS = ['400', '700', '900'];

export default function StylesModal({ visible, onClose, currentStyles, onSave }) {
  const [styles, setStyles] = useState(currentStyles);
  const [activeTab, setActiveTab] = useState('card'); 

  useEffect(() => {
    if (visible) {
      setStyles(currentStyles);
    }
  }, [visible, currentStyles]);

  const updateStyle = (key, val) => {
    setStyles(prev => ({ ...prev, [key]: val }));
  };

  const adjustSize = (key, delta) => {
    setStyles(prev => ({ ...prev, [key]: Math.max(10, (prev[key] || 20) + delta) }));
  };

  const renderCardStyles = () => (
    <View>
      <Text style={uiStyles.sectionTitle}>Live Preview</Text>
      <View style={uiStyles.previewBox}>
        <View style={{ width: isTablet ? 180 : 140 }}>
          <ItemCard item={{ name: "Paneer Tikka", price: 150, unit: "pc", withSevChutney: false, img: "" }} customStyles={styles} plainEntry={null} onAddPlain={() => {}} />
        </View>
      </View>

      <Text style={uiStyles.label}>Card Background</Text>
      <View style={uiStyles.colorGrid}>
        {PRESET_COLORS.map(c => (
          <TouchableOpacity 
            key={c} 
            style={[uiStyles.colorCircle, { backgroundColor: c }, styles.cardBg === c && uiStyles.activeBorder]} 
            onPress={() => updateStyle('cardBg', c)}
          />
        ))}
      </View>

      <Text style={uiStyles.label}>Theme Colors</Text>
      <View style={uiStyles.colorGrid}>
        {BTN_COLORS.map(c => (
          <TouchableOpacity key={c} style={[uiStyles.colorCircle, { backgroundColor: c }]} onPress={() => updateStyle('btnBg', c)} />
        ))}
      </View>
    </View>
  );

  const renderBillStyles = () => (
    <View>
      <Text style={uiStyles.sectionTitle}>Branding</Text>
      <View style={uiStyles.field}>
        <Text style={uiStyles.label}>Restaurant Name</Text>
        <TextInput style={uiStyles.input} value={styles.shopName} onChangeText={(v) => updateStyle('shopName', v)} placeholder="Patidar Restaurant" placeholderTextColor="#666" />
      </View>

      <Text style={uiStyles.sectionTitle}>Header Settings</Text>
      <View style={uiStyles.styleRow}>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>Shop Name Size</Text>
          <View style={uiStyles.stepper}>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billShopNameSize', -2)}><Text style={uiStyles.stepText}>-</Text></TouchableOpacity>
            <Text style={uiStyles.stepVal}>{styles.billShopNameSize}</Text>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billShopNameSize', 2)}><Text style={uiStyles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>Weight</Text>
          <View style={uiStyles.weightRow}>
            {WEIGHTS.map(w => (
              <TouchableOpacity key={w} style={[uiStyles.weightBtn, styles.billShopNameWeight === w && uiStyles.weightActive]} onPress={() => updateStyle('billShopNameWeight', w)}>
                <Text style={[uiStyles.weightText, styles.billShopNameWeight === w && uiStyles.weightTextActive]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <View style={uiStyles.styleRow}>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>Location/Time Size</Text>
          <View style={uiStyles.stepper}>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billMetaSize', -2)}><Text style={uiStyles.stepText}>-</Text></TouchableOpacity>
            <Text style={uiStyles.stepVal}>{styles.billMetaSize}</Text>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billMetaSize', 2)}><Text style={uiStyles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>Weight</Text>
          <View style={uiStyles.weightRow}>
            {WEIGHTS.map(w => (
              <TouchableOpacity key={w} style={[uiStyles.weightBtn, styles.billMetaWeight === w && uiStyles.weightActive]} onPress={() => updateStyle('billMetaWeight', w)}>
                <Text style={[uiStyles.weightText, styles.billMetaWeight === w && uiStyles.weightTextActive]}>{w}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>

      <Text style={uiStyles.sectionTitle}>Table & Totals</Text>
      <View style={uiStyles.styleRow}>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>Item Rows Size</Text>
          <View style={uiStyles.stepper}>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billItemSize', -2)}><Text style={uiStyles.stepText}>-</Text></TouchableOpacity>
            <Text style={uiStyles.stepVal}>{styles.billItemSize}</Text>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billItemSize', 2)}><Text style={uiStyles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>Total Amount Size</Text>
          <View style={uiStyles.stepper}>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billTotalSize', -4)}><Text style={uiStyles.stepText}>-</Text></TouchableOpacity>
            <Text style={uiStyles.stepVal}>{styles.billTotalSize}</Text>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billTotalSize', 4)}><Text style={uiStyles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={uiStyles.styleRow}>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>'Visit Again' Size</Text>
          <View style={uiStyles.stepper}>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billThanksSize', -2)}><Text style={uiStyles.stepText}>-</Text></TouchableOpacity>
            <Text style={uiStyles.stepVal}>{styles.billThanksSize}</Text>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('billThanksSize', 2)}><Text style={uiStyles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderKOTStyles = () => (
    <View>
      <Text style={uiStyles.sectionTitle}>KOT Layout</Text>
      <View style={uiStyles.styleRow}>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>KOT Title Size</Text>
          <View style={uiStyles.stepper}>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('kotTitleSize', -2)}><Text style={uiStyles.stepText}>-</Text></TouchableOpacity>
            <Text style={uiStyles.stepVal}>{styles.kotTitleSize}</Text>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('kotTitleSize', 2)}><Text style={uiStyles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>Category Header Size</Text>
          <View style={uiStyles.stepper}>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('kotCatSize', -2)}><Text style={uiStyles.stepText}>-</Text></TouchableOpacity>
            <Text style={uiStyles.stepVal}>{styles.kotCatSize}</Text>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('kotCatSize', 2)}><Text style={uiStyles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={uiStyles.styleRow}>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>Item Name Size</Text>
          <View style={uiStyles.stepper}>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('kotItemSize', -2)}><Text style={uiStyles.stepText}>-</Text></TouchableOpacity>
            <Text style={uiStyles.stepVal}>{styles.kotItemSize}</Text>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('kotItemSize', 2)}><Text style={uiStyles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={uiStyles.label}>KOT Time Size</Text>
          <View style={uiStyles.stepper}>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('kotTimeSize', -2)}><Text style={uiStyles.stepText}>-</Text></TouchableOpacity>
            <Text style={uiStyles.stepVal}>{styles.kotTimeSize}</Text>
            <TouchableOpacity style={uiStyles.stepBtn} onPress={() => adjustSize('kotTimeSize', 2)}><Text style={uiStyles.stepText}>+</Text></TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={uiStyles.overlay}>
        <View style={uiStyles.modal}>
          <View style={uiStyles.tabHeader}>
            {['card', 'bill', 'kot'].map(t => (
              <TouchableOpacity key={t} style={[uiStyles.tabBtn, activeTab === t && uiStyles.tabActive]} onPress={() => setActiveTab(t)}>
                <Text style={[uiStyles.tabBtnText, activeTab === t && uiStyles.tabBtnTextActive]}>
                  {t === 'card' ? '📦 Card' : t === 'bill' ? '🧾 Bill' : '🍳 KOT'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {activeTab === 'card' ? renderCardStyles() : activeTab === 'bill' ? renderBillStyles() : renderKOTStyles()}
          </ScrollView>

          <View style={uiStyles.actions}>
             <TouchableOpacity style={[uiStyles.btn, uiStyles.btnCancel]} onPress={onClose}>
               <Text style={uiStyles.btnText}>Cancel</Text>
             </TouchableOpacity>
             <TouchableOpacity style={[uiStyles.btn, uiStyles.btnSave]} onPress={() => { onSave(styles); onClose(); }}>
               <Text style={uiStyles.btnText}>Apply All</Text>
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const uiStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.85)", justifyContent: "center", alignItems: "center" },
  modal: { backgroundColor: "#111827", borderRadius: 32, padding: 24, width: isTablet ? 650 : "95%", height: "85%" },
  tabHeader: { flexDirection: 'row', gap: 8, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 20, padding: 4 },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 16 },
  tabActive: { backgroundColor: '#FFC300' },
  tabBtnText: { color: '#9CA3AF', fontWeight: '800', fontSize: 12 },
  tabBtnTextActive: { color: '#000' },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: "#6B7280", textTransform: "uppercase", marginBottom: 12, marginTop: 10 },
  previewBox: { flexDirection: 'row', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)', padding: 15, borderRadius: 20, marginBottom: 15 },
  label: { fontSize: 10, fontWeight: "700", color: "#9CA3AF", marginBottom: 6, textTransform: "uppercase" },
  colorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  colorCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: 'rgba(255,255,255,0.1)' },
  activeBorder: { borderColor: '#fff' },
  styleRow: { flexDirection: 'row', gap: 15, marginBottom: 15 },
  field: { marginBottom: 15 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10, color: '#fff', fontSize: 15 },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 3 },
  stepBtn: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 8 },
  stepText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  stepVal: { color: '#FFC300', fontSize: 16, fontWeight: '900', marginHorizontal: 12 },
  weightRow: { flexDirection: 'row', gap: 4 },
  weightBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.1)' },
  weightActive: { backgroundColor: '#34D399' },
  weightText: { color: '#9CA3AF', fontSize: 11, fontWeight: '800' },
  weightTextActive: { color: '#000' },
  infoText: { fontSize: 11, color: '#6B7280', fontStyle: 'italic' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 15, borderTopWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingTop: 15 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 14, alignItems: 'center' },
  btnCancel: { backgroundColor: 'rgba(255,255,255,0.1)' },
  btnSave: { backgroundColor: '#FFC300' },
  btnText: { fontWeight: '900', color: '#000', fontSize: 14 }
});
