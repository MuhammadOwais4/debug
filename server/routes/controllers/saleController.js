const Sale = require("../models/Sale")
const Product = require("../models/Product")
const Notification = require("../models/Notification")

// Get all sales
exports.getSales = async (req, res) => {
  try {
    const { startDate, endDate, productId, limit, offset } = req.query
    const query = {}

    // Filter by date range
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      }
    } else if (startDate) {
      query.date = { $gte: new Date(startDate) }
    } else if (endDate) {
      query.date = { $lte: new Date(endDate) }
    }

    // Filter by product
    if (productId) {
      query.product = productId
    }

    // Build aggregation pipeline for pagination and population
    const pipeline = [
      { $match: query },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $sort: { date: -1 } },
    ]

    // Add pagination if specified
    if (offset) {
      pipeline.push({ $skip: Number.parseInt(offset) })
    }
    if (limit) {
      pipeline.push({ $limit: Number.parseInt(limit) })
    }

    const sales = await Sale.aggregate(pipeline)

    // Get total count for pagination
    const totalCount = await Sale.countDocuments(query)

    res.status(200).json({
      success: true,
      count: sales.length,
      total: totalCount,
      data: sales,
      pagination: {
        offset: Number.parseInt(offset) || 0,
        limit: Number.parseInt(limit) || sales.length,
        hasMore: (Number.parseInt(offset) || 0) + sales.length < totalCount,
      },
    })
  } catch (error) {
    console.error("Error in getSales:", error)
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    })
  }
}

// Get single sale
exports.getSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id).populate("product", "name purchaseRate saleRate")

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      })
    }

    res.status(200).json({
      success: true,
      data: sale,
    })
  } catch (error) {
    console.error("Error in getSale:", error)
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    })
  }
}

// Create new sale
exports.createSale = async (req, res) => {
  try {
    const {
      product: productId,
      quantity,
      saleQuantity,
      salePrice,
      saleRate,
      itemName,
      date,
      customerName,
      customerPhone,
      notes,
      saleType,
    } = req.body

    // Use new field names if available, fallback to old ones
    const finalQuantity = saleQuantity || quantity
    const finalSaleRate = saleRate || salePrice

    // Validate required fields
    if (!productId || !finalQuantity || !finalSaleRate) {
      return res.status(400).json({
        success: false,
        message: "Product, sale quantity, and sale rate are required",
      })
    }

    // Validate phone number if provided
    if (customerPhone && !/^\+?[1-9]\d{1,14}$/.test(customerPhone)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid phone number",
      })
    }

    // Check if product exists and has enough stock
    const product = await Product.findById(productId)

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      })
    }

    if (product.quantity < finalQuantity) {
      return res.status(400).json({
        success: false,
        message: `Not enough stock available. Only ${product.quantity} units in stock.`,
      })
    }

    const sale = await Sale.create({
      product: productId,
      itemName: itemName || product.name, // Ensure itemName is set
      saleQuantity: Number.parseInt(finalQuantity),
      saleRate: Number.parseFloat(finalSaleRate),
      // Legacy fields for backward compatibility
      quantity: Number.parseInt(finalQuantity),
      salePrice: Number.parseFloat(finalSaleRate),
      date: date || new Date(),
      customerName: customerName || "",
      customerPhone: customerPhone || "",
      notes: notes || "",
      saleType: saleType || "",
    })

    // Update product stock
    product.quantity -= Number.parseInt(finalQuantity)
    await product.save()

    // Populate the sale with product details for response
    const populatedSale = await Sale.findById(sale._id).populate("product", "name purchaseRate saleRate")

    // Create notification for sale
    try {
      await Notification.create({
        type: "sale",
        title: "Sale Recorded",
        message: `Sale recorded: ${finalQuantity} ${product.name} for PKR ${(finalQuantity * finalSaleRate).toFixed(2)}`,
        priority: "medium",
        relatedId: sale._id,
        relatedModel: "Sale",
      })
    } catch (notifError) {
      console.warn("Failed to create sale notification:", notifError)
    }

    // Check if product is now low in stock (using product's lowStockThreshold or default 5)
    const threshold = product.lowStockThreshold || 5
    if (product.quantity <= threshold) {
      try {
        await Notification.create({
          type: "lowStock",
          title: "Low Stock Alert",
          message: `Low stock alert: ${product.name} (${product.quantity} remaining)`,
          priority: "high",
          relatedId: product._id,
          relatedModel: "Product",
        })
      } catch (notifError) {
        console.warn("Failed to create low stock notification:", notifError)
      }
    }

    res.status(201).json({
      success: true,
      data: populatedSale,
      message: "Sale recorded successfully",
    })
  } catch (error) {
    console.error("Error in createSale:", error)
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message)
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: messages,
      })
    } else if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID format",
      })
    } else {
      res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message,
      })
    }
  }
}

