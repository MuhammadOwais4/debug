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
  PieChart,
  Pie,
  Cell,
} from "recharts"
import {
  TrendingUp,
  Package,
  DollarSign,
  AlertTriangle,
  Download,
  BarChart3,
  PieChartIcon,
  FileText,
  RefreshCw,
} from "lucide-react"
import ApiHandler from "../../../Api/apihandle"

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

function getFirstDayOfYear() {
  const date = new Date()
  return new Date(date.getFullYear(), 0, 1).toISOString().split("T")[0]
}

const Reports = () => {
  // State for data
  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([])
  const [expenses, setExpenses] = useState([])
  const [salesStats, setSalesStats] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // State for date filters
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())
  const [reportPeriod, setReportPeriod] = useState("month") // month, quarter, year, custom

  // State for chart types
  const [salesChartType, setSalesChartType] = useState("bar")
  const [expenseChartType, setExpenseChartType] = useState("pie")

  // Fetch all data
  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const filters = {
        startDate,
        endDate,
      }

      // Fetch all data in parallel with better error handling
      const [productsResponse, salesResponse, expensesResponse, statsResponse] = await Promise.allSettled([
        ApiHandler.getProducts(),
        ApiHandler.getSales(filters),
        // Try to fetch expenses, but don't fail if endpoint doesn't exist
        ApiHandler.getExpenses ? ApiHandler.getExpenses(filters) : Promise.resolve({ data: [] }),
        ApiHandler.getSalesStats(filters),
      ])

      // Handle products
      if (productsResponse.status === "fulfilled") {
        const productsData = productsResponse.value?.data || []
        setProducts(Array.isArray(productsData) ? productsData : [])
      } else {
        console.error("Failed to fetch products:", productsResponse.reason)
        setProducts([])
      }

      // Handle sales
      if (salesResponse.status === "fulfilled") {
        const salesData = salesResponse.value?.data || []
        setSales(Array.isArray(salesData) ? salesData : [])
      } else {
        console.error("Failed to fetch sales:", salesResponse.reason)
        setSales([])
      }

      // Handle expenses - gracefully handle if endpoint doesn't exist
      if (expensesResponse.status === "fulfilled") {
        const expensesData = expensesResponse.value?.data || []
        setExpenses(Array.isArray(expensesData) ? expensesData : [])
      } else {
        console.warn("Expenses endpoint not available or failed:", expensesResponse.reason)
        // Create mock expense data for demonstration
        setExpenses([
          {
            id: 1,
            date: getCurrentDate(),
            category: "Office Supplies",
            amount: 500,
            description: "Sample expense data",
          },
          {
            id: 2,
            date: getFirstDayOfMonth(),
            category: "Marketing",
            amount: 1200,
            description: "Sample marketing expense",
          },
        ])
      }

      // Handle stats
      if (statsResponse.status === "fulfilled") {
        setSalesStats(statsResponse.value?.data || null)
      } else {
        console.error("Failed to fetch sales stats:", statsResponse.reason)
        setSalesStats(null)
      }
    } catch (error) {
      console.error("Error fetching report data:", error)
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Update date range based on period selection
  const handlePeriodChange = (period) => {
    setReportPeriod(period)
    const now = new Date()

    switch (period) {
      case "week":
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()))
        setStartDate(weekStart.toISOString().split("T")[0])
        setEndDate(getCurrentDate())
        break
      case "month":
        setStartDate(getFirstDayOfMonth())
        setEndDate(getCurrentDate())
        break
      case "quarter":
        const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        setStartDate(quarterStart.toISOString().split("T")[0])
        setEndDate(getCurrentDate())
        break
      case "year":
        setStartDate(getFirstDayOfYear())
        setEndDate(getCurrentDate())
        break
      default:
        // custom - don't change dates
        break
    }
  }

  // Initial data fetch
  useEffect(() => {
    fetchData()
  }, [startDate, endDate])

  // Calculate metrics
  const calculateMetrics = () => {
    // Filter sales by date
    const filteredSales = sales.filter((sale) => {
      const saleDate = new Date(sale.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59)
      return saleDate >= start && saleDate <= end
    })

    // Filter expenses by date
    const filteredExpenses = expenses.filter((expense) => {
      const expenseDate = new Date(expense.date)
      const start = new Date(startDate)
      const end = new Date(endDate)
      end.setHours(23, 59, 59)
      return expenseDate >= start && expenseDate <= end
    })

    // Stock metrics
    const totalProducts = products.length
    const lowStockItems = products.filter((p) => (p.quantity || 0) <= (p.lowStockThreshold || 5))
    const outOfStockItems = products.filter((p) => (p.quantity || 0) === 0)
    const totalStockValue = products.reduce((sum, product) => {
      return sum + (product.purchaseRate || 0) * (product.quantity || 0)
    }, 0)

    // Sales metrics
    const totalSales = filteredSales.reduce(
      (sum, sale) => sum + (sale.totalAmount || sale.quantity * sale.salePrice),
      0,
    )
    const totalProfit = filteredSales.reduce((sum, sale) => sum + (sale.profit || 0), 0)
    const totalOrders = filteredSales.length

    // Expense metrics
    const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)

    // Net profit
    const netProfit = totalSales - totalExpenses
    const profitMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0

    return {
      stock: {
        totalProducts,
        lowStockItems: lowStockItems.length,
        outOfStockItems: outOfStockItems.length,
        totalStockValue,
        lowStockProducts: lowStockItems,
        outOfStockProducts: outOfStockItems,
      },
      sales: {
        totalSales,
        totalProfit,
        totalOrders,
        averageOrderValue: totalOrders > 0 ? totalSales / totalOrders : 0,
        profitMargin,
      },
      expenses: {
        totalExpenses,
      },
      overall: {
        netProfit,
        grossMargin: totalSales > 0 ? ((totalSales - totalExpenses) / totalSales) * 100 : 0,
      },
    }
  }

  const metrics = calculateMetrics()

  // Group sales by product for chart
  const salesByProduct = {}
  sales.forEach((sale) => {
    const productName = sale.product?.name || "Unknown Product"
    if (!salesByProduct[productName]) {
      salesByProduct[productName] = {
        name: productName,
        value: 0,
        quantity: 0,
      }
    }
    salesByProduct[productName].value += sale.totalAmount || sale.quantity * sale.salePrice
    salesByProduct[productName].quantity += sale.quantity
  })

  const salesChartData = Object.values(salesByProduct)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10)

  // Group expenses by category for chart
  const expensesByCategory = {}
  expenses.forEach((expense) => {
    const category = expense.category || "Other"
    if (!expensesByCategory[category]) {
      expensesByCategory[category] = 0
    }
    expensesByCategory[category] += expense.amount || 0
  })

  const expenseChartData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value,
  }))

  // Sales trend data (by date)
  const salesByDate = {}
  sales.forEach((sale) => {
    const date = sale.date
    if (!salesByDate[date]) {
      salesByDate[date] = 0
    }
    salesByDate[date] += sale.totalAmount || sale.quantity * sale.salePrice
  })

  const salesTrendData = Object.keys(salesByDate)
    .sort()
    .map((date) => ({
      date,
      amount: salesByDate[date],
    }))

  // Format currency
  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 2,
    }).format(value)
  }

  // Export report
  const handleExport = () => {
    const reportData = {
      period: `${startDate} to ${endDate}`,
      metrics,
      salesByProduct: Object.values(salesByProduct),
      expensesByCategory: Object.entries(expensesByCategory),
    }

    const csvContent = [
      ["Business Report", `Period: ${startDate} to ${endDate}`],
      [],
      ["STOCK SUMMARY"],
      ["Total Products", metrics.stock.totalProducts],
      ["Low Stock Items", metrics.stock.lowStockItems],
      ["Out of Stock Items", metrics.stock.outOfStockItems],
      ["Total Stock Value", formatCurrency(metrics.stock.totalStockValue)],
      [],
      ["SALES SUMMARY"],
      ["Total Sales", formatCurrency(metrics.sales.totalSales)],
      ["Total Profit", formatCurrency(metrics.sales.totalProfit)],
      ["Total Orders", metrics.sales.totalOrders],
      ["Average Order Value", formatCurrency(metrics.sales.averageOrderValue)],
      ["Profit Margin", `${metrics.sales.profitMargin.toFixed(2)}%`],
      [],
      ["EXPENSE SUMMARY"],
      ["Total Expenses", formatCurrency(metrics.expenses.totalExpenses)],
      [],
      ["OVERALL SUMMARY"],
      ["Net Profit", formatCurrency(metrics.overall.netProfit)],
      ["Gross Margin", `${metrics.overall.grossMargin.toFixed(2)}%`],
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `business-report-${getCurrentDate()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (isLoading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading report data...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <h2 className="text-xl font-semibold mb-4 md:mb-0 flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Business Reports
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={fetchData}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2"
            disabled={isLoading}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={handleExport}
            className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Info about expense data */}
      {expenses.length <= 2 && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <p className="text-blue-700">
            <strong>Note:</strong> Expense tracking is not fully implemented yet. The report shows sample data for
            demonstration. To get real expense data, implement the expense management endpoints in your backend.
          </p>
        </div>
      )}

      {/* Period Selection */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex flex-wrap gap-2 mb-4">
          {["week", "month", "quarter", "year", "custom"].map((period) => (
            <button
              key={period}
              onClick={() => handlePeriodChange(period)}
              className={`px-3 py-1 rounded-md text-sm ${
                reportPeriod === period ? "bg-blue-600 text-white" : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              {period.charAt(0).toUpperCase() + period.slice(1)}
            </button>
          ))}
        </div>

        {reportPeriod === "custom" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded-md"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                className="w-full p-2 border rounded-md"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="mt-2 text-sm text-gray-600">
          Report Period: {startDate} to {endDate}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">Total Sales</p>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(metrics.sales.totalSales)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">Net Profit</p>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(metrics.overall.netProfit)}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-600">Total Products</p>
              <p className="text-2xl font-bold text-purple-900">{metrics.stock.totalProducts}</p>
            </div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-orange-900">{metrics.stock.lowStockItems}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Sales by Product Chart */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Sales by Product</h3>
            <div className="flex gap-2">
              <button
                className={`p-2 rounded ${salesChartType === "bar" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}
                onClick={() => setSalesChartType("bar")}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                className={`p-2 rounded ${salesChartType === "pie" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}
                onClick={() => setSalesChartType("pie")}
              >
                <PieChartIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-64">
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {salesChartType === "pie" ? (
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
                  </PieChart>
                ) : (
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
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No sales data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Expenses by Category Chart */}
        <div className="bg-white p-4 rounded-lg border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">Expenses by Category</h3>
            <div className="flex gap-2">
              <button
                className={`p-2 rounded ${expenseChartType === "bar" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}
                onClick={() => setExpenseChartType("bar")}
              >
                <BarChart3 className="h-4 w-4" />
              </button>
              <button
                className={`p-2 rounded ${expenseChartType === "pie" ? "bg-blue-100 text-blue-600" : "bg-gray-100"}`}
                onClick={() => setExpenseChartType("pie")}
              >
                <PieChartIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="h-64">
            {expenseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                {expenseChartType === "pie" ? (
                  <PieChart>
                    <Pie
                      data={expenseChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {expenseChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                ) : (
                  <BarChart data={expenseChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Bar dataKey="value" fill="#FF8042" />
                  </BarChart>
                )}
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <p>No expense data available</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sales Trend Chart */}
      <div className="bg-white p-4 rounded-lg border mb-6">
        <h3 className="text-lg font-medium mb-4">Sales Trend</h3>
        <div className="h-64">
          {salesTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={salesTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Line type="monotone" dataKey="amount" stroke="#82ca9d" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>No sales trend data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Summary Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Summary */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">Stock Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Products:</span>
              <span className="font-medium">{metrics.stock.totalProducts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Low Stock Items:</span>
              <span className="font-medium text-orange-600">{metrics.stock.lowStockItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Out of Stock:</span>
              <span className="font-medium text-red-600">{metrics.stock.outOfStockItems}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Stock Value:</span>
              <span className="font-medium">{formatCurrency(metrics.stock.totalStockValue)}</span>
            </div>

            {metrics.stock.lowStockProducts.length > 0 && (
              <div className="pt-4 border-t">
                <h4 className="font-medium mb-2 text-orange-600">Low Stock Alert</h4>
                <ul className="space-y-1 max-h-32 overflow-y-auto">
                  {metrics.stock.lowStockProducts.map((product) => (
                    <li key={product._id || product.id} className="flex justify-between text-sm">
                      <span>{product.name}</span>
                      <span className="text-orange-600">{product.quantity || 0} remaining</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Financial Summary */}
        <div className="bg-white p-6 rounded-lg border">
          <h3 className="text-lg font-medium mb-4">Financial Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Sales:</span>
              <span className="font-medium text-green-600">{formatCurrency(metrics.sales.totalSales)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Expenses:</span>
              <span className="font-medium text-red-600">{formatCurrency(metrics.expenses.totalExpenses)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600 font-medium">Net Profit:</span>
              <span className={`font-medium ${metrics.overall.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(metrics.overall.netProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Profit Margin:</span>
              <span className="font-medium">{metrics.sales.profitMargin.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Order Value:</span>
              <span className="font-medium">{formatCurrency(metrics.sales.averageOrderValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Orders:</span>
              <span className="font-medium">{metrics.sales.totalOrders}</span>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Profit Margin Visualization</h4>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${metrics.sales.profitMargin > 0 ? "bg-green-500" : "bg-red-500"}`}
                  style={{ width: `${Math.min(Math.abs(metrics.sales.profitMargin), 100)}%` }}
                ></div>
              </div>
              <div className="text-center mt-2 text-sm text-gray-600">
                {metrics.sales.profitMargin.toFixed(2)}% Profit Margin
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
