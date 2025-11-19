const mongoose = require("mongoose")

const SaleSchema = new mongoose.Schema(
  {
    // Invoice field - auto-generated unique number
    invoice: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
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
    // Customer Information
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
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
    },
    // Sale Account Information
    saleAccount: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Revenue",
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

// ENHANCED Pre-save middleware with better invoice generation
SaleSchema.pre("save", async function (next) {
  try {
    // AUTO-GENERATE INVOICE NUMBER FOR NEW SALES
    if (this.isNew && !this.invoice) {
      try {
        // Use a more robust query to find the last invoice
        const lastSale = await this.constructor
          .findOne({ 
            invoice: { $exists: true, $ne: null, $regex: /^INV-\d+$/ } 
          })
          .sort({ invoice: -1, createdAt: -1 })
          .select("invoice")
          .lean()

        let invoiceNumber = 1

        if (lastSale && lastSale.invoice) {
          // Extract number from invoice (e.g., "INV-0001" -> 1)
          const match = lastSale.invoice.match(/INV-(\d+)/)
          if (match && match[1]) {
            invoiceNumber = parseInt(match[1], 10) + 1
          }
        }

        // Generate new invoice with leading zeros (INV-0001, INV-0002, etc.)
        this.invoice = `INV-${String(invoiceNumber).padStart(4, "0")}`
        console.log(`✅ Generated invoice: ${this.invoice} for sale: ${this._id}`)
      } catch (invoiceError) {
        console.error("❌ Error generating invoice:", invoiceError)
        // Fallback to timestamp-based invoice if error occurs
        this.invoice = `INV-${Date.now()}`
        console.log(`⚠️ Using fallback invoice: ${this.invoice}`)
      }
    }

    // Calculate purchase stock value
    this.purchaseStockValue = this.purchaseQuantity * this.purchaseRate

    // Calculate sale stock value
    this.saleStockValue = this.saleQuantity * this.saleRate

    // Calculate balance values
    this.balanceQuantity = this.purchaseQuantity - this.saleQuantity
    this.balanceRate = this.purchaseRate
    this.balanceStockValue = this.balanceQuantity * this.balanceRate

    // Legacy calculations for backward compatibility
    this.quantity = this.saleQuantity
    this.salePrice = this.saleRate
    this.totalAmount = this.saleQuantity * this.saleRate

    // Populate customer name from Asset model
    if (this.customer && (this.isNew || this.isModified("customer"))) {
      try {
        const Asset = mongoose.model("Asset")
        const receivable = await Asset.findById(this.customer)
        if (receivable && receivable.type === "RECEIVABLES") {
          this.customerName = receivable.name || receivable.accountName
        }
      } catch (err) {
        console.warn("Could not populate customer name:", err.message)
      }
    }

    // Populate sale account information from Revenue model
   // Populate sale account information from Revenue model
if (this.saleAccount && (this.isNew || this.isModified("saleAccount"))) {
  try {
    const Revenue = mongoose.model("Revenue")
    const revenueAccount = await Revenue.findById(this.saleAccount)
    if (revenueAccount && revenueAccount.type === "SALE ACCOUNT") {
      this.saleAccountName = revenueAccount.name || revenueAccount.accountName
      // this.saleType should retain the value selected by the user
    }
  } catch (err) {
    console.warn("Could not populate sale account:", err.message)
  }
}


    // Calculate profit and populate product details
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
    console.error("❌ Error in pre-save hook:", error)
    next(error)
  }
})

// Post-save hook to verify invoice was created
SaleSchema.post("save", function (doc, next) {
  if (doc.invoice) {
    console.log(`✅ Sale saved successfully with invoice: ${doc.invoice}`)
  } else {
    console.warn(`⚠️ Sale saved but invoice is missing: ${doc._id}`)
  }
  next()
})

// Indexes for better query performance
SaleSchema.index({ date: -1 })
SaleSchema.index({ product: 1 })
SaleSchema.index({ itemName: 1 })
SaleSchema.index({ createdAt: -1 })
SaleSchema.index({ category: 1 })
SaleSchema.index({ customer: 1 })
SaleSchema.index({ saleAccount: 1 })
SaleSchema.index({ invoice: 1 })

// Virtual for net stock movement
SaleSchema.virtual("netStockMovement").get(function () {
  return this.purchaseQuantity - this.saleQuantity
})

// Static method to get next invoice number
SaleSchema.statics.getNextInvoiceNumber = async function () {
  const lastSale = await this.findOne({ 
    invoice: { $exists: true, $ne: null, $regex: /^INV-\d+$/ } 
  })
    .sort({ invoice: -1, createdAt: -1 })
    .select("invoice")
    .lean()

  let invoiceNumber = 1

  if (lastSale && lastSale.invoice) {
    const match = lastSale.invoice.match(/INV-(\d+)/)
    if (match && match[1]) {
      invoiceNumber = parseInt(match[1], 10) + 1
    }
  }

  return `INV-${String(invoiceNumber).padStart(4, "0")}`
}

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
    })
    .populate({
      path: "saleAccount",
      select: "name code type balance",
    })
    .populate("product")
    .sort({ date: -1 })
}

module.exports = mongoose.model("Sale", SaleSchema)