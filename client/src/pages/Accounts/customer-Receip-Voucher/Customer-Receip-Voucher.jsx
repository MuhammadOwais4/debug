import { useState, useEffect, useCallback } from "react";

const BASE_URL = "https://debug-nxby.vercel.app";
const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

const http = {
  get: async (path) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const txt = await res.text();
      throw new Error(`Server JSON nahi bheja (HTTP ${res.status}) — URL: ${BASE_URL}${path} — Jawab: ${txt.slice(0, 120)}`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  },
  post: async (path, body) => {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}) },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) {
      const txt = await res.text();
      throw new Error(`Server JSON nahi bheja (HTTP ${res.status}) — URL: ${BASE_URL}${path} — Jawab: ${txt.slice(0, 120)}`);
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
    return data;
  },
};

const ledgerAPI = { getAllAccounts: () => http.get("/api/ledgers/accounts") };

// ── CRV API ───────────────────────────────────────────────────────────────────
const crvAPI = {
  getCustomers:           () => http.get("/api/customer-receipt/customers"),
  getSaleJournalByCustomer: ({ customerId, fromDate, toDate }) => {
    const p = new URLSearchParams({ customerId: customerId || "", fromDate: fromDate || "", toDate: toDate || "" });
    return http.get(`/api/customer-receipt/sale-journal?${p}`);
  },
  saveVoucher: (payload)  => http.post("/api/customer-receipt", payload),
  getHistory:  (customerId) =>
    http.get(customerId ? `/api/customer-receipt?customerId=${customerId}` : `/api/customer-receipt`),
};

// ── Tax options ───────────────────────────────────────────────────────────────
const TAX_OPTIONS = [
  { label: "No Tax (0%)", value: 0      },
  { label: "0.25%",       value: 0.0025 },
  { label: "0.50%",       value: 0.005  },
  { label: "1%",          value: 0.01   },
];

