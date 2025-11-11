const mongoose = require("mongoose")

const SaleSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Date is required"],
      default: Date.now,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    itemName: {
      type: String,
      required: [true, "Item name is required"],
      trim: true,
    },
    // Purchase Information
    purchaseQuantity: {
      type: Number,
      default: 0,
      min: [0, "Purchase quantity cannot be negative"],
    },
    purchaseRate: {
      type: Number,
      default: 0,
      min: [0, "Purchase rate cannot be negative"],
    },
    purchaseStockValue: {
      type: Number,
      default: 0,
    },
    // Sale Information
    saleQuantity: {
      type: Number,
      required: [true, "Sale quantity is required"],
      min: [1, "Sale quantity must be at least 1"],
    },
    saleRate: {
      type: Number,
      required: [true, "Sale rate is required"],
      min: [0, "Sale rate cannot be negative"],
    },
    saleStockValue: {
      type: Number,
    },
    // Balance Information
    balanceQuantity: {
      type: Number,
      default: 0,
    },
    balanceRate: {
      type: Number,
      default: 0,
    },
    balanceStockValue: {
      type: Number,
      default: 0,
    },
    // Legacy fields for backward compatibility
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    salePrice: {
      type: Number,
      required: [true, "Sale price is required"],
      min: [0, "Sale price cannot be negative"],
    },
    totalAmount: {
      type: Number,
    },
    profit: {
      type: Number,
    },
    // Customer Information - linked to Receivables (Asset model)
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      validate: {
        validator: async function(value) {
          if (!value) return true
          const Asset = mongoose.model("Asset")
          const asset = await Asset.findById(value)
          return asset && asset.type === "RECEIVABLES"
        },
        message: "Customer must be a valid Receivables account",
      },
    },
    customerName: {
      type: String,
      trim: true,
      default: "",
    },
    customerPhone: {
      type: String,
      trim: true,
      default: "",
      validate: {
        validator: (phone) => {
          if (!phone) return true
          return /^\+?[1-9]\d{1,14}$/.test(phone)
        },
        message: "Please enter a valid phone number",
      },
    },
    // Sale Account Information - linked to Revenue model
    saleAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Revenue",
      validate: {
        validator: async function(value) {
          if (!value) return true
          const Revenue = mongoose.model("Revenue")
          const revenue = await Revenue.findById(value)
          return revenue && revenue.type === "SALE ACCOUNT"
        },
        message: "Sale account must be a valid Sale Account from Revenue",
      },
    },
    saleAccountName: {
      type: String,
      trim: true,
      default: "",
    },
    saleType: {
      type: String,
      trim: true,
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
    category: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
)

