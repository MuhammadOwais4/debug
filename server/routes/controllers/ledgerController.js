const Asset = require("../models/chart-of-accounts/Asset")
const Equity = require("../models/chart-of-accounts/Equity")
const Expense = require("../models/chart-of-accounts/Expense")
const Liability = require("../models/chart-of-accounts/Liabilitys")
const Revenue = require("../models/chart-of-accounts/Revenue")
const Product = require("../models/Product")
const Sale = require("../models/Sale")
const Voucher = require("../models/Voucher")
const Ledger = require("../models/Leader")
const SaleDiscount = require("../models/Sale-discount")
const PurchasesDiscount = require("../models/Purchases-discount")
const { SupplierPaymentVoucher } = require("../models/Supplierpaymentvouchers")
const { CustomerReceiptVoucher } = require("../models/CustomerReceiptVoucher") 

// ═══════════════════════════════════════════════════════════════════════════════
// ✅ HARDCODED TAX ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════
const HARDCODED_TAX_ACCOUNTS = [
  {
    code: "TAX-0025", name: "Withholding Tax 0.25%",
    type: "TAX-EXPENSE", fullName: "TAX-0025 - Withholding Tax 0.25%",
    category: "Expenses", normalBalance: "debit", balance: 0, rate: 0.0025,
  },
  {
    code: "TAX-0050", name: "Withholding Tax 0.50%",
    type: "TAX-EXPENSE", fullName: "TAX-0050 - Withholding Tax 0.50%",
    category: "Expenses", normalBalance: "debit", balance: 0, rate: 0.005,
  },
  {
    code: "TAX-0100", name: "Withholding Tax 1%",
    type: "TAX-EXPENSE", fullName: "TAX-0100 - Withholding Tax 1%",
    category: "Expenses", normalBalance: "debit", balance: 0, rate: 0.01,
  },
  {
    code: "TAX-0025-PAY", name: "Withholding Tax 0.25% Payable",
    type: "TAX-PAYABLE", fullName: "TAX-0025-PAY - WHT 0.25% Payable",
    category: "Liabilities", normalBalance: "credit", balance: 0, rate: 0.0025,
  },
  {
    code: "TAX-0050-PAY", name: "Withholding Tax 0.50% Payable",
    type: "TAX-PAYABLE", fullName: "TAX-0050-PAY - WHT 0.50% Payable",
    category: "Liabilities", normalBalance: "credit", balance: 0, rate: 0.005,
  },
  {
    code: "TAX-0100-PAY", name: "Withholding Tax 1% Payable",
    type: "TAX-PAYABLE", fullName: "TAX-0100-PAY - WHT 1% Payable",
    category: "Liabilities", normalBalance: "credit", balance: 0, rate: 0.01,
  },
]

const TAX_ACCOUNT_MAP = {}
HARDCODED_TAX_ACCOUNTS.forEach(t => { TAX_ACCOUNT_MAP[t.code] = t })

