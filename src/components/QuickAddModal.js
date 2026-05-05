import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

export default function QuickAddModal({ visible, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [quantity, setQuantity] = useState("");
  const [discount, setDiscount] = useState("");
  const [activeField, setActiveField] = useState("rate"); // 'rate', 'qty', 'disc'

  const handleAdd = () => {
    if (!rate.trim() || !quantity.trim()) {
      alert("Rate and Quantity are required!");
      return;
    }

    onAdd({
      name: name.trim() || "Custom Item",
      rate: parseFloat(rate),
      qty: parseInt(quantity) || 1
    });

    resetState();
    onClose();
  };

  const handleCancel = () => {
    resetState();
    onClose();
  };

  const resetState = () => {
    setName("");
    setRate("");
    setQuantity("");
    setDiscount("");
    setActiveField("rate");
  };

  const handleNumpadPress = (val) => {
    if (val === 'Qty') {
      setActiveField('qty');
      return;
    }
    if (val === 'Price') {
      setActiveField('rate');
      return;
    }
    if (val === '% Disc') {
      setActiveField('disc');
      return;
    }
    
    let currentVal = activeField === 'rate' ? rate : (activeField === 'qty' ? quantity : discount);
    
    if (val === 'DEL') {
      currentVal = currentVal.slice(0, -1);
    } else if (val === '+/-') {
      if (currentVal.startsWith('-')) currentVal = currentVal.substring(1);
      else if (currentVal !== '') currentVal = '-' + currentVal;
    } else if (val === '.') {
      if (!currentVal.includes('.')) currentVal += '.';
    } else {
      currentVal += val;
    }

    if (activeField === 'rate') setRate(currentVal);
    else if (activeField === 'qty') setQuantity(currentVal);
    else setDiscount(currentVal);
  };

  const NumpadBtn = ({ label, isAction, isMode, isActive }) => (
    <TouchableOpacity
      style={[
        styles.numBtn,
        isAction && styles.numBtnAction,
        isMode && styles.numBtnMode,
        isActive && styles.numBtnModeActive
      ]}
      onPress={() => handleNumpadPress(label)}
    >
      <Text style={[
        styles.numBtnText,
        (isAction || isMode) && styles.numBtnTextAction,
        isActive && styles.numBtnTextModeActive
      ]}>
        {label === 'DEL' ? '⌫' : label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.center}>
          <View style={styles.modal}>
            
            {/* LEFT SIDE: FORM */}
            <View style={styles.formSection}>
              <Text style={styles.title}>Quick Add Item</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Item Name (Optional)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Kachori"
                  placeholderTextColor="rgba(0, 0, 0, 0.4)"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, activeField === 'rate' && styles.labelActive]}>Rate *</Text>
                <TouchableOpacity style={[styles.input, activeField === 'rate' && styles.inputActive]} onPress={() => setActiveField('rate')}>
                  <Text style={[styles.inputText, !rate && styles.inputPlaceholder]}>{rate || "Enter rate"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.field}>
                <Text style={[styles.label, activeField === 'qty' && styles.labelActive]}>Quantity *</Text>
                <TouchableOpacity style={[styles.input, activeField === 'qty' && styles.inputActive]} onPress={() => setActiveField('qty')}>
                  <Text style={[styles.inputText, !quantity && styles.inputPlaceholder]}>{quantity || "Enter quantity"}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={handleCancel}>
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnAdd]} onPress={handleAdd}>
                  <Text style={styles.btnAddText}>Add Item</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* RIGHT SIDE: NUMPAD */}
            <View style={styles.numpadSection}>
              <View style={styles.numRow}>
                <NumpadBtn label="1" />
                <NumpadBtn label="2" />
                <NumpadBtn label="3" />
                <NumpadBtn label="Qty" isMode isActive={activeField === 'qty'} />
              </View>
              <View style={styles.numRow}>
                <NumpadBtn label="4" />
                <NumpadBtn label="5" />
                <NumpadBtn label="6" />
                <NumpadBtn label="% Disc" isMode isActive={activeField === 'disc'} />
              </View>
              <View style={styles.numRow}>
                <NumpadBtn label="7" />
                <NumpadBtn label="8" />
                <NumpadBtn label="9" />
                <NumpadBtn label="Price" isMode isActive={activeField === 'rate'} />
              </View>
              <View style={styles.numRow}>
                <NumpadBtn label="+/-" isAction />
                <NumpadBtn label="0" />
                <NumpadBtn label="." isAction />
                <NumpadBtn label="DEL" isAction />
              </View>
            </View>

          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
  modal: {
    flexDirection: isTablet ? "row" : "column",
    backgroundColor: "#fff",
    borderRadius: 24,
    width: isTablet ? 700 : Math.min(width - 40, 400),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
    overflow: "hidden"
  },
  formSection: {
    flex: 1,
    padding: isTablet ? 32 : 24,
  },
  numpadSection: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    padding: isTablet ? 24 : 16,
    borderLeftWidth: isTablet ? 1 : 0,
    borderTopWidth: isTablet ? 0 : 1,
    borderColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
  },
  title: {
    fontSize: isTablet ? 22 : 20,
    fontWeight: "800",
    color: "#000",
    marginBottom: 20,
  },
  field: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(0, 0, 0, 0.5)",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  labelActive: {
    color: "#34D399",
    fontWeight: "800",
  },
  input: {
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    borderWidth: 2,
    borderColor: "transparent",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: isTablet ? 14 : 12,
    justifyContent: "center"
  },
  inputActive: {
    borderColor: "#34D399",
    backgroundColor: "rgba(52, 211, 153, 0.05)",
  },
  inputText: {
    fontSize: 16,
    color: "#000",
    fontWeight: "500",
  },
  inputPlaceholder: {
    color: "rgba(0, 0, 0, 0.4)"
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  btn: {
    flex: 1,
    paddingVertical: isTablet ? 14 : 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancel: {
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  btnCancelText: {
    color: "rgba(0, 0, 0, 0.7)",
    fontWeight: "600",
    fontSize: 15,
  },
  btnAdd: {
    backgroundColor: "#34D399",
  },
  btnAddText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  
  /* NUMPAD STYLES */
  numRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    gap: 8
  },
  numBtn: {
    flex: 1,
    aspectRatio: 1.2,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  numBtnAction: {
    backgroundColor: "#F1F5F9",
  },
  numBtnMode: {
    backgroundColor: "#E2E8F0",
  },
  numBtnModeActive: {
    backgroundColor: "#E0F2FE",
    borderWidth: 1,
    borderColor: "#38BDF8",
  },
  numBtnText: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
  },
  numBtnTextAction: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
  },
  numBtnTextModeActive: {
    color: "#0284C7",
    fontWeight: "800",
  }
});
