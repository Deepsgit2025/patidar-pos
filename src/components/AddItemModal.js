import React, { useState } from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet, Dimensions, KeyboardAvoidingView, Platform, ScrollView, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MENU } from '../constants/menu';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

export default function AddItemModal({ visible, onClose, onAdd }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState(MENU[0].id);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [byWeight, setByWeight] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true, // Request base64
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      if (asset.base64) {
        setPhotoUrl(`data:image/jpeg;base64,${asset.base64}`);
      } else {
        setPhotoUrl(asset.uri);
      }
    }
  };

  const handleAdd = () => {
    if (!name.trim() || !price.trim()) {
      alert("Name and Price are required!");
      return;
    }

    const newItem = {
      id: "custom_" + Date.now(),
      name: name.trim(),
      price: parseFloat(price),
      byWeight: byWeight,
      unit: byWeight ? "kg" : "pc",
      img: photoUrl.trim() || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80" // default food image
    };

    let finalCategoryId = category;
    if (category === 'new') {
      if (!newCategoryName.trim()) {
        alert("Please enter a name for the new category.");
        return;
      }
      finalCategoryId = newCategoryName.trim();
    }

    onAdd(newItem, finalCategoryId);

    setName("");
    setPrice("");
    setByWeight(false);
    setPhotoUrl("");
    setNewCategoryName("");
    setCategory(MENU[0].id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.center}>
          <View style={styles.modal}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.title}>Add New Menu Item</Text>

              <View style={styles.field}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput style={styles.input} placeholder="e.g. Paneer Tikka" value={name} onChangeText={setName} placeholderTextColor="#888" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Price / Rate *</Text>
                <TextInput style={styles.input} placeholder="e.g. 150" keyboardType="decimal-pad" value={price} onChangeText={setPrice} placeholderTextColor="#888" />
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.chipRow}>
                  {MENU.map(cat => (
                    <TouchableOpacity key={cat.id} style={[styles.chip, category === cat.id && styles.chipActive]} onPress={() => setCategory(cat.id)}>
                      <Text style={[styles.chipText, category === cat.id && styles.chipTextActive]}>{cat.label}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity style={[styles.chip, category === 'new' && styles.chipActive]} onPress={() => setCategory('new')}>
                    <Text style={[styles.chipText, category === 'new' && styles.chipTextActive]}>+ New Category</Text>
                  </TouchableOpacity>
                </View>
                {category === 'new' && (
                  <TextInput
                    style={[styles.input, { marginTop: 10 }]}
                    placeholder="Enter new category name..."
                    value={newCategoryName}
                    onChangeText={setNewCategoryName}
                    placeholderTextColor="#888"
                  />
                )}
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Selling Type</Text>
                <View style={styles.chipRow}>
                  <TouchableOpacity style={[styles.chip, !byWeight && styles.chipActive]} onPress={() => setByWeight(false)}>
                    <Text style={[styles.chipText, !byWeight && styles.chipTextActive]}>Quantity (pcs)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.chip, byWeight && styles.chipActive]} onPress={() => setByWeight(true)}>
                    <Text style={[styles.chipText, byWeight && styles.chipTextActive]}>Weight (kg/g)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.field}>
                <Text style={styles.label}>Photo URL (Optional)</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput style={[styles.input, { flex: 1 }]} placeholder="https://..." value={photoUrl} onChangeText={setPhotoUrl} placeholderTextColor="#888" />
                  <TouchableOpacity style={styles.imageBtn} onPress={pickImage}>
                    <Text style={styles.imageBtnText}>🖼 Pick</Text>
                  </TouchableOpacity>
                </View>
                {photoUrl ? (
                  <View style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', height: 100, width: 100, backgroundColor: 'rgba(0,0,0,0.05)' }}>
                    <Image source={{ uri: photoUrl }} style={{ width: '100%', height: '100%' }} />
                  </View>
                ) : null}
              </View>

              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
                  <Text style={styles.btnCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.btnAdd]} onPress={handleAdd}>
                  <Text style={styles.btnAddText}>Save Item</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.7)", justifyContent: "center", alignItems: "center" },
  center: { justifyContent: "center", alignItems: "center", width: "100%", padding: 20 },
  modal: { backgroundColor: "#fff", borderRadius: 24, padding: isTablet ? 32 : 24, width: isTablet ? 450 : "100%", maxHeight: "90%", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 10 },
  title: { fontSize: 22, fontWeight: "800", color: "#000", marginBottom: 20, textAlign: "center" },
  field: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: "600", color: "rgba(0,0,0,0.8)", marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 },
  input: { backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.15)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: "#000", fontWeight: "500" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  chipActive: { backgroundColor: "#000", borderColor: "#000" },
  chipText: { color: "rgba(0,0,0,0.6)", fontWeight: "600", fontSize: 14 },
  chipTextActive: { color: "#fff" },
  imageBtn: { backgroundColor: "rgba(0,0,0,0.05)", borderWidth: 1, borderColor: "rgba(0,0,0,0.15)", borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  imageBtnText: { fontSize: 16, fontWeight: '600', color: "rgba(0,0,0,0.8)" },
  actions: { flexDirection: "row", gap: 12, marginTop: 24 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnCancel: { backgroundColor: "rgba(0,0,0,0.1)" },
  btnCancelText: { color: "rgba(0,0,0,0.7)", fontWeight: "600", fontSize: 15 },
  btnAdd: { backgroundColor: "#FFC300" },
  btnAddText: { color: "#000", fontWeight: "800", fontSize: 15 }
});
