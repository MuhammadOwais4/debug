import React, { useState, useEffect } from 'react';
import { Search, Package, AlertCircle, Calendar, Filter, X, ChevronDown, Loader, RefreshCw, AlertTriangle } from 'lucide-react';

// Real API Configuration
// const API_BASE_URL = 'http://localhost:5000/api';
const API_BASE_URL = 'https://debug-nxby.vercel.app/api';

const apiClient = {
  get: async (url) => {
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      
      return { data: await response.json() };
    } catch (error) {
      if (error.message.includes('Failed to fetch') || error.name === 'TypeError') {
        throw new Error('Cannot connect to server. Please check if the server is running at ' + API_BASE_URL);
      }
      throw error;
    }
  }
};

// API Service
const productAPI = {
  getProducts: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const url = params.toString() ? `/products?${params.toString()}` : "/products";
      console.log('Fetching products from:', url);
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error in getProducts:', error);
      throw error;
    }
  },

  getLowStockProducts: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const url = params.toString() ? `/products/filter/low-stock?${params.toString()}` : "/products/filter/low-stock";
      console.log('Fetching low stock products from:', url);
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error in getLowStockProducts:', error);
      throw error;
    }
  },

  getExpiringProducts: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const url = params.toString() ? `/products/filter/expiring?${params.toString()}` : "/products/filter/expiring";
      console.log('Fetching expiring products from:', url);
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error in getExpiringProducts:', error);
      throw error;
    }
  },

  getExpiredProducts: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const url = params.toString() ? `/products/filter/expired?${params.toString()}` : "/products/filter/expired";
      console.log('Fetching expired products from:', url);
      const response = await apiClient.get(url);
      return response.data;
    } catch (error) {
      console.error('Error in getExpiredProducts:', error);
      throw error;
    }
  },

  getProductCategories: async () => {
    try {
      console.log('Fetching categories');
      const response = await apiClient.get("/products/meta/categories");
      return response.data;
    } catch (error) {
      console.error('Error in getProductCategories:', error);
      throw error;
    }
  },
};

