const mongoose = require("mongoose")

const ledgerSchema = new mongoose.Schema(
  {
    serialNumber: { type: Number, required: true },
    date: { type: Date, required: true, default: Date.now },
    accountCode: { type: String, required: true, trim: true, index: true },
    accountName: { type: String, required: true, trim: true, index: true },
    accountCategory: {
      type: String,
      required: true,
      enum: ["Assets", "Liabilities", "Equity", "Revenue", "Expenses"],
    },
    voucherNo: { type: String, required: true, trim: true },
    voucherType: { type: String, required: true, enum: ["Sale", "Purchase", "CPV", "BPV", "CRV", "BRV", "JV"] },
    sourceType: { type: String, required: true, enum: ["Sale", "Voucher", "Product"] },
    sourceId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: "sourceType" },
    grn: { type: String, trim: true, sparse: true },
    description: { type: String, required: true, trim: true },
    debit: { type: Number, default: 0, min: 0 },
    credit: { type: Number, default: 0, min: 0 },
    balance: { type: Number, default: 0 },
    entryType: {
      type: String,
      enum: ["RECEIVABLE", "REVENUE", "PURCHASE", "PAYABLE", "EXPENSE", "CASH", "BANK", "JOURNAL"],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
)

ledgerSchema.index({ accountCode: 1, date: 1 })
ledgerSchema.index({ accountName: 1, date: 1 })

module.exports = mongoose.model("Ledger", ledgerSchema)