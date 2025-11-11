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
} from "lucide-react"
import ApiHandler from "@/Api/apihandle"

// Colors for charts
const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"]

// Helper functions for dates
function getCurrentDate() {
  return new Date().toISOString().split("T")[0]
}

function getFirstDayOfMonth() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0]
}

const SalesTracking = ({ onSaleComplete, onNotification }) => {
  // State for products, sales, and stock management
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [stockEntries, setStockEntries] = useState([])
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

  // Fetch products from API
  const fetchProducts = async () => {
    try {
      const response = await ApiHandler.getProducts()

      // Handle backend response structure
      let productsData = []
      if (response && response.success && Array.isArray(response.data)) {
        productsData = response.data
      } else if (response && Array.isArray(response.data)) {
        productsData = response.data
      } else if (Array.isArray(response)) {
        productsData = response
      } else {
        console.warn("Unexpected products response format:", response)
        productsData = []
      }

      console.log("Fetched products:", productsData)
      setProducts(productsData)
      return productsData
    } catch (error) {
      console.error("Error fetching products:", error)
      setError(`Failed to fetch products: ${error.message}`)
      setProducts([])
      return []
    }
  }

  // Fetch stock management entries
  const fetchStockEntries = async () => {
    try {
      // Build filters for API call
      const filters = {}
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      if (productFilter) filters.itemName = productFilter

      const response = await ApiHandler.get("/stock-management", filters)

      let stockData = []
      if (response && response.success && Array.isArray(response.data)) {
        stockData = response.data
      } else if (response && Array.isArray(response.data)) {
        stockData = response.data
      } else if (Array.isArray(response)) {
        stockData = response
      } else {
        console.warn("Unexpected stock entries response format:", response)
        stockData = []
      }

      console.log("Fetched stock entries:", stockData)
      setStockEntries(stockData)
      return stockData
    } catch (error) {
      console.error("Error fetching stock entries:", error)
      // Don't set error for stock entries as it's supplementary data
      setStockEntries([])
      return []
    }
  }

  const loadCustomer = async () => {
    try {
      setLoadingCustomer(true)
      const response = await ApiHandler.getAssets()
      const liabilities = response.data || []
      const vendorList = liabilities.filter((liability) => liability.type === "RECEIVABLES")
      setCustomer(vendorList)
    } catch (err) {
      console.error("Error loading Customer:", err)
      setCustomer([])
    } finally {
      setLoadingCustomer(false)
    }
  }
  const loadSaleTypes = async () => {
    try {
      setLoadingSaleTypes(true)
      const response = await ApiHandler.getRevenue()
      const liabilities = response.data || []
      const vendorList = liabilities.filter((liability) => liability.type === "SALE ACCOUNT")
      setSaleTypes(vendorList)
    } catch (err) {
      console.error("Error loading Sale Types:", err)
      setSaleTypes([])
    } finally {
      setLoadingSaleTypes(false)
    }
  }

  useEffect(() => {
    loadCustomer()
    loadSaleTypes()
  }, [])
  // Fetch sales data from API
  const fetchSales = async () => {
    try {
      setError(null)

      // Build filters for API call
      const filters = {}
      if (startDate) filters.startDate = startDate
      if (endDate) filters.endDate = endDate
      if (productFilter) filters.productId = productFilter

      // Fetch sales and stats separately with error handling
      let salesData = []
      let statsData = {
        totalSales: 0,
        totalRevenue: 0,
        totalProfit: 0,
        profitMargin: 0,
        averageSaleValue: 0,
      }

      try {
        const salesResponse = await ApiHandler.getSales(filters)
        if (salesResponse && salesResponse.success && Array.isArray(salesResponse.data)) {
          salesData = salesResponse.data
        } else if (Array.isArray(salesResponse)) {
          salesData = salesResponse
        } else {
          console.warn("API returned unexpected sales data format:", salesResponse)
          salesData = []
        }
      } catch (salesError) {
        console.error("Error fetching sales:", salesError)
        salesData = []
      }

      try {
        const statsResponse = await ApiHandler.getSalesStats(filters)
        if (statsResponse && statsResponse.success) {
          statsData = statsResponse.data
        } else if (statsResponse) {
          statsData = statsResponse
        }
      } catch (statsError) {
        console.error("Error fetching sales stats:", statsError)
        // Keep default stats
      }

      setSales(salesData)
      setSalesStats(statsData)
    } catch (error) {
      console.error("Error in fetchSales:", error)
      setError(`Failed to fetch sales data: ${error.message}`)
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

  // Get stock entry for a specific product and date
  const getStockEntryForSale = (sale) => {
    const saleDate = new Date(sale.date).toISOString().split("T")[0]
    const productName = sale.product?.name || sale.productName || ""

    // Find the most recent stock entry for this product on or before the sale date
    const relevantEntries = stockEntries
      .filter((entry) => {
        const entryDate = new Date(entry.date).toISOString().split("T")[0]
        return entry.itemName === productName && entryDate <= saleDate
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    return relevantEntries[0] || null
  }

  // Initial data fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      await Promise.all([fetchProducts(), fetchSales(), fetchStockEntries()])
      setIsLoading(false)
    }
    loadData()
  }, [startDate, endDate, productFilter, sortBy, sortOrder])

  // Update parent component with current sales
  useEffect(() => {
    if (onSaleComplete && !isLoading) {
      onSaleComplete(sales)
    }
  }, [sales, onSaleComplete, isLoading])

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target

    let processedValue = value
    if (name === "customerPhone") {
      // Remove any existing formatting
      const cleanNumber = value.replace(/[^\d]/g, "")

      // If it's a Pakistani number starting with 03 or similar, add +92
      if (cleanNumber.length > 0 && !value.startsWith("+")) {
        if (cleanNumber.startsWith("03") || cleanNumber.startsWith("3")) {
          // Convert 03XXXXXXXXX to +923XXXXXXXXX
          const withoutLeadingZero = cleanNumber.startsWith("03") ? cleanNumber.substring(1) : cleanNumber
          processedValue = `+92${withoutLeadingZero}`
        } else if (cleanNumber.length >= 10 && cleanNumber.length <= 11) {
          // For other 10-11 digit numbers, assume Pakistani and add +92
          processedValue = `+92${cleanNumber}`
        } else {
          processedValue = value // Keep original if doesn't match expected patterns
        }
      } else {
        processedValue = value // Keep as is if already has + or is empty
      }
    }

    setFormData({
      ...formData,
      [name]: name === "quantity" || name === "salePrice" ? Number(value) || "" : processedValue,
    })

    // Auto-fill sale price and set max quantity if product is selected
    if (name === "productId") {
      const product = products.find((p) => (p._id || p.id) === value)
      if (product) {
        setFormData((prev) => ({
          ...prev,
          productId: value,
          salePrice: product.saleRate || product.price || 0,
        }))
        setMaxQuantity(product.quantity || 0)
      } else {
        setMaxQuantity(1)
      }
    }

    if (name === "saleType") {
      const selectedType = saleTypes.find((type) => (type._id || type.id) === value)
      if (selectedType) {
        setFormData((prev) => ({
          ...prev,
          saleAccount: value, // Store the ID
          saleType: selectedType.name || selectedType.accountName, // Store the name for display
        }))
      }
    }
  }

  // FIXED: Handle form submission with correct field names
  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const product = products.find((p) => (p._id || p.id) === formData.productId)

      if (!product) {
        throw new Error("Please select a valid product")
      }

      // Check stock availability
      const availableStock = product.quantity || 0
      if (availableStock <= 0) {
        throw new Error("Product is out of stock!")
      }

      if (availableStock < formData.quantity) {
        throw new Error(`Only ${availableStock} units available in stock!`)
      }

      const saleData = {
        product: formData.productId,
        itemName: product.name, // Required by model
        date: formData.date,
        saleQuantity: Number(formData.quantity), // Model expects saleQuantity
        saleRate: Number(formData.salePrice), // Model expects saleRate
        saleAccount: formData.saleAccount || "",
        saleType: formData.saleType || "",
        // Legacy fields for backward compatibility with controller
        quantity: Number(formData.quantity),
        salePrice: Number(formData.salePrice),
        customerName: formData.customerName || "",
        customerPhone: formData.customerPhone || "", // Ensure it's not undefined
        notes: formData.notes || "",
      }

      console.log("Submitting sale data:", saleData)

      let result
      if (isEditing) {
        // Update the sale via API
        result = await ApiHandler.updateSale(formData.id, saleData)
        const updatedSale = result.data
        setSales((prevSales) =>
          Array.isArray(prevSales)
            ? prevSales.map((sale) => ((sale._id || sale.id) === formData.id ? updatedSale : sale))
            : [updatedSale],
        )
      } else {
        // Create new sale via API
        result = await ApiHandler.createSale(saleData)
        const newSale = result.data
        setSales((prevSales) => (Array.isArray(prevSales) ? [...prevSales, newSale] : [newSale]))
      }

      // Refresh all data to get updated stock and entries
      try {
        await Promise.all([fetchProducts(), fetchStockEntries()])
      } catch (refreshError) {
        console.warn("Failed to refresh data:", refreshError)
      }

      // The backend automatically creates notifications, so we just need to notify the parent
      if (onNotification) {
        onNotification({
          id: Date.now(),
          type: "sale",
          title: "Sale Recorded",
          message: `Sale recorded: ${formData.quantity} ${product.name} for PKR ${(formData.salePrice * formData.quantity).toFixed(2)}`,
          date: new Date().toISOString(),
        })
      }

      // Reset form
      resetForm()
    } catch (error) {
      console.error("Error submitting sale:", error)
      setError(error.message || "Failed to record sale")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form
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

  // Edit sale
  const handleEdit = (sale) => {
    setFormData({
      id: sale._id || sale.id,
      date: sale.date,
      productId: sale.product?._id || sale.product?.id || sale.productId,
      quantity: sale.quantity,
      salePrice: sale.salePrice || sale.saleRate, // Handle both field names
      customerName: sale.customerName || "",
      customerPhone: sale.customerPhone || "",
      saleType: sale.saleType || "",
      saleAccount: sale.saleAccount || "",
      notes: sale.notes || "",
    })
    setIsEditing(true)
    setShowForm(true)
    setError(null)
  }

  // View sale details
  const handleViewDetails = (sale) => {
    setSelectedSale(sale)
    setShowSaleDetails(true)
  }

  // Delete sale
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this sale?")) {
      try {
        await ApiHandler.deleteSale(id)
        setSales((prevSales) =>
          Array.isArray(prevSales) ? prevSales.filter((sale) => (sale._id || sale.id) !== id) : [],
        )
        // Refresh data to get updated stock
        await Promise.all([fetchProducts(), fetchStockEntries()])
      } catch (error) {
        console.error("Error deleting sale:", error)
        setError(error.message)
      }
    }
  }

  // Refresh data
  const handleRefresh = async () => {
    setIsLoading(true)
    await Promise.all([fetchProducts(), fetchSales(), fetchStockEntries()])
    setIsLoading(false)
  }

  // Export data
  const handleExport = () => {
    const csvContent = [
      ["Date", "Product", "Customer", "Sale Qty", "Sale Rate", "Stock Qty", "Stock Rate", "Total", "Profit"],
      ...filteredSales.map((sale) => {
        const stockEntry = getStockEntryForSale(sale)
        return [
          sale.date,
          sale.product?.name || sale.productName || "Unknown",
          sale.customerName || "",
          sale.quantity,
          sale.salePrice || sale.saleRate,
          stockEntry?.quantity || stockEntry?.stockQuantity || sale.product?.stock || 0,
          stockEntry?.purchaseRate || stockEntry?.purchasePrice || sale.product?.purchasePrice || 0,
          sale.totalAmount || sale.quantity * (sale.salePrice || sale.saleRate),
          sale.profit || 0,
        ]
      }),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `sales-report-${getCurrentDate()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  // Print handler to open a formatted print window with all filtered data
  const handlePrint = () => {
    try {
      const escapeHtml = (str = "") =>
        String(str)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;")

      const getProductNameById = (id) => products.find((p) => (p._id || p.id) === id)?.name || ""

      const fmt = (v) =>
        new Intl.NumberFormat("en-PK", {
          style: "currency",
          currency: "PKR",
          minimumFractionDigits: 2,
        }).format(Number(v || 0))

      const productFilterName = productFilter ? getProductNameById(productFilter) || "Unknown" : "All Products"

      const rowsHtml = (Array.isArray(filteredSales) ? filteredSales : [])
        .map((sale) => {
          const dateStr = new Date(sale.date).toLocaleDateString()
          const productName = sale.product?.name || sale.productName || getProductNameById(sale.productId) || "Unknown"
          const customer = sale.customerName || ""
          const qty = sale.quantity || 0
          const unit = sale.salePrice || sale.saleRate || 0
          const total = sale.totalAmount || qty * unit
          const profit = sale.profit || 0
          return `<tr>
            <td>${dateStr}</td>
            <td>${escapeHtml(productName)}</td>
            <td>${escapeHtml(customer)}</td>
            <td class="num">${qty}</td>
            <td class="num">${fmt(unit)}</td>
            <td class="num">${fmt(total)}</td>
            <td class="num ${profit >= 0 ? "pos" : "neg"}">${fmt(profit)}</td>
          </tr>`
        })
        .join("")

      const marginPct = (totalSales || 0) > 0 ? (((totalProfit || 0) / (totalSales || 1)) * 100).toFixed(2) : "0.00"

      const styles = `
        :root {
          --text: #111827;
          --muted: #6b7280;
          --line: #e5e7eb;
          --accent: #2563eb;
          --bg: #ffffff;
          --pos: #059669;
          --neg: #dc2626;
        }
        * { box-sizing: border-box; }
        body {
          font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji";
          color: var(--text);
          background: var(--bg);
          margin: 24px;
        }
        header {
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid var(--line); padding-bottom: 12px; margin-bottom: 16px;
        }
        h1 { font-size: 20px; margin: 0; }
        .meta {
          display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-bottom: 16px;
          color: var(--muted); font-size: 12px;
        }
        .summary {
          display: grid; grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px; margin-bottom: 16px;
        }
        .card {
          border: 1px solid var(--line); border-radius: 8px; padding: 12px;
        }
        .card .label { color: var(--muted); font-size: 12px; }
        .card .value { font-weight: 700; font-size: 16px; margin-top: 4px; }
        table {
          width: 100%; border-collapse: collapse; margin-top: 8px;
          font-size: 12px;
        }
        thead th {
          text-align: left; border-bottom: 1px solid var(--line);
          padding: 8px; color: var(--muted); text-transform: uppercase; letter-spacing: .04em; font-size: 11px;
        }
        tbody td { padding: 8px; border-bottom: 1px solid var(--line); }
        tfoot td { padding: 8px; font-weight: 600; }
        .num { text-align: right; white-space: nowrap; }
        .pos { color: var(--pos); }
        .neg { color: var(--neg); }
        footer {
          border-top: 1px solid var(--line);
          margin-top: 20px; padding-top: 10px; text-align: center; font-size: 12px; color: var(--muted);
        }
        @page { margin: 16mm; }
      `

      const html = `
        <!doctype html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>Sales Report</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>${styles}</style>
          </head>
          <body>
            <header>
              <h1>Sales Report</h1>
              <div style="text-align:right; font-size:12px; color:#6b7280;">
                <div>Generated: ${new Date().toLocaleString()}</div>
              </div>
            </header>

            <section class="meta">
              <div><strong>Date Range:</strong> ${escapeHtml(startDate)} → ${escapeHtml(endDate)}</div>
              <div><strong>Product:</strong> ${escapeHtml(productFilterName)}</div>
              <div><strong>Search:</strong> ${searchTerm ? escapeHtml(searchTerm) : "—"}</div>
              <div><strong>Records:</strong> ${Array.isArray(filteredSales) ? filteredSales.length : 0}</div>
            </section>

            <section class="summary">
              <div class="card">
                <div class="label">Total Sales</div>
                <div class="value">${fmt(totalSales || 0)}</div>
              </div>
              <div class="card">
                <div class="label">Total Profit</div>
                <div class="value">${fmt(totalProfit || 0)}</div>
              </div>
              <div class="card">
                <div class="label">Profit Margin</div>
                <div class="value">${marginPct}%</div>
              </div>
              <div class="card">
                <div class="label">Average Sale</div>
                <div class="value">${fmt(
                  Array.isArray(filteredSales) && filteredSales.length > 0
                    ? (totalSales || 0) / filteredSales.length
                    : 0,
                )}</div>
              </div>
            </section>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Customer</th>
                  <th class="num">Qty</th>
                  <th class="num">Unit Price</th>
                  <th class="num">Total</th>
                  <th class="num">Profit</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="7" style="text-align:center; color:#6b7280; padding:12px;">No data available</td></tr>'}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="5" class="num">Totals:</td>
                  <td class="num">${fmt(totalSales || 0)}</td>
                  <td class="num ${(totalProfit || 0) >= 0 ? "pos" : "neg"}">${fmt(totalProfit || 0)}</td>
                </tr>
              </tfoot>
            </table>

            <footer>
              Created by Soft-Technix
            </footer>
          </body>
        </html>
      `

      const printWindow = window.open("", "_blank", "width=1200,height=800")
      if (!printWindow) {
        alert("Please allow pop-ups to print.")
        return
      }
      printWindow.document.open()
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      printWindow.onload = () => {
        printWindow.print()
        printWindow.close()
      }
    } catch (err) {
      console.error("Print error:", err)
      setError("Failed to open print preview")
    }
  }

  // Filter sales - ensure sales is an array before filtering
  const filteredSales = (Array.isArray(sales) ? sales : []).filter((sale) => {
    const saleDate = new Date(sale.date)
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59) // Include the end date fully

    const inDateRange = saleDate >= start && saleDate <= end
    const matchesProduct =
      productFilter === "" || (sale.product?._id || sale.product?.id || sale.productId) === productFilter

    // Get product name for search
    const productName = sale.product?.name || sale.productName || ""
    const customerName = sale.customerName || ""
    const matchesSearch =
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase())

    return inDateRange && matchesProduct && (searchTerm === "" || matchesSearch)
  })

  // Sort sales
  const sortedSales = [...filteredSales].sort((a, b) => {
    let aValue = a[sortBy]
    let bValue = b[sortBy]

    if (sortBy === "date") {
      aValue = new Date(aValue)
      bValue = new Date(bValue)
    } else if (sortBy === "productName") {
      aValue = a.product?.name || a.productName || ""
      bValue = b.product?.name || b.productName || ""
    }

    if (sortOrder === "asc") {
      return aValue > bValue ? 1 : -1
    } else {
      return aValue < bValue ? 1 : -1
    }
  })

  // Paginate sales
  const totalPages = Math.ceil(sortedSales.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedSales = sortedSales.slice(startIndex, startIndex + itemsPerPage)

  // Group sales by product for chart
  const salesByProduct = {}
  filteredSales.forEach((sale) => {
    const productName = sale.product?.name || sale.productName || "Unknown"
    if (!salesByProduct[productName]) {
      salesByProduct[productName] = 0
    }
    salesByProduct[productName] += sale.totalAmount || sale.quantity * (sale.salePrice || sale.saleRate)
  })

  const salesChartData = Object.entries(salesByProduct)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  // Group sales by date for chart
  const salesByDate = {}
  filteredSales.forEach((sale) => {
    if (!salesByDate[sale.date]) {
      salesByDate[sale.date] = 0
    }
    salesByDate[sale.date] += sale.totalAmount || sale.quantity * (sale.salePrice || sale.saleRate)
  })

  const salesTimeChartData = Object.keys(salesByDate)
    .map((date) => ({
      date,
      amount: salesByDate[date],
    }))
    .sort((a, b) => new Date(a.date) - new Date(b.date))

  // Calculate totals from filtered sales
  const totalSales = filteredSales.reduce(
    (sum, sale) => sum + (sale.totalAmount || sale.quantity * (sale.salePrice || sale.saleRate)),
    0,
  )
  const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0)
  const averageSaleValue = filteredSales.length > 0 ? totalSales / filteredSales.length : 0

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
    }).format(value)
  }

  // Render chart based on type
  const renderChart = () => {
    if (salesChartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full text-gray-500">
          <div className="text-center">
            <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No sales data available</p>
          </div>
        </div>
      )
    }

    switch (chartType) {
      case "line":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={salesTimeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Line type="monotone" dataKey="amount" stroke="#82ca9d" activeDot={{ r: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        )
      case "pie":
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={salesChartData.slice(0, 6)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {salesChartData.slice(0, 6).map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )
      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={salesChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="value" fill="#8884d8">
                {salesChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )
    }
  }

  // Get available products (in stock)
  const availableProducts = products.filter((product) => product && (product.quantity || 0) > 0)

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-semibold mb-4 md:mb-0 flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Sales Invoices
          <span className="text-sm text-gray-500 ml-2 flex items-center gap-1">
            <Warehouse className="h-4 w-4" />
            with Stock Data
          </span>
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            onClick={() => setShowFilters(!showFilters)}
            disabled={isLoading}
          >
            <Filter className="h-4 w-4" />
            Filters
          </button>
          <button
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 disabled:opacity-50"
            onClick={handleExport}
            disabled={isLoading || filteredSales.length === 0}
          >
            <Download className="h-4 w-4" />
            Export
          </button>
          <button
            className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
            onClick={handlePrint}
            aria-label="Print sales report"
            disabled={isLoading || filteredSales.length === 0}
            title={filteredSales.length === 0 ? "No data to print" : "Print report"}
          >
            <Printer className="h-4 w-4" />
            Print
          </button>
          <button
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 disabled:opacity-50"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setShowForm(true)}
            disabled={isLoading || availableProducts.length === 0}
            title={availableProducts.length === 0 ? "No products available in stock" : "Record New Sale"}
          >
            <Plus className="h-4 w-4" />
            Record New Sale
          </button>
        </div>
      </div>

      {/* Product Stock Alert */}
      {!isLoading && availableProducts.length === 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-yellow-500" />
          <span className="text-yellow-700">
            No products available in stock. Please add products to inventory before recording sales.
          </span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-500" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="mb-6 text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading sales and stock data...</p>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded-md"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded-md"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                className="w-full p-2 border rounded-md"
                value={productFilter}
                onChange={(e) => setProductFilter(e.target.value)}
                disabled={isLoading}
              >
                <option value="">All Products</option>
                {products.map((product) => (
                  <option key={product._id || product.id} value={product._id || product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search products or customers..."
                  className="w-full p-2 pl-8 border rounded-md"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={isLoading}
                />
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
              <select
                className="w-full p-2 border rounded-md"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                disabled={isLoading}
              >
                <option value="date">Date</option>
                <option value="productName">Product</option>
                <option value="totalAmount">Total Amount</option>
                <option value="profit">Profit</option>
                <option value="customerName">Customer</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
              <select
                className="w-full p-2 border rounded-md"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                disabled={isLoading}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Items Per Page</label>
              <select
                className="w-full p-2 border rounded-md"
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                disabled={isLoading}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
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
                  <p className="text-sm font-medium text-purple-600">Profit Margin</p>
                  <p className="text-2xl font-bold text-purple-900">
                    {totalSales > 0 ? ((totalProfit / totalSales) * 100).toFixed(2) : "0.00"}%
                  </p>
                </div>
                <Package className="h-8 w-8 text-purple-600" />
              </div>
            </div>

            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600">Total Orders</p>
                  <p className="text-2xl font-bold text-orange-900">{filteredSales.length}</p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-indigo-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-indigo-600">Stock Entries</p>
                  <p className="text-2xl font-bold text-indigo-900">{stockEntries.length}</p>
                </div>
                <Warehouse className="h-8 w-8 text-indigo-600" />
              </div>
            </div>
          </div>

          {/* Sales Chart */}
          <div className="bg-white p-4 rounded-lg border mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Sales Analytics</h3>
              <div className="flex gap-2">
                <button
                  className={`p-2 rounded ${chartType === "bar" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}
                  onClick={() => setChartType("bar")}
                >
                  <BarChart3 className="h-4 w-4" />
                </button>
                <button
                  className={`p-2 rounded ${chartType === "line" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}
                  onClick={() => setChartType("line")}
                >
                  <TrendingUp className="h-4 w-4" />
                </button>
                <button
                  className={`p-2 rounded ${chartType === "pie" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}
                  onClick={() => setChartType("pie")}
                >
                  <PieChartIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="h-64">{renderChart()}</div>
          </div>

          {/* Enhanced Sales Table with Stock Data */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Type
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Qty
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sale Rate
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Sale Amount
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Profit
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {paginatedSales.length > 0 ? (
                  paginatedSales.map((sale) => {
                    const stockEntry = getStockEntryForSale(sale)
                    return (
                      <tr key={sale._id || sale.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(sale.date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.product?.name || sale.productName || "Unknown"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {sale.customerName || "N/A"}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                          {sale.saleType || "—"}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-medium">
                          {sale.quantity}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                          {formatCurrency(sale.salePrice || sale.saleRate)}
                        </td>
                       

                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500 text-right font-semibold">
                          {formatCurrency(sale.totalAmount || sale.quantity * (sale.salePrice || sale.saleRate))}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-right">
                          <span className={(sale.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(sale.profit || 0)}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleViewDetails(sale)}
                              className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
                              aria-label="View sale details"
                              disabled={isSubmitting}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEdit(sale)}
                              className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                              aria-label="Edit sale"
                              disabled={isSubmitting}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(sale._id || sale.id)}
                              className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              aria-label="Delete sale"
                              disabled={isSubmitting}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan="11" className="px-6 py-4 text-center text-sm text-gray-500">
                      {availableProducts.length === 0
                        ? "No products available in stock. Add products to start recording sales."
                        : "No sales found for the selected period."}
                    </td>
                  </tr>
                )}
              </tbody>
              {paginatedSales.length > 0 && (
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan="8" className="px-4 py-4 text-sm font-medium text-gray-900 text-right">
                      Totals:
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 text-right">
                      {formatCurrency(totalSales)}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-right">
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-6">
              <div className="text-sm text-gray-700">
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, sortedSales.length)} of{" "}
                {sortedSales.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  Previous
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-3 py-1 border rounded ${
                      currentPage === page ? "bg-blue-500 text-white" : "bg-white"
                    }`}
                  >
                    {page}
                  </button>
                ))}
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
        </>
      )}

      {/* Sale Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{isEditing ? "Edit Sale" : "Record New Sale"}</h2>
              <button
                onClick={resetForm}
                className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close form"
                disabled={isSubmitting}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <select
                    name="productId"
                    value={formData.productId}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select Product</option>
                    {availableProducts.map((product) => (
                      <option key={product._id || product.id} value={product._id || product.id}>
                        {product.name} - Stock: {product.quantity || 0} - PKR {product.saleRate || product.price || 0}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity {maxQuantity > 0 && `(Max: ${maxQuantity})`}
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    value={formData.quantity}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    min="1"
                    max={maxQuantity}
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Price (PKR)</label>
                  <input
                    type="number"
                    name="salePrice"
                    value={formData.salePrice}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    min="0"
                    step="0.01"
                    required
                    disabled={isSubmitting}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                  <select
                    name="customerName"
                    value={formData.customerName}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    disabled={isSubmitting || loadingCustomer}
                  >
                    <option value="">Select Customer</option>
                    {customer.map((cust) => (
                      <option key={cust._id || cust.id} value={cust.name || cust.accountName}>
                        {cust.name || cust.accountName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer Phone</label>
                  <input
                    type="tel"
                    name="customerPhone"
                    value={formData.customerPhone}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    placeholder="+92-321-1234567 or 03211234567"
                    required
                    pattern="^(\+92|92)?[0-9]{10,11}$"
                    title="Please enter a valid phone number (e.g., +92-321-1234567 or 03211234567)"
                    disabled={isSubmitting}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sale Type</label>
                  <select
                    name="saleType"
                    value={formData.saleAccount || ""}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    disabled={isSubmitting || loadingSaleTypes}
                  >
                    <option value="">
                      {loadingSaleTypes
                        ? "Loading Sale Types..."
                        : saleTypes.length === 0
                          ? "No Sale Types Available"
                          : "Select Sale Type"}
                    </option>
                    {saleTypes.map((type) => (
                      <option key={type._id || type.id} value={type._id || type.id}>
                        {type.name || type.accountName}
                      </option>
                    ))}
                  </select>
                  {!loadingSaleTypes && saleTypes.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      ⚠️ No sale types loaded. Check server connection or add sale accounts in your system.
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    rows="3"
                    placeholder="Additional notes about the sale"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Sale Summary */}
                {formData.quantity && formData.salePrice && (
                  <div className="md:col-span-2 p-3 bg-gray-50 rounded-md">
                    <h4 className="font-medium text-gray-700 mb-2">Sale Summary</h4>
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

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  disabled={
                    isSubmitting ||
                    !formData.productId ||
                    !formData.quantity ||
                    !formData.salePrice ||
                    !formData.customerPhone
                  }
                >
                  {isSubmitting && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                  {isEditing ? "Update" : "Record"} Sale
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Enhanced Sale Details Modal */}
      {showSaleDetails && selectedSale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sale Details</h2>
              <button
                onClick={() => setShowSaleDetails(false)}
                className="text-gray-500 hover:text-gray-700"
                aria-label="Close details"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Date</label>
                  <p className="text-sm text-gray-900">{new Date(selectedSale.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Product</label>
                  <p className="text-sm text-gray-900">
                    {selectedSale.product?.name || selectedSale.productName || "Unknown"}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sale Quantity</label>
                  <p className="text-sm text-gray-900 font-medium">{selectedSale.quantity}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Sale Rate</label>
                  <p className="text-sm text-gray-900">
                    {formatCurrency(selectedSale.salePrice || selectedSale.saleRate)}
                  </p>
                </div>
              </div>

              {/* Stock Information */}
              {(() => {
                const stockEntry = getStockEntryForSale(selectedSale)
                return stockEntry ? (
                  <div className="p-3 bg-blue-50 rounded-md">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Warehouse className="h-4 w-4" />
                      Stock Management Data
                    </h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <label className="block text-xs font-medium text-blue-700">Stock Quantity</label>
                        <p className="text-blue-900 font-medium">
                          {stockEntry.quantity || stockEntry.stockQuantity || 0}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700">Purchase Rate</label>
                        <p className="text-blue-900">
                          {formatCurrency(stockEntry.purchaseRate || stockEntry.purchasePrice || 0)}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700">Balance Quantity</label>
                        <p className="text-blue-900">{stockEntry.balanceQuantity || 0}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-blue-700">Balance Rate</label>
                        <p className="text-blue-900">{formatCurrency(stockEntry.balanceRate || 0)}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 rounded-md">
                    <p className="text-yellow-800 text-sm flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      No stock management data found for this sale
                    </p>
                  </div>
                )
              })()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                  <p className="text-sm text-gray-900 font-semibold">
                    {formatCurrency(
                      selectedSale.totalAmount ||
                        selectedSale.quantity * (selectedSale.salePrice || selectedSale.saleRate),
                    )}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Profit</label>
                  <p
                    className={`text-sm font-semibold ${(selectedSale.profit || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
                  >
                    {formatCurrency(selectedSale.profit || 0)}
                  </p>
                </div>
              </div>

              {selectedSale.customerName && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Customer Name</label>
                  <p className="text-sm text-gray-900">{selectedSale.customerName}</p>
                </div>
              )}

              {selectedSale.customerPhone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">customerPhone</label>
                  <p className="text-sm text-gray-900">{selectedSale.customerPhone}</p>
                </div>
              )}

              {selectedSale.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="text-sm text-gray-900">{selectedSale.notes}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowSaleDetails(false)
                  handleEdit(selectedSale)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Edit Sale
              </button>
              <button
                onClick={() => setShowSaleDetails(false)}
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

export default SalesTracking
