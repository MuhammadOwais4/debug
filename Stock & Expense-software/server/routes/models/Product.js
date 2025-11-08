const mongoose = require("mongoose")

const generateGRN = () => {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, "0")
  return `GRN${timestamp}${random}`
}

const productSchema = new mongoose.Schema(
  {
    grn: {
      type: String,
      unique: true,
      default: generateGRN,
      maxlength: [20, "GRN cannot exceed 20 characters"],
    },
    name: {
      type: String,
      trim: true,
      unique: true,
      maxlength: [100, "Product name cannot exceed 100 characters"],
    },
    category: {
      type: String,
      trim: true,
      enum: ["Electronics", "Furniture", "Stationery", "Kitchenware", "Clothing", "Food", "Other"],
    },
    purchaseRate: {
      type: Number,
      min: [0, "Purchase rate cannot be negative"],
    },
    saleRate: {
      type: Number,
      min: [0, "Sale rate cannot be negative"],
    },
    quantity: {
      type: Number,
      min: [0, "Quantity cannot be negative"],
      default: 0,
    },
    serialNumber: {
      type: String,
      trim: true,
      maxlength: [50, "Serial number cannot exceed 50 characters"],
      sparse: true,
    },
    vendorBillNumber: {
      type: String,
      trim: true,
      maxlength: [50, "Bill number cannot exceed 50 characters"],
    },
    expiryDate: {
      type: Date,
      validate: {
        validator: (date) => {
          return !date || date > new Date()
        },
        message: "Expiry date must be in the future",
      },
    },
    // Reference to Liability model for vendor
    vendorName: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Liability",
    },
    vendorPhone: {
      type: String,
      trim: true,
      maxlength: [20, "Vendor phone cannot exceed 20 characters"],
    },
    // Reference to Asset model for purchase type
    purchaseType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Asset",
      required: [true, "Purchase type is required"],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, "Notes cannot exceed 500 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

module.exports = mongoose.model("Product", productSchema)
