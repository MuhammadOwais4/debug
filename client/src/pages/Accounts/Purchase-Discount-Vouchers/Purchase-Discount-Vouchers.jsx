"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Trash2, Edit3, X, Check, RefreshCw, DollarSign, AlertTriangle, Info } from "lucide-react"
import ApiHandler from "@/Api/apihandle"

export default function PurchasesDiscountManagement() {
  const [invoice, setInvoice] = useState("")
  const [date, setDate] = useState("")
  const [type, setType] = useState("PURCHASES DISCOUNT")
  const [vendor, setVendor] = useState("")
  const [debitAmount, setDebitAmount] = useState("")
  const [creditAmount, setCreditAmount] = useState("")
  const [entryType, setEntryType] = useState("credit")
  const [description, setDescription] = useState("")
  const [vendors, setVendors] = useState([])
  const [purchasesDiscounts, setPurchasesDiscounts] = useState([])
  const [totalDebit, setTotalDebit] = useState(0)
  const [totalCredit, setTotalCredit] = useState(0)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [showList, setShowList] = useState(false)
  const [loadingList, setLoadingList] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [showPrintPreview, setShowPrintPreview] = useState(false)

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setDate(today)
    loadVendors()
    loadPurchasesDiscounts()
  }, [])

  const loadVendors = async () => {
    try {
      setLoading(true)
      const response = await ApiHandler.getLiabilities()
      const payables = response?.data?.filter(liability => liability.type === "PAYABLES") || []
      setVendors(payables)
    } catch (error) {
      console.error("Error loading vendors:", error)
      setVendors([])
    } finally {
      setLoading(false)
    }
  }

  const loadPurchasesDiscounts = async () => {
    try {
      setLoadingList(true)
      const response = await ApiHandler.getPurchaseDiscounts()
      setPurchasesDiscounts(response?.data || [])
      setTotalDebit(response?.totalDebit || 0)
      setTotalCredit(response?.totalCredit || 0)
    } catch (error) {
      console.error("Error loading purchases discounts:", error)
      setPurchasesDiscounts([])
      setTotalDebit(0)
      setTotalCredit(0)
    } finally {
      setLoadingList(false)
    }
  }

  const generateInvoiceNo = () => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
    return `PD-${timestamp}-${random}`
  }

  const resetForm = () => {
    setInvoice("")
    setDate(new Date().toISOString().split("T")[0])
    setType("PURCHASES DISCOUNT")
    setVendor("")
    setDebitAmount("")
    setCreditAmount("")
    setEntryType("credit")
    setDescription("")
    setIsEditMode(false)
    setEditingId(null)
  }

  const loadForEdit = (item) => {
    setIsEditMode(true)
    setEditingId(item._id)
    setInvoice(item.invoice || "")
    setDate(new Date(item.date).toISOString().split("T")[0])
    setType(item.type)
    setVendor(item.vendor?._id || "")
    setDebitAmount(item.debitAmount?.toString() || "0")
    setCreditAmount(item.creditAmount?.toString() || "0")
    setEntryType(item.entryType || "credit")
    setDescription(item.description || "")
    setShowList(false)
  }

  const handleSave = async () => {
    if (!date || !type || !entryType) {
      alert("Date, type, and entry type are required")
      return
    }

    const debitValue = parseFloat(debitAmount) || 0
    const creditValue = parseFloat(creditAmount) || 0

    if (debitValue < 0 || creditValue < 0) {
      alert("Amounts cannot be negative")
      return
    }

    if (!vendor) {
      alert("Please select a vendor")
      return
    }

    try {
      setSaving(true)

      const data = {
        invoice: invoice.trim() || undefined,
        date: new Date(date),
        type,
        vendor,
        debitAmount: debitValue,
        creditAmount: creditValue,
        entryType,
        description: description.trim() || undefined,
      }

      if (isEditMode && editingId) {
        await ApiHandler.updatePurchaseDiscount(editingId, data)
      } else {
        if (!invoice.trim()) {
          data.invoice = generateInvoiceNo()
        }
        await ApiHandler.createPurchaseDiscount(data)
      }

      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
      resetForm()
      await loadPurchasesDiscounts()
    } catch (error) {
      console.error("Error saving purchases discount:", error)
      alert(`Failed to save: ${error.response?.data?.message || error.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handlePrint = () => {
    setShowPrintPreview(true)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print()
      })
    })
  }

  useEffect(() => {
    const onAfterPrint = () => setShowPrintPreview(false)
    window.addEventListener("afterprint", onAfterPrint)
    return () => window.removeEventListener("afterprint", onAfterPrint)
  }, [])

  const openDeleteDialog = (item) => {
    setItemToDelete(item)
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!itemToDelete) return

    try {
      setDeleting(true)
      await ApiHandler.deletePurchaseDiscount(itemToDelete._id)
      await loadPurchasesDiscounts()

      if (editingId === itemToDelete._id) {
        resetForm()
      }

      setDeleteDialogOpen(false)
      setItemToDelete(null)
    } catch (error) {
      console.error("Error deleting:", error)
      alert(`Failed to delete: ${error.response?.data?.message || error.message}`)
    } finally {
      setDeleting(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return ""
    const date = new Date(dateString)
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).replace(/\//g, ".")
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-PK', {
      style: 'currency',
      currency: 'PKR',
      minimumFractionDigits: 2,
    }).format(value || 0)
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{
        __html: `
          .print-area { display: none; }
          @media print {
            .no-print { display: none !important; }
            .print-area { display: block !important; }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .print-footer {
              position: fixed;
              bottom: 16px;
              left: 0;
              right: 0;
              text-align: center;
            }
          }
          @media screen {
            .print-area { display: none; }
            .print-preview .no-print { display: none !important; }
            .print-preview .print-area { display: block !important; }
            .print-preview img, .print-area img { display: none !important; }
          }
          @media print {
            body * { visibility: hidden !important; }
            .print-area, .print-area * { visibility: visible !important; }
            .print-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
            }
            img { display: none !important; }
          }
        `
      }} />

      <div className={showPrintPreview ? "print-preview" : ""}>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-zinc-50 p-4">
          <div className="no-print">
            <Card className="w-full max-w-6xl mx-auto shadow-2xl border-0 overflow-hidden">
              <CardHeader className="text-center border-b-0 bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 text-white py-8">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowList(!showList)}
                      className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      {showList ? "Hide" : "View"} Ledger
                    </Button>
                    {isEditMode && (
                      <Button
                        variant="outline"
                        onClick={resetForm}
                        className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel Edit
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                      <DollarSign className="w-5 h-5" />
                      <div className="text-left">
                        <div className="text-xs opacity-80">Total Debit</div>
                        <div className="text-lg font-bold">{formatCurrency(totalDebit)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-lg">
                      <DollarSign className="w-5 h-5" />
                      <div className="text-left">
                        <div className="text-xs opacity-80">Total Credit</div>
                        <div className="text-lg font-bold">{formatCurrency(totalCredit)}</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-lg font-semibold mb-3 opacity-90">ABC and Co.</div>
                <CardTitle className="text-3xl font-bold tracking-wide">
                  Purchases Discount {isEditMode && <span className="text-sm">(Editing)</span>}
                </CardTitle>
              </CardHeader>

              <CardContent className="p-8 bg-white">
                <div className="mb-4 flex justify-end">
                  <div className="flex items-center gap-3">
                    {saveSuccess && (
                      <div className="flex items-center gap-2 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
                        <Check className="w-4 h-4" />
                        Saved Successfully
                      </div>
                    )}
                    <Button
                      onClick={handlePrint}
                      variant="outline"
                      className="border-purple-600 text-purple-600 hover:bg-purple-50"
                    >
                      Print Voucher
                    </Button>
                    <Button
                      onClick={handleSave}
                      disabled={saving}
                      className="bg-purple-600 text-white hover:bg-purple-700"
                    >
                      {saving ? "Saving..." : isEditMode ? "Update Entry" : "Save Entry"}
                    </Button>
                  </div>
                </div>

                {showList && (
                  <div className="mb-8 border-2 border-purple-200 rounded-lg p-4 bg-purple-50">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-purple-800">Purchases Discount Ledger</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadPurchasesDiscounts}
                        disabled={loadingList}
                        className="text-sm"
                      >
                        <RefreshCw className="w-4 h-4 mr-1" />
                        {loadingList ? "Loading..." : "Refresh"}
                      </Button>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {purchasesDiscounts.length === 0 ? (
                        <p className="text-center text-gray-500 py-4">No entries found</p>
                      ) : (
                        <div className="space-y-2">
                          {purchasesDiscounts.map((item) => (
                            <div
                              key={item._id}
                              className="flex justify-between items-center p-3 bg-white border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <span className="font-semibold text-purple-900">{item.invoice || "N/A"}</span>
                                  <span className="text-sm text-gray-600">{formatDate(item.date)}</span>
                                  <span className="font-bold text-green-700">DR: {formatCurrency(item.debitAmount || 0)}</span>
                                  <span className="font-bold text-red-700">CR: {formatCurrency(item.creditAmount || 0)}</span>
                                </div>
                                <p className="text-sm text-gray-600 mt-1">
                                  {item.vendor?.name && `Vendor: ${item.vendor.name}`}
                                </p>
                                {item.description && (
                                  <p className="text-xs text-gray-500 mt-1 italic">{item.description}</p>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => loadForEdit(item)}
                                  className="border-purple-600 text-purple-600 hover:bg-purple-50"
                                >
                                  <Edit3 className="w-4 h-4 mr-1" />
                                  Edit
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openDeleteDialog(item)}
                                  className="border-red-600 text-red-600 hover:bg-red-50"
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <Label htmlFor="invoice" className="text-lg font-semibold text-purple-700">
                      Invoice / Voucher No.
                    </Label>
                    <Input
                      id="invoice"
                      value={invoice}
                      onChange={(e) => setInvoice(e.target.value)}
                      placeholder="Auto-generated if empty"
                      className="border-2 border-gray-300 focus:border-purple-500"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="date" className="text-lg font-semibold text-purple-700">
                      Date *
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="border-2 border-gray-300 focus:border-purple-500"
                      required
                    />
                    <div className="text-sm text-gray-600 font-medium">
                      Display: {formatDate(date)}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <Label htmlFor="type" className="text-lg font-semibold text-purple-700">
                      Transaction Type *
                    </Label>
                    <Select value={type} onValueChange={setType}>
                      <SelectTrigger className="border-2 border-gray-300 focus:border-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PURCHASES DISCOUNT">PURCHASES DISCOUNT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="entryType" className="text-lg font-semibold text-purple-700">
                      Entry Type *
                    </Label>
                    <Select value={entryType} onValueChange={setEntryType}>
                      <SelectTrigger className="border-2 border-gray-300 focus:border-purple-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="debit">Debit Entry (DR)</SelectItem>
                        <SelectItem value="credit">Credit Entry (CR)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-3">
                    <Label htmlFor="debitAmount" className="text-lg font-semibold text-purple-700 flex items-center gap-2">
                      Debit Amount (PKR)
                      <span className="text-xs font-normal text-gray-500">(Vendor A/C - Reduces Liability)</span>
                    </Label>
                    <Input
                      id="debitAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={debitAmount}
                      onChange={(e) => setDebitAmount(e.target.value)}
                      placeholder="0.00"
                      className="border-2 border-gray-300 focus:border-purple-500"
                      disabled={entryType === "credit"}
                    />
                    <div className="text-sm text-gray-600 font-medium">
                      Display: {formatCurrency(parseFloat(debitAmount) || 0)}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="creditAmount" className="text-lg font-semibold text-purple-700 flex items-center gap-2">
                      Credit Amount (PKR)
                      <span className="text-xs font-normal text-gray-500">(Purchases Discount - Income)</span>
                    </Label>
                    <Input
                      id="creditAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="0.00"
                      className="border-2 border-gray-300 focus:border-purple-500"
                      disabled={entryType === "debit"}
                    />
                    <div className="text-sm text-gray-600 font-medium">
                      Display: {formatCurrency(parseFloat(creditAmount) || 0)}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <Label htmlFor="vendor" className="text-lg font-semibold text-purple-700 flex items-center justify-between">
                    <span>Vendor (Payable) *</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={loadVendors}
                      disabled={loading}
                      className="text-xs"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Refresh
                    </Button>
                  </Label>
                  <Select value={vendor || undefined} onValueChange={setVendor}>
                    <SelectTrigger className="border-2 border-gray-300 focus:border-purple-500">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v._id} value={v._id}>
                          {v.code} - {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-gray-500">
                    {vendors.length} vendors available (PAYABLES)
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <Label htmlFor="description" className="text-lg font-semibold text-purple-700">
                    Narration / Description
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Enter narration details..."
                    className="border-2 border-gray-300 focus:border-purple-500 min-h-[100px]"
                    rows={4}
                  />
                  <div className="text-xs text-gray-500">
                    This narration will appear in the journal entry
                  </div>
                </div>

                <div className="mt-8 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-lg">
                  <h3 className="text-xl font-bold text-purple-800 mb-4 flex items-center gap-2">
                    <span>📋</span> Journal Entry Preview (Correct Accounting)
                  </h3>
                  <div className="bg-white rounded-lg overflow-hidden border border-purple-200 shadow-sm">
                    <table className="w-full">
                      <thead className="bg-gradient-to-r from-purple-100 to-indigo-100">
                        <tr>
                          <th className="text-left p-3 font-semibold text-purple-900 border-r border-purple-200">Account & Description</th>
                          <th className="text-right p-3 font-semibold text-purple-900 border-r border-purple-200 w-32">DR. Amount</th>
                          <th className="text-right p-3 font-semibold text-purple-900 w-32">CR. Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-t border-purple-100 hover:bg-purple-50/50">
                          <td className="p-3 border-r border-purple-100">
                            <div className="font-semibold text-gray-800">
                              {vendor ? vendors.find(v => v._id === vendor)?.name || "Vendor A/C" : "Vendor A/C"}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">(DR - Accounts Payable)</div>
                            {description && (
                              <div className="text-sm text-gray-500 mt-2 italic bg-gray-50 p-2 rounded">
                                {description}
                              </div>
                            )}
                          </td>
                          <td className="text-right p-3 font-bold text-green-700 border-r border-purple-100">
                            {formatCurrency(parseFloat(debitAmount) || 0)}
                          </td>
                          <td className="text-right p-3 text-gray-400">-</td>
                        </tr>
                        <tr className="border-t border-purple-100 bg-purple-50/30 hover:bg-purple-50/50">
                          <td className="p-3 border-r border-purple-100">
                            <div className="font-semibold text-gray-800">Purchases Discount A/C</div>
                            <div className="text-sm text-gray-600 mt-1">(CR - Income)</div>
                            {description && (
                              <div className="text-sm text-gray-500 mt-2 italic bg-gray-50 p-2 rounded">
                                {description}
                              </div>
                            )}
                          </td>
                          <td className="text-right p-3 text-gray-400 border-r border-purple-100">-</td>
                          <td className="text-right p-3 font-bold text-red-700">
                            {formatCurrency(parseFloat(creditAmount) || 0)}
                          </td>
                        </tr>
                        <tr className="border-t-2 border-purple-300 bg-gradient-to-r from-purple-100 to-indigo-100 font-bold">
                          <td className="p-3 text-purple-900 border-r border-purple-200">TOTAL</td>
                          <td className="text-right p-3 text-green-700 border-r border-purple-200">
                            {formatCurrency(parseFloat(debitAmount) || 0)}
                          </td>
                          <td className="text-right p-3 text-red-700">
                            {formatCurrency(parseFloat(creditAmount) || 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="bg-white p-3 rounded border border-purple-200 shadow-sm">
                      <span className="font-semibold text-purple-900">Voucher:</span>
                      <div className="mt-1 text-gray-700">{invoice || "Auto-generate"}</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-purple-200 shadow-sm">
                      <span className="font-semibold text-purple-900">Date:</span>
                      <div className="mt-1 text-gray-700">{formatDate(date)}</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-purple-200 shadow-sm">
                      <span className="font-semibold text-purple-900">Entry Type:</span>
                      <div className="mt-1 text-gray-700">{entryType === 'debit' ? 'Debit (DR)' : 'Credit (CR)'}</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-purple-200 shadow-sm">
                      <span className="font-semibold text-purple-900">Balance:</span>
                      <div className="mt-1 text-gray-700">
                        {Math.abs(parseFloat(debitAmount || 0) - parseFloat(creditAmount || 0)) === 0 ? (
                          <span className="text-green-700 font-bold">✓ Balanced</span>
                        ) : (
                          <span className="text-red-700 font-bold">⚠ Not Balanced</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="print-area px-10 py-12">
            <div className="max-w-4xl mx-auto">
              <header className="text-center mb-6 border-b-2 border-gray-800 pb-4">
                <h1 className="text-4xl font-bold">Purchases Discount Voucher</h1>
                <p className="text-lg mt-2">ABC and Co.</p>
              </header>
              <section className="mb-6">
                <div className="flex justify-between mb-2">
                  <div>
                    <span className="font-semibold">Voucher No.:</span> {invoice || "Auto-generated"}
                  </div>
                  <div>
                    <span className="font-semibold">Date:</span> {formatDate(date)}
                  </div>
                </div>
                <div className="mb-4">
                  <span className="font-semibold">Vendor:</span> {vendor ? vendors.find(v => v._id === vendor)?.name || "N/A" : "N/A"}
                </div>
                <div>
                  <span className="font-semibold">Description:</span> {description || "N/A"}
                </div>
              </section>
              <section>
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border border-gray-800 p-3 text-left">Account</th>
                      <th className="border border-gray-800 p-3 text-right">Debit (PKR)</th>
                      <th className="border border-gray-800 p-3 text-right">Credit (PKR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-800 p-3">
                        {vendor ? vendors.find(v => v._id === vendor)?.name || "Vendor A/C" : "Vendor A/C"} (DR)
                      </td>
                      <td className="border border-gray-800 p-3 text-right">
                        {formatCurrency(parseFloat(debitAmount) || 0)}
                      </td>
                      <td className="border border-gray-800 p-3 text-right">-</td>
                    </tr>
                    <tr>
                      <td className="border border-gray-800 p-3">
                        Purchases Discount A/C (CR)
                      </td>
                      <td className="border border-gray-800 p-3 text-right">-</td>
                      <td className="border border-gray-800 p-3 text-right">
                        {formatCurrency(parseFloat(creditAmount) || 0)}
                      </td>
                    </tr>
                    <tr className="font-bold bg-gray-100">
                      <td className="border border-gray-800 p-3">TOTAL</td>
                      <td className="border border-gray-800 p-3 text-right">
                        {formatCurrency(parseFloat(debitAmount) || 0)}
                      </td>
                      <td className="border border-gray-800 p-3 text-right">
                        {formatCurrency(parseFloat(creditAmount) || 0)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </section>
              <footer className="print-footer text-center text-sm text-gray-600 mt-8">
                Generated by ABC and Co. Accounting System
              </footer>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-700">Confirm Deletion</DialogTitle>    
            <DialogDescription>
              Are you sure you want to delete this purchases discount entry
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 flex justify-end gap-4"> 
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}