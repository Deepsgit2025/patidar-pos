import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { COLORS } from '../constants/theme';
import { loadAsync, saveAsync } from '../utils/storage';
import { todayStr, monthKey, yearKey, fmtDate } from '../utils/helpers';

const isTablet = Dimensions.get('window').width > 600;

const TABS = [
  { id: "sales", label: "📊 Sales" },
  { id: "employees", label: "👥 Employees" },
  { id: "purchases", label: "🛒 Purchases" },
  { id: "expenses", label: "💸 Expenses" },
  { id: "profit", label: "📈 Profit" },
];

export default function AdminPage({ shop }) {
  const [tab, setTab] = useState("sales");
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selMonth, setSelMonth] = useState(todayStr().slice(0, 7));

  const [empF, setEmpF] = useState({ name: "", phone: "", salary: "" });
  const [purF, setPurF] = useState({ item: "", amount: "", date: todayStr() });
  const [expF, setExpF] = useState({ desc: "", amount: "", date: todayStr() });

  useEffect(() => {
    const fetchData = async () => {
      setOrders(await loadAsync("orders_" + shop, []));
      setEmployees(await loadAsync("emp_" + shop, []));
      setAttendance(await loadAsync("att_" + shop, {}));
      setPurchases(await loadAsync("pur_" + shop, []));
      setExpenses(await loadAsync("exp_" + shop, []));
    };
    fetchData();
  }, [shop]);

  const saveEmp = async (v) => { setEmployees(v); await saveAsync("emp_" + shop, v); };
  const saveAtt = async (v) => { setAttendance(v); await saveAsync("att_" + shop, v); };
  const savePur = async (v) => { setPurchases(v); await saveAsync("pur_" + shop, v); };
  const saveExp = async (v) => { setExpenses(v); await saveAsync("exp_" + shop, v); };

  const tOrders = orders.filter(o => o.date.slice(0, 10) === todayStr());
  const mOrders = orders.filter(o => monthKey(o.date) === selMonth);
  const yOrders = orders.filter(o => yearKey(o.date) === selMonth.slice(0, 4));
  const allTotal = orders.reduce((s, o) => s + o.total, 0);
  const tTotal = tOrders.reduce((s, o) => s + o.total, 0);
  const mTotal = mOrders.reduce((s, o) => s + o.total, 0);
  const yTotal = yOrders.reduce((s, o) => s + o.total, 0);

  const itemSales = {};
  const catSales = {};
  orders.forEach(o => o.items?.forEach(it => {
    itemSales[it.name] = (itemSales[it.name] || 0) + it.amount;
    catSales[it.category] = (catSales[it.category] || 0) + it.amount;
  }));

  const getDaysInMonth = (monthStr) => {
    const [y, m] = monthStr.split("-").map(Number);
    return new Date(y, m, 0).getDate();
  };

  const getPresent = (empId, month) => {
    const days = getDaysInMonth(month);
    let c = 0;
    for (let d = 1; d <= days; d++) {
      if (attendance[`${empId}_${month}-${String(d).padStart(2, "0")}`]) c++;
    }
    return c;
  };

  const toggleAtt = (empId, date) => {
    const k = `${empId}_${date}`;
    saveAtt({ ...attendance, [k]: !attendance[k] });
  };

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().slice(0, 10);
  });

  const totPur = purchases.reduce((s, p) => s + Number(p.amount), 0);
  const totExp = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const totSal = employees.reduce((s, e) => s + getPresent(e.id, selMonth) * Number(e.salary), 0);
  const profit = allTotal - totPur - totExp - totSal;

  const renderStatsCard = (label, val, sub, cls) => {
    const colors = {
      green: COLORS.green, blue: COLORS.blue, orange: COLORS.orange, purple: COLORS.purple, red: COLORS.red
    };
    return (
      <View style={[styles.statCard, { borderTopColor: colors[cls], borderTopWidth: 3 }]} key={label}>
        <Text style={styles.scLabel}>{label}</Text>
        <Text style={styles.scVal}>₹{val.toFixed(2)}</Text>
        {sub && <Text style={styles.scSub}>{sub}</Text>}
      </View>
    );
  };

  return (
    <View style={styles.adminWrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.adminTabbar} contentContainerStyle={{ paddingHorizontal: 16 }}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} style={[styles.adminTab, tab === t.id && styles.adminTabOn]} onPress={() => setTab(t.id)}>
            <Text style={[styles.adminTabText, tab === t.id && styles.adminTabTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.adminBody} contentContainerStyle={styles.tabBodyContent}>

        {/* ROW FILTER FOR MONTH */}
        {(tab === "sales" || tab === "employees" || tab === "profit") && (
          <View style={styles.rowFilter}>
            <Text style={styles.filterLabel}>Month (YYYY-MM):</Text>
            <TextInput
              style={styles.monthInp}
              value={selMonth}
              onChangeText={setSelMonth}
              placeholder="YYYY-MM"
            />
          </View>
        )}

        {/* ── SALES TAB ── */}
        {tab === "sales" && (
          <View>
            <View style={styles.statsGrid}>
              {renderStatsCard("Today", tTotal, `${tOrders.length} orders`, "green")}
              {renderStatsCard("Monthly", mTotal, `${mOrders.length} orders`, "blue")}
              {renderStatsCard("Annual", yTotal, `${yOrders.length} orders`, "orange")}
              {renderStatsCard("All-time", allTotal, `${orders.length} orders`, "purple")}
            </View>

            <View style={styles.box}>
              <Text style={styles.boxTitle}>Category Sales</Text>
              {Object.keys(catSales).length === 0 ? (
                <Text style={styles.emptyTxt}>No sales yet</Text>
              ) : (
                Object.entries(catSales).map(([cat, amt]) => {
                  const pct = Math.min(100, (amt / (allTotal || 1)) * 100);
                  return (
                    <View key={cat} style={styles.barRow}>
                      <Text style={styles.barLbl}>{cat}</Text>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { width: `${pct}%` }]} />
                      </View>
                      <Text style={styles.barAmt}>₹{amt.toFixed(0)}</Text>
                    </View>
                  );
                })
              )}
            </View>

            <View style={styles.box}>
              <Text style={styles.boxTitle}>Item-wise Sales</Text>
              {Object.keys(itemSales).length === 0 ? (
                <Text style={styles.emptyTxt}>No data</Text>
              ) : (
                Object.entries(itemSales).sort((a, b) => b[1] - a[1]).map(([name, amt]) => (
                  <View key={name} style={styles.tblRow}>
                    <Text style={styles.tblCellLeft}>{name}</Text>
                    <Text style={styles.tblCellRight}>₹{amt.toFixed(0)}</Text>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ── EMPLOYEES TAB ── */}
        {tab === "employees" && (
          <View>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>Add Employee</Text>
              <View style={styles.formRow}>
                <TextInput style={styles.fInp} placeholder="Name" value={empF.name} onChangeText={t => setEmpF({ ...empF, name: t })} />
                <TextInput style={styles.fInp} placeholder="Phone" value={empF.phone} onChangeText={t => setEmpF({ ...empF, phone: t })} keyboardType="phone-pad" />
                <TextInput style={styles.fInp} placeholder="₹/day" value={empF.salary} onChangeText={t => setEmpF({ ...empF, salary: t })} keyboardType="numeric" />
                <TouchableOpacity style={styles.btnAdd} onPress={() => {
                  if (!empF.name || !empF.salary) return;
                  saveEmp([...employees, { id: Date.now().toString(), ...empF }]);
                  setEmpF({ name: "", phone: "", salary: "" });
                }}>
                  <Text style={styles.btnAddText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            {employees.length === 0 ? (
              <Text style={styles.emptyTxt}>No employees added yet</Text>
            ) : (
              employees.map(emp => {
                const present = getPresent(emp.id, selMonth);
                const salary = present * Number(emp.salary);
                return (
                  <View key={emp.id} style={styles.box}>
                    <View style={styles.empTop}>
                      <View style={styles.empAv}><Text style={styles.empAvText}>{emp.name[0]?.toUpperCase()}</Text></View>
                      <View style={styles.empInfo}>
                        <Text style={styles.empName}>{emp.name}</Text>
                        <Text style={styles.empSub}>📞 {emp.phone || "—"} · ₹{emp.salary}/day</Text>
                      </View>
                      <View style={styles.empNums}>
                        <Text style={styles.empNumText}>Present: {present}d</Text>
                        <Text style={styles.empNumText}>Salary: ₹{salary}</Text>
                      </View>
                      <TouchableOpacity style={styles.btnDelEmp} onPress={() => saveEmp(employees.filter(e => e.id !== emp.id))}>
                        <Text style={styles.btnDelEmpText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.attRow}>
                      {last7.map(date => {
                        const p = !!attendance[`${emp.id}_${date}`];
                        return (
                          <TouchableOpacity key={date} style={[styles.attChip, p ? styles.attOn : styles.attOff]} onPress={() => toggleAtt(emp.id, date)}>
                            <Text style={styles.attChipLabel}>{date.slice(8)}</Text>
                            <Text style={styles.attChipLabel}>{p ? "✓" : "✗"}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* ── PURCHASES TAB ── */}
        {tab === "purchases" && (
          <View>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>Add Purchase</Text>
              <View style={styles.formRow}>
                <TextInput style={styles.fInp} placeholder="Item" value={purF.item} onChangeText={t => setPurF({ ...purF, item: t })} />
                <TextInput style={styles.fInp} placeholder="Amount" value={purF.amount} onChangeText={t => setPurF({ ...purF, amount: t })} keyboardType="numeric" />
                <TextInput style={styles.fInp} placeholder="YYYY-MM-DD" value={purF.date} onChangeText={t => setPurF({ ...purF, date: t })} />
                <TouchableOpacity style={styles.btnAdd} onPress={() => {
                  if (!purF.item || !purF.amount) return;
                  savePur([...purchases, { id: Date.now(), ...purF }]);
                  setPurF({ item: "", amount: "", date: todayStr() });
                }}>
                  <Text style={styles.btnAddText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.box}>
              <View style={styles.boxTitleRow}>
                <Text style={styles.boxTitle}>History</Text>
                <Text style={styles.ttlBadge}>Total ₹{totPur.toFixed(2)}</Text>
              </View>
              {purchases.length === 0 ? (
                <Text style={styles.emptyTxt}>No purchases</Text>
              ) : (
                purchases.slice().reverse().map(p => (
                  <View key={p.id} style={styles.tblRow}>
                    <Text style={[styles.tblCellLeft, { flex: 1.5 }]}>{fmtDate(p.date)}</Text>
                    <Text style={[styles.tblCellLeft, { flex: 2 }]}>{p.item}</Text>
                    <Text style={[styles.tblCellRight, { flex: 1.5 }]}>₹{Number(p.amount).toFixed(2)}</Text>
                    <TouchableOpacity onPress={() => savePur(purchases.filter(x => x.id !== p.id))} style={styles.btnDelIcon}>
                      <Text style={styles.btnDelIconText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ── EXPENSES TAB ── */}
        {tab === "expenses" && (
          <View>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>Add Expense</Text>
              <View style={styles.formRow}>
                <TextInput style={styles.fInp} placeholder="Description" value={expF.desc} onChangeText={t => setExpF({ ...expF, desc: t })} />
                <TextInput style={styles.fInp} placeholder="Amount" value={expF.amount} onChangeText={t => setExpF({ ...expF, amount: t })} keyboardType="numeric" />
                <TextInput style={styles.fInp} placeholder="YYYY-MM-DD" value={expF.date} onChangeText={t => setExpF({ ...expF, date: t })} />
                <TouchableOpacity style={styles.btnAdd} onPress={() => {
                  if (!expF.desc || !expF.amount) return;
                  saveExp([...expenses, { id: Date.now(), ...expF }]);
                  setExpF({ desc: "", amount: "", date: todayStr() });
                }}>
                  <Text style={styles.btnAddText}>Add</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.box}>
              <View style={styles.boxTitleRow}>
                <Text style={styles.boxTitle}>History</Text>
                <Text style={styles.ttlBadge}>Total ₹{totExp.toFixed(2)}</Text>
              </View>
              {expenses.length === 0 ? (
                <Text style={styles.emptyTxt}>No expenses</Text>
              ) : (
                expenses.slice().reverse().map(ex => (
                  <View key={ex.id} style={styles.tblRow}>
                    <Text style={[styles.tblCellLeft, { flex: 1.5 }]}>{fmtDate(ex.date)}</Text>
                    <Text style={[styles.tblCellLeft, { flex: 2 }]}>{ex.desc}</Text>
                    <Text style={[styles.tblCellRight, { flex: 1.5 }]}>₹{Number(ex.amount).toFixed(2)}</Text>
                    <TouchableOpacity onPress={() => saveExp(expenses.filter(x => x.id !== ex.id))} style={styles.btnDelIcon}>
                      <Text style={styles.btnDelIconText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))
              )}
            </View>
          </View>
        )}

        {/* ── PROFIT TAB ── */}
        {tab === "profit" && (
          <View>
            <View style={styles.statsGrid}>
              {renderStatsCard("Revenue", allTotal, null, "green")}
              {renderStatsCard("Purchases", totPur, null, "red")}
              {renderStatsCard("Expenses", totExp, null, "orange")}
              {renderStatsCard("Salaries", totSal, null, "blue")}
            </View>

            <View style={[styles.profitBanner, profit >= 0 ? styles.pfPos : styles.pfNeg]}>
              <Text style={styles.pfTag}>Net {profit >= 0 ? "Profit" : "Loss"}</Text>
              <Text style={styles.pfVal}>{profit >= 0 ? "+" : ""}₹{Math.abs(profit).toFixed(2)}</Text>
              <Text style={styles.pfEq}>Revenue − Purchases − Expenses − Salaries</Text>
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}
const styles = StyleSheet.create({

  adminWrap: {
    flex: 1,
    backgroundColor: "#070503",
  },

  /* ── TAB BAR ── */
  adminTabbar: {
    maxHeight: isTablet ? 70 : 60,
    backgroundColor: "rgba(10, 7, 4, 0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(251, 100, 30, 0.1)",
    paddingHorizontal: isTablet ? 6 : 2,
  },

  adminTab: {
    paddingVertical: isTablet ? 11 : 9,
    paddingHorizontal: isTablet ? 22 : 15,
    borderRadius: 28,
    marginRight: isTablet ? 8 : 6,
    marginTop: isTablet ? 11 : 8,
    backgroundColor: "rgba(251, 100, 30, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(251, 100, 30, 0.1)",
  },

  adminTabOn: {
    backgroundColor: "rgba(251, 100, 30, 0.18)",
    borderColor: "rgba(251, 100, 30, 0.6)",
    shadowColor: "#FB641E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.45,
    shadowRadius: 11,
  },

  adminTabText: {
    color: "rgba(251, 180, 120, 0.34)",
    fontSize: isTablet ? 13 : 12,
    fontWeight: "600",
    letterSpacing: 0.3,
  },

  adminTabTextOn: {
    color: "#FBBF8A",
    fontWeight: "800",
    textShadowColor: "rgba(251,100,30,0.65)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 7,
  },

  /* ── BODY ── */
  adminBody: {
    flex: 1,
  },

  tabBodyContent: {
    padding: isTablet ? 20 : 14,
    gap: isTablet ? 16 : 13,
  },

  /* ── FILTER ── */
  rowFilter: {
    marginBottom: isTablet ? 4 : 2,
  },

  filterLabel: {
    color: "rgba(251, 180, 120, 0.3)",
    fontSize: isTablet ? 10 : 9,
    marginBottom: isTablet ? 7 : 5,
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontWeight: "700",
  },

  monthInp: {
    borderWidth: 1,
    borderColor: "rgba(251, 100, 30, 0.18)",
    borderRadius: isTablet ? 14 : 11,
    paddingVertical: isTablet ? 11 : 9,
    paddingHorizontal: isTablet ? 16 : 12,
    backgroundColor: "rgba(251, 100, 30, 0.05)",
    color: "#FBBF8A",
    fontSize: isTablet ? 14 : 13,
  },

  /* ── STATS GRID — 2-col on tablet, 1-col on mobile ── */
  statsGrid: {
    flexDirection: isTablet ? "row" : "column",
    flexWrap: isTablet ? "wrap" : "nowrap",
    gap: isTablet ? 12 : 10,
  },

  statCard: {
    // tablet: 2-up; mobile: full width
    width: isTablet ? `${(100 - 2) / 2}%` : "100%",
    backgroundColor: "rgba(251, 100, 30, 0.07)",
    borderRadius: isTablet ? 20 : 15,
    padding: isTablet ? 18 : 14,
    borderWidth: 1,
    borderColor: "rgba(251, 100, 30, 0.17)",
    shadowColor: "#FB641E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    overflow: "hidden",
    // no flex — avoid stretch
    alignSelf: "flex-start",
    minWidth: isTablet ? "48%" : "100%",
  },

  scLabel: {
    fontSize: isTablet ? 10 : 9,
    color: "rgba(251, 180, 120, 0.34)",
    letterSpacing: 1.8,
    textTransform: "uppercase",
    fontWeight: "700",
  },

  scVal: {
    fontSize: isTablet ? 30 : 24,
    fontWeight: "900",
    color: "#FFF0E6",
    letterSpacing: -0.5,
    marginTop: isTablet ? 4 : 2,
    textShadowColor: "rgba(251,100,30,0.3)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 12,
  },

  scSub: {
    fontSize: isTablet ? 12 : 10,
    color: "#FB9A5A",
    marginTop: isTablet ? 5 : 3,
    fontWeight: "600",
  },

  /* ── BOX ── */
  box: {
    backgroundColor: "rgba(251, 100, 30, 0.05)",
    borderRadius: isTablet ? 20 : 15,
    padding: isTablet ? 18 : 13,
    borderWidth: 1,
    borderColor: "rgba(251, 100, 30, 0.12)",
    shadowColor: "#FB641E",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
  },

  boxTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: isTablet ? 14 : 10,
  },

  boxTitle: {
    fontSize: isTablet ? 15 : 13,
    fontWeight: "800",
    color: "#FFE4CC",
    letterSpacing: 0.2,
  },

  ttlBadge: {
    fontSize: isTablet ? 11 : 10,
    color: "#FB9A5A",
    backgroundColor: "rgba(251, 100, 30, 0.13)",
    paddingHorizontal: isTablet ? 9 : 7,
    paddingVertical: isTablet ? 4 : 2,
    borderRadius: 9,
    fontWeight: "700",
    borderWidth: 1,
    borderColor: "rgba(251, 100, 30, 0.22)",
  },

  /* ── BAR GRAPH ── */
  barRow: {
    marginBottom: isTablet ? 13 : 10,
  },

  barLbl: {
    color: "rgba(251, 180, 120, 0.42)",
    fontSize: isTablet ? 12 : 11,
    marginBottom: isTablet ? 5 : 3,
    fontWeight: "600",
  },

  barTrack: {
    height: isTablet ? 11 : 8,
    backgroundColor: "rgba(255,255,255,0.025)",
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(251, 100, 30, 0.09)",
    overflow: "hidden",
  },

  barFill: {
    height: "100%",
    backgroundColor: "#FB641E",
    borderRadius: 6,
    shadowColor: "#FB641E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.65,
    shadowRadius: 7,
  },

  barAmt: {
    fontSize: isTablet ? 12 : 10,
    color: "#FBBF8A",
    marginTop: 3,
    fontWeight: "600",
  },

  /* ── TABLE ── */
  tblRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: isTablet ? 12 : 9,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(251, 100, 30, 0.07)",
  },

  tblCellLeft: {
    color: "rgba(251, 180, 120, 0.38)",
    fontSize: isTablet ? 13 : 12,
    fontWeight: "600",
  },

  tblCellRight: {
    color: "#FFE4CC",
    fontWeight: "800",
    fontSize: isTablet ? 13 : 12,
  },

  /* Empty state — styled placeholder */
  emptyTxt: {
    textAlign: "center",
    paddingVertical: isTablet ? 32 : 22,
    color: "rgba(251, 100, 30, 0.18)",
    fontSize: isTablet ? 13 : 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    fontWeight: "600",
  },

  emptyIcon: {
    textAlign: "center",
    fontSize: isTablet ? 36 : 28,
    opacity: 0.15,
    marginBottom: isTablet ? 8 : 5,
  },

  /* ── FORM ── */
  formRow: {
    gap: isTablet ? 12 : 9,
    marginTop: isTablet ? 12 : 9,
  },

  fInp: {
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(251, 100, 30, 0.17)",
    borderRadius: isTablet ? 14 : 11,
    paddingVertical: isTablet ? 12 : 10,
    paddingHorizontal: isTablet ? 16 : 12,
    backgroundColor: "rgba(251, 100, 30, 0.04)",
    color: "#FFE4CC",
    fontSize: isTablet ? 14 : 13,
  },

  btnAdd: {
    backgroundColor: "rgba(251, 100, 30, 0.18)",
    borderWidth: 1,
    borderColor: "rgba(251, 100, 30, 0.52)",
    paddingVertical: isTablet ? 13 : 11,
    borderRadius: isTablet ? 14 : 11,
    alignItems: "center",
    shadowColor: "#FB641E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 14,
    elevation: 7,
  },

  btnAddText: {
    color: "#FBBF8A",
    fontWeight: "900",
    fontSize: isTablet ? 14 : 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  /* ── EMPLOYEE CARD ── */
  empTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: isTablet ? 12 : 9,
  },

  empAv: {
    width: isTablet ? 50 : 40,
    height: isTablet ? 50 : 40,
    borderRadius: isTablet ? 25 : 20,
    backgroundColor: "rgba(251, 100, 30, 0.12)",
    borderWidth: 2,
    borderColor: "rgba(251, 100, 30, 0.4)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: isTablet ? 14 : 10,
    shadowColor: "#FB641E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 9,
    flexShrink: 0,
  },

  empAvText: {
    color: "#FB9A5A",
    fontWeight: "900",
    fontSize: isTablet ? 15 : 13,
  },

  empInfo: {
    flex: 1,
    minWidth: 0,   // allow text to ellipsis
  },

  empName: {
    color: "#FFE4CC",
    fontSize: isTablet ? 15 : 13,
    fontWeight: "800",
    numberOfLines: 1,
  },

  empSub: {
    color: "rgba(251, 180, 120, 0.32)",
    fontSize: isTablet ? 12 : 10,
    marginTop: 2,
    fontWeight: "600",
    numberOfLines: 1,
  },

  empNums: {
    alignItems: "flex-end",
    flexShrink: 0,
  },

  empNumText: {
    fontSize: isTablet ? 11 : 10,
    color: "rgba(251, 180, 120, 0.35)",
    fontWeight: "600",
  },

  btnDelEmp: {
    marginLeft: isTablet ? 12 : 8,
    padding: 4,
    flexShrink: 0,
  },

  btnDelEmpText: {
    color: "#FCA5A5",
    fontSize: isTablet ? 20 : 16,
    fontWeight: "900",
  },

  /* ── ATTENDANCE ── */
  attRow: {
    flexDirection: "row",
    gap: isTablet ? 6 : 4,
  },

  attChip: {
    flex: 1,
    paddingVertical: isTablet ? 9 : 7,
    borderRadius: isTablet ? 11 : 9,
    alignItems: "center",
    borderWidth: 1,
  },

  attOn: {
    backgroundColor: "rgba(251, 100, 30, 0.16)",
    borderColor: "rgba(251, 100, 30, 0.52)",
    shadowColor: "#FB641E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 7,
  },

  attOff: {
    backgroundColor: "rgba(255,255,255,0.025)",
    borderColor: "rgba(255,255,255,0.055)",
  },

  attChipLabel: {
    color: "#FBBF8A",
    fontSize: isTablet ? 11 : 9,
    fontWeight: "700",
    letterSpacing: 0.4,
  },

  /* ── PROFIT BANNER ── */
  profitBanner: {
    padding: isTablet ? 22 : 16,
    borderRadius: isTablet ? 20 : 15,
    alignItems: "center",
    borderWidth: 1,
  },

  pfPos: {
    backgroundColor: "rgba(52, 211, 153, 0.09)",
    borderColor: "rgba(52, 211, 153, 0.36)",
    shadowColor: "#34D399",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },

  pfNeg: {
    backgroundColor: "rgba(251, 100, 30, 0.1)",
    borderColor: "rgba(251, 100, 30, 0.38)",
    shadowColor: "#FB641E",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
  },

  pfTag: {
    fontSize: isTablet ? 11 : 10,
    color: "#FB9A5A",
    letterSpacing: 2.2,
    textTransform: "uppercase",
    fontWeight: "700",
    marginBottom: 5,
  },

  pfVal: {
    fontSize: isTablet ? 36 : 28,
    fontWeight: "900",
    color: "#FFF0E6",
    letterSpacing: -1,
    textShadowColor: "rgba(251,100,30,0.45)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },

  pfEq: {
    fontSize: isTablet ? 11 : 9,
    color: "rgba(251, 180, 120, 0.28)",
    marginTop: 5,
    letterSpacing: 0.4,
  },
});