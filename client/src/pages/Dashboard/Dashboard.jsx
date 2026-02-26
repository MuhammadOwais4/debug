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
  PieChart,
  Pie,
  Legend
} from "recharts"
import { 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Package, 
  RefreshCw, 
  ShoppingCart, 
  ShoppingBag,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Eye,
  Clock,
  CheckCircle2,
  XCircle
} from "lucide-react"

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ec4899"]
// const API_BASE_URL = "http://localhost:5000/api"
const API_BASE_URL="https://debug-nxby.vercel.app/api"

const apiClient = {
  get: async (url) => {
    const response = await fetch(`${API_BASE_URL}${url}`)
    if (!response.ok) throw new Error('Network response was not ok')
    return { data: await response.json() }
  }
}

const ApiHandler = {
  getSales: async (filters = {}) => {
    const params = new URLSearchParams()
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
        params.append(key, filters[key])
      }
    })
    const url = params.toString() ? `/sales?${params.toString()}` : "/sales"
    const response = await apiClient.get(url)
    return response.data
  },
  getProducts: async () => {
    const response = await apiClient.get("/products")
    return response.data
  },
  getVouchers: async (filters = {}) => {
    const params = new URLSearchParams()
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
        params.append(key, filters[key])
      }
    })
    const url = params.toString() ? `/vouchers?${params.toString()}` : "/vouchers"
    const response = await apiClient.get(url)
    return response.data
  },
  getPurchaseDiscounts: async () => {
    const response = await apiClient.get('/purchases-discount')
    return response.data
  },
  getTotalPurchaseDiscount: async () => {
    const response = await apiClient.get('/purchases-discount/total/amount')
    return response.data
  },
  getSaleDiscounts: async () => {
    const response = await apiClient.get('/sale-discount')
    return response.data
  },
  getReturns: async (filters = {}) => {
    const params = new URLSearchParams()
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
        params.append(key, filters[key])
      }
    })
    const url = params.toString() ? `/sales/return?${params.toString()}` : "/sales/return"
    const response = await apiClient.get(url)
    return response.data
  },
  getLowStockProducts: async (filters = {}) => {
    const params = new URLSearchParams()
    Object.keys(filters).forEach((key) => {
      if (filters[key] !== undefined && filters[key] !== null && filters[key] !== "") {
        params.append(key, filters[key])
      }
    })
    const url = params.toString() ? `/products/low-stock?${params.toString()}` : "/products/low-stock"
    const response = await apiClient.get(url)
    return response.data
  },
  getProduct: async (id) => {
    const response = await apiClient.get(`/products/${id}`)
    return response.data
  }
}

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
  const [purchaseDiscounts, setPurchaseDiscounts] = useState([])
  const [saleDiscounts, setSaleDiscounts] = useState([])
  const [returns, setReturns] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
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

      const [
        salesResponse, 
        productsResponse, 
        vouchersResponse,
        purchaseDiscountsResponse,
        saleDiscountsResponse,
        returnsResponse,
        lowStockResponse
      ] = await Promise.allSettled([
        ApiHandler.getSales({ startDate, endDate }),
        ApiHandler.getProducts(),
        ApiHandler.getVouchers({ startDate, endDate }),
        ApiHandler.getPurchaseDiscounts(),
        ApiHandler.getSaleDiscounts(),
        ApiHandler.getReturns({ startDate, endDate }),
        ApiHandler.getLowStockProducts()
      ])

      // Handle sales response
      if (salesResponse.status === "fulfilled") {
        const response = salesResponse.value
        let salesData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            salesData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            salesData = response.data.data
          }
        } else if (Array.isArray(response)) {
          salesData = response
        }
        setSales(salesData)
      } else {
        console.error("Sales fetch failed:", salesResponse.reason)
        setSales([])
      }

      // Handle products response
      if (productsResponse.status === "fulfilled") {
        const response = productsResponse.value
        let productsData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            productsData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            productsData = response.data.data
          }
        } else if (Array.isArray(response)) {
          productsData = response
        }
        setProducts(productsData)
      } else {
        console.error("Products fetch failed:", productsResponse.reason)
        setProducts([])
      }

      // Handle vouchers response
      if (vouchersResponse.status === "fulfilled") {
        const response = vouchersResponse.value
        let vouchersData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            vouchersData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            vouchersData = response.data.data
          }
        } else if (Array.isArray(response)) {
          vouchersData = response
        }
        setVouchers(vouchersData)
      } else {
        console.error("Vouchers fetch failed:", vouchersResponse.reason)
        setVouchers([])
      }

      // Handle purchase discounts
      if (purchaseDiscountsResponse.status === "fulfilled") {
        const response = purchaseDiscountsResponse.value
        let discountsData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            discountsData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            discountsData = response.data.data
          }
        }
        setPurchaseDiscounts(discountsData)
      } else {
        setPurchaseDiscounts([])
      }

      // Handle sale discounts
      if (saleDiscountsResponse.status === "fulfilled") {
        const response = saleDiscountsResponse.value
        let discountsData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            discountsData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            discountsData = response.data.data
          }
        }
        setSaleDiscounts(discountsData)
      } else {
        setSaleDiscounts([])
      }

      // Handle returns
      if (returnsResponse.status === "fulfilled") {
        const response = returnsResponse.value
        let returnsData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            returnsData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            returnsData = response.data.data
          }
        }
        setReturns(returnsData)
      } else {
        setReturns([])
      }

      // Handle low stock products
      if (lowStockResponse.status === "fulfilled") {
        const response = lowStockResponse.value
        let lowStockData = []
        if (response?.data) {
          if (Array.isArray(response.data)) {
            lowStockData = response.data
          } else if (response.data.data && Array.isArray(response.data.data)) {
            lowStockData = response.data.data
          }
        }
        setLowStockProducts(lowStockData)
      } else {
        setLowStockProducts([])
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err)
      setError(err.message || "Failed to load dashboard data")
      // Set empty arrays on error to prevent crashes
      setSales([])
      setProducts([])
      setVouchers([])
      setPurchaseDiscounts([])
      setSaleDiscounts([])
      setReturns([])
      setLowStockProducts([])
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

  const calculateKPIs = () => {
    const totalStockValue = products.reduce((sum, p) => sum + (p.purchaseRate || 0) * (p.quantity || 0), 0)
    const lowStockCount = products.filter((p) => (p.quantity || 0) <= (p.lowStockThreshold || 5)).length
    const totalSales = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0)
    const totalProfit = sales.reduce((sum, s) => sum + (s.profit || 0), 0)
    const purchaseVouchers = vouchers.filter((v) => v.type === "CPV" || v.type === "BPV")
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

  const getTopProducts = () => {
    const productSales = {}
    sales.forEach((sale) => {
      const productName = sale.product?.name || "Unknown"
      if (!productSales[productName]) {
        productSales[productName] = 0
      }
      productSales[productName] += sale.totalAmount || 0
    })

    return Object.entries(productSales)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5)
  }

  const getDailyData = () => {
    const dailyStats = {}

    sales.forEach((sale) => {
      const date = sale.date?.split("T")[0]
      if (!dailyStats[date]) {
        dailyStats[date] = { sales: 0, profit: 0 }
      }
      dailyStats[date].sales += sale.totalAmount || 0
      dailyStats[date].profit += sale.profit || 0
    })

    return Object.keys(dailyStats)
      .sort()
      .slice(-7)
      .map((date) => ({
        date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        sales: dailyStats[date].sales,
        profit: dailyStats[date].profit,
      }))
  }

  const getCategoryDistribution = () => {
    const categoryValue = {}
    products.forEach((p) => {
      const cat = p.category || "Uncategorized"
      const value = (p.purchaseRate || 0) * (p.quantity || 0)
      categoryValue[cat] = (categoryValue[cat] || 0) + value
    })
    return Object.entries(categoryValue).map(([name, value]) => ({ name, value }))
  }

  const getLowStockItems = () => {
    // Use the lowStockProducts from API if available, otherwise filter from products
    if (lowStockProducts && lowStockProducts.length > 0) {
      return lowStockProducts
        .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
        .slice(0, 5)
        .map((p) => ({
          id: p._id || p.id,
          name: p.name,
          quantity: p.quantity || 0,
          category: p.category || "Uncategorized",
          lowStockThreshold: p.lowStockThreshold || 5
        }))
    }
    
    // Fallback to filtering from all products
    return products
      .filter((p) => (p.quantity || 0) <= (p.lowStockThreshold || 5))
      .sort((a, b) => (a.quantity || 0) - (b.quantity || 0))
      .slice(0, 5)
      .map((p) => ({
        id: p._id || p.id,
        name: p.name,
        quantity: p.quantity || 0,
        category: p.category || "Uncategorized",
        lowStockThreshold: p.lowStockThreshold || 5
      }))
  }

  const getRecentSales = () => {
    return [...sales]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5)
  }

  const getRecentPurchases = () => {
    return vouchers
      .filter((v) => v.type === "CPV" || v.type === "BPV")
      .sort((a, b) => new Date(b.voucherDate || b.date) - new Date(a.voucherDate || a.date))
      .slice(0, 5)
      .map((v) => ({
        id: v._id || v.id,
        voucherNo: v.voucherNo || "N/A",
        date: new Date(v.voucherDate || v.date).toLocaleDateString(),
        description: v.description || v.entries?.[0]?.accountName || "Purchase",
        amount: v.entries?.reduce((sum, e) => sum + (e.debit || 0), 0) || v.totalAmount || 0,
        type: v.type || "CPV"
      }))
  }

  const kpis = calculateKPIs()
  const topProducts = getTopProducts()
  const dailyData = getDailyData()
  const categoryData = getCategoryDistribution()
  const lowStockItems = getLowStockItems()
  const recentSales = getRecentSales()
  const recentPurchases = getRecentPurchases()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-20 w-20 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 shadow-2xl shadow-violet-500/50 mb-6">
            <RefreshCw className="h-10 w-10 animate-spin text-white" />
          </div>
          <p className="text-slate-600 font-semibold text-lg">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="mb-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
                Dashboard
              </h1>
              <p className="text-slate-600 text-lg">Real-time insights into your business performance</p>
            </div>

            {/* Date Range & Refresh Controls */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex gap-3">
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">
                    From
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-600 mb-2 uppercase tracking-wider">To</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-violet-500 focus:ring-4 focus:ring-violet-100 transition-all"
                  />
                </div>
              </div>
              <div className="flex items-end">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:shadow-lg hover:shadow-violet-500/50 disabled:opacity-50 transition-all flex items-center gap-2 font-semibold"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-6 flex items-center gap-3 bg-red-50 border-2 border-red-200 px-5 py-4 rounded-xl">
              <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span className="text-sm text-red-700 font-medium">{error}</span>
            </div>
          )}
        </div>

        {/* KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {/* Stock Value Card */}
          <div
            onClick={() => handleTabChange("stock")}
            className="group bg-white border-2 border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-violet-400 hover:shadow-2xl hover:shadow-violet-200/50 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Stock Value</p>
                <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(kpis.totalStockValue)}</h3>
              </div>
              <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform">
                <Package className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              {kpis.lowStockCount > 0 ? (
                <>
                  <div className="p-1.5 bg-red-100 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                  </div>
                  <span className="text-sm text-red-600 font-semibold">{kpis.lowStockCount} items low stock</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <span className="text-sm text-emerald-600 font-semibold">All stock optimal</span>
                </>
              )}
            </div>
          </div>

          {/* Total Sales Card */}
          <div
            onClick={() => handleTabChange("sales")}
            className="group bg-white border-2 border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-cyan-400 hover:shadow-2xl hover:shadow-cyan-200/50 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Sales</p>
                <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(kpis.totalSales)}</h3>
              </div>
              <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/30 group-hover:scale-110 transition-transform">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              <span className="text-slate-600 font-medium">{sales.length} transactions</span>
            </div>
          </div>

          {/* Total Purchases Card */}
          <div className="group bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-amber-400 hover:shadow-2xl hover:shadow-amber-200/50 transition-all duration-300 hover:-translate-y-1">
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Purchases</p>
                <h3 className="text-3xl font-bold text-slate-800">{formatCurrency(kpis.totalPurchases)}</h3>
              </div>
              <div className="p-3 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-500/30 group-hover:scale-110 transition-transform">
                <ShoppingBag className="h-6 w-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-slate-400" />
              <span className="text-slate-600 font-medium">
                {vouchers.filter((v) => v.type === "CPV" || v.type === "BPV").length} vouchers
              </span>
            </div>
          </div>

          {/* Net Profit Card */}
          <div
            onClick={() => handleTabChange("reports")}
            className="group bg-white border-2 border-slate-200 rounded-2xl p-6 cursor-pointer hover:border-emerald-400 hover:shadow-2xl hover:shadow-emerald-200/50 transition-all duration-300 hover:-translate-y-1"
          >
            <div className="flex justify-between items-start mb-5">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Net Profit</p>
                <h3 className={`text-3xl font-bold ${kpis.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCurrency(kpis.netProfit)}
                </h3>
              </div>
              <div className={`p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform ${
                kpis.netProfit >= 0 
                  ? "bg-gradient-to-br from-emerald-500 to-green-600 shadow-emerald-500/30" 
                  : "bg-gradient-to-br from-red-500 to-rose-600 shadow-red-500/30"
              }`}>
                {kpis.netProfit >= 0 ? (
                  <TrendingUp className="h-6 w-6 text-white" />
                ) : (
                  <TrendingDown className="h-6 w-6 text-white" />
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className={`h-4 w-4 ${kpis.netProfit >= 0 ? "text-emerald-500" : "text-red-500"}`} />
              <span className={`text-sm font-semibold ${kpis.netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                {kpis.totalSales > 0 ? ((kpis.totalProfit / kpis.totalSales) * 100).toFixed(1) : "0.0"}% margin
              </span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Daily Performance Chart - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white border-2 border-slate-200 rounded-2xl p-7 shadow-lg">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-1">Daily Performance</h3>
              <p className="text-sm text-slate-500">Sales and profit trends over the last 7 days</p>
            </div>
            <div className="h-80">
              {dailyData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" stroke="#64748b" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <YAxis stroke="#64748b" style={{ fontSize: '12px', fontWeight: 600 }} />
                    <Tooltip
                      contentStyle={{ 
                        backgroundColor: "white", 
                        border: "2px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
                      }}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                    <Line
                      type="monotone"
                      dataKey="sales"
                      stroke="#06b6d4"
                      strokeWidth={3}
                      dot={{ fill: "#06b6d4", r: 5 }}
                      activeDot={{ r: 7 }}
                      fillOpacity={1}
                      fill="url(#colorSales)"
                    />
                    <Line
                      type="monotone"
                      dataKey="profit"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ fill: "#8b5cf6", r: 5 }}
                      activeDot={{ r: 7 }}
                      fillOpacity={1}
                      fill="url(#colorProfit)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 font-medium">
                  No sales data available
                </div>
              )}
            </div>
          </div>

          {/* Category Distribution - 1 column */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-7 shadow-lg">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-slate-800 mb-1">Stock Distribution</h3>
              <p className="text-sm text-slate-500">Value by category</p>
            </div>
            <div className="h-80">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 font-medium">
                  No category data
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Top Products Chart */}
        <div className="bg-white border-2 border-slate-200 rounded-2xl p-7 shadow-lg mb-10">
          <div className="mb-6">
            <h3 className="text-xl font-bold text-slate-800 mb-1">Top Selling Products</h3>
            <p className="text-sm text-slate-500">Best performing products by revenue</p>
          </div>
          <div className="h-80">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topProducts} margin={{ top: 5, right: 30, left: 0, bottom: 80 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="name" 
                    angle={-45} 
                    textAnchor="end" 
                    height={100} 
                    stroke="#64748b"
                    style={{ fontSize: '12px', fontWeight: 600 }}
                  />
                  <YAxis stroke="#64748b" style={{ fontSize: '12px', fontWeight: 600 }} />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: "white", 
                      border: "2px solid #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 10px 40px rgba(0,0,0,0.1)"
                    }}
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                    {topProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 font-medium">
                No sales data available
              </div>
            )}
          </div>
        </div>

        {/* Recent Activities Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Low Stock Items */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 rounded-xl">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Low Stock Alert</h3>
                  <p className="text-xs text-slate-500">Items needing restock</p>
                </div>
              </div>
              <button
                onClick={() => handleTabChange("stock")}
                className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1"
              >
                View All
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            {lowStockItems.length > 0 ? (
              <div className="space-y-3">
                {lowStockItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-100 hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm mb-0.5">{item.name}</p>
                      <p className="text-xs text-slate-500">{item.category}</p>
                      <p className="text-xs text-red-600 mt-1">
                        Threshold: {item.lowStockThreshold} units
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-red-600 font-bold text-lg">{item.quantity}</span>
                      <p className="text-xs text-slate-500">units left</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <CheckCircle2 className="h-12 w-12 mb-2" />
                <p className="font-medium">No low stock items</p>
              </div>
            )}
          </div>

          {/* Recent Sales */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-100 rounded-xl">
                  <ShoppingCart className="h-5 w-5 text-cyan-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Recent Sales</h3>
                  <p className="text-xs text-slate-500">Latest transactions</p>
                </div>
              </div>
              <button
                onClick={() => handleTabChange("sales")}
                className="text-xs font-bold text-violet-600 hover:text-violet-700 transition-colors flex items-center gap-1"
              >
                View All
                <ArrowUpRight className="h-3 w-3" />
              </button>
            </div>
            {recentSales.length > 0 ? (
              <div className="space-y-3">
                {recentSales.map((sale) => (
                  <div
                    key={sale.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl border border-cyan-100 hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <p className="font-semibold text-slate-800 text-sm mb-0.5">
                        {sale.product?.name || "Unknown"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {new Date(sale.date).toLocaleDateString()} · {sale.quantity} units
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-cyan-600 font-bold text-sm">
                        {formatCurrency(sale.totalAmount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <XCircle className="h-12 w-12 mb-2" />
                <p className="font-medium">No recent sales</p>
              </div>
            )}
          </div>

          {/* Recent Purchases */}
          <div className="bg-white border-2 border-slate-200 rounded-2xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-100 rounded-xl">
                  <ShoppingBag className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Recent Purchases</h3>
                  <p className="text-xs text-slate-500">Latest purchase orders</p>
                </div>
              </div>
            </div>
            {recentPurchases.length > 0 ? (
              <div className="space-y-3">
                {recentPurchases.map((purchase) => (
                  <div
                    key={purchase.id}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100 hover:shadow-md transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-slate-800 text-sm">
                          {purchase.voucherNo}
                        </p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          purchase.type === 'CPV' 
                            ? 'bg-blue-100 text-blue-700' 
                            : 'bg-green-100 text-green-700'
                        }`}>
                          {purchase.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        {purchase.date}
                      </p>
                      <p className="text-xs text-slate-600 mt-1 line-clamp-1">
                        {purchase.description}
                      </p>
                    </div>
                    <div className="text-right ml-3">
                      <span className="text-amber-600 font-bold text-sm">
                        {formatCurrency(purchase.amount)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <XCircle className="h-12 w-12 mb-2" />
                <p className="font-medium">No recent purchases</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats Footer */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-violet-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl shadow-violet-500/30">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold uppercase tracking-wider opacity-90">Total Products</h4>
              <Package className="h-6 w-6 opacity-80" />
            </div>
            <p className="text-4xl font-bold mb-2">{products.length}</p>
            <p className="text-sm opacity-80">Active items in inventory</p>
          </div>

          <div className="bg-gradient-to-br from-amber-600 to-orange-600 rounded-2xl p-6 text-white shadow-xl shadow-amber-500/30">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold uppercase tracking-wider opacity-90">Total Purchases</h4>
              <ShoppingBag className="h-6 w-6 opacity-80" />
            </div>
            <p className="text-4xl font-bold mb-2">{formatCurrency(kpis.totalPurchases)}</p>
            <p className="text-sm opacity-80">Current inventory value</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-600 to-green-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-500/30">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold uppercase tracking-wider opacity-90">Profit Margin</h4>
              <TrendingUp className="h-6 w-6 opacity-80" />
            </div>
            <p className="text-4xl font-bold mb-2">
              {kpis.totalSales > 0 ? ((kpis.totalProfit / kpis.totalSales) * 100).toFixed(1) : "0.0"}%
            </p>
            <p className="text-sm opacity-80">Average margin</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard