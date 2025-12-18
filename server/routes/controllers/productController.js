const Product = require("../models/Product")
const Liability = require("../models/chart-of-accounts/Liability")
const Asset = require("../models/chart-of-accounts/Asset")

// Get all products with optional filters
const getProducts = async (req, res) => {
  try {
    const { category, search, lowStock, expiryStatus, vendorName } = req.query
    const filter = {}

    if (category) {
      filter.category = category
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" }
    }

    if (lowStock === "true") {
      filter.quantity = { $lt: 5 }
    }

    if (vendorName) {
      // Find vendor by name in Liability model
      const vendors = await Liability.find({
        name: { $regex: vendorName, $options: "i" },
        type: "PAYABLES",
      })
      if (vendors.length > 0) {
        filter.vendorName = { $in: vendors.map((v) => v._id) }
      }
    }

    // Handle expiry status filtering
    if (expiryStatus) {
      const now = new Date()
      switch (expiryStatus) {
        case "expired":
          filter.expiryDate = { $lt: now }
          break
        case "expiring_soon":
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          filter.expiryDate = { $gte: now, $lte: weekFromNow }
          break
        case "expiring_month":
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          filter.expiryDate = { $gte: now, $lte: monthFromNow }
          break
        case "no_expiry":
          filter.expiryDate = { $exists: false }
          break
      }
    }

    const products = await Product.find(filter)
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")
      .sort({ createdAt: -1 })

    res.json(products)
  } catch (error) {
    console.error("Error fetching products:", error)
    res.status(500).json({ message: "Error fetching products", error: error.message })
  }
}

// Get a single product
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }
    res.json(product)
  } catch (error) {
    console.error("Error fetching product:", error)
    res.status(500).json({ message: "Error fetching product", error: error.message })
  }
}

// Create a new product (Purchase Entry)
const createProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      purchaseRate,
      saleRate,
      quantity,
      serialNumber,
      expiryDate,
      vendorName,
      vendorPhone,
      vendorBillNumber,
      notes,
      grn,
      purchaseType,
    } = req.body

    // Log received data for debugging
    console.log("Received product data:", req.body)

    // Validation for required fields
    if (!name || !category || !purchaseRate || !saleRate || quantity === undefined || !purchaseType) {
      return res.status(400).json({
        message: "Name, category, purchase rate, sale rate, quantity, and purchase type are required",
      })
    }

    if (purchaseRate < 0 || saleRate < 0 || quantity < 0) {
      return res.status(400).json({ message: "Rates and quantity must be non-negative" })
    }

    // Validate purchaseType exists in Asset model
    const assetExists = await Asset.findById(purchaseType)
    if (!assetExists) {
      return res.status(400).json({ message: "Invalid purchase type. Asset not found." })
    }

    // Validate vendorName if provided
    if (vendorName) {
      const vendorExists = await Liability.findById(vendorName)
      if (!vendorExists) {
        return res.status(400).json({ message: "Invalid vendor. Liability account not found." })
      }
      if (vendorExists.type !== "PAYABLES") {
        return res.status(400).json({ message: "Selected vendor must be of type PAYABLES." })
      }
    }

    // Validate expiry date if provided (optional field)
    if (expiryDate && new Date(expiryDate) <= new Date()) {
      return res.status(400).json({ message: "Expiry date must be in the future" })
    }

    // Validate serial number uniqueness if provided
    if (serialNumber) {
      const existingProduct = await Product.findOne({ serialNumber })
      if (existingProduct) {
        return res.status(400).json({ message: "Serial number already exists" })
      }
    }

    if (vendorBillNumber) {
      const existingBill = await Product.findOne({ vendorBillNumber })
      if (existingBill) {
        return res.status(400).json({ message: "Vendor bill number already exists" })
      }
    }

    // Calculate purchase amount and balance amount
    const purchaseAmount = quantity * purchaseRate
    const balanceAmount = purchaseAmount // Initially same as purchase amount

    const productData = {
      name,
      category,
      purchaseRate,
      saleRate,
      quantity, // Current balance quantity
      purchaseQuantity: quantity, // Original purchase quantity (unchangeable)
      purchaseAmount, // Original purchase amount (unchangeable)
      balanceAmount, // Current balance amount
      totalSoldQuantity: 0, // No sales yet
      purchaseType,
    }

    // Add optional fields if provided
    if (serialNumber) productData.serialNumber = serialNumber
    if (expiryDate) productData.expiryDate = new Date(expiryDate)
    if (vendorName) productData.vendorName = vendorName
    if (vendorPhone) productData.vendorPhone = vendorPhone
    if (vendorBillNumber) productData.vendorBillNumber = vendorBillNumber
    if (notes) productData.notes = notes
    if (grn) productData.grn = grn

    console.log("Final product data to save:", productData)

    const product = new Product(productData)
    const savedProduct = await product.save()

    // Populate the references before sending response
    await savedProduct.populate("vendorName", "name code balance description")
    await savedProduct.populate("purchaseType", "name type code description")

    res.status(201).json(savedProduct)
  } catch (error) {
    console.error("Error creating product:", error)
    if (error.code === 11000) {
      if (error.keyPattern?.name) {
        res.status(400).json({ message: "Product name already exists" })
      } else if (error.keyPattern?.serialNumber) {
        res.status(400).json({ message: "Serial number already exists" })
      } else if (error.keyPattern?.vendorBillNumber) {
        res.status(400).json({ message: "Vendor bill number already exists" })
      } else if (error.keyPattern?.grn) {
        res.status(400).json({ message: "GRN already exists" })
      } else {
        res.status(400).json({ message: "Duplicate entry detected" })
      }
    } else if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      res.status(400).json({ message: "Validation error", errors: validationErrors })
    } else {
      res.status(500).json({ message: "Error creating product", error: error.message })
    }
  }
}

// Update a product
const updateProduct = async (req, res) => {
  try {
    const {
      name,
      category,
      purchaseRate,
      saleRate,
      quantity,
      serialNumber,
      expiryDate,
      vendorName,
      vendorPhone,
      notes,
      grn,
      vendorBillNumber,
      purchaseType,
    } = req.body

    // Log received data for debugging
    console.log("Received update data:", req.body)

    // Validation
    if (purchaseRate !== undefined && purchaseRate < 0) {
      return res.status(400).json({ message: "Purchase rate must be non-negative" })
    }
    if (saleRate !== undefined && saleRate < 0) {
      return res.status(400).json({ message: "Sale rate must be non-negative" })
    }
    if (quantity !== undefined && quantity < 0) {
      return res.status(400).json({ message: "Quantity must be non-negative" })
    }

    // Validate purchaseType if provided
    if (purchaseType) {
      const assetExists = await Asset.findById(purchaseType)
      if (!assetExists) {
        return res.status(400).json({ message: "Invalid purchase type. Asset not found." })
      }
    }

    // Validate vendorName if provided
    if (vendorName) {
      const vendorExists = await Liability.findById(vendorName)
      if (!vendorExists) {
        return res.status(400).json({ message: "Invalid vendor. Liability account not found." })
      }
      if (vendorExists.type !== "PAYABLES") {
        return res.status(400).json({ message: "Selected vendor must be of type PAYABLES." })
      }
    }

    // Validate expiry date if provided (optional field)
    if (expiryDate && new Date(expiryDate) <= new Date()) {
      return res.status(400).json({ message: "Expiry date must be in the future" })
    }

    // Validate serial number uniqueness if provided and changed
    if (serialNumber) {
      const existingProduct = await Product.findOne({
        serialNumber,
        _id: { $ne: req.params.id },
      })
      if (existingProduct) {
        return res.status(400).json({ message: "Serial number already exists" })
      }
    }

    // Validate vendor bill number uniqueness if provided and changed
    if (vendorBillNumber) {
      const existingBill = await Product.findOne({
        vendorBillNumber,
        _id: { $ne: req.params.id },
      })
      if (existingBill) {
        return res.status(400).json({ message: "Vendor bill number already exists" })
      }
    }

    // Get current product to recalculate amounts if needed
    const currentProduct = await Product.findById(req.params.id)
    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" })
    }

    const updateData = {}

    // Add fields to update only if they are provided
    if (grn !== undefined) updateData.grn = grn
    if (name !== undefined) updateData.name = name
    if (category !== undefined) updateData.category = category
    if (purchaseRate !== undefined) {
      updateData.purchaseRate = purchaseRate
      // Recalculate balance amount with new purchase rate
      updateData.balanceAmount = currentProduct.quantity * purchaseRate
    }
    if (saleRate !== undefined) updateData.saleRate = saleRate
    if (quantity !== undefined) {
      updateData.quantity = quantity
      // Recalculate balance amount with new quantity
      const rate = purchaseRate !== undefined ? purchaseRate : currentProduct.purchaseRate
      updateData.balanceAmount = quantity * rate
    }
    if (serialNumber !== undefined) updateData.serialNumber = serialNumber
    if (expiryDate !== undefined) updateData.expiryDate = expiryDate ? new Date(expiryDate) : null
    if (vendorName !== undefined) updateData.vendorName = vendorName
    if (vendorPhone !== undefined) updateData.vendorPhone = vendorPhone
    if (vendorBillNumber !== undefined) updateData.vendorBillNumber = vendorBillNumber
    if (notes !== undefined) updateData.notes = notes
    if (purchaseType !== undefined) updateData.purchaseType = purchaseType

    console.log("Final update data:", updateData)

    const product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    res.json(product)
  } catch (error) {
    console.error("Error updating product:", error)
    if (error.code === 11000) {
      if (error.keyPattern?.name) {
        res.status(400).json({ message: "Product name already exists" })
      } else if (error.keyPattern?.serialNumber) {
        res.status(400).json({ message: "Serial number already exists" })
      } else if (error.keyPattern?.vendorBillNumber) {
        res.status(400).json({ message: "Vendor bill number already exists" })
      } else if (error.keyPattern?.grn) {
        res.status(400).json({ message: "GRN already exists" })
      } else {
        res.status(400).json({ message: "Duplicate entry detected" })
      }
    } else if (error.name === "ValidationError") {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      res.status(400).json({ message: "Validation error", errors: validationErrors })
    } else {
      res.status(500).json({ message: "Error updating product", error: error.message })
    }
  }
}

// Update product stock (for sale/purchase transactions)
const updateStock = async (req, res) => {
  try {
    const { quantity, operation } = req.body

    if (!quantity || quantity <= 0) {
      return res.status(400).json({ message: "Quantity must be a positive number" })
    }

    if (!operation || !["add", "subtract"].includes(operation)) {
      return res.status(400).json({ message: 'Operation must be either "add" or "subtract"' })
    }

    const product = await Product.findById(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    if (operation === "add") {
      // Adding more stock (additional purchase)
      const additionalAmount = quantity * product.purchaseRate
      
      product.quantity += quantity
      product.purchaseQuantity += quantity // Update total purchase quantity
      product.purchaseAmount += additionalAmount // Update total purchase amount
      product.balanceAmount = product.quantity * product.purchaseRate // Recalculate balance amount
      
    } else if (operation === "subtract") {
      // Sale transaction
      if (product.quantity < quantity) {
        return res.status(400).json({ message: "Insufficient stock available" })
      }
      
      product.quantity -= quantity // Decrease current quantity
      product.totalSoldQuantity += quantity // Track total sold
      product.balanceAmount = product.quantity * product.purchaseRate // Recalculate balance amount
    }

    const updatedProduct = await product.save()
    await updatedProduct.populate("vendorName", "name code balance description")
    await updatedProduct.populate("purchaseType", "name type code description")

    res.json(updatedProduct)
  } catch (error) {
    console.error("Error updating stock:", error)
    res.status(500).json({ message: "Error updating stock", error: error.message })
  }
}

// Delete a product
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id)
    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }
    res.json({ message: "Product deleted successfully" })
  } catch (error) {
    console.error("Error deleting product:", error)
    res.status(500).json({ message: "Error deleting product", error: error.message })
  }
}

// Get products by category
const getProductsByCategory = async (req, res) => {
  try {
    const { category } = req.params
    const products = await Product.find({ category })
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")
      .sort({ name: 1 })

    res.json(products)
  } catch (error) {
    console.error("Error fetching products by category:", error)
    res.status(500).json({ message: "Error fetching products by category", error: error.message })
  }
}

// Get low stock products
const getLowStockProducts = async (req, res) => {
  try {
    const threshold = req.query.threshold || 5
    const products = await Product.find({ quantity: { $lt: threshold } })
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")
      .sort({ quantity: 1 })

    res.json(products)
  } catch (error) {
    console.error("Error fetching low stock products:", error)
    res.status(500).json({ message: "Error fetching low stock products", error: error.message })
  }
}

// Get products expiring soon
const getExpiringProducts = async (req, res) => {
  try {
    const { days = 30 } = req.query
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + Number.parseInt(days))

    const products = await Product.find({
      expiryDate: {
        $exists: true,
        $gte: new Date(),
        $lte: futureDate,
      },
    })
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")
      .sort({ expiryDate: 1 })

    res.json(products)
  } catch (error) {
    console.error("Error fetching expiring products:", error)
    res.status(500).json({ message: "Error fetching expiring products", error: error.message })
  }
}

// Get expired products
const getExpiredProducts = async (req, res) => {
  try {
    const products = await Product.find({
      expiryDate: {
        $exists: true,
        $lt: new Date(),
      },
    })
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")
      .sort({ expiryDate: -1 })

    res.json(products)
  } catch (error) {
    console.error("Error fetching expired products:", error)
    res.status(500).json({ message: "Error fetching expired products", error: error.message })
  }
}

// Get products by vendor
const getProductsByVendor = async (req, res) => {
  try {
    const { vendorName } = req.params

    // Find vendors matching the name
    const vendors = await Liability.find({
      name: { $regex: vendorName, $options: "i" },
      type: "PAYABLES",
    })

    if (vendors.length === 0) {
      return res.json([])
    }

    const vendorIds = vendors.map((v) => v._id)

    const products = await Product.find({ vendorName: { $in: vendorIds } })
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")
      .sort({ name: 1 })

    res.json(products)
  } catch (error) {
    console.error("Error fetching products by vendor:", error)
    res.status(500).json({ message: "Error fetching products by vendor", error: error.message })
  }
}

// Get product categories
const getProductCategories = async (req, res) => {
  try {
    const categories = await Product.distinct("category")
    res.json(categories)
  } catch (error) {
    console.error("Error fetching categories:", error)
    res.status(500).json({ message: "Error fetching categories", error: error.message })
  }
}

// Get unique vendors
const getVendors = async (req, res) => {
  try {
    // Get all vendors from Liability model with type PAYABLES
    const vendors = await Liability.find({
      type: "PAYABLES",
      isActive: true,
    }).select("_id name code balance description")

    res.json(vendors)
  } catch (error) {
    console.error("Error fetching vendors:", error)
    res.status(500).json({ message: "Error fetching vendors", error: error.message })
  }
}

// Get purchase types
const getPurchaseTypes = async (req, res) => {
  try {
    // Get all assets that can be used as purchase types
    const purchaseTypes = await Asset.find({
      type: { $in: ["Purchases", "Stock", "General Account"] },
      isActive: true,
    }).select("_id name code type description")

    res.json(purchaseTypes)
  } catch (error) {
    console.error("Error fetching purchase types:", error)
    res.status(500).json({ message: "Error fetching purchase types", error: error.message })
  }
}

// Get product summary (GRN details with purchase and sales tracking)
const getProductSummary = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")

    if (!product) {
      return res.status(404).json({ message: "Product not found" })
    }

    const summary = {
      grn: product.grn,
      name: product.name,
      category: product.category,
      
      // Purchase Information (Original - Unchangeable)
      purchaseDetails: {
        purchaseQuantity: product.purchaseQuantity,
        purchaseRate: product.purchaseRate,
        purchaseAmount: product.purchaseAmount,
      },
      
      // Sales Information
      salesDetails: {
        totalSoldQuantity: product.totalSoldQuantity,
        saleRate: product.saleRate,
        totalSaleAmount: product.totalSoldQuantity * product.saleRate,
        totalSaleProfit: (product.totalSoldQuantity * product.saleRate) - (product.totalSoldQuantity * product.purchaseRate),
      },
      
      // Current Balance
      currentBalance: {
        balanceQuantity: product.quantity,
        balanceAmount: product.balanceAmount,
        calculatedBalanceAmount: product.quantity * product.purchaseRate, // Verification
      },
      
      // Additional Information
      vendor: product.vendorName,
      purchaseType: product.purchaseType,
      serialNumber: product.serialNumber,
      vendorBillNumber: product.vendorBillNumber,
      expiryDate: product.expiryDate,
      notes: product.notes,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }

    res.json(summary)
  } catch (error) {
    console.error("Error fetching product summary:", error)
    res.status(500).json({ message: "Error fetching product summary", error: error.message })
  }
}

// Get all products with full summary details
const getProductsWithSummary = async (req, res) => {
  try {
    const { category, search, lowStock, expiryStatus, vendorName } = req.query
    const filter = {}

    if (category) {
      filter.category = category
    }

    if (search) {
      filter.name = { $regex: search, $options: "i" }
    }

    if (lowStock === "true") {
      filter.quantity = { $lt: 5 }
    }

    if (vendorName) {
      const vendors = await Liability.find({
        name: { $regex: vendorName, $options: "i" },
        type: "PAYABLES",
      })
      if (vendors.length > 0) {
        filter.vendorName = { $in: vendors.map((v) => v._id) }
      }
    }

    if (expiryStatus) {
      const now = new Date()
      switch (expiryStatus) {
        case "expired":
          filter.expiryDate = { $lt: now }
          break
        case "expiring_soon":
          const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          filter.expiryDate = { $gte: now, $lte: weekFromNow }
          break
        case "expiring_month":
          const monthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
          filter.expiryDate = { $gte: now, $lte: monthFromNow }
          break
        case "no_expiry":
          filter.expiryDate = { $exists: false }
          break
      }
    }

    const products = await Product.find(filter)
      .populate("vendorName", "name code balance description")
      .populate("purchaseType", "name type code description")
      .sort({ createdAt: -1 })

    // Add summary calculations to each product
    const productsWithSummary = products.map(product => ({
      ...product.toObject(),
      summary: {
        totalSaleAmount: product.totalSoldQuantity * product.saleRate,
        totalSaleProfit: (product.totalSoldQuantity * product.saleRate) - (product.totalSoldQuantity * product.purchaseRate),
        balancePercentage: product.purchaseQuantity > 0 ? ((product.quantity / product.purchaseQuantity) * 100).toFixed(2) : 0,
      }
    }))

    res.json(productsWithSummary)
  } catch (error) {
    console.error("Error fetching products with summary:", error)
    res.status(500).json({ message: "Error fetching products with summary", error: error.message })
  }
}

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  getProductsByCategory,
  getLowStockProducts,
  getExpiringProducts,
  getExpiredProducts,
  getProductsByVendor,
  getProductCategories,
  getVendors,
  getPurchaseTypes,
  getProductSummary,
  getProductsWithSummary,
}