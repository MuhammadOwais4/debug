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

  // Add print styles to document head
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

  // ========== LOAD ACCOUNTS FROM BACKEND API ==========
  const loadAllAccounts = async () => {
    try {
      setLoadingAccounts(true)
      console.log("📊 Fetching accounts from backend API...")

      const response = await ApiHandler.getAllAccounts()

      if (response.success) {
        setAccountOptions(response.data)
        console.log(`✅ Loaded ${response.count} accounts from backend`)
      } else {
        console.error("Failed to load accounts:", response)
        alert("Failed to load accounts. Please try again.")
      }
    } catch (error) {
      console.error("Error loading accounts:", error)
      alert(`Failed to load accounts: ${error.message}`)
    } finally {
      setLoadingAccounts(false)
    }
  }

  // Load on component mount
  useEffect(() => {
    loadAllAccounts()
  }, [])

  // ========== LOAD LEDGER ENTRIES FROM BACKEND API ==========
  const loadLedgerEntries = async (account, fromDate, toDate) => {
    try {
      setLoading(true)
      console.log("📊 Loading ledger entries from backend API for:", { account, fromDate, toDate })

      // Extract account code and name from full name
      const accountParts = account.split(" - ")
      const accountCode = accountParts[0]
      const accountName = accountParts.length > 1 ? accountParts.slice(1).join(" - ") : accountParts[0]

      const response = await ApiHandler.getAccountLedger({
        accountCode,
        accountName,
        fromDate,
        toDate,
      })

      if (response.success) {
        setLedgerEntries(response.data.entries)
        setOpeningBalance(response.data.summary.openingBalance)
        setClosingBalance(response.data.summary.closingBalance)
        console.log(`✅ Loaded ${response.count} ledger entries from backend`)
      } else {
        alert("Failed to load ledger entries")
        setLedgerEntries([])
      }
    } catch (error) {
      console.error("Error loading ledger entries:", error)
      alert(`Failed to load ledger entries: ${error.message}`)
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

  // Calculate totals
  const totalDebits = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0)
  const totalCredits = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0)

  // ========================= LEDGER VIEW =========================

  if (showLedger) {
    return (
      <div
        id="print-area"
        className="min-h-screen w-full p-6 bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 print:bg-white print:shadow-none print:p-6 print:pb-24"
      >
        {/* Header */}
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

        {/* Ledger Table */}
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
                        {entry.voucherType === "Purchase" && entry.grn ? (
                          <span className="text-purple-600 font-medium">{entry.grn} ? {entry.invoice}</span>
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
                          {formatCurrency(entry.balance)}
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

                {/* Totals row */}
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
                        {formatCurrency(closingBalance)}
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Print/Export Actions */}
        {ledgerEntries.length > 0 && (
          <div className="flex justify-center gap-4 mt-6 print:hidden">
            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white">
              Print Ledger
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                // Simple CSV export
                const csvContent = [
                  ["Sr#", "Date", "Voucher No", "GRN", "Type", "Description", "Debit", "Credit", "Balance"].join(","),
                  ...ledgerEntries.map((entry, index) =>
                    [
                      index + 1,
                      formatDate(entry.date),
                      entry.voucherNo,
                      entry.voucherType === "Purchase" && entry.grn ? entry.grn : "-",
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

  // Group accounts by category for better display
  const groupedAccounts = accountOptions.reduce((groups, account) => {
    if (!groups[account.category]) {
      groups[account.category] = []
    }
    groups[account.category].push(account)
    return groups
  }, {})

  // ========================= FORM VIEW =========================

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
          {/* Date Selection */}
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

          {/* Account Selection */}
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

          {/* Report Type */}
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

          {/* Info Card */}
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

          {/* Action Buttons */}
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