"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { RefreshCw, ArrowLeft } from "lucide-react"
import ApiHandler from "@/Api/apihandle"

export default function GeneralLedger() {
  const [fromDate, setFromDate] = useState(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    return firstDay.toISOString().split("T")[0]
  })
  const [toDate, setToDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })
  const [selectedAccount, setSelectedAccount] = useState("")
  const [accountOptions, setAccountOptions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [showLedger, setShowLedger] = useState(false)
  const [reportType, setReportType] = useState("all")
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [openingBalance, setOpeningBalance] = useState(0)
  const [closingBalance, setClosingBalance] = useState(0)

  useEffect(() => {
    const style = document.createElement("style")
    style.innerHTML = `
      @media print {
        body * {
          visibility: hidden;
        }
        #print-area,
        #print-area * {
          visibility: visible;
        }
        #print-area {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        .print\\:hidden {
          display: none !important;
        }
      }
    `
    document.head.appendChild(style)

    return () => {
      document.head.removeChild(style)
    }
  }, [])

  const loadAllAccounts = async () => {
    try {
      setLoadingAccounts(true)

      const [assetsRes, equityRes, expensesRes, liabilitiesRes, revenueRes] = await Promise.all([
        ApiHandler.getAssets().catch(() => ({ data: [] })),
        ApiHandler.getEquity().catch(() => ({ data: [] })),
        ApiHandler.getChartExpenses().catch(() => ({ data: [] })),
        ApiHandler.getLiabilities().catch(() => ({ data: [] })),
        ApiHandler.getRevenue().catch(() => ({ data: [] })),
      ])

      const allAccounts = [
        ...(assetsRes.data || []).map((account) => ({
          code: account.code,
          name: account.name,
          fullName: `${account.code} - ${account.name}`,
          category: "Assets",
          normalBalance: "debit",
        })),
        ...(equityRes.data || []).map((account) => ({
          code: account.code,
          name: account.name,
          fullName: `${account.code} - ${account.name}`,
          category: "Equity",
          normalBalance: "credit",
        })),
        ...(expensesRes.data || []).map((account) => ({
          code: account.code,
          name: account.name,
          fullName: `${account.code} - ${account.name}`,
          category: "Expenses",
          normalBalance: "debit",
        })),
        ...(liabilitiesRes.data || []).map((account) => ({
          code: account.code,
          name: account.name,
          fullName: `${account.code} - ${account.name}`,
          category: "Liabilities",
          normalBalance: "credit",
        })),
        ...(revenueRes.data || []).map((account) => ({
          code: account.code,
          name: account.name,
          fullName: `${account.code} - ${account.name}`,
          category: "Revenue",
          normalBalance: "credit",
        })),
      ]

      allAccounts.sort((a, b) => a.code.localeCompare(b.code))
      setAccountOptions(allAccounts)
    } catch (error) {
      console.error("Error loading accounts:", error)
    } finally {
      setLoadingAccounts(false)
    }
  }

  const loadSalesData = async (fromDate, toDate) => {
    try {
      const response = await ApiHandler.getSales()
      const sales = response.data || []

      const revenueResponse = await ApiHandler.getRevenue()
      const revenueAccounts = revenueResponse.data || []

      const salesEntries = []
      const processedSaleIds = new Set()

      sales.forEach((sale) => {
        const saleDate = new Date(sale.createdAt || sale.updatedAt)
        const from = new Date(fromDate + "T00:00:00")
        const to = new Date(toDate + "T23:59:59")

        if (saleDate >= from && saleDate <= to) {
          const customerName = sale.customerName || ""
          if (
            customerName.includes("Test") ||
            customerName.includes("TEST") ||
            customerName.includes("TEST-CUSTOMER")
          ) {
            return
          }

          const amount = Number.parseFloat(sale.totalAmount || 0)
          const saleId = `sale-${sale._id}`

          if (!processedSaleIds.has(saleId)) {
            processedSaleIds.add(saleId)

            let saleTypeAccount = sale.saleType || ""

            const matchingRevenueAccount = revenueAccounts.find((account) => {
              const accountName = account.name || ""
              const accountFullName = `${account.code || ""} - ${accountName}`.trim()

              return (
                accountName.includes(saleTypeAccount) ||
                accountFullName.includes(saleTypeAccount) ||
                accountName === saleTypeAccount
              )
            })

            if (matchingRevenueAccount) {
              saleTypeAccount =
                matchingRevenueAccount.code && matchingRevenueAccount.name
                  ? `${matchingRevenueAccount.code} - ${matchingRevenueAccount.name}`
                  : matchingRevenueAccount.name || sale.saleType
            }

            salesEntries.push({
              id: `${saleId}-customer`,
              date: sale.createdAt || sale.updatedAt,
              voucherNo: sale.grn || "N/A",
              voucherType: "Sale",
              description: `${saleTypeAccount} - ${sale.notes || "Sale"}`,
              debit: amount,
              credit: 0,
              account: sale.customerName,
              entryType: "RECEIVABLE",
            })

            salesEntries.push({
              id: `${saleId}-revenue`,
              date: sale.createdAt || sale.updatedAt,
              voucherNo: sale.grn || "N/A",
              voucherType: "Sale",
              description: `Sale to ${sale.customerName} - ${sale.notes || "Sale transaction"}`,
              debit: 0,
              credit: amount,
              account: saleTypeAccount,
              entryType: "REVENUE",
            })

            if (amount > 0) {
              console.log(`[DOUBLE ENTRY] Sale ${sale.grn}:`, {
                debit: `${sale.customerName} (Customer/Vendor Ledger)`,
                credit: `${saleTypeAccount} (Revenue Account)`,
                amount: amount,
                balanced: true,
              })
            }
          }
        }
      })

      return salesEntries
    } catch (error) {
      console.error("Error loading sales:", error)
      return []
    }
  }

  useEffect(() => {
    loadAllAccounts()
  }, [])

  const loadLedgerEntries = async (account, fromDate, toDate) => {
    try {
      setLoading(true)
      console.log("Loading ledger entries for:", { account, fromDate, toDate })

      let allProducts = []
      let currentPage = 1
      let hasMoreProducts = true

      while (hasMoreProducts) {
        try {
          const productsResponse = await ApiHandler.getProducts({
            page: currentPage,
            limit: 100,
          })

          if (productsResponse.data && productsResponse.data.length > 0) {
            allProducts = [...allProducts, ...productsResponse.data]
            currentPage++

            if (productsResponse.data.length < 100) {
              hasMoreProducts = false
            }
          } else {
            hasMoreProducts = false
          }
        } catch (error) {
          console.error("Error fetching products page:", currentPage, error)
          hasMoreProducts = false
        }
      }

      const vouchersResponse = await ApiHandler.getVouchers({
        fromDate: fromDate,
        toDate: toDate,
      })

      const salesEntries = await loadSalesData(fromDate, toDate)

      const allVouchers = vouchersResponse.data || []

      console.log("Total vouchers:", allVouchers.length)
      console.log("Total products loaded:", allProducts.length)
      console.log("Total sales entries:", salesEntries.length)

      const filteredEntries = []
      let runningBalance = 0
      const addedEntryIds = new Set()

      const selectedAccountInfo = accountOptions.find((acc) => acc.fullName === account || acc.name === account)
      const accountName = account.split(" - ")[1] || account
      const accountCode = account.split(" - ")[0] || ""

      allVouchers.sort((a, b) => new Date(a.voucherDate) - new Date(b.voucherDate))

      allVouchers.forEach((voucher) => {
        const voucherDate = new Date(voucher.voucherDate)
        const from = new Date(fromDate)
        const to = new Date(toDate)

        if (voucherDate >= from && voucherDate <= to) {
          voucher.entries?.forEach((entry) => {
            const entryAccount = entry.account || ""

            const accountMatches =
              entryAccount === account ||
              entryAccount === accountName ||
              entryAccount === accountCode ||
              entryAccount.includes(accountCode) ||
              entryAccount.includes(accountName) ||
              entryAccount === `${accountCode} - ${accountName}` ||
              account.includes(entryAccount) ||
              accountName.includes(entryAccount)

            if (accountMatches) {
              const debitAmount = Number.parseFloat(entry.debitAmount || 0)
              const creditAmount = Number.parseFloat(entry.creditAmount || 0)

              if (selectedAccountInfo?.normalBalance === "debit") {
                runningBalance += debitAmount - creditAmount
              } else {
                runningBalance += creditAmount - debitAmount
              }

              filteredEntries.push({
                id: `${voucher._id}-${entry.id || Math.random()}`,
                date: voucher.voucherDate,
                voucherNo: voucher.voucherNo,
                voucherType: voucher.voucherType,
                description: entry.description || voucher.narration || "No description",
                debit: debitAmount,
                credit: creditAmount,
                balance: runningBalance,
              })
            }
          })
        }
      })

      salesEntries.forEach((saleEntry) => {
        const saleAccount = saleEntry.account || ""

        const accountMatches =
          saleAccount === account ||
          saleAccount === accountName ||
          saleAccount === accountCode ||
          saleAccount.includes(accountCode) ||
          saleAccount.includes(accountName) ||
          account.includes(saleAccount) ||
          accountName.includes(saleAccount)

        if (accountMatches && !addedEntryIds.has(saleEntry.id)) {
          addedEntryIds.add(saleEntry.id)

          const debitAmount = saleEntry.debit
          const creditAmount = saleEntry.credit

          if (selectedAccountInfo?.normalBalance === "debit") {
            runningBalance += debitAmount - creditAmount
          } else {
            runningBalance += creditAmount - debitAmount
          }

          filteredEntries.push({
            ...saleEntry,
            balance: runningBalance,
          })
        }
      })

      console.log("\n📦 PROCESSING PRODUCTS...")
      allProducts.forEach((product, index) => {
        console.log(`\n--- Product ${index + 1}/${allProducts.length} ---`)
        console.log("Name:", product.name)
        console.log("GRN:", product.grn)
        console.log("Date:", product.createdAt || product.updatedAt)

        const productDateStr = (product.createdAt || product.updatedAt).split("T")[0]
        const productDate = new Date(productDateStr + "T00:00:00")
        const from = new Date(fromDate + "T00:00:00")
        const to = new Date(toDate + "T23:59:59")

        const inDateRange = productDate >= from && productDate <= to
        console.log("In date range?", inDateRange, `(${productDateStr})`)

        if (productDate >= from && productDate <= to) {
          console.log("✅ Product is in date range, checking matches...")
          const purchaseTypeCode = product.purchaseType?.code || ""
          const purchaseTypeName = product.purchaseType?.name || ""
          const purchaseTypeFullName =
            purchaseTypeCode && purchaseTypeName
              ? `${purchaseTypeCode} - ${purchaseTypeName}`
              : purchaseTypeName || purchaseTypeCode

          const vendorCode = product.vendorName?.code || ""
          const vendorName = product.vendorName?.name || ""
          const vendorFullName = vendorCode && vendorName ? `${vendorCode} - ${vendorName}` : vendorName || vendorCode

          const purchaseTypeMatch =
            purchaseTypeCode === accountCode ||
            purchaseTypeName === accountName ||
            purchaseTypeFullName === account ||
            account.includes(purchaseTypeCode) ||
            account.includes(purchaseTypeName) ||
            purchaseTypeCode.includes(accountCode) ||
            purchaseTypeName.includes(accountName)

          const vendorMatch =
            vendorCode === accountCode ||
            vendorName === accountName ||
            vendorFullName === account ||
            account.includes(vendorCode) ||
            account.includes(vendorName) ||
            vendorCode.includes(accountCode) ||
            vendorName.includes(accountName)

          const amount = Number.parseFloat(product.purchaseRate || 0) * Number.parseFloat(product.quantity || 0)

          console.log("Purchase Type:", purchaseTypeFullName)
          console.log("Vendor:", vendorFullName)
          console.log("Amount:", amount)
          console.log("purchaseTypeMatch:", purchaseTypeMatch)
          console.log("vendorMatch:", vendorMatch)

          if (!purchaseTypeMatch && !vendorMatch) {
            console.log("❌ NO MATCH - Skipping this product")
            console.log("Comparison details:")
            console.log("  Selected account:", account)
            console.log("  Account code:", accountCode)
            console.log("  Account name:", accountName)
            console.log("  Purchase type code:", purchaseTypeCode)
            console.log("  Purchase type name:", purchaseTypeName)
            console.log("  Vendor code:", vendorCode)
            console.log("  Vendor name:", vendorName)
          }

          if (purchaseTypeMatch) {
            console.log("✅ Creating DEBIT entry (Purchase Type matched)")
            if (selectedAccountInfo?.normalBalance === "debit") {
              runningBalance += amount
            } else {
              runningBalance -= amount
            }

            const vendorDisplay = vendorFullName || vendorName || "Vendor"

            filteredEntries.push({
              id: `product-${product._id}-purchaseType`,
              date: product.createdAt || product.updatedAt,
              voucherNo: product.grn || "N/A",
              voucherType: "Purchase",
              description: `${vendorDisplay} - ${product.name || "Product"}: ${product.quantity || 0} units @ Rs. ${product.purchaseRate || 0}`,
              debit: amount,
              credit: 0,
              balance: runningBalance,
            })
          }

          if (vendorMatch) {
            console.log("✅ Creating CREDIT entry (Vendor matched)")
            if (selectedAccountInfo?.normalBalance === "debit") {
              runningBalance -= amount
            } else {
              runningBalance += amount
            }

            const purchaseTypeDisplay = purchaseTypeFullName || purchaseTypeName || "Purchase"

            filteredEntries.push({
              id: `product-${product._id}-vendor`,
              date: product.createdAt || product.updatedAt,
              voucherNo: product.grn || "N/A",
              voucherType: "Purchase",
              description: `${purchaseTypeDisplay} - ${product.name || "Product"}: ${product.quantity || 0} units @ Rs. ${product.purchaseRate || 0}`,
              debit: 0,
              credit: amount,
              balance: runningBalance,
            })
          }
        } else {
          console.log("⏭️ Product outside date range - skipping")
        }
      })

      filteredEntries.sort((a, b) => new Date(a.date) - new Date(b.date))

      runningBalance = 0
      filteredEntries.forEach((entry) => {
        if (selectedAccountInfo?.normalBalance === "debit") {
          runningBalance += entry.debit - entry.credit
        } else {
          runningBalance += entry.credit - entry.debit
        }
        entry.balance = runningBalance
      })

      setLedgerEntries(filteredEntries)
      setClosingBalance(runningBalance)

      console.log(`Found ${filteredEntries.length} entries for account: ${account}`)
    } catch (error) {
      console.error("Error loading ledger entries:", error)
      setLedgerEntries([])
    } finally {
      setLoading(false)
    }
  }

  const handleDateChange = () => {
    if (fromDate && toDate) {
      setShowDropdown(true)
    }
  }

  const handleAccountSelect = (account) => {
    setSelectedAccount(account)
    setShowDropdown(false)
    setShowLedger(true)
    loadLedgerEntries(account, fromDate, toDate)
  }

  const handleClose = () => {
    setShowLedger(false)
    setSelectedAccount("")
    setShowDropdown(false)
    setLedgerEntries([])
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date
      .toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      .replace(/\//g, ".")
  }

  const formatCurrency = (amount) => {
    return Number.parseFloat(amount || 0).toFixed(2)
  }

  const totalDebits = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredits = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0)

  if (showLedger) {
    return (
      <div
        id="print-area"
        className="min-h-screen w-full p-6 bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 print:bg-white print:shadow-none print:p-6 print:pb-24"
      >
        <div className="relative mb-6">
          <div className="flex items-center justify-between mb-4 print:hidden">
            <Button variant="outline" onClick={handleClose} className="flex items-center gap-2 bg-transparent">
              <ArrowLeft className="h-4 w-4" />
              Back to Selection
            </Button>
            <Button
              variant="outline"
              onClick={() => loadLedgerEntries(selectedAccount, fromDate, toDate)}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          <div className="text-center space-y-3 bg-white p-6 rounded-lg shadow-lg border print:shadow-none print:border print:bg-white">
            <h1 className="text-2xl font-bold text-gray-800">ABC COMPANY</h1>
            <h2 className="text-xl font-semibold text-blue-600">GENERAL LEDGER</h2>
            <div className="text-lg font-medium text-gray-700">
              Account: <span className="text-blue-600">{selectedAccount}</span>
            </div>
            <p className="text-sm text-gray-600">
              Period: {formatDate(fromDate)} to {formatDate(toDate)}
            </p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-flex items-center gap-2 text-blue-600">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span>Loading ledger entries...</span>
            </div>
          </div>
        )}

        <Card className="shadow-lg print:shadow-none print:border-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gradient-to-r from-blue-100 to-blue-200 print:bg-gray-100">
                  <th className="border border-gray-300 p-3 text-center font-semibold text-gray-700 w-16">Sr#</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold text-gray-700">Date</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold text-gray-700">Voucher No.</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold text-gray-700">GRN</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold text-gray-700">Type</th>
                  <th className="border border-gray-300 p-3 text-left font-semibold text-gray-700">Description</th>
                  <th className="border border-gray-300 p-3 text-right font-semibold text-green-600">Debit</th>
                  <th className="border border-gray-300 p-3 text-right font-semibold text-red-600">Credit</th>
                  <th className="border border-gray-300 p-3 text-right font-semibold text-blue-600">Balance</th>
                </tr>
              </thead>
              <tbody>
                {ledgerEntries.length > 0 ? (
                  ledgerEntries.map((entry, index) => (
                    <tr
                      key={entry.id || index}
                      className={`hover:bg-gray-50 ${index % 2 === 0 ? "bg-white" : "bg-gray-25"}`}
                    >
                      <td className="border border-gray-300 p-3 text-center text-sm font-medium text-gray-600">
                        {index + 1}
                      </td>
                      <td className="border border-gray-300 p-3 text-sm">{formatDate(entry.date)}</td>
                      <td className="border border-gray-300 p-3 text-sm font-mono">{entry.voucherNo}</td>
                      <td className="border border-gray-300 p-3 text-sm font-mono">
                        {(entry.voucherType === "Purchase" || entry.voucherType === "Sale") &&
                        entry.voucherNo !== "N/A" ? (
                          <span className="text-purple-600 font-medium">{entry.voucherNo}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-3 text-sm">
                        <span className="inline-block bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          {entry.voucherType}
                        </span>
                      </td>
                      <td className="border border-gray-300 p-3 text-sm">{entry.description}</td>
                      <td className="border border-gray-300 p-3 text-right text-sm font-mono">
                        {entry.debit > 0 ? (
                          <span className="text-green-600 font-semibold">{formatCurrency(entry.debit)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-3 text-right text-sm font-mono">
                        {entry.credit > 0 ? (
                          <span className="text-red-600 font-semibold">{formatCurrency(entry.credit)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="border border-gray-300 p-3 text-right text-sm font-mono">
                        <span className={`font-semibold ${entry.balance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                          {formatCurrency(Math.abs(entry.balance))}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="border border-gray-300 p-8 text-center text-gray-500">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Loading...
                        </div>
                      ) : (
                        <div>
                          <div className="text-lg mb-2">No entries found</div>
                          <div className="text-sm">
                            No transactions found for "{selectedAccount}" between {formatDate(fromDate)} and{" "}
                            {formatDate(toDate)}
                          </div>
                        </div>
                      )}
                    </td>
                  </tr>
                )}

                {ledgerEntries.length > 0 && (
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-200 font-bold border-t-2 border-gray-400">
                    <td className="border border-gray-300 p-3 text-sm" colSpan="6">
                      <span className="text-lg">TOTAL</span>
                    </td>
                    <td className="border border-gray-300 p-3 text-right text-sm font-mono">
                      <span className="text-green-600 text-lg font-bold">{formatCurrency(totalDebits)}</span>
                    </td>
                    <td className="border border-gray-300 p-3 text-right text-sm font-mono">
                      <span className="text-red-600 text-lg font-bold">{formatCurrency(totalCredits)}</span>
                    </td>
                    <td className="border border-gray-300 p-3 text-right text-sm font-mono">
                      <span className={`text-lg font-bold ${closingBalance >= 0 ? "text-blue-600" : "text-red-600"}`}>
                        {formatCurrency(Math.abs(closingBalance))}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {ledgerEntries.length > 0 && (
          <div className="flex justify-center gap-4 mt-6 print:hidden">
            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
              Print Ledger
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const csvContent = [
                  ["Sr#", "Date", "Voucher No", "GRN", "Type", "Description", "Debit", "Credit", "Balance"].join(","),
                  ...ledgerEntries.map((entry, index) =>
                    [
                      index + 1,
                      formatDate(entry.date),
                      entry.voucherNo,
                      entry.voucherType === "Purchase" && entry.voucherNo !== "N/A" ? entry.voucherNo : "-",
                      entry.voucherType,
                      `"${entry.description}"`,
                      formatCurrency(entry.debit),
                      formatCurrency(entry.credit),
                      formatCurrency(entry.balance),
                    ].join(","),
                  ),
                ].join("\n")

                const blob = new Blob([csvContent], { type: "text/csv" })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement("a")
                a.href = url
                a.download = `ledger_${selectedAccount.replace(/[^a-zA-Z0-9]/g, "_")}_${fromDate}_${toDate}.csv`
                a.click()
                window.URL.revokeObjectURL(url)
              }}
            >
              Export CSV
            </Button>
          </div>
        )}

        <footer
          aria-label="print-footer"
          className="hidden print:block fixed bottom-0 left-0 right-0 w-full text-center text-xs text-gray-600 border-t border-gray-300 pt-2 bg-white"
        >
          Created by Soft-Technix
        </footer>
      </div>
    )
  }

  const groupedAccounts = accountOptions.reduce((groups, account) => {
    if (!groups[account.category]) {
      groups[account.category] = []
    }
    groups[account.category].push(account)
    return groups
  }, {})

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50">
      <Card className="max-w-4xl w-full shadow-2xl border-0">
        <CardHeader className="relative bg-gradient-to-r from-blue-300 to-blue-300 text-black">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={loadAllAccounts}
              disabled={loadingAccounts}
              className="bg-white/20 border-white/30 text-black hover:bg-white/30"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loadingAccounts ? "animate-spin" : ""}`} />
              Refresh Accounts
            </Button>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold">Account Wise Ledger</CardTitle>
            <p className="text-black/80 mt-2">View detailed transaction history for any account</p>
          </div>
        </CardHeader>

        <CardContent className="p-8 space-y-8 bg-white">
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <div className="flex flex-col gap-2">
              <Label htmlFor="fromDate" className="font-semibold text-gray-700">
                From Date
              </Label>
              <Input
                id="fromDate"
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value)
                  handleDateChange()
                }}
                className="w-40 bg-white border-2 border-gray-300 focus:border-blue-500"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="toDate" className="font-semibold text-gray-700">
                To Date
              </Label>
              <Input
                id="toDate"
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value)
                  handleDateChange()
                }}
                className="w-40 bg-white border-2 border-gray-300 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-semibold text-gray-700">
              Select Account ({accountOptions.length} available)
            </Label>

            <div className="relative">
              <Select
                value={selectedAccount}
                onValueChange={handleAccountSelect}
                disabled={loadingAccounts || accountOptions.length === 0}
              >
                <SelectTrigger className="w-full bg-white border-2 border-gray-300 focus:border-blue-500 text-left">
                  <SelectValue
                    placeholder={
                      loadingAccounts
                        ? "Loading accounts..."
                        : accountOptions.length === 0
                          ? "No accounts found"
                          : "Select an account to view ledger"
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-96">
                  {Object.entries(groupedAccounts).map(([category, accounts]) => (
                    <div key={category}>
                      <div className="px-2 py-2 text-sm font-semibold text-gray-600 bg-gray-100 sticky top-0">
                        {category} ({accounts.length})
                      </div>
                      {accounts.map((account) => (
                        <SelectItem key={account.fullName} value={account.fullName} className="pl-4">
                          <div className="flex flex-col">
                            <span className="font-medium">{account.name}</span>
                            <span className="text-sm text-gray-500">{account.code}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-4">
            <Label className="text-lg font-semibold text-gray-700">Report Type</Label>
            <RadioGroup value={reportType} onValueChange={setReportType} className="flex gap-8">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="all" />
                <Label htmlFor="all" className="font-medium">
                  All Transactions
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="specific" id="specific" />
                <Label htmlFor="specific" className="font-medium">
                  Specific Period
                </Label>
              </div>
            </RadioGroup>
          </div>

          {accountOptions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="text-sm text-blue-800">
                <div className="font-semibold mb-2">Available Account Categories:</div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(groupedAccounts).map(([category, accounts]) => (
                    <div key={category} className="text-xs">
                      <span className="font-medium">{category}:</span> {accounts.length}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-4 pt-6">
            <Button
              onClick={() => {
                if (selectedAccount && fromDate && toDate) {
                  setShowLedger(true)
                  loadLedgerEntries(selectedAccount, fromDate, toDate)
                } else {
                  alert("Please select an account and date range")
                }
              }}
              disabled={!selectedAccount || !fromDate || !toDate || loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              ) : (
                "View Ledger"
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
