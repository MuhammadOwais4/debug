const express = require("express")
const router = express.Router()
const {
  getVendors,
  getPurchaseJournal,
  createVoucher,
  getAllVouchers,
  getVoucherById,
  postVoucher,
  cancelVoucher,
  deleteVoucher,
  getVoucherSummary,
} = require("./controllers/Supplierpaymentcontroller")

// ── Vendor route (used by frontend dropdown) ──────────────────────────────────
// GET /api/vendors
router.get("/vendors", getVendors)

// ── Purchase Journal (pending invoices for a vendor) ─────────────────────────
// GET /api/supplier-payment-vouchers/purchase-journal?vendorId=xxx&fromDate=&toDate=
router.get("/purchase-journal", getPurchaseJournal)

// ── Summary ───────────────────────────────────────────────────────────────────
// GET /api/supplier-payment-vouchers/summary
router.get("/summary", getVoucherSummary)

// ── CRUD ──────────────────────────────────────────────────────────────────────
// GET    /api/supplier-payment-vouchers          — all vouchers (filter by vendorId)
// POST   /api/supplier-payment-vouchers          — create new voucher
router.route("/")
  .get(getAllVouchers)
  .post(createVoucher)

// GET    /api/supplier-payment-vouchers/:id      — single voucher
// DELETE /api/supplier-payment-vouchers/:id      — delete SAVED voucher
router.route("/:id")
  .get(getVoucherById)
  .delete(deleteVoucher)

// PATCH  /api/supplier-payment-vouchers/:id/post    — post voucher & update balances
router.patch("/:id/post", postVoucher)

// PATCH  /api/supplier-payment-vouchers/:id/cancel  — cancel voucher
router.patch("/:id/cancel", cancelVoucher)

module.exports = router