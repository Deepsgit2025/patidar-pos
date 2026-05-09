import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { SC_PRICE } from '../constants/menu';
import { scKey } from '../utils/helpers';
import QtyRow from './QtyRow';
import WeightSelector from './WeightSelector';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const FALLBACK_IMG = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80";

export default function ItemCard({ item, plainEntry, scEntry, onAddPlain, onAddSC, onRemove, onGrams, customStyles }) {
  const anyInCart = !!plainEntry || !!scEntry;
  const canSC = item.withSevChutney === true;

  const handleImageClick = () => {
    if (!anyInCart) {
      onAddPlain(item.id);
    } else {
      if (plainEntry) onRemove(item.id);
      if (scEntry) onRemove(scKey(item.id));
    }
  };

  // Dynamic Styles
  const cardBg = customStyles?.cardBg || "#000000";
  const cardBorder = customStyles?.cardBorder || "rgba(255, 255, 255, 0.95)";
  const textColor = customStyles?.textColor || "#FFFFFF";
  const priceColor = customStyles?.priceColor || "#FBBF24";
  const btnBg = customStyles?.btnBg || "#FFC300";

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: anyInCart ? "#34D399" : cardBorder }, anyInCart && styles.cardOn]}>
      <TouchableOpacity activeOpacity={0.8} onPress={handleImageClick} style={styles.imgBox}>
        <Image
          source={{ uri: item.img || FALLBACK_IMG }}
          style={styles.img}
          resizeMode="cover"
        />
        {anyInCart && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {item.byWeight ? "✓" : [plainEntry && plainEntry.qty, scEntry && `${scEntry.qty}SC`].filter(Boolean).join("+")}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.info}>
        <View style={styles.namePriceRow}>
          <Text style={[styles.name, { color: textColor }]}>{item.name}</Text>
          <Text style={[styles.price, { color: priceColor }]}>
            ₹{item.price} <Text style={[styles.unit, { color: textColor }]}>/{item.unit}</Text>
          </Text>
        </View>

        {item.byWeight && plainEntry ? (
          <WeightSelector item={item} entry={plainEntry} onGrams={onGrams} />
        ) : null}

        {canSC && (
          <View style={styles.variants}>
            <View style={styles.vBlock}>
              <Text style={[styles.vLabel, { color: textColor }]} numberOfLines={1}>Plain</Text>
              {plainEntry ? (
                <View style={styles.qtyContainer}>
                  <QtyRow cartKey={item.id} qty={plainEntry.qty} onAdd={() => onAddPlain(item.id)} onRemove={onRemove} />
                </View>
              ) : (
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: btnBg + '22', borderColor: btnBg }]} onPress={() => onAddPlain(item.id)}>
                  <Text style={[styles.addBtnText, { color: btnBg }]}>Add +</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.vBlock, styles.vBlockSC]}>
              <Text style={[styles.vLabel, { color: textColor }]} numberOfLines={1}>+ Sev Chutney</Text>
              {scEntry ? (
                <View style={styles.qtyContainer}>
                  <QtyRow cartKey={scKey(item.id)} qty={scEntry.qty} onAdd={() => onAddSC(item.id)} onRemove={onRemove} />
                </View>
              ) : (
                <TouchableOpacity style={[styles.addBtn, { backgroundColor: btnBg + '44', borderColor: btnBg }]} onPress={() => onAddSC(item.id)}>
                  <Text style={[styles.addBtnText, { color: btnBg }]}>Add +</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {!canSC && !item.byWeight && (
          <View style={styles.singleAction}>
            {plainEntry ? (
              <QtyRow cartKey={item.id} qty={plainEntry.qty} onAdd={() => onAddPlain(item.id)} onRemove={onRemove} />
            ) : (
              <TouchableOpacity style={[styles.addBtn, styles.addFull, { backgroundColor: btnBg + '22', borderColor: btnBg }]} onPress={() => onAddPlain(item.id)}>
                <Text style={[styles.addBtnText, { color: btnBg }]}>Add Item +</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.byWeight && !plainEntry && (
          <View style={styles.singleAction}>
            <TouchableOpacity style={[styles.addBtn, styles.addFull, { backgroundColor: btnBg + '22', borderColor: btnBg }]} onPress={() => onAddPlain(item.id)}>
              <Text style={[styles.addBtnText, { color: btnBg }]}>Add Weight +</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: isTablet ? 12 : 8,
  },
  cardOn: {
    borderColor: "#34D399",
  },
  imgBox: {
    height: isTablet ? 130 : 100,
    backgroundColor: "#020617",
    position: "relative",
  },
  img: {
    width: "100%",
    height: "100%",
  },
  badge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "#34D399",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#020617",
    fontSize: 12,
    fontWeight: "900",
  },
  info: {
    padding: isTablet ? 16 : 12,
  },
  namePriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: "800",
    flex: 1,
    marginRight: 8,
  },
  price: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: "800",
  },
  unit: {
    fontSize: 12,
    fontWeight: "600",
  },
  singleAction: {
    marginTop: 8,
    minHeight: isTablet ? 48 : 40,
    justifyContent: "center",
  },
  variants: {
    marginTop: 8,
    gap: 8,
  },
  vBlock: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: isTablet ? 56 : 48,
  },
  vBlockSC: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  vLabel: {
    flex: 1,
    fontSize: isTablet ? 13 : 11,
    fontWeight: "600",
    marginRight: 6,
  },
  addBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  addFull: {
    width: "100%",
    paddingVertical: 8,
  },
  addBtnText: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: "800",
  },
  qtyContainer: {
    minWidth: isTablet ? 120 : 100,
  }
});
