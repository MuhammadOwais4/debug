const mongoose = require("mongoose")

// ── Voucher Line Item (one per invoice/GRN being paid) ────────────────────────
const voucherLineSchema = new mongoose.Schema(
  {
    purchaseDetail: {
      type: String, // GRN number or product _id string
      trim: true,
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product", // references your Product model
    },
    amount: {
      type: Number,
      required: true,
      min: [0, "Amount cannot be negative"],
    },
  },
  { _id: false }
)

// ── Main Voucher Schema ────────────────────────────────────────────────────────
const supplierPaymentVoucherSchema = new mongoose.Schema(
  {
    // Auto-generated voucher number e.g. SPV-0001
    voucherNumber: {
      type: String,
      unique: true,
      trim: true,
    },

    voucherDate: {
      type: Date,
      required: [true, "Voucher date is required"],
      default: Date.now,
    },

    // Credit side — Cash or Bank account (from Asset model)
    accCrBank: {
      type: String, // stores asset code OR _id
      required: [true, "Cash/Bank account is required"],
    },
    accCrBankName: {
      type: String,
      trim: true,
      default: "",
    },

    // Debit side — Supplier / Vendor (from Liability model)
    accDrSupplier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Liability",
      required: [true, "Supplier account is required"],
    },
    accDrSupplierName: {
      type: String,
      trim: true,
      default: "",
    },

    narration: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Narration cannot exceed 500 characters"],
    },

    voucherAmount: {
      type: Number,
      required: [true, "Voucher amount is required"],
      min: [0, "Voucher amount cannot be negative"],
    },

    lines: [voucherLineSchema],

    status: {
      type: String,
      enum: ["SAVED", "POSTED", "CANCELLED"],
      default: "SAVED",
    },

    period: {
      from: { type: Date },
      to:   { type: Date },
    },
  },
  {
    timestamps: true,
  }
)

// ── Auto-generate voucherNumber before save ───────────────────────────────────
supplierPaymentVoucherSchema.pre("save", async function (next) {
  if (this.isNew && !this.voucherNumber) {
    try {
      const last = await this.constructor
        .findOne({ voucherNumber: { $regex: /^SPV-\d+$/ } })
        .sort({ voucherNumber: -1 })
        .select("voucherNumber")
        .lean()

      let num = 1
      if (last && last.voucherNumber) {
        const match = last.voucherNumber.match(/SPV-(\d+)/)
        if (match) num = parseInt(match[1], 10) + 1
      }
      this.voucherNumber = `SPV-${String(num).padStart(4, "0")}`
    } catch (err) {
      this.voucherNumber = `SPV-${Date.now()}`
    }
  }
  next()
})

// Indexes
supplierPaymentVoucherSchema.index({ voucherNumber: 1 })
supplierPaymentVoucherSchema.index({ accDrSupplier: 1 })
supplierPaymentVoucherSchema.index({ voucherDate: -1 })
supplierPaymentVoucherSchema.index({ status: 1 })

module.exports =
  mongoose.models.SupplierPaymentVoucher ||
  mongoose.model("SupplierPaymentVoucher", supplierPaymentVoucherSchema)