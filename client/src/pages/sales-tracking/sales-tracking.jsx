"use client"

import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts"
import {
  Plus,
  Search,
  Edit,
  Trash2,
  X,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Package,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  BarChart3,
  PieChartIcon,
  ShoppingCart,
  Warehouse,
  Printer,
  FileText,
} from "lucide-react"
import ApiHandler from "@/Api/apihandle"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"]

function getCurrentDate() {
  return new Date().toISOString().split("T")[0]
}

function getFirstDayOfMonth() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0]
}

const SalesTracking = ({ onSaleComplete, onNotification }) => {
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [salesStats, setSalesStats] = useState(null)
  const [formData, setFormData] = useState({
    id: null,
    date: getCurrentDate(),
    productId: "",
    quantity: "",
    salePrice: "",
    customerName: "",
    customerPhone: "",
    saleType: "",
    saleAccount: "",
    notes: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())
  const [productFilter, setProductFilter] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [sortBy, setSortBy] = useState("date")
  const [sortOrder, setSortOrder] = useState("desc")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedSale, setSelectedSale] = useState(null)
  const [showSaleDetails, setShowSaleDetails] = useState(false)
  const [chartType, setChartType] = useState("bar")
  const [customer, setCustomer] = useState([])
  const [maxQuantity, setMaxQuantity] = useState(1)
  const [loadingCustomer, setLoadingCustomer] = useState(false)
  const [saleTypes, setSaleTypes] = useState([])
  const [loadingSaleTypes, setLoadingSaleTypes] = useState(false)

  const fetchProducts = async () => {
    try {
      const response = await ApiHandler.getProducts()
      const productsData = response.success ? response.data : response
      setProducts(Array.isArray(productsData) ? productsData : [])
      return productsData
    } catch (error) {
      console.error("Error fetching products:", error)
      setError(`Failed to fetch products: ${error.message}`)
      setProducts([])
      return []
    }
  }

  const fetchSales = async () => {
    try {
      setError(null)
      const filters = {}
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      if (productFilter) filters.productId = productFilter

      const [salesResponse, statsResponse] = await Promise.all([
        ApiHandler.getSales(filters),
        ApiHandler.getSalesStats(filters)
      ])

      const salesData = salesResponse.success ? salesResponse.data : salesResponse
      const statsData = statsResponse.success ? statsResponse.data : statsResponse

      setSales(Array.isArray(salesData) ? salesData : [])
      setSalesStats(statsData || {
        totalSales: 0,
        totalRevenue: 0,
        totalProfit: 0,
        profitMargin: 0,
        averageSaleValue: 0,
      })
    } catch (error) {
      console.error("Error fetching sales:", error)
      setError(`Failed to fetch sales: ${error.message}`)
      setSales([])
      setSalesStats({
        totalSales: 0,
        totalRevenue: 0,
        totalProfit: 0,
        profitMargin: 0,
        averageSaleValue: 0,
      })
    }
  }

  const loadCustomer = async () => {
    try {
      setLoadingCustomer(true)
      const response = await ApiHandler.getAssets()
      const assets = response.data || []
      const receivables = assets.filter((asset) => asset.type === "RECEIVABLES")
      console.log("✅ Customers loaded:", receivables)
      setCustomer(receivables)
    } catch (err) {
      console.error("❌ Error loading customers:", err)
      setCustomer([])
    } finally {
      setLoadingCustomer(false)
    }
  }

  const loadSaleTypes = async () => {
    try {
      setLoadingSaleTypes(true)
      const response = await ApiHandler.getRevenue()
      const revenues = response.data || []
      const saleAccounts = revenues.filter((rev) => rev.type === "SALE ACCOUNT")
      console.log("✅ Sale types loaded:", saleAccounts)
      setSaleTypes(saleAccounts)
    } catch (err) {
      console.error("❌ Error loading sale types:", err)
      setSaleTypes([])
    } finally {
      setLoadingSaleTypes(false)
    }
  }

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchProducts(), fetchSales(), loadCustomer(), loadSaleTypes()])
      setIsLoading(false)
    }
    loadData()
  }, [startDate, endDate, productFilter])

  const handleChange = (e) => {
    const { name, value } = e.target
    console.log(`🔄 Change: ${name} = "${value}"`)

    // Customer Phone formatting
    if (name === "customerPhone") {
      let processedValue = value
      if (value && !value.startsWith("+")) {
        const cleanNumber = value.replace(/[^\d]/g, "")
        if (cleanNumber.startsWith("03") || cleanNumber.startsWith("3")) {
          const withoutLeadingZero = cleanNumber.startsWith("03") ? cleanNumber.substring(1) : cleanNumber
          processedValue = `+92${withoutLeadingZero}`
        }
      }
      setFormData(prev => {
        const updated = { ...prev, customerPhone: processedValue }
        console.log("📞 Phone updated:", updated.customerPhone)
        return updated
      })
      return
    }

    // Product selection
    if (name === "productId") {
      const product = products.find((p) => (p._id || p.id) === value)
      if (product) {
        console.log("📦 Product selected:", product.name)
        setFormData(prev => ({
          ...prev,
          productId: value,
          salePrice: product.saleRate || product.price || 0,
        }))
        setMaxQuantity(product.balanceQuantity || product.quantity || 0)
      } else {
        setFormData(prev => ({ ...prev, productId: value }))
        setMaxQuantity(1)
      }
      return
    }

    // Sale Type selection - IMPORTANT: Store both ID and name
    if (name === "saleType") {
      const selectedType = saleTypes.find((type) => (type._id || type.id) === value)
      if (selectedType) {
        console.log("💰 Sale Type selected:", selectedType.name || selectedType.accountName)
        setFormData(prev => ({
          ...prev,
          saleAccount: value, // ID for backend
          saleType: selectedType.name || selectedType.accountName, // Name for display
        }))
      } else {
        setFormData(prev => ({
          ...prev,
          saleAccount: "",
          saleType: "",
        }))
      }
      return
    }

    // Customer Name selection
    if (name === "customerName") {
      console.log("👤 Customer selected:", value)
      setFormData(prev => ({
        ...prev,
        customerName: value,
      }))
      return
    }

    // Quantity and Price as numbers
    if (name === "quantity" || name === "salePrice") {
      setFormData(prev => ({ ...prev, [name]: Number(value) || "" }))
      return
    }

    // Default handler
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const product = products.find((p) => (p._id || p.id) === formData.productId)
      if (!product) throw new Error("Please select a valid product")

      const availableStock = product.balanceQuantity || product.quantity || 0
      if (availableStock < formData.quantity) {
        throw new Error(`Only ${availableStock} units available!`)
      }

      // Prepare sale data with BOTH legacy and new field names
      const saleData = {
        product: formData.productId,
        itemName: product.name,
        date: formData.date,
        saleQuantity: Number(formData.quantity),
        saleRate: Number(formData.salePrice),
        quantity: Number(formData.quantity), // Legacy
        salePrice: Number(formData.salePrice), // Legacy
        customerName: formData.customerName || "",
        customerPhone: formData.customerPhone || "",
        saleType: formData.saleType || "", // Display name
        saleAccount: formData.saleAccount || null, // ID
        notes: formData.notes || "",
      }

      console.log("📤 Submitting sale data:", saleData)

      let result
      if (isEditing) {
        result = await ApiHandler.updateSale(formData.id, saleData)
        await fetchSales()
      } else {
        result = await ApiHandler.createSale(saleData)
        if (result.data && onNotification) {
          onNotification({
            id: Date.now(),
            type: "sale",
            title: "Sale Recorded",
            message: result.message || `Sale Invoice ${result.data.invoice || 'N/A'}`,
            date: new Date().toISOString(),
          })
        }
        await fetchSales()
      }

      await fetchProducts()
      resetForm()
      console.log("✅ Sale recorded successfully!")
    } catch (error) {
      console.error("❌ Error submitting sale:", error)
      setError(error.message || "Failed to record sale")
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      id: null,
      date: getCurrentDate(),
      productId: "",
      quantity: "",
      salePrice: "",
      customerName: "",
      customerPhone: "",
      saleType: "",
      saleAccount: "",
      notes: "",
    })
    setIsEditing(false)
    setShowForm(false)
    setError(null)
    setMaxQuantity(1)
  }

  const handleEdit = (sale) => {
    console.log("📝 Editing sale:", sale)
    setFormData({
      id: sale._id || sale.id,
      date: sale.date ? new Date(sale.date).toISOString().split('T')[0] : getCurrentDate(),
      productId: sale.product?._id || sale.product?.id || sale.productId || "",
      quantity: sale.saleQuantity || sale.quantity || "",
      salePrice: sale.saleRate || sale.salePrice || "",
      customerName: sale.customerName || "",
      customerPhone: sale.customerPhone || "",
      saleType: sale.saleType || "",
      saleAccount: sale.saleAccount?._id || sale.saleAccount || "",
      notes: sale.notes || "",
    })
    
    const product = products.find((p) => 
      (p._id || p.id) === (sale.product?._id || sale.product?.id || sale.productId)
    )
    if (product) {
      setMaxQuantity((product.balanceQuantity || product.quantity || 0) + (sale.saleQuantity || sale.quantity || 0))
    }
    
    setIsEditing(true)
    setShowForm(true)
    setError(null)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Delete this sale?")) {
      try {
        await ApiHandler.deleteSale(id)
        await Promise.all([fetchSales(), fetchProducts()])
      } catch (error) {
        console.error("Error deleting:", error)
        setError(error.message)
      }
    }
  }

  const handleRefresh = async () => {
    setIsLoading(true)
    await Promise.all([fetchProducts(), fetchSales()])
    setIsLoading(false)
  }

  const handleExport = () => {
    const csvContent = [
      ["Invoice", "Date", "Product", "Customer", "Qty", "Rate", "Total", "Profit"],
      ...filteredSales.map((sale) => [
        sale.invoice || "N/A",
        sale.date,
        sale.product?.name || "Unknown",
        sale.customerName || "",
        sale.saleQuantity || sale.quantity,
        sale.saleRate || sale.salePrice,
        sale.totalAmount,
        sale.profit || 0,
      ]),
    ].map(row => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sales-${getCurrentDate()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    const printWindow = window.open("", "_blank")
    if (!printWindow) return
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Report</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Sales Report</h1>
        <p>Period: ${startDate} to ${endDate}</p>
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Date</th>
              <th>Product</th>
              <th>Customer</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Total</th>
              <th>Profit</th>
            </tr>
          </thead>
          <tbody>
            ${filteredSales.map(sale => `
              <tr>
                <td>${sale.invoice || 'N/A'}</td>
                <td>${new Date(sale.date).toLocaleDateString()}</td>
                <td>${sale.product?.name || 'Unknown'}</td>
                <td>${sale.customerName || ''}</td>
                <td>${sale.saleQuantity || sale.quantity}</td>
                <td>PKR ${sale.saleRate || sale.salePrice}</td>
                <td>PKR ${sale.totalAmount}</td>
                <td>PKR ${sale.profit || 0}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.print()
  }

  const filteredSales = (Array.isArray(sales) ? sales : []).filter((sale) => {
    const matchesSearch = !searchTerm || 
      (sale.invoice || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.product?.name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerName || "").toLowerCase().includes(searchTerm.toLowerCase())
    return matchesSearch
  })

  const sortedSales = [...filteredSales].sort((a, b) => {
    let aVal = a[sortBy]
    let bVal = b[sortBy]
    if (sortBy === "date") {
      aVal = new Date(aVal)
      bVal = new Date(bVal)
    }
    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1)
  })

  const totalPages = Math.ceil(sortedSales.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSales = sortedSales.slice(startIndex, startIndex + itemsPerPage)

  const totalSales = filteredSales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)
  const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0)

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
    }).format(value || 0)
  }

  const availableProducts = products.filter((p) => (p.balanceQuantity || p.quantity || 0) > 0)

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-2xl font-bold mb-4 md:mb-0 flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Sales Tracking
        </h2>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowFilters(!showFilters)} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button onClick={handleExport} disabled={filteredSales.length === 0} className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50">
            <Download className="h-4 w-4" />
            Export
          </button>
          <button onClick={handlePrint} disabled={filteredSales.length === 0} className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50">
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button onClick={handleRefresh} disabled={isLoading} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setShowForm(true)} disabled={availableProducts.length === 0} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50">
            <Plus className="h-4 w-4" />
            New Sale
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {isLoading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      )}

      {!isLoading && (
        <>
          {showFilters && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Product</label>
                  <select value={productFilter} onChange={(e) => setProductFilter(e.target.value)} className="w-full p-2 border rounded-md">
                    <option value="">All Products</option>
                    {products.map((p) => (
                      <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Search</label>
                  <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full p-2 border rounded-md" />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Total Sales</p>
                  <p className="text-2xl font-bold text-blue-900">{formatCurrency(totalSales)}</p>
                </div>
                <DollarSign className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Profit</p>
                  <p className="text-2xl font-bold text-green-900">{formatCurrency(totalProfit)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Orders</p>
                  <p className="text-2xl font-bold text-purple-900">{filteredSales.length}</p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </div>
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Avg Sale</p>
                  <p className="text-2xl font-bold text-orange-900">
                    {formatCurrency(filteredSales.length > 0 ? totalSales / filteredSales.length : 0)}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Type</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Profit</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedSales.length > 0 ? (
                  paginatedSales.map((sale) => (
                    <tr key={sale._id || sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4 text-sm font-mono font-semibold">{sale.invoice || "N/A"}</td>
                      <td className="px-4 py-4 text-sm">{new Date(sale.date).toLocaleDateString()}</td>
                      <td className="px-4 py-4 text-sm">{sale.product?.name || "Unknown"}</td>
                      <td className="px-4 py-4 text-sm">{sale.customerName || "—"}</td>
                      <td className="px-4 py-4 text-sm">{sale.saleType || "—"}</td>
                      <td className="px-4 py-4 text-sm text-right">{sale.saleQuantity || sale.quantity}</td>
                      <td className="px-4 py-4 text-sm text-right">{formatCurrency(sale.saleRate || sale.salePrice)}</td>
                      <td className="px-4 py-4 text-sm text-right font-semibold">{formatCurrency(sale.totalAmount)}</td>
                      <td className="px-4 py-4 text-sm text-right">
                        <span className={sale.profit >= 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(sale.profit || 0)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => { setSelectedSale(sale); setShowSaleDetails(true); }} className="text-blue-600 hover:text-blue-900">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleEdit(sale)} className="text-indigo-600 hover:text-indigo-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(sale._id || sale.id)} className="text-red-600 hover:text-red-900">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="9" className="px-6 py-8 text-center text-gray-500">No sales found</td>
                  </tr>
                )}
              </tbody>
              {paginatedSales.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="6" className="px-4 py-4 text-sm font-medium text-right">Totals:</td>
                    <td className="px-4 py-4 text-sm font-bold text-right">{formatCurrency(totalSales)}</td>
                    <td className="px-4 py-4 text-sm font-bold text-right">
                      <span className={totalProfit >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(totalProfit)}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedSales.length)} of {sortedSales.length}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum = i + 1
                  if (totalPages > 5) {
                    if (currentPage <= 3) pageNum = i + 1
                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i
                    else pageNum = currentPage - 2 + i
                  }
                  return (
                    <button key={pageNum} onClick={() => setCurrentPage(pageNum)} className={`px-3 py-1 border rounded ${currentPage === pageNum ? 'bg-blue-500 text-white' : ''}`}>
                      {pageNum}
                    </button>
                  )
                })}
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{isEditing ? "Edit Sale" : "Record New Sale"}</h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Date *</label>
                  <input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded-md" required disabled={isSubmitting} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Product *</label>
                  <select name="productId" value={formData.productId} onChange={handleChange} className="w-full p-2 border rounded-md" required disabled={isSubmitting}>
                    <option value="">Select Product</option>
                    {availableProducts.map((product) => (
                      <option key={product._id || product.id} value={product._id || product.id}>
                        {product.name} - Stock: {product.balanceQuantity || product.quantity || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quantity * {maxQuantity > 0 && `(Max: ${maxQuantity})`}
                  </label>
                  <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} className="w-full p-2 border rounded-md" min="1" max={maxQuantity} required disabled={isSubmitting} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Sale Price (PKR) *</label>
                  <input type="number" name="salePrice" value={formData.salePrice} onChange={handleChange} className="w-full p-2 border rounded-md" min="0" step="0.01" required disabled={isSubmitting} />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Customer Name
                    {loadingCustomer && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}
                  </label>
                  <select name="customerName" value={formData.customerName} onChange={handleChange} className="w-full p-2 border rounded-md" disabled={isSubmitting || loadingCustomer}>
                    <option value="">Select Customer </option>
                    {customer.map((cust) => (
                      <option key={cust._id || cust.id} value={cust.name || cust.accountName}>
                        {cust.name || cust.accountName}
                      </option>
                    ))}
                  </select>
                  {!loadingCustomer && customer.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No customers available</p>
                  )}
                  {formData.customerName && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ Selected: {formData.customerName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Customer Phone</label>
                  <input type="tel" name="customerPhone" value={formData.customerPhone} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="+92-XXX-XXXXXXX" disabled={isSubmitting} />
                  <p className="text-xs text-gray-500 mt-1">Format: +92-XXX-XXXXXXX or 03XXXXXXXXX</p>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Sale Type / Account
                    {loadingSaleTypes && <span className="text-xs text-gray-500 ml-2">(Loading...)</span>}
                  </label>
                  <select name="saleType" value={formData.saleAccount || ""} onChange={handleChange} className="w-full p-2 border rounded-md" disabled={isSubmitting || loadingSaleTypes}>
                    <option value="">Select Sale Type </option>
                    {saleTypes.map((type) => (
                      <option key={type._id || type.id} value={type._id || type.id}>
                        {type.name || type.accountName}
                      </option>
                    ))}
                  </select>
                  {!loadingSaleTypes && saleTypes.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">⚠️ No sale types found. Add in Revenue section.</p>
                  )}
                  {formData.saleType && (
                    <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                      ✓ Selected: {formData.saleType}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1">Notes</label>
                  <textarea name="notes" value={formData.notes} onChange={handleChange} className="w-full p-2 border rounded-md" rows="3" disabled={isSubmitting} />
                </div>

                {formData.quantity && formData.salePrice && (
                  <div className="md:col-span-2 p-4 bg-blue-50 rounded-md">
                    <h4 className="font-medium mb-2">Sale Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Quantity:</span>
                        <span className="ml-2 font-medium">{formData.quantity}</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Unit Price:</span>
                        <span className="ml-2 font-medium">{formatCurrency(formData.salePrice)}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="ml-2 font-bold text-lg">
                          {formatCurrency(formData.quantity * formData.salePrice)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-md hover:bg-gray-50" disabled={isSubmitting}>
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2" disabled={isSubmitting}>
                  {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {isEditing ? "Update" : "Record"} Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSaleDetails && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sale Details</h2>
              <button onClick={() => setShowSaleDetails(false)} className="text-gray-500 hover:text-gray-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              {selectedSale.invoice && (
                <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                  <label className="block text-sm font-medium text-blue-700">Invoice Number</label>
                  <p className="text-lg font-bold text-blue-900 font-mono">{selectedSale.invoice}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="text-sm">{new Date(selectedSale.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <p className="text-sm">{selectedSale.product?.name || "Unknown"}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Quantity</label>
                  <p className="text-sm font-medium">{selectedSale.saleQuantity || selectedSale.quantity}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Rate</label>
                  <p className="text-sm">{formatCurrency(selectedSale.saleRate || selectedSale.salePrice)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="text-sm font-semibold">{formatCurrency(selectedSale.totalAmount)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Profit</label>
                  <p className={`text-sm font-semibold ${selectedSale.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(selectedSale.profit || 0)}
                  </p>
                </div>
              </div>

              {selectedSale.customerName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer</label>
                  <p className="text-sm">{selectedSale.customerName}</p>
                </div>
              )}

              {selectedSale.customerPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Phone</label>
                  <p className="text-sm">{selectedSale.customerPhone}</p>
                </div>
              )}

              {selectedSale.saleType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sale Type</label>
                  <p className="text-sm">{selectedSale.saleType}</p>
                </div>
              )}

              {selectedSale.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm">{selectedSale.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => { setShowSaleDetails(false); handleEdit(selectedSale); }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2">
                <Edit className="h-4 w-4" />
                Edit
              </button>
              <button onClick={() => setShowSaleDetails(false)} className="px-4 py-2 border rounded-md hover:bg-gray-50">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SalesTracking