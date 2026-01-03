import React, { useState, useEffect } from "react";
import ApiHandler from "@/Api/apihandle";
import { Calendar, RefreshCw, TrendingUp, DollarSign, Percent } from "lucide-react";

function ProfitLoss() {
  const [selectedDate, setSelectedDate] = useState("");
  const [sales, setSales] = useState([]);
  const [saleDiscounts, setSaleDiscounts] = useState([]);
  const [saleReturns, setSaleReturns] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalDiscounts, setTotalDiscounts] = useState(0);
  const [totalReturns, setTotalReturns] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Automatically set today's date when component loads
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];
    setSelectedDate(today);
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadRevenueData();
    }
  }, [selectedDate]);

  const loadRevenueData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const year = new Date(selectedDate).getFullYear();
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;

      console.log("📅 Fetching data for year:", year);
      console.log("🔍 Date range:", startDate, "to", endDate);

      // Fetch sales data with filters
      const salesResponse = await ApiHandler.getSales({
        startDate,
        endDate
      });
      
      console.log("📊 Sales Response:", salesResponse);

      // Handle API response structure
      let salesData = [];
      if (salesResponse && salesResponse.success && Array.isArray(salesResponse.data)) {
        salesData = salesResponse.data;
      } else if (Array.isArray(salesResponse.data)) {
        salesData = salesResponse.data;
      } else if (Array.isArray(salesResponse)) {
        salesData = salesResponse;
      }
      
      console.log("✅ Processed Sales Data:", salesData.length, "records");
      setSales(salesData);
      
      // Calculate total sales from totalAmount field
      const salesTotal = salesData.reduce((sum, sale) => {
        // Use totalAmount directly as it's already calculated in the model
        const amount = sale.totalAmount || 0;
        return sum + amount;
      }, 0);
      
      console.log("💰 Total Sales Calculated:", salesTotal);
      setTotalSales(salesTotal);

      // Fetch sale returns
      const returnsResponse = await ApiHandler.getReturns({
        startDate,
        endDate
      });
      console.log("🔄 Returns Response:", returnsResponse);

      // Handle returns response structure
      let returnsData = [];
      if (returnsResponse && returnsResponse.success && Array.isArray(returnsResponse.data)) {
        returnsData = returnsResponse.data;
      } else if (Array.isArray(returnsResponse.data)) {
        returnsData = returnsResponse.data;
      } else if (Array.isArray(returnsResponse)) {
        returnsData = returnsResponse;
      }

      console.log("✅ Processed Returns Data:", returnsData.length, "records");
      setSaleReturns(returnsData);

      // Calculate total returns (using refundAmount)
      const returnsTotal = returnsData.reduce((sum, returnItem) => {
        return sum + (returnItem.refundAmount || 0);
      }, 0);

      console.log("🔙 Total Returns Calculated:", returnsTotal);
      setTotalReturns(returnsTotal);

      // Fetch sale discounts
      const discountsResponse = await ApiHandler.getSaleDiscounts();
      console.log("🎯 Discounts Response:", discountsResponse);
      
      // Handle discounts response structure
      let discountsData = [];
      if (discountsResponse && discountsResponse.success && Array.isArray(discountsResponse.data)) {
        discountsData = discountsResponse.data;
      } else if (Array.isArray(discountsResponse.data)) {
        discountsData = discountsResponse.data;
      } else if (Array.isArray(discountsResponse)) {
        discountsData = discountsResponse;
      }
      
      // Filter discounts for the selected year
      const yearDiscounts = discountsData.filter(discount => {
        const discountDate = new Date(discount.date);
        const discountYear = discountDate.getFullYear();
        return discountYear === year;
      });
      
      console.log("✅ Filtered Discounts:", yearDiscounts.length, "records for year", year);
      setSaleDiscounts(yearDiscounts);
      
      // Calculate total discounts using creditAmount
      const discountsTotal = yearDiscounts.reduce((sum, discount) => {
        return sum + (discount.creditAmount || 0);
      }, 0);
      
      console.log("💸 Total Discounts Calculated:", discountsTotal);
      setTotalDiscounts(discountsTotal);

      // Fetch Chart of Accounts - Expenses to get all expense account codes
      let expenseAccountCodes = new Set();
      try {
        const chartExpensesResponse = await ApiHandler.getChartExpenses();
        let chartExpenses = [];
        
        if (chartExpensesResponse && chartExpensesResponse.success && Array.isArray(chartExpensesResponse.data)) {
          chartExpenses = chartExpensesResponse.data;
        } else if (Array.isArray(chartExpensesResponse.data)) {
          chartExpenses = chartExpensesResponse.data;
        } else if (Array.isArray(chartExpensesResponse)) {
          chartExpenses = chartExpensesResponse;
        }
        
        // Extract all expense account codes (usually start with 5)
        chartExpenses.forEach(exp => {
          if (exp.code) {
            expenseAccountCodes.add(exp.code);
          }
        });
        
        console.log("📋 Expense Account Codes from Chart:", Array.from(expenseAccountCodes));
      } catch (err) {
        console.warn("⚠️ Could not load chart of accounts, will use debit logic only");
      }

      // Fetch expenses from vouchers (CPV & BPV - Cash/Bank Payment Vouchers with DR entries)
      const vouchersResponse = await ApiHandler.getVouchers({
        startDate,
        endDate
      });
      console.log("💼 Vouchers Response:", vouchersResponse);

      // Handle vouchers response structure
      let vouchersData = [];
      if (vouchersResponse && vouchersResponse.success && Array.isArray(vouchersResponse.data)) {
        vouchersData = vouchersResponse.data;
      } else if (Array.isArray(vouchersResponse.data)) {
        vouchersData = vouchersResponse.data;
      } else if (Array.isArray(vouchersResponse)) {
        vouchersData = vouchersResponse;
      }

      console.log("✅ Total Vouchers Found:", vouchersData.length);
      
      // Debug first voucher structure
      if (vouchersData.length > 0) {
        console.log("🔍 First Voucher Structure:", vouchersData[0]);
        console.log("🔍 First Voucher Keys:", Object.keys(vouchersData[0]));
        console.log("🔍 Entries Field:", vouchersData[0].entries);
        console.log("🔍 Has entries?:", vouchersData[0].entries !== undefined);
        console.log("🔍 Entries is array?:", Array.isArray(vouchersData[0].entries));
      }

      // Extract expense entries from CPV and BPV vouchers
      let expensesData = [];
      
      console.log("🔍 Processing vouchers for expenses...");
      
      for (const voucher of vouchersData) {
        const isPaymentVoucher = voucher.voucherType === 'CPV' || 
                                  voucher.voucherType === 'BPV' ||
                                  voucher.type === 'CPV' || 
                                  voucher.type === 'BPV';
        
        console.log(`📝 Voucher ${voucher.voucherNo}: Type=${voucher.voucherType || voucher.type}, IsPayment=${isPaymentVoucher}`);
        
        if (isPaymentVoucher) {
          // First try to use entries if they exist in the voucher itself
          if (voucher.entries && Array.isArray(voucher.entries) && voucher.entries.length > 0) {
            console.log(`  ✅ Found ${voucher.entries.length} entries directly in voucher`);
            
            voucher.entries.forEach((entry, idx) => {
              console.log(`  Entry ${idx}:`, entry);
              
              // Check if this is a debit entry (expense) - debitAmount > 0
              const isDebit = (entry.debitAmount && entry.debitAmount > 0);
              const accountCode = entry.accountCode || entry.code || '';
              const accountName = entry.account || entry.accountName || '';
              
              // Check if this account is in expense chart OR account code starts with 5 (expense accounts)
              const isExpenseByCode = expenseAccountCodes.size > 0 
                ? expenseAccountCodes.has(accountCode)
                : accountCode.startsWith('5'); // Fallback: expense accounts usually start with 5
              
              // Also check by name keywords
              const isExpenseByName = accountName.includes('EXPENSE') || 
                                     accountName.includes('SALARY') || 
                                     accountName.includes('SALARIES') ||
                                     accountName.includes('RENT') ||
                                     accountName.includes('UTILITY') ||
                                     accountName.includes('UTILITIES') ||
                                     accountName.includes('TRAVEL') ||
                                     accountName.includes('CHARGES') ||
                                     accountName.includes('FEE') ||
                                     accountName.includes('SUPPLY') ||
                                     accountName.includes('MATERIAL') ||
                                     accountName.includes('DEPRECIATION') ||
                                     accountName.includes('ADVERTISEMENT') ||
                                     accountName.includes('MARKETING') ||
                                     accountName.includes('INTERNET') ||
                                     accountName.includes('ELECTRICITY') ||
                                     accountName.includes('WATER');
              
              const isExpenseAccount = isExpenseByCode || isExpenseByName;
              
              console.log(`    IsDebit: ${isDebit}, Code: ${accountCode}, Name: ${accountName}`);
              console.log(`    IsExpenseByCode: ${isExpenseByCode}, IsExpenseByName: ${isExpenseByName}, Final: ${isExpenseAccount}`);
              
              if (isDebit && isExpenseAccount) {
                console.log(`    ✅ This is an EXPENSE entry! Amount: ${entry.debitAmount}`);
                expensesData.push({
                  voucherNo: voucher.voucherNo,
                  voucherType: voucher.voucherType || voucher.type,
                  date: voucher.voucherDate || voucher.date,
                  accountName: accountName,
                  accountCode: accountCode,
                  description: entry.description || voucher.description || voucher.narration,
                  amount: entry.debitAmount || entry.amount || 0,
                  serialNo: entry.serialNo
                });
              }
            });
          } else {
            // If entries not in main voucher, try to fetch by ID
            console.log(`  ⚠️ No entries in voucher, trying to fetch by ID...`);
            try {
              const voucherDetails = await ApiHandler.getVoucherById(voucher._id || voucher.id);
              console.log(`  📄 Fetched details:`, voucherDetails);
              
              const fullVoucher = voucherDetails.data || voucherDetails;
              
              if (fullVoucher.entries && Array.isArray(fullVoucher.entries)) {
                console.log(`  ✅ Found ${fullVoucher.entries.length} entries from API`);
                
                fullVoucher.entries.forEach(entry => {
                  const isDebit = (entry.debitAmount && entry.debitAmount > 0);
                  const accountCode = entry.accountCode || entry.code || '';
                  const accountName = entry.account || entry.accountName || '';
                  
                  const isExpenseByCode = expenseAccountCodes.size > 0 
                    ? expenseAccountCodes.has(accountCode)
                    : accountCode.startsWith('5');
                  
                  const isExpenseByName = accountName.includes('EXPENSE') || 
                                         accountName.includes('SALARY') || 
                                         accountName.includes('SALARIES') ||
                                         accountName.includes('RENT') ||
                                         accountName.includes('UTILITY') ||
                                         accountName.includes('UTILITIES') ||
                                         accountName.includes('TRAVEL') ||
                                         accountName.includes('CHARGES') ||
                                         accountName.includes('FEE') ||
                                         accountName.includes('SUPPLY') ||
                                         accountName.includes('MATERIAL') ||
                                         accountName.includes('DEPRECIATION') ||
                                         accountName.includes('ADVERTISEMENT') ||
                                         accountName.includes('MARKETING') ||
                                         accountName.includes('INTERNET') ||
                                         accountName.includes('ELECTRICITY') ||
                                         accountName.includes('WATER');
                  
                  const isExpenseAccount = isExpenseByCode || isExpenseByName;
                  
                  if (isDebit && isExpenseAccount) {
                    expensesData.push({
                      voucherNo: voucher.voucherNo,
                      voucherType: voucher.voucherType || voucher.type,
                      date: voucher.voucherDate || voucher.date,
                      accountName: accountName,
                      accountCode: accountCode,
                      description: entry.description || voucher.description || voucher.narration,
                      amount: entry.debitAmount || entry.amount || 0,
                      serialNo: entry.serialNo
                    });
                  }
                });
              }
            } catch (err) {
              console.error(`  ❌ Error fetching voucher ${voucher.voucherNo}:`, err.message);
            }
          }
        }
      }

      console.log("✅ Total Expense Entries Found:", expensesData.length);
      if (expensesData.length > 0) {
        console.log("✅ Sample Expenses:", expensesData.slice(0, 3));
      } else {
        console.warn("⚠️ NO EXPENSES FOUND! Check if:");
        console.warn("  1. Vouchers have voucherType = 'CPV' or 'BPV'");
        console.warn("  2. Entries exist in vouchers");
        console.warn("  3. Entries have debitAmount > 0 and account name contains EXPENSE");
      }

      setExpenses(expensesData);

      // Calculate total expenses
      const expensesTotal = expensesData.reduce((sum, expense) => {
        return sum + (expense.amount || 0);
      }, 0);

      console.log("💵 Total Expenses Calculated:", expensesTotal);
      setTotalExpenses(expensesTotal);

    } catch (error) {
      console.error("❌ Error loading revenue data:", error);
      setError(error.message || "Failed to load revenue data");
      // Set defaults on error
      setSales([]);
      setSaleReturns([]);
      setSaleDiscounts([]);
      setExpenses([]);
      setTotalSales(0);
      setTotalReturns(0);
      setTotalDiscounts(0);
      setTotalExpenses(0);
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

  const formatYearText = () => {
    if (!selectedDate) return "";
    const year = new Date(selectedDate).getFullYear();
    const prevYear = year - 1;
    return `For the Years Ending [Dec 31, ${year} and Dec 31, ${prevYear}]`;
  };

  const netRevenue = totalSales - totalReturns - totalDiscounts;
  const discountPercentage = totalSales > 0 ? ((totalDiscounts / totalSales) * 100).toFixed(2) : 0;
  const returnPercentage = totalSales > 0 ? ((totalReturns / totalSales) * 100).toFixed(2) : 0;

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
              Select Date:
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
            onClick={loadRevenueData}
            disabled={loading || !selectedDate}
            style={{
              padding: "10px 20px",
              backgroundColor: loading ? "#6c757d" : "#0d6efd",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: loading ? "not-allowed" : "pointer",
              fontWeight: "500",
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "24px"
            }}
          >
            <RefreshCw style={{ width: "16px", height: "16px" }} />
            {loading ? "Loading..." : "Refresh Data"}
          </button>
        </div>
        {selectedDate && (
          <div style={{ marginTop: "12px", fontSize: "13px", color: "#6c757d" }}>
            📊 Viewing data for entire year: <strong>{new Date(selectedDate).getFullYear()}</strong>
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

      {/* Income Statement Heading */}
      <h2 style={{ 
        color: "#2c5ca9", 
        textAlign: "center",
        marginBottom: "8px",
        fontSize: "28px",  
        fontWeight: "bold",
        letterSpacing: "-0.5px"
      }}>
        Income Statement
      </h2>

      {/* Years Line */}
      <p style={{ 
        textAlign: "center",
        fontWeight: "500",
        fontSize: "14px",
        color: "#6c757d",
        marginBottom: "40px"
      }}>
        {formatYearText()}
      </p>

      {/* Revenue Section */}
      <div style={{
        backgroundColor: "#3f64a8",
        color: "white",
        fontWeight: "bold",
        padding: "10px 15px",
        marginTop: "25px",
        fontSize: "16px",
        display: "flex",
        alignItems: "center",
        gap: "8px"
      }}>
        <DollarSign style={{ width: "20px", height: "20px" }} />
        Revenue
      </div>

      {loading ? (
        <div style={{ 
          padding: "40px", 
          textAlign: "center",
          color: "#6c757d",
          backgroundColor: "#fff",
          border: "1px solid #dee2e6",
          borderTop: "none",
          borderRadius: "0 0 6px 6px"
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
          <p style={{ marginTop: "15px", fontWeight: "500" }}>Loading revenue data...</p>
        </div>
      ) : selectedDate ? (
        <div style={{ 
          backgroundColor: "#fff",
          padding: "20px 30px"
        }}>
          {/* Sales Row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "15px", color: "#000" }}>Sales</span>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(totalSales)}
            </span>
          </div>

          {/* Sale Return Row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            alignItems: "center"
          }}>
            <span style={{ 
              fontSize: "15px", 
              color: "#000",
              paddingLeft: "20px"
            }}>
              Less: Sale Return
            </span>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(totalReturns)}
            </span>
          </div>

          {/* Sales Discount Row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            alignItems: "center",
            borderBottom: "1px solid #000",
            paddingBottom: "12px"
          }}>
            <span style={{ 
              fontSize: "15px", 
              color: "#000",
              paddingLeft: "20px"
            }}>
              Less: Sales Discount
            </span>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(totalDiscounts)}
            </span>
          </div>

          {/* Total Revenues Row */}
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0 8px 0",
            alignItems: "center"
          }}>
            <span style={{ 
              fontSize: "16px",
              fontWeight: "bold",
              color: "#000"
            }}>
              Total Revenues
            </span>
            <span style={{ 
              fontSize: "16px",
              fontWeight: "bold",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(netRevenue)}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: "40px", 
          textAlign: "center",
          color: "#6c757d",
          border: "1px solid #dee2e6",
          borderTop: "none",
          backgroundColor: "#f8f9fa",
          borderRadius: "0 0 6px 6px"
        }}>
          <Calendar style={{ width: "48px", height: "48px", margin: "0 auto 15px", opacity: 0.3 }} />
          <p style={{ fontSize: "15px", fontWeight: "500" }}>Please select a date to view revenue data</p>
        </div>
      )}

      {/* Detailed Revenue Breakdown */}
      {selectedDate && !loading && (sales.length > 0 || saleReturns.length > 0 || saleDiscounts.length > 0) && (
        <div style={{
          marginTop: "30px",
          padding: "20px",
          backgroundColor: "#fff",
          borderRadius: "8px",
          border: "1px solid #dee2e6",
          boxShadow: "0 2px 4px rgba(0,0,0,0.05)"
        }}>
          <h4 style={{ 
            marginTop: 0, 
            marginBottom: "20px",
            color: "#212529",
            fontSize: "16px",
            fontWeight: "700",
            borderBottom: "2px solid #e9ecef",
            paddingBottom: "10px"
          }}>
            📈 Revenue Breakdown - Year {new Date(selectedDate).getFullYear()}
          </h4>
          
          <div style={{ 
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "15px",
            fontSize: "14px"
          }}>
            <div style={{ 
              padding: "15px",
              backgroundColor: "#d1e7dd",
              borderRadius: "6px",
              border: "1px solid #badbcc"
            }}>
              <div style={{ color: "#0f5132", fontWeight: "600", marginBottom: "8px" }}>
                💰 Total Sales
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#198754" }}>
                PKR {formatCurrency(totalSales)}
              </div>
              <div style={{ fontSize: "12px", color: "#0f5132", marginTop: "5px" }}>
                {sales.length} invoices
              </div>
            </div>

            <div style={{ 
              padding: "15px",
              backgroundColor: "#fff3cd",
              borderRadius: "6px",
              border: "1px solid #ffecb5"
            }}>
              <div style={{ color: "#664d03", fontWeight: "600", marginBottom: "8px" }}>
                🔄 Sale Returns
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#856404" }}>
                PKR {formatCurrency(totalReturns)}
              </div>
              <div style={{ fontSize: "12px", color: "#664d03", marginTop: "5px" }}>
                {saleReturns.length} return entries
              </div>
            </div>

            <div style={{ 
              padding: "15px",
              backgroundColor: "#f8d7da",
              borderRadius: "6px",
              border: "1px solid #f5c2c7"
            }}>
              <div style={{ color: "#842029", fontWeight: "600", marginBottom: "8px" }}>
                💸 Sale Discounts
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#dc3545" }}>
                PKR {formatCurrency(totalDiscounts)}
              </div>
              <div style={{ fontSize: "12px", color: "#842029", marginTop: "5px" }}>
                {saleDiscounts.length} discount entries
              </div>
            </div>

            <div style={{ 
              padding: "15px",
              backgroundColor: "#cfe2ff",
              borderRadius: "6px",
              border: "1px solid #b6d4fe"
            }}>
              <div style={{ color: "#084298", fontWeight: "600", marginBottom: "8px" }}>
                📊 Net Revenue
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#0d6efd" }}>
                PKR {formatCurrency(netRevenue)}
              </div>
              <div style={{ fontSize: "12px", color: "#084298", marginTop: "5px" }}>
                After returns & discounts
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Other Sections Placeholders */}
      <div style={{
        backgroundColor: "#3f64a8",
        color: "white",
        fontWeight: "bold",
        padding: "10px 15px",
        marginTop: "30px",
        fontSize: "16px"
      }}>
        Cost of Goods Sold
      </div>

      {/* Expenses Section */}
      <div style={{
        backgroundColor: "#3f64a8",
        color: "white",
        fontWeight: "bold",
        padding: "10px 15px",
        marginTop: "30px",
        fontSize: "16px"
      }}>
        Expenses
      </div>

      {loading ? (
        <div style={{ 
          padding: "20px", 
          textAlign: "center",
          color: "#6c757d",
          backgroundColor: "#fff"
        }}>
          <p>Loading expenses...</p>
        </div>
      ) : selectedDate ? (
        <div style={{ 
          backgroundColor: "#fff",
          padding: "20px 30px"
        }}>
          {expenses.length > 0 ? (
            <>
              {/* List all expenses */}
              {expenses.map((expense, index) => {
                return (
                  <div 
                    key={expense.voucherNo + '-' + index}
                  
                  >
                    <div style={{ flex: 1 }}>
                      <span style={{ 
                        fontSize: "15px", 
                        color: "#000",
                        display: "block"
                      }}>
                        {expense.accountName}
                        
                      </span>
                     
                    </div>
                    <span style={{ 
                      fontSize: "15px",
                      color: "#000",
                      fontFamily: "monospace",
                      minWidth: "120px",
                      marginLeft: "92%",
                    }}>
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                );
              })}

              {/* Total Expenses Row */}
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "12px 0 8px 0",
                marginTop: "8px",
                borderTop: "1px solid #000",
                alignItems: "center"
              }}>
                <span style={{ 
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#000"
                }}>
                  Total Expenses
                </span>
                <span style={{ 
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#000",
                  fontFamily: "monospace",
                  minWidth: "120px",
                  textAlign: "right"
                }}>
                  {formatCurrency(totalExpenses)}
                </span>
              </div>
            </>
          ) : (
            /* Show zero when no expenses */
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "12px 0 8px 0",
              alignItems: "center"
            }}>
              <span style={{ 
                fontSize: "16px",
                fontWeight: "bold",
                color: "#000"
              }}>
                Total Expenses
              </span>
              <span style={{ 
                fontSize: "16px",
                fontWeight: "bold",
                color: "#000",
                fontFamily: "monospace",
                minWidth: "120px",
                textAlign: "right"
              }}>
                {formatCurrency(0)}
              </span>
            </div>
          )}
        </div>
      ) : (
        <div style={{ 
          padding: "20px", 
          textAlign: "center",
          color: "#6c757d",
          backgroundColor: "#f8f9fa"
        }}>
          <p>Please select a date to view expenses</p>
        </div>
      )}

      <div style={{
        backgroundColor: "#3f64a8",
        color: "white",
        fontWeight: "bold",
        padding: "10px 15px",
        marginTop: "30px",
        fontSize: "16px"
      }}>
        Income from Other Sources
      </div>
    </div>
  );
}

export default ProfitLoss;