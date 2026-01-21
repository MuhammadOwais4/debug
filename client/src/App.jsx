"use client";

import { useState, useEffect, useRef } from "react";
import StockManagement from "@/pages/stock-management/stock-management";
import SalesTracking from "@/pages/sales-tracking/sales-tracking";
import Reports from "@/pages/reports//Business-reports/Business-reports";
import Notifications from "@/components/components/notifications";
import BalanceSheet from "./pages/reports/Balance-sheet/Balance-sheet";
import ProfitLoss from "@/pages/reports/Profit-Loss/Profit-Loss.jsx";

// Chart of Accounts Pages
import AssetsPage from "@/pages/chart-of-accounts/assets-page";
import LiabilitiesPage from "@/pages/chart-of-accounts/liabilities-page";
import EquityPage from "@/pages/chart-of-accounts/equity-page";
import ExpensesPage from "@/pages/chart-of-accounts/expenses-page";
import RevenuePage from "@/pages/chart-of-accounts/revenue-page";

// Accounts Pages
import CashPaymentVoucher from "@/pages/Accounts/Cash-Payment-Voucher/Cash-Payment-Voucher";
import CashReceiptVoucher from "@/pages/Accounts/Cash-Receipt-Voucher/Cash-Receipt-Voucher";
import JournalVoucher from "@/pages/Accounts/Journal-Voucher/Journal-Voucher";
import BankPaymentVoucher from "@/pages/Accounts/Bank-Payment-Voucher/Bank-Payment-Voucher";
import BankReceiptVoucher from "@/pages/Accounts/Bank-Receipt-Voucher/Bank-Receipt-Voucher";
import GeneralLedger from "@/pages/Accounts/Genreal-Leager/Genreal-Leager";
import TrialBalance from "@/pages/Accounts/TrialBalance/TrialBalance";
import VoucherQuery from "@/pages/Accounts/Voucher-Query/Voucher-Query";
import Dashboard from "@/pages/Dashboard/Dashboard.jsx";
import SalesDiscountVouchers from "./pages/Accounts/Sales-Discount-Vouchers/Sales-Discount-Vouchers";
import PurchaseDiscountVouchers from "./pages/Accounts/Purchase-Discount-Vouchers/Purchase-Discount-Vouchers"
import ProductManagementDashboard from "./pages/Product Management/Product-Management";

// Sample initial data
const initialProducts = [];
const initialExpenses = [];
const initialSales = [];

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [chartOfAccountsPage, setChartOfAccountsPage] = useState("assets"); // Default to assets
  const [products, setProducts] = useState(initialProducts);
  const [expenses, setExpenses] = useState(initialExpenses);
  const [sales, setSales] = useState(initialSales);
  const [notifications, setNotifications] = useState([]);
  const [accountsDropdownOpen, setAccountsDropdownOpen] = useState(false);
  const [chartOfAccountsDropdownOpen, setChartOfAccountsDropdownOpen] = useState(false);
  const [reportsDropdownOpen, setReportsDropdownOpen] = useState(false);

  const accountsDropdownRef = useRef(null);
  const chartDropdownRef = useRef(null);
