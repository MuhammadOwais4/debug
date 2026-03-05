const express = require("express")
const router  = express.Router()
const {
  getOverheadCategories,
  getAllOverheadCategories,
  createOverheadCategory,
  updateOverheadCategory,
  deleteOverheadCategory,
  reorderOverheadCategories,
} = require("./controllers/Overheadcategorycontroller")

// Public / frontend routes
router.get("/",    getOverheadCategories)       // GET  /api/overhead-categories       → active only
router.get("/all", getAllOverheadCategories)     // GET  /api/overhead-categories/all   → all (admin)

// Admin CRUD
router.post("/",            createOverheadCategory)   // POST   /api/overhead-categories
router.put("/reorder",      reorderOverheadCategories)// PUT    /api/overhead-categories/reorder
router.put("/:id",          updateOverheadCategory)   // PUT    /api/overhead-categories/:id
router.delete("/:id",       deleteOverheadCategory)   // DELETE /api/overhead-categories/:id

module.exports = router