// Update sale
exports.updateSale = async (req, res) => {
  try {
    const { product: productId, quantity, salePrice, date, customerName, customerPhone, notes, saleType } = req.body
    const sale = await Sale.findById(req.params.id)

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      })
    }

    // If product or quantity is being updated, we need to adjust stock
    if ((productId && productId !== sale.product.toString()) || (quantity && quantity !== sale.quantity)) {
      // Restore original product stock
      const originalProduct = await Product.findById(sale.product)
      if (originalProduct) {
        originalProduct.quantity += sale.quantity
        await originalProduct.save()
      }

      // If product is being changed, update new product stock
      if (productId && productId !== sale.product.toString()) {
        const newProduct = await Product.findById(productId)

        if (!newProduct) {
          // Restore the stock we just added back
          if (originalProduct) {
            originalProduct.quantity -= sale.quantity
            await originalProduct.save()
          }
          return res.status(404).json({
            success: false,
            message: "New product not found",
          })
        }

        const requiredQuantity = quantity || sale.quantity
        if (newProduct.quantity < requiredQuantity) {
          // Restore the stock we just added back
          if (originalProduct) {
            originalProduct.quantity -= sale.quantity
            await originalProduct.save()
          }
          return res.status(400).json({
            success: false,
            message: `Not enough stock available for new product. Only ${newProduct.quantity} units available.`,
          })
        }

        newProduct.quantity -= requiredQuantity
        await newProduct.save()
      } else if (quantity && quantity !== sale.quantity) {
        // If only quantity is being updated
        const product = await Product.findById(sale.product)
        const quantityDifference = quantity - sale.quantity

        if (product.quantity < quantityDifference) {
          // Restore the stock we just added back
          if (originalProduct) {
            originalProduct.quantity -= sale.quantity
            await originalProduct.save()
          }
          return res.status(400).json({
            success: false,
            message: `Not enough stock available. Only ${product.quantity + sale.quantity} units available.`,
          })
        }

        product.quantity -= quantityDifference
        await product.save()
      }
    }

    // Update the sale
    const updateData = {}
    if (productId) updateData.product = productId
    if (quantity) updateData.quantity = Number.parseInt(quantity)
    if (salePrice) updateData.salePrice = Number.parseFloat(salePrice)
    if (date) updateData.date = date
    if (customerName !== undefined) updateData.customerName = customerName
    if (customerPhone !== undefined) updateData.customerPhone = customerPhone
    if (notes !== undefined) updateData.notes = notes
    if (saleType !== undefined) updateData.saleType = saleType

    const updatedSale = await Sale.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    }).populate("product", "name purchaseRate saleRate")

    res.status(200).json({
      success: true,
      data: updatedSale,
      message: "Sale updated successfully",
    })
  } catch (error) {
    console.error("Error in updateSale:", error)
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((val) => val.message)
      return res.status(400).json({
        success: false,
        message: "Validation Error",
        error: messages,
      })
    } else if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid ID format",
      })
    } else {
      res.status(500).json({
        success: false,
        message: "Server Error",
        error: error.message,
      })
    }
  }
}

// Delete sale
exports.deleteSale = async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: "Sale not found",
      })
    }

    // Restore product stock
    const product = await Product.findById(sale.product)
    if (product) {
      product.quantity += sale.quantity
      await product.save()
    }

    await sale.deleteOne()

    res.status(200).json({
      success: true,
      data: {},
      message: "Sale deleted successfully",
    })
  } catch (error) {
    console.error("Error in deleteSale:", error)
    if (error.name === "CastError") {
      return res.status(400).json({
        success: false,
        message: "Invalid sale ID format",
      })
    }
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    })
  }
}