function isTaxAccount(code, name) {
  const c = (code || "").toUpperCase()
  const n = (name || "").toLowerCase()
  return HARDCODED_TAX_ACCOUNTS.some(
    t => t.code === c || t.name.toLowerCase() === n
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ledgers/accounts
// ═══════════════════════════════════════════════════════════════════════════════
const getAllAccounts = async (req, res) => {
  try {
    const [assets, equity, expenses, liabilities, revenue] = await Promise.all([
      Asset.find({ isActive: true }).select("code name type balance").lean(),
      Equity.find({ isActive: true }).select("code name type balance").lean(),
      Expense.find({ isActive: true }).select("code name type balance").lean(),
      Liability.find({ isActive: true }).select("code name type balance").lean(),
      Revenue.find({ isActive: true }).select("code name type balance").lean(),
    ])

    const saleDiscountCount     = await SaleDiscount.countDocuments()
    const purchaseDiscountCount = await PurchasesDiscount.countDocuments()

    const allAccounts = [
      ...assets.map(acc => ({
        code: acc.code, name: acc.name, type: acc.type,
        balance: acc.balance || 0, fullName: `${acc.code} - ${acc.name}`,
        category: "Assets", normalBalance: "debit",
      })),
      ...equity.map(acc => ({
        code: acc.code, name: acc.name, type: acc.type,
        balance: acc.balance || 0, fullName: `${acc.code} - ${acc.name}`,
        category: "Equity", normalBalance: "credit",
      })),
      ...expenses.map(acc => ({
        code: acc.code, name: acc.name, type: acc.type,
        balance: acc.balance || 0, fullName: `${acc.code} - ${acc.name}`,
        category: "Expenses", normalBalance: "debit",
      })),
      ...liabilities.map(acc => ({
        code: acc.code, name: acc.name, type: acc.type,
        balance: acc.balance || 0, fullName: `${acc.code} - ${acc.name}`,
        category: "Liabilities", normalBalance: "credit",
      })),
      ...revenue.map(acc => ({
        code: acc.code, name: acc.name, type: acc.type,
        balance: acc.balance || 0, fullName: `${acc.code} - ${acc.name}`,
        category: "Revenue", normalBalance: "credit",
      })),
    ]

    if (saleDiscountCount > 0) {
      allAccounts.push({
        code: "SALES-DISC", name: "SALES DISCOUNT", type: "SALES DISCOUNT",
        balance: 0, fullName: "SALES-DISC - SALES DISCOUNT",
        category: "Expenses", normalBalance: "debit",
      })
    }
    if (purchaseDiscountCount > 0) {
      allAccounts.push({
        code: "PURCH-DISC", name: "PURCHASES DISCOUNT", type: "PURCHASES DISCOUNT",
        balance: 0, fullName: "PURCH-DISC - PURCHASES DISCOUNT",
        category: "Revenue", normalBalance: "credit",
      })
    }

    // Check SPV tax usage
    const spvWithTax = await SupplierPaymentVoucher.find(
      { taxRate: { $gt: 0 } },
      { taxRate: 1, _id: 0 }
    ).lean()
    const spvUsedRates = new Set(spvWithTax.map(r => parseFloat(r.taxRate)))

    // ✅ Also check CRV tax usage
    const crvWithTax = await CustomerReceiptVoucher.find(
      { taxRate: { $gt: 0 } },
      { taxRate: 1, _id: 0 }
    ).lean()
    const crvUsedRates = new Set(crvWithTax.map(r => parseFloat(r.taxRate)))

    // Add WHT accounts if either SPV or CRV has tax entries
    if (spvUsedRates.size > 0 || crvUsedRates.size > 0) {
      HARDCODED_TAX_ACCOUNTS.forEach(taxAcc => allAccounts.push({ ...taxAcc }))
      console.log(`✅ Adding ${HARDCODED_TAX_ACCOUNTS.length} hardcoded WHT accounts`)
    }

    // Update balances from Ledger
    for (const account of allAccounts) {
      try {
        const searchCriteria =
          account.code === "SALES-DISC" || account.code === "PURCH-DISC"
            ? { $or: [{ accountName: account.name }, { accountCode: account.code }] }
            : { accountCode: account.code }

        const ledgerEntries = await Ledger.find(searchCriteria)
          .sort({ date: 1, createdAt: 1 })
          .select("debit credit balance")
          .lean()

        if (ledgerEntries.length > 0) {
          account.balance = ledgerEntries[ledgerEntries.length - 1].balance || 0
          console.log(`✅ ${account.code} — Balance: ${account.balance} (${ledgerEntries.length} entries)`)
        } else {
          console.log(`ℹ️ ${account.code} — No ledger entries, balance: 0`)
        }
      } catch (err) {
        console.error(`❌ Balance error for ${account.code}:`, err.message)
      }
    }

    allAccounts.sort((a, b) => a.code.localeCompare(b.code))
    console.log(`\n📊 Returning ${allAccounts.length} accounts`)

    res.status(200).json({ success: true, count: allAccounts.length, data: allAccounts })
  } catch (error) {
    console.error("Error fetching accounts:", error)
    res.status(500).json({ success: false, message: "Error fetching accounts", error: error.message })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/ledgers/account-ledger
// ═══════════════════════════════════════════════════════════════════════════════
const getAccountLedger = async (req, res) => {
  try {
    const { accountCode, accountName, fromDate, toDate } = req.query

    if (!accountCode && !accountName)
      return res.status(400).json({ success: false, message: "Account code or name is required" })
    if (!fromDate || !toDate)
      return res.status(400).json({ success: false, message: "From date and to date are required" })

    const from = new Date(fromDate + "T00:00:00")
    const to   = new Date(toDate   + "T23:59:59")

    console.log("📊 Fetching ledger for:", { accountCode, accountName, fromDate, toDate })

    const isDiscountAccount =
      accountCode === "SALES-DISC" || accountCode === "PURCH-DISC" ||
      accountName === "SALES DISCOUNT" || accountName === "PURCHASES DISCOUNT"

    const isTaxAcc = isTaxAccount(accountCode, accountName)
    const taxAccInfo = isTaxAcc
      ? HARDCODED_TAX_ACCOUNTS.find(
          t => t.code === (accountCode || "").toUpperCase() ||
               t.name.toLowerCase() === (accountName || "").toLowerCase()
        )
      : null

    let normalBalance    = "debit"
    let finalAccountCode = accountCode
    let finalAccountName = accountName
    let accountCategory  = "Assets"

    if (isTaxAcc && taxAccInfo) {
      normalBalance    = taxAccInfo.normalBalance
      finalAccountCode = taxAccInfo.code
      finalAccountName = taxAccInfo.name
      accountCategory  = taxAccInfo.category
    } else {
      const accountInfo = await findAccountInfo(accountCode || accountName)
      if (accountInfo) {
        normalBalance    = accountInfo.normalBalance
        finalAccountCode = accountInfo.code     || accountCode
        finalAccountName = accountInfo.name     || accountName
        accountCategory  = accountInfo.category || "Assets"
      }
    }

    const ledgerEntries = []
    let runningBalance = 0

    // ══════════════════════════════════════════════════════════════════════════
    // 1. VOUCHERS (JV, CPV, BPV, BRV etc.)
    // ══════════════════════════════════════════════════════════════════════════
    if (!isDiscountAccount && !isTaxAcc) {
      const vouchers = await Voucher.find({
        voucherDate: { $gte: from, $lte: to },
        status: { $ne: "cancelled" },
      }).sort({ voucherDate: 1 }).lean()

      console.log(`✅ Found ${vouchers.length} vouchers`)

      vouchers.forEach((voucher) => {
        voucher.entries?.forEach((entry) => {
          const entryAccount     = entry.account     || ""
          const entryAccountCode = entry.accountCode || ""

          if (
            matchAccount(entryAccount, accountCode, accountName) ||
            matchAccount(entryAccountCode, accountCode, accountName)
          ) {
            const dr = parseFloat(entry.debitAmount  || 0)
            const cr = parseFloat(entry.creditAmount || 0)
            runningBalance += normalBalance === "debit" ? dr - cr : cr - dr

            ledgerEntries.push({
              id:          `voucher-${voucher._id}-${entry.serialNo}`,
              date:        voucher.voucherDate,
              voucherNo:   voucher.voucherNo,
              voucherType: voucher.voucherType,
              description: entry.description || voucher.narration || "No description",
              debit: dr, credit: cr, balance: runningBalance,
              grn: null, sourceId: voucher._id,
            })
          }
        })
      })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. SUPPLIER PAYMENT VOUCHERS (SPV)
    //
    //  DR  Vendor/Supplier  (voucherAmount — payable cleared)
    //  CR  Cash/Bank        (netAmount — net paid after WHT)
    //  DR  Tax Expense      (totalTaxAmount, if taxRate > 0)
    //  CR  Tax Payable      (totalTaxAmount, if taxRate > 0)
    // ══════════════════════════════════════════════════════════════════════════
    const spvVouchers = await SupplierPaymentVoucher.find({
      voucherDate: { $gte: from, $lte: to },
      status: { $in: ["SAVED", "POSTED"] },
    })
      .populate("accDrSupplier", "name code")
      .sort({ voucherDate: 1 })
      .lean()

    console.log(`✅ Found ${spvVouchers.length} SPV vouchers`)

    if (!isDiscountAccount) {
      spvVouchers.forEach((spv) => {
        const supplierName = spv.accDrSupplier?.name || spv.accDrSupplierName || ""
        const supplierCode = spv.accDrSupplier?.code || ""
        const bankName     = spv.accCrBankName || ""
        const bankCode     = spv.accCrBank     || ""
        const vNo          = spv.voucherNumber || "SPV"
        const vType        = "SPV"

        const fullAmt = parseFloat(spv.voucherAmount  || 0)
        const taxAmt  = parseFloat(spv.totalTaxAmount || 0)
        const netAmt  = parseFloat(spv.netAmount      || fullAmt)
        const taxRate = spv.taxRate || 0
        const taxCode = spv.taxAccountCode || ""
        const taxName = spv.taxAccountName || ""
        const narr    = spv.narration || `Payment to ${supplierName}`
        const taxPct  = taxRate > 0 ? `${(taxRate * 100).toFixed(2)}%` : ""

        // A. Vendor (DR fullAmt)
        if (
          matchAccount(supplierName, accountCode, accountName) ||
          matchAccount(supplierCode, accountCode, accountName)
        ) {
          runningBalance += normalBalance === "debit" ? fullAmt : -fullAmt
          ledgerEntries.push({
            id: `spv-${spv._id}-supplier`, date: spv.voucherDate,
            voucherNo: vNo, voucherType: vType,
            description: taxAmt > 0
              ? `${narr} [Before Tax: Rs.${fullAmt.toLocaleString()} | WHT ${taxPct}: Rs.${taxAmt.toLocaleString()} | Net Paid: Rs.${netAmt.toLocaleString()}]`
              : narr,
            debit: fullAmt, credit: 0, balance: runningBalance,
            grn: spv.lines?.[0]?.purchaseDetail || null, sourceId: spv._id,
          })
        }

        // B. Cash/Bank (CR netAmt)
        if (
          matchAccount(bankName, accountCode, accountName) ||
          matchAccount(bankCode,  accountCode, accountName)
        ) {
          const cr = taxAmt > 0 ? netAmt : fullAmt
          runningBalance += normalBalance === "debit" ? -cr : cr
          ledgerEntries.push({
            id: `spv-${spv._id}-bank`, date: spv.voucherDate,
            voucherNo: vNo, voucherType: vType,
            description: taxAmt > 0
              ? `${narr} — Paid Rs.${netAmt.toLocaleString()} (after WHT Rs.${taxAmt.toLocaleString()} @ ${taxPct})`
              : `${narr} — via ${bankName}`,
            debit: 0, credit: cr, balance: runningBalance,
            grn: spv.lines?.[0]?.purchaseDetail || null, sourceId: spv._id,
          })
        }

        // C. WHT Expense (DR taxAmt)
        if (
          taxAmt > 0 && taxCode &&
          (matchAccount(taxCode, accountCode, accountName) ||
           matchAccount(taxName, accountCode, accountName) ||
           (isTaxAcc && taxAccInfo?.category === "Expenses" && taxAccInfo?.rate === taxRate))
        ) {
          runningBalance += normalBalance === "debit" ? taxAmt : -taxAmt
          ledgerEntries.push({
            id: `spv-${spv._id}-wht-exp`, date: spv.voucherDate,
            voucherNo: vNo, voucherType: "WHT",
            description: `WHT @ ${taxPct} on payment to ${supplierName} (${vNo})`,
            debit: taxAmt, credit: 0, balance: runningBalance,
            grn: null, sourceId: spv._id,
            accountCode: taxCode, accountName: taxName,
          })
        }

        // D. WHT Payable (CR taxAmt)
        if (
          taxAmt > 0 && taxCode &&
          (matchAccount(`${taxCode}-PAY`, accountCode, accountName) ||
           matchAccount(`${taxName} Payable`, accountCode, accountName) ||
           (isTaxAcc && taxAccInfo?.category === "Liabilities" && taxAccInfo?.rate === taxRate))
        ) {
          runningBalance += normalBalance === "debit" ? -taxAmt : taxAmt
          ledgerEntries.push({
            id: `spv-${spv._id}-wht-pay`, date: spv.voucherDate,
            voucherNo: vNo, voucherType: "WHT",
            description: `WHT payable to FBR/Govt @ ${taxPct} — ${supplierName} (${vNo})`,
            debit: 0, credit: taxAmt, balance: runningBalance,
            grn: null, sourceId: spv._id,
            accountCode: `${taxCode}-PAY`,
            accountName: `${taxName} Payable`,
          })
        }
      })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. SALE DISCOUNTS
    // ══════════════════════════════════════════════════════════════════════════
    const saleDiscounts = await SaleDiscount.find({ date: { $gte: from, $lte: to } })
      .populate("customer", "name code").lean()

    console.log(`✅ Found ${saleDiscounts.length} sale discounts`)

    saleDiscounts.forEach((discount) => {
      const customerName = discount.customer?.name || ""
      const customerCode = discount.customer?.code || ""
      const dr = parseFloat(discount.debitAmount  || 0)
      const cr = parseFloat(discount.creditAmount || 0)

      if (accountCode === "SALES-DISC" || accountName === "SALES DISCOUNT") {
        runningBalance += normalBalance === "debit" ? dr : -dr
        ledgerEntries.push({
          id: `sale-discount-${discount._id}-type`,
          date: discount.date, voucherNo: discount.invoice || "N/A",
          voucherType: "Sale Discount",
          description: discount.description || `Sale discount for ${customerName}`,
          debit: dr, credit: 0, balance: runningBalance,
          grn: null, sourceId: discount._id,
          accountCode: "SALES-DISC", accountName: "SALES DISCOUNT",
        })
      }

      if (!isDiscountAccount && (
        matchAccount(customerName, accountCode, accountName) ||
        matchAccount(customerCode, accountCode, accountName)
      )) {
        runningBalance += normalBalance === "debit" ? -cr : cr
        ledgerEntries.push({
          id: `sale-discount-${discount._id}-customer`,
          date: discount.date, voucherNo: discount.invoice || "N/A",
          voucherType: "Sale Discount",
          description: discount.description || `Discount allowed to ${customerName}`,
          debit: 0, credit: cr, balance: runningBalance,
          grn: null, sourceId: discount._id,
        })
      }
    })

    // ══════════════════════════════════════════════════════════════════════════
    // 4. PURCHASE DISCOUNTS
    // ══════════════════════════════════════════════════════════════════════════
    const purchaseDiscounts = await PurchasesDiscount.find({ date: { $gte: from, $lte: to } })
      .populate("vendor", "name code").lean()

    console.log(`✅ Found ${purchaseDiscounts.length} purchase discounts`)

    purchaseDiscounts.forEach((discount) => {
      const vendorName = discount.vendor?.name || ""
      const vendorCode = discount.vendor?.code || ""
      const dr = parseFloat(discount.debitAmount  || 0)
      const cr = parseFloat(discount.creditAmount || 0)

      if (accountCode === "PURCH-DISC" || accountName === "PURCHASES DISCOUNT") {
        runningBalance += normalBalance === "debit" ? -cr : cr
        ledgerEntries.push({
          id: `purchase-discount-${discount._id}-type`,
          date: discount.date, voucherNo: discount.invoice || "N/A",
          voucherType: "Purchase Discount",
          description: discount.description || `Purchase discount from ${vendorName}`,
          debit: 0, credit: cr, balance: runningBalance,
          grn: null, sourceId: discount._id,
          accountCode: "PURCH-DISC", accountName: "PURCHASES DISCOUNT",
        })
      }

      if (!isDiscountAccount && (
        matchAccount(vendorName, accountCode, accountName) ||
        matchAccount(vendorCode, accountCode, accountName)
      )) {
        runningBalance += normalBalance === "debit" ? dr : -dr
        ledgerEntries.push({
          id: `purchase-discount-${discount._id}-vendor`,
          date: discount.date, voucherNo: discount.invoice || "N/A",
          voucherType: "Purchase Discount",
          description: discount.description || `Discount received from ${vendorName}`,
          debit: dr, credit: 0, balance: runningBalance,
          grn: null, sourceId: discount._id,
        })
      }
    })

    // ══════════════════════════════════════════════════════════════════════════
    // 5. SALES
    // ══════════════════════════════════════════════════════════════════════════
    if (!isDiscountAccount && !isTaxAcc) {
      const sales = await Sale.find({ createdAt: { $gte: from, $lte: to } }).lean()
      console.log(`✅ Found ${sales.length} sales`)
      const processedSaleIds = new Set()

      sales.forEach((sale) => {
        const customerName = sale.customerName || ""
        if (customerName.toLowerCase().includes("test")) return
        const amount = parseFloat(sale.totalAmount || 0)
        const saleId = `sale-${sale._id}`
        if (processedSaleIds.has(saleId)) return
        processedSaleIds.add(saleId)

        if (matchAccount(customerName, accountCode, accountName)) {
          runningBalance += normalBalance === "debit" ? amount : -amount
          ledgerEntries.push({
            id: `${saleId}-customer`, date: sale.createdAt,
            voucherNo: sale.invoice || "N/A", voucherType: "Sale",
            description: `${sale.saleType} - ${sale.notes || "Sale"}`,
            debit: amount, credit: 0, balance: runningBalance,
            grn: null, sourceId: sale._id,
          })
        }

        const saleType = sale.saleType || ""
        if (matchAccount(saleType, accountCode, accountName)) {
          runningBalance += normalBalance === "debit" ? -amount : amount
          ledgerEntries.push({
            id: `${saleId}-revenue`, date: sale.createdAt,
            voucherNo: sale.invoice || "N/A", voucherType: "Sale",
            description: `Sale to ${customerName} - ${sale.notes || "Sale"}`,
            debit: 0, credit: amount, balance: runningBalance,
            grn: null, sourceId: sale._id,
          })
        }
      })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 6. SALE RETURNS
    // ══════════════════════════════════════════════════════════════════════════
    if (!isDiscountAccount && !isTaxAcc) {
      const salesWithReturns = await Sale.find({
        returnedQuantity: { $gt: 0 },
        "returnHistory.date": { $gte: from, $lte: to },
      }).populate("product").lean()

      console.log(`✅ Found ${salesWithReturns.length} sales with returns`)

      salesWithReturns.forEach((sale) => {
        if (!sale.returnHistory?.length) return
        sale.returnHistory.forEach((ret) => {
          const retDate = new Date(ret.date)
          if (retDate < from || retDate > to) return
          const retAmt       = parseFloat(ret.refundAmount || (ret.quantity * sale.saleRate))
          const customerName = sale.customerName || ""
          const saleType     = sale.saleType     || ""

          if (matchAccount(saleType, accountCode, accountName)) {
            runningBalance += normalBalance === "debit" ? retAmt : -retAmt
            ledgerEntries.push({
              id: `sale-return-${sale._id}-${ret._id}-revenue`, date: retDate,
              voucherNo: sale.invoice || "N/A", voucherType: "Sale Return",
              description: `Return from ${customerName} - ${ret.reason || "Sale return"}`,
              debit: retAmt, credit: 0, balance: runningBalance,
              grn: null, sourceId: sale._id,
            })
          }

          if (matchAccount(customerName, accountCode, accountName)) {
            runningBalance += normalBalance === "debit" ? -retAmt : retAmt
            ledgerEntries.push({
              id: `sale-return-${sale._id}-${ret._id}-customer`, date: retDate,
              voucherNo: sale.invoice || "N/A", voucherType: "Sale Return",
              description: `Return: ${ret.quantity} units - ${ret.reason || "Sale return"}`,
              debit: 0, credit: retAmt, balance: runningBalance,
              grn: null, sourceId: sale._id,
            })
          }
        })
      })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 7. PRODUCTS (PURCHASES)
    // ══════════════════════════════════════════════════════════════════════════
    if (!isDiscountAccount && !isTaxAcc) {
      const products = await Product.find({ createdAt: { $gte: from, $lte: to } })
        .populate("purchaseType", "name code")
        .populate("vendorName",   "name code")
        .lean()

      console.log(`✅ Found ${products.length} products`)

      products.forEach((product) => {
        const amount = parseFloat(product.purchaseQuantity || 0) * parseFloat(product.purchaseRate || 0)
        if (amount <= 0) return

        const purchaseTypeName = product.purchaseType?.name || ""
        const purchaseTypeCode = product.purchaseType?.code || ""
        const vendorName       = product.vendorName?.name   || ""
        const vendorCode       = product.vendorName?.code   || ""

        if (
          matchAccount(purchaseTypeName, accountCode, accountName) ||
          matchAccount(purchaseTypeCode, accountCode, accountName)
        ) {
          runningBalance += normalBalance === "debit" ? amount : -amount
          ledgerEntries.push({
            id: `product-${product._id}-purchaseType`, date: product.createdAt,
            voucherNo: product.grn || "N/A", voucherType: "Purchase",
            description: `Purchase from ${vendorName || "Vendor"} - ${product.name}: ${product.purchaseQuantity} units @ Rs.${product.purchaseRate}`,
            debit: amount, credit: 0, balance: runningBalance,
            grn: product.grn, sourceId: product._id,
          })
        }

        if (
          matchAccount(vendorName, accountCode, accountName) ||
          matchAccount(vendorCode, accountCode, accountName)
        ) {
          runningBalance += normalBalance === "debit" ? -amount : amount
          ledgerEntries.push({
            id: `product-${product._id}-vendor`, date: product.createdAt,
            voucherNo: product.grn || "N/A", voucherType: "Purchase",
            description: `${purchaseTypeName || "Purchase"} - ${product.name}: ${product.purchaseQuantity} units @ Rs.${product.purchaseRate}`,
            debit: 0, credit: amount, balance: runningBalance,
            grn: product.grn, sourceId: product._id,
          })
        }
      })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 8. PURCHASE RETURNS
    // ══════════════════════════════════════════════════════════════════════════
    if (!isDiscountAccount && !isTaxAcc) {
      const productsWithReturns = await Product.find({
        ReturnQuantity: { $gt: 0 },
        ReturnedDate:   { $gte: from, $lte: to },
      })
        .populate("purchaseType", "name code")
        .populate("vendorName",   "name code")
        .lean()

      console.log(`✅ Found ${productsWithReturns.length} purchase returns`)

      productsWithReturns.forEach((product) => {
        const retAmt = parseFloat(product.ReturnedAmount || 0)
        if (retAmt <= 0) return

        const purchaseTypeName = product.purchaseType?.name || ""
        const purchaseTypeCode = product.purchaseType?.code || ""
        const vendorName       = product.vendorName?.name   || ""
        const vendorCode       = product.vendorName?.code   || ""
        const retDate          = new Date(product.ReturnedDate)

        if (
          matchAccount(vendorName, accountCode, accountName) ||
          matchAccount(vendorCode, accountCode, accountName)
        ) {
          runningBalance += normalBalance === "debit" ? retAmt : -retAmt
          ledgerEntries.push({
            id: `purchase-return-${product._id}-vendor`, date: retDate,
            voucherNo: product.grn || "N/A", voucherType: "Purchase Return",
            description: `Return to ${vendorName} - ${product.name}: ${product.ReturnQuantity} units`,
            debit: retAmt, credit: 0, balance: runningBalance,
            grn: product.grn, sourceId: product._id,
          })
        }

        if (
          matchAccount(purchaseTypeName, accountCode, accountName) ||
          matchAccount(purchaseTypeCode, accountCode, accountName)
        ) {
          runningBalance += normalBalance === "debit" ? -retAmt : retAmt
          ledgerEntries.push({
            id: `purchase-return-${product._id}-purchaseType`, date: retDate,
            voucherNo: product.grn || "N/A", voucherType: "Purchase Return",
            description: `Return to ${vendorName || "Vendor"} - ${product.name}: ${product.ReturnQuantity} units`,
            debit: 0, credit: retAmt, balance: runningBalance,
            grn: product.grn, sourceId: product._id,
          })
        }
      })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 9. ✅ CUSTOMER RECEIPT VOUCHERS (CRV)
    //
    //  For every CRV, up to 4 possible ledger lines:
    //    DR  Cash/Bank        (voucherAmount — cash received into bank)
    //    CR  Customer         (voucherAmount — receivable cleared)
    //    DR  WHT Expense      (totalTaxAmount, if taxRate > 0)
    //    CR  WHT Payable      (totalTaxAmount, if taxRate > 0)
    // ══════════════════════════════════════════════════════════════════════════
    if (!isDiscountAccount) {
      const crvVouchers = await CustomerReceiptVoucher.find({
        voucherDate: { $gte: from, $lte: to },
        status: { $in: ["SAVED", "POSTED"] },
      })
        .populate("accCrCustomer", "name code")
        .sort({ voucherDate: 1 })
        .lean()

      console.log(`✅ Found ${crvVouchers.length} CRV vouchers`)

      crvVouchers.forEach((crv) => {
        const customerName = crv.accCrCustomer?.name || crv.accCrCustomerName || ""
        const customerCode = crv.accCrCustomer?.code || ""
        const bankName     = crv.accDrBankName || ""
        const bankCode     = crv.accDrBank     || ""
        const vNo          = crv.voucherNumber || "CRV"
        const vType        = "CRV"

        const fullAmt = parseFloat(crv.voucherAmount  || 0)  // Full amount received
        const taxAmt  = parseFloat(crv.totalTaxAmount || 0)  // WHT deducted
        const netAmt  = parseFloat(crv.netAmount      || fullAmt) // Net after WHT
        const taxRate = crv.taxRate || 0
        const taxCode = crv.taxAccountCode || ""
        const taxName = crv.taxAccountName || ""
        const narr    = crv.narration || `Receipt from ${customerName}`
        const taxPct  = taxRate > 0 ? `${(taxRate * 100).toFixed(2)}%` : ""

        // ── A. Cash/Bank Account (DR voucherAmount) — money received ─────────
        if (
          matchAccount(bankName, accountCode, accountName) ||
          matchAccount(bankCode,  accountCode, accountName)
        ) {
          const dr = taxAmt > 0 ? netAmt : fullAmt
          runningBalance += normalBalance === "debit" ? dr : -dr
          ledgerEntries.push({
            id:          `crv-${crv._id}-bank`,
            date:        crv.voucherDate,
            voucherNo:   vNo,
            voucherType: vType,
            description: taxAmt > 0
              ? `${narr} — Received Rs.${netAmt.toLocaleString()} (after WHT Rs.${taxAmt.toLocaleString()} @ ${taxPct})`
              : `${narr} — via ${bankName}`,
            debit: dr, credit: 0, balance: runningBalance,
            grn: crv.lines?.[0]?.saleDetail || null, sourceId: crv._id,
          })
        }

        // ── B. Customer Account (CR voucherAmount) — receivable cleared ───────
        if (
          matchAccount(customerName, accountCode, accountName) ||
          matchAccount(customerCode, accountCode, accountName)
        ) {
          runningBalance += normalBalance === "debit" ? -fullAmt : fullAmt
          ledgerEntries.push({
            id:          `crv-${crv._id}-customer`,
            date:        crv.voucherDate,
            voucherNo:   vNo,
            voucherType: vType,
            description: taxAmt > 0
              ? `${narr} [Total: Rs.${fullAmt.toLocaleString()} | WHT ${taxPct}: Rs.${taxAmt.toLocaleString()} | Net Received: Rs.${netAmt.toLocaleString()}]`
              : narr,
            debit: 0, credit: fullAmt, balance: runningBalance,
            grn: crv.lines?.[0]?.saleDetail || null, sourceId: crv._id,
          })
        }

        // ── C. WHT Expense Account (DR taxAmt) ───────────────────────────────
        // Shown when viewing TAX-0025 / TAX-0050 / TAX-0100
        if (
          taxAmt > 0 && taxCode &&
          (matchAccount(taxCode, accountCode, accountName) ||
           matchAccount(taxName, accountCode, accountName) ||
           (isTaxAcc && taxAccInfo?.category === "Expenses" && taxAccInfo?.rate === taxRate))
        ) {
          runningBalance += normalBalance === "debit" ? taxAmt : -taxAmt
          ledgerEntries.push({
            id:          `crv-${crv._id}-wht-exp`,
            date:        crv.voucherDate,
            voucherNo:   vNo,
            voucherType: "WHT",
            description: `WHT @ ${taxPct} on receipt from ${customerName} (${vNo})`,
            debit: taxAmt, credit: 0, balance: runningBalance,
            grn: null, sourceId: crv._id,
            accountCode: taxCode,
            accountName: taxName,
          })
        }

        // ── D. WHT Payable Account (CR taxAmt) — govt liability ───────────────
        // Shown when viewing TAX-0025-PAY / TAX-0050-PAY / TAX-0100-PAY
        if (
          taxAmt > 0 && taxCode &&
          (matchAccount(`${taxCode}-PAY`, accountCode, accountName) ||
           matchAccount(`${taxName} Payable`, accountCode, accountName) ||
           (isTaxAcc && taxAccInfo?.category === "Liabilities" && taxAccInfo?.rate === taxRate))
        ) {
          runningBalance += normalBalance === "debit" ? -taxAmt : taxAmt
          ledgerEntries.push({
            id:          `crv-${crv._id}-wht-pay`,
            date:        crv.voucherDate,
            voucherNo:   vNo,
            voucherType: "WHT",
            description: `WHT payable to FBR/Govt @ ${taxPct} — ${customerName} (${vNo})`,
            debit: 0, credit: taxAmt, balance: runningBalance,
            grn: null, sourceId: crv._id,
            accountCode: `${taxCode}-PAY`,
            accountName: `${taxName} Payable`,
          })
        }
      })
    }

    // ══════════════════════════════════════════════════════════════════════════
    // SORT + RECALCULATE + SAVE TO DB
    // ══════════════════════════════════════════════════════════════════════════
    ledgerEntries.sort((a, b) => new Date(a.date) - new Date(b.date))

    runningBalance = 0
    let serialNumber = 1
    const ledgerDocsToSave = []

    ledgerEntries.forEach((entry) => {
      runningBalance += normalBalance === "debit"
        ? entry.debit - entry.credit
        : entry.credit - entry.debit
      entry.balance = runningBalance

      // sourceType for DB
      let srcType = "Voucher"
      if      (entry.id.includes("crv"))                srcType = "Voucher"               // ✅ CRV → Voucher
      else if (entry.id.includes("spv"))                srcType = "SupplierPaymentVoucher"
      else if (entry.id.includes("sale-return"))        srcType = "SaleReturn"
      else if (entry.id.includes("sale-discount"))      srcType = "SaleDiscount"
      else if (entry.id.includes("purchase-discount"))  srcType = "PurchaseDiscount"
      else if (entry.id.includes("sale"))               srcType = "Sale"
      else if (entry.id.includes("purchase-return"))    srcType = "PurchaseReturn"
      else if (entry.id.includes("product"))            srcType = "Product"

      // voucherType — must match Ledger schema enum
      let dbVoucherType = entry.voucherType
      const allowedVoucherTypes = [
        "Sale", "Purchase", "CPV", "BPV", "CRV", "BRV", "JV", "SPV",
        "Sale Return", "Purchase Return", "Sale Discount", "Purchase Discount", "WHT",
      ]
      if (!allowedVoucherTypes.includes(dbVoucherType)) dbVoucherType = "JV"

      ledgerDocsToSave.push({
        serialNumber:    serialNumber++,
        date:            entry.date,
        accountCode:     entry.accountCode || finalAccountCode,
        accountName:     entry.accountName || finalAccountName,
        accountCategory: accountCategory,
        voucherNo:       entry.voucherNo,
        voucherType:     dbVoucherType,
        sourceType:      srcType,
        sourceId:        entry.sourceId,
        grn:             entry.grn || null,
        description:     entry.description,
        debit:           entry.debit,
        credit:          entry.credit,
        balance:         runningBalance,
        entryType:       determineEntryType(entry.voucherType, entry.debit, entry.credit),
        isActive:        true,
      })
    })

    // Save to DB
    try {
      await Ledger.deleteMany({ accountCode: finalAccountCode, date: { $gte: from, $lte: to } })
      if (ledgerDocsToSave.length > 0) {
        await Ledger.insertMany(ledgerDocsToSave)
        console.log(`✅ Saved ${ledgerDocsToSave.length} ledger entries`)
      }
    } catch (dbError) {
      console.error("❌ Ledger DB save error:", dbError.message)
    }

    const totalDebits  = ledgerEntries.reduce((s, e) => s + e.debit,  0)
    const totalCredits = ledgerEntries.reduce((s, e) => s + e.credit, 0)

    console.log(`📊 Entries: ${ledgerEntries.length} | DR: ${totalDebits} | CR: ${totalCredits} | Bal: ${runningBalance}`)

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
    res.status(500).json({ success: false, message: "Error fetching ledger entries", error: error.message })
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function matchAccount(value, code, name) {
  if (!value) return false
  const v = value.toLowerCase().trim()
  const c = (code || "").toLowerCase().trim()
  const n = (name || "").toLowerCase().trim()

  if (v === "sales discount"     || v === "sales-disc")  return c === "sales-disc"  || n === "sales discount"
  if (v === "purchases discount" || v === "purch-disc")  return c === "purch-disc"  || n === "purchases discount"

  if (v.startsWith("tax-") || v.startsWith("withholding")) {
    return v === c || v === n
  }

  return v === c || v === n || v.includes(c) || v.includes(n) || c.includes(v) || n.includes(v)
}

async function findAccountInfo(accountIdentifier) {
  try {
    if (accountIdentifier === "SALES-DISC" || accountIdentifier === "SALES DISCOUNT")
      return { code: "SALES-DISC", name: "SALES DISCOUNT", category: "Expenses", normalBalance: "debit" }
    if (accountIdentifier === "PURCH-DISC" || accountIdentifier === "PURCHASES DISCOUNT")
      return { code: "PURCH-DISC", name: "PURCHASES DISCOUNT", category: "Revenue", normalBalance: "credit" }

    const taxMatch = HARDCODED_TAX_ACCOUNTS.find(
      t => t.code === accountIdentifier || t.name === accountIdentifier
    )
    if (taxMatch) return taxMatch

    const [asset, equity, expense, liability, revenue] = await Promise.all([
      Asset.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
      Equity.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
      Expense.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
      Liability.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
      Revenue.findOne({ $or: [{ code: accountIdentifier }, { name: accountIdentifier }] }).lean(),
    ])

    if (asset)     return { ...asset,     category: "Assets",      normalBalance: "debit"  }
    if (equity)    return { ...equity,    category: "Equity",      normalBalance: "credit" }
    if (expense)   return { ...expense,   category: "Expenses",    normalBalance: "debit"  }
    if (liability) return { ...liability, category: "Liabilities", normalBalance: "credit" }
    if (revenue)   return { ...revenue,   category: "Revenue",     normalBalance: "credit" }
    return null
  } catch (error) {
    console.error("Error finding account info:", error)
    return null
  }
}

function determineEntryType(voucherType, debit, credit) {
  if (voucherType === "WHT")               return debit > 0 ? "WHT_EXPENSE"        : "WHT_PAYABLE"
  if (voucherType === "Sale")              return debit > 0 ? "RECEIVABLE"         : "REVENUE"
  if (voucherType === "Sale Return")       return debit > 0 ? "SALE_RETURN"        : "RECEIVABLE_REVERSAL"
  if (voucherType === "Sale Discount")     return debit > 0 ? "SALE_DISCOUNT"      : "RECEIVABLE_REVERSAL"
  if (voucherType === "Purchase")          return debit > 0 ? "PURCHASE"           : "PAYABLE"
  if (voucherType === "Purchase Return")   return debit > 0 ? "PAYABLE_REVERSAL"   : "PURCHASE_RETURN"
  if (voucherType === "Purchase Discount") return debit > 0 ? "PAYABLE_REVERSAL"   : "PURCHASE_DISCOUNT"
  if (voucherType === "CRV")               return debit > 0 ? "CASH"              : "RECEIVABLE_REVERSAL"
  if (voucherType === "BRV")               return "BANK"
  if (voucherType === "CPV" || voucherType === "BPV" || voucherType === "SPV") return "EXPENSE"
  if (voucherType === "JV")                return "JOURNAL"
  return "JOURNAL"
}

module.exports = { getAllAccounts, getAccountLedger }