import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/theme';
import { SC_PRICE } from '../constants/menu';
import { scKey } from '../utils/helpers';
import QtyRow from './QtyRow';
import WeightSelector from './WeightSelector';

const { width } = Dimensions.get('window');
const isTablet = width > 600;

const FALLBACK_IMG = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80";

export default function ItemCard({ item, plainEntry, scEntry, onAddPlain, onAddSC, onRemove, onGrams }) {
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

  return (
    <View style={[styles.card, anyInCart && styles.cardOn]}>
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
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.price}>
          ₹{item.price} <Text style={styles.unit}>/{item.unit}</Text>
        </Text>

        {item.byWeight && plainEntry ? (
          <WeightSelector item={item} entry={plainEntry} onGrams={onGrams} />
        ) : null}

        {canSC && (
          <View style={styles.variants}>
            <View style={styles.vBlock}>
              <Text style={styles.vLabel} numberOfLines={1}>Plain</Text>
              {plainEntry ? (
                <View style={styles.qtyContainer}>
                  <QtyRow cartKey={item.id} qty={plainEntry.qty} onAdd={() => onAddPlain(item.id)} onRemove={onRemove} />
                </View>
              ) : (
                <TouchableOpacity style={[styles.addBtn, styles.addPlain]} onPress={() => onAddPlain(item.id)}>
                  <Text style={[styles.addBtnText, { color: "#34D399" }]}>Add +</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.vBlock, styles.vBlockSC]}>
              <Text style={styles.vLabel} numberOfLines={1}>+SC (+₹{SC_PRICE})</Text>
              {scEntry ? (
                <View style={styles.qtyContainer}>
                  <QtyRow cartKey={scKey(item.id)} qty={scEntry.qty} onAdd={() => onAddSC(item.id)} onRemove={onRemove} />
                </View>
              ) : (
                <TouchableOpacity style={[styles.addBtn, styles.addSCBtn]} onPress={() => onAddSC(item.id)}>
                  <Text style={[styles.addBtnText, { color: "#FBBF24" }]}>Add +</Text>
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
              <TouchableOpacity style={[styles.addBtn, styles.addFull]} onPress={() => onAddPlain(item.id)}>
                <Text style={[styles.addBtnText, { color: "#34D399" }]}>Add Item +</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {item.byWeight && !plainEntry && (
          <View style={styles.singleAction}>
            <TouchableOpacity style={[styles.addBtn, styles.addFull]} onPress={() => onAddPlain(item.id)}>
              <Text style={[styles.addBtnText, { color: "#34D399" }]}>Add Weight +</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#0F172A",
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    marginBottom: isTablet ? 12 : 8,
  },

  cardOn: {
    borderColor: "#34D399",
  },

  imgBox: {
    height: isTablet ? 160 : 120,
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
    shadowColor: "#000",
    shadowOpacity: 0.5,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },

  badgeText: {
    color: "#020617",
    fontSize: 12,
    fontWeight: "900",
  },

  info: {
    padding: isTablet ? 16 : 12,
  },

  name: {
    fontSize: isTablet ? 16 : 14,
    fontWeight: "800",
    color: "#F8FAFC",
    marginBottom: 4,
  },

  price: {
    fontSize: isTablet ? 15 : 14,
    fontWeight: "800",
    color: "#FBBF24",
    marginBottom: 8,
  },

  unit: {
    fontSize: 12,
    color: "#94A3B8",
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
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minHeight: isTablet ? 56 : 48,
  },

  vBlockSC: {
    backgroundColor: "rgba(245,158,11,0.04)",
  },

  vLabel: {
    flex: 1,
    fontSize: isTablet ? 13 : 11,
    color: "#CBD5E1",
    fontWeight: "600",
    marginRight: 6,
  },

  addBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  addFull: {
    width: "100%",
    backgroundColor: "rgba(52,211,153,0.1)",
    borderColor: "rgba(52,211,153,0.3)",
    paddingVertical: 4,
  },

  addPlain: {
    backgroundColor: "rgba(52,211,153,0.15)",
    borderColor: "rgba(52,211,153,0.4)",
  },

  addSCBtn: {
    backgroundColor: "rgba(245,158,11,0.15)",
    paddingVertical: 4,
    borderColor: "rgba(245,158,11,0.4)",
  },

  addBtnText: {
    fontSize: isTablet ? 14 : 12,
    fontWeight: "200",
  },

  qtyContainer: {
    minWidth: isTablet ? 120 : 100, // Provides enough space so QtyRow doesn't squish out of bounds
  }
});