// Get sales statistics
exports.getSalesStats = async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query
    let dateQuery = {}

    // Filter by date range
    if (startDate && endDate) {
      dateQuery = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else if (startDate) {
      dateQuery = { date: { $gte: new Date(startDate) } }
    } else if (endDate) {
      dateQuery = { date: { $lte: new Date(endDate) } }
    }

    // Filter by product if provided
    if (productId) {
      dateQuery.product = productId
    }

    // Aggregate sales statistics
    const stats = await Sale.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: null,
          totalSales: { $sum: "$totalAmount" },
          totalRevenue: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$profit" },
          totalQuantity: { $sum: "$quantity" },
          totalOrders: { $sum: 1 },
          averageSaleValue: { $avg: "$totalAmount" },
          averageProfit: { $avg: "$profit" },
          minSaleValue: { $min: "$totalAmount" },
          maxSaleValue: { $max: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          totalSales: { $round: ["$totalSales", 2] },
          totalRevenue: { $round: ["$totalRevenue", 2] },
          totalProfit: { $round: ["$totalProfit", 2] },
          totalQuantity: 1,
          totalOrders: 1,
          averageSaleValue: { $round: ["$averageSaleValue", 2] },
          averageProfit: { $round: ["$averageProfit", 2] },
          minSaleValue: { $round: ["$minSaleValue", 2] },
          maxSaleValue: { $round: ["$maxSaleValue", 2] },
          profitMargin: {
            $round: [
              {
                $cond: [
                  { $eq: ["$totalRevenue", 0] },
                  0,
                  { $multiply: [{ $divide: ["$totalProfit", "$totalRevenue"] }, 100] },
                ],
              },
              2,
            ],
          },
        },
      },
    ])

    // If no sales found, return default values
    const result =
      stats.length > 0
        ? stats[0]
        : {
            totalSales: 0,
            totalRevenue: 0,
            totalProfit: 0,
            totalQuantity: 0,
            totalOrders: 0,
            averageSaleValue: 0,
            averageProfit: 0,
            minSaleValue: 0,
            maxSaleValue: 0,
            profitMargin: 0,
          }

    // Add period information
    result.period = {
      startDate: startDate || "All time",
      endDate: endDate || "All time",
      productFilter: productId || "All products",
    }

    res.status(200).json({
      success: true,
      data: result,
    })
  } catch (error) {
    console.error("Error in getSalesStats:", error)
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    })
  }
}

