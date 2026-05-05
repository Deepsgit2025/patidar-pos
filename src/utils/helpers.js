import { SC_PRICE } from '../constants/menu';

export const todayStr = () => new Date().toISOString().slice(0, 10);

export const fmtDate = d => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "Invalid Date";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

export const fmtTime = d => {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "--:--";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

export const monthKey = d => d.slice(0, 7);
export const yearKey = d => d.slice(0, 4);

export function gramsFromRs(item, rs) {
  const amt = parseFloat(rs) || 0;
  return item.per === 100 ? (amt / item.price) * 100 : (amt / item.price) * 1000;
}

export function rsFromGrams(item, g) {
  const grams = parseFloat(g) || 0;
  return item.per === 100 ? (item.price / 100) * grams : (item.price / 1000) * grams;
}

export const scKey = (id) => `${id}__sc`;
export const isScKey = (k) => k.endsWith("__sc");
export const baseId = (k) => isScKey(k) ? k.slice(0, -4) : k;

export function calcAmt(item, entry) {
  if (!item) {
    // Handle custom items
    return (entry.rate || 0) * (entry.qty || 1);
  }
  if (item.byWeight) {
    const g = parseFloat(entry.grams) || 0;
    return item.per === 100 ? (item.price / 100) * g : (item.price / 1000) * g;
  }
  const unitPrice = item.price + (entry.isSC ? SC_PRICE : 0);
  return unitPrice * (entry.qty || 1);
}
