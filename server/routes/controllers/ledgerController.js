const Asset = require("../models/chart-of-accounts/Asset")
const Equity = require("../models/chart-of-accounts/Equity")
const Expense = require("../models/chart-of-accounts/Expense")
const Liability = require("../models/chart-of-accounts/Liability")
const Revenue = require("../models/chart-of-accounts/Revenue")
const Product = require("../models/Product")
const Sale = require("../models/Sale")
const Voucher = require("../models/Voucher")
const Ledger = require("../models/Leader") 

// ========== EXPORTED FUNCTIONS ==========

// Get all accounts from chart of accounts
const getAllAccounts = async (req, res) => {
  try {
    const [assets, equity, expenses, liabilities, revenue] = await Promise.all([
      Asset.find({ isActive: true }).select("code name type balance").lean(),
      Equity.find({ isActive: true }).select("code name type balance").lean(),
      Expense.find({ isActive: true }).select("code name type balance").lean(),
      Liability.find({ isActive: true }).select("code name type balance").lean(),
      Revenue.find({ isActive: true }).select("code name type balance").lean(),
    ])

    const allAccounts = [
      ...assets.map((acc) => ({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance: acc.balance || 0,
        fullName: `${acc.code} - ${acc.name}`,
        category: "Assets",
        normalBalance: "debit",
      })),
      ...equity.map((acc) => ({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance: acc.balance || 0,
        fullName: `${acc.code} - ${acc.name}`,
        category: "Equity",
        normalBalance: "credit",
      })),
      ...expenses.map((acc) => ({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance: acc.balance || 0,
        fullName: `${acc.code} - ${acc.name}`,
        category: "Expenses",
        normalBalance: "debit",
      })),
      ...liabilities.map((acc) => ({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance: acc.balance || 0,
        fullName: `${acc.code} - ${acc.name}`,
        category: "Liabilities",
        normalBalance: "credit",
      })),
      ...revenue.map((acc) => ({
        code: acc.code,
        name: acc.name,
        type: acc.type,
        balance: acc.balance || 0,
        fullName: `${acc.code} - ${acc.name}`,
        category: "Revenue",
        normalBalance: "credit",
      })),
    ]

    // Calculate actual closing balance from ALL ledger entries for each account
    for (const account of allAccounts) {
      try {
        const ledgerEntries = await Ledger.find({ accountCode: account.code })
          .sort({ date: 1, createdAt: 1 })
          .select("debit credit balance")
          .lean()
        
        if (ledgerEntries && ledgerEntries.length > 0) {
          const lastEntry = ledgerEntries[ledgerEntries.length - 1]
          account.balance = lastEntry.balance || 0
          console.log(`✅ ${account.code} - Balance: ${account.balance} (from ${ledgerEntries.length} entries)`)
        } else {
          console.log(`ℹ️ ${account.code} - No ledger entries, balance: 0`)
        }
      } catch (err) {
        console.error(`❌ Error fetching balance for ${account.code}:`, err.message)
      }
    }

    allAccounts.sort((a, b) => a.code.localeCompare(b.code))

    console.log(`\n📊 Returning ${allAccounts.length} accounts with updated balances`)

    res.status(200).json({
      success: true,
      count: allAccounts.length,
      data: allAccounts,
    })
  } catch (error) {
    console.error("Error fetching accounts:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching accounts",
      error: error.message,
    })
  }
}

