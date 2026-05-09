import React, { useState, useEffect } from 'react';
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

const { width } = Dimensions.get('window');
const isTablet = width > 600;

export default function QuickAddModal({ visible, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [rate, setRate] = useState("");
  const [qty, setQty] = useState("1");

  useEffect(() => {
    if (visible) {
      setName("");
      setRate("");
      setQty("1");
    }
  }, [visible]);

  const handleAdd = () => {
    if (!name.trim() || !rate.trim()) return;
    onAdd({
      name: name.trim(),
      rate: parseFloat(rate) || 0,
      qty: parseInt(qty) || 1,
      isCustom: true
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.center}
        >
          <View style={styles.modal}>
            <Text style={styles.title}>⚡ Quick Add Item</Text>
            
            <View style={styles.field}>
              <Text style={styles.label}>Item Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Extra Butter"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.row}>
              <View style={[styles.field, { flex: 2 }]}>
                <Text style={styles.label}>Rate (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={rate}
                  onChangeText={setRate}
                  placeholderTextColor="#94A3B8"
                />
              </View>
              <View style={[styles.field, { flex: 1, marginLeft: 12 }]}>
                <Text style={styles.label}>Qty</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={qty}
                  onChangeText={setQty}
                  placeholderTextColor="#94A3B8"
                />
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleAdd}>
                <Text style={styles.btnSaveText}>Add to Bill</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.8)", justifyContent: "center", alignItems: "center" },
  center: { width: "100%", alignItems: "center" },
  modal: {
    backgroundColor: "#1E293B",
    borderRadius: 24,
    padding: isTablet ? 32 : 24,
    width: isTablet ? 450 : "90%",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  title: { fontSize: 22, fontWeight: "900", color: "#F8FAFC", marginBottom: 24, textAlign: "center" },
  field: { marginBottom: 20 },
  label: { fontSize: 12, fontWeight: "700", color: "#94A3B8", marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#F8FAFC",
  },
  row: { flexDirection: "row" },
  actions: { flexDirection: "row", gap: 12, marginTop: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  btnCancel: { backgroundColor: "rgba(255,255,255,0.05)" },
  btnCancelText: { color: "#94A3B8", fontWeight: "700" },
  btnSave: { backgroundColor: "#E8730A" },
  btnSaveText: { color: "#FFF", fontWeight: "900" },
});
