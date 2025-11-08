/* eslint-disable react/no-unescaped-entities */
"use client"

import { useEffect, useMemo, useState } from "react"
import ApiHandler from "@/Api/apihandle"
import { Printer } from "lucide-react"

const format = (n) => {
  const num = Number.parseFloat(n) || 0
  return num === 0 ? "0" : num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const toDateOnly = (d) => {
  if (!d) return null
  const dt = typeof d === "string" ? new Date(d) : d
  return new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
}

// Global state for persistence across page refreshes
let persistedHiddenAccounts = new Set()
let persistedHiddenCategories = new Set()

export default function BalanceSheet() {
  const [startDate, setStartDate] = useState(() => {
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
    return firstDay.toISOString().split("T")[0]
  })
  const [endDate, setEndDate] = useState(() => {
    const today = new Date()
    return today.toISOString().split("T")[0]
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [accounts, setAccounts] = useState([])
  const [rowsAssets, setRowsAssets] = useState([])
  const [rowsLiabilities, setRowsLiabilities] = useState([])
  const [rowsEquity, setRowsEquity] = useState([])
  const [applyKey, setApplyKey] = useState(0)

  const [hiddenAccountCodes, setHiddenAccountCodes] = useState(new Set(persistedHiddenAccounts))
  const [hiddenCategories, setHiddenCategories] = useState(new Set(persistedHiddenCategories))
  const [editState, setEditState] = useState({ open: false, mode: null, payload: null })
  const [hiddenManagerOpen, setHiddenManagerOpen] = useState(false)

  // Update global persisted state whenever hidden items change
  useEffect(() => {
    persistedHiddenAccounts = new Set(hiddenAccountCodes)
    persistedHiddenCategories = new Set(hiddenCategories)
  }, [hiddenAccountCodes, hiddenCategories])

  const onPrint = () => window.print()

  useEffect(() => {
    const loadAccounts = async () => {
      try {
        setError(null)
        setLoading(true)

        const [assetsRes, equityRes, expensesRes, liabilitiesRes, revenueRes] = await Promise.all([
          ApiHandler.getAssets().catch(() => ({ data: [] })),
          ApiHandler.getEquity().catch(() => ({ data: [] })),
          ApiHandler.getChartExpenses().catch(() => ({ data: [] })),
          ApiHandler.getLiabilities().catch(() => ({ data: [] })),
          ApiHandler.getRevenue().catch(() => ({ data: [] })),
        ])

        const accs = [
          ...(assetsRes.data || []).map((acc) => ({
            ...acc,
            category: "Assets",
            normalBalance: "debit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
          ...(equityRes.data || []).map((acc) => ({
            ...acc,
            category: "Equity",
            normalBalance: "credit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
          ...(expensesRes.data || []).map((acc) => ({
            ...acc,
            category: "Expenses",
            normalBalance: "debit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
          ...(liabilitiesRes.data || []).map((acc) => ({
            ...acc,
            category: "Liabilities",
            normalBalance: "credit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
          ...(revenueRes.data || []).map((acc) => ({
            ...acc,
            category: "Revenue",
            normalBalance: "credit",
            fullName: `${acc.code} - ${acc.name}`,
          })),
        ]

        accs.sort((a, b) => a.code.localeCompare(b.code))
        setAccounts(accs)
      } catch (err) {
        console.error(err)
        setError("Failed to load accounts. Please check your connection.")
      } finally {
        setLoading(false)
      }
    }
    loadAccounts()
  }, [])

  useEffect(() => {
    const onVoucherChanged = () => {
      setApplyKey((k) => k + 1)
    }
    if (typeof window !== "undefined") {
      window.addEventListener("voucher:changed", onVoucherChanged)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("voucher:changed", onVoucherChanged)
      }
    }
  }, [])

  useEffect(() => {
    const calc = async () => {
      if (!startDate || !endDate || accounts.length === 0) {
        setRowsAssets([])
        setRowsLiabilities([])
        setRowsEquity([])
        return
      }
      try {
        setLoading(true)
        setError(null)

        const response = await ApiHandler.getVouchers({})
        const vouchers = response.data || []

        const start = toDateOnly(startDate)
        const end = toDateOnly(endDate)

        const getEntryCode = (entry) =>
          typeof entry.account === "string" ? entry.account.split(" - ")[0]?.trim() : entry.account?.code || ""

        const perAccount = accounts.map((account) => {
          let openingDebit = 0
          let openingCredit = 0
          let currentDebit = 0
          let currentCredit = 0

          vouchers.forEach((voucher) => {
            const voucherDate = new Date(voucher.voucherDate)
            voucher.entries?.forEach((entry) => {
              const entryCode = getEntryCode(entry)
              if (!entryCode || entryCode !== account.code) return

              const debit = Number.parseFloat(entry.debitAmount || 0)
              const credit = Number.parseFloat(entry.creditAmount || 0)

              if (voucherDate < start) {
                openingDebit += debit
                openingCredit += credit
              } else if (voucherDate >= start && voucherDate <= end) {
                currentDebit += debit
                currentCredit += credit
              }
            })
          })

          const openingBalance =
            account.normalBalance === "debit" ? openingDebit - openingCredit : openingCredit - openingDebit

          const displayOpeningDebit =
            openingBalance > 0
              ? account.normalBalance === "debit"
                ? openingBalance
                : 0
              : account.normalBalance === "credit"
                ? 0
                : Math.abs(openingBalance)

          const displayOpeningCredit =
            openingBalance > 0
              ? account.normalBalance === "credit"
                ? openingBalance
                : 0
              : account.normalBalance === "debit"
                ? 0
                : Math.abs(openingBalance)

          const totalDebit = openingDebit + currentDebit
          const totalCredit = openingCredit + currentCredit

          const closingBalance = account.normalBalance === "debit" ? totalDebit - totalCredit : totalCredit - totalDebit

          const displayClosingDebit =
            closingBalance > 0
              ? account.normalBalance === "debit"
                ? closingBalance
                : 0
              : account.normalBalance === "credit"
                ? 0
                : Math.abs(closingBalance)

          const displayClosingCredit =
            closingBalance > 0
              ? account.normalBalance === "credit"
                ? closingBalance
                : 0
              : account.normalBalance === "debit"
                ? 0
                : Math.abs(closingBalance)

          return {
            code: account.code,
            name: account.name,
            category: account.category,
            id: account.id || account._id,
            opening: { debit: displayOpeningDebit, credit: displayOpeningCredit },
            closing: { debit: displayClosingDebit, credit: displayClosingCredit },
            raw: {
              openingDebit,
              openingCredit,
              currentDebit,
              currentCredit,
            },
          }
        })

        const assets = perAccount.filter((a) => a.category === "Assets")
        const liabilities = perAccount.filter((a) => a.category === "Liabilities")
        const equityPure = perAccount.filter((a) => a.category === "Equity")
        const revenue = perAccount.filter((a) => a.category === "Revenue")
        const expenses = perAccount.filter((a) => a.category === "Expenses")

        const openingRevenueCredit = revenue.reduce((s, r) => s + r.opening.credit, 0)
        const openingExpenseDebit = expenses.reduce((s, r) => s + r.opening.debit, 0)
        const openingNet = openingRevenueCredit - openingExpenseDebit

        const closingRevenueCredit = revenue.reduce((s, r) => s + r.closing.credit, 0)
        const closingExpenseDebit = expenses.reduce((s, r) => s + r.closing.debit, 0)
        const closingNet = closingRevenueCredit - closingExpenseDebit

        const netIncomeRow = {
          code: "__NI__",
          name: "Net Income",
          category: "Equity",
          opening: openingNet >= 0 ? { debit: 0, credit: openingNet } : { debit: -openingNet, credit: 0 },
          closing: closingNet >= 0 ? { debit: 0, credit: closingNet } : { debit: -closingNet, credit: 0 },
        }

        setRowsAssets(assets)
        setRowsLiabilities(liabilities)
        setRowsEquity([...equityPure, netIncomeRow])
      } catch (err) {
        console.error(err)
        setError("Failed to calculate balance sheet. " + (err?.message || ""))
      } finally {
        setLoading(false)
      }
    }

    calc()
  }, [startDate, endDate, accounts, applyKey])

  const rowsAssetsFiltered = useMemo(
    () => rowsAssets.filter((r) => !hiddenAccountCodes.has(r.code) && !hiddenCategories.has("Assets")),
    [rowsAssets, hiddenAccountCodes, hiddenCategories],
  )
  const rowsLiabilitiesFiltered = useMemo(
    () => rowsLiabilities.filter((r) => !hiddenAccountCodes.has(r.code) && !hiddenCategories.has("Liabilities")),
    [rowsLiabilities, hiddenAccountCodes, hiddenCategories],
  )
  const rowsEquityFiltered = useMemo(
    () => rowsEquity.filter((r) => !hiddenAccountCodes.has(r.code) && !hiddenCategories.has("Equity")),
    [rowsEquity, hiddenAccountCodes, hiddenCategories],
  )

  const totals = useMemo(() => {
    const sumSection = (rows) =>
      rows.reduce(
        (acc, r) => {
          acc.opening.debit += r.opening.debit
          acc.opening.credit += r.opening.credit
          acc.closing.debit += r.closing.debit
          acc.closing.credit += r.closing.credit
          return acc
        },
        { opening: { debit: 0, credit: 0 }, closing: { debit: 0, credit: 0 } },
      )

    const tAssets = sumSection(rowsAssetsFiltered)
    const tLiab = sumSection(rowsLiabilitiesFiltered)
    const tEquity = sumSection(rowsEquityFiltered)

    const closingAssets = tAssets.closing.debit - tAssets.closing.credit
    const closingLiabEq = tLiab.closing.credit - tLiab.closing.debit + (tEquity.closing.credit - tEquity.closing.debit)

    return {
      tAssets,
      tLiab,
      tEquity,
      closingAssets,
      closingLiabEq,
    }
  }, [rowsAssetsFiltered, rowsLiabilitiesFiltered, rowsEquityFiltered])

  const showDateText = useMemo(() => {
    if (startDate && endDate) {
      const s = new Date(startDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
      const e = new Date(endDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
      return `From ${s} To ${e}`
    } else if (endDate) {
      const e = new Date(endDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
      return `As on ${e}`
    } else if (startDate) {
      const s = new Date(startDate).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })
      return `As on ${s}`
    }
    return ""
  }, [startDate, endDate])

  const Section = ({ title, rows, onEditCategory }) => (
    <tbody>
      <tr className="bg-orange-100">
        <td colSpan={6} className="font-semibold px-3 py-2 flex items-center justify-between">
          <span>{title}</span>
          <button
            type="button"
            onClick={() => onEditCategory(title)}
            className="text-orange-700 hover:text-orange-900 underline print:hidden"
          >
            Edit
          </button>
        </td>
      </tr>
      {rows.map((r) => (
        <tr key={r.code}>
          <td className="pl-6 py-1">{r.name}</td>
          <td className="text-right px-3 py-1">{r.opening.debit ? format(r.opening.debit) : "-"}</td>
          <td className="text-right px-3 py-1">{r.opening.credit ? format(r.opening.credit) : "-"}</td>
          <td className="text-right px-3 py-1">{r.closing.debit ? format(r.closing.debit) : "-"}</td>
          <td className="text-right px-3 py-1">{r.closing.credit ? format(r.closing.credit) : "-"}</td>
          <td className="text-right px-3 py-1 print:hidden">
            <button
              type="button"
              onClick={() => openEditRow(r)}
              className="text-orange-700 hover:text-orange-900 underline"
            >
              Edit
            </button>
          </td>
        </tr>
      ))}
      <tr className="font-semibold bg-gray-100">
        <td className="pl-6 py-2">Total {title}</td>
        <td className="text-right px-3 py-2">{format(rows.reduce((s, r) => s + r.opening.debit, 0))}</td>
        <td className="text-right px-3 py-2">{format(rows.reduce((s, r) => s + r.opening.credit, 0))}</td>
        <td className="text-right px-3 py-2">{format(rows.reduce((s, r) => s + r.closing.debit, 0))}</td>
        <td className="text-right px-3 py-2">{format(rows.reduce((s, r) => s + r.closing.credit, 0))}</td>
        <td className="px-3 py-2 print:hidden" />
      </tr>
    </tbody>
  )

  const openEditRow = (row) => setEditState({ open: true, mode: "row", payload: row })
  const openEditCategory = (category) => setEditState({ open: true, mode: "category", payload: { category } })
  const closeEdit = () => setEditState({ open: false, mode: null, payload: null })

  const hideRow = (code) => {
    setHiddenAccountCodes((prev) => {
      const next = new Set(prev)
      next.add(code)
      return next
    })
    closeEdit()
  }

  const unhideRow = (code) => {
    setHiddenAccountCodes((prev) => {
      const next = new Set(prev)
      next.delete(code)
      return next
    })
    closeEdit()
  }

  const hideCategory = (category) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      next.add(category)
      return next
    })
    closeEdit()
  }

  const unhideCategory = (category) => {
    setHiddenCategories((prev) => {
      const next = new Set(prev)
      next.delete(category)
      return next
    })
    closeEdit()
  }

  return (
    <div className="min-h-screen bg-white p-6">
      <style>
        {`
          @media print {
            .print\\:hidden {
              display: none !important;
            }
            #print-area {
              padding: 0;
              margin: 0;
              width: 100%;
            }
            body {
              margin: 0;
              padding: 0;
            }
            table {
              font-size: 11px;
              page-break-inside: avoid;
            }
            tr {
              page-break-inside: avoid;
            }
            th, td {
              padding: 6px 8px !important;
              border: 1px solid #ccc !important;
            }
            /* Hide header/navigation during print */
            nav, header, .navbar, .top-nav {
              display: none !important;
            }
          }
        `}
      </style>

      <div className="print:hidden flex justify-center gap-2 mb-4">
        <button onClick={onPrint} className="px-4 py-2 rounded-md bg-orange-600 text-white hover:bg-orange-700">
          <Printer className="inline-block w-4 h-4 mr-2" /> Print
        </button>
      </div>

      <div id="print-area">
        <style>
          {`
            @media print {
              .print-header {
                text-align: center;
                margin-bottom: 2rem;
                page-break-after: avoid;
              }
              .print-header h1 {
                font-size: 28px;
                font-weight: bold;
                color: #ea580c;
                margin: 0;
                padding: 0;
              }
              .print-header h2 {
                font-size: 20px;
                color: #333;
                margin: 8px 0 0 0;
                padding: 0;
              }
            }
          `}
        </style>
        <div className="print-header">
          <h1 className="text-3xl font-bold text-center text-orange-600 mb-0">XYZ Company</h1>
          <h1 className="text-3xl font-bold text-center text-orange-600 mb-2">Balance Sheet</h1>
          <h2 className="text-xl text-center text-gray-800">{showDateText || "Select a date range and Filter"}</h2>
        </div>

        <div className="flex justify-center gap-4 mb-6 print:hidden">
          <div className="flex items-center border p-2 rounded-md">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="outline-none"
              aria-label="Start date"
            />
          </div>
          <div className="flex items-center border p-2 rounded-md">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="outline-none"
              aria-label="End date"
            />
          </div>
          <button
            onClick={() => setApplyKey((k) => k + 1)}
            className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
            disabled={loading}
          >
            {loading ? "Calculating..." : "Filter"}
          </button>
          <button
            onClick={() => setHiddenManagerOpen(true)}
            className="flex items-center gap-2 border border-orange-600 text-orange-700 px-4 py-2 rounded-md hover:bg-orange-50"
            aria-label="Manage hidden items"
          >
            Manage Hidden
          </button>
        </div>

        {error && (
          <div className="max-w-3xl mx-auto mb-4 rounded border border-red-200 bg-red-50 text-red-700 px-4 py-3">
            {error}
          </div>
        )}

        <div className="overflow-x-auto print:overflow-visible">
          <table className="min-w-[900px] border-collapse border border-gray-300 mx-auto w-full">
            <thead>
              <tr className="bg-orange-500 text-white text-left">
                <th className="px-3 py-2">Heads</th>
                <th className="px-3 py-2 text-right">Opening Debit</th>
                <th className="px-3 py-2 text-right">Opening Credit</th>
                <th className="px-3 py-2 text-right">Closing Debit</th>
                <th className="px-3 py-2 text-right">Closing Credit</th>
                <th className="px-3 py-2 text-right print:hidden">Actions</th>
              </tr>
            </thead>

            <Section title="Assets" rows={rowsAssetsFiltered} onEditCategory={openEditCategory} />
            <Section title="Liabilities" rows={rowsLiabilitiesFiltered} onEditCategory={openEditCategory} />
            <Section
              title="Owner's Equity ( Net Income)"
              rows={rowsEquityFiltered}
              onEditCategory={() => openEditCategory("Equity")}
            />

            <tbody>
              <tr className="bg-orange-500 text-white font-semibold">
                <td className="px-3 py-2">Balance Check (Closing)</td>
                <td className="text-right px-3 py-2" colSpan={2}>
                  Assets: {format(totals.closingAssets)}
                </td>
                <td className="text-right px-3 py-2" colSpan={2}>
                  Liabilities + Equity: {format(totals.closingLiabEq)}
                </td>
                <td className="px-3 py-2 print:hidden" />
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {editState.open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-md shadow-lg w-full max-w-md p-4">
            {editState.mode === "row" && (
              <>
                <h3 className="text-lg font-semibold mb-2">Edit: {editState.payload?.name}</h3>
                <p className="text-sm mb-4">
                  Category: <span className="font-medium">{editState.payload?.category}</span>
                </p>
                <div className="flex items-center justify-end gap-3">
                  {hiddenAccountCodes.has(editState.payload.code) ? (
                    <button
                      className="px-3 py-2 rounded border border-gray-300"
                      onClick={() => unhideRow(editState.payload.code)}
                    >
                      Unhide
                    </button>
                  ) : (
                    <button
                      className="px-3 py-2 rounded border border-gray-300"
                      onClick={() => hideRow(editState.payload.code)}
                    >
                      Hide
                    </button>
                  )}
                  <button className="px-3 py-2 rounded bg-gray-100" onClick={closeEdit}>
                    Close
                  </button>
                </div>
              </>
            )}

            {editState.mode === "category" && (
              <>
                <h3 className="text-lg font-semibold mb-2">Edit Category</h3>
                <p className="text-sm mb-4">
                  Category:{" "}
                  <span className="font-medium">
                    {editState.payload?.category === "Owner's Equity ( Net Income)"
                      ? "Equity"
                      : editState.payload?.category}
                  </span>
                </p>
                <div className="flex items-center justify-end gap-3">
                  {hiddenCategories.has(
                    editState.payload?.category === "Owner's Equity ( Net Income)"
                      ? "Equity"
                      : editState.payload?.category,
                  ) ? (
                    <button
                      className="px-3 py-2 rounded border border-gray-300"
                      onClick={() =>
                        unhideCategory(
                          editState.payload?.category === "Owner's Equity ( Net Income)"
                            ? "Equity"
                            : editState.payload?.category,
                        )
                      }
                    >
                      Unhide Category
                    </button>
                  ) : (
                    <button
                      className="px-3 py-2 rounded border border-gray-300"
                      onClick={() =>
                        hideCategory(
                          editState.payload?.category === "Owner's Equity ( Net Income)"
                            ? "Equity"
                            : editState.payload?.category,
                        )
                      }
                    >
                      Hide Category
                    </button>
                  )}
                  <button className="px-3 py-2 rounded bg-gray-100" onClick={closeEdit}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {hiddenManagerOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-md shadow-lg w-full max-w-lg p-4">
            <h3 className="text-lg font-semibold mb-3">Hidden Items</h3>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Categories</h4>
              {Array.from(hiddenCategories).length === 0 ? (
                <p className="text-sm text-gray-600">No hidden categories.</p>
              ) : (
                <ul className="space-y-2">
                  {Array.from(hiddenCategories).map((cat) => (
                    <li key={cat} className="flex items-center justify-between">
                      <span>{cat}</span>
                      <button className="px-3 py-1 rounded border border-gray-300" onClick={() => unhideCategory(cat)}>
                        Unhide
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mb-4">
              <h4 className="font-medium mb-2">Accounts</h4>
              {Array.from(hiddenAccountCodes).length === 0 ? (
                <p className="text-sm text-gray-600">No hidden accounts.</p>
              ) : (
                <ul className="space-y-2">
                  {Array.from(hiddenAccountCodes).map((code) => {
                    const acc =
                      accounts.find((a) => a.code === code) ||
                      rowsAssets.concat(rowsLiabilities, rowsEquity).find((a) => a.code === code)
                    return (
                      <li key={code} className="flex items-center justify-between">
                        <span>
                          {acc?.name || code}{" "}
                          {acc?.category ? <span className="text-gray-500">({acc.category})</span> : null}
                        </span>
                        <button className="px-3 py-1 rounded border border-gray-300" onClick={() => unhideRow(code)}>
                          Unhide
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="flex items-center justify-end gap-3">
              <button className="px-3 py-2 rounded bg-gray-100" onClick={() => setHiddenManagerOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}