// Get ledger entries for specific account
const getAccountLedger = async (req, res) => {
  try {
    const { accountCode, accountName, fromDate, toDate } = req.query

    if (!accountCode && !accountName) {
      return res.status(400).json({
        success: false,
        message: "Account code or name is required",
      })
    }

    if (!fromDate || !toDate) {
      return res.status(400).json({
        success: false,
        message: "From date and to date are required",
      })
    }

    const from = new Date(fromDate + "T00:00:00")
    const to = new Date(toDate + "T23:59:59")

    console.log("📊 Fetching ledger for:", { accountCode, accountName, fromDate, toDate })

    // Determine account normal balance
    let normalBalance = "debit"
    const accountInfo = await findAccountInfo(accountCode || accountName)
    if (accountInfo) {
      normalBalance = accountInfo.normalBalance
    }

    const finalAccountCode = accountInfo?.code || accountCode
    const finalAccountName = accountInfo?.name || accountName
    const accountCategory = accountInfo?.category || "Assets"

    const ledgerEntries = []
    let runningBalance = 0

    // ========== PROCESS VOUCHERS ==========
    const vouchers = await Voucher.find({
      voucherDate: { $gte: from, $lte: to },
      status: { $ne: "cancelled" },
    })
      .sort({ voucherDate: 1 })
      .lean()

    console.log(`✅ Found ${vouchers.length} vouchers`)

    vouchers.forEach((voucher) => {
      voucher.entries?.forEach((entry) => {
        const entryAccount = entry.account || ""
        const entryAccountCode = entry.accountCode || ""

        if (
          matchAccount(entryAccount, accountCode, accountName) ||
          matchAccount(entryAccountCode, accountCode, accountName)
        ) {
          const debitAmount = parseFloat(entry.debitAmount || 0)
          const creditAmount = parseFloat(entry.creditAmount || 0)

          if (normalBalance === "debit") {
            runningBalance += debitAmount - creditAmount
          } else {
            runningBalance += creditAmount - debitAmount
          }

          ledgerEntries.push({
            id: `voucher-${voucher._id}-${entry.serialNo}`,
            date: voucher.voucherDate,
            voucherNo: voucher.voucherNo,
            voucherType: voucher.voucherType,
            description: entry.description || voucher.narration || "No description",
            debit: debitAmount,
            credit: creditAmount,
            balance: runningBalance,
            grn: null,
            sourceId: voucher._id,
          })
        }
      })
    })

    // ========== PROCESS SALES ==========
    const sales = await Sale.find({
      createdAt: { $gte: from, $lte: to },
    }).lean()

    console.log(`✅ Found ${sales.length} sales`)

    const processedSaleIds = new Set()

    sales.forEach((sale) => {
      const customerName = sale.customerName || ""
      if (customerName.toLowerCase().includes("test")) {
        return
      }

      const amount = parseFloat(sale.totalAmount || 0)
      const saleId = `sale-${sale._id}`

      if (processedSaleIds.has(saleId)) {
        return
      }
      processedSaleIds.add(saleId)

      // Customer Account (DEBIT)
      if (matchAccount(customerName, accountCode, accountName)) {
        if (normalBalance === "debit") {
          runningBalance += amount
        } else {
          runningBalance -= amount
        }

        ledgerEntries.push({
          id: `${saleId}-customer`,
          date: sale.createdAt,
          voucherNo: sale.invoice || "N/A",
          voucherType: "Sale",
          description: `${sale.saleType} - ${sale.notes || "Sale"}`,
          debit: amount,
          credit: 0,
          balance: runningBalance,
          grn: null,
          sourceId: sale._id,
        })
      }

      // Revenue Account (CREDIT)
      const saleType = sale.saleType || ""
      if (matchAccount(saleType, accountCode, accountName)) {
        if (normalBalance === "debit") {
          runningBalance -= amount
        } else {
          runningBalance += amount
        }

        ledgerEntries.push({
          id: `${saleId}-revenue`,
          date: sale.createdAt,
          voucherNo: sale.invoice || "N/A",
          voucherType: "Sale",
          description: `Sale to ${customerName} - ${sale.notes || "Sale transaction"}`,
          debit: 0,
          credit: amount,
          balance: runningBalance,
          grn: null,
          sourceId: sale._id,
        })
      }
    })

    // ========== PROCESS SALE RETURNS ==========
    const salesWithReturns = await Sale.find({
      returnedQuantity: { $gt: 0 },
      "returnHistory.date": { $gte: from, $lte: to },
    })
      .populate("product")
      .lean()

    console.log(`✅ Found ${salesWithReturns.length} sales with returns`)

    salesWithReturns.forEach((sale) => {
      if (!sale.returnHistory || sale.returnHistory.length === 0) return

      sale.returnHistory.forEach((returnEntry) => {
        const returnDate = new Date(returnEntry.date)
        if (returnDate < from || returnDate > to) return

        const returnAmount = parseFloat(returnEntry.refundAmount || (returnEntry.quantity * sale.saleRate))
        const customerName = sale.customerName || ""
        const saleType = sale.saleType || ""

        // Sale Return Account (DEBIT) - Reverse of revenue
        if (matchAccount(saleType, accountCode, accountName)) {
          if (normalBalance === "debit") {
            runningBalance += returnAmount
          } else {
            runningBalance -= returnAmount
          }

          ledgerEntries.push({
            id: `sale-return-${sale._id}-${returnEntry._id}-revenue`,
            date: returnDate,
            voucherNo: sale.invoice || "N/A",
            voucherType: "Sale Return",
            description: `Return from ${customerName} - ${returnEntry.reason || "Sale return"}`,
            debit: returnAmount,
            credit: 0,
            balance: runningBalance,
            grn: null,
            sourceId: sale._id,
          })
        }

        // Customer Account (CREDIT) - Reverse of receivable
        if (matchAccount(customerName, accountCode, accountName)) {
          if (normalBalance === "debit") {
            runningBalance -= returnAmount
          } else {
            runningBalance += returnAmount
          }

          ledgerEntries.push({
            id: `sale-return-${sale._id}-${returnEntry._id}-customer`,
            date: returnDate,
            voucherNo: sale.invoice || "N/A",
            voucherType: "Sale Return",
            description: `Return: ${returnEntry.quantity} units - ${returnEntry.reason || "Sale return"}`,
            debit: 0,
            credit: returnAmount,
            balance: runningBalance,
            grn: null,
            sourceId: sale._id,
          })
        }
      })
    })

    // ========== PROCESS PRODUCTS (PURCHASES) ==========
    const products = await Product.find({
      createdAt: { $gte: from, $lte: to },
    })
      .populate("purchaseType", "name code")
      .populate("vendorName", "name code")
      .lean()

    console.log(`✅ Found ${products.length} products`)

    products.forEach((product) => {
      const amount = parseFloat(product.purchaseQuantity || 0) * parseFloat(product.purchaseRate || 0)

      if (amount <= 0) return

      const purchaseTypeName = product.purchaseType?.name || ""
      const purchaseTypeCode = product.purchaseType?.code || ""
      const vendorName = product.vendorName?.name || ""
      const vendorCode = product.vendorName?.code || ""

      // Purchase Type Account (DEBIT)
      if (
        matchAccount(purchaseTypeName, accountCode, accountName) ||
        matchAccount(purchaseTypeCode, accountCode, accountName)
      ) {
        if (normalBalance === "debit") {
          runningBalance += amount
        } else {
          runningBalance -= amount
        }

        const vendorDisplay = vendorName || "Vendor"

        ledgerEntries.push({
          id: `product-${product._id}-purchaseType`,
          date: product.createdAt,
          voucherNo: product.grn || "N/A",
          voucherType: "Purchase",
          description: `Purchase from ${vendorDisplay} - ${product.name}: ${product.purchaseQuantity} units @ Rs. ${product.purchaseRate}`,
          debit: amount,
          credit: 0,
          balance: runningBalance,
          grn: product.grn,
          sourceId: product._id,
        })
      }

      // Vendor Account (CREDIT)
      if (matchAccount(vendorName, accountCode, accountName) || matchAccount(vendorCode, accountCode, accountName)) {
        if (normalBalance === "debit") {
          runningBalance -= amount
        } else {
          runningBalance += amount
        }

        const purchaseTypeDisplay = purchaseTypeName || "Purchase"

        ledgerEntries.push({
          id: `product-${product._id}-vendor`,
          date: product.createdAt,
          voucherNo: product.grn || "N/A",
          voucherType: "Purchase",
          description: `${purchaseTypeDisplay} - ${product.name}: ${product.purchaseQuantity} units @ Rs. ${product.purchaseRate}`,
          debit: 0,
          credit: amount,
          balance: runningBalance,
          grn: product.grn,
          sourceId: product._id,
        })
      }
    })

    // ========== PROCESS PURCHASE RETURNS ==========
    const productsWithReturns = await Product.find({
      ReturnQuantity: { $gt: 0 },
      ReturnedDate: { $gte: from, $lte: to },
    })
      .populate("purchaseType", "name code")
      .populate("vendorName", "name code")
      .lean()

    console.log(`✅ Found ${productsWithReturns.length} purchase returns`)

    productsWithReturns.forEach((product) => {
      const returnAmount = parseFloat(product.ReturnedAmount || 0)
      if (returnAmount <= 0) return

      const purchaseTypeName = product.purchaseType?.name || ""
      const purchaseTypeCode = product.purchaseType?.code || ""
      const vendorName = product.vendorName?.name || ""
      const vendorCode = product.vendorName?.code || ""
      const returnDate = new Date(product.ReturnedDate)

      // Vendor Account (DEBIT) - Reverse of payable
      if (matchAccount(vendorName, accountCode, accountName) || matchAccount(vendorCode, accountCode, accountName)) {
        if (normalBalance === "debit") {
          runningBalance += returnAmount
        } else {
          runningBalance -= returnAmount
        }

        ledgerEntries.push({
          id: `purchase-return-${product._id}-vendor`,
          date: returnDate,
          voucherNo: product.grn || "N/A",
          voucherType: "Purchase Return",
          description: `Return to ${vendorName} - ${product.name}: ${product.ReturnQuantity} units @ Rs. ${product.purchaseRate}`,
          debit: returnAmount,
          credit: 0,
          balance: runningBalance,
          grn: product.grn,
          sourceId: product._id,
        })
      }

      // Purchase Return Account (CREDIT) - Reverse of purchase
      if (
        matchAccount(purchaseTypeName, accountCode, accountName) ||
        matchAccount(purchaseTypeCode, accountCode, accountName)
      ) {
        if (normalBalance === "debit") {
          runningBalance -= returnAmount
        } else {
          runningBalance += returnAmount
        }

        const vendorDisplay = vendorName || "Vendor"

        ledgerEntries.push({
          id: `purchase-return-${product._id}-purchaseType`,
          date: returnDate,
          voucherNo: product.grn || "N/A",
          voucherType: "Purchase Return",
          description: `Return to ${vendorDisplay} - ${product.name}: ${product.ReturnQuantity} units @ Rs. ${product.purchaseRate}`,
          debit: 0,
          credit: returnAmount,
          balance: runningBalance,
          grn: product.grn,
          sourceId: product._id,
        })
      }
    })

    // Sort by date
    ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date))

    // Recalculate running balance after sorting
    runningBalance = 0
    let serialNumber = 1
    
    const ledgerDocsToSave = []
    
    console.log(`\n📝 Preparing to save ledger entries...`)
    console.log(`Account: ${finalAccountCode} - ${finalAccountName}`)
    console.log(`Category: ${accountCategory}`)
    console.log(`Normal Balance: ${normalBalance}`)
    
    ledgerEntries.forEach((entry, idx) => {
      if (normalBalance === "debit") {
        runningBalance += entry.debit - entry.credit
      } else {
        runningBalance += entry.credit - entry.debit
      }
      entry.balance = runningBalance
      
      console.log(`Entry ${idx + 1}: Debit=${entry.debit}, Credit=${entry.credit}, Balance=${runningBalance}`)
      
      // Prepare document for saving to database
      const docToSave = {
        serialNumber: serialNumber++,
        date: entry.date,
        accountCode: finalAccountCode,
        accountName: finalAccountName,
        accountCategory: accountCategory,
        voucherNo: entry.voucherNo,
        voucherType: entry.voucherType,
        sourceType: entry.id.includes('voucher') ? 'Voucher' : 
                    entry.id.includes('sale-return') ? 'SaleReturn' :
                    entry.id.includes('sale') ? 'Sale' : 
                    entry.id.includes('purchase-return') ? 'PurchaseReturn' : 'Product',
        sourceId: entry.sourceId,
        grn: entry.grn || null,
        description: entry.description,
        debit: entry.debit,
        credit: entry.credit,
        balance: runningBalance,
        entryType: determineEntryType(entry.voucherType, entry.debit, entry.credit),
        isActive: true,
      }
      
      ledgerDocsToSave.push(docToSave)
    })
    
    console.log(`\n📦 Prepared ${ledgerDocsToSave.length} documents to save`)

    // Save all ledger entries to database
    try {
      console.log(`💾 Attempting to save ${ledgerDocsToSave.length} ledger entries...`)
      
      // First, delete existing ledger entries for this account and date range
      const deleteResult = await Ledger.deleteMany({
        accountCode: finalAccountCode,
        date: { $gte: from, $lte: to },
      })
      console.log(`🗑️ Deleted ${deleteResult.deletedCount} existing entries`)
      
      // Then insert new entries
      if (ledgerDocsToSave.length > 0) {
        const savedEntries = await Ledger.insertMany(ledgerDocsToSave)
        console.log(`✅ Successfully saved ${savedEntries.length} ledger entries to database`)
      } else {
        console.log(`⚠️ No entries to save`)
      }
    } catch (dbError) {
      console.error("❌ Error saving to database:", dbError)
      console.error("Error details:", {
        message: dbError.message,
        name: dbError.name,
        code: dbError.code
      })
      // Continue even if database save fails
    }

    const totalDebits = ledgerEntries.reduce((sum, entry) => sum + entry.debit, 0)
    const totalCredits = ledgerEntries.reduce((sum, entry) => sum + entry.credit, 0)

    console.log(`✅ Generated ${ledgerEntries.length} ledger entries`)
    console.log(`📊 Total Debits: ${totalDebits}, Total Credits: ${totalCredits}, Closing Balance: ${runningBalance}`)

    res.status(200).json({
      success: true,
      count: ledgerEntries.length,
      data: {
        entries: ledgerEntries,
        summary: {
          openingBalance: 0,
          totalDebits,
          totalCredits,
          closingBalance: runningBalance,
        },
      },
    })
  } catch (error) {
    console.error("Error fetching ledger entries:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching ledger entries",
      error: error.message,
    })
  }
}

