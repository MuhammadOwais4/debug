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
  getPurchaseTypes,
  getProductSummary,
  getProductsWithSummary,
  processPurchaseReturn,
  getPurchaseReturns,
} = require("./controllers/productController")

// Product CRUD routes
router.get("/", getProducts) // Get all products with filters
router.get("/with-summary", getProductsWithSummary) // Get all products with summary
router.post("/", createProduct) // Create new product
router.get("/:id", getProduct) // Get single product
router.put("/:id", updateProduct) // Update product
router.delete("/:id", deleteProduct) // Delete product

// Stock management
router.patch("/:id/stock", updateStock) // Update stock (add/subtract)

router.post("/return", processPurchaseReturn) // Process purchase return
router.get("/returns/:id", getPurchaseReturns) // Get purchase return details

// Product filtering and search routes
router.get("/category/:category", getProductsByCategory) // Get products by category
router.get("/vendor/:vendorName", getProductsByVendor) // Get products by vendor
router.get("/filter/low-stock", getLowStockProducts) // Get low stock products
router.get("/filter/expiring", getExpiringProducts) // Get expiring products
router.get("/filter/expired", getExpiredProducts) // Get expired products

// Metadata routes
router.get("/meta/categories", getProductCategories) // Get all categories
router.get("/meta/vendors", getVendors) // Get all vendors
router.get("/meta/purchase-types", getPurchaseTypes) // Get all purchase types

// Summary and reporting
router.get("/:id/summary", getProductSummary) // Get detailed product summary with GRN tracking

module.exports = router
