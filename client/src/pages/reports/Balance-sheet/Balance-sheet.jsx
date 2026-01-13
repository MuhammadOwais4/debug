import React, { useState, useEffect } from "react";
import { Calendar, RefreshCw, Printer } from "lucide-react";

function BalanceSheet() {
  const [selectedDate, setSelectedDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Vendors and Liabilities
  const [vendors, setVendors] = useState([]);
  const [loadingVendors, setLoadingVendors] = useState(false);
  
  // Assets
  const [currentAssets, setCurrentAssets] = useState([]);
  const [fixedAssets, setFixedAssets] = useState([]);
  const [otherAssets, setOtherAssets] = useState([]);
  
  // Liabilities
  const [currentLiabilities, setCurrentLiabilities] = useState([]);
  const [longTermLiabilities, setLongTermLiabilities] = useState([]);
  
  // Equity
  const [equity, setEquity] = useState([]);
  
  // Totals
  const [totalCurrentAssets, setTotalCurrentAssets] = useState(0);
  const [totalFixedAssets, setTotalFixedAssets] = useState(0);
  const [totalOtherAssets, setTotalOtherAssets] = useState(0);
  const [totalAssets, setTotalAssets] = useState(0);
  
  const [totalCurrentLiabilities, setTotalCurrentLiabilities] = useState(0);
  const [totalLongTermLiabilities, setTotalLongTermLiabilities] = useState(0);
  const [totalLiabilities, setTotalLiabilities] = useState(0);
  
  const [totalEquity, setTotalEquity] = useState(0);
  const [totalLiabilitiesEquity, setTotalLiabilitiesEquity] = useState(0);

  // Automatically set today's date
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadVendors();
    }
  }, [selectedDate]);

  useEffect(() => {
    if (selectedDate && vendors.length >= 0) {
      loadBalanceSheetData();
    }
  }, [selectedDate, vendors]);

  const loadVendors = async () => {
    try {
      setLoadingVendors(true);
      console.log("📋 Loading vendors from liabilities...");
      
      // const response = await fetch(`http://localhost:5000/api/chart-of-accounts/liabilities`);
      const response =await fetch (`https://debug-nxby.vercel.app/api/chart-of-accounts/liabilities`)
      const data = await response.json();
      
      if (!data.success) {
        throw new Error("Failed to fetch liabilities");
      }

      const liabilities = data.data || [];
      const vendorList = liabilities.filter((liability) => liability.type === "PAYABLES");
      
      setVendors(vendorList);
      console.log(`✅ Loaded ${vendorList.length} vendors from liabilities:`);
      vendorList.forEach(v => {
        console.log(`   - ${v.name} (${v.code}): Balance = ${v.balance || 0}`);
      });
    } catch (err) {
      console.error("❌ Error loading vendors:", err);
      setVendors([]);
    } finally {
      setLoadingVendors(false);
    }
  };

  const loadBalanceSheetData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const asOfDate = new Date(selectedDate);
      console.log("📊 Fetching Balance Sheet as of:", asOfDate.toLocaleDateString());
      console.log("📊 Available vendors:", vendors.length);

      // Fetch all accounts from Trial Balance/Ledger
      // const accountsResponse = await fetch(`http://localhost:5000/api/ledgers/accounts`);
      const accountsResponse =await fetch(`https://debug-nxby.vercel.app/api/ledgers/accounts`)
      const accountsData = await accountsResponse.json();
      
      if (!accountsData.success) {
        throw new Error("Failed to fetch accounts");
      }

      console.log(`✅ Loaded ${accountsData.count} accounts from ledger`);

      // Categorize accounts
      const currentAssetsList = [];
      const fixedAssetsList = [];
      const otherAssetsList = [];
      const currentLiabilitiesList = [];
      const longTermLiabilitiesList = [];
      const equityList = [];

      // First, add all vendors to current liabilities with their CLOSING balance from ledger
      for (const vendor of vendors) {
        try {
          // Fetch vendor's ledger to get closing balance
          const params = new URLSearchParams({
            accountCode: vendor.code || "",
            accountName: vendor.name || "",
            fromDate: "2020-01-01", // Get all transactions
            toDate: selectedDate,
          });

          const ledgerResponse = await fetch(
            // `http://localhost:5000/api/ledgers/account-ledger?${params}`
            `https://debug-nxby.vercel.app/api/account-ledger?${params}`
          );
          const ledgerData = await ledgerResponse.json();

          let vendorBalance = 0;
          
          if (ledgerData.success && ledgerData.data) {
            // Get closing balance from ledger summary
            vendorBalance = Math.abs(ledgerData.data.summary?.closingBalance || 0);
            console.log(`📋 Vendor ${vendor.name} (${vendor.code}) - Ledger Closing Balance: ${vendorBalance}`);
          }
          
          // If no balance from ledger, try vendor record balance
          if (vendorBalance === 0) {
            vendorBalance = Math.abs(vendor.balance || 0);
            console.log(`   Fallback to vendor record balance: ${vendorBalance}`);
          }
          
          const vendorData = {
            code: vendor.code,
            name: `${vendor.name} (${vendor.code})`,
            originalName: vendor.name,
            type: 'PAYABLES',
            balance: vendorBalance, 
            category: 'Liabilities',
            vendorInfo: vendor,
            isVendor: true
          };
          
          currentLiabilitiesList.push(vendorData);
        } catch (err) {
          console.error(`Error loading ledger for vendor ${vendor.name}:`, err);
          // Add vendor with zero balance if ledger fetch fails
          currentLiabilitiesList.push({
            code: vendor.code,
            name: `${vendor.name} (${vendor.code})`,
            originalName: vendor.name,
            type: 'PAYABLES',
            balance: 0,
            category: 'Liabilities',
            vendorInfo: vendor,
            isVendor: true
          });
        }
      }

      // Then process other accounts from trial balance
      accountsData.data.forEach(account => {
        const balance = account.balance || 0;
        const absBalance = Math.abs(balance);
        
        // Check if this is a vendor account
        const isVendorAccount = account.category === 'Liabilities' && 
                               (account.type === 'PAYABLES' || account.type?.toLowerCase().includes('payable'));
        
        // Skip if it's a vendor (already added) or zero balance non-vendor
        if (isVendorAccount) {
          console.log(`⏭️ Skipping vendor account from trial balance: ${account.name} (already added from vendors)`);
          return;
        }
        
        if (absBalance === 0) {
          console.log(`⏭️ Skipping zero balance account: ${account.name}`);
          return;
        }

        // Get proper display name
        let displayName = account.name || account.accountName || 'Unknown Account';
        
        // If it's a customer (Asset/Receivables), show customer name
        if (account.category === 'Assets' && (account.type === 'RECEIVABLES' || account.type?.toLowerCase().includes('receivable'))) {
          displayName = `${displayName} (Customer)`;
        }

        const accountData = {
          code: account.code,
          name: displayName,
          originalName: account.name || account.accountName,
          type: account.type,
          balance: absBalance,
          category: account.category,
          isVendor: false
        };

        // Categorize by account category and type
        if (account.category === 'Assets') {
          const typeLower = (account.type || '').toLowerCase();
          
          // Skip inventory/stock accounts (not shown on Balance Sheet)
          if (typeLower.includes('inventory') || 
              typeLower.includes('stock') ||
              typeLower.includes('raw material')) {
            console.log(`⏭️ Skipping inventory account: ${account.name}`);
            return;
          }
          
          if (typeLower.includes('current') || 
              typeLower.includes('cash') || 
              typeLower.includes('bank') ||
              typeLower.includes('receivable') ||
              typeLower === 'receivables') {
            currentAssetsList.push(accountData);
          } else if (typeLower.includes('fixed') || 
                     typeLower.includes('property') ||
                     typeLower.includes('equipment') ||
                     typeLower.includes('building') ||
                     typeLower.includes('furniture')) {
            fixedAssetsList.push(accountData);
          } else {
            otherAssetsList.push(accountData);
          }
        } else if (account.category === 'Liabilities') {
          const typeLower = (account.type || '').toLowerCase();
          
          if (typeLower.includes('current') || 
              typeLower.includes('payable') ||
              typeLower.includes('short-term')) {
            currentLiabilitiesList.push(accountData);
          } else {
            longTermLiabilitiesList.push(accountData);
          }
        } else if (account.category === 'Equity') {
          equityList.push(accountData);
        }
      });

      console.log("📋 Categorization complete:", {
        currentAssets: currentAssetsList.length,
        fixedAssets: fixedAssetsList.length,
        otherAssets: otherAssetsList.length,
        currentLiabilities: currentLiabilitiesList.length,
        vendors: currentLiabilitiesList.filter(l => l.isVendor).length,
        longTermLiabilities: longTermLiabilitiesList.length,
        equity: equityList.length
      });

      // Set state
      setCurrentAssets(currentAssetsList);
      setFixedAssets(fixedAssetsList);
      setOtherAssets(otherAssetsList);
      setCurrentLiabilities(currentLiabilitiesList);
      setLongTermLiabilities(longTermLiabilitiesList);
      setEquity(equityList);

      // Calculate totals
      const currentAssetsTotal = currentAssetsList.reduce((sum, acc) => sum + acc.balance, 0);
      const fixedAssetsTotal = fixedAssetsList.reduce((sum, acc) => sum + acc.balance, 0);
      const otherAssetsTotal = otherAssetsList.reduce((sum, acc) => sum + acc.balance, 0);
      const assetsTotal = currentAssetsTotal + fixedAssetsTotal + otherAssetsTotal;

      const currentLiabilitiesTotal = currentLiabilitiesList.reduce((sum, acc) => sum + acc.balance, 0);
      const longTermLiabilitiesTotal = longTermLiabilitiesList.reduce((sum, acc) => sum + acc.balance, 0);
      const liabilitiesTotal = currentLiabilitiesTotal + longTermLiabilitiesTotal;

      const equityTotal = equityList.reduce((sum, acc) => sum + acc.balance, 0);
      const liabilitiesEquityTotal = liabilitiesTotal + equityTotal;

      setTotalCurrentAssets(currentAssetsTotal);
      setTotalFixedAssets(fixedAssetsTotal);
      setTotalOtherAssets(otherAssetsTotal);
      setTotalAssets(assetsTotal);

      setTotalCurrentLiabilities(currentLiabilitiesTotal);
      setTotalLongTermLiabilities(longTermLiabilitiesTotal);
      setTotalLiabilities(liabilitiesTotal);

      setTotalEquity(equityTotal);
      setTotalLiabilitiesEquity(liabilitiesEquityTotal);

      console.log("💰 Totals calculated:", {
        totalAssets: assetsTotal,
        totalLiabilitiesEquity: liabilitiesEquityTotal,
        balanced: Math.abs(assetsTotal - liabilitiesEquityTotal) < 0.01
      });

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

  const formatDate = () => {
    if (!selectedDate) return "";
    const date = new Date(selectedDate);
    return `As of ${date.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    })}`;
  };

  const handlePrint = () => {
    window.print();
  };

  const vendorCount = currentLiabilities.filter(l => l.isVendor).length;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Date Picker Section */}
      <div style={{ 
        marginBottom: "30px", 
        padding: "20px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
          <div style={{ flex: "1", minWidth: "200px" }}>
            <label style={{ 
              display: "block",
              marginBottom: "8px", 
              fontWeight: "600",
              color: "#495057",
              fontSize: "14px"
            }}>
              <Calendar style={{ width: "16px", height: "16px", display: "inline", marginRight: "5px" }} />
              As of Date:
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                border: "2px solid #dee2e6",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "500"
              }}
            />
          </div>
          <button
            onClick={() => {
              loadVendors();
              loadBalanceSheetData();
            }}
            disabled={loading || loadingVendors || !selectedDate}
            style={{
              padding: "10px 20px",
              backgroundColor: loading || loadingVendors ? "#6c757d" : "#0d6efd",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading || loadingVendors ? "not-allowed" : "pointer",
              fontWeight: "500",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "24px"
            }}
          >
            <RefreshCw style={{ width: "16px", height: "16px" }} />
            {loading || loadingVendors ? "Loading..." : "Refresh Data"}
          </button>
          <button
            onClick={handlePrint}
            disabled={loading || loadingVendors}
            style={{
              padding: "10px 20px",
              backgroundColor: "#198754",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading || loadingVendors ? "not-allowed" : "pointer",
              fontWeight: "500",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "24px"
            }}
          >
            <Printer style={{ width: "16px", height: "16px" }} />
            Print
          </button>
        </div>
        {loadingVendors && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#6c757d" }}>
            ⏳ Loading vendor information...
          </div>
        )}
        {!loadingVendors && vendors.length > 0 && (
          <div style={{ marginTop: "10px", fontSize: "12px", color: "#198754" }}>
            ✅ Loaded {vendors.length} vendors from liabilities
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div style={{
          padding: "15px",
          backgroundColor: "#f8d7da",
          color: "#721c24",
          border: "1px solid #f5c6cb",
          borderRadius: "6px",
          marginBottom: "20px"
        }}>
          ⚠️ {error}
        </div>
      )}

      {/* Balance Sheet Title */}
      <h2 style={{
        color: "#2c5ca9",
        textAlign: "center",
        marginBottom: "5px",
        fontWeight: "700",
        fontSize: "28px",
        letterSpacing: "-0.5px"
      }}>
        ABC & Co.
        <br />
        Balance Sheet
      </h2>

      {/* Date Range */}
      <p style={{
        textAlign: "center",
        fontWeight: "500",
        fontSize: "14px",
        color: "#6c757d",
        marginBottom: "40px"
      }}>
        {formatDate()}
      </p>

      {loading ? (
        <div style={{ 
          textAlign: "center", 
          padding: "40px",
          color: "#6c757d" 
        }}>
          <div style={{ 
            display: "inline-block",
            width: "40px",
            height: "40px",
            border: "4px solid #f3f3f3",
            borderTop: "4px solid #3f64a8",
            borderRadius: "50%",
            animation: "spin 1s linear infinite"
          }} />
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: "15px" }}>Loading Balance Sheet...</p>
        </div>
      ) : (
        <>
          {/* ========== ASSETS ========== */}
          <div style={{
            backgroundColor: "#3f64a8",
            color: "white",
            fontWeight: "bold",
            padding: "10px 15px",
            fontSize: "16px"
          }}>
            Assets
          </div>

          {/* CURRENT ASSETS */}
          <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "10px" }}>
            Current Assets
          </div>

          <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
            {currentAssets.length > 0 ? (
              currentAssets.map((asset, index) => (
                <div key={index} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 15px 6px 0",
                  borderBottom: "1px solid #f0f0f0"
                }}>
                  <span style={{ fontSize: "15px", color: "#000" }}>
                    {asset.name}
                  </span>
                  <span style={{
                    fontSize: "15px",
                    color: "#000",
                    fontFamily: "monospace",
                    minWidth: "120px",
                    textAlign: "right"
                  }}>
                    {formatCurrency(asset.balance)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: "10px 0", color: "#999", fontSize: "14px" }}>
                No current assets
              </div>
            )}
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 15px",
            backgroundColor: "#f8f9fa",
            fontWeight: "600",
            borderTop: "1px solid #dee2e6"
          }}>
            <span>Total Current Assets</span>
            <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalCurrentAssets)}</span>
          </div>

          {/* FIXED ASSETS */}
          <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "15px" }}>
            Fixed (Long-Term) Assets
          </div>

          <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
            {fixedAssets.length > 0 ? (
              fixedAssets.map((asset, index) => (
                <div key={index} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 15px 6px 0",
                  borderBottom: "1px solid #f0f0f0"
                }}>
                  <span style={{ fontSize: "15px", color: "#000" }}>
                    {asset.name}
                  </span>
                  <span style={{
                    fontSize: "15px",
                    color: "#000",
                    fontFamily: "monospace",
                    minWidth: "120px",
                    textAlign: "right"
                  }}>
                    {formatCurrency(asset.balance)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: "10px 0", color: "#999", fontSize: "14px" }}>
                No fixed assets
              </div>
            )}
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 15px",
            backgroundColor: "#f8f9fa",
            fontWeight: "600",
            borderTop: "1px solid #dee2e6"
          }}>
            <span>Total Fixed Assets</span>
            <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalFixedAssets)}</span>
          </div>

          {/* OTHER ASSETS */}
          {otherAssets.length > 0 && (
            <>
              <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "15px" }}>
                Other Assets
              </div>

              <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
                {otherAssets.map((asset, index) => (
                  <div key={index} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 15px 6px 0",
                    borderBottom: "1px solid #f0f0f0"
                  }}>
                    <span style={{ fontSize: "15px", color: "#000" }}>
                      {asset.name}
                    </span>
                    <span style={{
                      fontSize: "15px",
                      color: "#000",
                      fontFamily: "monospace",
                      minWidth: "120px",
                      textAlign: "right"
                    }}>
                      {formatCurrency(asset.balance)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 15px",
                backgroundColor: "#f8f9fa",
                fontWeight: "600",
                borderTop: "1px solid #dee2e6"
              }}>
                <span>Total Other Assets</span>
                <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalOtherAssets)}</span>
              </div>
            </>
          )}

          {/* TOTAL ASSETS */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "15px",
            backgroundColor: "#d1e7dd",
            fontWeight: "700",
            fontSize: "17px",
            marginTop: "15px",
            borderTop: "2px solid #0f5132",
            borderBottom: "2px solid #0f5132"
          }}>
            <span>TOTAL ASSETS</span>
            <span style={{ fontFamily: "monospace", color: "#0f5132" }}>{formatCurrency(totalAssets)}</span>
          </div>

          {/* ========== LIABILITIES & EQUITY ========== */}
          <div style={{
            backgroundColor: "#3f64a8",
            color: "white",
            fontWeight: "bold",
            padding: "10px 15px",
            fontSize: "16px",
            marginTop: "30px"
          }}>
            Liabilities and Owner's Equity
          </div>

          {/* CURRENT LIABILITIES */}
          <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "10px" }}>
            Current Liabilities ({vendorCount} vendors)
          </div>

          <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
            {currentLiabilities.length > 0 ? (
              currentLiabilities.map((liability, index) => (
                <div key={index} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 15px 6px 0",
                  borderBottom: "1px solid #f0f0f0",
                  backgroundColor: liability.isVendor ? "#fff8f0" : "#fff"
                }}>
                  <span style={{ fontSize: "15px", color: "#000" }}>
                    {liability.name}
                    {liability.isVendor && (
                      <span style={{ fontSize: "11px", color: "#666", marginLeft: "8px" }}>
                        [Vendor Payable]
                      </span>
                    )}
                  </span>
                  <span style={{
                    fontSize: "15px",
                    color: liability.isVendor ? "#d63384" : "#000",
                    fontFamily: "monospace",
                    minWidth: "120px",
                    textAlign: "right",
                    fontWeight: liability.isVendor ? "600" : "normal"
                  }}>
                    {formatCurrency(liability.balance)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: "10px 0", color: "#999", fontSize: "14px" }}>
                No current liabilities
              </div>
            )}
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 15px",
            backgroundColor: "#f8f9fa",
            fontWeight: "600",
            borderTop: "1px solid #dee2e6"
          }}>
            <span>Total Current Liabilities</span>
            <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalCurrentLiabilities)}</span>
          </div>

          {/* LONG TERM LIABILITIES */}
          {longTermLiabilities.length > 0 && (
            <>
              <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "15px" }}>
                Long-Term Liabilities
              </div>

              <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
                {longTermLiabilities.map((liability, index) => (
                  <div key={index} style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "6px 15px 6px 0",
                    borderBottom: "1px solid #f0f0f0"
                  }}>
                    <span style={{ fontSize: "15px", color: "#000" }}>
                      {liability.name}
                    </span>
                    <span style={{
                      fontSize: "15px",
                      color: "#000",
                      fontFamily: "monospace",
                      minWidth: "120px",
                      textAlign: "right"
                    }}>
                      {formatCurrency(liability.balance)}
                    </span>
                  </div>
                ))}
              </div>

              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 15px",
                backgroundColor: "#f8f9fa",
                fontWeight: "600",
                borderTop: "1px solid #dee2e6"
              }}>
                <span>Total Long-Term Liabilities</span>
                <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalLongTermLiabilities)}</span>
              </div>
            </>
          )}

          {/* OWNER'S EQUITY */}
          <div style={{ background: "#e6edf8", fontWeight: "700", padding: "8px 15px", marginTop: "15px" }}>
            Owner's Equity
          </div>

          <div style={{ paddingLeft: "25px", lineHeight: "1.8", backgroundColor: "#fff" }}>
            {equity.length > 0 ? (
              equity.map((eq, index) => (
                <div key={index} style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "6px 15px 6px 0",
                  borderBottom: "1px solid #f0f0f0"
                }}>
                  <span style={{ fontSize: "15px", color: "#000" }}>
                    {eq.name}
                  </span>
                  <span style={{
                    fontSize: "15px",
                    color: "#000",
                    fontFamily: "monospace",
                    minWidth: "120px",
                    textAlign: "right"
                  }}>
                    {formatCurrency(eq.balance)}
                  </span>
                </div>
              ))
            ) : (
              <div style={{ padding: "10px 0", color: "#999", fontSize: "14px" }}>
                No equity accounts
              </div>
            )}
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "10px 15px",
            backgroundColor: "#f8f9fa",
            fontWeight: "600",
            borderTop: "1px solid #dee2e6"
          }}>
            <span>Total Owner's Equity</span>
            <span style={{ fontFamily: "monospace" }}>{formatCurrency(totalEquity)}</span>
          </div>

          {/* TOTAL LIABILITIES & EQUITY */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "15px",
            backgroundColor: "#cfe2ff",
            fontWeight: "700",
            fontSize: "17px",
            marginTop: "15px",
            borderTop: "2px solid #084298",
            borderBottom: "2px solid #084298"
          }}>
            <span>TOTAL LIABILITIES AND OWNER'S EQUITY</span>
            <span style={{ fontFamily: "monospace", color: "#084298" }}>
              {formatCurrency(totalLiabilitiesEquity)}
            </span>
          </div>

          {/* Balance Check */}
          {Math.abs(totalAssets - totalLiabilitiesEquity) > 0.01 && (
            <div style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#fff3cd",
              border: "1px solid #ffc107",
              borderRadius: "6px",
              color: "#856404"
            }}>
              ⚠️ Balance Sheet is not balanced!
              <br />
              Difference: {formatCurrency(Math.abs(totalAssets - totalLiabilitiesEquity))}
            </div>
          )}

          {Math.abs(totalAssets - totalLiabilitiesEquity) <= 0.01 && (
            <div style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "#d1e7dd",
              border: "1px solid #198754",
              borderRadius: "6px",
              color: "#0f5132"
            }}>
              ✅ Balance Sheet is balanced!
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default BalanceSheet;