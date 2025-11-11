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
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign, Package, CreditCard, Bell, RefreshCw } from 'lucide-react'
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

const Dashboard = ({ onTabChange }) => {
  const [startDate, setStartDate] = useState(getFirstDayOfMonth())
  const [endDate, setEndDate] = useState(getCurrentDate())
  const [dashboardData, setDashboardData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Fetch dashboard data
  const fetchDashboardData = async (showRefreshLoader = false) => {
    try {
      if (showRefreshLoader) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)

      const filters = {
        startDate,
        endDate,
      }

      const response = await ApiHandler.getDashboardData(filters)

      if (response.success) {
        setDashboardData(response.data)
      } else {
        throw new Error(response.message || "Failed to fetch dashboard data")
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err)
      setError(err.message || "Failed to load dashboard data")

      // Fallback to empty data structure
      setDashboardData({
        kpis: {
          totalStockValue: 0,
          lowStockCount: 0,
          totalSales: 0,
          totalExpenses: 0,
          totalProfit: 0,
          netProfit: 0,
        },
        charts: {
          topProducts: [],
          expensesData: [],
          dailyData: [],
        },
        recentData: {
          lowStockItems: [],
          recentExpenses: [],
          recentSales: [],
          notifications: [],
        },
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // Fetch data on component mount and when date range changes
  useEffect(() => {
    fetchDashboardData()
  }, [startDate, endDate])

  // Manual refresh
  const handleRefresh = () => {
    fetchDashboardData(true)
  }

  // Format currency
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

  // Format chart data for display
  const formatChartData = (data) => {
    return data.map((item) => ({
      ...item,
      date: new Date(item.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    }))
  }

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

  if (error && !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 mx-auto mb-4 text-red-500" />
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => fetchDashboardData()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const { kpis, charts, recentData } = dashboardData

  return (
    <div className="space-y-6 p-6">
      {/* Header with Date Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <h2 className="text-xl font-semibold text-gray-900">Stock Dashboard</h2>

          {error && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-md">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">Using cached data</span>
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
            <span className="text-gray-500">Selected period</span>
          </div>
        </div>

        <div
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => handleTabChange("expenses")}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-lg font-medium text-gray-500">Total Expenses</h3>
            <CreditCard className="h-6 w-6 text-red-500" />
          </div>
          <p className="text-2xl font-bold mt-2">{formatCurrency(kpis.totalExpenses)}</p>
          <div className="mt-2 flex items-center text-sm">
            <span className="text-gray-500">Selected period</span>
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
          <h3 className="text-lg font-medium mb-4">Daily Performance</h3>
          <div className="h-64">
            {charts.dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formatChartData(charts.dailyData)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Line type="monotone" dataKey="sales" stroke="#82ca9d" name="Sales" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#ff7300" name="Expenses" strokeWidth={2} />
                  <Line type="monotone" dataKey="profit" stroke="#8884d8" name="Profit" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">No performance data available</div>
            )}
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium mb-4">Top Selling Products</h3>
          <div className="h-64">
            {charts.topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={charts.topProducts}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  <Bar dataKey="value" fill="#8884d8">
                    {charts.topProducts.map((entry, index) => (
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
          {recentData.lowStockItems.length > 0 ? (
            <ul className="divide-y">
              {recentData.lowStockItems.map((item) => (
                <li key={item.id} className="py-3 flex justify-between">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-red-600">{item.quantity} left</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-4 text-gray-500">No low stock items.</p>
          )}
        </div>

        {/* Recent Expenses */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-medium">Recent Expenses</h3>
            </div>
            <button
              onClick={() => handleTabChange("expenses")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              View All
            </button>
          </div>
          {recentData.recentExpenses.length > 0 ? (
            <ul className="divide-y">
              {recentData.recentExpenses.map((expense) => (
                <li key={expense.id} className="py-3 flex justify-between">
                  <div>
                    <span className="font-medium">{expense.category}</span>
                    <p className="text-sm text-gray-500">{expense.date}</p>
                  </div>
                  <span className="text-red-600">{formatCurrency(expense.amount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-4 text-gray-500">No recent expenses.</p>
          )}
        </div>

        {/* Recent Sales */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <h3 className="text-lg font-medium">Recent Sales</h3>
            </div>
            <button
              onClick={() => handleTabChange("sales")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              View All
            </button>
          </div>
          {recentData.recentSales.length > 0 ? (
            <ul className="divide-y">
              {recentData.recentSales.map((sale) => (
                <li key={sale.id} className="py-3 flex justify-between">
                  <div>
                    <span className="font-medium">{sale.productName}</span>
                    <p className="text-sm text-gray-500">
                      {sale.date} · {sale.quantity} units
                    </p>
                  </div>
                  <span className="text-green-600">{formatCurrency(sale.totalAmount)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-center py-4 text-gray-500">No recent sales.</p>
          )}
        </div>
      </div>

      {/* Notifications */}
      {recentData.notifications.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              <h3 className="text-lg font-medium">Recent Notifications</h3>
            </div>
            <button
              onClick={() => handleTabChange("notifications")}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              View All
            </button>
          </div>
          <div className="space-y-2">
            {recentData.notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 rounded-md ${
                  notification.type === "lowStock" || notification.type === "monthlyExpense"
                    ? "bg-red-50 text-red-700"
                    : notification.type === "sale"
                      ? "bg-green-50 text-green-700"
                      : "bg-blue-50 text-blue-700"
                }`}
              >
                <span>{notification.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
