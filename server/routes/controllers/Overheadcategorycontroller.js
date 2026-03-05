const OverheadCategory = require("../models/Overheadcategory")

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL ACTIVE CATEGORIES  (frontend fetches this on load)
// GET /api/overhead-categories
// ─────────────────────────────────────────────────────────────────────────────
const getOverheadCategories = async (req, res) => {
  try {
    const categories = await OverheadCategory.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .select("-__v")

    res.json({ success: true, data: categories })
  } catch (error) {
    console.error("Error fetching overhead categories:", error)
    res.status(500).json({ message: "Error fetching overhead categories", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET ALL (including inactive) — for admin panel
// GET /api/overhead-categories/all
// ─────────────────────────────────────────────────────────────────────────────
const getAllOverheadCategories = async (req, res) => {
  try {
    const categories = await OverheadCategory.find()
      .sort({ sortOrder: 1, createdAt: 1 })
      .select("-__v")

    res.json({ success: true, data: categories })
  } catch (error) {
    console.error("Error fetching all overhead categories:", error)
    res.status(500).json({ message: "Error fetching overhead categories", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CREATE CATEGORY
// POST /api/overhead-categories
// ─────────────────────────────────────────────────────────────────────────────
const createOverheadCategory = async (req, res) => {
  try {
    const { id, label, icon, color, sortOrder } = req.body

    if (!id || !label) {
      return res.status(400).json({ message: "ID and label are required" })
    }

    // Check duplicate id
    const existing = await OverheadCategory.findOne({ id: id.trim() })
    if (existing) {
      return res.status(400).json({ message: `Category with id "${id}" already exists` })
    }

    const category = new OverheadCategory({
      id:        id.trim(),
      label:     label.trim(),
      icon:      icon || "➕",
      color:     color || "gray",
      sortOrder: sortOrder || 0,
      isActive:  true,
    })

    const saved = await category.save()
    res.status(201).json({ success: true, data: saved })
  } catch (error) {
    console.error("Error creating overhead category:", error)
    if (error.code === 11000) {
      return res.status(400).json({ message: "Category ID already exists" })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Validation error", errors: Object.values(error.errors).map((e) => e.message) })
    }
    res.status(500).json({ message: "Error creating overhead category", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE CATEGORY
// PUT /api/overhead-categories/:id
// ─────────────────────────────────────────────────────────────────────────────
const updateOverheadCategory = async (req, res) => {
  try {
    const { label, icon, color, sortOrder, isActive } = req.body

    const updateData = {}
    if (label     !== undefined) updateData.label     = label.trim()
    if (icon      !== undefined) updateData.icon      = icon
    if (color     !== undefined) updateData.color     = color
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder
    if (isActive  !== undefined) updateData.isActive  = isActive

    const category = await OverheadCategory.findOneAndUpdate(
      { id: req.params.id },
      updateData,
      { new: true, runValidators: true }
    )

    if (!category) {
      return res.status(404).json({ message: "Overhead category not found" })
    }

    res.json({ success: true, data: category })
  } catch (error) {
    console.error("Error updating overhead category:", error)
    if (error.name === "ValidationError") {
      return res.status(400).json({ message: "Validation error", errors: Object.values(error.errors).map((e) => e.message) })
    }
    res.status(500).json({ message: "Error updating overhead category", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SOFT DELETE (set isActive = false)
// DELETE /api/overhead-categories/:id
// ─────────────────────────────────────────────────────────────────────────────
const deleteOverheadCategory = async (req, res) => {
  try {
    const category = await OverheadCategory.findOneAndUpdate(
      { id: req.params.id },
      { isActive: false },
      { new: true }
    )

    if (!category) {
      return res.status(404).json({ message: "Overhead category not found" })
    }

    res.json({ success: true, message: `Category "${category.label}" deactivated successfully` })
  } catch (error) {
    console.error("Error deleting overhead category:", error)
    res.status(500).json({ message: "Error deleting overhead category", error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// REORDER CATEGORIES
// PUT /api/overhead-categories/reorder
// body: [{ id: "labour", sortOrder: 1 }, ...]
// ─────────────────────────────────────────────────────────────────────────────
const reorderOverheadCategories = async (req, res) => {
  try {
    const { order } = req.body
    if (!Array.isArray(order)) {
      return res.status(400).json({ message: "order must be an array of { id, sortOrder }" })
    }

    await Promise.all(
      order.map(({ id, sortOrder }) =>
        OverheadCategory.findOneAndUpdate({ id }, { sortOrder })
      )
    )

    const updated = await OverheadCategory.find({ isActive: true }).sort({ sortOrder: 1 })
    res.json({ success: true, data: updated })
  } catch (error) {
    console.error("Error reordering overhead categories:", error)
    res.status(500).json({ message: "Error reordering categories", error: error.message })
  }
}

module.exports = {
  getOverheadCategories,
  getAllOverheadCategories,
  createOverheadCategory,
  updateOverheadCategory,
  deleteOverheadCategory,
  reorderOverheadCategories,
}