// ProfitLossFromAPI.jsx
"use client"

import React, { useMemo, useState, useEffect } from "react"
import { Calendar, Printer } from "lucide-react"
import ApiHandler from "@/Api/apihandle"

// Hide the navigation bar
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const hideNav = () => {
    const nav = document.querySelector("nav")
    const header = document.querySelector("header")
    const headerText = document.querySelector("h1, [class*='header']")
    
    if (nav) nav.style.display = "none"
    if (header) header.style.display = "none"
    Array.from(document.querySelectorAll("*")).forEach((el) => {
      if (el.textContent?.includes("Accounting Software") || 
          el.textContent?.includes("Dashboard") ||
          el.textContent?.includes("Goods Receipt")) {
        el.style.display = "none"
      }
    })
  }
  
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", hideNav)
  } else {
    hideNav()
  }
}

// Helpers
const format = (n) => {
  const num = Number.parseFloat(n) || 0
  return num === 0 ? "0" : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const startOfMonthISO = (d) => {
  const dt = new Date(d)
  return new Date(dt.getFullYear(), dt.getMonth(), 1).toISOString().split("T")[0]
}

const endOfMonthISO = (d) => {
  const dt = new Date(d)
  return new Date(dt.getFullYear(), dt.getMonth() + 1, 0).toISOString().split("T")[0]
}

const monthToLabel = (ym) => {
  if (!ym) return ""
  const [y, m] = ym.split("-")
  if (!y || !m) return ""
  const date = new Date(`${y}-${m}-01`)
  return date.toLocaleString("en-US", { month: "long", year: "numeric" }).toUpperCase()
}

export default function ProfitLossFromAPI() {
  const [month, setMonth] = useState(() => {
    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, "0")
    return `${yyyy}-${mm}`
  })

  const startDate = useMemo(() => startOfMonthISO(`${month}-01`), [month])
  const endDate = useMemo(() => endOfMonthISO(`${month}-01`), [month])

  const [accounts, setAccounts] = useState([])
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const onPrint = () => window.print()

  // Load COA
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setLoading(true)
        setError(null)
        const [assetsRes, equityRes, expensesRes, liabilitiesRes, revenueRes] = await Promise.all([
          ApiHandler.getAssets().catch(() => ({ data: [] })),
          ApiHandler.getEquity().catch(() => ({ data: [] })),
          ApiHandler.getChartExpenses().catch(() => ({ data: [] })),
          ApiHandler.getLiabilities().catch(() => ({ data: [] })),
          ApiHandler.getRevenue().catch(() => ({ data: [] })),
        ])
        const all = [
          ...(assetsRes.data || []).map((acc) => ({
            ...acc,
            category: "Assets",
            normalBalance: "debit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
          ...(equityRes.data || []).map((acc) => ({
            ...acc,
            category: "Equity",
            normalBalance: "credit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
          ...(expensesRes.data || []).map((acc) => ({
            ...acc,
            category: "Expenses",
            normalBalance: "debit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
          ...(liabilitiesRes.data || []).map((acc) => ({
            ...acc,
            category: "Liabilities",
            normalBalance: "credit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
          ...(revenueRes.data || []).map((acc) => ({
            ...acc,
            category: "Revenue",
            normalBalance: "credit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
        ]
        all.sort((a, b) => a.code.localeCompare(b.code))
        setAccounts(all)
      } catch (e) {
        console.error(e)
        setError("Failed to load accounts.")
      } finally {
        setLoading(false)
      }
    }
    loadAccounts()
  }, [])

  // Compute balances like Trial Balance
  useEffect(() => {
    const computeBalances = async () => {
      if (!startDate || !endDate || accounts.length === 0) return
      try {
        setLoading(true)
        setError(null)

        const response = await ApiHandler.getVouchers({})
        const vouchers = response.data || []

        const computed = accounts.map((account) => {
          let openingDebit = 0
          let openingCredit = 0
          let currentDebit = 0
          let currentCredit = 0

          vouchers.forEach((voucher) => {
            const voucherDate = new Date(voucher.voucherDate)
            const start = new Date(startDate)
            const end = new Date(endDate)

            voucher.entries?.forEach((entry) => {
              const entryCode =
                typeof entry.account === "string" ? entry.account.split(" - ")[0]?.trim() : entry.account?.code || ""
              const accountMatches = !!entryCode && entryCode === account.code

              if (accountMatches) {
                const d = Number.parseFloat(entry.debitAmount || 0)
                const c = Number.parseFloat(entry.creditAmount || 0)
                if (voucherDate < start) {
                  openingDebit += d
                  openingCredit += c
                } else if (voucherDate >= start && voucherDate <= end) {
                  currentDebit += d
                  currentCredit += c
                }
              }
            })
          })

          let openingBalance = 0
          if (account.normalBalance === "debit") {
            openingBalance = openingDebit - openingCredit
          } else {
            openingBalance = openingCredit - openingDebit
          }

          const displayOpeningDebit =
            openingBalance > 0
              ? account.normalBalance === "debit"
                ? openingBalance
                : 0
              : account.normalBalance === "credit"
                ? 0
                : Math.abs(openingBalance)
          const displayOpeningCredit =
            openingBalance > 0
              ? account.normalBalance === "credit"
                ? openingBalance
                : 0
              : account.normalBalance === "debit"
                ? 0
                : Math.abs(openingBalance)

          const totalDebit = openingDebit + currentDebit
          const totalCredit = openingCredit + currentCredit

          let closingBalance = 0
          if (account.normalBalance === "debit") {
            closingBalance = totalDebit - totalCredit
          } else {
            closingBalance = totalCredit - totalDebit
          }

          const displayClosingDebit =
            closingBalance > 0
              ? account.normalBalance === "debit"
                ? closingBalance
                : 0
              : account.normalBalance === "credit"
                ? 0
                : Math.abs(closingBalance)
          const displayClosingCredit =
            closingBalance > 0
              ? account.normalBalance === "credit"
                ? closingBalance
                : 0
              : account.normalBalance === "debit"
                ? 0
                : Math.abs(closingBalance)

          return {
            code: account.code,
            name: account.name,
            category: account.category,
            normalBalance: account.normalBalance,
            openingDebit: displayOpeningDebit,
            openingCredit: displayOpeningCredit,
            currentDebit,
            currentCredit,
            closingDebit: displayClosingDebit,
            closingCredit: displayClosingCredit,
            hasActivity: openingDebit > 0 || openingCredit > 0 || currentDebit > 0 || currentCredit > 0,
          }
        })

        setEntries(computed.filter((e) => e.hasActivity))
      } catch (e) {
        console.error(e)
        setError("Failed to compute balances.")
      } finally {
        setLoading(false)
      }
    }

    computeBalances()
  }, [accounts, startDate, endDate])

  const revenue = useMemo(() => entries.filter((e) => e.category === "Revenue"), [entries])
  const expenses = useMemo(() => entries.filter((e) => e.category === "Expenses"), [entries])
  const assets = useMemo(() => entries.filter((e) => e.category === "Assets"), [entries])

  // Helper to get net amount (Trial Balance style)
  const netCurrent = (row) =>
    row.normalBalance === "debit"
      ? (row.currentDebit || 0) - (row.currentCredit || 0)
      : (row.currentCredit || 0) - (row.currentDebit || 0)

  // Sales - match by keywords
  const saleDomesticCredit = useMemo(() => {
    const list = revenue.filter((r) => /sale/i.test(r.name) && !/exhibition|expo|international/i.test(r.name))
    return list.reduce((s, r) => s + Math.max(0, netCurrent(r)), 0)
  }, [revenue])

  const saleExhibitionIntlCredit = useMemo(() => {
    const list = revenue.filter((r) => /exhibition|expo/i.test(r.name))
    return list.reduce((s, r) => s + Math.max(0, netCurrent(r)), 0)
  }, [revenue])

  const saleInternationalCredit = useMemo(() => {
    const list = revenue.filter((r) => /international/i.test(r.name) && !/exhibition|expo/i.test(r.name))
    return list.reduce((s, r) => s + Math.max(0, netCurrent(r)), 0)
  }, [revenue])

  // Discounts & Returns
  const saleDiscountDomestic = useMemo(() => {
    const list = entries.filter((e) => /discount/i.test(e.name) && !/international/i.test(e.name))
    return list.reduce((s, r) => {
      if (r.category === "Revenue") return s + Math.max(0, -netCurrent(r))
      return s + Math.max(0, netCurrent(r))
    }, 0)
  }, [entries])

  const saleReturnInternational = useMemo(() => {
    const list = entries.filter((e) => /return/i.test(e.name) && /international/i.test(e.name))
    return list.reduce((s, r) => {
      if (r.category === "Revenue") return s + Math.max(0, -netCurrent(r))
      return s + Math.max(0, netCurrent(r))
    }, 0)
  }, [entries])

  const saleReturnDomestic = useMemo(() => {
    const list = entries.filter((e) => /return/i.test(e.name) && !/international/i.test(e.name))
    return list.reduce((s, r) => {
      if (r.category === "Revenue") return s + Math.max(0, -netCurrent(r))
      return s + Math.max(0, netCurrent(r))
    }, 0)
  }, [entries])

  const totalSalesCredit = useMemo(
    () => saleDomesticCredit + saleExhibitionIntlCredit + saleInternationalCredit,
    [saleDomesticCredit, saleExhibitionIntlCredit, saleInternationalCredit],
  )
  const totalSalesReductions = useMemo(
    () => saleDiscountDomestic + saleReturnInternational + saleReturnDomestic,
    [saleDiscountDomestic, saleReturnInternational, saleReturnDomestic],
  )
  const netSales = useMemo(() => totalSalesCredit - totalSalesReductions, [totalSalesCredit, totalSalesReductions])

  // Raw Material Stock - look for "OPENING" in name for opening stock
  const openingRaw = useMemo(() => {
    const list = assets.filter(
      (a) => /(raw|material).*opening/i.test(a.name) || /opening.*(raw|material)/i.test(a.name),
    )
    if (list.length > 0) {
      return list.reduce((s, a) => s + (a.currentDebit || 0), 0)
    }
    const fallback = assets.filter((a) => /(raw|material)/i.test(a.name) && /stock/i.test(a.name))
    return fallback.reduce((s, a) => s + (a.openingDebit || 0), 0)
  }, [assets])

  const closingRaw = useMemo(() => {
    const list = assets.filter(
      (a) => /(raw|material)/i.test(a.name) && /stock/i.test(a.name) && !/opening/i.test(a.name),
    )
    return list.reduce((s, a) => s + (a.closingDebit || 0), 0)
  }, [assets])

  // Finished Goods Stock
  const openingFinished = useMemo(() => {
    const list = assets.filter((a) => /finished.*opening/i.test(a.name) || /opening.*finished/i.test(a.name))
    if (list.length > 0) {
      return list.reduce((s, a) => s + (a.currentDebit || 0), 0)
    }
    const fallback = assets.filter((a) => /finished/i.test(a.name) && /stock|suits/i.test(a.name))
    return fallback.reduce((s, a) => s + (a.openingDebit || 0), 0)
  }, [assets])

  const closingFinished = useMemo(() => {
    const list = assets.filter(
      (a) => /finished/i.test(a.name) && /stock|suits/i.test(a.name) && !/opening/i.test(a.name),
    )
    return list.reduce((s, a) => s + (a.closingDebit || 0), 0)
  }, [assets])

  // Purchases & Production from Expenses
  const purchasesCurrent = useMemo(() => {
    const list = expenses.filter((e) => /purchase/i.test(e.name))
    return list.reduce((s, e) => s + Math.max(0, netCurrent(e)), 0)
  }, [expenses])

  const productionCurrent = useMemo(() => {
    const list = expenses.filter((e) => /production/i.test(e.name))
    return list.reduce((s, e) => s + Math.max(0, netCurrent(e)), 0)
  }, [expenses])

  const embroideryCurrent = useMemo(() => {
    const list = expenses.filter((e) => /embroider/i.test(e.name))
    return list.reduce((s, e) => s + Math.max(0, netCurrent(e)), 0)
  }, [expenses])

  const rawMaterialConsumed = useMemo(
    () => openingRaw + purchasesCurrent - closingRaw,
    [openingRaw, purchasesCurrent, closingRaw],
  )

  const costOfProductionPrime = useMemo(
    () => rawMaterialConsumed + productionCurrent + embroideryCurrent,
    [rawMaterialConsumed, productionCurrent, embroideryCurrent],
  )

  const costGoodsAvailable = useMemo(
    () => openingFinished + costOfProductionPrime,
    [openingFinished, costOfProductionPrime],
  )

  const costOfGoodsSold = useMemo(
    () => Math.max(0, costGoodsAvailable - closingFinished),
    [costGoodsAvailable, closingFinished],
  )

  const grossProfit = useMemo(() => netSales - costOfGoodsSold, [netSales, costOfGoodsSold])

  // Operating Expenses
  const operatingExpenses = useMemo(() => {
    return expenses
      .map((e) => ({ ...e, amount: Math.max(0, netCurrent(e)) }))
      .filter((e) => e.amount > 0)
      .sort((a, b) => a.code.localeCompare(b.code))
  }, [expenses])

  const totalOperatingExpenses = useMemo(() => operatingExpenses.reduce((s, e) => s + e.amount, 0), [operatingExpenses])

  const netProfit = useMemo(() => grossProfit - totalOperatingExpenses, [grossProfit, totalOperatingExpenses])

  const prettyMonth = useMemo(() => monthToLabel(month), [month])

  return (
    <div className="p-6 bg-white min-h-screen">
      <style>{`
        @media print {
          * { margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          body { 
            margin: 0 !important; 
            padding: 0 !important;
            font-size: 12px;
          }
          .container { margin: 0 !important; padding: 0 !important; }
          h1, h2:first-of-type, 
          nav, header,
          [class*="navigation"],
          [class*="navbar"],
          [class*="topbar"] { display: none !important; }
          
          #print-area {
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: avoid;
          }
          
          .max-w-5xl {
            max-width: 100% !important;
          }
          
          h2 {
            font-size: 18px;
            margin: 0 0 2px 0;
          }
          
          h3 {
            font-size: 12px;
            margin: 0 0 1px 0;
          }
          
          h4 {
            font-size: 13px;
            margin: 6px 0 4px 0;
          }
          
          h5 {
            font-size: 12px;
            margin: 4px 0 3px 0;
          }
          
          .mb-6 { margin-bottom: 8px !important; }
          .mb-4 { margin-bottom: 6px !important; }
          .mb-3 { margin-bottom: 4px !important; }
          .mb-2 { margin-bottom: 3px !important; }
          .mt-6 { margin-top: 8px !important; }
          .mt-4 { margin-top: 6px !important; }
          .mt-2 { margin-top: 3px !important; }
          .mt-1 { margin-top: 2px !important; }
          .p-6 { padding: 0 !important; }
          .p-4 { padding: 6px !important; }
          .p-2 { padding: 4px !important; }
          
          input {
            padding: 2px !important;
            font-size: 11px;
          }
          
          label {
            font-size: 10px;
          }
          
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-sm { font-size: 10px; }
          .text-lg { font-size: 13px; }
          
          .border { border: 0.5px solid #ccc !important; }
          .border-t { border-top: 0.5px solid #ccc !important; }
          .border-gray-200 { border-color: #ddd !important; }
          
          .grid { display: grid; }
          .gap-4 { gap: 4px; }
          .grid-cols-2 { grid-template-columns: 1fr 1fr; }
          
          .space-y-3 > div { margin-bottom: 4px !important; }
          
          .shadow-sm { box-shadow: none !important; }
          .rounded { border-radius: 2px; }
          .bg-gray-50 { background-color: #f9f9f9 !important; }
          
          .flex { display: flex; }
          .justify-between { justify-content: space-between; }
          .items-center { align-items: center; }
        }
      `}</style>
      
      <div className="max-w-5xl mx-auto">
        <div className="no-print flex items-center justify-end mb-4">
          <button onClick={onPrint} className="flex items-center gap-2 bg-orange-600 text-white px-3 py-2 rounded hover:bg-orange-700">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>

        <div id="print-area">
          {/* Header */}
          <div className="mb-6">
            <div>
              <h2 className="text-center text-xl font-semibold">PRIDE FABRICS</h2>
              <h3 className="text-center text-sm">Profit &amp; Loss Account</h3>
              <div className="text-center text-gray-700 text-sm mt-1">
                for the month of <span className="font-bold">{prettyMonth}</span>
              </div>
            </div>

            <div className="no-print flex items-center justify-center gap-2 mt-4">
              <div className="flex items-center border rounded px-2 py-1">
                <Calendar size={16} className="text-gray-600 mr-2" />
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="outline-none text-sm"
                />
              </div>
            </div>
          </div>

          {error && <div className="mb-4 text-sm text-red-600 border border-red-200 rounded p-3">{error}</div>}
          {loading && <div className="mb-4 text-sm text-gray-600">Loading data...</div>}

          {/* Manufacturing Costing */}
          <div className="mb-6 border border-gray-200 p-4 rounded shadow-sm">
            <h4 className="font-semibold mb-2">Manufacturing Costing</h4>

            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-600">Stock Opening - Raw</label>
                <input readOnly value={format(openingRaw)} className="w-full mt-1 p-2 border rounded bg-gray-50" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Purchases</label>
                <input
                  readOnly
                  value={format(purchasesCurrent)}
                  className="w-full mt-1 p-2 border rounded bg-gray-50"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Stock Closing - Raw</label>
                <input readOnly value={format(closingRaw)} className="w-full mt-1 p-2 border rounded bg-gray-50" />
              </div>
              <div>
                <label className="text-sm text-gray-600">Raw Material Consumed</label>
                <input
                  readOnly
                  value={format(rawMaterialConsumed)}
                  className="w-full mt-1 p-2 border rounded bg-gray-50 font-semibold"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Production Expenses</label>
                <input
                  readOnly
                  value={format(productionCurrent)}
                  className="w-full mt-1 p-2 border rounded bg-gray-50"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Embroidery Expense</label>
                <input
                  readOnly
                  value={format(embroideryCurrent)}
                  className="w-full mt-1 p-2 border rounded bg-gray-50"
                />
              </div>

              <div>
                <label className="text-sm text-gray-600">Cost of Production (Prime Cost)</label>
                <input
                  readOnly
                  value={format(costOfProductionPrime)}
                  className="w-full mt-1 p-2 border rounded bg-gray-50 font-semibold"
                />
              </div>
            </div>
          </div>

          {/* Income Statement */}
          <div className="mb-6 border border-gray-200 p-4 rounded shadow-sm">
            <h4 className="text-center font-semibold mb-4">INCOME STATEMENT</h4>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="mb-2">
                  <label className="text-sm text-gray-700">Sale - Domestic</label>
                </div>
                <div className="mb-2">
                  <label className="text-sm text-gray-700">Sale - Exhibition - International</label>
                </div>
                <div className="mb-2">
                  <label className="text-sm text-gray-700">Sale - International</label>
                </div>

                <div className="mt-4 border-t pt-3">
                  <label className="text-sm text-gray-700">Less Sale Discount - Domestic</label>
                </div>
                <div className="mt-2">
                  <label className="text-sm text-gray-700">Less Sale Return - International</label>
                </div>
                <div className="mt-2">
                  <label className="text-sm text-gray-700">Less Sale Return - Domestic</label>
                </div>

                <div className="mt-4">
                  <label className="text-sm text-gray-700">Net Sale</label>
                </div>
              </div>

              <div>
                <div className="mb-2">
                  <input
                    readOnly
                    value={format(saleDomesticCredit)}
                    className="w-full mt-1 p-2 border rounded bg-gray-50"
                  />
                </div>
                <div className="mb-2">
                  <input
                    readOnly
                    value={format(saleExhibitionIntlCredit)}
                    className="w-full mt-1 p-2 border rounded bg-gray-50"
                  />
                </div>
                <div className="mb-2">
                  <input
                    readOnly
                    value={format(saleInternationalCredit)}
                    className="w-full mt-1 p-2 border rounded bg-gray-50"
                  />
                </div>

                <div className="mt-4 border-t pt-3">
                  <input
                    readOnly
                    value={format(saleDiscountDomestic)}
                    className="w-full mt-1 p-2 border rounded bg-gray-50"
                  />
                </div>
                <div className="mt-2">
                  <input
                    readOnly
                    value={format(saleReturnInternational)}
                    className="w-full mt-1 p-2 border rounded bg-gray-50"
                  />
                </div>
                <div className="mt-2">
                  <input
                    readOnly
                    value={format(saleReturnDomestic)}
                    className="w-full mt-1 p-2 border rounded bg-gray-50"
                  />
                </div>

                <div className="mt-4">
                  <input
                    readOnly
                    value={format(netSales)}
                    className="w-full mt-1 p-2 border rounded bg-gray-50 font-semibold"
                  />
                </div>
              </div>
            </div>

            {/* COGS */}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <div className="font-semibold">Cost of Sale</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-gray-700">Stock Opening - Finished</label>
                  <input
                    readOnly
                    value={format(openingFinished)}
                    className="w-full mt-1 p-2 border rounded bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Amount</label>
                  <div className="text-right mt-1 font-medium">{format(openingFinished)}</div>
                </div>

                <div>
                  <label className="text-sm text-gray-700">Add: Cost of Production (Prime Cost)</label>
                  <input
                    readOnly
                    value={format(costOfProductionPrime)}
                    className="w-full mt-1 p-2 border rounded bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-700">Amount</label>
                  <div className="text-right mt-1 font-medium">{format(costOfProductionPrime)}</div>
                </div>

                <div className="col-span-2">
                  <div className="flex justify-between border-t pt-2">
                    <div className="font-semibold">Cost of Goods Available for Sale</div>
                    <div className="font-semibold">{format(costGoodsAvailable)}</div>
                  </div>
                </div>

                <div className="col-span-2 mt-2">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-sm text-gray-700">Less: Stock Closing - Finished</label>
                      <input
                        readOnly
                        value={format(closingFinished)}
                        className="w-64 mt-1 p-2 border rounded bg-gray-50"
                      />
                    </div>
                    <div className="text-right font-semibold">{format(closingFinished)}</div>
                  </div>
                </div>

                <div className="col-span-2 mt-3 flex justify-between border-t pt-2">
                  <div className="font-semibold">Cost of Goods Sold</div>
                  <div className="font-semibold">{format(costOfGoodsSold)}</div>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className="mt-6 flex justify-between items-center">
              <div className="text-lg font-semibold">Gross Profit</div>
              <div className="text-lg font-semibold">{format(grossProfit)}</div>
            </div>

            {/* Operating Expenses */}
            <div className="mt-6 border-t pt-4">
              <h5 className="font-semibold mb-3">Operating Expenses</h5>

              <div className="grid grid-cols-2 gap-4">
                {operatingExpenses.map((row) => (
                  <React.Fragment key={`op-${row.code}`}>
                    <div>
                      <label className="text-sm text-gray-700">{row.name}</label>
                    </div>
                    <div>
                      <div className="text-right mt-1 text-green-600 font-medium">{format(row.amount)}</div>
                    </div>
                  </React.Fragment>
                ))}
                {operatingExpenses.length === 0 && (
                  <>
                    <div className="text-sm text-gray-500">No operating expenses for this period</div>
                    <div />
                  </>
                )}
              </div>

              <div className="mt-4 border-t pt-3 flex justify-between items-center">
                <div className="font-semibold">Total Expenses</div>
                <div className="font-semibold">{format(totalOperatingExpenses)}</div>
              </div>
            </div>

            {/* Net Profit */}
            <div className="mt-6 border-t pt-4 flex justify-between items-center">
              <div className="text-lg font-semibold">Net Profit / (Loss)</div>
              <div className={`text-lg font-semibold ${netProfit < 0 ? "text-red-600" : ""}`}>{format(netProfit)}</div>
            </div>
          </div>

          <div className="text-sm text-gray-600 italic text-center mt-4">created by [Soft-Technix]</div>
        </div>
      </div>
    </div>
  )
}