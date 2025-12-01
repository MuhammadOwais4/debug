"use client"

import { useState, useEffect } from "react"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Bell, 
  RefreshCw,
  ShoppingCart,
  ShoppingBag,
} from 'lucide-react'
import ApiHandler from "@/Api/apihandle"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658"]

function getCurrentDate() {
  return new Date().toISOString().split("T")[0]
}

function getFirstDayOfMonth() {
  const date = new Date()
  return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split("T")[0]
}

const Dashboard = ({ onTabChange }) => {
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())
  const [sales, setSales] = useState([])
  const [products, setProducts] = useState([])
  const [vouchers, setVouchers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchDashboardData = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const filters = { startDate, endDate }

      const [salesResponse, productsResponse, vouchersResponse] = await Promise.allSettled([
        ApiHandler.getSales(filters),
        ApiHandler.getProducts(),
        ApiHandler.getVouchers(filters),
      ])

      if (salesResponse.status === "fulfilled") {
        const response = salesResponse.value
        let salesData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            salesData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            salesData = response.data.data
          }
        }
        setSales(salesData)
      }

      if (productsResponse.status === "fulfilled") {
        const response = productsResponse.value
        let productsData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            productsData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            productsData = response.data.data
          }
        }
        setProducts(productsData)
      }

      if (vouchersResponse.status === "fulfilled") {
        const response = vouchersResponse.value
        let vouchersData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            vouchersData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            vouchersData = response.data.data
          }
        }
        setVouchers(vouchersData)
      }

    } catch (err) {
      console.error("Dashboard fetch error:", err)
      setError(err.message || "Failed to load dashboard data")
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [startDate, endDate])

  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: "PKR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const handleTabChange = (tab) => {
    if (onTabChange) {
      onTabChange(tab)
    }
  }

  // Calculate KPIs
  const calculateKPIs = () => {
    const totalStockValue = products.reduce((sum, p) => 
      sum + ((p.purchaseRate || 0) * (p.quantity || 0)), 0
    )
    
    const lowStockCount = products.filter(p => 
      (p.quantity || 0) <= (p.lowStockThreshold || 5)
    ).length

    const totalSales = sales.reduce((sum, s) => 
      sum + (s.totalAmount || s.quantity * s.salePrice || 0), 0
    )

    const totalProfit = sales.reduce((sum, s) => 
      sum + (s.profit || 0), 0
    )

    const purchaseVouchers = vouchers.filter(v => v.type === "CPV" || v.type === "BPV")
    const totalPurchases = purchaseVouchers.reduce((sum, v) => {
      const voucherTotal = v.entries?.reduce((s, e) => s + (e.debit || 0), 0) || 0
      return sum + voucherTotal
    }, 0)

    return {
      totalStockValue,
      lowStockCount,
      totalSales,
      totalProfit,
      totalPurchases,
      netProfit: totalProfit,
    }
  }

  // Get top selling products
  const getTopProducts = () => {
    const productSales = {}
    sales.forEach(sale => {
      const productName = sale.product?.name || sale.productName || "Unknown"
      if (!productSales[productName]) {
        productSales[productName] = 0
      }
      productSales[productName] += sale.totalAmount || (sale.quantity * sale.salePrice) || 0
    })

    return Object.entries(productSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }

  // Get daily performance data
  const getDailyData = () => {
    const dailyStats = {}
    
    sales.forEach(sale => {
      const date = sale.date?.split("T")[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { sales: 0, profit: 0 }
      }
      dailyStats[date].sales += sale.totalAmount || (sale.quantity * sale.salePrice) || 0
      dailyStats[date].profit += sale.profit || 0
    })

    return Object.keys(dailyStats)
      .sort()
      .slice(-7)
      .map(date => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sales: dailyStats[date].sales,
        profit: dailyStats[date].profit,
      }))
  }

  // Get low stock items with categories
  const getLowStockItems = () => {
    return products
      .filter(p => (p.quantity || 0) <= (p.lowStockThreshold || 5))
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .slice(0, 5)
      .map(p => ({
        id: p._id || p.id,
        name: p.name,
        quantity: p.quantity || 0,
        category: p.category || "Uncategorized",
      }))
  }

  // Get recent sales
  const getRecentSales = () => {
    return [...sales]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
      .map(s => ({
        id: s._id || s.id,
        productName: s.product?.name || s.productName || "Unknown",
        date: new Date(s.date).toLocaleDateString(),
        quantity: s.quantity || 0,
        totalAmount: s.totalAmount || (s.quantity * s.salePrice) || 0,
      }))
  }

  // Get recent purchases
  const getRecentPurchases = () => {
    const purchaseVouchers = vouchers
      .filter(v => v.type === "CPV" || v.type === "BPV")
      .sort((a, b) => new Date(b.voucherDate || b.date) - new Date(a.voucherDate || a.date))
      .slice(0, 5)

    return purchaseVouchers.map(v => ({
      id: v._id || v.id,
      voucherNo: v.voucherNo || "N/A",
      date: new Date(v.voucherDate || v.date).toLocaleDateString(),
      description: v.description || v.entries?.[0]?.accountName || "Purchase",
      amount: v.entries?.reduce((sum, e) => sum + (e.debit || 0), 0) || 0,
    }))
  }

  const kpis = calculateKPIs()
  const topProducts = getTopProducts()
  const dailyData = getDailyData()
  const lowStockItems = getLowStockItems()
  const recentSales = getRecentSales()
  const recentPurchases = getRecentPurchases()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading dashboard data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header with Date Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <h2 className="text-xl font-semibold text-gray-900">Stock Dashboard</h2>

          {error && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex gap-4 ml-auto">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleTabChange("stock")}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-500">Stock Value</h3>
            <Package className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(kpis.totalStockValue)}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className={`${kpis.lowStockCount > 0 ? "text-red-500" : "text-green-500"} flex items-center`}>
              {kpis.lowStockCount > 0 ? <AlertTriangle className="h-4 w-4 mr-1" /> : null}
              {kpis.lowStockCount} low stock items
            </span>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleTabChange("sales")}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-500">Total Sales</h3>
            <TrendingUp className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(kpis.totalSales)}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-500">{sales.length} transactions</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-500">Total Purchases</h3>
            <ShoppingBag className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(kpis.totalPurchases)}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-500">{vouchers.filter(v => v.type === "CPV" || v.type === "BPV").length} vouchers</span>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleTabChange("reports")}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-500">Net Profit</h3>
            {kpis.netProfit >= 0 ? (
              <TrendingUp className="h-6 w-6 text-green-500" />
            ) : (
              <TrendingDown className="h-6 w-6 text-red-500" />
            )}
          </div>
          <p className={`text-2xl font-bold mt-2 ${kpis.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(kpis.netProfit)}
          </p>
          <div className="mt-2 flex items-center text-sm">
            <span className={`${kpis.netProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
              {kpis.totalSales > 0 ? ((kpis.totalProfit / kpis.totalSales) * 100).toFixed(1) : "0.0"}% margin
            </span>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Performance Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Daily Performance (Last 7 Days)</h3>
          <div className="h-64">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={dailyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="sales" stroke="#82ca9d" name="Sales" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="#8884d8" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No sales data available</div>
            )}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Top 5 Selling Products</h3>
          <div className="h-64">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#8884d8">
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No sales data available</div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activities Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Low Stock Items */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-medium">Low Stock Items</h3>
            </div>
            <button
              onClick={() => handleTabChange("stock")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              View All
            </button>
          </div>
          {lowStockItems.length > 0 ? (
            <ul className="divide-y">
              {lowStockItems.map((item) => (
                <li key={item.id} className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{item.name}</span>
                      <p className="text-sm text-gray-500">{item.category}</p>
                    </div>
                    <span className="text-red-600 font-semibold">{item.quantity} left</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-4 text-gray-500">No low stock items.</p>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-medium">Recent Sales</h3>
            </div>
            <button
              onClick={() => handleTabChange("sales")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              View All
            </button>
          </div>
          {recentSales.length > 0 ? (
            <ul className="divide-y">
              {recentSales.map((sale) => (
                <li key={sale.id} className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{sale.productName}</span>
                      <p className="text-sm text-gray-500">
                        {sale.date} · {sale.quantity} units
                      </p>
                    </div>
                    <span className="text-green-600 font-semibold">{formatCurrency(sale.totalAmount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-4 text-gray-500">No recent sales.</p>
          )}
        </div>

        {/* Recent Purchases */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-medium">Recent Purchases</h3>
            </div>
          </div>
          {recentPurchases.length > 0 ? (
            <ul className="divide-y">
              {recentPurchases.map((purchase) => (
                <li key={purchase.id} className="py-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-medium">{purchase.voucherNo}</span>
                      <p className="text-sm text-gray-500">
                        {purchase.date} · {purchase.description}
                      </p>
                    </div>
                    <span className="text-purple-600 font-semibold">{formatCurrency(purchase.amount)}</span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-4 text-gray-500">No recent purchases.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default Dashboard