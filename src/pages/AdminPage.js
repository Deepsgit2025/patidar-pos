import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Dimensions, Alert } from 'react-native';
import { COLORS } from '../constants/theme';
import { loadAsync, saveAsync } from '../utils/storage';
import { todayStr, monthKey, yearKey, fmtDate } from '../utils/helpers';
import PrinterSetupScreen from './PrinterSetupScreen';

const isTablet = Dimensions.get('window').width > 600;

const TABS = [
  { id: "sales", label: "📊 Sales" },
  { id: "employees", label: "👥 Employees" },
  { id: "purchases", label: "🛒 Purchases" },
  { id: "expenses", label: "💸 Expenses" },
  { id: "profit", label: "📈 Profit" },
  { id: "printer", label: "🖨️ Printer" },
  { id: "settings", label: "⚙️ Settings" },
];

export default function AdminPage({ shop }) {
  const [tab, setTab] = useState("sales");
  const [orders, setOrders] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [purchases, setPurchases] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selMonth, setSelMonth] = useState(todayStr().slice(0, 7));
  const [scPrice, setScPrice] = useState(13);


  const [empF, setEmpF] = useState({ name: "", phone: "", salary: "" });
  const [purF, setPurF] = useState({ item: "", amount: "", date: todayStr() });
  const [expF, setExpF] = useState({ desc: "", amount: "", date: todayStr() });

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [savedPin, setSavedPin] = useState("1234");
  const [newPin, setNewPin] = useState("");

  useEffect(() => {
    const fetchSecurity = async () => {
      const pin = await loadAsync("admin_pin", "1234");
      setSavedPin(pin);
    };
    fetchSecurity();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setOrders(await loadAsync("orders_" + shop, []));
      setEmployees(await loadAsync("emp_" + shop, []));
      setAttendance(await loadAsync("att_" + shop, {}));
      setPurchases(await loadAsync("pur_" + shop, []));
      setExpenses(await loadAsync("exp_" + shop, []));
      setScPrice(Number(await loadAsync("sc_price", 13)));
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

  const renderStatsCard = (label, val, sub) => (
    <View style={styles.statCard} key={label}>
      <Text style={styles.scLabel}>{label}</Text>
      <Text style={styles.scVal}>₹{val.toFixed(0)}</Text>
      {sub && <Text style={styles.scSub}>{sub}</Text>}
    </View>
  );

  if (!isAuthorized) {
    return (
      <View style={styles.loginWrap}>
        <View style={styles.loginCard}>
          <Text style={styles.loginEmoji}>🔐</Text>
          <Text style={styles.loginTitle}>Admin Access</Text>
          <Text style={styles.loginSub}>Please enter your 4-digit PIN</Text>
          <TextInput
            style={styles.pinInp}
            value={pinInput}
            onChangeText={t => {
              setPinInput(t);
              if (t === savedPin) setIsAuthorized(true);
            }}
            placeholder="****"
            placeholderTextColor="rgba(255,255,255,0.1)"
            keyboardType="numeric"
            secureTextEntry
            maxLength={4}
            autoFocus
          />
          {pinInput.length === 4 && pinInput !== savedPin && (
            <Text style={styles.errorText}>❌ Incorrect PIN</Text>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.adminWrap}>
      <View style={styles.adminHeader}>
        <Text style={styles.headerTitle}>Admin Dashboard</Text>
        <TouchableOpacity onPress={() => setIsAuthorized(false)} style={styles.btnLogout}>
          <Text style={styles.btnLogoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.adminTabbar}>
        {TABS.map(t => (
          <TouchableOpacity key={t.id} style={[styles.adminTab, tab === t.id && styles.adminTabOn]} onPress={() => setTab(t.id)}>
            <Text style={[styles.adminTabText, tab === t.id && styles.adminTabTextOn]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.adminBody} contentContainerStyle={styles.tabBodyContent}>
        {(tab === "sales" || tab === "employees" || tab === "profit") && (
          <View style={styles.rowFilter}>
            <Text style={styles.filterLabel}>Select Month:</Text>
            <TextInput
              style={styles.monthInp}
              value={selMonth}
              onChangeText={setSelMonth}
              placeholder="YYYY-MM"
              placeholderTextColor="#666"
            />
          </View>
        )}

        {tab === "sales" && (
          <View style={{ gap: 16 }}>
            <View style={styles.statsGrid}>
              {renderStatsCard("Today", tTotal, `${tOrders.length} orders`)}
              {renderStatsCard("Monthly", mTotal, `${mOrders.length} orders`)}
              {renderStatsCard("Annual", yTotal, `${yOrders.length} orders`)}
              {renderStatsCard("Total", allTotal, `${orders.length} orders`)}
            </View>

            <View style={styles.box}>
              <Text style={styles.boxTitle}>Category-wise Revenue</Text>
              {Object.entries(catSales).map(([cat, amt]) => (
                <View key={cat} style={styles.barRow}>
                  <Text style={styles.barLbl}>{cat}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${Math.min(100, (amt / (allTotal || 1)) * 100)}%` }]} />
                  </View>
                  <Text style={styles.barAmt}>₹{amt.toFixed(0)}</Text>
                </View>
              ))}
            </View>

            <View style={styles.box}>
              <Text style={styles.boxTitle}>Top Selling Items</Text>
              {Object.entries(itemSales).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([name, amt]) => (
                <View key={name} style={styles.tblRow}>
                  <Text style={styles.tblCellLeft}>{name}</Text>
                  <Text style={styles.tblCellRight}>₹{amt.toFixed(0)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {tab === "employees" && (
          <View style={{ gap: 16 }}>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>New Employee</Text>
              <View style={styles.formRow}>
                <TextInput style={styles.fInp} placeholder="Name" placeholderTextColor="#666" value={empF.name} onChangeText={t => setEmpF({ ...empF, name: t })} />
                <TextInput style={styles.fInp} placeholder="Phone" placeholderTextColor="#666" value={empF.phone} onChangeText={t => setEmpF({ ...empF, phone: t })} keyboardType="phone-pad" />
                <TextInput style={styles.fInp} placeholder="Daily Salary (₹)" placeholderTextColor="#666" value={empF.salary} onChangeText={t => setEmpF({ ...empF, salary: t })} keyboardType="numeric" />
                <TouchableOpacity style={styles.btnAdd} onPress={() => {
                  if (!empF.name || !empF.salary) return;
                  saveEmp([...employees, { id: Date.now().toString(), ...empF }]);
                  setEmpF({ name: "", phone: "", salary: "" });
                }}>
                  <Text style={styles.btnAddText}>Add Employee</Text>
                </TouchableOpacity>
              </View>
            </View>

            {employees.map(emp => {
              const present = getPresent(emp.id, selMonth);
              return (
                <View key={emp.id} style={styles.box}>
                  <View style={styles.empTop}>
                    <View style={styles.empAv}><Text style={styles.empAvText}>{emp.name[0]}</Text></View>
                    <View style={styles.empInfo}>
                      <Text style={styles.empName}>{emp.name}</Text>
                      <Text style={styles.empSub}>{emp.phone} · ₹{emp.salary}/day</Text>
                    </View>
                    <TouchableOpacity onPress={() => saveEmp(employees.filter(e => e.id !== emp.id))} style={styles.btnDelIcon}>
                      <Text style={styles.btnDelIconText}>✕</Text>
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
                  <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={styles.tblCellLeft}>Attendance: {present} days</Text>
                    <Text style={styles.tblCellRight}>Payable: ₹{present * Number(emp.salary)}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {tab === "purchases" && (
          <View style={{ gap: 16 }}>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>New Purchase</Text>
              <View style={styles.formRow}>
                <TextInput style={styles.fInp} placeholder="Item/Stock" placeholderTextColor="#666" value={purF.item} onChangeText={t => setPurF({ ...purF, item: t })} />
                <TextInput style={styles.fInp} placeholder="Amount (₹)" placeholderTextColor="#666" value={purF.amount} onChangeText={t => setPurF({ ...purF, amount: t })} keyboardType="numeric" />
                <TextInput style={styles.fInp} placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#666" value={purF.date} onChangeText={t => setPurF({ ...purF, date: t })} />
                <TouchableOpacity style={styles.btnAdd} onPress={() => {
                  if (!purF.item || !purF.amount) return;
                  savePur([...purchases, { id: Date.now(), ...purF }]);
                  setPurF({ item: "", amount: "", date: todayStr() });
                }}>
                  <Text style={styles.btnAddText}>Record Purchase</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.box}>
              <View style={styles.boxTitleRow}>
                <Text style={styles.boxTitle}>Recent Purchases</Text>
                <Text style={styles.ttlBadge}>Total: ₹{totPur}</Text>
              </View>
              {purchases.slice().reverse().map(p => (
                <View key={p.id} style={styles.tblRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tblCellRight}>{p.item}</Text>
                    <Text style={styles.tblCellLeft}>{fmtDate(p.date)}</Text>
                  </View>
                  <Text style={styles.tblCellRight}>₹{p.amount}</Text>
                  <TouchableOpacity onPress={() => savePur(purchases.filter(x => x.id !== p.id))} style={styles.btnDelIcon}>
                    <Text style={styles.btnDelIconText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {tab === "expenses" && (
          <View style={{ gap: 16 }}>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>New Expense</Text>
              <View style={styles.formRow}>
                <TextInput style={styles.fInp} placeholder="Description" placeholderTextColor="#666" value={expF.desc} onChangeText={t => setExpF({ ...expF, desc: t })} />
                <TextInput style={styles.fInp} placeholder="Amount (₹)" placeholderTextColor="#666" value={expF.amount} onChangeText={t => setExpF({ ...expF, amount: t })} keyboardType="numeric" />
                <TextInput style={styles.fInp} placeholder="Date (YYYY-MM-DD)" placeholderTextColor="#666" value={expF.date} onChangeText={t => setExpF({ ...expF, date: t })} />
                <TouchableOpacity style={styles.btnAdd} onPress={() => {
                  if (!expF.desc || !expF.amount) return;
                  saveExp([...expenses, { id: Date.now(), ...expF }]);
                  setExpF({ desc: "", amount: "", date: todayStr() });
                }}>
                  <Text style={styles.btnAddText}>Record Expense</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.box}>
              <View style={styles.boxTitleRow}>
                <Text style={styles.boxTitle}>Recent Expenses</Text>
                <Text style={styles.ttlBadge}>Total: ₹{totExp}</Text>
              </View>
              {expenses.slice().reverse().map(ex => (
                <View key={ex.id} style={styles.tblRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tblCellRight}>{ex.desc}</Text>
                    <Text style={styles.tblCellLeft}>{fmtDate(ex.date)}</Text>
                  </View>
                  <Text style={styles.tblCellRight}>₹{ex.amount}</Text>
                  <TouchableOpacity onPress={() => saveExp(expenses.filter(x => x.id !== ex.id))} style={styles.btnDelIcon}>
                    <Text style={styles.btnDelIconText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        )}

        {tab === "profit" && (
          <View style={{ gap: 16 }}>
            <View style={styles.statsGrid}>
              {renderStatsCard("Revenue", allTotal)}
              {renderStatsCard("Purchases", totPur)}
              {renderStatsCard("Expenses", totExp)}
              {renderStatsCard("Salaries", totSal)}
            </View>
            <View style={[styles.profitBanner, profit >= 0 ? styles.pfPos : styles.pfNeg]}>
              <Text style={styles.pfTag}>Net {profit >= 0 ? "Profit" : "Loss"}</Text>
              <Text style={styles.pfVal}>₹{Math.abs(profit).toFixed(0)}</Text>
              <Text style={styles.pfEq}>Total Revenue − (Purchases + Expenses + Salaries)</Text>
            </View>
          </View>
        )}

        {tab === "printer" && (
          <View style={{ minHeight: 600 }}>
            <PrinterSetupScreen />
          </View>
        )}

        {tab === "settings" && (
          <View style={{ gap: 16 }}>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>Security Settings</Text>
              <View style={styles.formRow}>
                <Text style={styles.fLabel}>New 4-Digit Admin PIN</Text>
                <TextInput
                  style={styles.fInp}
                  placeholder="Enter 4 digits"
                  placeholderTextColor="#666"
                  value={newPin}
                  onChangeText={setNewPin}
                  keyboardType="numeric"
                  maxLength={4}
                  secureTextEntry
                />
                <TouchableOpacity
                  style={styles.btnAdd}
                  onPress={async () => {
                    if (newPin.length !== 4) return Alert.alert("Error", "PIN must be 4 digits");
                    setSavedPin(newPin);
                    await saveAsync("admin_pin", newPin);
                    setNewPin("");
                    Alert.alert("Success", "✅ Admin PIN updated!");
                  }}
                >
                  <Text style={styles.btnAddText}>Save PIN</Text>
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.box}>
              <Text style={styles.tblCellLeft}>Shop ID: {shop}</Text>
            </View>
            <View style={styles.box}>
              <Text style={styles.boxTitle}>General Settings</Text>
              <View style={styles.formRow}>
                <Text style={styles.fLabel}>Default Sev Chutney (SC) Rate (₹)</Text>
                <TextInput
                  style={styles.fInp}
                  placeholder="e.g. 13"
                  placeholderTextColor="#666"
                  value={String(scPrice)}
                  onChangeText={t => setScPrice(t)}
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.btnAdd}
                  onPress={async () => {
                    await saveAsync("sc_price", Number(scPrice));
                    Alert.alert("Success", "✅ SC Rate updated!");
                  }}
                >
                  <Text style={styles.btnAddText}>Save SC Rate</Text>
                </TouchableOpacity>
              </View>
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
    backgroundColor: "#060403",
  },
  adminHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: isTablet ? 24 : 16,
    paddingTop: isTablet ? 30 : 20,
    backgroundColor: "rgba(232, 115, 10, 0.05)",
  },
  headerTitle: {
    fontSize: isTablet ? 28 : 22,
    fontWeight: '900',
    color: '#FFF0E6',
    letterSpacing: 1,
  },
  btnLogout: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  btnLogoutText: {
    color: '#FBBF8A',
    fontSize: 12,
    fontWeight: '700',
  },
  adminTabbar: {
    maxHeight: isTablet ? 75 : 65,
    backgroundColor: "transparent",
    paddingHorizontal: isTablet ? 10 : 5,
    marginBottom: 10,
  },
  adminTab: {
    paddingVertical: isTablet ? 12 : 10,
    paddingHorizontal: isTablet ? 24 : 18,
    borderRadius: 30,
    marginRight: isTablet ? 10 : 8,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    height: isTablet ? 50 : 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  adminTabOn: {
    backgroundColor: "rgba(232, 115, 10, 0.2)",
    borderColor: "rgba(232, 115, 10, 0.5)",
    shadowColor: "#E8730A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  adminTabText: {
    color: "rgba(255, 255, 255, 0.3)",
    fontSize: isTablet ? 14 : 13,
    fontWeight: "600",
  },
  adminTabTextOn: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  adminBody: {
    flex: 1,
  },
  tabBodyContent: {
    padding: isTablet ? 24 : 16,
    gap: isTablet ? 20 : 16,
    paddingBottom: 40,
  },
  rowFilter: {
    marginBottom: 5,
  },
  filterLabel: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  monthInp: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 16,
    color: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  statsGrid: {
    flexDirection: isTablet ? "row" : "column",
    flexWrap: isTablet ? "wrap" : "nowrap",
    gap: 16,
  },
  statCard: {
    width: isTablet ? "48%" : "100%",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  scLabel: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.4)",
    letterSpacing: 2,
    textTransform: "uppercase",
    fontWeight: "800",
    marginBottom: 4,
  },
  scVal: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  scSub: {
    fontSize: 12,
    color: "#E8730A",
    marginTop: 6,
    fontWeight: "700",
  },
  box: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
  },
  boxTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  boxTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  ttlBadge: {
    fontSize: 12,
    color: "#E8730A",
    backgroundColor: "rgba(232, 115, 10, 0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    fontWeight: "800",
  },
  barRow: {
    marginBottom: 12,
  },
  barLbl: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
    marginBottom: 4,
  },
  barTrack: {
    height: 8,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 4,
  },
  barFill: {
    height: "100%",
    backgroundColor: "#E8730A",
    borderRadius: 4,
  },
  barAmt: {
    color: "#FFF",
    fontSize: 12,
    marginTop: 4,
    fontWeight: "700",
  },
  tblRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.05)",
  },
  tblCellLeft: {
    color: "rgba(255, 255, 255, 0.6)",
    fontSize: 14,
  },
  tblCellRight: {
    color: "#FFF",
    fontWeight: "800",
    fontSize: 14,
  },
  formRow: {
    gap: 12,
    marginTop: 8,
  },
  fLabel: {
    color: "rgba(255, 255, 255, 0.5)",
    fontSize: 12,
  },
  fInp: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 16,
    color: "#FFF",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  btnAdd: {
    height: 54,
    backgroundColor: "#E8730A",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  btnAddText: {
    color: "#FFF",
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  empTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  empAv: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: "rgba(232, 115, 10, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  empAvText: {
    color: "#E8730A",
    fontWeight: "900",
    fontSize: 20,
  },
  empInfo: {
    flex: 1,
  },
  empName: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
  empSub: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 12,
  },
  attRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  attChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  attOn: {
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  attOff: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  attChipLabel: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "700",
  },
  profitBanner: {
    padding: 24,
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  pfPos: {
    backgroundColor: "rgba(52, 211, 153, 0.1)",
    borderColor: "rgba(52, 211, 153, 0.3)",
  },
  pfNeg: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  pfTag: {
    fontSize: 12,
    color: "rgba(255, 255, 255, 0.6)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 8,
  },
  pfVal: {
    fontSize: 42,
    fontWeight: "900",
    color: "#FFF",
  },
  pfEq: {
    fontSize: 10,
    color: "rgba(255, 255, 255, 0.3)",
    marginTop: 8,
  },
  loginWrap: {
    flex: 1,
    backgroundColor: "#060403",
    alignItems: "center",
    justifyContent: "center",
  },
  loginCard: {
    width: "85%",
    maxWidth: 400,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 32,
    padding: 32,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  loginEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  loginTitle: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 8,
  },
  loginSub: {
    color: "rgba(255, 255, 255, 0.4)",
    fontSize: 14,
    marginBottom: 24,
  },
  pinInp: {
    width: "100%",
    height: 60,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 20,
    textAlign: "center",
    fontSize: 32,
    fontWeight: "900",
    color: "#E8730A",
    letterSpacing: 20,
    borderWidth: 1,
    borderColor: "rgba(232, 115, 10, 0.3)",
  },
  errorText: {
    color: "#EF4444",
    marginTop: 16,
    fontWeight: "700",
  },
  btnDelIcon: {
    padding: 8,
  },
  btnDelIconText: {
    color: "#EF4444",
    fontSize: 16,
  }
});