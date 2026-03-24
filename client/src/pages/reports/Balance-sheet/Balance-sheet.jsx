import React, { useState, useEffect } from "react";
import { Calendar, RefreshCw, Printer } from "lucide-react";

function BalanceSheet() {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const [currentAssets, setCurrentAssets] = useState([]);
  const [fixedAssets, setFixedAssets] = useState([]);
  const [otherAssets, setOtherAssets] = useState([]);

  const [currentLiabilities, setCurrentLiabilities] = useState([]);
  const [longTermLiabilities, setLongTermLiabilities] = useState([]);

  const [equity, setEquity] = useState([]);

  const [closingStock, setClosingStock] = useState(0);
  const [netProfit, setNetProfit] = useState(null);

  const [totalCurrentAssets, setTotalCurrentAssets] = useState(0);
  const [totalFixedAssets, setTotalFixedAssets] = useState(0);
  const [totalOtherAssets, setTotalOtherAssets] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);

  const [totalCurrentLiabilities, setTotalCurrentLiabilities] = useState(0);
  const [totalLongTermLiabilities, setTotalLongTermLiabilities] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);

  const [totalEquity, setTotalEquity] = useState(0);
  const [totalLiabilitiesEquity, setTotalLiabilitiesEquity] = useState(0);

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    const firstDayOfYear = new Date(new Date().getFullYear(), 0, 1).toISOString().split("T")[0];
    setStartDate(firstDayOfYear);
    setEndDate(today);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadVendors();
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (startDate && endDate && vendors.length >= 0) {
      loadBalanceSheetData();
    }
  }, [startDate, endDate, vendors]);

  const loadVendors = async () => {
    try {
      setLoadingVendors(true);
      const response = await fetch(`https://debug-nxby.vercel.app/api/chart-of-accounts/liabilities`);
      const data = await response.json();
      if (!data.success) throw new Error("Failed to fetch liabilities");
      const liabilities = data.data || [];
      const vendorList = liabilities.filter((liability) => liability.type === "PAYABLES");
      setVendors(vendorList);
    } catch (err) {
      console.error("❌ Error loading vendors:", err);
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const loadClosingStock = async () => {
    try {
      const response = await fetch(`https://debug-nxby.vercel.app/api/products/get-stock`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) { setClosingStock(0); return 0; }
      const products = data.data || [];
      const totalClosingStock = products.reduce((sum, product) => sum + (product.balanceAmount || 0), 0);
      setClosingStock(totalClosingStock);
      return totalClosingStock;
    } catch (err) {
      console.error("❌ Error loading closing stock:", err);
      setClosingStock(0);
      return 0;
    }
  };

  const loadNetProfit = async () => {
    try {
      const response = await fetch(
        `https://debug-nxby.vercel.app/api/profit-loss?fromDate=${startDate}&toDate=${endDate}`
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      if (!data.success) return 0;
      const np = data.data?.summary?.netProfit || 0;
      setNetProfit(np);
      return np;
    } catch (err) {
      console.error("❌ Error loading Net Profit:", err);
      setNetProfit(0);
      return 0;
    }
  };

  const loadTaxAccountBalances = async () => {
    const TAX_CODES = [
      { code: "TAX-0025-PAY", name: "Withholding Tax 0.25% Payable", category: "Liabilities", type: "TAX-WHT-PAYABLE" },
      { code: "TAX-0050-PAY", name: "Withholding Tax 0.50% Payable", category: "Liabilities", type: "TAX-WHT-PAYABLE" },
      { code: "TAX-0100-PAY", name: "Withholding Tax 1% Payable",    category: "Liabilities", type: "TAX-WHT-PAYABLE" },
      { code: "TAX-ADV-0025", name: "Advance Tax 0.25%",             category: "Assets",      type: "TAX-ADVANCE"    },
      { code: "TAX-ADV-0050", name: "Advance Tax 0.50%",             category: "Assets",      type: "TAX-ADVANCE"    },
      { code: "TAX-ADV-0100", name: "Advance Tax 1%",                category: "Assets",      type: "TAX-ADVANCE"    },
    ];

    const results = [];
    for (const tax of TAX_CODES) {
      try {
        const params = new URLSearchParams({
          accountCode: tax.code,
          accountName: tax.name,
          fromDate: startDate,
          toDate: endDate,
        });
        const response = await fetch(`https://debug-nxby.vercel.app/api/ledgers/account-ledger?${params}`);
        const data = await response.json();
        let balance = 0;
        if (data.success && data.data) {
          balance = Math.abs(data.data.summary?.closingBalance || 0);
        }
        if (balance > 0.01) {
          results.push({ ...tax, balance, isTaxAccount: true });
        }
      } catch (err) {
        console.error(`❌ Error loading tax account ${tax.code}:`, err);
      }
    }
    return results;
  };

  // ✅ NEW: Fetch date-filtered balance for a single account via ledger API
  const fetchAccountDateFilteredBalance = async (account) => {
    try {
      const params = new URLSearchParams({
        accountCode: account.code || "",
        accountName: account.name || account.accountName || "",
        fromDate: startDate,
        toDate: endDate,
      });
      const response = await fetch(`https://debug-nxby.vercel.app/api/ledgers/account-ledger?${params}`);
      const data = await response.json();
      if (data.success && data.data) {
        return Math.abs(data.data.summary?.closingBalance || 0);
      }
      return 0;
    } catch (err) {
      console.error(`❌ Error fetching date-filtered balance for ${account.code}:`, err);
      return 0;
    }
  };

  const loadBalanceSheetData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [stockValue, netProfitValue, taxAccounts] = await Promise.all([
        loadClosingStock(),
        loadNetProfit(),
        loadTaxAccountBalances(),
      ]);

      const accountsResponse = await fetch(`https://debug-nxby.vercel.app/api/ledgers/accounts`);
      const accountsData = await accountsResponse.json();
      if (!accountsData.success) throw new Error("Failed to fetch accounts");

      const currentAssetsList = [];
      const fixedAssetsList = [];
      const otherAssetsList = [];
      const currentLiabilitiesList = [];
      const longTermLiabilitiesList = [];
      const equityList = [];

      // Load vendor balances — date-filtered
      for (const vendor of vendors) {
        try {
          const params = new URLSearchParams({
            accountCode: vendor.code || "",
            accountName: vendor.name || "",
            fromDate: startDate,
            toDate: endDate,
          });
          const ledgerResponse = await fetch(`https://debug-nxby.vercel.app/api/ledgers/account-ledger?${params}`);
          const ledgerData = await ledgerResponse.json();

          let vendorBalance = 0;
          if (ledgerData.success && ledgerData.data) {
            vendorBalance = Math.abs(ledgerData.data.summary?.closingBalance || 0);
          }

          // ✅ Only add vendor if date-filtered balance > 0 (NO fallback to vendor.balance)
          if (vendorBalance > 0.01) {
            currentLiabilitiesList.push({
              code: vendor.code,
              name: `${vendor.name} (${vendor.code})`,
              originalName: vendor.name,
              type: 'PAYABLES',
              balance: vendorBalance,
              category: 'Liabilities',
              vendorInfo: vendor,
              isVendor: true
            });
          }
        } catch (err) {
          console.error(`Error loading ledger for vendor ${vendor.name}:`, err);
        }
      }

      // WHT Payable — already date-filtered > 0
      const whtAccounts = taxAccounts.filter(t => t.type === "TAX-WHT-PAYABLE");
      whtAccounts.forEach(wht => {
        currentLiabilitiesList.push({
          code: wht.code,
          name: wht.name,
          originalName: wht.name,
          type: wht.type,
          balance: wht.balance,
          category: 'Liabilities',
          isWHT: true
        });
      });

      // Advance Tax — already date-filtered > 0
      const advanceTaxAccounts = taxAccounts.filter(t => t.type === "TAX-ADVANCE");
      advanceTaxAccounts.forEach(adv => {
        currentAssetsList.push({
          code: adv.code,
          name: adv.name,
          originalName: adv.name,
          type: adv.type,
          balance: adv.balance,
          category: 'Assets',
          isAdvanceTax: true
        });
      });

      // ✅ FIXED: Process other accounts WITH date-filtered ledger balance
      // First, collect all non-vendor, non-tax accounts that need processing
      const accountsToProcess = accountsData.data.filter(account => {
        // Skip vendor accounts (already loaded above)
        const isVendorAccount =
          account.category === 'Liabilities' &&
          (account.type === 'PAYABLES' || account.type?.toLowerCase().includes('payable'));
        if (isVendorAccount) return false;

        // Skip tax accounts (already added above)
        if (account.code?.startsWith("TAX-")) return false;

        // Skip inventory/stock/purchases type assets (handled via closingStock)
        if (account.category === 'Assets') {
          const typeLower = (account.type || '').toLowerCase();
          if (
            typeLower.includes('inventory') ||
            typeLower.includes('stock') ||
            typeLower.includes('raw material') ||
            typeLower.includes('purchases')
          ) return false;
        }

        return true;
      });

      // ✅ Fetch date-filtered balances in parallel (batches of 10 for performance)
      const BATCH_SIZE = 10;
      for (let i = 0; i < accountsToProcess.length; i += BATCH_SIZE) {
        const batch = accountsToProcess.slice(i, i + BATCH_SIZE);

        const balanceResults = await Promise.all(
          batch.map(account => fetchAccountDateFilteredBalance(account))
        );

        batch.forEach((account, idx) => {
          const dateFilteredBalance = balanceResults[idx];

          // ✅ KEY FIX: Only show account if it has a balance in the selected date range
          if (dateFilteredBalance < 0.01) return;

          let displayName = account.name || account.accountName || 'Unknown Account';

          if (
            account.category === 'Assets' &&
            (account.type === 'RECEIVABLES' || account.type?.toLowerCase().includes('receivable'))
          ) {
            displayName = `${displayName} (Customer)`;
          }

          const accountData = {
            code: account.code,
            name: displayName,
            originalName: account.name || account.accountName,
            type: account.type,
            balance: dateFilteredBalance,   // ✅ date-filtered balance, not account.balance
            category: account.category,
            isVendor: false
          };

          if (account.category === 'Assets') {
            const typeLower = (account.type || '').toLowerCase();
            if (
              typeLower.includes('current') ||
              typeLower.includes('cash') ||
              typeLower.includes('bank') ||
              typeLower.includes('receivable') ||
              typeLower === 'receivables'
            ) {
              currentAssetsList.push(accountData);
            } else {
              fixedAssetsList.push(accountData);
            }
          } else if (account.category === 'Liabilities') {
            const typeLower = (account.type || '').toLowerCase();
            if (
              typeLower.includes('current') ||
              typeLower.includes('payable') ||
              typeLower.includes('short-term')
            ) {
              currentLiabilitiesList.push(accountData);
            } else {
              longTermLiabilitiesList.push(accountData);
            }
          } else if (account.category === 'Equity') {
            equityList.push(accountData);
          }
        });
      }

      // Only add Closing Stock if value > 0
      if (stockValue > 0.01) {
        currentAssetsList.push({
          code: 'CLOSING_STOCK',
          name: 'Closing Stock (Inventory)',
          originalName: 'Closing Stock',
          type: 'INVENTORY',
          balance: stockValue,
          category: 'Assets',
          isClosingStock: true
        });
      }

      // Add Net Profit/Loss to Equity (include even if negative)
      if (netProfitValue !== null && netProfitValue !== 0) {
        equityList.push({
          code: 'NET_PROFIT',
          name: netProfitValue >= 0 ? 'Net Profit (Current Period)' : 'Net Loss (Current Period)',
          originalName: 'Net Profit/Loss',
          type: 'NET_PROFIT',
          balance: netProfitValue,
          category: 'Equity',
          isNetProfit: true
        });
      }

      setCurrentAssets(currentAssetsList);
      setFixedAssets(fixedAssetsList);
      setOtherAssets(otherAssetsList);
      setCurrentLiabilities(currentLiabilitiesList);
      setLongTermLiabilities(longTermLiabilitiesList);
      setEquity(equityList);

      const currentAssetsTotal = currentAssetsList.reduce((sum, acc) => sum + acc.balance, 0);
      const fixedAssetsTotal = fixedAssetsList.reduce((sum, acc) => sum + acc.balance, 0);
      const assetsTotal = currentAssetsTotal + fixedAssetsTotal;

      const currentLiabilitiesTotal = currentLiabilitiesList.reduce((sum, acc) => sum + acc.balance, 0);
      const longTermLiabilitiesTotal = longTermLiabilitiesList.reduce((sum, acc) => sum + acc.balance, 0);
      const liabilitiesTotal = currentLiabilitiesTotal + longTermLiabilitiesTotal;

      const equityTotal = equityList.reduce((sum, acc) => sum + acc.balance, 0);
      const liabilitiesEquityTotal = liabilitiesTotal + equityTotal;

      setTotalCurrentAssets(currentAssetsTotal);
      setTotalFixedAssets(fixedAssetsTotal);
      setTotalOtherAssets(0);
      setTotalAssets(assetsTotal);
      setTotalCurrentLiabilities(currentLiabilitiesTotal);
      setTotalLongTermLiabilities(longTermLiabilitiesTotal);
      setTotalLiabilities(liabilitiesTotal);
      setTotalEquity(equityTotal);
      setTotalLiabilitiesEquity(liabilitiesEquityTotal);

    } catch (error) {
      console.error("❌ Error loading balance sheet:", error);
      setError(error.message || "Failed to load balance sheet");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PK', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const formatDateRange = () => {
    if (!startDate || !endDate) return "";
    const start = new Date(startDate);
    const end = new Date(endDate);
    return `From ${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} to ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  const handlePrint = () => window.print();

  const vendorCount = currentLiabilities.filter(l => l.isVendor).length;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header Controls */}
      <div style={{ marginBottom: "30px", padding: "20px", backgroundColor: "#f8f9fa", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.1)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#495057", fontSize: "14px" }}>
              <Calendar style={{ width: "16px", height: "16px", display: "inline", marginRight: "5px" }} />
              Start Date:
            </label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "2px solid #dee2e6", borderRadius: "6px", fontSize: "14px", fontWeight: "500" }} />
          </div>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#495057", fontSize: "14px" }}>
              <Calendar style={{ width: "16px", height: "16px", display: "inline", marginRight: "5px" }} />
              End Date:
            </label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              style={{ width: "100%", padding: "10px 12px", border: "2px solid #dee2e6", borderRadius: "6px", fontSize: "14px", fontWeight: "500" }} />
          </div>
          <button onClick={() => { loadVendors(); loadBalanceSheetData(); }}
            disabled={loading || loadingVendors || !startDate || !endDate}
            style={{ padding: "10px 20px", backgroundColor: loading || loadingVendors ? "#6c757d" : "#0d6efd", color: "white", border: "none", borderRadius: "6px", cursor: loading || loadingVendors ? "not-allowed" : "pointer", fontWeight: "500", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", marginTop: "24px" }}>
            <RefreshCw style={{ width: "16px", height: "16px" }} />
            {loading || loadingVendors ? "Loading..." : "Refresh Data"}
          </button>
          <button onClick={handlePrint} disabled={loading || loadingVendors}
            style={{ padding: "10px 20px", backgroundColor: "#198754", color: "white", border: "none", borderRadius: "6px", cursor: loading || loadingVendors ? "not-allowed" : "pointer", fontWeight: "500", fontSize: "14px", display: "flex", alignItems: "center", gap: "8px", marginTop: "24px" }}>
            <Printer style={{ width: "16px", height: "16px" }} />
            Print
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding: "15px", backgroundColor: "#f8d7da", color: "#721c24", border: "1px solid #f5c6cb", borderRadius: "6px", marginBottom: "20px" }}>
          ⚠️ {error}
        </div>
      )}

      {/* Title */}
      <h2 style={{ color: "#2c5ca9", textAlign: "center", marginBottom: "5px", fontWeight: "700", fontSize: "28px", letterSpacing: "-0.5px" }}>
        ABC & Co.<br />Balance Sheet
      </h2>
      <p style={{ textAlign: "center", fontWeight: "500", fontSize: "14px", color: "#6c757d", marginBottom: "40px" }}>
        {formatDateRange()}
      </p>

      {/* Loading */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#6c757d" }}>
          <div style={{ display: "inline-block", width: "40px", height: "40px", border: "4px solid #f3f3f3", borderTop: "4px solid #3f64a8", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: "15px" }}>Loading Balance Sheet...</p>
        </div>
      ) : (
        <>
          {/* ASSETS SECTION */}
          <div style={{ backgroundColor: "#3f64a8", color: "white", fontWeight: "bold", padding: "10px 15px", fontSize: "16px" }}>
            Assets
          </div>

          {/* Current Assets */}
          <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "10px" }}>
            Current Assets
          </div>
          <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
            {currentAssets.length > 0 ? currentAssets.map((asset, index) => (
              <div key={index} style={{
                display: "flex", justifyContent: "space-between", padding: "6px 15px 6px 0",
                borderBottom: "1px solid #f0f0f0",
                backgroundColor: asset.isClosingStock ? "#f0fff4" : asset.isAdvanceTax ? "#f0f8ff" : "#fff"
              }}>
                <span style={{ fontSize: "15px", color: "#000", fontWeight: (asset.isClosingStock || asset.isAdvanceTax) ? "600" : "normal" }}>
                  {asset.name}
                  {asset.isClosingStock && <span style={{ fontSize: "11px", color: "#16a34a", marginLeft: "8px" }}>[From Products Stock]</span>}
                  {asset.isAdvanceTax && <span style={{ fontSize: "11px", color: "#1d4ed8", marginLeft: "8px" }}>[Advance Tax - Asset]</span>}
                </span>
                <span style={{ fontSize: "15px", color: asset.isClosingStock ? "#16a34a" : asset.isAdvanceTax ? "#1d4ed8" : "#000", fontFamily: "monospace", minWidth: "120px", textAlign: "right", fontWeight: (asset.isClosingStock || asset.isAdvanceTax) ? "600" : "normal" }}>
                  {formatCurrency(asset.balance)}
                </span>
              </div>
            )) : (
              <div style={{ padding: "10px 0", color: "#999", fontSize: "14px" }}>No current assets</div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", backgroundColor: "#f8f9fa", fontWeight: "600", borderTop: "1px solid #dee2e6" }}>
            <span>Total Current Assets</span>
            <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalCurrentAssets)}</span>
          </div>

          {/* Fixed Assets */}
          <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "15px" }}>
            Fixed (Long-Term) Assets
          </div>
          <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
            {fixedAssets.length > 0 ? fixedAssets.map((asset, index) => (
              <div key={index} style={{ display: "flex", justifyContent: "space-between", padding: "6px 15px 6px 0", borderBottom: "1px solid #f0f0f0" }}>
                <span style={{ fontSize: "15px", color: "#000" }}>{asset.name}</span>
                <span style={{ fontSize: "15px", color: "#000", fontFamily: "monospace", minWidth: "120px", textAlign: "right" }}>{formatCurrency(asset.balance)}</span>
              </div>
            )) : (
              <div style={{ padding: "10px 0", color: "#999", fontSize: "14px" }}>No fixed assets</div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", backgroundColor: "#f8f9fa", fontWeight: "600", borderTop: "1px solid #dee2e6" }}>
            <span>Total Fixed Assets</span>
            <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalFixedAssets)}</span>
          </div>

          {/* Total Assets */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "15px", backgroundColor: "#d1e7dd", fontWeight: "700", fontSize: "17px", marginTop: "15px", borderTop: "2px solid #0f5132", borderBottom: "2px solid #0f5132" }}>
            <span>TOTAL ASSETS</span>
            <span style={{ fontFamily: "monospace", color: "#0f5132" }}>{formatCurrency(totalAssets)}</span>
          </div>

          {/* LIABILITIES & EQUITY SECTION */}
          <div style={{ backgroundColor: "#3f64a8", color: "white", fontWeight: "bold", padding: "10px 15px", fontSize: "16px", marginTop: "30px" }}>
            Liabilities and Owner's Equity
          </div>

          {/* Current Liabilities */}
          <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "10px" }}>
            Current Liabilities ({vendorCount} vendors)
          </div>
          <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
            {currentLiabilities.length > 0 ? currentLiabilities.map((liability, index) => (
              <div key={index} style={{
                display: "flex", justifyContent: "space-between", padding: "6px 15px 6px 0",
                borderBottom: "1px solid #f0f0f0",
                backgroundColor: liability.isVendor ? "#fff8f0" : liability.isWHT ? "#fff0f5" : "#fff"
              }}>
                <span style={{ fontSize: "15px", color: "#000" }}>
                  {liability.name}
                  {liability.isVendor && <span style={{ fontSize: "11px", color: "#666", marginLeft: "8px" }}>[Vendor Payable]</span>}
                  {liability.isWHT && <span style={{ fontSize: "11px", color: "#9333ea", marginLeft: "8px" }}>[WHT Payable]</span>}
                </span>
                <span style={{ fontSize: "15px", color: liability.isVendor ? "#d63384" : liability.isWHT ? "#9333ea" : "#000", fontFamily: "monospace", minWidth: "120px", textAlign: "right", fontWeight: (liability.isVendor || liability.isWHT) ? "600" : "normal" }}>
                  {formatCurrency(liability.balance)}
                </span>
              </div>
            )) : (
              <div style={{ padding: "10px 0", color: "#999", fontSize: "14px" }}>No current liabilities</div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", backgroundColor: "#f8f9fa", fontWeight: "600", borderTop: "1px solid #dee2e6" }}>
            <span>Total Current Liabilities</span>
            <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalCurrentLiabilities)}</span>
          </div>

          {/* Long-Term Liabilities */}
          {longTermLiabilities.length > 0 && (
            <>
              <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "15px" }}>
                Long-Term Liabilities
              </div>
              <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
                {longTermLiabilities.map((liability, index) => (
                  <div key={index} style={{ display: "flex", justifyContent: "space-between", padding: "6px 15px 6px 0", borderBottom: "1px solid #f0f0f0" }}>
                    <span style={{ fontSize: "15px", color: "#000" }}>{liability.name}</span>
                    <span style={{ fontSize: "15px", color: "#000", fontFamily: "monospace", minWidth: "120px", textAlign: "right" }}>{formatCurrency(liability.balance)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", backgroundColor: "#f8f9fa", fontWeight: "600", borderTop: "1px solid #dee2e6" }}>
                <span>Total Long-Term Liabilities</span>
                <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalLongTermLiabilities)}</span>
              </div>
            </>
          )}

          {/* Owner's Equity */}
          <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "15px" }}>
            Owner's Equity
          </div>
          <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
            {equity.length > 0 ? equity.map((eq, index) => (
              <div key={index} style={{
                display: "flex", justifyContent: "space-between", padding: "6px 15px 6px 0",
                borderBottom: "1px solid #f0f0f0",
                backgroundColor: eq.isNetProfit ? (eq.balance >= 0 ? "#f0fff4" : "#fff5f5") : "#fff"
              }}>
                <span style={{ fontSize: "15px", color: "#000", fontWeight: eq.isNetProfit ? "700" : "normal" }}>
                  {eq.name}
                  {eq.isNetProfit && (
                    <span style={{ fontSize: "11px", marginLeft: "8px", color: eq.balance >= 0 ? "#16a34a" : "#dc2626" }}>
                      [{eq.balance >= 0 ? "Profit" : "Loss"} — from P&L]
                    </span>
                  )}
                </span>
                <span style={{
                  fontSize: "15px",
                  color: eq.isNetProfit ? (eq.balance >= 0 ? "#16a34a" : "#dc2626") : "#000",
                  fontFamily: "monospace",
                  minWidth: "120px",
                  textAlign: "right",
                  fontWeight: eq.isNetProfit ? "700" : "normal"
                }}>
                  {eq.isNetProfit && eq.balance < 0 ? `(${formatCurrency(Math.abs(eq.balance))})` : formatCurrency(eq.balance)}
                </span>
              </div>
            )) : (
              <div style={{ padding: "10px 0", color: "#999", fontSize: "14px" }}>No equity accounts</div>
            )}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 15px", backgroundColor: "#f8f9fa", fontWeight: "600", borderTop: "1px solid #dee2e6" }}>
            <span>Total Owner's Equity</span>
            <span style={{ fontFamily: "monospace", color: totalEquity < 0 ? "#dc2626" : "inherit" }}>
              {totalEquity < 0 ? `(${formatCurrency(Math.abs(totalEquity))})` : formatCurrency(totalEquity)}
            </span>
          </div>

          {/* Total Liabilities & Equity */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "15px", backgroundColor: "#cfe2ff", fontWeight: "700", fontSize: "17px", marginTop: "15px", borderTop: "2px solid #084298", borderBottom: "2px solid #084298" }}>
            <span>TOTAL LIABILITIES AND OWNER'S EQUITY</span>
            <span style={{ fontFamily: "monospace", color: "#084298" }}>
              {formatCurrency(totalLiabilitiesEquity)}
            </span>
          </div>

          {/* Balance Check */}
          {Math.abs(totalAssets - totalLiabilitiesEquity) > 0.01 ? (
            <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#fff3cd", border: "1px solid #ffc107", borderRadius: "6px", color: "#856404" }}>
              ⚠️ Balance Sheet is not balanced!
              <br />Difference: {formatCurrency(Math.abs(totalAssets - totalLiabilitiesEquity))}
            </div>
          ) : (
            <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "#d1e7dd", border: "1px solid #198754", borderRadius: "6px", color: "#0f5132" }}>
              ✅ Balance Sheet is balanced!
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BalanceSheet;