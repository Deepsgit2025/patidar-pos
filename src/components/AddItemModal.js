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
  Platform,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';

const { width, height } = Dimensions.get('window');
const isTablet = width > 600;

export default function AddItemModal({ visible, onClose, categories, onSave }) {
  const [name, setName] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState("kg"); // kg or pc
  const [withSevChutney, setWithSevChutney] = useState(false);
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  // Reset form when modal opens
  useEffect(() => {
    if (visible) {
      setName("");
      setPrice("");
      setUnit("kg");
      setWithSevChutney(false);
      setImage(null);
      setIsAddingCategory(false);
      setNewCategoryName("");
      if (categories && categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }
    }
  }, [visible]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return Alert.alert("Error", "Item Name is required");
    if (!selectedCategoryId && !isAddingCategory) return Alert.alert("Error", "Please select a category");
    if (isAddingCategory && !newCategoryName.trim()) return Alert.alert("Error", "Category name cannot be empty");
    if (!price.trim()) return Alert.alert("Error", "Price is required");

    const itemData = {
      id: name.toLowerCase().replace(/\s+/g, '_') + '_' + Date.now(),
      name: name.trim(),
      price: parseFloat(price),
      unit: unit === "kg" ? "kg" : "pc",
      byWeight: unit === "kg",
      withSevChutney,
      img: image,
      categoryName: isAddingCategory ? newCategoryName.trim() : null,
      categoryId: isAddingCategory ? null : selectedCategoryId
    };

    onSave(itemData);
  };

  return (
    <Modal 
      visible={visible} 
      transparent 
      animationType="slide" 
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === "ios" ? "padding" : "height"} 
          style={styles.container}
        >
          <View style={styles.modal}>
            <View style={styles.header}>
              <Text style={styles.title}>Add New Item</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>×</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
              {/* Item Name */}
              <View style={styles.field}>
                <Text style={styles.label}>Item Name *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Special Samosa"
                  placeholderTextColor="#888"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              {/* Category Selection */}
              <View style={styles.field}>
                <Text style={styles.label}>Category *</Text>
                {!isAddingCategory ? (
                  <>
                    <View style={styles.pickerContainer}>
                      <Picker
                        selectedValue={selectedCategoryId}
                        onValueChange={(val) => setSelectedCategoryId(val)}
                        style={styles.picker}
                      >
                        {categories.map(cat => (
                          <Picker.Item key={cat.id} label={`${cat.emoji} ${cat.label}`} value={cat.id} />
                        ))}
                      </Picker>
                    </View>
                    <TouchableOpacity 
                      style={styles.addCatBtn} 
                      onPress={() => setIsAddingCategory(true)}
                    >
                      <Text style={styles.addCatBtnText}>+ Add New Category</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <View style={styles.newCatRow}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      placeholder="e.g. New Category"
                      placeholderTextColor="#888"
                      value={newCategoryName}
                      onChangeText={setNewCategoryName}
                      autoFocus
                    />
                    <TouchableOpacity 
                      style={styles.confirmCatBtn}
                      onPress={() => {
                        if (newCategoryName.trim()) {
                          // The actual category creation happens on save, 
                          // but we "confirm" it here in the UI state
                          setIsAddingCategory(false);
                          // We'll show the new name in the dropdown area or just keep it selected
                        } else {
                          Alert.alert("Error", "Please enter a category name");
                        }
                      }}
                    >
                      <Text style={styles.confirmCatBtnText}>Add</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={styles.cancelCatBtn}
                      onPress={() => {
                        setIsAddingCategory(false);
                        setNewCategoryName("");
                      }}
                    >
                      <Text style={styles.cancelCatBtnText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {isAddingCategory === false && newCategoryName.trim() !== "" && (
                  <View style={styles.selectedNewCat}>
                    <Text style={styles.selectedNewCatText}>Selected: {newCategoryName}</Text>
                    <TouchableOpacity onPress={() => setNewCategoryName("")}>
                      <Text style={styles.removeNewCat}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Price */}
              <View style={styles.field}>
                <Text style={styles.label}>Price (₹) *</Text>
                <View style={styles.priceInputContainer}>
                  <Text style={styles.currencyPrefix}>₹</Text>
                  <TextInput
                    style={styles.priceInput}
                    placeholder="0.00"
                    placeholderTextColor="#888"
                    keyboardType="decimal-pad"
                    value={price}
                    onChangeText={setPrice}
                  />
                </View>
              </View>

              {/* Sold By (Unit) */}
              <View style={styles.field}>
                <Text style={styles.label}>Sold By</Text>
                <View style={styles.toggleGroup}>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, unit === "kg" && styles.toggleBtnActive]}
                    onPress={() => setUnit("kg")}
                  >
                    <Text style={[styles.toggleText, unit === "kg" && styles.toggleTextActive]}>kg (Kilogram)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, unit === "pc" && styles.toggleBtnActive]}
                    onPress={() => setUnit("pc")}
                  >
                    <Text style={[styles.toggleText, unit === "pc" && styles.toggleTextActive]}>pcs (Pieces)</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Sev & Chutney */}
              <View style={styles.field}>
                <Text style={styles.label}>Sev & Chutney Option</Text>
                <View style={styles.toggleGroup}>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, !withSevChutney && styles.toggleBtnActive]}
                    onPress={() => setWithSevChutney(false)}
                  >
                    <Text style={[styles.toggleText, !withSevChutney && styles.toggleTextActive]}>No</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.toggleBtn, withSevChutney && styles.toggleBtnActive]}
                    onPress={() => setWithSevChutney(true)}
                  >
                    <Text style={[styles.toggleText, withSevChutney && styles.toggleTextActive]}>Yes</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Item Photo */}
              <View style={styles.field}>
                <Text style={styles.label}>Item Photo (Optional)</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                  {image ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: image }} style={styles.preview} />
                      <View style={styles.changeBadge}>
                        <Text style={styles.changeBadgeText}>Change Photo</Text>
                      </View>
                    </View>
                  ) : (
                    <View style={styles.placeholder}>
                      <Text style={styles.placeholderIcon}>📸</Text>
                      <Text style={styles.placeholderText}>Browse local storage</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
              
              <View style={{ height: 40 }} />
            </ScrollView>

            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save Item</Text>
              </TouchableOpacity>
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
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "100%",
    height: Platform.OS === 'web' ? '90%' : '100%',
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: "#1A1D23",
    borderRadius: isTablet ? 32 : 0,
    width: isTablet ? 600 : "100%",
    height: isTablet ? "auto" : "100%",
    maxHeight: isTablet ? "90%" : "100%",
    overflow: "hidden",
    borderWidth: isTablet ? 1 : 0,
    borderColor: "rgba(255,255,255,0.1)",
  },
  header: {
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.05)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1A1D23",
  },
  title: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    fontSize: 32,
    color: "rgba(255,255,255,0.4)",
    fontWeight: "300",
  },
  form: {
    padding: 24,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: "800",
    color: "#E8730A",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 10,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  pickerContainer: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    overflow: "hidden",
  },
  picker: {
    color: "#FFFFFF",
    height: 60,
  },
  addCatBtn: {
    marginTop: 10,
    alignSelf: "flex-start",
  },
  addCatBtnText: {
    color: "#E8730A",
    fontWeight: "700",
    fontSize: 14,
  },
  newCatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cancelCatBtn: {
    padding: 10,
  },
  cancelCatBtnText: {
    color: "rgba(255,255,255,0.4)",
    fontWeight: "600",
    fontSize: 18,
  },
  confirmCatBtn: {
    backgroundColor: "#E8730A",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  confirmCatBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  selectedNewCat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(232, 115, 10, 0.1)',
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: 'rgba(232, 115, 10, 0.3)',
  },
  selectedNewCatText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  removeNewCat: {
    color: '#EF4444',
    fontWeight: '700',
    fontSize: 12,
  },
  priceInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 20,
  },
  currencyPrefix: {
    fontSize: 18,
    color: "#E8730A",
    fontWeight: "800",
    marginRight: 10,
  },
  priceInput: {
    flex: 1,
    paddingVertical: 16,
    fontSize: 18,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  toggleGroup: {
    flexDirection: "row",
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  toggleBtnActive: {
    backgroundColor: "rgba(232, 115, 10, 0.15)",
    borderColor: "#E8730A",
  },
  toggleText: {
    color: "rgba(255,255,255,0.4)",
    fontWeight: "700",
    fontSize: 14,
  },
  toggleTextActive: {
    color: "#FFFFFF",
  },
  imagePicker: {
    height: 180,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  placeholder: {
    alignItems: "center",
  },
  placeholderIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  placeholderText: {
    color: "rgba(255,255,255,0.3)",
    fontWeight: "600",
    fontSize: 14,
  },
  previewContainer: {
    width: "100%",
    height: "100%",
    position: "relative",
  },
  preview: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  changeBadge: {
    position: "absolute",
    bottom: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
  footer: {
    padding: 24,
    flexDirection: "row",
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.05)",
    backgroundColor: "#1A1D23",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
  },
  cancelBtnText: {
    color: "rgba(255,255,255,0.6)",
    fontWeight: "700",
    fontSize: 16,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    backgroundColor: "#E8730A",
    shadowColor: "#E8730A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontWeight: "900",
    fontSize: 16,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
});