const ProductManagementDashboard = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showFilters, setShowFilters] = useState(false);
  
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    lowStock: '',
    vendorName: '',
  });

  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadProducts();
  }, [activeTab]);

  const loadCategories = async () => {
    try {
      const data = await productAPI.getProductCategories();
      console.log('Categories loaded:', data);
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    
    try {
      let data;
      
      // Build clean filters object based on active tab
      const cleanFilters = {};
      
      switch (activeTab) {
        case 'all':
          if (filters.search) cleanFilters.search = filters.search;
          if (filters.category) cleanFilters.category = filters.category;
          if (filters.vendorName) cleanFilters.vendorName = filters.vendorName;
          if (filters.lowStock === 'true') cleanFilters.lowStock = 'true';
          data = await productAPI.getProducts(cleanFilters);
          break;
          
        case 'lowStock':
          if (filters.search) cleanFilters.search = filters.search;
          if (filters.category) cleanFilters.category = filters.category;
          cleanFilters.threshold = 5;
          data = await productAPI.getLowStockProducts(cleanFilters);
          break;
          
        case 'expiring':
          if (filters.search) cleanFilters.search = filters.search;
          if (filters.category) cleanFilters.category = filters.category;
          cleanFilters.days = 30;
          data = await productAPI.getExpiringProducts(cleanFilters);
          break;
          
        case 'expired':
          if (filters.search) cleanFilters.search = filters.search;
          if (filters.category) cleanFilters.category = filters.category;
          data = await productAPI.getExpiredProducts(cleanFilters);
          break;
          
        default:
          data = await productAPI.getProducts(cleanFilters);
      }
      
      console.log('Products loaded:', data);
      
      if (Array.isArray(data)) {
        setProducts(data);
      } else if (data && data.products && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        console.warn('Unexpected data structure:', data);
        setProducts([]);
      }
    } catch (err) {
      console.error('Error loading products:', err);
      setError(err.message);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setFilters(prev => ({ ...prev, search: searchQuery }));
    setTimeout(loadProducts, 100);
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    loadProducts();
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      category: '',
      lowStock: '',
      vendorName: '',
    });
    setSearchQuery('');
    setTimeout(loadProducts, 100);
  };

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return { status: 'unknown', color: 'bg-gray-100 text-gray-800', text: 'No date' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return { status: 'expired', color: 'bg-red-100 text-red-800 border-red-200', text: 'Expired', icon: AlertTriangle };
    if (daysUntilExpiry === 0) return { status: 'today', color: 'bg-red-100 text-red-800 border-red-200', text: 'Expires Today', icon: AlertTriangle };
    if (daysUntilExpiry <= 3) return { status: 'critical', color: 'bg-orange-100 text-orange-800 border-orange-200', text: `${daysUntilExpiry}d left`, icon: AlertCircle };
    if (daysUntilExpiry <= 7) return { status: 'warning', color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: `${daysUntilExpiry}d left`, icon: AlertCircle };
    if (daysUntilExpiry <= 30) return { status: 'caution', color: 'bg-blue-100 text-blue-800 border-blue-200', text: `${daysUntilExpiry}d left`, icon: Calendar };
    return { status: 'good', color: 'bg-green-100 text-green-800 border-green-200', text: `${daysUntilExpiry}d left`, icon: Calendar };
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">Product Management</h1>
              <p className="text-slate-600">Monitor and manage your inventory efficiently</p>
            </div>
            <button
              onClick={loadProducts}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-lg shadow-sm">
          {[
            { id: 'all', label: 'All Products', icon: Package },
            { id: 'lowStock', label: 'Low Stock', icon: AlertCircle },
            { id: 'expiring', label: 'Expiring Soon', icon: Calendar },
            { id: 'expired', label: 'Expired', icon: AlertTriangle }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 md:px-4 md:py-3 rounded-md transition-all min-w-fit ${
                  activeTab === tab.id
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium text-xs md:text-base">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-col md:flex-row gap-3 mb-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by product name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              Search
            </button>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-6 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="pt-4 border-t border-slate-200">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Category</label>
                  <select
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
                
                {activeTab === 'all' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Stock Status</label>
                    <select
                      value={filters.lowStock}
                      onChange={(e) => handleFilterChange('lowStock', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All</option>
                      <option value="true">Low Stock Only</option>
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Vendor Name</label>
                  <input
                    type="text"
                    value={filters.vendorName}
                    onChange={(e) => handleFilterChange('vendorName', e.target.value)}
                    placeholder="Search vendor..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="mt-4 flex flex-col md:flex-row justify-end gap-2">
                <button
                  onClick={clearFilters}
                  className="flex items-center justify-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </button>
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-red-800 mb-1">Error Loading Products</h3>
                <p className="text-red-600 text-sm">{error}</p>
                <p className="text-red-500 text-xs mt-2">
                  API URL: {API_BASE_URL}
                </p>
                <button
                  onClick={loadProducts}
                  className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader className="w-8 h-8 text-blue-500 animate-spin mb-4" />
            <p className="text-slate-600">Loading products...</p>
          </div>
        )}

        {/* Products Grid */}
        {!loading && !error && products.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <Package className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-700 mb-2">No Products Found</h3>
            <p className="text-slate-500 mb-4">
              {activeTab === 'lowStock' && 'No low stock products found'}
              {activeTab === 'expiring' && 'No products are expiring soon'}
              {activeTab === 'expired' && 'No expired products found'}
              {activeTab === 'all' && 'No products available. Try adjusting your filters.'}
            </p>
            {(filters.search || filters.category || filters.vendorName) && (
              <button
                onClick={clearFilters}
                className="text-blue-500 hover:text-blue-600 underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {!loading && !error && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product) => {
              const expiryStatus = getExpiryStatus(product.expiryDate);
              const StatusIcon = expiryStatus.icon || Calendar;
              
              return (
                <div
                  key={product._id}
                  className="bg-white rounded-lg shadow-sm hover:shadow-lg transition-all p-6 border-2 border-slate-100 hover:border-blue-200"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-800 mb-1 truncate">
                        {product.name}
                      </h3>
                      <p className="text-sm text-slate-500">{product.grn || 'No GRN'}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap ml-2 border ${expiryStatus.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {expiryStatus.text}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Category</span>
                      <span className="text-sm font-medium text-slate-800">
                        {product.category || 'N/A'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Quantity</span>
                      <span className={`text-sm font-medium ${product.quantity < 5 ? 'text-orange-600' : 'text-slate-800'}`}>
                        {product.quantity || 0} units
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Purchase Rate</span>
                      <span className="text-sm font-medium text-slate-800">
                        Rs. {product.purchaseRate?.toFixed(2) || '0.00'}
                      </span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-slate-600">Sale Rate</span>
                      <span className="text-sm font-medium text-slate-800">
                        Rs. {product.saleRate?.toFixed(2) || '0.00'}
                      </span>
                    </div>

                    {product.vendorName && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-slate-600">Vendor</span>
                        <span className="text-sm font-medium text-slate-800">
                          {product.vendorName.name || 'N/A'}
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                      <span className="text-sm text-slate-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        Expires
                      </span>
                      <span className="text-sm font-medium text-slate-800">
                        {formatDate(product.expiryDate)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Results Summary */}
        {!loading && !error && products.length > 0 && (
          <div className="mt-6 text-center text-slate-600">
            Showing <span className="font-medium">{products.length}</span> product{products.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductManagementDashboard;