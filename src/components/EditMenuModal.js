import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { MENU, ITEM_MAP } from '../constants/menu';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

export default function EditMenuModal({ visible, onClose, onUpdate, onDelete }) {
  const [selectedItemId, setSelectedItemId] = useState("");
  const [rate, setRate] = useState("");
  const [withSevChutney, setWithSevChutney] = useState(false);

  // Populate all available items for the picker
  const allItems = [];
  MENU.forEach(cat => {
    cat.items.forEach(item => {
      allItems.push({ ...item, categoryLabel: cat.label });
    });
  });

  // When selected item changes, update the rate input field
  useEffect(() => {
    if (selectedItemId && ITEM_MAP[selectedItemId]) {
      setRate(ITEM_MAP[selectedItemId].price.toString());
      setWithSevChutney(!!ITEM_MAP[selectedItemId].withSevChutney);
    } else {
      setRate("");
      setWithSevChutney(false);
    }
  }, [selectedItemId]);

  // Set default selection when modal opens
  useEffect(() => {
    if (visible && allItems.length > 0 && !selectedItemId) {
      setSelectedItemId(allItems[0].id);
    }
  }, [visible]);

  const handleUpdate = () => {
    if (!selectedItemId) return alert("Please select an item");
    if (!rate.trim()) return alert("Rate cannot be empty");
    
    onUpdate(selectedItemId, parseFloat(rate), withSevChutney);
    Alert.alert("Success", "Item updated successfully!");
    onClose();
  };

  const handleDelete = () => {
    if (!selectedItemId) return alert("Please select an item");
    
    if (Platform.OS === 'web') {
      if (window.confirm("Are you sure you want to delete this item from the menu?")) {
        onDelete(selectedItemId);
        setSelectedItemId("");
        onClose();
      }
    } else {
      Alert.alert(
        "Confirm Delete",
        "Are you sure you want to delete this item from the menu?",
        [
          { text: "Cancel", style: "cancel" },
          { 
            text: "Delete", 
            style: "destructive", 
            onPress: () => {
              onDelete(selectedItemId);
              Alert.alert("Deleted", "Item has been removed.");
              setSelectedItemId("");
              onClose();
            }
          }
        ]
      );
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.center}>
          <View style={styles.modal}>
            <Text style={styles.title}>Manage Menu Items</Text>

            <View style={styles.field}>
              <Text style={styles.label}>Select Item</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={selectedItemId}
                  onValueChange={(itemValue) => setSelectedItemId(itemValue)}
                  style={styles.picker}
                >
                  <Picker.Item label="-- Select an Item --" value="" />
                  {allItems.map(item => (
                    <Picker.Item key={item.id} label={`${item.name} (${item.categoryLabel})`} value={item.id} />
                  ))}
                </Picker>
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Update Rate / Price</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Enter new rate" 
                keyboardType="decimal-pad" 
                value={rate} 
                onChangeText={setRate} 
                placeholderTextColor="#888" 
              />
            </View>

            <TouchableOpacity style={styles.toggleRow} onPress={() => setWithSevChutney(!withSevChutney)}>
              <View style={[styles.checkbox, withSevChutney && styles.checkboxActive]}>
                {withSevChutney && <Text style={styles.checkIcon}>✓</Text>}
              </View>
              <Text style={styles.toggleLabel}>Enable Sev Chutney option?</Text>
            </TouchableOpacity>

            <View style={styles.actions}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
                <Text style={styles.btnCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btn, styles.btnDelete]} onPress={handleDelete}>
                <Text style={styles.btnDeleteText}>Delete Item</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={[styles.btn, styles.btnUpdate]} onPress={handleUpdate}>
                <Text style={styles.btnUpdateText}>Save Rate</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  center: { justifyContent: "center", alignItems: "center", width: "100%", padding: 20 },
  modal: { backgroundColor: "#fff", borderRadius: 24, padding: isTablet ? 32 : 24, width: isTablet ? 500 : "100%", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  title: { fontSize: 22, fontWeight: "800", color: "#000", marginBottom: 20, textAlign: "center" },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "rgba(0,0,0,0.8)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  pickerContainer: { backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.15)", borderRadius: 12, overflow: 'hidden' },
  picker: { height: 50, width: "100%" },
  input: { backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.15)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#000", fontWeight: "500" },
  actions: { flexDirection: "row", gap: 10, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnCancel: { backgroundColor: "rgba(0,0,0,0.1)" },
  btnCancelText: { color: "rgba(0,0,0,0.7)", fontWeight: "600", fontSize: 14 },
  btnDelete: { backgroundColor: "#EF4444" },
  btnDeleteText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  btnUpdate: { backgroundColor: "#3B82F6" },
  btnUpdateText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  toggleRow: { flexDirection: "row", alignItems: "center", marginTop: 16, marginBottom: 8, gap: 12 },
  checkbox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: "#3B82F6", alignItems: "center", justifyContent: "center" },
  checkboxActive: { backgroundColor: "#3B82F6" },
  checkIcon: { color: "#FFF", fontWeight: "900", fontSize: 14 },
  toggleLabel: { color: "#374151", fontSize: 14, fontWeight: "600" },
});