// Helper: Match account
function matchAccount(value, code, name) {
  if (!value) return false

  const valueLower = value.toLowerCase().trim()
  const codeLower = code ? code.toLowerCase().trim() : ""
  const nameLower = name ? name.toLowerCase().trim() : ""

  return (
    valueLower === codeLower ||
    valueLower === nameLower ||
    valueLower.includes(codeLower) ||
    valueLower.includes(nameLower) ||
    codeLower.includes(valueLower) ||
    nameLower.includes(valueLower)
  )
}

// Helper: Find account info
async function findAccountInfo(accountIdentifier) {
  try {
    const [asset, equity, expense, liability, revenue] = await Promise.all([
      Asset.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
      Equity.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
      Expense.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
      Liability.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
      Revenue.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
    ])

    if (asset) return { ...asset, category: "Assets", normalBalance: "debit" }
    if (equity) return { ...equity, category: "Equity", normalBalance: "credit" }
    if (expense) return { ...expense, category: "Expenses", normalBalance: "debit" }
    if (liability) return { ...liability, category: "Liabilities", normalBalance: "credit" }
    if (revenue) return { ...revenue, category: "Revenue", normalBalance: "credit" }

    return null
  } catch (error) {
    console.error("Error finding account info:", error)
    return null
  }
}

// Helper: Determine entry type
function determineEntryType(voucherType, debit, credit) {
  if (voucherType === "Sale") {
    return debit > 0 ? "RECEIVABLE" : "REVENUE"
  } else if (voucherType === "Sale Return") {
    return debit > 0 ? "SALE_RETURN" : "RECEIVABLE_REVERSAL"
  } else if (voucherType === "Purchase") {
    return debit > 0 ? "PURCHASE" : "PAYABLE"
  } else if (voucherType === "Purchase Return") {
    return debit > 0 ? "PAYABLE_REVERSAL" : "PURCHASE_RETURN"
  } else if (voucherType === "CRV" || voucherType === "BRV") {
    return voucherType === "CRV" ? "CASH" : "BANK"
  } else if (voucherType === "CPV" || voucherType === "BPV") {
    return "EXPENSE"
  } else if (voucherType === "JV") {
    return "JOURNAL"
  }
  return "JOURNAL"
}

// ========== EXPORTS ==========
module.exports = {
  getAllAccounts,
  getAccountLedger,
}