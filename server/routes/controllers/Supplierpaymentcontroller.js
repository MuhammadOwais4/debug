const SupplierPaymentVoucher = require("../models/Supplierpaymentvouchers")
const Liability = require("../models/chart-of-accounts/Liabilitys")
const Asset = require("../models/chart-of-accounts/Asset")
const Product = require("../models/Product")

// ── Helper: update Liability (vendor) balance ─────────────────────────────────
const updateVendorBalance = async (vendorId, amount, operation = "subtract") => {
  // When we pay a vendor, their payable balance decreases
  const update =
    operation === "subtract"
      ? { $inc: { balance: -Math.abs(amount) } }
      : { $inc: { balance: Math.abs(amount) } }

  await Liability.findByIdAndUpdate(vendorId, update)
}

// ── Helper: update Asset (cash/bank) balance ──────────────────────────────────
const updateBankBalance = async (accCrBank, amount, operation = "subtract") => {
  // When we pay from cash/bank, its balance decreases
  const update =
    operation === "subtract"
      ? { $inc: { balance: -Math.abs(amount) } }
      : { $inc: { balance: Math.abs(amount) } }

  // accCrBank can be code or _id
  const filter = accCrBank.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: accCrBank }
    : { code: accCrBank }

  await Asset.findOneAndUpdate(filter, update)
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/vendors
// Returns all active Liability accounts with type PAYABLES (used as vendors)
// ─────────────────────────────────────────────────────────────────────────────
exports.getVendors = async (req, res) => {
  try {
    const vendors = await Liability.find({ type: "PAYABLES", isActive: true })
      .select("_id code name balance description")
      .sort({ name: 1 })

    res.json({
      success: true,
      count: vendors.length,
      data: vendors,
    })
  } catch (error) {
    console.error("[SPV] getVendors error:", error)
    res.status(500).json({ success: false, message: "Error fetching vendors", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supplier-payment-vouchers/purchase-journal
// Returns pending/unpaid Products (invoices) for a vendor within date range
// Query: vendorId, fromDate, toDate
// ─────────────────────────────────────────────────────────────────────────────
exports.getPurchaseJournal = async (req, res) => {
  try {
    const { vendorId, fromDate, toDate } = req.query

    if (!vendorId) {
      return res.status(400).json({ success: false, message: "vendorId is required" })
    }

    // Build product filter — vendor is stored as Liability ObjectId ref in Product.vendorName
    const filter = {
      vendorName: vendorId,    // Product.vendorName references Liability
    }

    // Date range on createdAt (purchase date)
    if (fromDate || toDate) {
      filter.createdAt = {}
      if (fromDate) filter.createdAt.$gte = new Date(fromDate)
      if (toDate) {
        const to = new Date(toDate)
        to.setHours(23, 59, 59, 999)
        filter.createdAt.$lte = to
      }
    }

    const products = await Product.find(filter)
      .populate("vendorName", "name code balance")
      .populate("purchaseType", "name code type")
      .sort({ createdAt: -1 })

    // Map products to invoice-like structure for the frontend
    const invoices = products.map((p) => {
      // Calculate how much has already been paid via vouchers
      const paid = p._paidAmount || 0  // default 0; updated when voucher is POSTED
      const balance = Math.max((p.balanceAmount || 0) - paid, 0)

      return {
        _id: p._id,
        grn: p.grn || null,
        invoiceNo: p.vendorBillNumber || p.grn || null,
        date: p.createdAt,
        description: `${p.name} (${p.category})`,
        narration: p.notes || "",
        amount: p.purchaseAmount || 0,   // original purchase amount
        paid: paid,
        balance: balance > 0 ? balance : p.balanceAmount || 0,
        quantity: p.quantity,
        purchaseRate: p.purchaseRate,
        vendor: p.vendorName,
        purchaseType: p.purchaseType,
      }
    })

    // Filter out fully paid invoices (balance === 0)
    const pending = invoices.filter((inv) => inv.balance > 0)

    res.json({
      success: true,
      count: pending.length,
      data: pending,
    })
  } catch (error) {
    console.error("[SPV] getPurchaseJournal error:", error)
    res.status(500).json({ success: false, message: "Error fetching purchase journal", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/supplier-payment-vouchers
// Create & save a new payment voucher
// ─────────────────────────────────────────────────────────────────────────────
exports.createVoucher = async (req, res) => {
  try {
    const {
      voucherDate,
      accCrBank,
      accCrBankName,
      accDrSupplier,
      accDrSupplierName,
      narration,
      voucherAmount,
      lines,
      status,
      period,
    } = req.body

    // ── Validate ──────────────────────────────────────────────────────────────
    if (!accCrBank) return res.status(400).json({ success: false, message: "Cash/Bank account is required" })
    if (!accDrSupplier) return res.status(400).json({ success: false, message: "Supplier is required" })
    if (!voucherAmount || voucherAmount <= 0)
      return res.status(400).json({ success: false, message: "Voucher amount must be greater than 0" })
    if (!lines || lines.length === 0)
      return res.status(400).json({ success: false, message: "At least one invoice line is required" })

    // ── Verify vendor exists ──────────────────────────────────────────────────
    const vendor = await Liability.findById(accDrSupplier)
    if (!vendor) return res.status(404).json({ success: false, message: "Vendor not found" })
    if (vendor.type !== "PAYABLES")
      return res.status(400).json({ success: false, message: "Selected account is not a PAYABLES vendor" })

    // ── Verify cash/bank account exists ──────────────────────────────────────
    const bankFilter = accCrBank.match(/^[0-9a-fA-F]{24}$/)
      ? { _id: accCrBank }
      : { code: accCrBank }
    const bankAccount = await Asset.findOne(bankFilter)
    if (!bankAccount)
      return res.status(404).json({ success: false, message: "Cash/Bank account not found" })
    if (bankAccount.type !== "CASH ACCOUNT" && bankAccount.type !== "BANK ACCOUNT")
      return res.status(400).json({ success: false, message: "Selected account is not Cash or Bank type" })

    // ── Create voucher ────────────────────────────────────────────────────────
    const voucher = new SupplierPaymentVoucher({
      voucherDate: voucherDate || new Date(),
      accCrBank,
      accCrBankName: accCrBankName || bankAccount.name,
      accDrSupplier,
      accDrSupplierName: accDrSupplierName || vendor.name,
      narration: narration || "",
      voucherAmount,
      lines,
      status: status || "SAVED",
      period,
    })

    const saved = await voucher.save()

    // ── If POSTED: update balances ────────────────────────────────────────────
    if (saved.status === "POSTED") {
      await updateVendorBalance(accDrSupplier, voucherAmount, "subtract")
      await updateBankBalance(accCrBank, voucherAmount, "subtract")
    }

    res.status(201).json({
      success: true,
      message: `Voucher ${saved.voucherNumber} saved successfully`,
      data: saved,
    })
  } catch (error) {
    console.error("[SPV] createVoucher error:", error)
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Duplicate voucher number. Please try again." })
    }
    res.status(500).json({ success: false, message: "Error creating voucher", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supplier-payment-vouchers
// Get all vouchers — optional filter by vendorId
// ─────────────────────────────────────────────────────────────────────────────
exports.getAllVouchers = async (req, res) => {
  try {
    const { vendorId, status, fromDate, toDate, limit = 100, offset = 0 } = req.query

    const filter = {}
    if (vendorId) filter.accDrSupplier = vendorId
    if (status)   filter.status = status

    if (fromDate || toDate) {
      filter.voucherDate = {}
      if (fromDate) filter.voucherDate.$gte = new Date(fromDate)
      if (toDate) {
        const to = new Date(toDate)
        to.setHours(23, 59, 59, 999)
        filter.voucherDate.$lte = to
      }
    }

    const vouchers = await SupplierPaymentVoucher.find(filter)
      .populate("accDrSupplier", "name code balance")
      .sort({ voucherDate: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(offset))

    const total = await SupplierPaymentVoucher.countDocuments(filter)

    res.json({
      success: true,
      count: vouchers.length,
      total,
      data: vouchers,
    })
  } catch (error) {
    console.error("[SPV] getAllVouchers error:", error)
    res.status(500).json({ success: false, message: "Error fetching vouchers", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supplier-payment-vouchers/:id
// Get single voucher by ID
// ─────────────────────────────────────────────────────────────────────────────
exports.getVoucherById = async (req, res) => {
  try {
    const voucher = await SupplierPaymentVoucher.findById(req.params.id)
      .populate("accDrSupplier", "name code balance")

    if (!voucher)
      return res.status(404).json({ success: false, message: "Voucher not found" })

    res.json({ success: true, data: voucher })
  } catch (error) {
    console.error("[SPV] getVoucherById error:", error)
    res.status(500).json({ success: false, message: "Error fetching voucher", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/supplier-payment-vouchers/:id/post
// Post a SAVED voucher — updates balances
// ─────────────────────────────────────────────────────────────────────────────
exports.postVoucher = async (req, res) => {
  try {
    const voucher = await SupplierPaymentVoucher.findById(req.params.id)
    if (!voucher)
      return res.status(404).json({ success: false, message: "Voucher not found" })

    if (voucher.status === "POSTED")
      return res.status(400).json({ success: false, message: "Voucher is already posted" })

    if (voucher.status === "CANCELLED")
      return res.status(400).json({ success: false, message: "Cannot post a cancelled voucher" })

    // Update status
    voucher.status = "POSTED"
    await voucher.save()

    // Update vendor (liability) balance — reduce payable
    await updateVendorBalance(voucher.accDrSupplier, voucher.voucherAmount, "subtract")

    // Update bank/cash (asset) balance — reduce cash/bank
    await updateBankBalance(voucher.accCrBank, voucher.voucherAmount, "subtract")

    res.json({
      success: true,
      message: `Voucher ${voucher.voucherNumber} posted successfully`,
      data: voucher,
    })
  } catch (error) {
    console.error("[SPV] postVoucher error:", error)
    res.status(500).json({ success: false, message: "Error posting voucher", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/supplier-payment-vouchers/:id/cancel
// Cancel a voucher — reverses balances if was POSTED
// ─────────────────────────────────────────────────────────────────────────────
exports.cancelVoucher = async (req, res) => {
  try {
    const voucher = await SupplierPaymentVoucher.findById(req.params.id)
    if (!voucher)
      return res.status(404).json({ success: false, message: "Voucher not found" })

    if (voucher.status === "CANCELLED")
      return res.status(400).json({ success: false, message: "Voucher is already cancelled" })

    const wasPosted = voucher.status === "POSTED"

    voucher.status = "CANCELLED"
    await voucher.save()

    // Reverse balances if was posted
    if (wasPosted) {
      await updateVendorBalance(voucher.accDrSupplier, voucher.voucherAmount, "add")
      await updateBankBalance(voucher.accCrBank, voucher.voucherAmount, "add")
    }

    res.json({
      success: true,
      message: `Voucher ${voucher.voucherNumber} cancelled successfully`,
      data: voucher,
    })
  } catch (error) {
    console.error("[SPV] cancelVoucher error:", error)
    res.status(500).json({ success: false, message: "Error cancelling voucher", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/supplier-payment-vouchers/:id
// Delete a SAVED voucher (cannot delete POSTED)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteVoucher = async (req, res) => {
  try {
    const voucher = await SupplierPaymentVoucher.findById(req.params.id)
    if (!voucher)
      return res.status(404).json({ success: false, message: "Voucher not found" })

    if (voucher.status === "POSTED")
      return res.status(400).json({ success: false, message: "Cannot delete a posted voucher. Cancel it first." })

    await voucher.deleteOne()

    res.json({ success: true, message: "Voucher deleted successfully" })
  } catch (error) {
    console.error("[SPV] deleteVoucher error:", error)
    res.status(500).json({ success: false, message: "Error deleting voucher", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/supplier-payment-vouchers/summary
// Summary stats — total paid, by vendor, by status
// ─────────────────────────────────────────────────────────────────────────────
exports.getVoucherSummary = async (req, res) => {
  try {
    const { vendorId, fromDate, toDate } = req.query

    const matchFilter = {}
    if (vendorId) matchFilter.accDrSupplier = mongoose.Types.ObjectId(vendorId)
    if (fromDate || toDate) {
      matchFilter.voucherDate = {}
      if (fromDate) matchFilter.voucherDate.$gte = new Date(fromDate)
      if (toDate) matchFilter.voucherDate.$lte = new Date(toDate)
    }

    const summary = await SupplierPaymentVoucher.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
          totalAmount: { $sum: "$voucherAmount" },
        },
      },
    ])

    const result = { SAVED: { count: 0, total: 0 }, POSTED: { count: 0, total: 0 }, CANCELLED: { count: 0, total: 0 } }
    summary.forEach((s) => {
      if (result[s._id]) {
        result[s._id] = { count: s.count, total: s.totalAmount }
      }
    })

    res.json({ success: true, data: result })
  } catch (error) {
    console.error("[SPV] getVoucherSummary error:", error)
    res.status(500).json({ success: false, message: "Error fetching summary", error: error.message })
  }
}



