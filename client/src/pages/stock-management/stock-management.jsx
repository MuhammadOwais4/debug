"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import ApiHandler from "@/Api/apihandle"
import {
  Plus, Edit, Trash2, Save, X, Search, Filter, Download, RefreshCw, Eye,
  TrendingUp, Package, Printer, RotateCcw, Scan, ShoppingCart, CheckCircle,
  AlertCircle, Barcode, ZapIcon,
} from "lucide-react"

const productCategories = ["Electronics", "Furniture", "Stationery", "Kitchenware", "Clothing", "Food", "Garments", "Other"]

// ─── Barcode Scanner Modal ───────────────────────────────────────────────────
const BarcodeScannerModal = ({ onClose, products, onProductScanned }) => {
  const [scanResult, setScanResult] = useState(null)
  const [scanHistory, setScanHistory] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [manualInput, setManualInput] = useState("")
  const [activeTab, setActiveTab] = useState("camera")
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [cameras, setCameras] = useState([])
  const [selectedCamera, setSelectedCamera] = useState("")
  const [scanning, setScanning] = useState(false)
  const [lastScannedCode, setLastScannedCode] = useState("")
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const animFrameRef = useRef(null)
  const zxingRef = useRef(null)
  const inputRef = useRef(null)
  const barcodeBuffer = useRef("")
  const barcodeTimer = useRef(null)
  const scanCooldown = useRef(false)

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 0 }).format(value || 0)

  useEffect(() => {
    if (window.ZXing) { zxingRef.current = window.ZXing; return }
    const script = document.createElement("script")
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/zxing-js/0.19.1/zxing.min.js"
    script.async = true
    script.onload = () => { zxingRef.current = window.ZXing }
    script.onerror = () => {
      const s2 = document.createElement("script")
      s2.src = "https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js"
      s2.async = true; s2.onload = () => { zxingRef.current = window.ZXing }
      document.head.appendChild(s2)
    }
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    if (activeTab !== "camera") return
    navigator.mediaDevices?.enumerateDevices().then((devices) => {
      const videoDevices = devices.filter((d) => d.kind === "videoinput")
      setCameras(videoDevices)
      const back = videoDevices.find((d) => /back|rear|environment/i.test(d.label))
      setSelectedCamera(back?.deviceId || videoDevices[0]?.deviceId || "")
    }).catch(() => setCameras([]))
  }, [activeTab])

  const startCamera = async () => {
    setCameraError(null)
    try {
      const constraints = { video: selectedCamera ? { deviceId: { exact: selectedCamera }, width: { ideal: 1280 }, height: { ideal: 720 } } : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play() }
      setCameraActive(true); setScanning(true)
    } catch (err) {
      setCameraError(err.name === "NotAllowedError" ? "Camera permission denied." : err.name === "NotFoundError" ? "No camera found." : `Camera error: ${err.message}`)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setCameraActive(false); setScanning(false)
  }

  useEffect(() => { return () => stopCamera() }, [])

  useEffect(() => {
    if (!scanning || !cameraActive) return
    const canvas = canvasRef.current; const video = videoRef.current
    if (!canvas || !video) return
    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth; canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d"); ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        if (zxingRef.current && !scanCooldown.current) {
          try {
            const ZXing = zxingRef.current; const hints = new Map()
            const formats = [ZXing.BarcodeFormat?.QR_CODE, ZXing.BarcodeFormat?.EAN_13, ZXing.BarcodeFormat?.EAN_8, ZXing.BarcodeFormat?.CODE_128, ZXing.BarcodeFormat?.CODE_39, ZXing.BarcodeFormat?.UPC_A, ZXing.BarcodeFormat?.UPC_E, ZXing.BarcodeFormat?.DATA_MATRIX].filter(Boolean)
            if (formats.length) hints.set(ZXing.DecodeHintType?.POSSIBLE_FORMATS, formats)
            const reader = new ZXing.MultiFormatReader(); reader.setHints(hints)
            const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas)
            const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource))
            const result = reader.decode(binaryBitmap)
            if (result && result.getText()) {
              const code = result.getText()
              if (code !== lastScannedCode) {
                setLastScannedCode(code); processBarcode(code); scanCooldown.current = true
                setTimeout(() => { scanCooldown.current = false; setLastScannedCode("") }, 2500)
              }
            }
          } catch (_) {}
        }
      }
      animFrameRef.current = requestAnimationFrame(tick)
    }
    animFrameRef.current = requestAnimationFrame(tick)
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current) }
  }, [scanning, cameraActive, lastScannedCode])

  useEffect(() => {
    if (activeTab !== "hardware") return
    const handleKeyDown = (e) => {
      if (e.key === "Enter") { if (barcodeBuffer.current.length > 2) processBarcode(barcodeBuffer.current); barcodeBuffer.current = ""; clearTimeout(barcodeTimer.current); return }
      if (e.key.length === 1) { barcodeBuffer.current += e.key; clearTimeout(barcodeTimer.current); barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = "" }, 100) }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => { window.removeEventListener("keydown", handleKeyDown); clearTimeout(barcodeTimer.current) }
  }, [activeTab])

  useEffect(() => { if (activeTab === "hardware" && inputRef.current) inputRef.current.focus() }, [activeTab])

  const processBarcode = useCallback((code) => {
    const trimmed = code.trim(); if (!trimmed) return
    const found = products.find((p) => p.serialNumber === trimmed || p.grn === trimmed || p.vendorBillNumber === trimmed || p.name?.toLowerCase() === trimmed.toLowerCase())
    if (found) {
      setScanResult({ product: found, status: "found" })
      setScanHistory((prev) => [{ code: trimmed, product: found, status: "found", time: new Date() }, ...prev.slice(0, 9)])
      setCartItems((prev) => {
        const existing = prev.findIndex((item) => item.product._id === found._id)
        if (existing !== -1) { const updated = [...prev]; updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 }; return updated }
        return [...prev, { product: found, qty: 1, purchaseRate: found.purchaseRate || 0, saleRate: found.saleRate || 0 }]
      })
    } else {
      setScanResult({ product: null, status: "notfound", code: trimmed })
      setScanHistory((prev) => [{ code: trimmed, product: null, status: "notfound", time: new Date() }, ...prev.slice(0, 9)])
    }
    setManualInput(""); setTimeout(() => setScanResult(null), 3000)
  }, [products])

  const updateCartItem = (index, field, value) => { setCartItems((prev) => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u }) }
  const removeCartItem = (index) => setCartItems((prev) => prev.filter((_, i) => i !== index))
  const handleConfirmCart = () => { if (cartItems.length === 0) return; onProductScanned(cartItems); onClose() }
  const switchTab = (tab) => { if (tab !== "camera") stopCamera(); setActiveTab(tab) }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-xl p-2"><Barcode className="h-6 w-6 text-white" /></div>
            <div><h2 className="text-xl font-bold text-white">Barcode Scanner</h2><p className="text-emerald-100 text-sm">Scan products to add to stock</p></div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          {[{ id: "camera", label: "Camera Scan", icon: "📷" }, { id: "hardware", label: "Hardware Scanner", icon: "⚡" }, { id: "manual", label: "Manual Search", icon: "🔍" }].map((tab) => (
            <button key={tab.id} onClick={() => switchTab(tab.id)} className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id ? "border-emerald-500 text-emerald-700 bg-white" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              <span>{tab.icon}</span>{tab.label}
            </button>
          ))}
        </div>
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col overflow-hidden">
            {activeTab === "camera" && (
              <div className="flex-1 flex flex-col p-4 overflow-y-auto">
                {cameras.length > 1 && (
                  <div className="mb-3 flex items-center gap-2">
                    <label className="text-sm text-gray-600 font-medium flex-shrink-0">Camera:</label>
                    <select value={selectedCamera} onChange={(e) => { setSelectedCamera(e.target.value); if (cameraActive) { stopCamera(); setTimeout(startCamera, 300) } }} className="flex-1 p-2 border rounded-lg text-sm">
                      {cameras.map((cam, i) => (<option key={cam.deviceId} value={cam.deviceId}>{cam.label || `Camera ${i + 1}`}</option>))}
                    </select>
                  </div>
                )}
                <div className="relative bg-black rounded-2xl overflow-hidden flex-shrink-0" style={{ aspectRatio: "16/9", maxHeight: "320px" }}>
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline style={{ display: cameraActive ? "block" : "none" }} />
                  <canvas ref={canvasRef} className="hidden" />
                  {!cameraActive && (<div className="absolute inset-0 flex flex-col items-center justify-center text-white"><div className="text-6xl mb-4">📷</div><p className="text-lg font-semibold mb-1">Camera Scanner</p><p className="text-sm text-gray-400 text-center px-8">Point camera at barcode or QR code</p></div>)}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-36">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                        <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 opacity-80" style={{ animation: "scanLine 2s linear infinite", top: "50%" }} />
                      </div>
                      <div className="absolute bottom-3 left-0 right-0 text-center"><span className="bg-black bg-opacity-50 text-emerald-300 text-xs px-3 py-1 rounded-full">🔍 Scanning...</span></div>
                    </div>
                  )}
                </div>
                <style>{`@keyframes scanLine { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }`}</style>
                {cameraError && (<div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2"><AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-700">{cameraError}</p></div>)}
                <div className="mt-3">
                  {!cameraActive ? (<button onClick={startCamera} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><Scan className="h-5 w-5" />Start Camera</button>)
                    : (<button onClick={stopCamera} className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"><X className="h-5 w-5" />Stop Camera</button>)}
                </div>
                {scanResult && (
                  <div className={`mt-3 p-3 rounded-xl border-2 flex items-center gap-3 ${scanResult.status === "found" ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                    {scanResult.status === "found" ? (<><CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" /><div><p className="font-semibold text-green-800">{scanResult.product.name}</p><p className="text-xs text-green-600">{scanResult.product.category} · Stock: {scanResult.product.quantity}</p></div></>) : (<><AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" /><div><p className="font-semibold text-red-800">Not Found</p><p className="text-xs text-red-600">Code: {scanResult.code}</p></div></>)}
                  </div>
                )}
                {scanHistory.length > 0 && (
                  <div className="mt-4">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Scans</h4>
                    <div className="space-y-1.5">
                      {scanHistory.slice(0, 5).map((item, i) => (
                        <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${item.status === "found" ? "bg-green-50" : "bg-red-50"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${item.status === "found" ? "bg-green-500" : "bg-red-500"}`} />
                          <span className="font-mono text-gray-500 flex-shrink-0">{item.code.substring(0, 15)}{item.code.length > 15 ? "…" : ""}</span>
                          <span className={`flex-1 font-medium truncate ${item.status === "found" ? "text-green-700" : "text-red-600"}`}>{item.status === "found" ? item.product.name : "Not Found"}</span>
                          <span className="text-gray-400">{item.time.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === "hardware" && (
              <div className="flex-1 p-6 overflow-y-auto">
                <div className="mb-5 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex gap-3">
                  <ZapIcon className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div><p className="text-sm font-semibold text-yellow-800">USB / Bluetooth Scanner</p><p className="text-xs text-yellow-700 mt-1">Click below and scan with your hardware scanner. It auto-detects.</p></div>
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 relative">
                    <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                    <input ref={inputRef} type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && processBarcode(manualInput)} placeholder="Scan barcode here..." className="w-full pl-10 pr-4 py-3 border-2 border-emerald-300 rounded-xl text-lg font-mono" autoComplete="off" />
                  </div>
                  <button onClick={() => processBarcode(manualInput)} className="bg-emerald-600 text-white px-4 rounded-xl hover:bg-emerald-700"><Search className="h-5 w-5" /></button>
                </div>
                {scanResult && (
                  <div className={`mb-4 p-3 rounded-xl border-2 flex items-center gap-3 ${scanResult.status === "found" ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                    {scanResult.status === "found" ? (<><CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" /><div><p className="font-semibold text-green-800">{scanResult.product.name}</p><p className="text-xs text-green-600">{scanResult.product.category} · {scanResult.product.quantity} units</p></div></>) : (<><AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" /><div><p className="font-semibold text-red-800">Not Found: {scanResult.code}</p></div></>)}
                  </div>
                )}
                {scanHistory.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Scans</h4>
                    <div className="space-y-1.5">
                      {scanHistory.map((item, i) => (
                        <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${item.status === "found" ? "bg-green-50" : "bg-red-50"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === "found" ? "bg-green-500" : "bg-red-500"}`} />
                          <span className="font-mono text-gray-500">{item.code}</span>
                          <span className={`flex-1 font-medium ${item.status === "found" ? "text-green-700" : "text-red-600"}`}>{item.status === "found" ? item.product.name : "Not Found"}</span>
                          <span className="text-gray-400">{item.time.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (<div className="flex flex-col items-center justify-center py-16 text-gray-300"><Barcode className="h-20 w-20 mb-4" /><p className="text-gray-400">Waiting for scan...</p></div>)}
              </div>
            )}
            {activeTab === "manual" && (
              <div className="flex-1 p-6 overflow-y-auto">
                <p className="text-sm text-gray-600 mb-4">Search by product name, serial number, GRN, or vendor bill number.</p>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input type="text" value={manualInput} onChange={(e) => setManualInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && processBarcode(manualInput)} placeholder="Type product name, S/N, GRN..." className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl" />
                  </div>
                  <button onClick={() => processBarcode(manualInput)} className="bg-emerald-600 text-white px-5 rounded-xl hover:bg-emerald-700 font-medium">Add</button>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Add</h4>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {products.filter((p) => !manualInput || p.name.toLowerCase().includes(manualInput.toLowerCase())).slice(0, 20).map((p) => (
                      <button key={p._id} onClick={() => processBarcode(p.name)} className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors text-left">
                        <div><p className="text-sm font-semibold text-gray-900">{p.name}</p><p className="text-xs text-gray-500">{p.category}{p.serialNumber ? ` · S/N: ${p.serialNumber}` : ""}</p></div>
                        <div className="text-right"><p className="text-xs font-medium text-gray-600">Stock: {p.quantity}</p><p className="text-xs text-emerald-600">₨{p.purchaseRate}</p></div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="w-80 flex flex-col bg-gray-50 border-l border-gray-200 flex-shrink-0">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-gray-600" /><h3 className="font-bold text-gray-800 text-sm">Scanned Items</h3>{cartItems.length > 0 && (<span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{cartItems.length}</span>)}</div>
              {cartItems.length > 0 && (<button onClick={() => setCartItems([])} className="text-xs text-red-500 hover:text-red-700">Clear</button>)}
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 py-8"><ShoppingCart className="h-14 w-14 mb-3" /><p className="text-gray-400 text-sm text-center">Scan a product to add it here</p></div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item, index) => (
                    <div key={index} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0"><p className="font-semibold text-gray-900 text-sm truncate">{item.product.name}</p><p className="text-xs text-gray-500">{item.product.category}</p></div>
                        <button onClick={() => removeCartItem(index)} className="text-gray-400 hover:text-red-500 ml-1 flex-shrink-0"><X className="h-3.5 w-3.5" /></button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div><label className="text-xs text-gray-500 block mb-0.5">Qty</label><input type="number" min="1" value={item.qty} onChange={(e) => updateCartItem(index, "qty", Math.max(1, Number(e.target.value)))} className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-sm text-center font-bold" /></div>
                        <div><label className="text-xs text-gray-500 block mb-0.5">Buy ₨</label><input type="number" min="0" step="0.01" value={item.purchaseRate} onChange={(e) => updateCartItem(index, "purchaseRate", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-xs" /></div>
                        <div><label className="text-xs text-gray-500 block mb-0.5">Sale ₨</label><input type="number" min="0" step="0.01" value={item.saleRate} onChange={(e) => updateCartItem(index, "saleRate", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-xs" /></div>
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex justify-between text-xs"><span className="text-gray-500">Amount:</span><span className="font-semibold text-blue-600">{formatCurrency(item.qty * item.purchaseRate)}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="px-3 py-3 border-t border-gray-200 bg-white">
                <div className="flex justify-between text-xs mb-0.5"><span className="text-gray-600">Total Units:</span><span className="font-bold">{cartItems.reduce((s, i) => s + i.qty, 0)}</span></div>
                <div className="flex justify-between text-xs mb-3"><span className="text-gray-600">Total Amount:</span><span className="font-bold text-emerald-600">{formatCurrency(cartItems.reduce((s, i) => s + i.qty * i.purchaseRate, 0))}</span></div>
                <button onClick={handleConfirmCart} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm"><CheckCircle className="h-4 w-4" />Confirm ({cartItems.length} items)</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main StockManagement Component ─────────────────────────────────────────
const StockManagement = ({ onStockUpdate, onNotificationCreate }) => {
  const formatDateToDDMMYYYY = (date) => {
    if (!date) return ""
    const d = new Date(date)
    return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`
  }
  const formatDateToYYYYMMDD = (date) => { if (!date) return ""; return new Date(date).toISOString().split("T")[0] }

  const [stockEntries, setStockEntries] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [vendors, setVendors] = useState([])
  const [purchasesAccounts, setPurchasesAccounts] = useState([])
  const [loadingVendors, setLoadingVendors] = useState(false)
  const [loadingPurchases, setLoadingPurchases] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [scannerProcessing, setScannerProcessing] = useState(false)
  const [showReturnForm, setShowReturnForm] = useState(false)
  const [returnFormData, setReturnFormData] = useState({ productId: "", returnQuantity: "", returnDate: new Date().toISOString().split("T")[0], reason: "" })
  const [selectedProductForReturn, setSelectedProductForReturn] = useState(null)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0], name: "", category: "", quantity: "", purchaseRate: "", saleRate: "",
    customerName: "", vendorPhone: "", notes: "", serialNumber: "", expiryDate: "", lastPurchase: "",
    vendorName: "", vendorBillNumber: "", grn: "", purchasesType: "",
  })
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingVoucherId, setEditingVoucherId] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showReturnHistory, setShowReturnHistory] = useState(false)
  const [returnHistory, setReturnHistory] = useState([])
  const [loadingReturns, setLoadingReturns] = useState(false)

  const loadVendors = async () => {
    try {
      setLoadingVendors(true)
      const response = await ApiHandler.getLiabilities()
      setVendors((response.data || []).filter((l) => l.type === "PAYABLES"))
    } catch (err) { console.error("Error loading vendors:", err); setVendors([]) }
    finally { setLoadingVendors(false) }
  }

  const loadPurchasesAccounts = async () => {
    try {
      setLoadingPurchases(true)
      const response = await ApiHandler.getChartExpenses()
      setPurchasesAccounts((response.data || []).filter((a) => a.type === "Purchases"))
    } catch (err) { console.error("Error loading purchases:", err); setPurchasesAccounts([]) }
    finally { setLoadingPurchases(false) }
  }

  const fetchStockEntries = async () => {
    try {
      setLoading(true); setError(null)
      const productsResponse = await ApiHandler.getProducts()
      let productsData = []
      if (productsResponse && Array.isArray(productsResponse)) productsData = productsResponse
      else if (productsResponse?.data) productsData = Array.isArray(productsResponse.data) ? productsResponse.data : []

      const entries = productsData.map((product) => {
        const vendorObj = typeof product.vendorName === "object" ? product.vendorName : vendors.find((v) => v._id === product.vendorName)
        // ✅ Show "—" instead of blank when vendor is null
        const vendorNameStr = vendorObj?.name || (typeof product.vendorName === "string" && product.vendorName ? product.vendorName : "—")
        const purchaseTypeObj = typeof product.purchaseType === "object" ? product.purchaseType : purchasesAccounts.find((p) => p._id === product.purchaseType)
        const purchaseTypeStr = purchaseTypeObj?.name || ""
        const purchaseQuantity = product.purchaseQuantity || product.quantity || 0
        const purchaseAmount = product.purchaseAmount || (purchaseQuantity * product.purchaseRate) || 0
        const balanceQuantity = product.quantity || 0
        const balanceAmount = product.balanceAmount || (balanceQuantity * product.purchaseRate) || 0
        return {
          id: product._id,
          date: product.createdAt ? formatDateToDDMMYYYY(product.createdAt) : formatDateToDDMMYYYY(new Date()),
          itemName: product.name, category: product.category, purchaseQuantity, purchaseAmount, balanceQuantity, balanceAmount,
          totalSoldQuantity: product.totalSoldQuantity || 0, purchaseRate: product.purchaseRate, saleRate: product.saleRate,
          profit: (product.saleRate - product.purchaseRate) * balanceQuantity,
          potentialProfit: (product.saleRate - product.purchaseRate) * balanceQuantity,
          totalAmount: balanceQuantity * product.saleRate, customerName: "",
          vendorPhone: product.vendorPhone || "", notes: product.notes || "", serialNumber: product.serialNumber || "",
          vendorName: vendorNameStr,  // ✅ Always has a display value
          vendorBillNumber: product.vendorBillNumber || "", grn: product.grn || "",
          expiryDate: product.expiryDate || "", voucherId: product.voucherId || "", purchaseType: purchaseTypeStr,
        }
      })
      setStockEntries(entries); setProducts(productsData)
      if (onStockUpdate) onStockUpdate(entries)
    } catch (err) { setError(err.message); console.error("Error fetching:", err); setStockEntries([]) }
    finally { setLoading(false) }
  }

  const createNotification = async (type, title, message, priority = "medium", relatedId = null) => {
    try {
      const notificationData = { type, title, message, priority, relatedId, relatedModel: relatedId ? "Product" : null }
      await ApiHandler.createNotification(notificationData)
      if (onNotificationCreate) onNotificationCreate({ ...notificationData, _id: Date.now().toString(), createdAt: new Date().toISOString(), isRead: false })
    } catch (err) { console.error("Notification error:", err) }
  }

  const emitVoucherChangedEvent = () => {
    if (typeof window !== "undefined") {
      try { window.dispatchEvent(new CustomEvent("voucher:changed", { detail: { action: "refresh", at: Date.now() } })) } catch (_) {}
    }
  }

  useEffect(() => { loadVendors(); loadPurchasesAccounts(); fetchStockEntries(); fetchReturnHistory() }, [])

  const fetchReturnHistory = async () => {
    try {
      setLoadingReturns(true)
      const response = await ApiHandler.getPurchaseReturns()
      let returns = []
      if (response && Array.isArray(response)) returns = response
      else if (response?.data && Array.isArray(response.data)) returns = response.data
      else if (response?.returns && Array.isArray(response.returns)) returns = response.returns
      setReturnHistory(returns)
    } catch (err) { console.error("[PRN] Error:", err); setReturnHistory([]) }
    finally { setLoadingReturns(false) }
  }

  const handleScannerConfirm = async (cartItems) => {
    setScannerProcessing(true)
    const errors = [], successes = []
    for (const item of cartItems) {
      try {
        await ApiHandler.updateStock(item.product._id, { quantity: item.qty, operation: "add" })
        if (item.purchaseRate !== item.product.purchaseRate || item.saleRate !== item.product.saleRate)
          await ApiHandler.updateProduct(item.product._id, { purchaseRate: item.purchaseRate, saleRate: item.saleRate })
        successes.push(item.product.name)
        await createNotification("success", "Stock Updated via Scanner", `${item.qty} units of ${item.product.name} added`, "medium", item.product._id)
      } catch (err) { errors.push(`${item.product.name}: ${err.message}`) }
    }
    setScannerProcessing(false); await fetchStockEntries()
    if (errors.length > 0) alert(`Completed with errors:\n✓ ${successes.join(", ")}\n✗ ${errors.join("\n")}`)
    else alert(`✓ Stock updated:\n${successes.map((n) => `• ${n}`).join("\n")}`)
  }

  const resetForm = () => {
    setFormData({ date: new Date().toISOString().split("T")[0], name: "", category: "", quantity: "", purchaseRate: "", saleRate: "", customerName: "", vendorPhone: "", notes: "", serialNumber: "", expiryDate: "", lastPurchase: "", vendorName: "", vendorBillNumber: "", grn: "", purchasesType: "" })
    setIsEditing(false); setEditingId(null); setEditingVoucherId(null); setShowForm(false); setError(null)
  }

  const resetReturnForm = () => {
    setReturnFormData({ productId: "", returnQuantity: "", returnDate: new Date().toISOString().split("T")[0], reason: "" })
    setSelectedProductForReturn(null); setShowReturnForm(false); setError(null)
  }

  const handleOpenReturnForm = (entry) => {
    setSelectedProductForReturn(entry)
    setReturnFormData({ productId: entry.id, returnQuantity: "", returnDate: new Date().toISOString().split("T")[0], reason: "" })
    setShowReturnForm(true); setError(null)
  }

  const handleReturnChange = (e) => { const { name, value } = e.target; setReturnFormData({ ...returnFormData, [name]: value }) }

  const handleReturnSubmit = async (e) => {
    e.preventDefault(); setError(null)
    try {
      const returnQty = Number(returnFormData.returnQuantity)
      if (!returnQty || returnQty <= 0) { setError("Return quantity must be greater than 0"); return }
      if (returnQty > selectedProductForReturn.balanceQuantity) { setError(`Cannot return more than ${selectedProductForReturn.balanceQuantity} units`); return }
      const returnData = {
        productId: returnFormData.productId, returnQuantity: returnQty, returnDate: returnFormData.returnDate, reason: returnFormData.reason,
        productName: selectedProductForReturn.itemName,
        vendorName: selectedProductForReturn.vendorName === "—" ? "" : selectedProductForReturn.vendorName,
        grnDate: selectedProductForReturn.date, returnAmount: returnQty * selectedProductForReturn.purchaseRate,
        purchaseRate: selectedProductForReturn.purchaseRate, category: selectedProductForReturn.category, grn: selectedProductForReturn.grn,
      }
      const response = await ApiHandler.returnProduct(returnData)
      if (response && response.success) {
        await createNotification("warning", "Purchase Return Processed", `${returnQty} units of ${selectedProductForReturn.itemName} returned`, "high", returnFormData.productId)
        resetReturnForm(); await fetchStockEntries(); await fetchReturnHistory()
        alert(`Return Processed!\n\nProduct: ${selectedProductForReturn.itemName}\nQty: ${returnQty} units\nAmount: ${formatCurrency(returnQty * selectedProductForReturn.purchaseRate)}`)
      }
    } catch (err) { console.error("Return error:", err); setError(err.message || "Failed to process return") }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (name === "name") {
      const product = products.find((p) => p.name.toLowerCase() === value.toLowerCase())
      if (product) setFormData((prev) => ({ ...prev, category: product.category || "", purchaseRate: product.purchaseRate || "", saleRate: product.saleRate || "", serialNumber: product.serialNumber || "", vendorName: product.vendorName || "" }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(null)
    try {
      const qty = Number(formData.quantity) || 0
      const purchaseRate = Number(formData.purchaseRate) || 0
      const saleRate = Number(formData.saleRate) || 0

      // ── Required validations (vendor & purchasesType are OPTIONAL) ──────────
      if (!formData.name || !formData.name.trim()) { setError("Product name is required"); return }
      if (!formData.category) { setError("Category is required"); return }
      if (!purchaseRate || purchaseRate < 0) { setError("Purchase rate is required"); return }
      if (!saleRate || saleRate < 0) { setError("Sale rate is required"); return }
      if (qty < 0) { setError("Quantity must be non-negative"); return }

      // ✅ Vendor & PurchasesType are OPTIONAL — null if not selected
      const selectedVendor = vendors.find((v) => v.name === formData.vendorName) || null
      const selectedPurchaseAccount = purchasesAccounts.find((p) => p.name === formData.purchasesType) || null

      const totalPurchaseAmount = qty * purchaseRate

      const productData = {
        name: formData.name.trim(), category: formData.category, purchaseRate, saleRate, quantity: qty,
        serialNumber: formData.serialNumber,
        vendorName: selectedVendor?._id || null,           // ✅ null if no vendor
        vendorPhone: formData.vendorPhone,
        vendorBillNumber: formData.vendorBillNumber,
        notes: formData.notes, expiryDate: formData.expiryDate,
        purchaseType: selectedPurchaseAccount?._id || null, // ✅ null if no purchase type
      }

      if (isEditing) {
        await ApiHandler.updateProduct(editingId, productData)
        // Only update voucher if we have both vendor AND purchase account
        if (editingVoucherId && selectedVendor && selectedPurchaseAccount) {
          await ApiHandler.updateVoucher(editingVoucherId, {
            voucherDate: formData.date, narration: `GRN - ${formData.name}`,
            entries: [
              { pairId: "PAIR001", entryType: "DEBIT", account: `${selectedPurchaseAccount.code} - ${selectedPurchaseAccount.name}`, description: `Purchase of ${formData.name}`, debitAmount: totalPurchaseAmount, creditAmount: 0, serialNo: 1 },
              { pairId: "PAIR001", entryType: "CREDIT", account: `${selectedVendor.code} - ${selectedVendor.name}`, description: `Stock received - ${formData.name}`, debitAmount: 0, creditAmount: totalPurchaseAmount, serialNo: 2 },
            ],
          })
          emitVoucherChangedEvent()
        }
        await createNotification("info", "Stock Entry Updated", `${formData.name} updated`, "medium", editingId)
      } else {
        const response = await ApiHandler.createProduct(productData)
        if (!response || !response._id) throw new Error("Failed to create product - no ID returned")

        // ✅ Only create voucher if BOTH vendor AND purchase account are selected
        if (selectedVendor && selectedPurchaseAccount) {
          try {
            const voucherData = {
              voucherNo: `GRN-${Date.now()}`, voucherType: "GRN", voucherDate: formData.date,
              narration: `Goods Receipt Note - ${formData.name}`,
              entries: [
                { pairId: "PAIR001", entryType: "DEBIT", account: `${selectedPurchaseAccount.code} - ${selectedPurchaseAccount.name}`, description: `Purchase of ${formData.name} (Qty: ${qty} @ ${purchaseRate})`, debitAmount: totalPurchaseAmount, creditAmount: 0, serialNo: 1 },
                { pairId: "PAIR001", entryType: "CREDIT", account: `${selectedVendor.code} - ${selectedVendor.name}`, description: `Stock received - ${formData.name} (Qty: ${qty} @ ${purchaseRate})`, debitAmount: 0, creditAmount: totalPurchaseAmount, serialNo: 2 },
              ],
            }
            const voucherResponse = await ApiHandler.createVoucher(voucherData)
            if (voucherResponse?.data?._id) {
              await ApiHandler.updateProduct(response._id, { ...productData, voucherId: voucherResponse.data._id })
              emitVoucherChangedEvent()
            }
            await createNotification("success", "Stock Entry & Voucher Created", `${formData.name} — ${formatCurrency(totalPurchaseAmount)} recorded in ledger`, "high", response._id)
          } catch (voucherErr) {
            console.error("[GRN] Voucher error:", voucherErr)
            await createNotification("warning", "Stock Added (No Voucher)", `Stock added but voucher failed: ${voucherErr.message}`, "high", response._id)
          }
        } else {
          // ✅ No vendor/purchase type — stock added without voucher
          await createNotification("success", "Stock Entry Created", `${formData.name} added (no vendor/voucher)`, "medium", response._id)
        }
      }
      resetForm(); await fetchStockEntries()
    } catch (err) {
      console.error("[GRN] Error:", err)
      if (err.message?.includes("already exists")) setError("A product with this name already exists.")
      else setError(err.message || "An error occurred while saving")
    }
  }

  const handleEdit = (entry) => {
    const dateForForm = entry.date ? formatDateToYYYYMMDD(new Date(entry.date.split("-").reverse().join("-"))) : ""
    const vendorObj = vendors.find((v) => v.name === entry.vendorName)
    setFormData({
      date: dateForForm, name: entry.itemName, category: entry.category,
      quantity: entry.balanceQuantity.toString(), purchaseRate: entry.purchaseRate.toString(), saleRate: entry.saleRate.toString(),
      customerName: entry.customerName || "", vendorPhone: entry.vendorPhone || "", notes: entry.notes || "",
      serialNumber: entry.serialNumber || "", expiryDate: entry.expiryDate || "", lastPurchase: entry.lastPurchase || "",
      // ✅ Clear "—" when editing so dropdown shows blank/optional
      vendorName: vendorObj?.name || (entry.vendorName === "—" ? "" : entry.vendorName) || "",
      vendorBillNumber: entry.vendorBillNumber || "", grn: entry.grn || "", purchasesType: entry.purchaseType || "",
    })
    setIsEditing(true); setEditingId(entry.id); setEditingVoucherId(entry.voucherId); setShowForm(true)
  }

  const handleViewDetails = (entry) => { setSelectedEntry(entry); setShowDetails(true) }

  const handleDelete = async (id) => {
    if (window.confirm("Delete this stock entry? Associated GRN voucher will also be deleted.")) {
      try {
        const entry = stockEntries.find((e) => e.id === id)
        if (entry?.voucherId) {
          try { await ApiHandler.deleteVoucher(entry.voucherId); emitVoucherChangedEvent() }
          catch (vErr) { console.error("Voucher delete error:", vErr) }
        }
        await ApiHandler.deleteProduct(id)
        await createNotification("warning", "Stock Entry Deleted", `${entry?.itemName || "Item"} deleted`, "medium")
        await fetchStockEntries()
      } catch (err) { setError(err.message); console.error("Delete error:", err) }
    }
  }

  const filteredEntries = stockEntries.filter((entry) => {
    const matchesSearch = entry.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "" || entry.category === categoryFilter
    let matchesDate = true
    if (dateFilter) { const filterDate = formatDateToDDMMYYYY(new Date(dateFilter)); matchesDate = entry.date === filterDate }
    return matchesSearch && matchesCategory && matchesDate
  })

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage)

  const subtotals = filteredEntries.reduce(
    (acc, entry) => ({ purchaseQuantity: acc.purchaseQuantity + entry.purchaseQuantity, purchaseAmount: acc.purchaseAmount + entry.purchaseAmount, balanceQuantity: acc.balanceQuantity + entry.balanceQuantity, balanceAmount: acc.balanceAmount + entry.balanceAmount, totalSoldQuantity: acc.totalSoldQuantity + entry.totalSoldQuantity, totalProfit: acc.totalProfit + (entry.profit || 0) }),
    { purchaseQuantity: 0, purchaseAmount: 0, balanceQuantity: 0, balanceAmount: 0, totalSoldQuantity: 0, totalProfit: 0 }
  )

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 2 }).format(value)

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=800,width=1200")
    printWindow.document.write(`<html><head><title>Stock Report - GRN</title><style>body{font-family:Arial,sans-serif;padding:20px}h1{text-align:center;color:#1e40af}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background:#f3f4f6;font-weight:bold}.tr{text-align:right}.totals{background:#f9fafb;font-weight:bold}.pp{color:#059669}.np{color:#dc2626}.footer{margin-top:30px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #ddd;padding-top:10px}</style></head><body>`)
    printWindow.document.write(`<h1>Goods Receipt Note</h1><div style="text-align:center;color:#64748b;margin-bottom:20px">Generated: ${formatDateToDDMMYYYY(new Date())}</div>`)
    printWindow.document.write("<table><thead><tr><th>Date</th><th>GRN No.</th><th>Product</th><th>Category</th><th>Vendor</th><th class='tr'>Purchase Qty</th><th class='tr'>Purchase Amt</th><th class='tr'>Balance Qty</th><th class='tr'>Balance Amt</th><th class='tr'>Sale Rate</th><th class='tr'>Profit</th></tr></thead><tbody>")
    filteredEntries.forEach((e) => { printWindow.document.write(`<tr><td>${e.date}</td><td>${e.grn || "-"}</td><td>${e.itemName}</td><td>${e.category}</td><td>${e.vendorName}</td><td class="tr">${e.purchaseQuantity}</td><td class="tr">${formatCurrency(e.purchaseAmount)}</td><td class="tr">${e.balanceQuantity}</td><td class="tr">${formatCurrency(e.balanceAmount)}</td><td class="tr">${formatCurrency(e.saleRate)}</td><td class="tr ${e.profit >= 0 ? "pp" : "np"}">${formatCurrency(e.profit)}</td></tr>`) })
    printWindow.document.write(`<tr class="totals"><td colspan="6" class="tr">Totals:</td><td class="tr">${formatCurrency(subtotals.purchaseAmount)}</td><td class="tr">${subtotals.balanceQuantity}</td><td class="tr">${formatCurrency(subtotals.balanceAmount)}</td><td></td><td class="tr ${subtotals.totalProfit >= 0 ? "pp" : "np"}">${formatCurrency(subtotals.totalProfit)}</td></tr>`)
    printWindow.document.write("</tbody></table><div class='footer'>Created by Soft-Technix</div></body></html>")
    printWindow.document.close(); printWindow.print()
  }

  const handleExport = () => {
    const csvContent = [
      ["Date", "GRN No.", "Item Name", "Category", "Vendor", "Purchase Qty", "Purchase Rate", "Purchase Amount", "Balance Qty", "Balance Amount", "Sale Rate", "Sold Qty", "Profit"],
      ...filteredEntries.map((e) => [e.date, e.grn || "-", e.itemName, e.category, e.vendorName, e.purchaseQuantity, e.purchaseRate, e.purchaseAmount, e.balanceQuantity, e.balanceAmount, e.saleRate, e.totalSoldQuantity, e.profit]),
    ].map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a"); a.href = url; a.download = `stock-grn-${formatDateToDDMMYYYY(new Date())}.csv`; a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return (<div className="p-6 bg-white rounded-lg shadow"><div className="flex items-center justify-center h-64"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div><p className="text-gray-600">Loading Stock Management...</p></div></div></div>)
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {showScanner && (<BarcodeScannerModal onClose={() => setShowScanner(false)} products={products} onProductScanned={handleScannerConfirm} />)}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div><h2 className="text-xl font-semibold mb-2 flex items-center gap-2"><Package className="h-5 w-5" />Goods Receipt Note (GRN)</h2><p className="text-sm text-gray-600">Manage product inventory and stock levels</p></div>
        <div className="flex gap-2 flex-wrap mt-4 md:mt-0">
          <button className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 flex items-center gap-2 font-medium shadow-sm" onClick={() => setShowScanner(true)} disabled={scannerProcessing}><Scan className="h-4 w-4" />{scannerProcessing ? "Processing..." : "Scan Products"}</button>
          <button className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 flex items-center gap-2" onClick={() => setShowReturnHistory(true)}><RotateCcw className="h-4 w-4" />Purchases Return ({returnHistory.length})</button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 flex items-center gap-2" onClick={handlePrint} disabled={filteredEntries.length === 0}><Printer className="h-4 w-4" />Print</button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2" onClick={handleExport} disabled={filteredEntries.length === 0}><Download className="h-4 w-4" />Export</button>
          <button onClick={fetchStockEntries} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 flex items-center gap-2" disabled={loading}><RefreshCw className="h-4 w-4" />Refresh</button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2" onClick={() => setShowForm(true)}><Plus className="h-4 w-4" />Record New Purchase</button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-blue-600">Total Purchase Amount</p><p className="text-xl font-bold text-blue-900">{formatCurrency(subtotals.purchaseAmount)}</p></div><TrendingUp className="h-8 w-8 text-blue-600" /></div></div>
        <div className="bg-green-50 p-4 rounded-lg"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-green-600">Total Balance Amount</p><p className="text-xl font-bold text-green-900">{formatCurrency(subtotals.balanceAmount)}</p></div><TrendingUp className="h-8 w-8 text-green-600" /></div></div>
        <div className="bg-purple-50 p-4 rounded-lg"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-purple-600">Total Balance Quantity</p><p className="text-xl font-bold text-purple-900">{subtotals.balanceQuantity} units</p></div><Package className="h-8 w-8 text-purple-600" /></div></div>
        <div className="bg-orange-50 p-4 rounded-lg"><div className="flex items-center justify-between"><div><p className="text-sm font-medium text-orange-600">Total Products</p><p className="text-xl font-bold text-orange-900">{filteredEntries.length}</p></div><Filter className="h-8 w-8 text-orange-600" /></div></div>
      </div>

      {error && (<div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md"><div className="flex justify-between items-center"><span>{error}</span><button onClick={() => setError(null)} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button></div></div>)}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input type="text" placeholder="Search products..." className="w-full pl-10 p-2 border rounded-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} /></div>
        <select className="p-2 border rounded-md" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}><option value="">All Categories</option>{productCategories.map((c) => (<option key={c} value={c}>{c}</option>))}</select>
        <input type="date" className="p-2 border rounded-md" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        <select className="p-2 border rounded-md" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}><option value={10}>10 per page</option><option value={25}>25 per page</option><option value={50}>50 per page</option><option value={100}>100 per page</option></select>
        <div className="flex items-center text-sm text-gray-600"><Filter className="h-4 w-4 mr-1" />{filteredEntries.length} of {stockEntries.length}</div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {["Date", "GRN No.", "Product Name", "Category", "Vendor", "Purchase Qty", "Purchase Rate", "Purchase Amount", "Balance Qty", "Balance Amount", "Sale Rate", "Potential Profit", "Actions"].map((h, i) => (
                <th key={i} className={`px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider ${i >= 5 && i <= 11 ? "text-right" : i === 12 ? "text-center" : "text-left"}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedEntries.length > 0 ? paginatedEntries.map((entry) => (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.grn || "-"}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.itemName}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.category}</td>
                {/* ✅ Vendor always shows — never blank */}
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.vendorName}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{entry.purchaseQuantity}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(entry.purchaseRate)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">{formatCurrency(entry.purchaseAmount)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{entry.balanceQuantity}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 text-right font-bold">{formatCurrency(entry.balanceAmount)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(entry.saleRate)}</td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium"><span className={entry.profit >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(entry.profit)}</span></td>
                <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                  <div className="flex justify-center space-x-2">
                    <button onClick={() => handleOpenReturnForm(entry)} className="text-orange-600 hover:text-orange-900" title="Return"><RotateCcw className="h-4 w-4" /></button>
                    <button onClick={() => handleViewDetails(entry)} className="text-blue-600 hover:text-blue-900" title="View"><Eye className="h-4 w-4" /></button>
                    <button onClick={() => handleEdit(entry)} className="text-indigo-600 hover:text-indigo-900" title="Edit"><Edit className="h-4 w-4" /></button>
                    <button onClick={() => handleDelete(entry.id)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            )) : (<tr><td colSpan="13" className="px-4 py-8 text-center text-sm text-gray-500">No products found. Add some products to get started.</td></tr>)}
          </tbody>
          {filteredEntries.length > 0 && (
            <tfoot className="bg-gray-100">
              <tr>
                <td colSpan="5" className="px-4 py-4 text-sm font-medium text-gray-900 text-right">Totals:</td>
                <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">{subtotals.purchaseQuantity}</td>
                <td className="px-4 py-4"></td>
                <td className="px-4 py-4 text-sm font-bold text-blue-600 text-right">{formatCurrency(subtotals.purchaseAmount)}</td>
                <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">{subtotals.balanceQuantity}</td>
                <td className="px-4 py-4 text-sm font-bold text-green-600 text-right">{formatCurrency(subtotals.balanceAmount)}</td>
                <td className="px-4 py-4"></td>
                <td className="px-4 py-4 text-sm font-bold text-right"><span className={subtotals.totalProfit >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(subtotals.totalProfit)}</span></td>
                <td className="px-4 py-4"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEntries.length)} of {filteredEntries.length}</div>
          <div className="flex space-x-2">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => { const page = i + Math.max(1, currentPage - 2); return (<button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 border rounded ${currentPage === page ? "bg-blue-500 text-white" : "bg-white"}`}>{page}</button>) })}
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">Created by <span className="font-semibold text-blue-600">Soft-Technix</span></div>

      {/* Purchase Return Modal */}
      {showReturnForm && selectedProductForReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold flex items-center gap-2"><RotateCcw className="h-5 w-5 text-orange-600" />Purchase Return - PRN</h2><button onClick={resetReturnForm} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button></div>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"><p className="text-sm text-red-800">{error}</p></div>}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <h3 className="font-semibold text-gray-900 mb-3">Product Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium text-gray-700">GRN Date</label><p className="text-sm text-gray-900 font-medium">{selectedProductForReturn.date}</p></div>
                <div><label className="block text-sm font-medium text-gray-700">GRN No.</label><p className="text-sm text-gray-900 font-medium">{selectedProductForReturn.grn || "N/A"}</p></div>
                <div className="col-span-2"><label className="block text-sm font-medium text-gray-700">Product Name</label><p className="text-sm text-gray-900 font-bold">{selectedProductForReturn.itemName}</p></div>
                <div><label className="block text-sm font-medium text-gray-700">Category</label><p className="text-sm text-gray-900">{selectedProductForReturn.category}</p></div>
                <div><label className="block text-sm font-medium text-gray-700">Available Quantity</label><p className="text-sm text-green-600 font-bold">{selectedProductForReturn.balanceQuantity} units</p></div>
                <div><label className="block text-sm font-medium text-gray-700">Purchase Rate</label><p className="text-sm text-gray-900">{formatCurrency(selectedProductForReturn.purchaseRate)}</p></div>
                <div><label className="block text-sm font-medium text-gray-700">Vendor</label><p className="text-sm text-gray-900">{selectedProductForReturn.vendorName}</p></div>
              </div>
            </div>
            <form onSubmit={handleReturnSubmit}>
              <div className="space-y-4">
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Return Quantity <span className="text-red-500">*</span></label><input type="number" name="returnQuantity" value={returnFormData.returnQuantity} onChange={handleReturnChange} required min="1" max={selectedProductForReturn.balanceQuantity} className="w-full p-2 border rounded-md" placeholder="Enter quantity to return" /><p className="text-xs text-gray-500 mt-1">Maximum: {selectedProductForReturn.balanceQuantity} units</p></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Return Date <span className="text-red-500">*</span></label><input type="date" name="returnDate" value={returnFormData.returnDate} onChange={handleReturnChange} required max={new Date().toISOString().split("T")[0]} className="w-full p-2 border rounded-md" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">Reason for Return</label><textarea name="reason" value={returnFormData.reason} onChange={handleReturnChange} rows="3" className="w-full p-2 border rounded-md" placeholder="Optional" /></div>
              </div>
              {returnFormData.returnQuantity && (
                <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                  <h4 className="font-semibold text-orange-900 mb-3">Return Summary (PRN)</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-3 rounded border border-orange-100"><span className="text-xs font-medium text-gray-600">Return Quantity</span><div className="text-lg font-bold text-orange-900">{returnFormData.returnQuantity} units</div></div>
                    <div className="bg-white p-3 rounded border border-orange-100"><span className="text-xs font-medium text-gray-600">Return Amount</span><div className="text-lg font-bold text-orange-600">{formatCurrency(Number(returnFormData.returnQuantity) * selectedProductForReturn.purchaseRate)}</div></div>
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={resetReturnForm} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-2" disabled={loading}><RotateCcw className="h-4 w-4" />Process Return (PRN)</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">{isEditing ? "Edit Product" : "Add New Purchase"}</h2><button onClick={resetForm} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button></div>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"><p className="text-sm text-red-800">{error}</p></div>}
            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Product Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Item / Model Name <span className="text-red-500">*</span></label><input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 border rounded-md" placeholder="Enter product name" list="products-list" /><datalist id="products-list">{products.map((p) => (<option key={p._id} value={p.name} />))}</datalist></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label><select name="category" value={formData.category} onChange={handleChange} required className="w-full p-2 border rounded-md"><option value="">Select category</option>{productCategories.map((c) => (<option key={c} value={c}>{c}</option>))}</select></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label><input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="Enter serial number" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label><input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full p-2 border rounded-md" /></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Quantity & Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label><input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required min="0" className="w-full p-2 border rounded-md" placeholder="Enter quantity" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Purchase Rate <span className="text-red-500">*</span></label><input type="number" name="purchaseRate" value={formData.purchaseRate} onChange={handleChange} required min="0" step="0.01" className="w-full p-2 border rounded-md" placeholder="Enter purchase rate" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Sale Rate <span className="text-red-500">*</span></label><input type="number" name="saleRate" value={formData.saleRate} onChange={handleChange} required min="0" step="0.01" className="w-full p-2 border rounded-md" placeholder="Enter sale rate" /></div>
                  </div>
                </div>
                <div>
                  {/* ✅ Vendor section marked optional */}
                  <h3 className="text-lg font-medium text-gray-900 mb-1">Vendor Information</h3>
                  <p className="text-xs text-gray-400 mb-3">Optional — if selected, a GRN voucher will be created automatically in the ledger</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      {/* ✅ No required attr */}
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name <span className="text-gray-400 text-xs">(optional)</span></label>
                      <select name="vendorName" value={formData.vendorName} onChange={handleChange} disabled={loadingVendors} className="w-full p-2 border rounded-md disabled:bg-gray-100">
                        <option value="">{loadingVendors ? "Loading..." : "Select vendor (optional)"}</option>
                        {vendors.map((v) => (<option key={v._id} value={v.name}>{v.name} ({v.code})</option>))}
                      </select>
                    </div>
                    <div>
                      {/* ✅ No required attr */}
                      <label className="block text-sm font-medium text-gray-700 mb-1">Purchases Type <span className="text-gray-400 text-xs">(optional)</span></label>
                      <select name="purchasesType" value={formData.purchasesType} onChange={handleChange} disabled={loadingPurchases} className="w-full p-2 border rounded-md disabled:bg-gray-100">
                        <option value="">{loadingPurchases ? "Loading..." : "Select type (optional)"}</option>
                        {purchasesAccounts.map((a) => (<option key={a._id} value={a.name}>{a.name} ({a.code})</option>))}
                      </select>
                    </div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Vendor Phone</label><input type="tel" name="vendorPhone" value={formData.vendorPhone} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="Enter vendor phone" /></div>
                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Vendor Bill Number</label><input type="text" name="vendorBillNumber" value={formData.vendorBillNumber} onChange={handleChange} className="w-full p-2 border rounded-md" placeholder="Enter vendor bill number" /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Notes</label><textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full p-2 border rounded-md" placeholder="Enter any additional notes" /></div>
                  </div>
                </div>
              </div>
              {formData.quantity && formData.purchaseRate && formData.saleRate && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Purchase Summary</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded border border-blue-100"><span className="text-xs font-medium text-gray-600">Purchase Qty</span><div className="text-lg font-bold text-blue-900">{Number(formData.quantity) || 0}</div></div>
                    <div className="bg-white p-3 rounded border border-blue-100"><span className="text-xs font-medium text-gray-600">Purchase Amount</span><div className="text-lg font-bold text-blue-600">{formatCurrency((Number(formData.quantity) || 0) * (Number(formData.purchaseRate) || 0))}</div></div>
                    <div className="bg-white p-3 rounded border border-blue-100"><span className="text-xs font-medium text-gray-600">Balance Qty</span><div className="text-lg font-bold text-green-900">{Number(formData.quantity) || 0}</div></div>
                    <div className="bg-white p-3 rounded border border-blue-100"><span className="text-xs font-medium text-gray-600">Balance Amount</span><div className="text-lg font-bold text-green-600">{formatCurrency((Number(formData.quantity) || 0) * (Number(formData.purchaseRate) || 0))}</div></div>
                  </div>
                </div>
              )}
              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2" disabled={loading || loadingVendors || loadingPurchases}><Save className="h-4 w-4" />{isEditing ? "Update" : "Add"} Product</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return History Modal */}
      {showReturnHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-semibold flex items-center gap-2"><RotateCcw className="h-5 w-5 text-orange-600" />Purchase Return History (PRN)</h2><button onClick={() => setShowReturnHistory(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button></div>
            {loadingReturns ? (<div className="flex items-center justify-center h-64"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div><p className="text-gray-600">Loading...</p></div></div>)
              : returnHistory.length === 0 ? (<div className="text-center py-12"><RotateCcw className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 text-lg">No returns processed yet</p></div>)
              : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-orange-50">
                      <tr>{["GRN Date", "Product Name", "Vendor", "Return Qty", "Return Amount", "Reason"].map((h, i) => (<th key={i} className={`px-4 py-3 text-xs font-medium text-gray-700 uppercase ${i >= 3 && i <= 4 ? "text-right" : "text-left"}`}>{h}</th>))}</tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {returnHistory.map((r, i) => (
                        <tr key={r._id || i} className="hover:bg-gray-50">
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{r.grnDate ? formatDateToDDMMYYYY(r.grnDate) : "N/A"}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{r.productName || "N/A"}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{r.vendorName || "—"}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 text-right font-bold">{r.returnQuantity || 0}</td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 text-right font-bold">{formatCurrency(r.returnAmount || 0)}</td>
                          <td className="px-4 py-4 text-sm text-gray-500">{r.reason || "N/A"}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-orange-50">
                      <tr>
                        <td colSpan="3" className="px-4 py-4 text-sm font-medium text-gray-900 text-right">Total Returns:</td>
                        <td className="px-4 py-4 text-sm font-bold text-orange-600 text-right">{returnHistory.reduce((s, r) => s + (r.returnQuantity || 0), 0)}</td>
                        <td className="px-4 py-4 text-sm font-bold text-orange-600 text-right">{formatCurrency(returnHistory.reduce((s, r) => s + (r.returnAmount || 0), 0))}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            <div className="mt-6 flex justify-end"><button onClick={() => setShowReturnHistory(false)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Close</button></div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4"><h2 className="text-xl font-semibold">Product Details - GRN Tracking</h2><button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button></div>
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-6 rounded-lg border-2 border-blue-200">
                <h3 className="text-lg font-bold text-blue-900 mb-4 flex items-center gap-2"><Package className="h-6 w-6" />GRN Tracking Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm"><label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Quantity</label><p className="text-2xl font-bold text-blue-600">{selectedEntry.purchaseQuantity} units</p></div>
                  <div className="bg-white p-4 rounded-lg shadow-sm"><label className="block text-sm font-semibold text-gray-700 mb-1">Purchase Amount</label><p className="text-2xl font-bold text-blue-600">{formatCurrency(selectedEntry.purchaseAmount)}</p></div>
                  <div className="bg-white p-4 rounded-lg shadow-sm"><label className="block text-sm font-semibold text-gray-700 mb-1">Balance Quantity</label><p className="text-2xl font-bold text-green-600">{selectedEntry.balanceQuantity} units</p></div>
                  <div className="bg-white p-4 rounded-lg shadow-sm"><label className="block text-sm font-semibold text-gray-700 mb-1">Balance Amount</label><p className="text-2xl font-bold text-green-600">{formatCurrency(selectedEntry.balanceAmount)}</p></div>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm"><label className="block text-sm font-semibold text-gray-700 mb-1">Total Sold Quantity</label><p className="text-2xl font-bold text-red-600">{selectedEntry.totalSoldQuantity} units</p></div>
                  <div className="bg-white p-4 rounded-lg shadow-sm"><label className="block text-sm font-semibold text-gray-700 mb-1">Stock Utilization</label><p className="text-2xl font-bold text-purple-600">{selectedEntry.purchaseQuantity > 0 ? ((selectedEntry.totalSoldQuantity / selectedEntry.purchaseQuantity) * 100).toFixed(2) : 0}%</p></div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Product Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">Product Name</label><p className="text-sm text-gray-900">{selectedEntry.itemName}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Category</label><p className="text-sm text-gray-900">{selectedEntry.category}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Serial Number</label><p className="text-sm text-gray-900">{selectedEntry.serialNumber || "N/A"}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">GRN Number</label><p className="text-sm text-gray-900">{selectedEntry.grn || "N/A"}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Date Added</label><p className="text-sm text-gray-900">{selectedEntry.date}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Expiry Date</label><p className="text-sm text-gray-900">{selectedEntry.expiryDate ? formatDateToDDMMYYYY(selectedEntry.expiryDate) : "N/A"}</p></div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Pricing Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">Purchase Rate</label><p className="text-sm text-gray-900 font-medium">{formatCurrency(selectedEntry.purchaseRate)}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Sale Rate</label><p className="text-sm text-gray-900 font-medium">{formatCurrency(selectedEntry.saleRate)}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Potential Profit</label><p className={`text-sm font-medium ${selectedEntry.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(selectedEntry.profit)}</p></div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Vendor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">Vendor Name</label><p className="text-sm text-gray-900">{selectedEntry.vendorName}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Vendor Phone</label><p className="text-sm text-gray-900">{selectedEntry.vendorPhone || "N/A"}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Vendor Bill Number</label><p className="text-sm text-gray-900">{selectedEntry.vendorBillNumber || "N/A"}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Purchase Type</label><p className="text-sm text-gray-900">{selectedEntry.purchaseType || "N/A"}</p></div>
                  <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700">Notes</label><p className="text-sm text-gray-900">{selectedEntry.notes || "N/A"}</p></div>
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => { setShowDetails(false); handleEdit(selectedEntry) }} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"><Edit className="h-4 w-4" />Edit</button>
              <button onClick={() => setShowDetails(false)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StockManagement