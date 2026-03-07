const express = require("express")
const router  = express.Router()
const {
  getOverheadVouchers,
  getOverheadVoucherById,
  createOverheadVoucher,
  updateOverheadVoucher,
  deleteOverheadVoucher,
} = require("./controllers/Overheadcategorycontroller")

// GET  /api/overhead-voucher          → all vouchers (optional ?status=SAVED&fromDate=&toDate=)
router.get("/",     getOverheadVouchers)

// GET  /api/overhead-voucher/:id      → single voucher
router.get("/:id",  getOverheadVoucherById)

// POST /api/overhead-voucher          → create new
router.post("/",    createOverheadVoucher)

// PATCH /api/overhead-voucher/:id     → update (edit mode)
router.patch("/:id", updateOverheadVoucher)

// DELETE /api/overhead-voucher/:id    → soft delete (CANCELLED)
router.delete("/:id", deleteOverheadVoucher)

module.exports = router