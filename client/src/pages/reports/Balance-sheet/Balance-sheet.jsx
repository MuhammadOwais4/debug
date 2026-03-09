import React, { useState, useEffect, useCallback } from "react";

const BASE = "https://debug-nxby.vercel.app/api";

// ── helpers ───────────────────────────────────────────────────────────────────
const get = (path) =>
  fetch(`${BASE}${path}`).then((r) => r.json()).catch(() => ({ success: false }));

const fmt = (v) =>
  new Intl.NumberFormat("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v || 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "";

const today = () => new Date().toISOString().split("T")[0];
const yearStart = () => new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];

// ── sub-components ────────────────────────────────────────────────────────────
function SectionBar({ title, color = "#1e3a5f" }) {
  return (
    <div style={{
      background: color, color: "#fff",
      padding: "9px 18px", fontSize: 13, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase",
      marginTop: 24,
    }}>{title}</div>
  );
}

function SubBar({ title }) {
  return (
    <div style={{
      background: "#eef2f8", color: "#1e3a5f",
      padding: "6px 18px", fontSize: 12, fontWeight: 700,
      letterSpacing: "0.05em", borderLeft: "3px solid #3f64a8",
      marginTop: 8,
    }}>{title}</div>
  );
}

function AccountRow({ name, amount, sub, highlight, color, note }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: sub ? "5px 18px 5px 36px" : "5px 18px",
      borderBottom: "1px solid #f0f3f8",
      background: highlight || "#fff",
      fontSize: 13,
    }}>
      <span style={{ color: "#1a1a2e" }}>
        {name}
        {note && <span style={{ fontSize: 10, color: "#888", marginLeft: 8, fontStyle: "italic" }}>{note}</span>}
      </span>
      <span style={{
        fontFamily: "monospace", fontSize: 13, minWidth: 120,
        textAlign: "right", fontWeight: 500,
        color: color || "#1a1a2e",
      }}>
        {typeof amount === "number" && amount < 0
          ? `(${fmt(Math.abs(amount))})`
          : fmt(amount)}
      </span>
    </div>
  );
}