// Pre-save middleware to calculate all values and populate references
SaleSchema.pre("save", async function (next) {
  try {
    // Calculate purchase stock value
    this.purchaseStockValue = this.purchaseQuantity * this.purchaseRate

    // Calculate sale stock value
    this.saleStockValue = this.saleQuantity * this.saleRate

    // Calculate balance values
    this.balanceQuantity = this.purchaseQuantity - this.saleQuantity
    this.balanceRate = this.purchaseRate // Use purchase rate as balance rate
    this.balanceStockValue = this.balanceQuantity * this.balanceRate

    // Legacy calculations for backward compatibility
    this.quantity = this.saleQuantity
    this.salePrice = this.saleRate
    this.totalAmount = this.saleQuantity * this.saleRate

    // Populate customer name from Receivables (Asset model)
    if (this.customer && (this.isNew || this.isModified("customer"))) {
      const Asset = mongoose.model("Asset")
      const receivable = await Asset.findById(this.customer)
      if (receivable && receivable.type === "RECEIVABLES") {
        this.customerName = receivable.name
      }
    }

    // Populate sale account information from Revenue model
    if (this.saleAccount && (this.isNew || this.isModified("saleAccount"))) {
      const Revenue = mongoose.model("Revenue")
      const revenueAccount = await Revenue.findById(this.saleAccount)
      if (revenueAccount && revenueAccount.type === "SALE ACCOUNT") {
        this.saleAccountName = revenueAccount.name
        this.saleType = revenueAccount.type
      }
    }

    // Find the product to calculate profit and get item name
    if (this.isNew || this.isModified("product") || this.isModified("saleQuantity") || this.isModified("saleRate")) {
      const Product = mongoose.model("Product")
      const product = await Product.findById(this.product)

      if (product) {
        // Set item name from product if not provided
        if (!this.itemName) {
          this.itemName = product.name
        }

        // Set category from product if not provided
        if (!this.category) {
          this.category = product.category || ""
        }

        // Calculate profit using product's purchase rate
        const costPrice = product.purchaseRate || this.purchaseRate || 0
        this.profit = this.totalAmount - this.saleQuantity * costPrice

        // Set purchase rate from product if not provided
        if (!this.purchaseRate) {
          this.purchaseRate = product.purchaseRate || 0
          this.purchaseStockValue = this.purchaseQuantity * this.purchaseRate
          this.balanceRate = this.purchaseRate
          this.balanceStockValue = this.balanceQuantity * this.balanceRate
        }
      } else {
        this.profit = 0
      }
    }

    next()
  } catch (error) {
    next(error)
  }
})

// Index for better query performance
SaleSchema.index({ date: -1 })
SaleSchema.index({ product: 1 })
SaleSchema.index({ itemName: 1 })
SaleSchema.index({ createdAt: -1 })
SaleSchema.index({ category: 1 })
SaleSchema.index({ customer: 1 })
SaleSchema.index({ saleAccount: 1 })

// Virtual for net stock movement
SaleSchema.virtual("netStockMovement").get(function () {
  return this.purchaseQuantity - this.saleQuantity
})

// Method to calculate stock summary
SaleSchema.statics.getStockSummary = async function (filters = {}) {
  const pipeline = [
    { $match: filters },
    {
      $group: {
        _id: "$itemName",
        totalPurchaseQuantity: { $sum: "$purchaseQuantity" },
        totalPurchaseValue: { $sum: "$purchaseStockValue" },
        totalSaleQuantity: { $sum: "$saleQuantity" },
        totalSaleValue: { $sum: "$saleStockValue" },
        totalBalanceQuantity: { $sum: "$balanceQuantity" },
        totalBalanceValue: { $sum: "$balanceStockValue" },
        averagePurchaseRate: { $avg: "$purchaseRate" },
        averageSaleRate: { $avg: "$saleRate" },
        lastTransactionDate: { $max: "$date" },
        transactionCount: { $sum: 1 },
      },
    },
    {
      $project: {
        itemName: "$_id",
        totalPurchaseQuantity: 1,
        totalPurchaseValue: { $round: ["$totalPurchaseValue", 2] },
        totalSaleQuantity: 1,
        totalSaleValue: { $round: ["$totalSaleValue", 2] },
        totalBalanceQuantity: 1,
        totalBalanceValue: { $round: ["$totalBalanceValue", 2] },
        averagePurchaseRate: { $round: ["$averagePurchaseRate", 2] },
        averageSaleRate: { $round: ["$averageSaleRate", 2] },
        lastTransactionDate: 1,
        transactionCount: 1,
        _id: 0,
      },
    },
    { $sort: { totalBalanceValue: -1 } },
  ]

  return this.aggregate(pipeline)
}

// Method to get sales with populated references
SaleSchema.statics.getSalesWithReferences = async function (filters = {}) {
  return this.find(filters)
    .populate({
      path: "customer",
      select: "name code type balance",
      match: { type: "RECEIVABLES" }
    })
    .populate({
      path: "saleAccount",
      select: "name code type balance",
      match: { type: "SALE ACCOUNT" }
    })
    .populate("product")
    .sort({ date: -1 })
}

module.exports = mongoose.model("Sale", SaleSchema)