const todayISO = () => new Date().toISOString().split("T")[0];
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
const fmtNum   = (n) => Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const S = {
  wrap:    { fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", fontSize: 13, backgroundColor: "#f0f4f8", minHeight: "100vh", color: "#222" },
  header:  { background: "linear-gradient(90deg,#14532d 0%,#16a34a 100%)", color: "#fff", padding: "10px 18px", fontSize: 15, fontWeight: 600, letterSpacing: 0.3 },
  toolbar: { background: "#e8edf2", borderBottom: "1px solid #c8d3de", padding: "6px 14px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  btn: (v = "default") => ({
    padding: "4px 16px", borderRadius: 3, border: "1px solid", height: 28, fontSize: 12, fontWeight: 500,
    cursor: v === "disabled" ? "not-allowed" : "pointer",
    background:  v === "primary" ? "#16a34a" : v === "danger" ? "#dc2626" : v === "success" ? "#16a34a" : v === "disabled" ? "#d1d5db" : "#fff",
    color:       v === "primary" || v === "danger" || v === "success" ? "#fff" : v === "disabled" ? "#6b7280" : "#374151",
    borderColor: v === "primary" ? "#15803d" : v === "danger" ? "#b91c1c" : v === "success" ? "#15803d" : v === "disabled" ? "#9ca3af" : "#9ca3af",
  }),
  form:     { background: "#fff", margin: "12px 14px 0", borderRadius: 6, border: "1px solid #d1d9e0", padding: "14px 18px" },
  row:      { display: "grid", gridTemplateColumns: "120px 1fr", alignItems: "start", marginBottom: 10, gap: 8 },
  label:    { textAlign: "right", fontWeight: 600, color: "#374151", fontSize: 12, paddingRight: 4, whiteSpace: "nowrap", paddingTop: 5 },
  input:    { border: "1px solid #c8d3de", borderRadius: 3, padding: "4px 8px", fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", background: "#fff", height: 28 },
  select:   { border: "1px solid #c8d3de", borderRadius: 3, padding: "4px 8px", fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", background: "#fff", height: 28, cursor: "pointer" },
  textarea: { border: "1px solid #c8d3de", borderRadius: 3, padding: "4px 8px", fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", resize: "none", height: 28, fontFamily: "inherit" },
  divider:  { border: "none", borderTop: "1px dashed #c8d3de", margin: "10px 0 8px" },
  journalBtn: { display: "flex", justifyContent: "center", margin: "10px 0 4px" },
  btnJournal: { background: "linear-gradient(90deg,#14532d,#16a34a)", color: "#fff", border: "none", borderRadius: 4, padding: "7px 28px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  hint:     { textAlign: "center", color: "#64748b", fontSize: 11, marginBottom: 4, marginTop: 2 },
  errorBox: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 3, padding: "5px 10px", marginTop: 4, fontSize: 11, color: "#dc2626", lineHeight: 1.5, wordBreak: "break-word" },
  emptyPane:  { background: "#eef3f8", border: "1.5px dashed #c8d6e0", margin: "12px 14px", borderRadius: 6, padding: "60px 20px", textAlign: "center", color: "#64748b" },
  emptyIcon:  { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontWeight: 700, fontSize: 15, color: "#374151", marginBottom: 8 },
  emptyDesc:  { fontSize: 12, lineHeight: 1.7 },
  tableWrap:  { margin: "0 14px 14px", borderRadius: 6, border: "1px solid #c8d6e0", overflow: "hidden" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#fff" },
  th:  { background: "linear-gradient(180deg,#16a34a,#15803d)", color: "#fff", padding: "7px 8px", textAlign: "left",   fontWeight: 600, borderRight: "1px solid #14532d", whiteSpace: "nowrap" },
  thC: { background: "linear-gradient(180deg,#16a34a,#15803d)", color: "#fff", padding: "7px 8px", textAlign: "center", fontWeight: 600, borderRight: "1px solid #14532d", whiteSpace: "nowrap" },
  thR: { background: "linear-gradient(180deg,#16a34a,#15803d)", color: "#fff", padding: "7px 8px", textAlign: "right",  fontWeight: 600, borderRight: "1px solid #14532d", whiteSpace: "nowrap" },
  thTax: { background: "linear-gradient(180deg,#92400e,#b45309)", color: "#fff", padding: "7px 8px", textAlign: "right", fontWeight: 600, borderRight: "1px solid #78350f", whiteSpace: "nowrap" },
  thTaxC:{ background: "linear-gradient(180deg,#92400e,#b45309)", color: "#fff", padding: "7px 8px", textAlign: "center",fontWeight: 600, borderRight: "1px solid #78350f", whiteSpace: "nowrap" },
  td:  (i) => ({ padding: "5px 8px", borderBottom: "1px solid #e5eaf0", background: i%2===0?"#fff":"#f7fafd", verticalAlign: "middle" }),
  tdC: (i) => ({ padding: "5px 8px", borderBottom: "1px solid #e5eaf0", background: i%2===0?"#fff":"#f7fafd", textAlign: "center",  verticalAlign: "middle" }),
  tdR: (i) => ({ padding: "5px 8px", borderBottom: "1px solid #e5eaf0", background: i%2===0?"#fff":"#f7fafd", textAlign: "right",   verticalAlign: "middle" }),
  tdTax:(i) => ({ padding: "5px 8px", borderBottom: "1px solid #e5eaf0", background: i%2===0?"#fffbf5":"#fef3c7", textAlign: "right", verticalAlign: "middle", color:"#92400e" }),
  summaryRow: { background: "#dcfce7", fontWeight: 700, borderTop: "2px solid #16a34a" },
  payInput: { border: "1px solid #16a34a", borderRadius: 3, padding: "3px 6px", width: 90, textAlign: "right", fontSize: 12, outline: "none", background: "#fff" },
  toast: (t) => ({
    position: "fixed", top: 18, right: 18, zIndex: 9999,
    background: t==="success"?"#16a34a": t==="error"?"#dc2626":"#2563a8",
    color: "#fff", borderRadius: 5, padding: "10px 20px", fontSize: 13, fontWeight: 600,
    boxShadow: "0 4px 16px rgba(0,0,0,0.18)", maxWidth: 420,
  }),
  modal:    { position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:1000, display:"flex", alignItems:"center", justifyContent:"center" },
  modalBox: { background:"#fff", borderRadius:8, padding:22, minWidth:500, maxWidth:820, maxHeight:"85vh", overflowY:"auto", boxShadow:"0 8px 32px rgba(0,0,0,0.22)" },
  badge: (c) => ({
    display:"inline-block", padding:"2px 8px", borderRadius:10, fontSize:10, fontWeight:700,
    background: c==="SAVED"?"#dcfce7": c==="POSTED"?"#dbeafe":"#fef9c3",
    color:      c==="SAVED"?"#15803d": c==="POSTED"?"#1d4ed8":"#92400e",
  }),
  infoStrip:   { display:"flex", gap:20, background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:4, padding:"6px 12px", marginTop:8, fontSize:11, flexWrap:"wrap", alignItems:"center" },
  summaryCards:{ display:"flex", gap:10, margin:"10px 14px 0", flexWrap:"wrap" },
  card: (color) => ({ flex:1, minWidth:130, background:"#fff", borderRadius:6, border:`1.5px solid ${color}`, padding:"10px 14px", borderLeft:`5px solid ${color}` }),
  cardLabel:   { fontSize:10, color:"#6b7280", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 },
  cardValue: (color) => ({ fontSize:17, fontWeight:700, color }),
  recvFull:    { background:"#dcfce7", color:"#15803d", borderRadius:10, padding:"2px 8px", fontSize:10, fontWeight:700, display:"inline-block" },
  recvPartial: { background:"#fef9c3", color:"#92400e", borderRadius:10, padding:"2px 8px", fontSize:10, fontWeight:700, display:"inline-block" },
  recvNone:    { background:"#fee2e2", color:"#dc2626", borderRadius:10, padding:"2px 8px", fontSize:10, fontWeight:700, display:"inline-block" },
  subRow:   { background:"#fffde7" },
  subCell:  { padding:"3px 8px 3px 26px", fontSize:11, color:"#78350f", borderBottom:"1px solid #fde68a" },
  taxBox: {
    display:"flex", alignItems:"center", gap:10,
    background:"linear-gradient(90deg,#fef3c7,#fffbf5)",
    border:"1.5px solid #f59e0b", borderRadius:6,
    padding:"8px 14px", margin:"10px 14px 0", flexWrap:"wrap",
  },
  taxLabel:  { fontWeight:700, color:"#92400e", fontSize:13, whiteSpace:"nowrap" },
  taxSelect: { border:"1.5px solid #f59e0b", borderRadius:4, padding:"4px 10px", fontSize:13, fontWeight:700, color:"#92400e", background:"#fff", height:30, cursor:"pointer", outline:"none", minWidth:160 },
  taxBadge:  { background:"#f59e0b", color:"#fff", borderRadius:10, padding:"3px 12px", fontSize:12, fontWeight:700 },
  taxInfo:   { fontSize:11, color:"#78350f", fontStyle:"italic" },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function CustomerReceiptVoucher() {

  const [voucherDate,          setVoucherDate]          = useState(todayISO());
  const [selectedBankAccount,  setSelectedBankAccount]  = useState("");
  const [selectedCustomer,     setSelectedCustomer]     = useState("");
  const [narration,            setNarration]            = useState("");
  const [fromDate,             setFromDate]             = useState("");
  const [toDate,               setToDate]               = useState(todayISO());
  const [taxRate,              setTaxRate]              = useState(0);

  const [cashBankAccounts,  setCashBankAccounts]  = useState([]);
  const [customers,         setCustomers]         = useState([]);
  const [invoices,          setInvoices]          = useState([]);
  const [receiptAmounts,    setReceiptAmounts]    = useState({});
  const [selectedInvoices,  setSelectedInvoices]  = useState({});
  const [prevReceipts,      setPrevReceipts]      = useState({});
  const [expandedRows,      setExpandedRows]      = useState({});

  const [loadingAccounts,  setLoadingAccounts]  = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(false);
  const [loadingJournal,   setLoadingJournal]   = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [journalLoaded,    setJournalLoaded]    = useState(false);
  const [toast,            setToast]            = useState(null);
  const [historyModal,     setHistoryModal]     = useState(false);
  const [historyData,      setHistoryData]      = useState([]);
  const [loadingHistory,   setLoadingHistory]   = useState(false);
  const [accountsError,    setAccountsError]    = useState("");
  const [customersError,   setCustomersError]   = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load Cash/Bank accounts ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingAccounts(true); setAccountsError("");
      try {
        const res      = await ledgerAPI.getAllAccounts();
        const list     = res?.data ?? (Array.isArray(res) ? res : []);
        const filtered = list.filter((a) => a.type === "CASH ACCOUNT" || a.type === "BANK ACCOUNT");
        setCashBankAccounts(filtered);
        if (!filtered.length && list.length)
          setAccountsError(`${list.length} accounts mile lekin koi CASH/BANK type nahi. Pehla type: "${list[0]?.type}"`);
      } catch (err) { setAccountsError(err.message); }
      finally { setLoadingAccounts(false); }
    })();
  }, []);

  // ── Load Customers (RECEIVABLES from Asset) ───────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingCustomers(true); setCustomersError("");
      try {
        const res  = await crvAPI.getCustomers();
        const list = res?.data ?? (Array.isArray(res) ? res : []);
        setCustomers(list);
        if (!list.length)
          setCustomersError("Koi customer nahi mila. Asset mein RECEIVABLES type ka account add karo.");
      } catch (err) { setCustomersError(err.message); }
      finally { setLoadingCustomers(false); }
    })();
  }, []);

  // ── Previous receipts map ─────────────────────────────────────────────────
  const buildPrevReceiptsMap = useCallback(async (customerId) => {
    try {
      const res      = await crvAPI.getHistory(customerId);
      const vouchers = res?.data ?? (Array.isArray(res) ? res : []);
      const map = {};
      vouchers.forEach((v) => {
        if (v.status === "CANCELLED") return;
        (v.lines || []).forEach((line) => {
          const id = line.invoiceId?.toString() || line.saleDetail;
          if (!id) return;
          if (!map[id]) map[id] = [];
          map[id].push({ voucherNumber: v.voucherNumber, date: v.voucherDate, amount: line.amount, status: v.status });
        });
      });
      setPrevReceipts(map);
    } catch (_) {}
  }, []);

  // ── Load Sale Journal ─────────────────────────────────────────────────────
  const handleLoadJournal = useCallback(async () => {
    if (!selectedCustomer) { showToast("Pehle customer select karein", "error"); return; }
    setLoadingJournal(true); setJournalLoaded(false);
    setInvoices([]); setReceiptAmounts({}); setSelectedInvoices({});
    setExpandedRows({}); setPrevReceipts({});
    try {
      const [jRes] = await Promise.all([
        crvAPI.getSaleJournalByCustomer({ customerId: selectedCustomer, fromDate, toDate }),
        buildPrevReceiptsMap(selectedCustomer),
      ]);
      const list = jRes?.data ?? (Array.isArray(jRes) ? jRes : []);
      setInvoices(list);
      setJournalLoaded(true);
      if (!list.length) showToast("Koi pending invoice nahi mila", "info");
    } catch (err) {
      showToast("Journal load error: " + err.message, "error");
    } finally { setLoadingJournal(false); }
  }, [selectedCustomer, fromDate, toDate, buildPrevReceiptsMap]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getAlreadyReceived = (inv) => (prevReceipts[inv._id] || []).reduce((s, p) => s + p.amount, 0);
  const getRemaining       = (inv) => Math.max((inv.amount || 0) - getAlreadyReceived(inv), 0);

  const calcTax = (recvBefore) => {
    const taxAmt    = recvBefore * taxRate;
    const recvAfter = recvBefore - taxAmt;
    return { taxAmt, recvAfter };
  };

  const toggleInvoice = (id, remaining) => {
    setSelectedInvoices((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        setReceiptAmounts((ra) => { const n = { ...ra }; delete n[id]; return n; });
      } else {
        next[id] = true;
        setReceiptAmounts((ra) => ({ ...ra, [id]: remaining }));
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (Object.keys(selectedInvoices).length === invoices.length) {
      setSelectedInvoices({}); setReceiptAmounts({});
    } else {
      const sel = {}, rec = {};
      invoices.forEach((inv) => { sel[inv._id] = true; rec[inv._id] = getRemaining(inv); });
      setSelectedInvoices(sel); setReceiptAmounts(rec);
    }
  };

  const handleRecvAmt = (id, val, max) =>
    setReceiptAmounts((prev) => ({ ...prev, [id]: Math.min(parseFloat(val) || 0, max) }));

  const toggleRow = (id) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalInvoice       = invoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  const totalPrevReceived  = invoices.reduce((s, inv) => s + getAlreadyReceived(inv), 0);
  const totalRemaining     = invoices.reduce((s, inv) => s + getRemaining(inv), 0);

  const totalRecvBefore    = Object.entries(selectedInvoices).filter(([, v]) => v)
    .reduce((s, [id]) => s + (parseFloat(receiptAmounts[id]) || 0), 0);

  const totalTaxAmt        = totalRecvBefore * taxRate;
  const totalRecvAfter     = totalRecvBefore - totalTaxAmt;
  const totalBalAfter      = Math.max(totalRemaining - totalRecvBefore, 0);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedBankAccount) return showToast("Cash/Bank account select karein", "error");
    if (!selectedCustomer)    return showToast("Customer select karein", "error");
    if (!totalRecvBefore)     return showToast("Koi invoice select nahi / amount 0", "error");

    const bObj = cashBankAccounts.find((a) => a.code === selectedBankAccount || a._id === selectedBankAccount);
    const cObj = customers.find((c) => c._id === selectedCustomer);

    const lines = Object.entries(selectedInvoices).filter(([, v]) => v).map(([id]) => {
      const inv              = invoices.find((i) => i._id === id);
      const recvBef          = parseFloat(receiptAmounts[id]) || 0;
      const { taxAmt, recvAfter } = calcTax(recvBef);
      return {
        saleDetail:     inv?.grn || inv?._id,
        invoiceId:      id,
        amount:         recvBef,
        taxRate:        taxRate,
        taxAmount:      taxAmt,
        amountAfterTax: recvAfter,
      };
    });

    setSaving(true);
    try {
      const result = await crvAPI.saveVoucher({
        voucherDate,
        accDrBank:         selectedBankAccount,
        accDrBankName:     bObj?.name || "",
        accCrCustomer:     selectedCustomer,
        accCrCustomerName: cObj?.name || "",
        narration,
        voucherAmount:  totalRecvBefore,
        taxRate,
        totalTaxAmount: totalTaxAmt,
        netAmount:      totalRecvAfter,
        lines,
        status: "SAVED",
        period: { from: fromDate, to: toDate },
      });
      if (result?.success) {
        showToast(`Voucher saved! No: ${result?.data?.voucherNumber || "—"}`, "success");
        handleNew();
      } else {
        showToast(result?.message || "Save failed", "error");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
    } finally { setSaving(false); }
  };

  // ── History ───────────────────────────────────────────────────────────────
  const handleViewHistory = async () => {
    setHistoryModal(true); setLoadingHistory(true);
    try {
      const res = await crvAPI.getHistory(selectedCustomer || undefined);
      setHistoryData(res?.data ?? (Array.isArray(res) ? res : []));
    } catch (err) { showToast("History load error: " + err.message, "error"); }
    finally { setLoadingHistory(false); }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleNew = () => {
    setSelectedBankAccount(""); setSelectedCustomer(""); setNarration("");
    setFromDate(""); setToDate(todayISO()); setTaxRate(0);
    setInvoices([]); setReceiptAmounts({}); setSelectedInvoices({});
    setJournalLoaded(false); setExpandedRows({}); setPrevReceipts({});
  };

  const customerObj   = customers.find((c) => c._id === selectedCustomer);
  const bankObj       = cashBankAccounts.find((a) => a.code === selectedBankAccount || a._id === selectedBankAccount);
  const bankTypeLabel = bankObj?.type === "CASH ACCOUNT" ? "💵 Cash" : bankObj?.type === "BANK ACCOUNT" ? "🏦 Bank" : "";
  const taxPct        = (taxRate * 100).toFixed(2).replace(/\.?0+$/, "") + "%";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>
      {toast && <div style={S.toast(toast.type)}>{toast.msg}</div>}
      <style>{`@keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }`}</style>

      {/* Header */}
      <div style={S.header}>💰 Customer Cash / Bank Receipt Voucher (CRV)</div>

      {/* Toolbar */}
      <div style={S.toolbar}>
        <button style={S.btn("default")} onClick={handleNew}>New</button>
        <button style={saving ? S.btn("disabled") : S.btn("default")} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button style={S.btn("default")}>Edit</button>
        <button style={S.btn("default")} onClick={handleNew}>Cancel</button>
        <button
          style={{ ...S.btn(loadingJournal ? "disabled" : "default"), display:"flex", alignItems:"center", gap:4 }}
          onClick={handleLoadJournal} disabled={loadingJournal || !selectedCustomer}
        >
          <span style={{ display:"inline-block", animation: loadingJournal ? "spin 1s linear infinite" : "none" }}>🔄</span>
          {loadingJournal ? "Refreshing..." : "Refresh"}
        </button>
        <button style={S.btn("default")} onClick={handleViewHistory}>
          View History ({historyData.length || 0})
        </button>
        <button style={S.btn("default")} onClick={() => window.print()}>Print</button>
      </div>

      {/* Form */}
      <div style={S.form}>
        {/* Voucher # + Date */}
        <div style={{ display:"grid", gridTemplateColumns:"120px 220px 1fr 120px 180px", gap:8, marginBottom:10, alignItems:"center" }}>
          <label style={{ ...S.label, paddingTop:0 }}>Voucher # :</label>
          <input style={{ ...S.input, background:"#f3f4f6", color:"#6b7280", fontStyle:"italic" }} value="Auto on save" readOnly />
          <div />
          <label style={{ ...S.label, paddingTop:0, textAlign:"right" }}>Voucher Date :</label>
          <input type="date" style={S.input} value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} />
        </div>

        {/* Cash / Bank (DR side — money comes IN) */}
        <div style={S.row}>
          <label style={S.label}>Cash / Bank :</label>
          <div>
            <select style={S.select} value={selectedBankAccount}
              onChange={(e) => setSelectedBankAccount(e.target.value)}
              disabled={loadingAccounts}>
              <option value="">{loadingAccounts ? "Loading..." : "-- Select Account --"}</option>
              {cashBankAccounts.map((acc) => (
                <option key={acc.code || acc._id} value={acc.code || acc._id}>
                  [{acc.type === "CASH ACCOUNT" ? "CASH" : "BANK"}] {acc.code} - {acc.name}
                </option>
              ))}
            </select>
            {accountsError && <div style={S.errorBox}>⚠️ {accountsError}</div>}
          </div>
        </div>

        {/* Customer (CR side — receivable cleared) */}
        <div style={S.row}>
          <label style={S.label}>Customer :</label>
          <div>
            <select style={S.select} value={selectedCustomer}
              onChange={(e) => {
                setSelectedCustomer(e.target.value);
                setJournalLoaded(false); setInvoices([]);
                setSelectedInvoices({}); setReceiptAmounts({});
                setExpandedRows({}); setPrevReceipts({});
              }}
              disabled={loadingCustomers}>
              <option value="">{loadingCustomers ? "Loading..." : "-- Select Customer --"}</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>{c.code ? `[${c.code}] ` : ""}{c.name}</option>
              ))}
            </select>
            {customersError && <div style={S.errorBox}>⚠️ {customersError}</div>}
          </div>
        </div>

        {/* Narration */}
        <div style={S.row}>
          <label style={S.label}>Narration :</label>
          <textarea style={S.textarea} placeholder="Receipt description..."
            value={narration} onChange={(e) => setNarration(e.target.value)} />
        </div>

        {/* Period */}
        <div style={{ display:"grid", gridTemplateColumns:"120px auto 160px auto 160px auto auto", alignItems:"center", gap:6, marginBottom:10 }}>
          <label style={{ ...S.label, paddingTop:0 }}>Period :</label>
          <label style={{ fontSize:12, color:"#374151", fontWeight:500 }}>From:</label>
          <input type="date" style={S.input} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <label style={{ fontSize:12, color:"#374151", fontWeight:500, marginLeft:4 }}>To:</label>
          <input type="date" style={S.input} value={toDate}   onChange={(e) => setToDate(e.target.value)} />
          <button style={{ ...S.btn("danger"),  fontSize:11, padding:"3px 10px", height:26 }}
            onClick={() => { setFromDate(""); setToDate(todayISO()); }}>✕ Clear</button>
          <button style={{ ...S.btn("default"), fontSize:11, padding:"3px 10px", height:26 }}
            onClick={() => { setFromDate(""); setToDate(todayISO()); }}>All dates</button>
        </div>

        <hr style={S.divider} />

        {/* Journal Button */}
        <div style={S.journalBtn}>
          <button style={S.btnJournal} onClick={handleLoadJournal} disabled={loadingJournal}>
            📋 {loadingJournal ? "Loading..." : "Sale Journal Voucher Information"}
          </button>
        </div>
        <p style={S.hint}>{selectedCustomer ? "Period select kar ke button click karein" : "Customer select karo phir click karo"}</p>

        {/* Info Strip */}
        {(customerObj || bankObj) && (
          <div style={S.infoStrip}>
            {customerObj && (
              <span>
                👤 <b>Customer:</b> {customerObj.name}
                {customerObj.code && <span style={{ color:"#6b7280" }}> ({customerObj.code})</span>}
                {customerObj.balance != null && (
                  <> &nbsp;|&nbsp; <b>Balance:</b>{" "}
                    <span style={{ color: customerObj.balance > 0 ? "#16a34a" : "#dc2626", fontWeight:700 }}>
                      Rs. {fmtNum(customerObj.balance)}
                    </span>
                  </>
                )}
              </span>
            )}
            {customerObj && bankObj && <span style={{ color:"#c8d3de" }}>|</span>}
            {bankObj && (
              <span>
                {bankTypeLabel} <b>Account:</b> {bankObj.code} - {bankObj.name}
                {bankObj.balance != null && (
                  <> &nbsp;|&nbsp; <b>Balance:</b>{" "}
                    <span style={{ fontWeight:700, color:"#1d4ed8" }}>Rs. {fmtNum(bankObj.balance)}</span>
                  </>
                )}
                &nbsp;|&nbsp; <b>Type:</b>{" "}
                <span style={{ color: bankObj.type==="CASH ACCOUNT"?"#15803d":"#1d4ed8", fontWeight:700 }}>
                  {bankObj.type}
                </span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── TAX DROPDOWN ─────────────────────────────────────────────────── */}
      <div style={S.taxBox}>
        <span style={S.taxLabel}>🏷️ WHT Deducted by Customer :</span>
        <select style={S.taxSelect} value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))}>
          {TAX_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {taxRate > 0 ? (
          <>
            <span style={S.taxBadge}>WHT @ {taxPct}</span>
            {totalRecvBefore > 0 && (
              <span style={S.taxInfo}>
                Recv Before Tax: <b>Rs. {fmtNum(totalRecvBefore)}</b> &nbsp;→&nbsp;
                WHT ({taxPct}): <b style={{ color:"#dc2626" }}>Rs. {fmtNum(totalTaxAmt)}</b> &nbsp;→&nbsp;
                Net Received: <b style={{ color:"#16a34a" }}>Rs. {fmtNum(totalRecvAfter)}</b>
              </span>
            )}
          </>
        ) : (
          <span style={{ ...S.taxInfo, color:"#9ca3af" }}>Koi WHT nahi — full amount bank mein ayega</span>
        )}
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      {journalLoaded && invoices.length > 0 && (
        <div style={S.summaryCards}>
          <div style={S.card("#6366f1")}>
            <div style={S.cardLabel}>📦 Total Invoice</div>
            <div style={S.cardValue("#6366f1")}>Rs. {fmtNum(totalInvoice)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>{invoices.length} invoice(s)</div>
          </div>
          <div style={S.card("#16a34a")}>
            <div style={S.cardLabel}>✅ Already Received</div>
            <div style={S.cardValue("#16a34a")}>Rs. {fmtNum(totalPrevReceived)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>Previous receipts</div>
          </div>
          <div style={S.card("#dc2626")}>
            <div style={S.cardLabel}>⏳ Remaining Due</div>
            <div style={S.cardValue("#dc2626")}>Rs. {fmtNum(totalRemaining)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>Still unreceived</div>
          </div>
          <div style={S.card("#2563a8")}>
            <div style={S.cardLabel}>💳 Recv Before Tax</div>
            <div style={S.cardValue("#2563a8")}>Rs. {fmtNum(totalRecvBefore)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>{Object.keys(selectedInvoices).length} selected</div>
          </div>
          {taxRate > 0 && (
            <>
              <div style={S.card("#f59e0b")}>
                <div style={S.cardLabel}>🏷️ WHT ({taxPct})</div>
                <div style={S.cardValue("#f59e0b")}>Rs. {fmtNum(totalTaxAmt)}</div>
                <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>Customer ne kata</div>
              </div>
              <div style={S.card("#16a34a")}>
                <div style={S.cardLabel}>✅ Net Received</div>
                <div style={S.cardValue("#16a34a")}>Rs. {fmtNum(totalRecvAfter)}</div>
                <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>Bank mein ayega</div>
              </div>
            </>
          )}
          <div style={S.card("#64748b")}>
            <div style={S.cardLabel}>🔔 Balance After</div>
            <div style={S.cardValue("#64748b")}>Rs. {fmtNum(totalBalAfter)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>Will still remain</div>
          </div>
        </div>
      )}

      {/* ── Content Pane ─────────────────────────────────────────────────── */}
      {!journalLoaded ? (
        <div style={S.emptyPane}>
          <div style={S.emptyIcon}>📋</div>
          <div style={S.emptyTitle}>Sale Journal Voucher Information</div>
          <div style={S.emptyDesc}>
            Customer select karein aur upar wala button click karein<br />
            to invoices aur receipt details load ho jayegi
          </div>
        </div>
      ) : invoices.length === 0 ? (
        <div style={S.emptyPane}>
          <div style={S.emptyIcon}>🔍</div>
          <div style={S.emptyTitle}>Koi Invoice Nahi Mila</div>
          <div style={S.emptyDesc}>
            Is customer ka koi pending invoice nahi hai.<br />
            Period change kar ke dobara try karein.
          </div>
        </div>
      ) : (
        <div style={{ ...S.tableWrap, marginTop: 10 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.thC} rowSpan={2}>
                  <input type="checkbox"
                    checked={Object.keys(selectedInvoices).length === invoices.length && invoices.length > 0}
                    onChange={toggleAll} />
                </th>
                <th style={S.thC} rowSpan={2}>Prev</th>
                <th style={S.th}  rowSpan={2}>Invoice #</th>
                <th style={S.th}  rowSpan={2}>Date</th>
                <th style={S.th}  rowSpan={2}>Description</th>
                <th style={S.thR} rowSpan={2}>Invoice Amt</th>
                <th style={S.thR} rowSpan={2}>Already Recv</th>
                <th style={S.thR} rowSpan={2}>Remaining</th>
                <th style={S.thC} rowSpan={2}>Status</th>
                <th style={{ ...S.thTax, textAlign:"center", borderRight:"1px solid #78350f" }}
                  colSpan={taxRate > 0 ? 4 : 1}>
                  {taxRate > 0 ? `💰 Receipt (WHT @ ${taxPct})` : "💰 Receipt"}
                </th>
                <th style={S.thR} rowSpan={2}>Bal After</th>
              </tr>
              {taxRate > 0 ? (
                <tr>
                  <th style={S.thTax}>Recv Before Tax</th>
                  <th style={S.thTax}>WHT Amt</th>
                  <th style={S.thTax}>Net Received</th>
                  <th style={S.thTaxC}>Recv Now</th>
                </tr>
              ) : (
                <tr>
                  <th style={S.thC}>Recv Now</th>
                </tr>
              )}
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const isSel          = !!selectedInvoices[inv._id];
                const prevList       = prevReceipts[inv._id] || [];
                const alreadyRecvd   = prevList.reduce((s, p) => s + p.amount, 0);
                const remaining      = Math.max((inv.amount || 0) - alreadyRecvd, 0);
                const recvBefore     = isSel ? (parseFloat(receiptAmounts[inv._id]) || 0) : 0;
                const { taxAmt, recvAfter } = calcTax(recvBefore);
                const balAfter       = Math.max(remaining - recvBefore, 0);
                const isExpanded     = !!expandedRows[inv._id];

                let recvBadge;
                if (alreadyRecvd === 0)                              recvBadge = <span style={S.recvNone}>Pending</span>;
                else if (alreadyRecvd >= (inv.amount || 0) - 0.005) recvBadge = <span style={S.recvFull}>Full Recv</span>;
                else                                                 recvBadge = <span style={S.recvPartial}>Partial</span>;

                return (
                  <>
                    <tr key={inv._id} style={isSel ? { background:"#dcfce7" } : {}}>
                      <td style={S.tdC(i)}>
                        <input type="checkbox" checked={isSel}
                          onChange={() => toggleInvoice(inv._id, remaining)} />
                      </td>
                      <td style={S.tdC(i)}>
                        {prevList.length > 0 ? (
                          <button onClick={() => toggleRow(inv._id)}
                            style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#16a34a", fontWeight:700, padding:0 }}>
                            {isExpanded ? "▲" : "▼"}&nbsp;{prevList.length}
                          </button>
                        ) : <span style={{ color:"#d1d5db" }}>—</span>}
                      </td>
                      <td style={S.td(i)}><b>{inv.grn || inv.invoiceNo || "N/A"}</b></td>
                      <td style={S.td(i)}>{fmtDate(inv.date)}</td>
                      <td style={S.td(i)}>{inv.description || inv.narration || "—"}</td>
                      <td style={{ ...S.tdR(i), fontWeight:600 }}>Rs. {fmtNum(inv.amount)}</td>
                      <td style={{ ...S.tdR(i), color: alreadyRecvd > 0 ? "#16a34a" : "#9ca3af", fontWeight: alreadyRecvd > 0 ? 700 : 400 }}>
                        {alreadyRecvd > 0 ? `Rs. ${fmtNum(alreadyRecvd)}` : "—"}
                      </td>
                      <td style={{ ...S.tdR(i), color: remaining > 0 ? "#dc2626" : "#16a34a", fontWeight:700 }}>
                        Rs. {fmtNum(remaining)}
                      </td>
                      <td style={S.tdC(i)}>{recvBadge}</td>

                      {taxRate > 0 ? (
                        <>
                          <td style={{ ...S.tdTax(i), fontWeight: isSel ? 700 : 400 }}>
                            {isSel ? `Rs. ${fmtNum(recvBefore)}` : <span style={{ color:"#d1d5db" }}>—</span>}
                          </td>
                          <td style={{ ...S.tdTax(i), color:"#dc2626", fontWeight: isSel ? 700 : 400 }}>
                            {isSel ? `Rs. ${fmtNum(taxAmt)}` : <span style={{ color:"#d1d5db" }}>—</span>}
                          </td>
                          <td style={{ ...S.tdTax(i), color:"#15803d", fontWeight: isSel ? 700 : 400 }}>
                            {isSel ? `Rs. ${fmtNum(recvAfter)}` : <span style={{ color:"#d1d5db" }}>—</span>}
                          </td>
                          <td style={S.tdC(i)}>
                            {isSel ? (
                              <input type="number" style={S.payInput}
                                value={receiptAmounts[inv._id] ?? ""} min={0} max={remaining}
                                onChange={(e) => handleRecvAmt(inv._id, e.target.value, remaining)}
                                onFocus={(e) => e.target.select()} />
                            ) : <span style={{ color:"#9ca3af", fontSize:11 }}>—</span>}
                          </td>
                        </>
                      ) : (
                        <td style={S.tdC(i)}>
                          {isSel ? (
                            <input type="number" style={S.payInput}
                              value={receiptAmounts[inv._id] ?? ""} min={0} max={remaining}
                              onChange={(e) => handleRecvAmt(inv._id, e.target.value, remaining)}
                              onFocus={(e) => e.target.select()} />
                          ) : <span style={{ color:"#9ca3af", fontSize:11 }}>—</span>}
                        </td>
                      )}

                      <td style={{ ...S.tdR(i), color: isSel ? (balAfter > 0 ? "#f59e0b" : "#16a34a") : "#9ca3af", fontWeight: isSel ? 700 : 400 }}>
                        {isSel ? `Rs. ${fmtNum(balAfter)}` : "—"}
                      </td>
                    </tr>

                    {/* Previous receipts sub-rows */}
                    {isExpanded && prevList.map((pmt, pi) => (
                      <tr key={`${inv._id}-p${pi}`} style={S.subRow}>
                        <td colSpan={2} style={S.subCell} />
                        <td colSpan={2} style={{ ...S.subCell, color:"#15803d", fontWeight:600 }}>↳ {pmt.voucherNumber}</td>
                        <td style={{ ...S.subCell, textAlign:"center" }}>{fmtDate(pmt.date)}</td>
                        <td style={S.subCell} />
                        <td style={{ ...S.subCell, textAlign:"right", color:"#16a34a", fontWeight:700 }}>Rs. {fmtNum(pmt.amount)}</td>
                        <td style={S.subCell} />
                        <td style={{ ...S.subCell, textAlign:"center" }}>
                          <span style={S.badge(pmt.status)}>{pmt.status}</span>
                        </td>
                        <td colSpan={taxRate > 0 ? 5 : 2} style={S.subCell} />
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>

            {/* Footer */}
            <tfoot>
              <tr style={S.summaryRow}>
                <td colSpan={5} style={{ padding:"7px 10px", fontWeight:700, color:"#14532d" }}>
                  TOTALS &nbsp;
                  <span style={{ fontSize:11, fontWeight:400, color:"#374151" }}>
                    ({Object.keys(selectedInvoices).length} of {invoices.length} selected)
                  </span>
                </td>
                <td style={{ ...S.tdR(0), fontWeight:700, background:"transparent" }}>Rs. {fmtNum(totalInvoice)}</td>
                <td style={{ ...S.tdR(0), fontWeight:700, background:"transparent", color:"#16a34a" }}>Rs. {fmtNum(totalPrevReceived)}</td>
                <td style={{ ...S.tdR(0), fontWeight:700, background:"transparent", color:"#dc2626" }}>Rs. {fmtNum(totalRemaining)}</td>
                <td style={{ background:"transparent" }} />
                {taxRate > 0 ? (
                  <>
                    <td style={{ ...S.tdR(0), fontWeight:700, background:"#fffbf5", color:"#2563a8" }}>Rs. {fmtNum(totalRecvBefore)}</td>
                    <td style={{ ...S.tdR(0), fontWeight:700, background:"#fffbf5", color:"#dc2626" }}>Rs. {fmtNum(totalTaxAmt)}</td>
                    <td style={{ ...S.tdR(0), fontWeight:700, background:"#fffbf5", color:"#15803d" }}>Rs. {fmtNum(totalRecvAfter)}</td>
                    <td style={{ background:"transparent" }} />
                  </>
                ) : (
                  <td style={{ background:"transparent" }} />
                )}
                <td style={{ ...S.tdR(0), fontWeight:700, background:"transparent", color:"#f59e0b" }}>Rs. {fmtNum(totalBalAfter)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Receipt Confirm Bar */}
          {totalRecvBefore > 0 && (
            <div style={{ background:"linear-gradient(90deg,#14532d,#16a34a)", color:"#fff", padding:"8px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12, flexWrap:"wrap" }}>
              <span style={{ fontSize:12 }}>
                💰 <b>{customerObj?.name}</b> se receipt via {bankTypeLabel} <b>{bankObj?.name || selectedBankAccount}</b>
                {taxRate > 0 && (
                  <span style={{ marginLeft:10, background:"rgba(255,255,255,0.15)", borderRadius:8, padding:"2px 8px", fontSize:11 }}>
                    WHT @ {taxPct}
                  </span>
                )}
              </span>
              <span style={{ fontSize:13, fontWeight:700, display:"flex", gap:16, flexWrap:"wrap" }}>
                {taxRate > 0 && (
                  <>
                    <span>Before Tax: <b>Rs. {fmtNum(totalRecvBefore)}</b></span>
                    <span style={{ color:"#fde68a" }}>WHT: <b>Rs. {fmtNum(totalTaxAmt)}</b></span>
                    <span style={{ color:"#86efac" }}>Net Recv: <b>Rs. {fmtNum(totalRecvAfter)}</b></span>
                  </>
                )}
                {taxRate === 0 && <span>Total: <b>Rs. {fmtNum(totalRecvBefore)}</b></span>}
              </span>
              <button style={{ ...S.btn("default"), fontSize:12, background:"#fff", color:"#14532d", fontWeight:700 }}
                onClick={handleSave} disabled={saving}>
                {saving ? "⏳ Saving..." : "✅ Confirm & Save"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* History Modal */}
      {historyModal && (
        <div style={S.modal} onClick={() => setHistoryModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h3 style={{ margin:0, color:"#14532d", fontSize:14 }}>📜 Receipt Voucher History</h3>
              <button onClick={() => setHistoryModal(false)} style={{ ...S.btn("danger"), padding:"2px 10px" }}>✕</button>
            </div>
            {loadingHistory ? (
              <div style={{ textAlign:"center", padding:24, color:"#6b7280" }}>⏳ Loading...</div>
            ) : historyData.length === 0 ? (
              <div style={{ textAlign:"center", padding:24, color:"#6b7280" }}>Koi history nahi mili</div>
            ) : (
              <table style={{ ...S.table, fontSize:11 }}>
                <thead>
                  <tr>
                    <th style={S.th}>Voucher #</th>
                    <th style={S.th}>Date</th>
                    <th style={S.th}>Customer</th>
                    <th style={S.th}>Bank / Cash</th>
                    <th style={S.thR}>Amount</th>
                    <th style={S.thR}>WHT</th>
                    <th style={S.thR}>Net Recv</th>
                    <th style={S.thC}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((h, i) => (
                    <tr key={h._id || i}>
                      <td style={S.td(i)}>{h.voucherNumber || "—"}</td>
                      <td style={S.td(i)}>{fmtDate(h.voucherDate)}</td>
                      <td style={S.td(i)}>{h.accCrCustomerName || h.accCrCustomer?.name || "—"}</td>
                      <td style={S.td(i)}>{h.accDrBankName || h.accDrBank?.name || "—"}</td>
                      <td style={S.tdR(i)}>Rs. {fmtNum(h.voucherAmount)}</td>
                      <td style={{ ...S.tdR(i), color:"#f59e0b" }}>
                        {h.totalTaxAmount ? `Rs. ${fmtNum(h.totalTaxAmount)}` : "—"}
                      </td>
                      <td style={{ ...S.tdR(i), color:"#15803d", fontWeight:700 }}>
                        Rs. {fmtNum(h.netAmount || h.voucherAmount)}
                      </td>
                      <td style={S.tdC(i)}><span style={S.badge(h.status)}>{h.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}