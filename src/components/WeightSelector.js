import React, { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/theme';
import { rsFromGrams, gramsFromRs } from '../utils/helpers';

const isTablet = Dimensions.get('window').width > 600;

export default function WeightSelector({ item, entry, onGrams }) {
  const [customRs, setCustomRs] = useState('');
  const grams = parseFloat(entry.grams) || 0;
  const price = rsFromGrams(item, grams);

  const addRs = (rupees) => {
    const extra = gramsFromRs(item, rupees);
    onGrams(item.id, grams + extra);
  };
  const sub = (g) => onGrams(item.id, Math.max(0, grams - g));
  const reset = () => onGrams(item.id, 0);

  const handleCustomSubmit = () => {
    const val = parseFloat(customRs);
    if (!isNaN(val) && val > 0) {
      addRs(val);
      setCustomRs('');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.stepper}>
        <TouchableOpacity style={styles.stepBtn} onPress={() => sub(100)}>
          <Text style={styles.stepBtnText}>-</Text>
        </TouchableOpacity>

        <View style={styles.stepDisplay}>
          <Text style={styles.gramText}>
            {grams > 0 ? `${Math.round(grams)}g` : "0g"}
          </Text>
          <Text style={styles.priceSub}>
            ₹{Math.round(price)}
          </Text>
        </View>
        <TouchableOpacity style={styles.stepBtn} onPress={() => onGrams(item.id, grams + 100)}>
          <Text style={styles.stepBtnText}>+</Text>
        </TouchableOpacity>

        {grams > 0 && (
          <TouchableOpacity style={styles.resetX} onPress={reset}>
            <Text style={styles.resetXText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.moneyArea}>
        <View style={styles.moneyBtnsRow}>
          {[20, 50, 100].map((rs) => (
            <TouchableOpacity key={rs} style={styles.rsBtn} onPress={() => addRs(rs)}>
              <Text style={styles.rsBtnText}>+₹{rs}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.rsInput}
          placeholder="₹ Custom..."
          placeholderTextColor="#64748B"
          keyboardType="numeric"
          value={customRs}
          onChangeText={setCustomRs}
          onSubmitEditing={handleCustomSubmit}
          returnKeyType="done"
        />
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    width: "100%",
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: isTablet ? 56 : 38, // reduced height for mobile tight grids
  },
  stepBtn: {
    width: isTablet ? 46 : 28, // smaller
    height: isTablet ? 46 : 28,
    borderRadius: isTablet ? 12 : 8,
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  stepBtnText: {
    color: "#FBBF24",
    fontSize: isTablet ? 22 : 18,
    fontWeight: "900",
  },
  stepDisplay: {
    flex: 1,
    height: isTablet ? 46 : 32,
    marginHorizontal: isTablet ? 8 : 4,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    minWidth: 46,
  },
  gramText: {
    fontSize: isTablet ? 15 : 12,
    fontWeight: "900",
    color: "#F8FAFC",
  },
  priceSub: {
    fontSize: isTablet ? 11 : 9,
    color: "#FBBF24",
    fontWeight: "700",
  },
  resetX: {
    width: isTablet ? 46 : 28,
    height: isTablet ? 46 : 28,
    borderRadius: isTablet ? 12 : 8,
    marginLeft: isTablet ? 8 : 4,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  resetXText: {
    color: "#FCA5A5",
    fontSize: isTablet ? 16 : 12,
    fontWeight: "900",
  },
  moneyArea: {
    marginTop: 8,
    gap: 6,
  },
  moneyBtnsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: isTablet ? 8 : 6,
  },
  rsBtn: {
    flex: 1,
    height: isTablet ? 44 : 34,
    borderRadius: 8,
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  rsBtnText: {
    color: "#FDE68A",
    fontSize: isTablet ? 14 : 12,
    fontWeight: "800",
  },
  rsInput: {
    width: "100%",
    height: isTablet ? 44 : 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    color: "#F8FAFC",
    fontSize: isTablet ? 15 : 12,
    fontWeight: "700",
    textAlign: "center",
  },
});