const mongoose = require("mongoose")

const overheadCategorySchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: [true, "Category ID is required"],
      unique: true,
      trim: true,
      maxlength: [30, "Category ID cannot exceed 30 characters"],
    },
    label: {
      type: String,
      required: [true, "Category label is required"],
      trim: true,
      maxlength: [60, "Label cannot exceed 60 characters"],
    },
    icon: {
      type: String,
      default: "➕",
      trim: true,
      maxlength: [10, "Icon cannot exceed 10 characters"],
    },
    color: {
      type: String,
      default: "gray",
      enum: {
        values: ["blue", "green", "purple", "red", "yellow", "orange", "gray", "pink", "teal", "indigo"],
        message: "{VALUE} is not a valid color",
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
)

// ── Default seed categories (run once on startup if collection is empty) ───────
overheadCategorySchema.statics.seedDefaults = async function () {
  const count = await this.countDocuments()
  if (count > 0) return // already seeded

  const defaults = [
    { id: "labour",    label: "Labour Cost",        icon: "👷", color: "blue",   sortOrder: 1 },
    { id: "transport", label: "Transport",           icon: "🚛", color: "green",  sortOrder: 2 },
    { id: "packaging", label: "Packaging",           icon: "📦", color: "purple", sortOrder: 3 },
    { id: "customs",   label: "Customs / Duty",      icon: "🏛️", color: "red",    sortOrder: 4 },
    { id: "insurance", label: "Insurance",           icon: "🛡️", color: "yellow", sortOrder: 5 },
    { id: "loading",   label: "Loading / Unloading", icon: "⚓", color: "orange", sortOrder: 6 },
    { id: "other",     label: "Other",               icon: "➕", color: "gray",   sortOrder: 7 },
  ]

  await this.insertMany(defaults)
  console.log("✅ Overhead categories seeded with defaults")
}

module.exports = mongoose.model("OverheadCategory", overheadCategorySchema)