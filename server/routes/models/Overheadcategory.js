const mongoose = require("mongoose")

// ── Line sub-schema ───────────────────────────────────────────────────────────
const overheadLineSchema = new mongoose.Schema(
  {
    category:      { type: String, required: true, trim: true },
    categoryLabel: { type: String, trim: true },
    amount:        { type: Number, required: true, min: 0 },
    note:          { type: String, trim: true, default: "" },
    // Per-line overhead account (optional — if different per line)
    overheadAccount:     { type: String, trim: true, default: "" },
    overheadAccountName: { type: String, trim: true, default: "" },
  },
  { _id: false }
)

// ── Main voucher schema ───────────────────────────────────────────────────────
const overheadVoucherSchema = new mongoose.Schema(
  {
    voucherNumber: { type: String, unique: true, trim: true },

    voucherDate: { type: Date, required: [true, "Voucher date is required"] },

    paymentMode: {
      type:     String,
      required: [true, "Payment mode is required"],
      enum:     ["Cash", "Bank"],
    },

    // ── Cash/Bank account (CR side) ──────────────────────────────────────────
    account:     { type: String, required: [true, "Account is required"], trim: true },
    accountName: { type: String, trim: true, default: "" },
    accountType: { type: String, trim: true, default: "" },
    accountCode: { type: String, trim: true, default: "" },

    // ── Overhead Expense account (DR side) ───────────────────────────────────
    overheadAccount:     { type: String, trim: true, default: "" }, // code
    overheadAccountName: { type: String, trim: true, default: "" }, // name
    overheadAccountType: { type: String, trim: true, default: "" }, // type/category

    description: { type: String, trim: true, default: "" },
    totalAmount: { type: Number, required: true, min: 0 },
    lines:       { type: [overheadLineSchema], default: [] },

    status: {
      type:    String,
      enum:    ["DRAFT", "SAVED", "POSTED", "CANCELLED"],
      default: "SAVED",
    },
    createdBy: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
)

// ── Auto-generate voucherNumber before save ───────────────────────────────────
overheadVoucherSchema.pre("save", async function (next) {
  if (this.voucherNumber) return next()

  const now    = new Date()
  const yy     = String(now.getFullYear()).slice(2)
  const mm     = String(now.getMonth() + 1).padStart(2, "0")
  const prefix = `OHV-${yy}${mm}-`

  const last = await mongoose
    .model("OverheadVoucher")
    .findOne({ voucherNumber: { $regex: `^${prefix}` } })
    .sort({ voucherNumber: -1 })
    .lean()

  let seq = 1001
  if (last?.voucherNumber) {
    const parts  = last.voucherNumber.split("-")
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) seq = lastSeq + 1
  }

  this.voucherNumber = `${prefix}${seq}`
  next()
})

module.exports = mongoose.model("OverheadVoucher", overheadVoucherSchema)