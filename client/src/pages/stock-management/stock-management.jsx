"use client"

import { useState, useEffect } from "react"
import ApiHandler from "@/Api/apihandle"
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  TrendingUp,
  Package,
  Printer,
} from "lucide-react"

const productCategories = ["Electronics", "Furniture", "Stationery", "Kitchenware", "Clothing", "Food", "Other"]

const StockManagement = ({ onStockUpdate, onNotificationCreate }) => {
  const formatDateToDDMMYYYY = (date) => {
    if (!date) return ""
    const d = new Date(date)
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  }

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return ""
    const d = new Date(date)
    return d.toISOString().split("T")[0]
  }

  const [stockEntries, setStockEntries] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vendors, setVendors] = useState([])
  const [purchasesAccounts, setPurchasesAccounts] = useState([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [loadingPurchases, setLoadingPurchases] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    name: "",
    category: "",
    quantity: "",
    purchaseRate: "",
    saleRate: "",
    customerName: "",
    vendorPhone: "",
    notes: "",
    serialNumber: "",
    expiryDate: "",
    lastPurchase: "",
    vendorName: "",
    vendorBillNumber: "",
    grn: "",
    purchasesType: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingVoucherId, setEditingVoucherId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)

  const loadVendors = async () => {
    try {
      setLoadingVendors(true)
      const response = await ApiHandler.getLiabilities()
      const liabilities = response.data || []
      console.log("[v0] Liabilities data:", liabilities)
      const vendorList = liabilities.filter((liability) => liability.type === "PAYABLES")
      console.log("[v0] Filtered vendors:", vendorList)
      setVendors(vendorList)
    } catch (err) {
      console.error("Error loading vendors:", err)
      setVendors([])
    } finally {
      setLoadingVendors(false)
    }
  }

  const loadPurchasesAccounts = async () => {
    try {
      setLoadingPurchases(true)
      const response = await ApiHandler.getAssets()
      const assets = response.data || []
      console.log("[v0] Assets data:", assets)
      const purchasesList = assets.filter((asset) => asset.type === "Purchases")
      console.log("[v0] Filtered purchases accounts:", purchasesList)
      setPurchasesAccounts(purchasesList)
    } catch (err) {
      console.error("Error loading purchases accounts:", err)
      setPurchasesAccounts([])
    } finally {
      setLoadingPurchases(false)
    }
  }

  const fetchStockEntries = async () => {
    try {
      setLoading(true)
      setError(null)

      const productsResponse = await ApiHandler.getProducts()
      let productsData = []

      if (productsResponse && Array.isArray(productsResponse)) {
        productsData = productsResponse
      } else if (productsResponse && productsResponse.data) {
        productsData = Array.isArray(productsResponse.data) ? productsResponse.data : []
      }

      const entries = productsData.map((product) => {
        const vendorObj =
          typeof product.vendorName === "object"
            ? product.vendorName
            : vendors.find((v) => v._id === product.vendorName)
        const vendorNameStr = vendorObj?.name || (typeof product.vendorName === "string" ? product.vendorName : "")

        const purchaseTypeObj =
          typeof product.purchaseType === "object"
            ? product.purchaseType
            : purchasesAccounts.find((p) => p._id === product.purchaseType)
        const purchaseTypeStr = purchaseTypeObj?.name || ""

        const balanceAmount = product.quantity * product.purchaseRate

        return {
          id: product._id,
          date: product.createdAt ? formatDateToDDMMYYYY(product.createdAt) : formatDateToDDMMYYYY(new Date()),
          itemName: product.name,
          category: product.category,
          purchaseQuantity: product.quantity,
          purchaseRate: product.purchaseRate,
          purchaseStockValue: product.quantity * product.purchaseRate,
          saleRate: product.saleRate,
          saleStockValue: product.quantity * product.saleRate,
          balanceQuantity: product.quantity,
          balanceRate: product.purchaseRate,
          balanceStockValue: product.quantity * product.purchaseRate,
          balanceAmount: balanceAmount,
          customerName: "",
          vendorPhone: product.vendorPhone || "",
          notes: product.notes || "",
          profit: (product.saleRate - product.purchaseRate) * product.quantity,
          totalAmount: product.quantity * product.saleRate,
          serialNumber: product.serialNumber || "",
          vendorName: vendorNameStr,
          vendorBillNumber: product.vendorBillNumber || "",
          grn: product.grn || "",
          expiryDate: product.expiryDate || "",
          voucherId: product.voucherId || "",
          purchaseType: purchaseTypeStr,
        }
      })

      setStockEntries(entries)
      setProducts(productsData)

      if (onStockUpdate) {
        onStockUpdate(entries)
      }
    } catch (err) {
      setError(err.message)
      console.error("Error fetching stock entries:", err)
      setStockEntries([])
    } finally {
      setLoading(false)
    }
  }

  const createNotification = async (type, title, message, priority = "medium", relatedId = null) => {
    try {
      const notificationData = {
        type,
        title,
        message,
        priority,
        relatedId,
        relatedModel: relatedId ? "Product" : null,
      }

      await ApiHandler.createNotification(notificationData)

      if (onNotificationCreate) {
        onNotificationCreate({
          ...notificationData,
          _id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          isRead: false,
        })
      }
    } catch (err) {
      console.error("Error creating notification:", err)
    }
  }

  const emitVoucherChangedEvent = () => {
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(
          new CustomEvent("voucher:changed", {
            detail: { action: "refresh", at: Date.now() },
          }),
        )
      } catch (_) {}
    }
  }

  useEffect(() => {
    loadVendors()
    loadPurchasesAccounts()
    fetchStockEntries()
  }, [])

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      name: "",
      category: "",
      quantity: "",
      purchaseRate: "",
      saleRate: "",
      customerName: "",
      vendorPhone: "",
      notes: "",
      serialNumber: "",
      expiryDate: "",
      lastPurchase: "",
      vendorName: "",
      vendorBillNumber: "",
      grn: "",
      purchasesType: "",
    })
    setIsEditing(false)
    setEditingId(null)
    setEditingVoucherId(null)
    setShowForm(false)
    setError(null)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value,
    })

    if (name === "name") {
      const product = products.find((p) => p.name.toLowerCase() === value.toLowerCase())
      if (product) {
        setFormData((prev) => ({
          ...prev,
          category: product.category || "",
          purchaseRate: product.purchaseRate || "",
          saleRate: product.saleRate || "",
          serialNumber: product.serialNumber || "",
          vendorName: product.vendorName || "",
        }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    try {
      const qty = Number(formData.quantity) || 0
      const purchaseRate = Number(formData.purchaseRate) || 0
      const saleRate = Number(formData.saleRate) || 0

      if (!formData.name || !formData.name.trim()) {
        setError("Product name is required")
        return
      }

      if (!formData.category) {
        setError("Category is required")
        return
      }

      if (!purchaseRate || purchaseRate < 0) {
        setError("Purchase rate is required and must be non-negative")
        return
      }

      if (!saleRate || saleRate < 0) {
        setError("Sale rate is required and must be non-negative")
        return
      }

      if (qty === undefined || qty < 0) {
        setError("Quantity is required and must be non-negative")
        return
      }

      if (!formData.vendorName || !formData.vendorName.trim()) {
        setError("Vendor name is required")
        return
      }

      if (!formData.purchasesType || !formData.purchasesType.trim()) {
        setError("Purchases Type is required")
        return
      }

      const selectedVendor = vendors.find((v) => v.name === formData.vendorName)
      const selectedPurchaseAccount = purchasesAccounts.find((p) => p.name === formData.purchasesType)

      if (!selectedVendor) {
        setError("Selected vendor not found")
        return
      }

      if (!selectedPurchaseAccount) {
        setError("Selected purchase type not found")
        return
      }

      const totalPurchaseAmount = qty * purchaseRate
      console.log("[v0] Purchase Amount Calculation:", {
        quantity: qty,
        purchaseRate: purchaseRate,
        totalAmount: totalPurchaseAmount,
        vendor: selectedVendor.name,
        purchaseAccount: selectedPurchaseAccount.name,
      })

      const productData = {
        name: formData.name.trim(),
        category: formData.category,
        purchaseRate: purchaseRate,
        saleRate: saleRate,
        quantity: qty,
        serialNumber: formData.serialNumber,
        vendorName: selectedVendor._id,
        vendorPhone: formData.vendorPhone,
        vendorBillNumber: formData.vendorBillNumber,
        notes: formData.notes,
        expiryDate: formData.expiryDate,
        purchaseType: selectedPurchaseAccount._id,
      }

      if (isEditing) {
        await ApiHandler.updateProduct(editingId, productData)

        if (editingVoucherId) {
          const updatedVoucherData = {
            voucherDate: formData.date,
            narration: `Goods Receipt Note - ${formData.name}`,
            entries: [
              {
                pairId: "PAIR001",
                entryType: "DEBIT",
                account: `${selectedPurchaseAccount.code} - ${selectedPurchaseAccount.name}`,
                description: `Purchase of ${formData.name}`,
                debitAmount: totalPurchaseAmount,
                creditAmount: 0,
                serialNo: 1,
              },
              {
                pairId: "PAIR001",
                entryType: "CREDIT",
                account: `${selectedVendor.code} - ${selectedVendor.name}`,
                description: `Stock received - ${formData.name}`,
                debitAmount: 0,
                creditAmount: totalPurchaseAmount,
                serialNo: 2,
              },
            ],
          }
          await ApiHandler.updateVoucher(editingVoucherId, updatedVoucherData)
          emitVoucherChangedEvent()
        }

        await createNotification(
          "info",
          "Stock Entry Updated",
          `Stock entry for ${formData.name} has been updated`,
          "medium",
          editingId,
        )
      } else {
        const response = await ApiHandler.createProduct(productData)

        if (!response || !response._id) {
          throw new Error("Failed to create product - no ID returned")
        }

        try {
          const voucherData = {
            voucherNo: `GRN-${Date.now()}`,
            voucherType: "GRN",
            voucherDate: formData.date,
            narration: `Goods Receipt Note - ${formData.name}`,
            entries: [
              {
                pairId: "PAIR001",
                entryType: "DEBIT",
                account: `${selectedPurchaseAccount.code} - ${selectedPurchaseAccount.name}`,
                description: `Purchase of ${formData.name} (Qty: ${qty} @ ${purchaseRate})`,
                debitAmount: totalPurchaseAmount,
                creditAmount: 0,
                serialNo: 1,
              },
              {
                pairId: "PAIR001",
                entryType: "CREDIT",
                account: `${selectedVendor.code} - ${selectedVendor.name}`,
                description: `Stock received - ${formData.name} (Qty: ${qty} @ ${purchaseRate})`,
                debitAmount: 0,
                creditAmount: totalPurchaseAmount,
                serialNo: 2,
              },
            ],
          }

          console.log("[v0] Creating Voucher with entries:", voucherData)

          const voucherResponse = await ApiHandler.createVoucher(voucherData)

          if (!voucherResponse || !voucherResponse.data || !voucherResponse.data._id) {
            throw new Error("Failed to create voucher - no ID returned")
          }

          console.log("[v0] Voucher created successfully:", voucherResponse.data._id)

          // Link the voucher to the product
          await ApiHandler.updateProduct(response._id, {
            ...productData,
            voucherId: voucherResponse.data._id,
          })

          console.log("[v0] Product linked to voucher successfully")
          emitVoucherChangedEvent()

          await createNotification(
            "success",
            "Stock Entry & Voucher Created",
            `Purchase of ${formData.name} for ${totalPurchaseAmount} has been recorded in ledger`,
            "high",
            response._id,
          )
        } catch (voucherErr) {
          console.error("[v0] Error creating voucher entry:", voucherErr)
          await createNotification(
            "warning",
            "Stock Entry Created (Voucher Failed)",
            `Stock entry added but voucher creation failed: ${voucherErr.message}`,
            "high",
            response._id,
          )
          throw voucherErr
        }
      }

      resetForm()
      await fetchStockEntries()
    } catch (err) {
      console.error("[v0] Detailed error:", err)
      if (err.message.includes("All fields are required")) {
        setError(
          "Please fill in all required fields: Name, Category, Purchase Rate, Sale Rate, Quantity, Vendor, and Purchases Type",
        )
      } else if (err.message.includes("already exists")) {
        setError("A product with this name already exists. Please choose a different name.")
      } else {
        setError(err.message || "An error occurred while saving the purchase")
      }
    }
  }

  const handleEdit = (entry) => {
    const dateForForm = entry.date ? formatDateToYYYYMMDD(new Date(entry.date.split("-").reverse().join("-"))) : ""

    const vendorObj = vendors.find((v) => v.name === entry.vendorName)
    const vendorNameForForm = vendorObj?.name || entry.vendorName || ""

    const purchaseTypeForForm = entry.purchaseType || ""

    setFormData({
      date: dateForForm,
      name: entry.itemName,
      category: entry.category,
      quantity: entry.purchaseQuantity.toString(),
      purchaseRate: entry.purchaseRate.toString(),
      saleRate: entry.saleRate.toString(),
      customerName: entry.customerName || "",
      vendorPhone: entry.vendorPhone || "",
      notes: entry.notes || "",
      serialNumber: entry.serialNumber || "",
      expiryDate: entry.expiryDate || "",
      lastPurchase: entry.lastPurchase || "",
      vendorName: vendorNameForForm,
      vendorBillNumber: entry.vendorBillNumber || "",
      grn: entry.grn || "",
      purchasesType: purchaseTypeForForm,
    })
    setIsEditing(true)
    setEditingId(entry.id)
    setEditingVoucherId(entry.voucherId)
    setShowForm(true)
  }

  const handleViewDetails = (entry) => {
    setSelectedEntry(entry)
    setShowDetails(true)
  }

  const handleDelete = async (id) => {
    if (
      window.confirm(
        "Are you sure you want to delete this stock entry? This will also delete the associated GRN voucher.",
      )
    ) {
      try {
        const entry = stockEntries.find((e) => e.id === id)

        if (entry?.voucherId) {
          try {
            await ApiHandler.deleteVoucher(entry.voucherId)
            emitVoucherChangedEvent()
          } catch (voucherErr) {
            console.error("Error deleting voucher:", voucherErr)
          }
        }

        await ApiHandler.deleteProduct(id)

        await createNotification(
          "warning",
          "Stock Entry Deleted",
          `Stock entry for ${entry?.itemName || "item"} and its GRN voucher have been deleted`,
          "medium",
        )
        await fetchStockEntries()
      } catch (err) {
        setError(err.message)
        console.error("Error deleting stock entry:", err)
      }
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=800,width=1200")
    printWindow.document.write("<html><head><title>Stock Report - Goods Receipt Note</title>")
    printWindow.document.write(`
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { text-align: center; color: #1e40af; margin-bottom: 5px; }
        h2 { text-align: center; color: #64748b; margin-top: 0; font-size: 16px; font-weight: normal; }
        .meta { text-align: center; margin-bottom: 20px; color: #64748b; font-size: 14px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
        th { background-color: #f3f4f6; font-weight: bold; }
        .text-right { text-align: right; }
        .totals { background-color: #f9fafb; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #ddd; padding-top: 10px; }
        .profit-positive { color: #059669; }
        .profit-negative { color: #dc2626; }
        @media print {
          body { padding: 10px; }
          .no-print { display: none; }
        }
      </style>
    `)
    printWindow.document.write("</head><body>")
    printWindow.document.write("<h1>Goods Receipt Note</h1>")
    printWindow.document.write("<h2>Stock Management Report</h2>")
    printWindow.document.write(`<div class="meta">Generated on: ${formatDateToDDMMYYYY(new Date())}</div>`)
    printWindow.document.write("<table>")
    printWindow.document.write("<thead><tr>")
    printWindow.document.write("<th>Date</th>")
    printWindow.document.write("<th>GRN No.</th>")
    printWindow.document.write("<th>Product Name</th>")
    printWindow.document.write("<th>Category</th>")
    printWindow.document.write("<th>Serial No.</th>")
    printWindow.document.write("<th>Vendor</th>")
    printWindow.document.write("<th>Purchase Type</th>")
    printWindow.document.write("<th>Vendor Bill No.</th>")
    printWindow.document.write('<th class="text-right">Qty</th>')
    printWindow.document.write('<th class="text-right">Purchase Rate</th>')
    printWindow.document.write('<th class="text-right">Sale Rate</th>')
    printWindow.document.write('<th class="text-right">Stock Value</th>')
    printWindow.document.write('<th class="text-right">Profit</th>')
    printWindow.document.write("</tr></thead><tbody>")

    filteredEntries.forEach((entry) => {
      printWindow.document.write("<tr>")
      printWindow.document.write(`<td>${entry.date}</td>`)
      printWindow.document.write(`<td>${entry.grn || "-"}</td>`)
      printWindow.document.write(`<td>${entry.itemName}</td>`)
      printWindow.document.write(`<td>${entry.category}</td>`)
      printWindow.document.write(`<td>${entry.serialNumber || "-"}</td>`)
      printWindow.document.write(`<td>${entry.vendorName || "-"}</td>`)
      printWindow.document.write(`<td>${entry.purchaseType || "-"}</td>`)
      printWindow.document.write(`<td>${entry.vendorBillNumber || "-"}</td>`)
      printWindow.document.write(`<td class="text-right">${entry.purchaseQuantity}</td>`)
      printWindow.document.write(`<td class="text-right">${formatCurrency(entry.purchaseRate)}</td>`)
      printWindow.document.write(`<td class="text-right">${formatCurrency(entry.saleRate)}</td>`)
      printWindow.document.write(`<td class="text-right">${formatCurrency(entry.balanceStockValue)}</td>`)
      printWindow.document.write(
        `<td class="text-right ${entry.profit >= 0 ? "profit-positive" : "profit-negative"}">${formatCurrency(entry.profit)}</td>`,
      )
      printWindow.document.write("</tr>")
    })

    printWindow.document.write('<tr class="totals">')
    printWindow.document.write('<td colspan="11" class="text-right">Totals:</td>')
    printWindow.document.write(`<td class="text-right">${formatCurrency(subtotals.balanceStockValue)}</td>`)
    printWindow.document.write(
      `<td class="text-right ${subtotals.totalProfit >= 0 ? "profit-positive" : "profit-negative"}">${formatCurrency(subtotals.totalProfit)}</td>`,
    )
    printWindow.document.write("</tr>")
    printWindow.document.write("</tbody></table>")
    printWindow.document.write('<div class="footer">Created by Soft-Technix</div>')
    printWindow.document.write("</body></html>")
    printWindow.document.close()
    printWindow.print()
  }

  const handleExport = () => {
    const csvContent = [
      [
        "Date",
        "GRN No.",
        "Item Name",
        "Category",
        "Serial Number",
        "Vendor",
        "Purchase Type",
        "Vendor Bill No.",
        "Purchase Qty",
        "Purchase Rate",
        "Purchase Value",
        "Sale Rate",
        "Sale Value",
        "Stock Value",
        "Profit",
      ],
      ...filteredEntries.map((entry) => [
        entry.date,
        entry.grn || "-",
        entry.itemName,
        entry.category,
        entry.serialNumber || "-",
        entry.vendorName || "-",
        entry.purchaseType || "-",
        entry.vendorBillNumber || "-",
        entry.purchaseQuantity,
        entry.purchaseRate,
        entry.purchaseStockValue,
        entry.saleRate,
        entry.saleStockValue,
        entry.balanceStockValue,
        entry.profit,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stock-ledger-${formatDateToDDMMYYYY(new Date())}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredEntries = stockEntries.filter((entry) => {
    const matchesSearch = entry.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "" || entry.category === categoryFilter

    let matchesDate = true
    if (dateFilter) {
      const filterDate = formatDateToDDMMYYYY(new Date(dateFilter))
      matchesDate = entry.date === filterDate
    }

    return matchesSearch && matchesCategory && matchesDate
  })

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage)

  const subtotals = filteredEntries.reduce(
    (acc, entry) => ({
      purchaseStockValue: acc.purchaseStockValue + entry.purchaseStockValue,
      saleStockValue: acc.saleStockValue + entry.saleStockValue,
      balanceStockValue: acc.balanceStockValue + entry.balanceStockValue,
      totalProfit: acc.totalProfit + (entry.profit || 0),
    }),
    { purchaseStockValue: 0, saleStockValue: 0, balanceStockValue: 0, totalProfit: 0 },
  )

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
    }).format(value)
  }

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Stock Management...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Goods Receipt Note (GRN)
          </h2>
          <p className="text-sm text-gray-600">Manage product inventory and stock levels</p>
        </div>
        <div className="flex gap-2 flex-wrap mt-4 md:mt-0">
          <button
            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
            onClick={handlePrint}
            disabled={filteredEntries.length === 0}
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
            onClick={handleExport}
            disabled={filteredEntries.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            onClick={fetchStockEntries}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
            disabled={loading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Record New Purchases
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Purchase Value</p>
              <p className="text-xl font-bold text-blue-900">{formatCurrency(subtotals.purchaseStockValue)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Total Sale Value</p>
              <p className="text-xl font-bold text-green-900">{formatCurrency(subtotals.saleStockValue)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Stock Value</p>
              <p className="text-xl font-bold text-purple-900">{formatCurrency(subtotals.balanceStockValue)}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Total Products</p>
              <p className="text-xl font-bold text-orange-900">{filteredEntries.length}</p>
            </div>
            <Filter className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            className="w-full pl-10 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select
          className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {productCategories.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          type="date"
          className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />
        <select
          className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          value={itemsPerPage}
          onChange={(e) => {
            setItemsPerPage(Number(e.target.value))
            setCurrentPage(1)
          }}
        >
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
        <div className="flex items-center text-sm text-gray-600">
          <Filter className="h-4 w-4 mr-1" />
          {filteredEntries.length} of {stockEntries.length}
        </div>
      </div>

      {/* Stock Management Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                GRN No.
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Category
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Serial Number
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Vendor Bill No.
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Quantity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Purchase Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance Quantity
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance Stock Value
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Expected Sale Rate
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Balance Amount
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Potential Profit
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedEntries.length > 0 ? (
              paginatedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.grn || "-"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.itemName}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.category}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.serialNumber || "-"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.vendorName || "-"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.purchaseType || "-"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.vendorBillNumber || "-"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {entry.purchaseQuantity}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(entry.purchaseRate)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {entry.balanceQuantity}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(entry.balanceStockValue)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {formatCurrency(entry.saleRate)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">
                    {formatCurrency(entry.balanceAmount)}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <span className={entry.profit >= 0 ? "text-green-600" : "text-red-600"}>
                      {formatCurrency(entry.profit)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleViewDetails(entry)}
                        className="text-blue-600 hover:text-blue-900 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(entry)}
                        className="text-indigo-600 hover:text-indigo-900 transition-colors"
                        title="Edit product"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                        title="Delete product"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="16" className="px-4 py-8 text-center text-sm text-gray-500">
                  No products found. Add some products to get started.
                </td>
              </tr>
            )}
          </tbody>
          {filteredEntries.length > 0 && (
            <tfoot className="bg-gray-100">
              <tr>
                <td colSpan="10" className="px-4 py-4 text-sm font-medium text-gray-900 text-right">
                  Totals:
                </td>
                <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">
                  {filteredEntries.reduce((sum, e) => sum + e.balanceQuantity, 0)}
                </td>
                <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(subtotals.balanceStockValue)}
                </td>
                <td className="px-4 py-4"></td>
                <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">
                  {formatCurrency(filteredEntries.reduce((sum, e) => sum + e.balanceAmount, 0))}
                </td>
                <td className="px-4 py-4 text-sm font-bold text-right">
                  <span className={subtotals.totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                    {formatCurrency(subtotals.totalProfit)}
                  </span>
                </td>
                <td className="px-4 py-4"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEntries.length)} of{" "}
            {filteredEntries.length} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Previous
            </button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + Math.max(1, currentPage - 2)
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border rounded ${currentPage === page ? "bg-blue-500 text-white" : "bg-white"}`}
                >
                  {page}
                </button>
              )
            })}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
        Created by <span className="font-semibold text-blue-600">Soft-Technix</span>
      </div>

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{isEditing ? "Edit Product" : "ADD New Purchases"}</h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Product Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Product Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Item / Model Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter product name"
                        list="products-list"
                      />
                      <datalist id="products-list">
                        {products.map((product) => (
                          <option key={product._id} value={product.name} />
                        ))}
                      </datalist>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        required
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select category</option>
                        <option value="Electronics">Electronics</option>
                        <option value="Furniture">Furniture</option>
                        <option value="Stationery">Stationery</option>
                        <option value="Kitchenware">Kitchenware</option>
                        <option value="Clothing">Clothing</option>
                        <option value="Food">Food</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                      <input
                        type="text"
                        name="serialNumber"
                        value={formData.serialNumber}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter serial number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        name="expiryDate"
                        value={formData.expiryDate}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Quantity and Pricing */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Quantity & Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Quantity <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="quantity"
                        value={formData.quantity}
                        onChange={handleChange}
                        required
                        min="0"
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter quantity"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Purchase Rate <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="purchaseRate"
                        value={formData.purchaseRate}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter purchase rate"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sale Rate <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        name="saleRate"
                        value={formData.saleRate}
                        onChange={handleChange}
                        required
                        min="0"
                        step="0.01"
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter sale rate"
                      />
                    </div>
                  </div>
                </div>

                {/* Vendor Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Vendor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vendor Name <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="vendorName"
                        value={formData.vendorName}
                        onChange={handleChange}
                        required
                        disabled={loadingVendors || vendors.length === 0}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      >
                        <option value="">
                          {loadingVendors
                            ? "Loading vendors..."
                            : vendors.length === 0
                              ? "No vendors available"
                              : "Select vendor"}
                        </option>
                        {vendors.map((vendor) => (
                          <option key={vendor._id} value={vendor.name}>
                            {vendor.name} ({vendor.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Purchases Type <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="purchasesType"
                        value={formData.purchasesType}
                        onChange={handleChange}
                        required
                        disabled={loadingPurchases || purchasesAccounts.length === 0}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                      >
                        <option value="">
                          {loadingPurchases
                            ? "Loading purchases..."
                            : purchasesAccounts.length === 0
                              ? "No purchases accounts available"
                              : "Select purchases type"}
                        </option>
                        {purchasesAccounts.map((account) => (
                          <option key={account._id} value={account.name}>
                            {account.name} ({account.code})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">
                        Select the purchase account from your chart of accounts
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Phone</label>
                      <input
                        type="tel"
                        name="vendorPhone"
                        value={formData.vendorPhone}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter vendor phone"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Bill Number</label>
                      <input
                        type="text"
                        name="vendorBillNumber"
                        value={formData.vendorBillNumber}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter vendor bill number"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">GRN Number</label>
                      <input
                        type="text"
                        name="grn"
                        value={formData.grn}
                        onChange={handleChange}
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-100"
                        placeholder="Auto-generated"
                        readOnly
                      />
                      <p className="text-xs text-gray-500 mt-1">GRN will be auto-generated when product is created</p>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleChange}
                        rows="3"
                        className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter any additional notes"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {formData.quantity && formData.purchaseRate && formData.saleRate && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Purchase Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <span className="text-xs font-medium text-gray-600">Purchase Quantity</span>
                      <div className="text-lg font-bold text-blue-900">{Number(formData.quantity) || 0}</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <span className="text-xs font-medium text-gray-600">Balance Quantity</span>
                      <div className="text-lg font-bold text-blue-900">{Number(formData.quantity) || 0}</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <span className="text-xs font-medium text-gray-600">Balance Stock Value</span>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency((Number(formData.quantity) || 0) * (Number(formData.purchaseRate) || 0))}
                      </div>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <span className="text-xs font-medium text-gray-600">Balance Amount</span>
                      <div className="text-lg font-bold text-green-600">
                        {formatCurrency((Number(formData.quantity) || 0) * (Number(formData.purchaseRate) || 0))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  disabled={loading || loadingVendors || loadingPurchases}
                >
                  <Save className="h-4 w-4" />
                  {isEditing ? "Update" : "Add"} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDetails && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-screen overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Product Details</h2>
              <button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Purchase Summary - Prominent Display */}
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-4">Purchase Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Quantity</label>
                    <p className="text-2xl font-bold text-blue-600">{selectedEntry.purchaseQuantity} units</p>
                    <p className="text-xs text-gray-500 mt-1">Quantity purchased by the user</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Balance Quantity</label>
                    <p className="text-2xl font-bold text-green-600">{selectedEntry.balanceQuantity} units</p>
                    <p className="text-xs text-gray-500 mt-1">Remaining stock quantity</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Balance Stock Value</label>
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(selectedEntry.balanceStockValue)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Value based on remaining stock quantity</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Balance Amount</label>
                    <p className="text-2xl font-bold text-orange-600">{formatCurrency(selectedEntry.balanceAmount)}</p>
                    <p className="text-xs text-gray-500 mt-1">Cost amount of purchased items</p>
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Product Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Product Name</label>
                    <p className="text-sm text-gray-900">{selectedEntry.itemName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p className="text-sm text-gray-900">{selectedEntry.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Serial Number</label>
                    <p className="text-sm text-gray-900">{selectedEntry.serialNumber || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                    <p className="text-sm text-gray-900">
                      {selectedEntry.expiryDate ? formatDateToDDMMYYYY(selectedEntry.expiryDate) : "N/A"}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">GRN Number</label>
                    <p className="text-sm text-gray-900">{selectedEntry.grn || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Date Added</label>
                    <p className="text-sm text-gray-900">{selectedEntry.date}</p>
                  </div>
                </div>
              </div>

              {/* Stock & Pricing */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Pricing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purchase Rate</label>
                    <p className="text-sm text-gray-900 font-medium">{formatCurrency(selectedEntry.purchaseRate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sale Rate</label>
                    <p className="text-sm text-gray-900 font-medium">{formatCurrency(selectedEntry.saleRate)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Potential Profit</label>
                    <p
                      className={`text-sm font-medium ${selectedEntry.profit >= 0 ? "text-green-600" : "text-red-600"}`}
                    >
                      {formatCurrency(selectedEntry.profit)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vendor Information */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Vendor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vendor Name</label>
                    <p className="text-sm text-gray-900">{selectedEntry.vendorName || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vendor Phone</label>
                    <p className="text-sm text-gray-900">{selectedEntry.vendorPhone || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Vendor Bill Number</label>
                    <p className="text-sm text-gray-900">{selectedEntry.vendorBillNumber || "N/A"}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Purchase Type</label>
                    <p className="text-sm text-gray-900">{selectedEntry.purchaseType || "N/A"}</p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-900">{selectedEntry.notes || "N/A"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDetails(false)
                  handleEdit(selectedEntry)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
export default StockManagement