function TotalRow({ label, amount, big, color }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: big ? "12px 18px" : "8px 18px",
      background: big ? "#1e3a5f" : "#eef2f8",
      borderTop: big ? "none" : "1px solid #c8d3e0",
      fontSize: big ? 15 : 13,
      fontWeight: 700,
      marginTop: big ? 12 : 0,
    }}>
      <span style={{ color: big ? "#fff" : "#1e3a5f" }}>{label}</span>
      <span style={{
        fontFamily: "monospace",
        color: big ? (color || "#7dd3fc") : (color || "#1e3a5f"),
        minWidth: 120, textAlign: "right",
      }}>
        {typeof amount === "number" && amount < 0
          ? `(${fmt(Math.abs(amount))})`
          : fmt(amount)}
      </span>
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function BalanceSheet() {
  const [from, setFrom] = useState(yearStart);
  const [to,   setTo]   = useState(today);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [bs,      setBS]      = useState(null);   // processed balance sheet

  const load = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError("");
    setBS(null);

    try {
      // ── parallel fetches ─────────────────────────────────────────────
      const [accsRes, liabsRes, plRes] = await Promise.all([
        get("/ledgers/accounts"),
        get("/chart-of-accounts/liabilities"),
        get(`/profit-loss?fromDate=${from}&toDate=${to}`),
      ]);

      // ── 1. Closing Stock — directly from backend P&L (Product.balanceAmount) ──
      //    Backend mein: allProducts.reduce((s,p) => s + p.balanceAmount, 0)
      const closingStock = plRes?.data?.cogs?.closingStock ?? 0;

      // ── 2. Net Profit — directly from backend P&L summary ───────────
      //    Backend mein: netProfit = grossProfit - opExpenses + otherIncome
      const netProfit = plRes?.data?.summary?.netProfit ?? 0;

      // ── 3. Vendor (PAYABLES) balances from liabilities API ─────────
      const liabsAll = liabsRes?.data ?? (Array.isArray(liabsRes) ? liabsRes : []);
      const vendors  = liabsAll.filter(l => l.type === "PAYABLES");

      // ── 4. Classify ledger accounts ─────────────────────────────────
      const accounts = accsRes?.data ?? (Array.isArray(accsRes) ? accsRes : []);

      const currentAssets   = [];
      const fixedAssets     = [];
      const currentLiabs    = [];
      const longTermLiabs   = [];
      const equityAccs      = [];

      // Vendor code set for deduplication
      const vendorCodes = new Set(vendors.map(v => v.code));

      accounts.forEach(a => {
        const bal     = Math.abs(a.balance || 0);
        if (bal === 0) return;   // skip zero balance
        const cat  = (a.category || "").toLowerCase();
        const type = (a.type     || "").toLowerCase();
        const code = (a.code     || "").toUpperCase();

        // Skip TAX accounts — handled separately if needed
        // Skip vendor/payable accounts from general accounts (already from liabilities API)
        if (cat === "liabilities" && (type.includes("payable") || type === "payables")) return;

        const row = { code: a.code, name: a.name || a.accountName || a.code, balance: bal, type: a.type };

        if (cat === "assets") {
          // Inventory/stock type → skip (we use /products/get-stock)
          if (type.includes("inventory") || type.includes("stock") || type.includes("raw material")) return;

          if (
            type.includes("cash") || type.includes("bank") ||
            type.includes("current") || type.includes("receivable") ||
            type === "receivables"
          ) {
            currentAssets.push(row);
          } else {
            fixedAssets.push(row);
          }
        } else if (cat === "liabilities") {
          if (
            type.includes("current") || type.includes("short") ||
            type.includes("accrued") || type === "accrued-expense"
          ) {
            currentLiabs.push(row);
          } else {
            longTermLiabs.push(row);
          }
        } else if (cat === "equity") {
          equityAccs.push(row);
        }
      });

      // ── 5. Add vendor payables to current liabilities ───────────────
      vendors.forEach(v => {
        currentLiabs.unshift({
          code:    v.code,
          name:    v.name,
          balance: Math.abs(v.balance || 0),
          type:    "PAYABLES",
          isVendor: true,
        });
      });

      // ── 6. Add Closing Stock to current assets ───────────────────────
      currentAssets.push({
        code: "CLOS-STOCK",
        name: "Closing Stock",
        balance: closingStock,
        type: "INVENTORY",
        isStock: true,
        note: "From P&L (Product.balanceAmount)",
      });

      // ── 7. Add Net Profit/Loss to equity ────────────────────────────
      equityAccs.push({
        code:     "NET-PROFIT",
        name:     netProfit >= 0 ? "Net Profit (Current Period)" : "Net Loss (Current Period)",
        balance:  netProfit,
        type:     "NET_PROFIT",
        isNetProfit: true,
      });

      // ── 8. Totals ────────────────────────────────────────────────────
      const sum = (arr) => arr.reduce((s, r) => s + (r.balance || 0), 0);

      const totCA   = sum(currentAssets);
      const totFA   = sum(fixedAssets);
      const totA    = totCA + totFA;

      const totCL   = sum(currentLiabs);
      const totLTL  = sum(longTermLiabs);
      const totL    = totCL + totLTL;

      const totEq   = equityAccs.reduce((s, r) => s + (r.balance || 0), 0);  // netProfit can be negative
      const totLE   = totL + totEq;

      setBS({
        currentAssets,  fixedAssets,
        currentLiabs,   longTermLiabs,  equityAccs,
        totCA, totFA, totA,
        totCL, totLTL, totL,
        totEq, totLE,
        closingStock, netProfit,
        isBalanced: Math.abs(totA - totLE) < 1,
      });

    } catch (err) {
      setError("Error loading balance sheet: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  // ── print ─────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    const win = window.open("", "", "height=900,width=780");
    if (!win) return;
    const body = document.getElementById("bs-print-area")?.innerHTML || "";
    win.document.write(
      `<!DOCTYPE html><html><head><title>Balance Sheet</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#000}
        @media print{@page{size:A4;margin:12mm}}
      </style></head><body>${body}
      <script>window.onload=function(){window.print()}<\/script>
      </body></html>`
    );
    win.document.close();
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "20px 16px", fontFamily: "'Segoe UI', Arial, sans-serif", color: "#1a1a2e", fontSize: 13 }}>
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>

      {/* ── Controls ── */}
      <div style={{ background: "#f4f7fc", border: "1px solid #d6dff0", borderRadius: 6, padding: "16px 20px", marginBottom: 24, display: "flex", gap: 14, flexWrap: "wrap", alignItems: "flex-end" }}>
        {[["From Date", from, setFrom], ["To Date", to, setTo]].map(([lbl, val, set], i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 5, flex: 1, minWidth: 160 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#4a5568", letterSpacing: "0.06em", textTransform: "uppercase" }}>{lbl}</label>
            <input type="date" value={val} onChange={e => set(e.target.value)}
              style={{ padding: "7px 10px", border: "1.5px solid #c8d3e0", borderRadius: 4, fontSize: 13, color: "#1a1a2e", background: "#fff", outline: "none" }} />
          </div>
        ))}
        <button onClick={load} disabled={loading}
          style={{ padding: "8px 18px", background: loading ? "#94a3b8" : "#1e3a5f", color: "#fff", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 12, cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.04em", height: 36 }}>
          {loading ? "⏳ Loading..." : "🔄 Refresh"}
        </button>
        <button onClick={handlePrint} disabled={loading || !bs}
          style={{ padding: "8px 18px", background: "#15803d", color: "#fff", border: "none", borderRadius: 4, fontWeight: 700, fontSize: 12, cursor: "pointer", letterSpacing: "0.04em", height: 36 }}>
          🖨️ Print
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: 4, padding: "10px 16px", color: "#dc2626", fontSize: 13, marginBottom: 16 }}>
          ⚠️ {error}
        </div>
      )}

      {/* ── Loading spinner ── */}
      {loading && (
        <div style={{ textAlign: "center", padding: 60, color: "#64748b" }}>
          <div style={{ display: "inline-block", width: 36, height: 36, border: "4px solid #e2e8f0", borderTop: "4px solid #1e3a5f", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <p style={{ marginTop: 14, fontSize: 13 }}>Loading Balance Sheet...</p>
        </div>
      )}

      {/* ── Balance Sheet ── */}
      {!loading && bs && (
        <div id="bs-print-area">

          {/* Title */}
          <div style={{ textAlign: "center", marginBottom: 24, borderBottom: "2px solid #1e3a5f", paddingBottom: 16 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#1e3a5f", letterSpacing: "-0.3px" }}>Balance Sheet</div>
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>
              As of <b style={{ color: "#1e3a5f" }}>{fmtDate(from)}</b> — <b style={{ color: "#1e3a5f" }}>{fmtDate(to)}</b>
            </div>
            {bs.isBalanced
              ? <div style={{ marginTop: 8, display: "inline-block", fontSize: 11, background: "#dcfce7", color: "#15803d", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>✅ Balanced</div>
              : <div style={{ marginTop: 8, display: "inline-block", fontSize: 11, background: "#fee2e2", color: "#dc2626", padding: "2px 10px", borderRadius: 20, fontWeight: 700 }}>⚠️ Not Balanced — Diff: {fmt(Math.abs(bs.totA - bs.totLE))}</div>
            }
          </div>

          {/* ══════════════════ ASSETS ══════════════════ */}
          <SectionBar title="Assets" color="#1e3a5f" />

          {/* Current Assets */}
          <SubBar title="Current Assets" />
          {bs.currentAssets.length === 0
            ? <div style={{ padding: "8px 18px", color: "#94a3b8", fontSize: 12 }}>No current assets</div>
            : bs.currentAssets.map((a, i) => (
              <AccountRow key={i}
                name={a.name}
                amount={a.balance}
                note={a.note}
                highlight={a.isStock ? "#f0fdf4" : a.isAdvanceTax ? "#eff6ff" : undefined}
                color={a.isStock ? "#15803d" : a.isAdvanceTax ? "#1d4ed8" : undefined}
              />
            ))
          }
          <TotalRow label="Total Current Assets" amount={bs.totCA} />

          {/* Fixed Assets */}
          <SubBar title="Fixed (Long-Term) Assets" />
          {bs.fixedAssets.length === 0
            ? <div style={{ padding: "8px 18px", color: "#94a3b8", fontSize: 12 }}>No fixed assets</div>
            : bs.fixedAssets.map((a, i) => <AccountRow key={i} name={a.name} amount={a.balance} />)
          }
          <TotalRow label="Total Fixed Assets" amount={bs.totFA} />

          {/* Total Assets */}
          <TotalRow label="TOTAL ASSETS" amount={bs.totA} big color="#7dd3fc" />

          {/* ══════════════════ LIABILITIES & EQUITY ══════════════════ */}
          <SectionBar title="Liabilities & Owner's Equity" color="#1e3a5f" />

          {/* Current Liabilities */}
          <SubBar title={`Current Liabilities (${bs.currentLiabs.filter(l => l.isVendor).length} Vendors)`} />
          {bs.currentLiabs.length === 0
            ? <div style={{ padding: "8px 18px", color: "#94a3b8", fontSize: 12 }}>No current liabilities</div>
            : bs.currentLiabs.map((l, i) => (
              <AccountRow key={i}
                name={l.name}
                amount={l.balance}
                note={l.isVendor ? "Vendor Payable" : l.type === "ACCRUED-EXPENSE" ? "Accrued" : undefined}
                highlight={l.isVendor ? "#fff8f0" : l.type === "ACCRUED-EXPENSE" ? "#faf5ff" : undefined}
                color={l.isVendor ? "#b45309" : l.type === "ACCRUED-EXPENSE" ? "#7c3aed" : undefined}
              />
            ))
          }
          <TotalRow label="Total Current Liabilities" amount={bs.totCL} />

          {/* Long-Term Liabilities */}
          {bs.longTermLiabs.length > 0 && (
            <>
              <SubBar title="Long-Term Liabilities" />
              {bs.longTermLiabs.map((l, i) => <AccountRow key={i} name={l.name} amount={l.balance} />)}
              <TotalRow label="Total Long-Term Liabilities" amount={bs.totLTL} />
            </>
          )}

          {/* Total Liabilities */}
          <TotalRow label="Total Liabilities" amount={bs.totL} color="#b45309" />

          {/* Owner's Equity */}
          <SubBar title="Owner's Equity" />
          {bs.equityAccs.length === 0
            ? <div style={{ padding: "8px 18px", color: "#94a3b8", fontSize: 12 }}>No equity accounts</div>
            : bs.equityAccs.map((e, i) => (
              <AccountRow key={i}
                name={e.name}
                amount={e.balance}
                note={e.isNetProfit ? "From P&L" : undefined}
                highlight={e.isNetProfit ? (e.balance >= 0 ? "#f0fdf4" : "#fff5f5") : undefined}
                color={e.isNetProfit ? (e.balance >= 0 ? "#15803d" : "#dc2626") : undefined}
              />
            ))
          }
          <TotalRow label="Total Owner's Equity" amount={bs.totEq} color={bs.totEq < 0 ? "#dc2626" : "#15803d"} />

          {/* Total Liabilities + Equity */}
          <TotalRow label="TOTAL LIABILITIES & EQUITY" amount={bs.totLE} big color="#7dd3fc" />

          {/* ── Summary Cards ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginTop: 24 }}>
            {[
              { label: "Total Assets",      value: bs.totA,         bg: "#eff6ff", border: "#bfdbfe", tc: "#1d4ed8",  lc: "#1e40af" },
              { label: "Total Liabilities", value: bs.totL,         bg: "#fff7ed", border: "#fed7aa", tc: "#b45309",  lc: "#92400e" },
              { label: "Closing Stock",     value: bs.closingStock, bg: "#f0fdf4", border: "#bbf7d0", tc: "#15803d",  lc: "#14532d" },
              { label: "Net Profit/Loss",   value: bs.netProfit,    bg: bs.netProfit >= 0 ? "#f0fdf4" : "#fff5f5", border: bs.netProfit >= 0 ? "#bbf7d0" : "#fecaca", tc: bs.netProfit >= 0 ? "#15803d" : "#dc2626", lc: bs.netProfit >= 0 ? "#14532d" : "#991b1b" },
            ].map((c, i) => (
              <div key={i} style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 6, padding: "12px 14px" }}>
                <div style={{ fontSize: 11, color: c.lc, fontWeight: 700, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.05em" }}>{c.label}</div>
                <div style={{ fontSize: 17, fontWeight: 800, color: c.tc, fontFamily: "monospace" }}>
                  {typeof c.value === "number" && c.value < 0 ? `(${fmt(Math.abs(c.value))})` : fmt(c.value)}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {!loading && !bs && !error && (
        <div style={{ textAlign: "center", padding: 40, color: "#94a3b8" }}>
          Select date range and click Refresh
        </div>
      )}
    </div>
  );
}