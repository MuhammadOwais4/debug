const mongoose = require("mongoose")

const generateGRN = () => {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `GRN${timestamp}${random}`
}

// ── Each overhead line item ────────────────────────────────────────────────────
const overheadItemSchema = new mongoose.Schema(
  {
    id:     { type: String, required: true },   // "labour" | "transport" | ...
    label:  { type: String, required: true },   // "Labour Cost" | "Transport" | ...
    icon:   { type: String, default: "" },
    amount: { type: Number, default: 0, min: [0, "Amount cannot be negative"] },
  },
  { _id: false }
)

const productSchema = new mongoose.Schema(
  {
    grn: {
      type: String,
      unique: true,
      default: generateGRN,
      sparse: true,
      maxlength: [20, "GRN cannot exceed 20 characters"],
    },
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      unique: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      trim: true,
      enum: {
        values: ["Electronics", "Furniture", "Stationery", "Kitchenware", "Clothing", "Food", "Garments", "Other"],
        message: "{VALUE} is not a valid category",
      },
    },

    // Purchase Rate (Original purchase rate, per unit excluding overhead)
    purchaseRate: {
      type: Number,
      required: [true, "Purchase rate is required"],
      min: [0, "Purchase rate cannot be negative"],
    },

    // ── Total factory overhead per unit (auto-summed from breakdown) ───────
    factoryOverhead: {
      type: Number,
      default: 0,
      min: [0, "Factory overhead cannot be negative"],
    },

    // ── Itemised overhead breakdown stored for display & editing ───────────
    factoryOverheadBreakdown: {
      type: [overheadItemSchema],
      default: [],
    },

    // Sale Rate
    saleRate: {
      type: Number,
      required: [true, "Sale rate is required"],
      min: [0, "Sale rate cannot be negative"],
    },

    // ORIGINAL PURCHASE DATA (Initial snapshot)
    purchaseQuantity: {
      type: Number,
      required: [true, "Purchase quantity is required"],
      min: [0, "Purchase quantity cannot be negative"],
      default: 0,
    },
    purchaseAmount: {
      type: Number,
      required: [true, "Purchase amount is required"],
      min: [0, "Purchase amount cannot be negative"],
      default: 0,
    },

    // CURRENT / BALANCE DATA
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    balanceAmount: {
      type: Number,
      min: [0, "Balance amount cannot be negative"],
      default: 0,
    },

    // TRACKING
    totalSoldQuantity: {
      type: Number,
      min: [0, "Total sold quantity cannot be negative"],
      default: 0,
    },

    serialNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      maxlength: [50, "Serial number cannot exceed 50 characters"],
    },
    vendorBillNumber: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      maxlength: [50, "Bill number cannot exceed 50 characters"],
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: (date) => !date || date > new Date(),
        message: "Expiry date must be in the future",
      },
    },

    vendorName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Liability",
    },
    vendorPhone: {
      type: String,
      trim: true,
      maxlength: [20, "Vendor phone cannot exceed 20 characters"],
    },

    ReturnedAmount: { type: Number, default: 0, min: [0, "Returned amount cannot be negative"] },
    ReturnedDate:   { type: Date },
    ReturnQuantity: { type: Number, default: 0, min: [0, "Return quantity cannot be negative"] },

    purchaseType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: [true, "Purchase type is required"],
    },
    notes:  { type: String, trim: true, maxlength: [500, "Notes cannot exceed 500 characters"] },
    Reason: { type: String, trim: true, maxlength: [500, "Reason for return cannot exceed 500 characters"] },
  },
  {
    timestamps: true,
    toJSON:   { virtuals: true },
    toObject: { virtuals: true },
  }
)

// ── Virtuals ──────────────────────────────────────────────────────────────────

productSchema.virtual("totalCostPerUnit").get(function () {
  return this.purchaseRate + (this.factoryOverhead || 0)
})

productSchema.virtual("profitPerUnit").get(function () {
  return this.saleRate - this.purchaseRate
})

productSchema.virtual("totalProfit").get(function () {
  return (this.saleRate - this.purchaseRate) * this.totalSoldQuantity
})

productSchema.virtual("totalSaleAmount").get(function () {
  return this.totalSoldQuantity * this.saleRate
})

productSchema.virtual("stockStatus").get(function () {
  if (this.quantity === 0) return "OUT_OF_STOCK"
  if (this.quantity < 5)  return "LOW_STOCK"
  return "IN_STOCK"
})

productSchema.virtual("expiryStatus").get(function () {
  if (!this.expiryDate) return "NO_EXPIRY"
  const now  = new Date()
  const exp  = new Date(this.expiryDate)
  if (exp < now) return "EXPIRED"
  const days = Math.ceil((exp - now) / (1000 * 60 * 60 * 24))
  if (days <= 7)  return "EXPIRING_SOON"
  if (days <= 30) return "EXPIRING_THIS_MONTH"
  return "VALID"
})

productSchema.virtual("balancePercentage").get(function () {
  if (this.purchaseQuantity === 0) return 0
  return ((this.quantity / this.purchaseQuantity) * 100).toFixed(2)
})

// ── Pre-save: re-sum breakdown → factoryOverhead → balanceAmount ──────────────
productSchema.pre("save", function (next) {
  // Always keep factoryOverhead in sync with breakdown array
  if (this.factoryOverheadBreakdown && this.factoryOverheadBreakdown.length > 0) {
    this.factoryOverhead = this.factoryOverheadBreakdown.reduce(
      (sum, item) => sum + (Number(item.amount) || 0),
      0
    )
  }
  const totalCostPerUnit = this.purchaseRate + (this.factoryOverhead || 0)
  this.balanceAmount = this.quantity * totalCostPerUnit
  next()
})

// ── Indexes ───────────────────────────────────────────────────────────────────
productSchema.index({ name: 1 })
productSchema.index({ category: 1 })
productSchema.index({ vendorName: 1 })
productSchema.index({ quantity: 1 })
productSchema.index({ expiryDate: 1 })
productSchema.index({ grn: 1 })

module.exports = mongoose.model("Product", productSchema)