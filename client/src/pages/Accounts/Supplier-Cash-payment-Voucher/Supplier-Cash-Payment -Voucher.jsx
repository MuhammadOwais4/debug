import { useState, useEffect, useCallback } from "react";

// const BASE_URL = "http://localhost:5000";
const BASE_URL = "https://debug-nxby.vercel.app/api";

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

const spvAPI = {
  getVendors: () => http.get("/api/supplier-payment/vendors"),
  getPurchaseJournalByVendor: ({ vendorId, fromDate, toDate }) => {
    const p = new URLSearchParams({ vendorId: vendorId || "", fromDate: fromDate || "", toDate: toDate || "" });
    return http.get(`/api/supplier-payment/purchase-journal?${p}`);
  },
  saveVoucher: (payload) => http.post("/api/supplier-payment", payload),
  getHistory:  (vendorId) => http.get(vendorId ? `/api/supplier-payment?vendorId=${vendorId}` : `/api/supplier-payment`),
};

const todayISO = () => new Date().toISOString().split("T")[0];
const fmtDate  = (d) => d ? new Date(d).toLocaleDateString("en-PK", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
const fmtNum   = (n) => Number(n || 0).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const S = {
  wrap:    { fontFamily: "'Segoe UI', Tahoma, Arial, sans-serif", fontSize: 13, backgroundColor: "#f0f4f8", minHeight: "100vh", color: "#222" },
  header:  { background: "linear-gradient(90deg,#1a3c5e 0%,#2563a8 100%)", color: "#fff", padding: "10px 18px", fontSize: 15, fontWeight: 600, letterSpacing: 0.3 },
  toolbar: { background: "#e8edf2", borderBottom: "1px solid #c8d3de", padding: "6px 14px", display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" },
  btn: (v = "default") => ({
    padding: "4px 16px", borderRadius: 3, border: "1px solid", height: 28, fontSize: 12, fontWeight: 500,
    cursor: v === "disabled" ? "not-allowed" : "pointer",
    background:  v === "primary" ? "#2563a8" : v === "danger" ? "#dc2626" : v === "success" ? "#16a34a" : v === "disabled" ? "#d1d5db" : "#fff",
    color:       v === "primary" || v === "danger" || v === "success" ? "#fff" : v === "disabled" ? "#6b7280" : "#374151",
    borderColor: v === "primary" ? "#1a4d8f" : v === "danger" ? "#b91c1c" : v === "success" ? "#15803d" : v === "disabled" ? "#9ca3af" : "#9ca3af",
  }),
  form:     { background: "#fff", margin: "12px 14px 0", borderRadius: 6, border: "1px solid #d1d9e0", padding: "14px 18px" },
  row:      { display: "grid", gridTemplateColumns: "110px 1fr", alignItems: "start", marginBottom: 10, gap: 8 },
  label:    { textAlign: "right", fontWeight: 600, color: "#374151", fontSize: 12, paddingRight: 4, whiteSpace: "nowrap", paddingTop: 5 },
  input:    { border: "1px solid #c8d3de", borderRadius: 3, padding: "4px 8px", fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", background: "#fff", height: 28 },
  select:   { border: "1px solid #c8d3de", borderRadius: 3, padding: "4px 8px", fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", background: "#fff", height: 28, cursor: "pointer" },
  textarea: { border: "1px solid #c8d3de", borderRadius: 3, padding: "4px 8px", fontSize: 12, width: "100%", boxSizing: "border-box", outline: "none", resize: "none", height: 28, fontFamily: "inherit" },
  divider:  { border: "none", borderTop: "1px dashed #c8d3de", margin: "10px 0 8px" },
  journalBtn: { display: "flex", justifyContent: "center", margin: "10px 0 4px" },
  btnJournal: { background: "linear-gradient(90deg,#6b7280,#4b5563)", color: "#fff", border: "none", borderRadius: 4, padding: "7px 28px", fontSize: 12, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 },
  hint:     { textAlign: "center", color: "#64748b", fontSize: 11, marginBottom: 4, marginTop: 2 },
  errorBox: { background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: 3, padding: "5px 10px", marginTop: 4, fontSize: 11, color: "#dc2626", lineHeight: 1.5, wordBreak: "break-word" },
  emptyPane:  { background: "#eef3f8", border: "1.5px dashed #c8d6e0", margin: "12px 14px", borderRadius: 6, padding: "60px 20px", textAlign: "center", color: "#64748b" },
  emptyIcon:  { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontWeight: 700, fontSize: 15, color: "#374151", marginBottom: 8 },
  emptyDesc:  { fontSize: 12, lineHeight: 1.7 },
  tableWrap:  { margin: "0 14px 14px", borderRadius: 6, border: "1px solid #c8d6e0", overflow: "hidden" },
  table:      { width: "100%", borderCollapse: "collapse", fontSize: 12, background: "#fff" },
  th:  { background: "linear-gradient(180deg,#2563a8,#1a4d8f)", color: "#fff", padding: "7px 8px", textAlign: "left",   fontWeight: 600, borderRight: "1px solid #1e40af", whiteSpace: "nowrap" },
  thC: { background: "linear-gradient(180deg,#2563a8,#1a4d8f)", color: "#fff", padding: "7px 8px", textAlign: "center", fontWeight: 600, borderRight: "1px solid #1e40af", whiteSpace: "nowrap" },
  thR: { background: "linear-gradient(180deg,#2563a8,#1a4d8f)", color: "#fff", padding: "7px 8px", textAlign: "right",  fontWeight: 600, borderRight: "1px solid #1e40af", whiteSpace: "nowrap" },
  td:  (i) => ({ padding: "5px 8px", borderBottom: "1px solid #e5eaf0", background: i%2===0?"#fff":"#f7fafd", verticalAlign: "middle" }),
  tdC: (i) => ({ padding: "5px 8px", borderBottom: "1px solid #e5eaf0", background: i%2===0?"#fff":"#f7fafd", textAlign: "center",  verticalAlign: "middle" }),
  tdR: (i) => ({ padding: "5px 8px", borderBottom: "1px solid #e5eaf0", background: i%2===0?"#fff":"#f7fafd", textAlign: "right",   verticalAlign: "middle" }),
  summaryRow: { background: "#e8f0fa", fontWeight: 700, borderTop: "2px solid #2563a8" },
  payInput: { border: "1px solid #2563a8", borderRadius: 3, padding: "3px 6px", width: 100, textAlign: "right", fontSize: 12, outline: "none", background: "#fff" },
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
  infoStrip:   { display:"flex", gap:20, background:"#f0f7ff", border:"1px solid #bfdbfe", borderRadius:4, padding:"6px 12px", marginTop:8, fontSize:11, flexWrap:"wrap", alignItems:"center" },
  summaryCards:{ display:"flex", gap:10, margin:"10px 14px 0", flexWrap:"wrap" },
  card: (color) => ({ flex:1, minWidth:130, background:"#fff", borderRadius:6, border:`1.5px solid ${color}`, padding:"10px 14px", borderLeft:`5px solid ${color}` }),
  cardLabel:   { fontSize:10, color:"#6b7280", fontWeight:600, textTransform:"uppercase", letterSpacing:0.5, marginBottom:4 },
  cardValue: (color) => ({ fontSize:17, fontWeight:700, color }),
  paidFull:    { background:"#dcfce7", color:"#15803d", borderRadius:10, padding:"2px 8px", fontSize:10, fontWeight:700, display:"inline-block" },
  paidPartial: { background:"#fef9c3", color:"#92400e", borderRadius:10, padding:"2px 8px", fontSize:10, fontWeight:700, display:"inline-block" },
  paidNone:    { background:"#fee2e2", color:"#dc2626", borderRadius:10, padding:"2px 8px", fontSize:10, fontWeight:700, display:"inline-block" },
  subRow:   { background:"#fffde7" },
  subCell:  { padding:"3px 8px 3px 26px", fontSize:11, color:"#78350f", borderBottom:"1px solid #fde68a" },
};

// ─────────────────────────────────────────────────────────────────────────────
export default function SupplierPaymentVoucher() {

  const [voucherDate,         setVoucherDate]         = useState(todayISO());
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [selectedVendor,      setSelectedVendor]      = useState("");
  const [narration,           setNarration]           = useState("");
  const [fromDate,            setFromDate]            = useState("");
  const [toDate,              setToDate]              = useState(todayISO());

  const [cashBankAccounts,    setCashBankAccounts]    = useState([]);
  const [vendors,             setVendors]             = useState([]);
  const [invoices,            setInvoices]            = useState([]);
  const [paymentAmounts,      setPaymentAmounts]      = useState({});
  const [selectedInvoices,    setSelectedInvoices]    = useState({});

  // prevPayments: { [invoiceId]: [{voucherNumber, date, amount, status}] }
  const [prevPayments,   setPrevPayments]   = useState({});
  const [expandedRows,   setExpandedRows]   = useState({});

  const [loadingAccounts,  setLoadingAccounts]  = useState(false);
  const [loadingVendors,   setLoadingVendors]   = useState(false);
  const [loadingJournal,   setLoadingJournal]   = useState(false);
  const [saving,           setSaving]           = useState(false);
  const [journalLoaded,    setJournalLoaded]    = useState(false);
  const [toast,            setToast]            = useState(null);
  const [historyModal,     setHistoryModal]     = useState(false);
  const [historyData,      setHistoryData]      = useState([]);
  const [loadingHistory,   setLoadingHistory]   = useState(false);
  const [accountsError,    setAccountsError]    = useState("");
  const [vendorsError,     setVendorsError]     = useState("");

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Load Cash/Bank Accounts ───────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingAccounts(true); setAccountsError("");
      try {
        const res  = await ledgerAPI.getAllAccounts();
        const list = res?.data ?? (Array.isArray(res) ? res : []);
        const filtered = list.filter((a) => a.type === "CASH ACCOUNT" || a.type === "BANK ACCOUNT");
        setCashBankAccounts(filtered);
        if (!filtered.length && list.length)
          setAccountsError(`${list.length} accounts mile lekin koi CASH/BANK type nahi. Pehla type: "${list[0]?.type}"`);
      } catch (err) { setAccountsError(err.message); }
      finally { setLoadingAccounts(false); }
    })();
  }, []);

  // ── Load Vendors ──────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setLoadingVendors(true); setVendorsError("");
      try {
        const res  = await spvAPI.getVendors();
        const list = res?.data ?? (Array.isArray(res) ? res : []);
        setVendors(list);
        if (!list.length) setVendorsError("Koi vendor nahi mila. Backend mein PAYABLES type ki liability add karo.");
      } catch (err) { setVendorsError(err.message); }
      finally { setLoadingVendors(false); }
    })();
  }, []);

  // ── Build previous-payments map from voucher history ─────────────────────
  const buildPrevPaymentsMap = useCallback(async (vendorId) => {
    try {
      const res      = await spvAPI.getHistory(vendorId);
      const vouchers = res?.data ?? (Array.isArray(res) ? res : []);
      const map = {};
      vouchers.forEach((v) => {
        if (v.status === "CANCELLED") return;
        (v.lines || []).forEach((line) => {
          const id = line.invoiceId?.toString() || line.purchaseDetail;
          if (!id) return;
          if (!map[id]) map[id] = [];
          map[id].push({
            voucherNumber: v.voucherNumber,
            date:          v.voucherDate,
            amount:        line.amount,
            status:        v.status,
          });
        });
      });
      setPrevPayments(map);
    } catch (_) { /* silently ignore */ }
  }, []);

  // ── Load Purchase Journal ─────────────────────────────────────────────────
  const handleLoadJournal = useCallback(async () => {
    if (!selectedVendor) { showToast("Pehle vendor select karein", "error"); return; }
    setLoadingJournal(true); setJournalLoaded(false);
    setInvoices([]); setPaymentAmounts({}); setSelectedInvoices({});
    setExpandedRows({}); setPrevPayments({});
    try {
      const [jRes] = await Promise.all([
        spvAPI.getPurchaseJournalByVendor({ vendorId: selectedVendor, fromDate, toDate }),
        buildPrevPaymentsMap(selectedVendor),
      ]);
      const list = jRes?.data ?? (Array.isArray(jRes) ? jRes : []);
      setInvoices(list);
      setJournalLoaded(true);
      if (!list.length) showToast("Koi pending invoice nahi mila", "info");
    } catch (err) {
      showToast("Journal load error: " + err.message, "error");
    } finally {
      setLoadingJournal(false);
    }
  }, [selectedVendor, fromDate, toDate, buildPrevPaymentsMap]);

  // ── Invoice selection ─────────────────────────────────────────────────────
  const getRemaining = (inv) => {
    const paid = (prevPayments[inv._id] || []).reduce((s, p) => s + p.amount, 0);
    return Math.max((inv.amount || 0) - paid, 0);
  };

  const toggleInvoice = (id, remaining) => {
    setSelectedInvoices((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        setPaymentAmounts((pa) => { const n = { ...pa }; delete n[id]; return n; });
      } else {
        next[id] = true;
        setPaymentAmounts((pa) => ({ ...pa, [id]: remaining }));
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (Object.keys(selectedInvoices).length === invoices.length) {
      setSelectedInvoices({}); setPaymentAmounts({});
    } else {
      const sel = {}, pay = {};
      invoices.forEach((inv) => { sel[inv._id] = true; pay[inv._id] = getRemaining(inv); });
      setSelectedInvoices(sel); setPaymentAmounts(pay);
    }
  };

  const handlePayAmt = (id, val, max) =>
    setPaymentAmounts((prev) => ({ ...prev, [id]: Math.min(parseFloat(val) || 0, max) }));

  const toggleRow = (id) => setExpandedRows((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── Derived totals ────────────────────────────────────────────────────────
  const totalInvoice        = invoices.reduce((s, inv) => s + (inv.amount || 0), 0);
  const totalPrevPaid       = invoices.reduce((s, inv) => s + (prevPayments[inv._id] || []).reduce((a, p) => a + p.amount, 0), 0);
  const totalRemaining      = invoices.reduce((s, inv) => s + getRemaining(inv), 0);
  const totalCurrentPayment = Object.entries(selectedInvoices).filter(([, v]) => v).reduce((s, [id]) => s + (parseFloat(paymentAmounts[id]) || 0), 0);
  const totalAfterPayment   = Math.max(totalRemaining - totalCurrentPayment, 0);

  // ── Save voucher ──────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!selectedBankAccount) return showToast("Cash/Bank account select karein", "error");
    if (!selectedVendor)      return showToast("Vendor select karein", "error");
    if (!totalCurrentPayment) return showToast("Koi invoice select nahi / amount 0", "error");

    const bObj  = cashBankAccounts.find((a) => a.code === selectedBankAccount || a._id === selectedBankAccount);
    const vObj  = vendors.find((v) => v._id === selectedVendor);
    const lines = Object.entries(selectedInvoices).filter(([, v]) => v).map(([id]) => {
      const inv = invoices.find((i) => i._id === id);
      return { purchaseDetail: inv?.grn || inv?._id, invoiceId: id, amount: parseFloat(paymentAmounts[id]) || 0 };
    });

    setSaving(true);
    try {
      const result = await spvAPI.saveVoucher({
        voucherDate, accCrBank: selectedBankAccount, accCrBankName: bObj?.name || "",
        accDrSupplier: selectedVendor, accDrSupplierName: vObj?.name || "",
        narration, voucherAmount: totalCurrentPayment, lines,
        status: "SAVED", period: { from: fromDate, to: toDate },
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

  // ── History modal ─────────────────────────────────────────────────────────
  const handleViewHistory = async () => {
    setHistoryModal(true); setLoadingHistory(true);
    try {
      const res = await spvAPI.getHistory(selectedVendor || undefined);
      setHistoryData(res?.data ?? (Array.isArray(res) ? res : []));
    } catch (err) { showToast("History load error: " + err.message, "error"); }
    finally { setLoadingHistory(false); }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleNew = () => {
    setSelectedBankAccount(""); setSelectedVendor(""); setNarration("");
    setFromDate(""); setToDate(todayISO());
    setInvoices([]); setPaymentAmounts({}); setSelectedInvoices({});
    setJournalLoaded(false); setExpandedRows({}); setPrevPayments({});
  };

  const vendorObj     = vendors.find((v) => v._id === selectedVendor);
  const bankObj       = cashBankAccounts.find((a) => a.code === selectedBankAccount || a._id === selectedBankAccount);
  const bankTypeLabel = bankObj?.type === "CASH ACCOUNT" ? "💵 Cash" : bankObj?.type === "BANK ACCOUNT" ? "🏦 Bank" : "";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={S.wrap}>
      {toast && <div style={S.toast(toast.type)}>{toast.msg}</div>}

      <div style={S.header}>Supplier Cash / Bank Payment Voucher</div>

      <div style={S.toolbar}>
        <button style={S.btn("default")} onClick={handleNew}>New</button>
        <button style={saving ? S.btn("disabled") : S.btn("default")} onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </button>
        <button style={S.btn("default")}>Edit</button>
        <button style={S.btn("default")} onClick={handleNew}>Cancel</button>
        <button
          style={{ ...S.btn(loadingJournal ? "disabled" : "default"), display:"flex", alignItems:"center", gap:4 }}
          onClick={handleLoadJournal}
          disabled={loadingJournal || !selectedVendor}
          title={!selectedVendor ? "Pehle vendor select karein" : "Journal reload karein"}
        >
          <span style={{ display:"inline-block", animation: loadingJournal ? "spin 1s linear infinite" : "none" }}>🔄</span>
          {loadingJournal ? "Refreshing..." : "Refresh"}
        </button>
        <button style={S.btn("default")} onClick={handleViewHistory}>View History ({historyData.length || 0})</button>
        <button style={S.btn("default")} onClick={() => window.print()}>Print</button>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {/* ── Form ── */}
      <div style={S.form}>
        <div style={{ display:"grid", gridTemplateColumns:"110px 220px 1fr 120px 180px", gap:8, marginBottom:10, alignItems:"center" }}>
          <label style={{ ...S.label, paddingTop:0 }}>Voucher # :</label>
          <input style={{ ...S.input, background:"#f3f4f6", color:"#6b7280", fontStyle:"italic" }} value="Auto on save" readOnly />
          <div />
          <label style={{ ...S.label, paddingTop:0, textAlign:"right" }}>Voucher Date :</label>
          <input type="date" style={S.input} value={voucherDate} onChange={(e) => setVoucherDate(e.target.value)} />
        </div>

        <div style={S.row}>
          <label style={S.label}>Cash / Bank :</label>
          <div>
            <select style={S.select} value={selectedBankAccount} onChange={(e) => setSelectedBankAccount(e.target.value)} disabled={loadingAccounts}>
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

        <div style={S.row}>
          <label style={S.label}>Vendor :</label>
          <div>
            <select style={S.select} value={selectedVendor}
              onChange={(e) => {
                setSelectedVendor(e.target.value);
                setJournalLoaded(false); setInvoices([]);
                setSelectedInvoices({}); setPaymentAmounts({});
                setExpandedRows({}); setPrevPayments({});
              }}
              disabled={loadingVendors}>
              <option value="">{loadingVendors ? "Loading..." : "-- Select Vendor --"}</option>
              {vendors.map((v) => (
                <option key={v._id} value={v._id}>{v.code ? `[${v.code}] ` : ""}{v.name}</option>
              ))}
            </select>
            {vendorsError && <div style={S.errorBox}>⚠️ {vendorsError}</div>}
          </div>
        </div>

        <div style={S.row}>
          <label style={S.label}>Narration :</label>
          <textarea style={S.textarea} placeholder="Payment description..." value={narration} onChange={(e) => setNarration(e.target.value)} />
        </div>

        <div style={{ display:"grid", gridTemplateColumns:"110px auto 160px auto 160px auto auto", alignItems:"center", gap:6, marginBottom:10 }}>
          <label style={{ ...S.label, paddingTop:0 }}>Period :</label>
          <label style={{ fontSize:12, color:"#374151", fontWeight:500 }}>From:</label>
          <input type="date" style={S.input} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <label style={{ fontSize:12, color:"#374151", fontWeight:500, marginLeft:4 }}>To:</label>
          <input type="date" style={S.input} value={toDate}   onChange={(e) => setToDate(e.target.value)} />
          <button style={{ ...S.btn("danger"),  fontSize:11, padding:"3px 10px", height:26 }} onClick={() => { setFromDate(""); setToDate(todayISO()); }}>✕ Clear</button>
          <button style={{ ...S.btn("default"), fontSize:11, padding:"3px 10px", height:26 }} onClick={() => { setFromDate(""); setToDate(todayISO()); }}>All dates</button>
        </div>

        <hr style={S.divider} />

        <div style={S.journalBtn}>
          <button style={S.btnJournal} onClick={handleLoadJournal} disabled={loadingJournal}>
            📋 {loadingJournal ? "Loading..." : "Purchase Journal Voucher Information"}
          </button>
        </div>
        <p style={S.hint}>{selectedVendor ? "Period select kar ke button click karein" : "Vendor select karo phir click karo"}</p>

        {(vendorObj || bankObj) && (
          <div style={S.infoStrip}>
            {vendorObj && (
              <span>
                🏪 <b>Vendor:</b> {vendorObj.name}
                {vendorObj.code && <span style={{ color:"#6b7280" }}> ({vendorObj.code})</span>}
                {vendorObj.balance != null && (
                  <> &nbsp;|&nbsp; <b>Balance:</b>{" "}
                    <span style={{ color: vendorObj.balance > 0 ? "#dc2626" : "#16a34a", fontWeight:700 }}>Rs. {fmtNum(vendorObj.balance)}</span>
                  </>
                )}
              </span>
            )}
            {vendorObj && bankObj && <span style={{ color:"#c8d3de" }}>|</span>}
            {bankObj && (
              <span>
                {bankTypeLabel} <b>Account:</b> {bankObj.code} - {bankObj.name}
                {bankObj.balance != null && (
                  <> &nbsp;|&nbsp; <b>Balance:</b>{" "}
                    <span style={{ fontWeight:700, color:"#1d4ed8" }}>Rs. {fmtNum(bankObj.balance)}</span>
                  </>
                )}
                &nbsp;|&nbsp; <b>Type:</b>{" "}
                <span style={{ color: bankObj.type==="CASH ACCOUNT"?"#15803d":"#1d4ed8", fontWeight:700 }}>{bankObj.type}</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Summary Cards ── */}
      {journalLoaded && invoices.length > 0 && (
        <div style={S.summaryCards}>
          <div style={S.card("#6366f1")}>
            <div style={S.cardLabel}>📦 Total Invoice</div>
            <div style={S.cardValue("#6366f1")}>Rs. {fmtNum(totalInvoice)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>{invoices.length} invoice(s)</div>
          </div>
          <div style={S.card("#16a34a")}>
            <div style={S.cardLabel}>✅ Already Paid</div>
            <div style={S.cardValue("#16a34a")}>Rs. {fmtNum(totalPrevPaid)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>Previous payments</div>
          </div>
          <div style={S.card("#dc2626")}>
            <div style={S.cardLabel}>⏳ Remaining Due</div>
            <div style={S.cardValue("#dc2626")}>Rs. {fmtNum(totalRemaining)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>Still unpaid</div>
          </div>
          <div style={S.card("#2563a8")}>
            <div style={S.cardLabel}>💳 Paying Now</div>
            <div style={S.cardValue("#2563a8")}>Rs. {fmtNum(totalCurrentPayment)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>{Object.keys(selectedInvoices).length} selected</div>
          </div>
          <div style={S.card("#f59e0b")}>
            <div style={S.cardLabel}>🔔 After This Payment</div>
            <div style={S.cardValue("#f59e0b")}>Rs. {fmtNum(totalAfterPayment)}</div>
            <div style={{ fontSize:10, color:"#6b7280", marginTop:2 }}>Will still remain</div>
          </div>
        </div>
      )}

      {/* ── Content Pane ── */}
      {!journalLoaded ? (
        <div style={S.emptyPane}>
          <div style={S.emptyIcon}>📋</div>
          <div style={S.emptyTitle}>Purchase Journal Voucher Information</div>
          <div style={S.emptyDesc}>Vendor select karein aur upar wala button click karein<br />to invoices aur payment details load ho jayegi</div>
        </div>
      ) : invoices.length === 0 ? (
        <div style={S.emptyPane}>
          <div style={S.emptyIcon}>🔍</div>
          <div style={S.emptyTitle}>Koi Invoice Nahi Mila</div>
          <div style={S.emptyDesc}>Is vendor ka koi pending invoice nahi hai.<br />Period change kar ke dobara try karein.</div>
        </div>
      ) : (
        <div style={{ ...S.tableWrap, marginTop: 10 }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.thC}>
                  <input type="checkbox"
                    checked={Object.keys(selectedInvoices).length === invoices.length && invoices.length > 0}
                    onChange={toggleAll} />
                </th>
                <th style={S.thC} title="Click to see previous payments">Prev</th>
                <th style={S.th}>GRN / Invoice #</th>
                <th style={S.th}>Date</th>
                <th style={S.th}>Description</th>
                <th style={S.thR}>Invoice Amt</th>
                <th style={S.thR}>Already Paid</th>
                <th style={S.thR}>Remaining</th>
                <th style={S.thC}>Status</th>
                <th style={S.thR}>Pay Now</th>
                <th style={S.thR}>After Payment</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv, i) => {
                const isSel       = !!selectedInvoices[inv._id];
                const prevList    = prevPayments[inv._id] || [];
                const alreadyPaid = prevList.reduce((s, p) => s + p.amount, 0);
                const remaining   = Math.max((inv.amount || 0) - alreadyPaid, 0);
                const payNow      = parseFloat(paymentAmounts[inv._id]) || 0;
                const afterPay    = Math.max(remaining - payNow, 0);
                const isExpanded  = !!expandedRows[inv._id];

                let paidBadge;
                if (alreadyPaid === 0)                              paidBadge = <span style={S.paidNone}>Unpaid</span>;
                else if (alreadyPaid >= (inv.amount || 0) - 0.005) paidBadge = <span style={S.paidFull}>Full Paid</span>;
                else                                                paidBadge = <span style={S.paidPartial}>Partial</span>;

                return (
                  <>
                    <tr key={inv._id} style={isSel ? { background:"#dbeafe" } : {}}>
                      {/* Select */}
                      <td style={S.tdC(i)}>
                        <input type="checkbox" checked={isSel} onChange={() => toggleInvoice(inv._id, remaining)} />
                      </td>

                      {/* Expand previous payments */}
                      <td style={S.tdC(i)}>
                        {prevList.length > 0 ? (
                          <button onClick={() => toggleRow(inv._id)}
                            title="Previous payments dekhein"
                            style={{ background:"none", border:"none", cursor:"pointer", fontSize:13, color:"#2563a8", fontWeight:700, padding:0 }}>
                            {isExpanded ? "▲" : "▼"}&nbsp;{prevList.length}
                          </button>
                        ) : <span style={{ color:"#d1d5db" }}>—</span>}
                      </td>

                      <td style={S.td(i)}><b>{inv.grn || inv.invoiceNo || "N/A"}</b></td>
                      <td style={S.td(i)}>{fmtDate(inv.date)}</td>
                      <td style={S.td(i)}>{inv.description || inv.narration || "—"}</td>

                      {/* Invoice Amount */}
                      <td style={{ ...S.tdR(i), fontWeight:600 }}>Rs. {fmtNum(inv.amount)}</td>

                      {/* Already Paid */}
                      <td style={{ ...S.tdR(i), color: alreadyPaid > 0 ? "#16a34a" : "#9ca3af", fontWeight: alreadyPaid > 0 ? 700 : 400 }}>
                        {alreadyPaid > 0 ? `Rs. ${fmtNum(alreadyPaid)}` : "—"}
                      </td>

                      {/* Remaining */}
                      <td style={{ ...S.tdR(i), color: remaining > 0 ? "#dc2626" : "#16a34a", fontWeight:700 }}>
                        Rs. {fmtNum(remaining)}
                      </td>

                      {/* Status badge */}
                      <td style={S.tdC(i)}>{paidBadge}</td>

                      {/* Pay Now */}
                      <td style={S.tdC(i)}>
                        {isSel ? (
                          <input type="number" style={S.payInput}
                            value={paymentAmounts[inv._id] ?? ""} min={0} max={remaining}
                            onChange={(e) => handlePayAmt(inv._id, e.target.value, remaining)}
                            onFocus={(e) => e.target.select()} />
                        ) : <span style={{ color:"#9ca3af", fontSize:11 }}>—</span>}
                      </td>

                      {/* After Payment */}
                      <td style={{ ...S.tdR(i), color: isSel ? (afterPay > 0 ? "#f59e0b" : "#16a34a") : "#9ca3af", fontWeight: isSel ? 700 : 400 }}>
                        {isSel ? `Rs. ${fmtNum(afterPay)}` : "—"}
                      </td>
                    </tr>

                    {/* ── Previous Payments Sub-Rows ── */}
                    {isExpanded && prevList.map((pmt, pi) => (
                      <tr key={`${inv._id}-p${pi}`} style={S.subRow}>
                        <td colSpan={2} style={S.subCell} />
                        <td colSpan={2} style={{ ...S.subCell, color:"#92400e", fontWeight:600 }}>
                          ↳ {pmt.voucherNumber}
                        </td>
                        <td style={{ ...S.subCell, textAlign:"center" }}>{fmtDate(pmt.date)}</td>
                        <td style={S.subCell} />
                        <td style={{ ...S.subCell, textAlign:"right", color:"#16a34a", fontWeight:700 }}>
                          Rs. {fmtNum(pmt.amount)}
                        </td>
                        <td style={S.subCell} />
                        <td style={{ ...S.subCell, textAlign:"center" }}>
                          <span style={S.badge(pmt.status)}>{pmt.status}</span>
                        </td>
                        <td colSpan={2} style={S.subCell} />
                      </tr>
                    ))}
                  </>
                );
              })}
            </tbody>

            {/* Footer Totals */}
            <tfoot>
              <tr style={S.summaryRow}>
                <td colSpan={5} style={{ padding:"7px 10px", fontWeight:700, color:"#1e3a8a" }}>
                  TOTALS &nbsp;
                  <span style={{ fontSize:11, fontWeight:400, color:"#374151" }}>
                    ({Object.keys(selectedInvoices).length} of {invoices.length} selected)
                  </span>
                </td>
                <td style={{ ...S.tdR(0), fontWeight:700, background:"transparent" }}>
                  Rs. {fmtNum(totalInvoice)}
                </td>
                <td style={{ ...S.tdR(0), fontWeight:700, background:"transparent", color:"#16a34a" }}>
                  Rs. {fmtNum(totalPrevPaid)}
                </td>
                <td style={{ ...S.tdR(0), fontWeight:700, background:"transparent", color:"#dc2626" }}>
                  Rs. {fmtNum(totalRemaining)}
                </td>
                <td style={{ background:"transparent" }} />
                <td style={{ ...S.tdR(0), fontWeight:700, background:"transparent", color:"#2563a8", fontSize:14 }}>
                  Rs. {fmtNum(totalCurrentPayment)}
                </td>
                <td style={{ ...S.tdR(0), fontWeight:700, background:"transparent", color:"#f59e0b" }}>
                  Rs. {fmtNum(totalAfterPayment)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Payment Summary Bar */}
          {totalCurrentPayment > 0 && (
            <div style={{ background:"linear-gradient(90deg,#1a3c5e,#2563a8)", color:"#fff", padding:"8px 16px", display:"flex", justifyContent:"space-between", alignItems:"center", gap:12 }}>
              <span style={{ fontSize:12 }}>
                💳 <b>{vendorObj?.name}</b> ko payment via {bankTypeLabel} <b>{bankObj?.name || selectedBankAccount}</b>
              </span>
              <span style={{ fontSize:15, fontWeight:700 }}>Total Payment: Rs. {fmtNum(totalCurrentPayment)}</span>
              <button style={{ ...S.btn("success"), fontSize:12 }} onClick={handleSave} disabled={saving}>
                {saving ? "⏳ Saving..." : "✅ Confirm & Save"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── History Modal ── */}
      {historyModal && (
        <div style={S.modal} onClick={() => setHistoryModal(false)}>
          <div style={S.modalBox} onClick={(e) => e.stopPropagation()}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
              <h3 style={{ margin:0, color:"#1a3c5e", fontSize:14 }}>📜 Payment Voucher History</h3>
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
                    <th style={S.th}>Vendor</th>
                    <th style={S.th}>Bank / Cash</th>
                    <th style={S.thR}>Amount</th>
                    <th style={S.thC}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.map((h, i) => (
                    <tr key={h._id || i}>
                      <td style={S.td(i)}>{h.voucherNumber || "—"}</td>
                      <td style={S.td(i)}>{fmtDate(h.voucherDate)}</td>
                      <td style={S.td(i)}>{h.accDrSupplierName || h.accDrSupplier?.name || "—"}</td>
                      <td style={S.td(i)}>{h.accCrBankName || h.accCrBank?.name || "—"}</td>
                      <td style={S.tdR(i)}>Rs. {fmtNum(h.voucherAmount)}</td>
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