const reportsDropdownRef = useRef(null);
  useEffect(() => {
    const lowStockItems = products.filter((product) => product.quantity < 5);
    if (lowStockItems.length > 0) {
      const lowStockNotifications = lowStockItems.map((item) => ({
        id: `lowStock-${item.id}`,
        type: "lowStock",
        message: `Low stock alert: ${item.name} (${item.quantity} remaining)`,
        date: new Date().toISOString(),
      }));
      setNotifications(lowStockNotifications);
    }
  }, [products]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (accountsDropdownRef.current && !accountsDropdownRef.current.contains(event.target)) {
        setAccountsDropdownOpen(false);
      }
      if (chartDropdownRef.current && !chartDropdownRef.current.contains(event.target)) {
        setChartOfAccountsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleStockUpdate = (updatedProducts) => setProducts(updatedProducts);
  const handleExpenseUpdate = (updatedExpenses) => setExpenses(updatedExpenses);
  const handleSaleUpdate = (updatedSales) => setSales(updatedSales);

  const handleNotification = (notification) => {
    const exists = notifications.some(
      (n) => n.type === notification.type && n.id === notification.id
    );
    if (!exists) {
      setNotifications((prev) => [notification, ...prev]);
    }
  };

  const dismissNotification = (id) => {
    setNotifications(notifications.filter((n) => n.id !== id));
  };

  const handleChartOfAccountsNavigation = (page) => {
    setChartOfAccountsPage(page);
  };

  if (reportsDropdownRef.current && !reportsDropdownRef.current.contains(event.target)) {
  setReportsDropdownOpen(false);
}
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "chart-of-accounts") {
      // Default to assets page when Chart of Accounts is clicked
      setChartOfAccountsPage("assets");
    }
  };

  const handleChartOfAccountsPageChange = (page) => {
    setChartOfAccountsPage(page);
    setActiveTab("chart-of-accounts");
    setChartOfAccountsDropdownOpen(false);
  };

  const getChartOfAccountsDisplayName = () => {
    switch (chartOfAccountsPage) {
      case "assets":
        return "Assets";
      case "liabilities":
        return "Liabilities";
      case "equity":
        return "Equity";
      case "expenses":
        return "Expenses";
      case "revenue":
        return "Revenue";
      default:
        return "Chart of Accounts";
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Accounting Software
          </h1>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`${
                activeTab === "dashboard"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => handleTabChange("dashboard")}
            >
              Dashboard
            </button>
            <button
              className={`${
                activeTab === "stock"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => handleTabChange("stock")}
            >
              Goods Receipt Note 
            </button>
            <button
              className={`${
                activeTab === "sales"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
              onClick={() => handleTabChange("sales")}
            >
              Sales Tracking
            </button>
          <div className="relative">
  <button
    className={`${
      ["Trial Balance", "Balance Sheet", "ProfitLoss"].includes(activeTab)
        ? "border-blue-500 text-blue-600"
        : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
    } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-1`}
    onClick={() => setReportsDropdownOpen((prev) => !prev)}
  >
    <span>Reports</span>
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {reportsDropdownOpen && (
    <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-10">
      <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("General Ledger");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                    General Ledger
                  </button>
    <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("Trial Balance");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                   Trial Balance
                  </button>
      <button
        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        onClick={() => {
          handleTabChange("Balance Sheet");
          setReportsDropdownOpen(false);
        }}
      >
        Balance Sheet
      </button>
      <button
        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        onClick={() => {
          handleTabChange("ProfitLoss");
          setReportsDropdownOpen(false);
        }}
      >
        Profit and Loss
      </button>
        <button
        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        onClick={() => {
          handleTabChange("reports");
          setReportsDropdownOpen(false);
        }}
      >
       Business reports
      </button>
      <button 
        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
        onClick={() => {
          handleTabChange("Product Management");
          setReportsDropdownOpen(false);
        }}
      >
       Product Management
      </button>
      
    </div>
  )}
</div>
            

            {/* Chart of Accounts Dropdown */}
            <div className="relative" ref={chartDropdownRef}>
              <button
                className={`${
                  activeTab === "chart-of-accounts"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-1`}
                onClick={() => {
                  handleTabChange("chart-of-accounts");
                  setChartOfAccountsDropdownOpen((prev) => !prev);
                }}
              >
                <span>{getChartOfAccountsDisplayName()}</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {chartOfAccountsDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-10">
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      chartOfAccountsPage === "assets" ? "bg-blue-50 text-blue-700" : "text-gray-700"
                    }`}
                    onClick={() => handleChartOfAccountsPageChange("assets")}
                  >
                    Assets
                  </button>
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      chartOfAccountsPage === "liabilities" ? "bg-blue-50 text-blue-700" : "text-gray-700"
                    }`}
                    onClick={() => handleChartOfAccountsPageChange("liabilities")}
                  >
                    Liabilities
                  </button>
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      chartOfAccountsPage === "equity" ? "bg-blue-50 text-blue-700" : "text-gray-700"
                    }`}
                    onClick={() => handleChartOfAccountsPageChange("equity")}
                  >
                    Equity
                  </button>
                  <button
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      chartOfAccountsPage === "revenue" ? "bg-blue-50 text-blue-700" : "text-gray-700"
                    }`}
                    onClick={() => handleChartOfAccountsPageChange("revenue")}
                  >
                    Revenue
                  </button>
                   <button
                    className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      chartOfAccountsPage === "expenses" ? "bg-blue-50 text-blue-700" : "text-gray-700"
                    }`}
                    onClick={() => handleChartOfAccountsPageChange("expenses")}
                  >
                    Expenses
                  </button>
                </div>
              )}
            </div>

            {/* Accounts Dropdown */}
            <div className="relative" ref={accountsDropdownRef}>
              <button
                className={`${
                  ["Cash Payment Voucher", "Cash Receipt Voucher", "Journal Voucher", "Bank Payment Voucher", "Bank Receipt Voucher", "General Ledger"].includes(activeTab)
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-1`}
                onClick={() => setAccountsDropdownOpen((prev) => !prev)}
              >
                <span>Accounts</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {accountsDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white border border-gray-200 rounded shadow-lg z-10">
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("Cash Payment Voucher");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                    Cash Payment Voucher
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("Cash Receipt Voucher");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                    Cash Receipt Voucher
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("Journal Voucher");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                    Journal Voucher
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("Bank Payment Voucher");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                    Bank Payment Voucher
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("Bank Receipt Voucher");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                    Bank Receipt Voucher
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("purchase discoiunt Voucher");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                    Purchase Discount Voucher 
                  </button>
                  <button 
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("sales discount Voucher");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                    Sales Discount Voucher 
                  </button>
                  <button
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      handleTabChange("Voucher Query");
                      setAccountsDropdownOpen(false);
                    }}
                  >
                   Voucher Query
                  </button>
                 
                </div>
              )}
            </div>

            <button
              className={`${
                activeTab === "notifications"
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm relative`}
              onClick={() => handleTabChange("notifications")}
            >
              Notifications
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        {activeTab === "dashboard" && (
          <Dashboard
            products={products || []}
            expenses={expenses || []}
            sales={sales || []}
            notifications={notifications || []}
            onTabChange={handleTabChange}
          />
        )}
        {activeTab === "stock" && (
          <StockManagement
            onStockUpdate={handleStockUpdate}
            onNotification={handleNotification}
          />
        )}
        {activeTab === "expenses" && (
          <ExpenseTracking
            onExpenseUpdate={handleExpenseUpdate}
            onNotification={handleNotification}
          />
        )}
        {activeTab === "sales" && (
          <SalesTracking
            products={products}
            onSaleComplete={handleSaleUpdate}
            onNotification={handleNotification}
          />
        )}
        {activeTab === "reports" && (
          <Reports products={products} expenses={expenses} sales={sales} />         
        )}

        {activeTab === "chart-of-accounts" && (
          <>
            {chartOfAccountsPage === "assets" && (
              <AssetsPage onBack={() => handleChartOfAccountsPageChange("assets")} />
            )}
            {chartOfAccountsPage === "liabilities" && (
              <LiabilitiesPage onBack={() => handleChartOfAccountsPageChange("liabilities")} />
            )}
            {chartOfAccountsPage === "equity" && (
              <EquityPage onBack={() => handleChartOfAccountsPageChange("equity")} />
            )}
            {chartOfAccountsPage === "expenses" && (
              <ExpensesPage onBack={() => handleChartOfAccountsPageChange("expenses")} />
            )}
            {chartOfAccountsPage === "revenue" && (
              <RevenuePage onBack={() => handleChartOfAccountsPageChange("revenue")} />
            )}
          </>
        )}

        {activeTab === "Cash Payment Voucher" && <CashPaymentVoucher />}
        {activeTab === "Cash Receipt Voucher" && <CashReceiptVoucher />}
        {activeTab === "Journal Voucher" && <JournalVoucher />}
        {activeTab === "Bank Payment Voucher" && <BankPaymentVoucher />}
        {activeTab === "Bank Receipt Voucher" && <BankReceiptVoucher />}
        {activeTab === "General Ledger" && <GeneralLedger />}
        {activeTab === "Trial Balance" && <TrialBalance />}
        {activeTab === "Voucher Query" && <VoucherQuery/>}
        {activeTab === "Balance Sheet" && <BalanceSheet />}
        {activeTab === "ProfitLoss" && <ProfitLoss />}
        {activeTab === "sales discount Voucher" && <SalesDiscountVouchers />}
        {activeTab === "purchase discoiunt Voucher" && <PurchaseDiscountVouchers />}
        {activeTab === "Product Management" && <ProductManagementDashboard />}
      
        

        {activeTab === "notifications" && (
          <Notifications
            notifications={notifications}
            onDismiss={dismissNotification}
          />
        )}
      </main>
    </div>
  );
}