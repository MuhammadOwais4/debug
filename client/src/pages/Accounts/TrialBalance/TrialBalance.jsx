"use client"

import React, { useState, useEffect } from "react"
import {
  Search,
  Download,
  Printer,
  RefreshCw,
  Plus,
  Minus,
  FileSpreadsheet,
  Upload,
  Save,
  CheckCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ApiHandler from "@/Api/apihandle"
import { useNavigate } from "react-router-dom"
import * as XLSX from "xlsx"

const format = (n) => {
  const num = Number.parseFloat(n) || 0
  return num === 0 ? "0" : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TrialBalance() {
  const navigate = useNavigate()
  
  // Add print styles
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      @media print {
        body * {
          visibility: hidden;
        }
        .print-container, .print-container * {
          visibility: visible;
        }
        .print-container {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          background: white !important;
        }
        .no-print {
          display: none !important;
        }
        .print-table {
          page-break-inside: auto;
        }
        .print-table tr {
          page-break-inside: avoid;
          page-break-after: auto;
        }
        .print-header {
          margin-bottom: 20px;
        }
        .print-period {
          margin-bottom: 15px;
        }
        @page {
          margin: 1cm;
          size: A4 landscape;
        }
        /* Ensure table fits on page */
        table {
          width: 100%;
          font-size: 10pt;
        }
        th, td {
          padding: 4px 8px !important;
        }
        /* Remove background colors in print */
        .print-container {
          box-shadow: none !important;
        }
      }
    `
    document.head.appendChild(style)
    return () => document.head.removeChild(style)
  }, [])
  
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    return firstDay.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })

  const [trialBalanceData, setTrialBalanceData] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [accounts, setAccounts] = useState([])
  const [error, setError] = useState(null)
  const [salesData, setSalesData] = useState([])
  const [purchasesData, setPurchasesData] = useState([])

  // Excel data states
  const [showExcelData, setShowExcelData] = useState(false)
  const [excelData, setExcelData] = useState([])
  const [loadingExcel, setLoadingExcel] = useState(false)
  const [excelError, setExcelError] = useState(null)
  const [excelFileName, setExcelFileName] = useState("")
  const [savingData, setSavingData] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const fileInputRef = React.useRef(null)

  useEffect(() => {
    loadAccounts()
    loadSalesandPurchases()
  }, [])

  useEffect(() => {
    if (accounts.length > 0 && salesData.length > 0 && purchasesData.length > 0) {
      calculateTrialBalance()
    }
  }, [startDate, endDate, accounts, salesData, purchasesData])

  useEffect(() => {
    const onVoucherChanged = (e) => {
      calculateTrialBalance()
    }
    if (typeof window !== "undefined") {
      window.addEventListener("voucher:changed", onVoucherChanged)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("voucher:changed", onVoucherChanged)
      }
    }
  }, [startDate, endDate, accounts, salesData, purchasesData])

  useEffect(() => {
    if (saveSuccess) {
      const timer = setTimeout(() => setSaveSuccess(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [saveSuccess])

  const loadAccounts = async () => {
    try {
      setError(null)
      setLoading(true)

      const [assetsRes, equityRes, expensesRes, liabilitiesRes, revenueRes] = await Promise.all([
        ApiHandler.getAssets().catch(() => ({ data: [] })),
        ApiHandler.getEquity().catch(() => ({ data: [] })),
        ApiHandler.getChartExpenses().catch(() => ({ data: [] })),
        ApiHandler.getLiabilities().catch(() => ({ data: [] })),
        ApiHandler.getRevenue().catch(() => ({ data: [] })),
      ])

      const allAccounts = [
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

      allAccounts.sort((a, b) => a.code.localeCompare(b.code))
      setAccounts(allAccounts)
      console.log(`Loaded ${allAccounts.length} accounts`)
    } catch (error) {
      console.error("Error loading accounts:", error)
      setError("Failed to load accounts. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const loadSalesandPurchases = async () => {
    try {
      const [salesResponse, purchasesResponse] = await Promise.all([
        ApiHandler.getSales(),
        ApiHandler.getProducts(),
      ])

      setSalesData(salesResponse.data || [])
      setPurchasesData(purchasesResponse.data || [])
      
      console.log("=== SALES DATA ===")
      console.log("Total sales:", salesResponse.data?.length)
      if (salesResponse.data && salesResponse.data.length > 0) {
        console.log("Sample sale:", salesResponse.data[0])
      }
      
      console.log("\n=== PURCHASES DATA ===")
      console.log("Total purchases:", purchasesResponse.data?.length)
      if (purchasesResponse.data && purchasesResponse.data.length > 0) {
        console.log("Sample purchase:", purchasesResponse.data[0])
      }
    } catch (error) {
      console.log("Error loading sales and purchases:", error)
    }
  }

  const calculateTrialBalance = async () => {
    if (!startDate || !endDate || accounts.length === 0) return

    setLoading(true)
    setError(null)
    try {
      console.log("Calculating trial balance for period:", startDate, "to", endDate)

      // Fetch all vouchers
      const response = await ApiHandler.getVouchers({})
      const allVouchers = response.data || []
      console.log(`Processing ${allVouchers.length} vouchers`)

      // Calculate balances for each account
      const trialBalanceEntries = accounts.map((account) => {
        let openingDebit = 0
        let openingCredit = 0
        let currentDebit = 0
        let currentCredit = 0

        allVouchers.forEach((voucher) => {
          const voucherDate = new Date(voucher.voucherDate)
          const start = new Date(startDate)
          const end = new Date(endDate)

          voucher.entries?.forEach((entry) => {
            // Match account by multiple criteria
            const entryCode =
              typeof entry.account === "string" ? entry.account.split(" - ")[0]?.trim() : entry.account?.code || ""
            const accountMatches = !!entryCode && entryCode === account.code

            if (accountMatches) {
              const debit = Number.parseFloat(entry.debitAmount || 0)
              const credit = Number.parseFloat(entry.creditAmount || 0)
              if (voucherDate < start) {
                openingDebit += debit
                openingCredit += credit
              } else if (voucherDate >= start && voucherDate <= end) {
                currentDebit += debit
                currentCredit += credit
              }
            }
          })
        })

        // Calculate opening balance based on normal balance
        let openingBalance = 0
        if (account.normalBalance === "debit") {
          openingBalance = openingDebit - openingCredit
        } else {
          openingBalance = openingCredit - openingDebit
        }

        // Determine opening debit/credit display
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

        // Calculate closing balance
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

          openingDebit: displayOpeningDebit,
          openingCredit: displayOpeningCredit,
          currentDebit,
          currentCredit,
          closingDebit: displayClosingDebit,
          closingCredit: displayClosingCredit,
          hasActivity: openingDebit > 0 || openingCredit > 0 || currentDebit > 0 || currentCredit > 0,
        }
      })

      // Filter to show only accounts with activity
      const activeAccounts = trialBalanceEntries.filter((entry) => entry.hasActivity)

      // Add sales data
      const start = new Date(startDate)
      const end = new Date(endDate)
      
      const salesEntries = []
      salesData
        .filter(sale => {
          const saleDate = new Date(sale.saleDate || sale.date || sale.createdAt)
          return saleDate >= start && saleDate <= end
        })
        .forEach(sale => {
          const amount = Number.parseFloat(sale.totalAmount || sale.amount || 0)
          const grnNumber = sale.grn || sale.grnNumber || sale.invoiceNumber || sale.id
          
          // Create debit entry (Customer/Receivable)
          salesEntries.push({
            code: grnNumber,
            name: sale.customerName ,
            openingDebit: 0,
            openingCredit: 0,
            currentDebit: amount,
            currentCredit: 0,
            closingDebit: 0,
            closingCredit: 0,
            hasActivity: true,
            isSale: true,
           
            saleDate: sale.saleDate || sale.date || sale.createdAt,
          })
          
          // Create credit entry (Revenue)
          salesEntries.push({
            code: grnNumber,
            name: sale.saleType ,     
            openingDebit: 0,
            openingCredit: 0,
            currentDebit: 0,
            currentCredit: amount,
            closingDebit: 0,
            closingCredit: 0,
            hasActivity: true,
            isSale: true,
            customerName: sale.customerName ,
            saleDate: sale.saleDate || sale.date || sale.createdAt,
          })
        })

      // Add purchase data - Show all products separately
      const purchaseEntries = []
      purchasesData
        .filter(purchase => {
          const purchaseDate = new Date(purchase.purchaseDate || purchase.date || purchase.createdAt)
          return purchaseDate >= start && purchaseDate <= end
        })
        .forEach(purchase => {
          const grnNumber = purchase.grn || purchase.grnNumber || purchase.id
          const amount = Number.parseFloat(purchase.total || purchase.totalAmount || purchase.amount || 0)
          const quantity = Number.parseFloat(purchase.quantity || 0)
          const rate = Number.parseFloat(purchase.purchaseRate || purchase.rate || purchase.price || 0)
          const calculatedAmount = quantity > 0 && rate > 0 ? quantity * rate : amount
          
          // Create debit entry (Purchase Type/Expense)
          purchaseEntries.push({
            code: grnNumber,
            name: purchase.purchaseType?.name || purchase.purchaseType ,
           
            openingDebit: 0,
            openingCredit: 0,
            currentDebit: calculatedAmount,
            currentCredit: 0,
            closingDebit: 0,
            closingCredit: 0,
            hasActivity: true,
            isPurchase: true,
            vendorName: purchase.vendorName?.name || purchase.vendorName,
            productName: purchase.name || purchase.productName,
            quantity: quantity,
            rate: rate,
            purchaseDate: purchase.purchaseDate || purchase.date || purchase.createdAt,
          })
          
          // Create credit entry (Vendor/Payable)
          purchaseEntries.push({
            code: grnNumber,
            name: purchase.vendorName?.name || purchase.vendorName ,
           
            openingDebit: 0,
            openingCredit: 0,
            currentDebit: 0,
            currentCredit: calculatedAmount,
            closingDebit: 0,
            closingCredit: 0,
            hasActivity: true,
            isPurchase: true,
            purchaseType: purchase.purchaseType?.name || purchase.purchaseType ,
            productName: purchase.name || purchase.productName ,
            quantity: quantity,
            rate: rate,
            purchaseDate: purchase.purchaseDate || purchase.date || purchase.createdAt,
          })
        })

      const combinedData = [...activeAccounts, ...salesEntries, ...purchaseEntries]
      setTrialBalanceData(combinedData)
      console.log(`Found ${combinedData.length} entries (${activeAccounts.length} accounts, ${salesEntries.length} sales, ${purchaseEntries.length} purchases)`)
    } catch (error) {
      console.error("Error calculating trial balance:", error)
      setError("Failed to calculate trial balance. " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event) => {
    const file = event.target.files[0]
    if (!file) return

    setLoadingExcel(true)
    setExcelError(null)
    setExcelFileName(file.name)

    try {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const data = e.target.result
          const workbook = XLSX.read(data, { type: "binary" })

          // Get the first sheet
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

          // Process the data assuming headers are in the first row
          if (jsonData.length < 2) {
            throw new Error("Excel file appears to be empty or has no data rows")
          }

          const headers = jsonData[0]
          const processedData = []

          // Find column indices for required fields
          const columnMap = {
            code: headers.findIndex((h) => h && h.toString().toLowerCase().includes("code")),
            name: headers.findIndex(
              (h) =>
                h &&
                (h.toString().toLowerCase().includes("description") || h.toString().toLowerCase().includes("name")),
            ),
            
            openingDebit: headers.findIndex(
              (h) =>
                h && h.toString().toLowerCase().includes("opening") && h.toString().toLowerCase().includes("debit"),
            ),
            openingCredit: headers.findIndex(
              (h) =>
                h && h.toString().toLowerCase().includes("opening") && h.toString().toLowerCase().includes("credit"),
            ),
            currentDebit: headers.findIndex(
              (h) =>
                h && h.toString().toLowerCase().includes("current") && h.toString().toLowerCase().includes("debit"),
            ),
            currentCredit: headers.findIndex(
              (h) =>
                h && h.toString().toLowerCase().includes("current") && h.toString().toLowerCase().includes("credit"),
            ),
            closingDebit: headers.findIndex(
              (h) =>
                h && h.toString().toLowerCase().includes("closing") && h.toString().toLowerCase().includes("debit"),
            ),
            closingCredit: headers.findIndex(
              (h) =>
                h && h.toString().toLowerCase().includes("closing") && h.toString().toLowerCase().includes("credit"),
            ),
          }

          // If exact matches not found, try alternative mapping
          if (columnMap.code === -1) columnMap.code = 0
          if (columnMap.name === -1) columnMap.name = 1
          if (columnMap.openingDebit === -1) columnMap.openingDebit = 2
          if (columnMap.openingCredit === -1) columnMap.openingCredit = 3
          if (columnMap.currentDebit === -1) columnMap.currentDebit = 4
          if (columnMap.currentCredit === -1) columnMap.currentCredit = 5
          if (columnMap.closingDebit === -1) columnMap.closingDebit = 6
          if (columnMap.closingCredit === -1) columnMap.closingCredit = 7

          // Process data rows
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (!row || row.length === 0) continue

            const code = row[columnMap.code]?.toString().trim() || ""
            const name = row[columnMap.name]?.toString().trim() || ""

            // Skip empty rows or total rows
            if (!code || !name || code.toLowerCase().includes("total")) continue

            processedData.push({
              code: code,
              name: name,
              openingDebit: Number.parseFloat(row[columnMap.openingDebit]) || 0,
              openingCredit: Number.parseFloat(row[columnMap.openingCredit]) || 0,
              currentDebit: Number.parseFloat(row[columnMap.currentDebit]) || 0,
              currentCredit: Number.parseFloat(row[columnMap.currentCredit]) || 0,
              closingDebit: Number.parseFloat(row[columnMap.closingDebit]) || 0,
              closingCredit: Number.parseFloat(row[columnMap.closingCredit]) || 0,
              hasActivity: true,
            })
          }

          if (processedData.length === 0) {
            throw new Error("No valid data rows found in the Excel file")
          }

          setExcelData(processedData)
          setShowExcelData(true)
          console.log(`Loaded ${processedData.length} rows from Excel`)
        } catch (error) {
          console.error("Error processing Excel file:", error)
          setExcelError(`Failed to process Excel file: ${error.message}`)
        } finally {
          setLoadingExcel(false)
        }
      }

      reader.onerror = () => {
        setExcelError("Failed to read the Excel file")
        setLoadingExcel(false)
      }

      reader.readAsBinaryString(file)
    } catch (error) {
      console.error("Error reading file:", error)
      setExcelError("Failed to read the Excel file. Please ensure it's a valid .xlsx or .xls file")
      setLoadingExcel(false)
    }

    // Reset file input
    event.target.value = null
  }

  const saveExcelDataToDatabase = async () => {
    if (excelData.length === 0) {
      setExcelError("No Excel data to save")
      return
    }

    setSavingData(true)
    setExcelError(null)

    try {
      // Prepare data for saving
      const dataToSave = {
        trialBalanceData: excelData,
        period: {
          startDate: startDate,
          endDate: endDate,
        },
        fileName: excelFileName,
        uploadedAt: new Date().toISOString(),
        totals: {
          openingDebit: excelTotals.openingDebit,
          openingCredit: excelTotals.openingCredit,
          currentDebit: excelTotals.currentDebit,
          currentCredit: excelTotals.currentCredit,
          closingDebit: excelTotals.closingDebit,
          closingCredit: excelTotals.closingCredit,
        },
      }

      // Call API to save trial balance data
      const response = await ApiHandler.post("/trial-balance/save", dataToSave)

      if (response.success) {
        setSaveSuccess(true)
        console.log("Trial balance data saved successfully")

        // Optionally refresh the accounts after saving
        await loadAccounts()
        await calculateTrialBalance()
      } else {
        throw new Error(response.message || "Failed to save data")
      }
    } catch (error) {
      console.error("Error saving trial balance data:", error)
      setExcelError(`Failed to save data: ${error.message}`)
    } finally {
      setSavingData(false)
    }
  }

  const toggleExcelData = () => {
    if (!showExcelData && excelData.length === 0) {
      // Trigger file upload if no data loaded
      fileInputRef.current?.click()
    } else {
      setShowExcelData(!showExcelData)
    }
  }

  const formatDate = (date) => {
    const options = { day: "2-digit", month: "short", year: "numeric" }
    return new Date(date).toLocaleDateString("en-GB", options).replace(/ /g, "-")
  }

  const filteredData = trialBalanceData.filter(
    (row) =>
      (row.code && row.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.name && row.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof row.currentDebit === 'string' && row.currentDebit && row.currentDebit.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (typeof row.currentCredit === 'string' && row.currentCredit && row.currentCredit.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const filteredExcelData = excelData.filter(
    (row) =>
      (row.code && row.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (row.name && row.name.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  // Calculate totals for system data
  const totals = filteredData.reduce(
    (acc, row) => ({
      openingDebit: acc.openingDebit + (typeof row.openingDebit === 'number' ? row.openingDebit : 0),
      openingCredit: acc.openingCredit + (typeof row.openingCredit === 'number' ? row.openingCredit : 0),
      currentDebit: acc.currentDebit + (typeof row.currentDebit === 'number' ? row.currentDebit : 0),
      currentCredit: acc.currentCredit + (typeof row.currentCredit === 'number' ? row.currentCredit : 0),
      closingDebit: acc.closingDebit + (typeof row.closingDebit === 'number' ? row.closingDebit : 0),
      closingCredit: acc.closingCredit + (typeof row.closingCredit === 'number' ? row.closingCredit : 0),
    }),
    {
      openingDebit: 0,
      openingCredit: 0,
      currentDebit: 0,
      currentCredit: 0,
      closingDebit: 0,
      closingCredit: 0,
    },
  )

  // Calculate totals for Excel data
  const excelTotals = filteredExcelData.reduce(
    (acc, row) => ({
      openingDebit: acc.openingDebit + row.openingDebit,
      openingCredit: acc.openingCredit + row.openingCredit,
      currentDebit: acc.currentDebit + row.currentDebit,
      currentCredit: acc.currentCredit + row.currentCredit,
      closingDebit: acc.closingDebit + row.closingDebit,
      closingCredit: acc.closingCredit + row.closingCredit,
    }),
    {
      openingDebit: 0,
      openingCredit: 0,
      currentDebit: 0,
      currentCredit: 0,
      closingDebit: 0,
      closingCredit: 0,
    },
  )

  const handleExcelExport = () => {
    const dataToExport = showExcelData ? filteredExcelData : filteredData
    const totalsToExport = showExcelData ? excelTotals : totals

    // Create a new workbook
    const wb = XLSX.utils.book_new()

    // Prepare data for Excel
    const wsData = [
      // Headers
      [
        "Account Code",
        "Account Description",
        "Category",
        "Opening Debit",
        "Opening Credit",
        "Current Debit",
        "Current Credit",
        "Closing Debit",
        "Closing Credit",
      ],
      // Data rows
      ...dataToExport.map((row) => [
        row.code,
        row.name,
        typeof row.openingDebit === 'number' ? row.openingDebit : 0,
        typeof row.openingCredit === 'number' ? row.openingCredit : 0,
        typeof row.currentDebit === 'number' ? row.currentDebit : row.currentDebit,
        typeof row.currentCredit === 'number' ? row.currentCredit : row.currentCredit,
        typeof row.closingDebit === 'number' ? row.closingDebit : 0,
        typeof row.closingCredit === 'number' ? row.closingCredit : 0,
      ]),
      // Empty row
      [],
      // Totals row
      [
        "TOTAL",
        "",
        "",
        totalsToExport.openingDebit,
        totalsToExport.openingCredit,
        totalsToExport.currentDebit,
        totalsToExport.currentCredit,
        totalsToExport.closingDebit,
        totalsToExport.closingCredit,
      ],
    ]

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(wb, ws, "Trial Balance")

    // Generate Excel file and download
    XLSX.writeFile(wb, `trial_balance_${startDate}_${endDate}_${showExcelData ? "excel" : "system"}.xlsx`)
  }

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50">
      <div className="max-w-[1400px] mx-auto bg-white shadow-lg rounded-lg overflow-hidden print-container">
        {/* Success Message */}
        {saveSuccess && (
          <div className="bg-green-50 border-b border-green-200 text-green-700 px-4 py-3 flex items-center gap-2 no-print">
            <CheckCircle className="h-5 w-5" />
            Trial balance data saved successfully to database!
          </div>
        )}

        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-100 to-blue-200">
          <div className="flex items-start justify-between gap-4 mb-4 no-print">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={loadAccounts}
                disabled={loading}
                className="flex items-center gap-2 bg-transparent"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Reload Accounts
              </Button>

              <Button
                variant="outline"
                onClick={toggleExcelData}
                className="flex items-center gap-2 relative bg-transparent"
                disabled={loadingExcel}
              >
                {showExcelData ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                <FileSpreadsheet className="h-4 w-4" />
                {excelFileName ? `Excel: ${excelFileName}` : "Load Excel"}
              </Button>

              {showExcelData && excelData.length > 0 && (
                <Button
                  onClick={saveExcelDataToDatabase}
                  disabled={savingData}
                  className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2"
                >
                  {savingData ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save to Database
                </Button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
            </div>
          </div>

          <div className="text-center mb-4 print-header">
            <h1 className="text-3xl font-bold text-gray-800">ABC COMPANY</h1>
            <h2 className="text-2xl font-semibold text-blue-600 mt-2">
              TRIAL BALANCE {showExcelData && excelData.length > 0 && "(Excel Data)"}
            </h2>
          </div>

          {/* Date Range */}
          {!showExcelData && (
            <div className="flex items-center justify-center gap-4 flex-wrap no-print">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-700">Period From:</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-40 bg-white border-2 border-gray-300 focus:border-blue-500"
                />
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium text-gray-700">To:</Label>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-40 bg-white border-2 border-gray-300 focus:border-blue-500"
                />
              </div>
              <Button
                onClick={calculateTrialBalance}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Calculate
              </Button>
            </div>
          )}

          {/* Display formatted dates or Excel info */}
          <div className="text-center mt-3 text-gray-700 text-sm print-period">
            {showExcelData && excelData.length > 0 ? (
              <>Showing Excel Data: {excelFileName}</>
            ) : (
              <>
                Period: {formatDate(startDate)} → {formatDate(endDate)}
              </>
            )}
          </div>

          <div className="text-center mt-1 text-gray-600 text-xs no-print">
            {showExcelData && excelData.length > 0 ? (
              <>{filteredExcelData.length} accounts from Excel file</>
            ) : (
              <>
                {filteredData.length} entries | Total accounts: {accounts.length}
              </>
            )}
          </div>
        </div>

        {/* Error Messages */}
        {error && !showExcelData && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded no-print">{error}</div>
        )}

        {excelError && showExcelData && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 m-4 rounded no-print">{excelError}</div>
        )}

        {/* Search and Actions Bar */}
        <div className="p-4 bg-gray-50 border-b flex items-center justify-between gap-4 no-print">
          <div className="flex items-center bg-white border rounded-md px-3 py-2 gap-2 shadow-sm flex-1 max-w-md">
            <Search size={16} className="text-gray-400" />
            <input
              className="outline-none text-sm w-full"
              placeholder="Search account code or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExcelExport}
              variant="outline"
              disabled={(showExcelData ? filteredExcelData : filteredData).length === 0}
              className="flex items-center gap-2 bg-transparent"
            >
              <Download size={16} /> Export Excel
            </Button>
            <Button
              onClick={() => window.print()}
              variant="outline"
              disabled={(showExcelData ? filteredExcelData : filteredData).length === 0}
              className="flex items-center gap-2"
            >
              <Printer size={16} /> Print
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {(loading || loadingExcel) && (
          <div className="text-center py-12 no-print">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
            <p className="text-gray-600">
              {loadingExcel
                ? "Processing Excel file..."
                : accounts.length === 0
                  ? "Loading accounts..."
                  : "Calculating trial balance..."}
            </p>
          </div>
        )}

        {/* Table */}
        {!loading && !loadingExcel && (
          <div className="overflow-auto">
            <table className="min-w-full table-auto border-collapse print-table">
              <thead className="sticky top-0 bg-gradient-to-r from-blue-100 to-blue-200">
                <tr>
                  <th className="text-left px-4 py-3 border border-gray-300 font-semibold text-gray-700">Acc Code / GRN</th>
                  <th className="text-left px-4 py-3 border border-gray-300 font-semibold text-gray-700">
                    Account Description
                  </th>
                  <th className="px-4 py-3 border border-gray-300 text-right font-semibold text-green-600">
                    Opening
                    <br />
                    Debit
                  </th>
                  <th className="px-4 py-3 border border-gray-300 text-right font-semibold text-red-600">
                    Opening
                    <br />
                    Credit
                  </th>
                  <th className="px-4 py-3 border border-gray-300 text-right font-semibold text-green-600">
                    Current
                    <br />
                    Debit
                  </th>
                  <th className="px-4 py-3 border border-gray-300 text-right font-semibold text-red-600">
                    Current
                    <br />
                    Credit
                  </th>
                  <th className="px-4 py-3 border border-gray-300 text-right font-semibold text-green-600">
                    Closing
                    <br />
                    Debit
                  </th>
                  <th className="px-4 py-3 border border-gray-300 text-right font-semibold text-red-600">
                    Closing
                    <br />
                    Credit
                  </th>
                </tr>
              </thead>
              <tbody>
                {(showExcelData ? filteredExcelData : filteredData).length > 0 ? (
                  (showExcelData ? filteredExcelData : filteredData).map((row, i) => (
                    <tr
                      key={`${row.code}-${i}`}
                      className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50"} hover:bg-blue-50 transition-colors`}
                    >
                      <td className="px-4 py-3 text-sm text-gray-700 border border-gray-300 font-mono">{row.code}</td>
                      <td className="px-4 py-3 text-sm text-gray-700 border border-gray-300">
                        {row.name}
                        {row.quantity && row.rate && (
                          <div className="text-xs text-blue-600 mt-1">
                          </div>
                        )}
                        {row.productName && (
                          <div className="text-xs text-gray-600 mt-1">
                           <></>
                          </div>
                        )}
                        <div className="flex flex-wrap gap-1 mt-1">
                          
                          {row.isSale && row.saleType && (
                            <span className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded border border-green-200">
                              Type: {row.saleType}
                            </span>
                          )}
                          {row.isSale && row.customerName && (
                            <></>
                          )}
                          {row.isPurchase && row.purchaseType && (
                            <></>
                          )}
                          {row.isPurchase && row.vendorName && (
                          <></>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-right border border-gray-300 font-mono">
                        {typeof row.openingDebit === 'number' && row.openingDebit > 0 ? (
                          <span className="text-green-600 font-semibold">{format(row.openingDebit)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right border border-gray-300 font-mono">
                        {typeof row.openingCredit === 'number' && row.openingCredit > 0 ? (
                          <span className="text-red-600 font-semibold">{format(row.openingCredit)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right border border-gray-300 font-mono">
                        {typeof row.currentDebit === 'number' && row.currentDebit > 0 ? (
                          <span className="text-green-600 font-semibold">{format(row.currentDebit)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right border border-gray-300 font-mono">
                        {typeof row.currentCredit === 'number' && row.currentCredit > 0 ? (
                          <span className="text-red-600 font-semibold">{format(row.currentCredit)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right border border-gray-300 font-mono">
                        {typeof row.closingDebit === 'number' && row.closingDebit > 0 ? (
                          <span className="text-green-600 font-bold">{format(row.closingDebit)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right border border-gray-300 font-mono">
                        {typeof row.closingCredit === 'number' && row.closingCredit > 0 ? (
                          <span className="text-red-600 font-bold">{format(row.closingCredit)}</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="px-4 py-12 text-center text-gray-500 border border-gray-300">
                      <div className="text-lg mb-2">
                        {showExcelData
                          ? excelData.length === 0
                            ? 'No Excel data loaded. Click the "Load Excel" button to upload a file'
                            : "No accounts found matching your search in Excel data"
                          : searchTerm
                            ? "No accounts found matching your search"
                            : "No accounts with activity in this period"}
                      </div>
                      <div className="text-sm no-print">
                        {showExcelData && excelData.length === 0 && (
                          <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="mt-2">
                            <Upload className="h-4 w-4 mr-2" />
                            Upload Excel File
                          </Button>
                        )}
                        {!showExcelData &&
                          !searchTerm &&
                          "Try adjusting the date range or checking if vouchers exist for this period"}
                      </div>
                    </td>
                  </tr>
                )}

                {/* Totals Row */}
                {(showExcelData ? filteredExcelData : filteredData).length > 0 && (
                  <tr className="bg-gradient-to-r from-gray-100 to-gray-200 font-bold border-t-2 border-gray-400">
                    <td className="px-4 py-4 text-sm border border-gray-300" colSpan="2">
                      <span className="text-lg">TOTAL</span>
                    </td>
                    <td className="px-4 py-4 text-sm text-right border border-gray-300 font-mono text-green-700 text-lg">
                      {format(showExcelData ? excelTotals.openingDebit : totals.openingDebit)}
                    </td>
                    <td className="px-4 py-4 text-sm text-right border border-gray-300 font-mono text-red-700 text-lg">
                      {format(showExcelData ? excelTotals.openingCredit : totals.openingCredit)}
                    </td>
                    <td className="px-4 py-4 text-sm text-right border border-gray-300 font-mono text-green-700 text-lg">
                      {format(showExcelData ? excelTotals.currentDebit : totals.currentDebit)}
                    </td>
                    <td className="px-4 py-4 text-sm text-right border border-gray-300 font-mono text-red-700 text-lg">
                      {format(showExcelData ? excelTotals.currentCredit : totals.currentCredit)}
                    </td>
                    <td className="px-4 py-4 text-sm text-right border border-gray-300 font-mono text-green-700 text-lg">
                      {format(showExcelData ? excelTotals.closingDebit : totals.closingDebit)}
                    </td>
                    <td className="px-4 py-4 text-sm text-right border border-gray-300 font-mono text-red-700 text-lg">
                      {format(showExcelData ? excelTotals.closingCredit : totals.closingCredit)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer Info */}
        {!loading && !loadingExcel && (showExcelData ? filteredExcelData : filteredData).length > 0 && (
          <div className="p-4 text-xs border-t bg-gray-50">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <span className="text-gray-600">
                {showExcelData
                  ? "* Data loaded from Excel file"
                  : "* All amounts are calculated from actual voucher entries. Sales/Purchases show names instead of amounts."}
              </span>
              <div className="font-medium text-gray-700">
                <span className="mr-4">
                  Opening Difference:{" "}
                  {format(
                    Math.abs(
                      showExcelData
                        ? excelTotals.openingDebit - excelTotals.openingCredit
                        : totals.openingDebit - totals.openingCredit,
                    ),
                  )}
                </span>
                <span>
                  Closing Difference:{" "}
                  {format(
                    Math.abs(
                      showExcelData
                        ? excelTotals.closingDebit - excelTotals.closingCredit
                        : totals.closingDebit - totals.closingCredit,
                    ),
                  )}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}