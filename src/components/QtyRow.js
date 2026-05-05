import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/theme';

const isTablet = Dimensions.get('window').width > 600;

export default function QtyRow({ cartKey, qty, onAdd, onRemove }) {
  return (
    <View style={styles.qtyRow}>
      <TouchableOpacity style={styles.qtyBtn} onPress={(e) => { onRemove(cartKey); }}>
        <Text style={styles.qtyBtnText}>-</Text>
      </TouchableOpacity>
      <Text style={styles.qtyNum}>{qty}</Text>
      <TouchableOpacity style={styles.qtyBtn} onPress={(e) => { onAdd(cartKey); }}>
        <Text style={styles.qtyBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: isTablet ? 6 : 2,
    height: isTablet ? 56 : 32,
  },
  qtyBtn: {
    width: isTablet ? 56 : 28,
    height: isTablet ? 56 : 28,
    borderRadius: isTablet ? 14 : 8,
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  qtyBtnText: {
    color: "#34D399",
    fontSize: isTablet ? 26 : 18,
    fontWeight: "900",
  },
  qtyNum: {
    flex: 1,
    height: isTablet ? 56 : 32,
    marginHorizontal: isTablet ? 8 : 4,
    textAlign: "center",
    lineHeight: isTablet ? 56 : 32,
    textAlignVertical: "center",
    fontSize: isTablet ? 18 : 14,
    fontWeight: "900",
    color: "#ECFCCB",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: isTablet ? 12 : 8,
    borderWidth: 1,
    borderColor: "rgba(52, 211, 153, 0.2)",
    minWidth: 32,
  },
});