// Get sales by product
exports.getSalesByProduct = async (req, res) => {
  try {
    const { startDate, endDate } = req.query
    let dateQuery = {}

    // Filter by date range
    if (startDate && endDate) {
      dateQuery = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else if (startDate) {
      dateQuery = { date: { $gte: new Date(startDate) } }
    } else if (endDate) {
      dateQuery = { date: { $lte: new Date(endDate) } }
    }

    const salesByProduct = await Sale.aggregate([
      { $match: dateQuery },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: {
            productId: "$productInfo._id",
            productName: "$productInfo.name",
          },
          totalAmount: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$profit" },
          totalQuantity: { $sum: "$quantity" },
          salesCount: { $sum: 1 },
          averageSalePrice: { $avg: "$salePrice" },
          minSalePrice: { $min: "$salePrice" },
          maxSalePrice: { $max: "$salePrice" },
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id.productId",
          productName: "$_id.productName",
          totalAmount: { $round: ["$totalAmount", 2] },
          totalProfit: { $round: ["$totalProfit", 2] },
          totalQuantity: 1,
          salesCount: 1,
          averageSalePrice: { $round: ["$averageSalePrice", 2] },
          minSalePrice: { $round: ["$minSalePrice", 2] },
          maxSalePrice: { $round: ["$maxSalePrice", 2] },
          profitMargin: {
            $round: [
              {
                $cond: [
                  { $eq: ["$totalAmount", 0] },
                  0,
                  { $multiply: [{ $divide: ["$totalProfit", "$totalAmount"] }, 100] },
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { totalAmount: -1 } },
    ])

    res.status(200).json({
      success: true,
      count: salesByProduct.length,
      data: salesByProduct,
    })
  } catch (error) {
    console.error("Error in getSalesByProduct:", error)
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    })
  }
}

// Get sales by date
exports.getSalesByDate = async (req, res) => {
  try {
    const { startDate, endDate, productId } = req.query
    let dateQuery = {}

    // Filter by date range
    if (startDate && endDate) {
      dateQuery = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else if (startDate) {
      dateQuery = { date: { $gte: new Date(startDate) } }
    } else if (endDate) {
      dateQuery = { date: { $lte: new Date(endDate) } }
    }

    // Filter by product if provided
    if (productId) {
      dateQuery.product = productId
    }

    const salesByDate = await Sale.aggregate([
      { $match: dateQuery },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } },
          totalAmount: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$profit" },
          totalQuantity: { $sum: "$quantity" },
          salesCount: { $sum: 1 },
          averageSaleValue: { $avg: "$totalAmount" },
        },
      },
      {
        $project: {
          _id: 0,
          date: "$_id",
          totalAmount: { $round: ["$totalAmount", 2] },
          totalProfit: { $round: ["$totalProfit", 2] },
          totalQuantity: 1,
          salesCount: 1,
          averageSaleValue: { $round: ["$averageSaleValue", 2] },
          profitMargin: {
            $round: [
              {
                $cond: [
                  { $eq: ["$totalAmount", 0] },
                  0,
                  { $multiply: [{ $divide: ["$totalProfit", "$totalAmount"] }, 100] },
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { date: 1 } },
    ])

    res.status(200).json({
      success: true,
      count: salesByDate.length,
      data: salesByDate,
    })
  } catch (error) {
    console.error("Error in getSalesByDate:", error)
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    })
  }
}

// Get top selling products
exports.getTopSellingProducts = async (req, res) => {
  try {
    const { startDate, endDate, limit = 10 } = req.query
    let dateQuery = {}

    // Filter by date range
    if (startDate && endDate) {
      dateQuery = {
        date: {
          $gte: new Date(startDate),
          $lte: new Date(endDate),
        },
      }
    } else if (startDate) {
      dateQuery = { date: { $gte: new Date(startDate) } }
    } else if (endDate) {
      dateQuery = { date: { $lte: new Date(endDate) } }
    }

    const topProducts = await Sale.aggregate([
      { $match: dateQuery },
      {
        $lookup: {
          from: "products",
          localField: "product",
          foreignField: "_id",
          as: "productInfo",
        },
      },
      { $unwind: "$productInfo" },
      {
        $group: {
          _id: {
            productId: "$productInfo._id",
            productName: "$productInfo.name",
          },
          totalQuantitySold: { $sum: "$quantity" },
          totalRevenue: { $sum: "$totalAmount" },
          totalProfit: { $sum: "$profit" },
          salesCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          productId: "$_id.productId",
          productName: "$_id.productName",
          totalQuantitySold: 1,
          totalRevenue: { $round: ["$totalRevenue", 2] },
          totalProfit: { $round: ["$totalProfit", 2] },
          salesCount: 1,
          averageRevenuePerSale: { $round: [{ $divide: ["$totalRevenue", "$salesCount"] }, 2] },
        },
      },
      { $sort: { totalQuantitySold: -1 } },
      { $limit: Number.parseInt(limit) },
    ])

    res.status(200).json({
      success: true,
      count: topProducts.length,
      data: topProducts,
    })
  } catch (error) {
    console.error("Error in getTopSellingProducts:", error)
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    })
  }
}

// Get recent sales
exports.getRecentSales = async (req, res) => {
  try {
    const { limit = 10 } = req.query

    const recentSales = await Sale.find({})
      .populate("product", "name category")
      .sort({ createdAt: -1 })
      .limit(Number.parseInt(limit))

    res.status(200).json({
      success: true,
      count: recentSales.length,
      data: recentSales,
    })
  } catch (error) {
    console.error("Error in getRecentSales:", error)
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    })
  }
}
