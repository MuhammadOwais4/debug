import React, { useState, useEffect } from "react";
import ApiHandler from "@/Api/apihandle";
import { Calendar, RefreshCw, TrendingUp, DollarSign, Percent } from "lucide-react";

function ProfitLoss() {
  const [selectedDate, setSelectedDate] = useState("");
  const [sales, setSales] = useState([]);
  const [saleDiscounts, setSaleDiscounts] = useState([]);
  const [saleReturns, setSaleReturns] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [otherIncome, setOtherIncome] = useState([]);
  const [products, setProducts] = useState([]);
  const [purchaseReturns, setPurchaseReturns] = useState([]);
  const [purchaseDiscounts, setPurchaseDiscounts] = useState([]);
  const [totalSales, setTotalSales] = useState(0);
  const [totalDiscounts, setTotalDiscounts] = useState(0);
  const [totalReturns, setTotalReturns] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [totalOtherIncome, setTotalOtherIncome] = useState(0);
  const [openingStock, setOpeningStock] = useState(0);
  const [purchases, setPurchases] = useState(0);
  const [totalPurchaseReturns, setTotalPurchaseReturns] = useState(0);
  const [totalPurchaseDiscounts, setTotalPurchaseDiscounts] = useState(0);
  const [closingStock, setClosingStock] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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

      // const accountsResponse = await fetch(`http://localhost:5000/api/ledgers/accounts`);
      const accountsResponse = await ApiHandler("https://debug-nxby.vercel.app/api/ledgers/accounts");
      const accountsData = await accountsResponse.json();
      
      if (!accountsData.success) {
        throw new Error("Failed to fetch accounts");
      }

      console.log(`✅ Loaded ${accountsData.count} accounts from Trial Balance`);

      let openingStockValue = 0;
      const stockAccount = accountsData.data.find(acc => 
        acc.name?.toUpperCase().includes('STOCK') || 
        acc.name?.toUpperCase().includes('INVENTORY') ||
        acc.code?.toUpperCase().includes('STOCK')
      );

      if (stockAccount) {
        openingStockValue = Math.abs(stockAccount.balance || 0);
        console.log("📦 Found Stock Account:", {
          code: stockAccount.code,
          name: stockAccount.name,
          balance: stockAccount.balance,
          openingStock: openingStockValue
        });
      } else {
        console.warn("⚠️ Stock account not found in Trial Balance");
      }

      setOpeningStock(openingStockValue);

      const salesResponse = await ApiHandler.getSales({
        startDate,
        endDate
      });
      
      console.log("📊 Sales Response:", salesResponse);

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
      
      const salesTotal = salesData.reduce((sum, sale) => {
        const amount = sale.totalAmount || 0;
        return sum + amount;
      }, 0);
      
      console.log("💰 Total Sales Calculated:", salesTotal);
      setTotalSales(salesTotal);

      const returnsResponse = await ApiHandler.getReturns({
        startDate,
        endDate
      });
      console.log("🔄 Returns Response:", returnsResponse);

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

      const returnsTotal = returnsData.reduce((sum, returnItem) => {
        return sum + (returnItem.refundAmount || 0);
      }, 0);

      console.log("🔙 Total Returns Calculated:", returnsTotal);
      setTotalReturns(returnsTotal);

      const discountsResponse = await ApiHandler.getSaleDiscounts();
      console.log("🎯 Discounts Response:", discountsResponse);
      
      let discountsData = [];
      if (discountsResponse && discountsResponse.success && Array.isArray(discountsResponse.data)) {
        discountsData = discountsResponse.data;
      } else if (Array.isArray(discountsResponse.data)) {
        discountsData = discountsResponse.data;
      } else if (Array.isArray(discountsResponse)) {
        discountsData = discountsResponse;
      }
      
      const yearDiscounts = discountsData.filter(discount => {
        const discountDate = new Date(discount.date);
        const discountYear = discountDate.getFullYear();
        return discountYear === year;
      });
      
      console.log("✅ Filtered Discounts:", yearDiscounts.length, "records for year", year);
      setSaleDiscounts(yearDiscounts);
      
      const discountsTotal = yearDiscounts.reduce((sum, discount) => {
        return sum + (discount.creditAmount || 0);
      }, 0);
      
      console.log("💸 Total Discounts Calculated:", discountsTotal);
      setTotalDiscounts(discountsTotal);

      let expenseAccountCodes = new Set();
      let stockAccountCode = null;
      
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
        
        chartExpenses.forEach(exp => {
          if (exp.code) {
            expenseAccountCodes.add(exp.code);
          }
        });
        
        console.log("📋 Expense Account Codes from Chart:", Array.from(expenseAccountCodes));
      } catch (err) {
        console.warn("⚠️ Could not load chart of accounts, will use debit logic only");
      }

      try {
        const chartAssetsResponse = await ApiHandler.getAssets();
        let chartAssets = [];
        
        if (chartAssetsResponse && chartAssetsResponse.success && Array.isArray(chartAssetsResponse.data)) {
          chartAssets = chartAssetsResponse.data;
        } else if (Array.isArray(chartAssetsResponse.data)) {
          chartAssets = chartAssetsResponse.data;
        } else if (Array.isArray(chartAssetsResponse)) {
          chartAssets = chartAssetsResponse;
        }
        
        const stockAsset = chartAssets.find(acc => 
          acc.name?.toUpperCase().includes('STOCK') || 
          acc.name?.toUpperCase().includes('INVENTORY') ||
          acc.code?.toUpperCase().includes('STOCK')
        );
        
        if (stockAsset) {
          stockAccountCode = stockAsset.code;
          console.log("📦 Found Stock Account Code:", stockAccountCode);
        }
      } catch (err) {
        console.warn("⚠️ Could not load assets chart");
      }

      const vouchersResponse = await ApiHandler.getVouchers({
        startDate,
        endDate
      });
      console.log("💼 Vouchers Response:", vouchersResponse);

      let vouchersData = [];
      if (vouchersResponse && vouchersResponse.success && Array.isArray(vouchersResponse.data)) {
        vouchersData = vouchersResponse.data;
      } else if (Array.isArray(vouchersResponse.data)) {
        vouchersData = vouchersResponse.data;
      } else if (Array.isArray(vouchersResponse)) {
        vouchersData = vouchersResponse;
      }

      console.log("✅ Total Vouchers Found:", vouchersData.length);

      let expensesData = [];
      const processedVoucherEntries = new Set();
      
      console.log("🔍 Processing vouchers for expenses...");
      
      for (const voucher of vouchersData) {
        const isPaymentVoucher = voucher.voucherType === 'CPV' || 
                                  voucher.voucherType === 'BPV' ||
                                  voucher.type === 'CPV' || 
                                  voucher.type === 'BPV';
        
        const isJournalVoucher = voucher.voucherType === 'JV' || voucher.type === 'JV';
        
        if (isPaymentVoucher || isJournalVoucher) {
          if (voucher.entries && Array.isArray(voucher.entries) && voucher.entries.length > 0) {
            voucher.entries.forEach((entry, idx) => {
              const entryKey = `${voucher.voucherNo}-${entry.serialNo || idx}`;
              
              if (processedVoucherEntries.has(entryKey)) {
                return;
              }
              
              const isDebit = (entry.debitAmount && entry.debitAmount > 0);
              const accountCode = entry.accountCode || entry.code || '';
              const accountName = entry.account || entry.accountName || '';
              
              const isExpenseByCode = expenseAccountCodes.size > 0 
                ? expenseAccountCodes.has(accountCode)
                : accountCode.startsWith('5');
              
              const isExpenseByName = accountName.toUpperCase().includes('EXPENSE') || 
                                     accountName.toUpperCase().includes('SALARY') || 
                                     accountName.toUpperCase().includes('SALARIES') ||
                                     accountName.toUpperCase().includes('RENT') ||
                                     accountName.toUpperCase().includes('UTILITY') ||
                                     accountName.toUpperCase().includes('UTILITIES') ||
                                     accountName.toUpperCase().includes('TRAVEL') ||
                                     accountName.toUpperCase().includes('CHARGES') ||
                                     accountName.toUpperCase().includes('FEE') ||
                                     accountName.toUpperCase().includes('SUPPLY') ||
                                     accountName.toUpperCase().includes('MATERIAL') ||
                                     accountName.toUpperCase().includes('DEPRECIATION') ||
                                     accountName.toUpperCase().includes('ADVERTISEMENT') ||
                                     accountName.toUpperCase().includes('MARKETING') ||
                                     accountName.toUpperCase().includes('INTERNET') ||
                                     accountName.toUpperCase().includes('ELECTRICITY') ||
                                     accountName.toUpperCase().includes('WATER');
              
              const isExpenseAccount = isExpenseByCode || isExpenseByName;
              
              const isStockAccount = stockAccountCode && accountCode === stockAccountCode;
              
              if (isDebit && isExpenseAccount && !isStockAccount) {
                processedVoucherEntries.add(entryKey);
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
            try {
              const voucherDetails = await ApiHandler.getVoucherById(voucher._id || voucher.id);
              const fullVoucher = voucherDetails.data || voucherDetails;
              
              if (fullVoucher.entries && Array.isArray(fullVoucher.entries)) {
                fullVoucher.entries.forEach((entry, idx) => {
                  const entryKey = `${voucher.voucherNo}-${entry.serialNo || idx}`;
                  
                  if (processedVoucherEntries.has(entryKey)) {
                    return;
                  }
                  
                  const isDebit = (entry.debitAmount && entry.debitAmount > 0);
                  const accountCode = entry.accountCode || entry.code || '';
                  const accountName = entry.account || entry.accountName || '';
                  
                  const isExpenseByCode = expenseAccountCodes.size > 0 
                    ? expenseAccountCodes.has(accountCode)
                    : accountCode.startsWith('5');
                  
                  const isExpenseByName = accountName.toUpperCase().includes('EXPENSE') || 
                                         accountName.toUpperCase().includes('SALARY') || 
                                         accountName.toUpperCase().includes('SALARIES') ||
                                         accountName.toUpperCase().includes('RENT') ||
                                         accountName.toUpperCase().includes('UTILITY') ||
                                         accountName.toUpperCase().includes('UTILITIES') ||
                                         accountName.toUpperCase().includes('TRAVEL') ||
                                         accountName.toUpperCase().includes('CHARGES') ||
                                         accountName.toUpperCase().includes('FEE') ||
                                         accountName.toUpperCase().includes('SUPPLY') ||
                                         accountName.toUpperCase().includes('MATERIAL') ||
                                         accountName.toUpperCase().includes('DEPRECIATION') ||
                                         accountName.toUpperCase().includes('ADVERTISEMENT') ||
                                         accountName.toUpperCase().includes('MARKETING') ||
                                         accountName.toUpperCase().includes('INTERNET') ||
                                         accountName.toUpperCase().includes('ELECTRICITY') ||
                                         accountName.toUpperCase().includes('WATER');
                  
                  const isExpenseAccount = isExpenseByCode || isExpenseByName;
                  const isStockAccount = stockAccountCode && accountCode === stockAccountCode;
                  
                  if (isDebit && isExpenseAccount && !isStockAccount) {
                    processedVoucherEntries.add(entryKey);
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
              console.error(`Error fetching voucher ${voucher.voucherNo}:`, err.message);
            }
          }
        }
      }

      console.log("✅ Total Expense Entries Found:", expensesData.length);
      setExpenses(expensesData);

      const expensesTotal = expensesData.reduce((sum, expense) => {
        return sum + (expense.amount || 0);
      }, 0);

      console.log("💵 Total Expenses Calculated:", expensesTotal);
      setTotalExpenses(expensesTotal);

      let revenueAccountCodes = new Set();
      let saleAccountCodes = new Set();
      try {
        const chartRevenueResponse = await ApiHandler.getRevenue();
        let chartRevenue = [];
        
        if (chartRevenueResponse && chartRevenueResponse.success && Array.isArray(chartRevenueResponse.data)) {
          chartRevenue = chartRevenueResponse.data;
        } else if (Array.isArray(chartRevenueResponse.data)) {
          chartRevenue = chartRevenueResponse.data;
        } else if (Array.isArray(chartRevenueResponse)) {
          chartRevenue = chartRevenueResponse;
        }
        
        chartRevenue.forEach(rev => {
          if (rev.code) {
            revenueAccountCodes.add(rev.code);
            
            const name = (rev.name || rev.accountName || '').toUpperCase();
            if (name.includes('SALE') && rev.type === 'SALE ACCOUNT') {
              saleAccountCodes.add(rev.code);
            }
          }
        });
        
        console.log("📋 Revenue Account Codes:", Array.from(revenueAccountCodes));
        console.log("📋 Sale Account Codes:", Array.from(saleAccountCodes));
      } catch (err) {
        console.warn("⚠️ Could not load revenue chart");
      }

      let otherIncomeData = [];
      
      for (const voucher of vouchersData) {
        const isReceiptVoucher = voucher.voucherType === 'CRV' || 
                                  voucher.voucherType === 'BRV' ||
                                  voucher.type === 'CRV' || 
                                  voucher.type === 'BRV';
        
        if (isReceiptVoucher) {
          if (voucher.entries && Array.isArray(voucher.entries) && voucher.entries.length > 0) {
            voucher.entries.forEach((entry) => {
              const isCredit = (entry.creditAmount && entry.creditAmount > 0);
              const accountCode = entry.accountCode || entry.code || '';
              const accountName = entry.account || entry.accountName || '';
              
              const isRevenueByCode = revenueAccountCodes.size > 0 
                ? revenueAccountCodes.has(accountCode) && !saleAccountCodes.has(accountCode)
                : accountCode.startsWith('4') && !accountCode.startsWith('40');
              
              const nameUpper = accountName.toUpperCase();
              const isRevenueByName = !nameUpper.includes('SALE') && (
                nameUpper.includes('INCOME') ||
                nameUpper.includes('INTEREST') ||
                nameUpper.includes('DIVIDEND') ||
                nameUpper.includes('COMMISSION') ||
                nameUpper.includes('RENT INCOME') ||
                nameUpper.includes('GAIN') ||
                nameUpper.includes('REVENUE') ||
                nameUpper.includes('MISCELLANEOUS INCOME')
              );
              
              const isOtherIncome = isRevenueByCode || isRevenueByName;
              
              if (isCredit && isOtherIncome) {
                otherIncomeData.push({
                  voucherNo: voucher.voucherNo,
                  voucherType: voucher.voucherType || voucher.type,
                  date: voucher.voucherDate || voucher.date,
                  accountName: accountName,
                  accountCode: accountCode,
                  description: entry.description || voucher.description || voucher.narration,
                  amount: entry.creditAmount || entry.amount || 0,
                  serialNo: entry.serialNo
                });
              }
            });
          }
        }
      }

      console.log("✅ Other Income Entries Found:", otherIncomeData.length);
      setOtherIncome(otherIncomeData);

      const otherIncomeTotal = otherIncomeData.reduce((sum, income) => {
        return sum + (income.amount || 0);
      }, 0);

      console.log("💰 Total Other Income Calculated:", otherIncomeTotal);
      setTotalOtherIncome(otherIncomeTotal);

      const productsResponse = await ApiHandler.getProducts();
      let productsData = [];
      
      if (productsResponse && productsResponse.success && Array.isArray(productsResponse.data)) {
        productsData = productsResponse.data;
      } else if (Array.isArray(productsResponse.data)) {
        productsData = productsResponse.data;
      } else if (Array.isArray(productsResponse)) {
        productsData = productsResponse;
      }

      console.log("📦 Products fetched:", productsData.length);
      setProducts(productsData);

      const purchasesValue = productsData.reduce((sum, product) => {
        return sum + (product.purchaseAmount || 0);
      }, 0);
      
      console.log("💰 Total Purchases:", purchasesValue);
      setPurchases(purchasesValue);

      const closingStockValue = productsData.reduce((sum, product) => {
        return sum + (product.balanceAmount || 0);
      }, 0);
      
      console.log("📦 Closing Stock:", closingStockValue);
      setClosingStock(closingStockValue);

      try {
        const productsWithReturns = productsData.filter(product => 
          product.ReturnQuantity && product.ReturnQuantity > 0
        );

        console.log("🔙 Products with Returns:", productsWithReturns.length);
        setPurchaseReturns(productsWithReturns);

        const purchaseReturnsTotal = productsWithReturns.reduce((sum, product) => {
          return sum + (product.ReturnedAmount || 0);
        }, 0);

        console.log("🔙 Total Purchase Returns:", purchaseReturnsTotal);
        setTotalPurchaseReturns(purchaseReturnsTotal);
      } catch (err) {
        console.warn("⚠️ Could not calculate purchase returns:", err);
        setPurchaseReturns([]);
        setTotalPurchaseReturns(0);
      }

      try {
        const purchaseDiscountsResponse = await ApiHandler.getPurchaseDiscounts();
        
        let purchaseDiscountsData = [];
        if (purchaseDiscountsResponse && purchaseDiscountsResponse.success && Array.isArray(purchaseDiscountsResponse.data)) {
          purchaseDiscountsData = purchaseDiscountsResponse.data;
        } else if (Array.isArray(purchaseDiscountsResponse.data)) {
          purchaseDiscountsData = purchaseDiscountsResponse.data;
        } else if (Array.isArray(purchaseDiscountsResponse)) {
          purchaseDiscountsData = purchaseDiscountsResponse;
        }

        const yearPurchaseDiscounts = purchaseDiscountsData.filter(discount => {
          const discountYear = new Date(discount.date).getFullYear();
          return discountYear === year;
        });

        console.log("💸 Purchase Discounts:", yearPurchaseDiscounts.length);
        setPurchaseDiscounts(yearPurchaseDiscounts);

        const purchaseDiscountsTotal = yearPurchaseDiscounts.reduce((sum, discount) => {
          return sum + (discount.creditAmount || 0);
        }, 0);

        console.log("💸 Total Purchase Discounts:", purchaseDiscountsTotal);
        setTotalPurchaseDiscounts(purchaseDiscountsTotal);
      } catch (err) {
        console.warn("⚠️ Could not fetch purchase discounts:", err);
        setPurchaseDiscounts([]);
        setTotalPurchaseDiscounts(0);
      }

    } catch (error) {
      console.error("❌ Error loading revenue data:", error);
      setError(error.message || "Failed to load revenue data");
      setSales([]);
      setSaleReturns([]);
      setSaleDiscounts([]);
      setExpenses([]);
      setOtherIncome([]);
      setProducts([]);
      setPurchaseReturns([]);
      setPurchaseDiscounts([]);
      setTotalSales(0);
      setTotalReturns(0);
      setTotalDiscounts(0);
      setTotalExpenses(0);
      setTotalOtherIncome(0);
      setOpeningStock(0);
      setPurchases(0);
      setTotalPurchaseReturns(0);
      setTotalPurchaseDiscounts(0);
      setClosingStock(0);
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
  const cogs = openingStock + purchases - totalPurchaseReturns - totalPurchaseDiscounts - closingStock;
  const grossProfit = netRevenue - cogs;
  const netProfit = grossProfit - totalExpenses + totalOtherIncome;

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "20px", fontFamily: "system-ui, -apple-system, sans-serif" }}>
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

      <p style={{ 
        textAlign: "center",
        fontWeight: "500",
        fontSize: "14px",
        color: "#6c757d",
        marginBottom: "40px"
      }}>
        {formatYearText()}
      </p>

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

      {loading ? (
        <div style={{ 
          padding: "20px", 
          textAlign: "center",
          color: "#6c757d",
          backgroundColor: "#fff"
        }}>
          <p>Loading COGS data...</p>
        </div>
      ) : selectedDate ? (
        <div style={{ 
          backgroundColor: "#fff",
          padding: "20px 30px"
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "15px", color: "#000", paddingLeft: "20px" }}>
              Opening Stock
            </span>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(openingStock)}
            </span>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "8px 0",
            alignItems: "center"
          }}>
            <span style={{ fontSize: "15px", color: "#000" }}>
              Add: Purchases
            </span>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(purchases)}
            </span>
          </div>

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
              Less: Purchase Return
            </span>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(totalPurchaseReturns)}
            </span>
          </div>

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
              Less: Purchase Discount
            </span>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(totalPurchaseDiscounts)}
            </span>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0 8px 0",
            alignItems: "center"
          }}>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              paddingLeft: "20px"
            }}>
              Cost of Goods Available for Sale
            </span>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(openingStock + purchases - totalPurchaseReturns - totalPurchaseDiscounts)}
            </span>
          </div>

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
              Less: Closing Stock
            </span>
            <span style={{ 
              fontSize: "15px",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(closingStock)}
            </span>
          </div>

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
              Cost of Goods Sold
            </span>
            <span style={{ 
              fontSize: "16px",
              fontWeight: "bold",
              color: "#000",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(cogs)}
            </span>
          </div>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "12px 0 8px 0",
            marginTop: "12px",
            borderTop: "2px solid #000",
            alignItems: "center",
            backgroundColor: "#f0f0f0"
          }}>
            <span style={{ 
              fontSize: "16px",
              fontWeight: "bold",
              color: "#000"
            }}>
              Gross Profit (Loss)
            </span>
            <span style={{ 
              fontSize: "16px",
              fontWeight: "bold",
              color: grossProfit >= 0 ? "#059669" : "#dc2626",
              fontFamily: "monospace",
              minWidth: "120px",
              textAlign: "right"
            }}>
              {formatCurrency(grossProfit)}
            </span>
          </div>
        </div>
      ) : (
        <div style={{ 
          padding: "20px", 
          textAlign: "center",
          color: "#6c757d",
          backgroundColor: "#f8f9fa"
        }}>
          <p>Please select a date to view COGS</p>
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
              {(() => {
                const groupedExpenses = {};
                
                expenses.forEach(expense => {
                  const key = `${expense.accountName}-${expense.accountCode}`;
                  
                  if (groupedExpenses[key]) {
                    groupedExpenses[key].amount += expense.amount;
                    groupedExpenses[key].count += 1;
                  } else {
                    groupedExpenses[key] = {
                      accountName: expense.accountName,
                      accountCode: expense.accountCode,
                      amount: expense.amount,
                      count: 1
                    };
                  }
                });
                
                return Object.values(groupedExpenses).map((expense, index) => {
                  return (
                    <div 
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ 
                          fontSize: "15px", 
                          color: "#000",
                          display: "block"
                        }}>
                          {expense.accountName}
                          {expense.accountCode && ` (${expense.accountCode})`}
                          {expense.count > 1 && (
                            <span style={{ 
                              fontSize: "11px", 
                              color: "#666",
                              marginLeft: "8px",
                              padding: "2px 6px",
                              backgroundColor: "#e3f2fd",
                              borderRadius: "3px"
                            }}>
                              {expense.count} entries
                            </span>
                          )}
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: "15px",
                        color: "#000",
                        fontFamily: "monospace",
                        minWidth: "120px",
                        textAlign: "right"
                      }}>
                        {formatCurrency(expense.amount)}
                      </span>
                    </div>
                  );
                });
              })()}

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

      {loading ? (
        <div style={{ 
          padding: "20px", 
          textAlign: "center",
          color: "#6c757d",
          backgroundColor: "#fff"
        }}>
          <p>Loading other income...</p>
        </div>
      ) : selectedDate ? (
        <div style={{ 
          backgroundColor: "#fff",
          padding: "20px 30px"
        }}>
          {otherIncome.length > 0 ? (
            <>
              {(() => {
                const groupedIncome = {};
                
                otherIncome.forEach(income => {
                  const key = `${income.accountName}-${income.accountCode}`;
                  
                  if (groupedIncome[key]) {
                    groupedIncome[key].amount += income.amount;
                    groupedIncome[key].count += 1;
                  } else {
                    groupedIncome[key] = {
                      accountName: income.accountName,
                      accountCode: income.accountCode,
                      amount: income.amount,
                      count: 1
                    };
                  }
                });
                
                return Object.values(groupedIncome).map((income, index) => {
                  return (
                    <div 
                      key={index}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "8px 0",
                        alignItems: "center"
                      }}
                    >
                      <div style={{ flex: 1 }}>
                        <span style={{ 
                          fontSize: "15px", 
                          color: "#000",
                          display: "block"
                        }}>
                          {income.accountName}
                          {income.accountCode && ` (${income.accountCode})`}
                          {income.count > 1 && (
                            <span style={{ 
                              fontSize: "11px", 
                              color: "#666",
                              marginLeft: "8px",
                              padding: "2px 6px",
                              backgroundColor: "#d1f2eb",
                              borderRadius: "3px"
                            }}>
                              {income.count} entries
                            </span>
                          )}
                        </span>
                      </div>
                      <span style={{ 
                        fontSize: "15px",
                        color: "#000",
                        fontFamily: "monospace",
                        minWidth: "120px",
                        textAlign: "right"
                      }}>
                        {formatCurrency(income.amount)}
                      </span>
                    </div>
                  );
                });
              })()}

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
                  Total Income from Other Sources
                </span>
                <span style={{ 
                  fontSize: "16px",
                  fontWeight: "bold",
                  color: "#000",
                  fontFamily: "monospace",
                  minWidth: "120px",
                  textAlign: "right"
                }}>
                  {formatCurrency(totalOtherIncome)}
                </span>
              </div>
            </>
          ) : (
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
                Total Income from Other Sources
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
          <p>Please select a date to view other income</p>
        </div>
      )}

      <div style={{
        backgroundColor: "#2c5ca9",
        color: "white",
        fontWeight: "bold",
        padding: "15px 30px",
        marginTop: "30px",
        fontSize: "18px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderRadius: "6px"
      }}>
        <span>NET PROFIT/LOSS</span>
        <span style={{
          fontSize: "20px",
          fontFamily: "monospace",
          color: netProfit >= 0 ? "#4ade80" : "#f87171"
        }}>
          {formatCurrency(netProfit)}
        </span>
      </div>

      {selectedDate && !loading && (
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
            📈 Financial Summary - Year {new Date(selectedDate).getFullYear()}
          </h4>
          
          <div style={{ 
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
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
                💰 Gross Profit
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: grossProfit >= 0 ? "#198754" : "#dc3545" }}>
                PKR {formatCurrency(grossProfit)}
              </div>
            </div>

            <div style={{ 
              padding: "15px",
              backgroundColor: "#fff3cd",
              borderRadius: "6px",
              border: "1px solid #ffecb5"
            }}>
              <div style={{ color: "#664d03", fontWeight: "600", marginBottom: "8px" }}>
                💼 Total Expenses
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#856404" }}>
                PKR {formatCurrency(totalExpenses)}
              </div>
              <div style={{ fontSize: "12px", color: "#664d03", marginTop: "5px" }}>
                {(() => {
                  const grouped = {};
                  expenses.forEach(e => {
                    const k = `${e.accountName}-${e.accountCode}`;
                    grouped[k] = true;
                  });
                  return Object.keys(grouped).length;
                })()} unique accounts
              </div>
            </div>

            <div style={{ 
              padding: "15px",
              backgroundColor: "#cfe2ff",
              borderRadius: "6px",
              border: "1px solid #b6d4fe"
            }}>
              <div style={{ color: "#084298", fontWeight: "600", marginBottom: "8px" }}>
                📊 Other Income
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: "#0d6efd" }}>
                PKR {formatCurrency(totalOtherIncome)}
              </div>
              <div style={{ fontSize: "12px", color: "#084298", marginTop: "5px" }}>
                {(() => {
                  const grouped = {};
                  otherIncome.forEach(i => {
                    const k = `${i.accountName}-${i.accountCode}`;
                    grouped[k] = true;
                  });
                  return Object.keys(grouped).length;
                })()} unique accounts
              </div>
            </div>

            <div style={{ 
              padding: "15px",
              backgroundColor: netProfit >= 0 ? "#d1f2eb" : "#f8d7da",
              borderRadius: "6px",
              border: `1px solid ${netProfit >= 0 ? "#a3e4d7" : "#f5c2c7"}`
            }}>
              <div style={{ color: netProfit >= 0 ? "#0a5034" : "#842029", fontWeight: "600", marginBottom: "8px" }}>
                🎯 Net Profit/Loss
              </div>
              <div style={{ fontSize: "20px", fontWeight: "700", color: netProfit >= 0 ? "#198754" : "#dc3545" }}>
                PKR {formatCurrency(netProfit)}
              </div>
              <div style={{ fontSize: "12px", color: netProfit >= 0 ? "#0a5034" : "#842029", marginTop: "5px" }}>
                {netProfit >= 0 ? "Profitable" : "Loss"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProfitLoss;