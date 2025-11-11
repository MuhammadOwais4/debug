const express = require("express")
const router = express.Router()
const {
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
} = require("./controllers/productController.js")

// Get all products with optional filters
router.get("/", getProducts)

// Get product categories
router.get("/categories", getProductCategories)

// Get vendors
router.get("/vendors", getVendors)

// Get products by category
router.get("/category/:category", getProductsByCategory)

// Get products by vendor
router.get("/vendor/:vendorName", getProductsByVendor)

// Get low stock products
router.get("/low-stock", getLowStockProducts)

// Get expiring products
router.get("/expiring", getExpiringProducts)

// Get expired products
router.get("/expired", getExpiredProducts)

// Get a single product
router.get("/:id", getProduct)

// Create a new product
router.post("/", createProduct)

// Update a product
router.put("/:id", updateProduct)

// Update product stock
router.patch("/:id/stock", updateStock)

// Delete a product
router.delete("/:id", deleteProduct)

module.exports = router
