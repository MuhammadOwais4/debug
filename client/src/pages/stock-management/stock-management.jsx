"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import ApiHandler from "@/Api/apihandle"
import {
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  Search,
  Filter,
  Download,
  RefreshCw,
  Eye,
  TrendingUp,
  Package,
  Printer,
  RotateCcw,
  Scan,
  ShoppingCart,
  CheckCircle,
  AlertCircle,
  Barcode,
  ZapIcon,
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
      s2.async = true
      s2.onload = () => { zxingRef.current = window.ZXing }
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
      const constraints = {
        video: selectedCamera
          ? { deviceId: { exact: selectedCamera }, width: { ideal: 1280 }, height: { ideal: 720 } }
          : { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }
      setCameraActive(true)
      setScanning(true)
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in your browser settings."
          : err.name === "NotFoundError"
          ? "No camera found on this device."
          : `Camera error: ${err.message}`
      )
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setCameraActive(false)
    setScanning(false)
  }

  useEffect(() => { return () => stopCamera() }, [])

  useEffect(() => {
    if (!scanning || !cameraActive) return
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const tick = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext("2d")
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        if (zxingRef.current && !scanCooldown.current) {
          try {
            const ZXing = zxingRef.current
            const hints = new Map()
            const formats = [
              ZXing.BarcodeFormat?.QR_CODE,
              ZXing.BarcodeFormat?.EAN_13,
              ZXing.BarcodeFormat?.EAN_8,
              ZXing.BarcodeFormat?.CODE_128,
              ZXing.BarcodeFormat?.CODE_39,
              ZXing.BarcodeFormat?.UPC_A,
              ZXing.BarcodeFormat?.UPC_E,
              ZXing.BarcodeFormat?.DATA_MATRIX,
            ].filter(Boolean)
            if (formats.length) hints.set(ZXing.DecodeHintType?.POSSIBLE_FORMATS, formats)

            const reader = new ZXing.MultiFormatReader()
            reader.setHints(hints)
            const luminanceSource = new ZXing.HTMLCanvasElementLuminanceSource(canvas)
            const binaryBitmap = new ZXing.BinaryBitmap(new ZXing.HybridBinarizer(luminanceSource))
            const result = reader.decode(binaryBitmap)
            if (result && result.getText()) {
              const code = result.getText()
              if (code !== lastScannedCode) {
                setLastScannedCode(code)
                processBarcode(code)
                scanCooldown.current = true
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
      if (e.key === "Enter") {
        if (barcodeBuffer.current.length > 2) processBarcode(barcodeBuffer.current)
        barcodeBuffer.current = ""
        clearTimeout(barcodeTimer.current)
        return
      }
      if (e.key.length === 1) {
        barcodeBuffer.current += e.key
        clearTimeout(barcodeTimer.current)
        barcodeTimer.current = setTimeout(() => { barcodeBuffer.current = "" }, 100)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => { window.removeEventListener("keydown", handleKeyDown); clearTimeout(barcodeTimer.current) }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === "hardware" && inputRef.current) inputRef.current.focus()
  }, [activeTab])

  const processBarcode = useCallback((code) => {
    const trimmed = code.trim()
    if (!trimmed) return

    const found = products.find(
      (p) =>
        p.serialNumber === trimmed ||
        p.grn === trimmed ||
        p.vendorBillNumber === trimmed ||
        p.name?.toLowerCase() === trimmed.toLowerCase()
    )

    if (found) {
      setScanResult({ product: found, status: "found" })
      setScanHistory((prev) => [
        { code: trimmed, product: found, status: "found", time: new Date() },
        ...prev.slice(0, 9),
      ])
      setCartItems((prev) => {
        const existing = prev.findIndex((item) => item.product._id === found._id)
        if (existing !== -1) {
          const updated = [...prev]
          updated[existing] = { ...updated[existing], qty: updated[existing].qty + 1 }
          return updated
        }
        return [...prev, { product: found, qty: 1, purchaseRate: found.purchaseRate || 0, saleRate: found.saleRate || 0 }]
      })
    } else {
      setScanResult({ product: null, status: "notfound", code: trimmed })
      setScanHistory((prev) => [
        { code: trimmed, product: null, status: "notfound", time: new Date() },
        ...prev.slice(0, 9),
      ])
    }

    setManualInput("")
    setTimeout(() => setScanResult(null), 3000)
  }, [products])

  const updateCartItem = (index, field, value) => {
    setCartItems((prev) => { const u = [...prev]; u[index] = { ...u[index], [field]: value }; return u })
  }
  const removeCartItem = (index) => setCartItems((prev) => prev.filter((_, i) => i !== index))

  const handleConfirmCart = () => {
    if (cartItems.length === 0) return
    onProductScanned(cartItems)
    onClose()
  }

  const switchTab = (tab) => {
    if (tab !== "camera") stopCamera()
    setActiveTab(tab)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 overflow-y-auto p-4">
      <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[95vh] overflow-hidden flex flex-col shadow-2xl">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-xl p-2">
              <Barcode className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Barcode Scanner</h2>
              <p className="text-emerald-100 text-sm">Scan products to add to stock</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 bg-gray-50 flex-shrink-0">
          {[
            { id: "camera", label: "Camera Scan", icon: "📷" },
            { id: "hardware", label: "Hardware Scanner", icon: "⚡" },
            { id: "manual", label: "Manual Search", icon: "🔍" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? "border-emerald-500 text-emerald-700 bg-white"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
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
                    <select
                      value={selectedCamera}
                      onChange={(e) => { setSelectedCamera(e.target.value); if (cameraActive) { stopCamera(); setTimeout(startCamera, 300) } }}
                      className="flex-1 p-2 border rounded-lg text-sm focus:ring-2 focus:ring-emerald-400"
                    >
                      {cameras.map((cam, i) => (
                        <option key={cam.deviceId} value={cam.deviceId}>
                          {cam.label || `Camera ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="relative bg-black rounded-2xl overflow-hidden flex-shrink-0" style={{ aspectRatio: "16/9", maxHeight: "320px" }}>
                  <video ref={videoRef} className="w-full h-full object-cover" muted playsInline style={{ display: cameraActive ? "block" : "none" }} />
                  <canvas ref={canvasRef} className="hidden" />
                  {!cameraActive && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                      <div className="text-6xl mb-4">📷</div>
                      <p className="text-lg font-semibold mb-1">Camera Scanner</p>
                      <p className="text-sm text-gray-400 text-center px-8">Point your camera at a product barcode or QR code</p>
                    </div>
                  )}
                  {cameraActive && (
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-36">
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />
                        <div className="absolute left-2 right-2 h-0.5 bg-emerald-400 opacity-80" style={{ animation: "scanLine 2s linear infinite", top: "50%" }} />
                      </div>
                      <div className="absolute bottom-3 left-0 right-0 text-center">
                        <span className="bg-black bg-opacity-50 text-emerald-300 text-xs px-3 py-1 rounded-full">🔍 Scanning for barcode...</span>
                      </div>
                    </div>
                  )}
                </div>

                <style>{`@keyframes scanLine { 0% { top: 10%; } 50% { top: 90%; } 100% { top: 10%; } }`}</style>

                {cameraError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{cameraError}</p>
                  </div>
                )}

                <div className="mt-3 flex gap-2">
                  {!cameraActive ? (
                    <button onClick={startCamera} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                      <Scan className="h-5 w-5" />Start Camera
                    </button>
                  ) : (
                    <button onClick={stopCamera} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
                      <X className="h-5 w-5" />Stop Camera
                    </button>
                  )}
                </div>

                {scanResult && (
                  <div className={`mt-3 p-3 rounded-xl border-2 flex items-center gap-3 ${scanResult.status === "found" ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                    {scanResult.status === "found" ? (
                      <><CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" /><div><p className="font-semibold text-green-800">{scanResult.product.name}</p><p className="text-xs text-green-600">{scanResult.product.category} · Stock: {scanResult.product.quantity} units</p></div></>
                    ) : (
                      <><AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" /><div><p className="font-semibold text-red-800">Product Not Found</p><p className="text-xs text-red-600">Code: {scanResult.code}</p></div></>
                    )}
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
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">USB / Bluetooth Scanner</p>
                    <p className="text-xs text-yellow-700 mt-1">Click in the input box below and scan with your hardware barcode scanner. It will auto-detect the scan.</p>
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 relative">
                    <Scan className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-emerald-500" />
                    <input
                      ref={inputRef}
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && processBarcode(manualInput)}
                      placeholder="Scan barcode here..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-mono"
                      autoComplete="off"
                    />
                  </div>
                  <button onClick={() => processBarcode(manualInput)} className="bg-emerald-600 text-white px-4 rounded-xl hover:bg-emerald-700 transition-colors">
                    <Search className="h-5 w-5" />
                  </button>
                </div>

                {scanResult && (
                  <div className={`mb-4 p-3 rounded-xl border-2 flex items-center gap-3 ${scanResult.status === "found" ? "bg-green-50 border-green-300" : "bg-red-50 border-red-300"}`}>
                    {scanResult.status === "found" ? (
                      <><CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" /><div><p className="font-semibold text-green-800">{scanResult.product.name}</p><p className="text-xs text-green-600">{scanResult.product.category} · {scanResult.product.quantity} units</p></div></>
                    ) : (
                      <><AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" /><div><p className="font-semibold text-red-800">Not Found: {scanResult.code}</p></div></>
                    )}
                  </div>
                )}

                {scanHistory.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Scans</h4>
                    <div className="space-y-1.5">
                      {scanHistory.map((item, i) => (
                        <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs ${item.status === "found" ? "bg-green-50" : "bg-red-50"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.status === "found" ? "bg-green-500" : "bg-red-500"}`} />
                          <span className="font-mono text-gray-500 flex-shrink-0">{item.code}</span>
                          <span className={`flex-1 font-medium ${item.status === "found" ? "text-green-700" : "text-red-600"}`}>{item.status === "found" ? item.product.name : "Not Found"}</span>
                          <span className="text-gray-400">{item.time.toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scanHistory.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                    <Barcode className="h-20 w-20 mb-4" />
                    <p className="text-gray-400">Waiting for scan...</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "manual" && (
              <div className="flex-1 p-6 overflow-y-auto">
                <p className="text-sm text-gray-600 mb-4">Search by product name, serial number, GRN, or vendor bill number.</p>
                <div className="flex gap-2 mb-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                    <input
                      type="text"
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && processBarcode(manualInput)}
                      placeholder="Type product name, S/N, GRN..."
                      className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <button onClick={() => processBarcode(manualInput)} className="bg-emerald-600 text-white px-5 rounded-xl hover:bg-emerald-700 transition-colors font-medium">
                    Add
                  </button>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Quick Add (tap to add)</h4>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {products
                      .filter((p) => !manualInput || p.name.toLowerCase().includes(manualInput.toLowerCase()))
                      .slice(0, 20)
                      .map((p) => (
                        <button
                          key={p._id}
                          onClick={() => processBarcode(p.name)}
                          className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-emerald-50 rounded-xl border border-gray-100 hover:border-emerald-200 transition-colors text-left"
                        >
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500">{p.category}{p.serialNumber ? ` · S/N: ${p.serialNumber}` : ""}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-medium text-gray-600">Stock: {p.quantity}</p>
                            <p className="text-xs text-emerald-600">₨{p.purchaseRate}</p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* RIGHT: Cart */}
          <div className="w-80 flex flex-col bg-gray-50 border-l border-gray-200 flex-shrink-0">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-white">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-gray-600" />
                <h3 className="font-bold text-gray-800 text-sm">Scanned Items</h3>
                {cartItems.length > 0 && (
                  <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{cartItems.length}</span>
                )}
              </div>
              {cartItems.length > 0 && (
                <button onClick={() => setCartItems([])} className="text-xs text-red-500 hover:text-red-700">Clear</button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-3 py-3">
              {cartItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-300 py-8">
                  <ShoppingCart className="h-14 w-14 mb-3" />
                  <p className="text-gray-400 text-sm text-center">Scan a product to add it here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {cartItems.map((item, index) => (
                    <div key={index} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">{item.product.name}</p>
                          <p className="text-xs text-gray-500">{item.product.category}</p>
                        </div>
                        <button onClick={() => removeCartItem(index)} className="text-gray-400 hover:text-red-500 ml-1 transition-colors flex-shrink-0">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Qty</label>
                          <input type="number" min="1" value={item.qty} onChange={(e) => updateCartItem(index, "qty", Math.max(1, Number(e.target.value)))} className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-sm text-center font-bold focus:ring-1 focus:ring-emerald-400" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Buy ₨</label>
                          <input type="number" min="0" step="0.01" value={item.purchaseRate} onChange={(e) => updateCartItem(index, "purchaseRate", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-xs focus:ring-1 focus:ring-emerald-400" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-0.5">Sale ₨</label>
                          <input type="number" min="0" step="0.01" value={item.saleRate} onChange={(e) => updateCartItem(index, "saleRate", Number(e.target.value))} className="w-full border border-gray-200 rounded-lg px-1.5 py-1 text-xs focus:ring-1 focus:ring-emerald-400" />
                        </div>
                      </div>
                      <div className="mt-1.5 pt-1.5 border-t border-gray-100 flex justify-between text-xs">
                        <span className="text-gray-500">Amount:</span>
                        <span className="font-semibold text-blue-600">{formatCurrency(item.qty * item.purchaseRate)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="px-3 py-3 border-t border-gray-200 bg-white">
                <div className="flex justify-between text-xs mb-0.5">
                  <span className="text-gray-600">Total Units:</span>
                  <span className="font-bold">{cartItems.reduce((s, i) => s + i.qty, 0)}</span>
                </div>
                <div className="flex justify-between text-xs mb-3">
                  <span className="text-gray-600">Total Amount:</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(cartItems.reduce((s, i) => s + i.qty * i.purchaseRate, 0))}</span>
                </div>
                <button onClick={handleConfirmCart} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  Confirm ({cartItems.length} items)
                </button>
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
    const day = String(d.getDate()).padStart(2, "0")
    const month = String(d.getMonth() + 1).padStart(2, "0")
    const year = d.getFullYear()
    return `${day}-${month}-${year}`
  }

  const formatDateToYYYYMMDD = (date) => {
    if (!date) return ""
    const d = new Date(date)
    return d.toISOString().split("T")[0]
  }

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
  const [returnFormData, setReturnFormData] = useState({
    productId: "",
    returnQuantity: "",
    returnDate: new Date().toISOString().split("T")[0],
    reason: "",
  })
  const [selectedProductForReturn, setSelectedProductForReturn] = useState(null)

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    name: "",
    category: "",
    quantity: "",
    purchaseRate: "",
    factoryOverhead: "",
    saleRate: "",
    customerName: "",
    vendorPhone: "",
    notes: "",
    serialNumber: "",
    expiryDate: "",
    lastPurchase: "",
    vendorName: "",
    vendorBillNumber: "",
    grn: "",
    purchasesType: "",
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

  // ─── Pending edit entry — stored when handleEdit fires before categories load ───
  const [pendingEditEntry, setPendingEditEntry] = useState(null)

  const loadVendors = async () => {
    try {
      setLoadingVendors(true)
      const response = await ApiHandler.getLiabilities()
      const liabilities = response.data || []
      const vendorList = liabilities.filter((liability) => liability.type === "PAYABLES")
      setVendors(vendorList)
      return vendorList
    } catch (err) {
      console.error("Error loading vendors:", err)
      setVendors([])
      return []
    } finally {
      setLoadingVendors(false)
    }
  }

  const loadPurchasesAccounts = async () => {
    try {
      setLoadingPurchases(true)
      const response = await ApiHandler.getChartExpenses()
      const assets = response.data || []
      const purchasesList = assets.filter((asset) => asset.type === "Purchases")
      setPurchasesAccounts(purchasesList)
      return purchasesList
    } catch (err) {
      console.error("Error loading purchases accounts:", err)
      setPurchasesAccounts([])
      return []
    } finally {
      setLoadingPurchases(false)
    }
  }

  const fetchStockEntries = async (vendorsList, purchasesList) => {
    try {
      setLoading(true)
      setError(null)

      const productsResponse = await ApiHandler.getProducts()
      let productsData = []

      if (productsResponse && Array.isArray(productsResponse)) {
        productsData = productsResponse
      } else if (productsResponse && productsResponse.data) {
        productsData = Array.isArray(productsResponse.data) ? productsResponse.data : []
      }

      // Use passed-in lists (fresh data) or fall back to state
      const activeVendors = vendorsList || vendors
      const activePurchases = purchasesList || purchasesAccounts

      const entries = productsData.map((product) => {
        const vendorObj =
          typeof product.vendorName === "object"
            ? product.vendorName
            : activeVendors.find((v) => v._id === product.vendorName)
        const vendorNameStr = vendorObj?.name || (typeof product.vendorName === "string" ? product.vendorName : "")

        const purchaseTypeObj =
          typeof product.purchaseType === "object"
            ? product.purchaseType
            : activePurchases.find((p) => p._id === product.purchaseType)
        const purchaseTypeStr = purchaseTypeObj?.name || ""
        // Store raw _id as fallback for when name resolution fails (race condition)
        const purchaseTypeRawId =
          typeof product.purchaseType === "object"
            ? product.purchaseType?._id || ""
            : product.purchaseType || ""

        const purchaseQuantity = product.purchaseQuantity || product.quantity || 0
        // Purchase Amount = (Qty × Purchase Rate) + Factory O/H
        const purchaseAmount = (purchaseQuantity * (product.purchaseRate || 0)) + (product.factoryOverhead || 0)
        const balanceQuantity = product.quantity || 0
        // Balance Amount = (Balance Qty × Purchase Rate) + Factory O/H
        const balanceAmount = (balanceQuantity * (product.purchaseRate || 0)) + (product.factoryOverhead || 0)
        const totalSoldQuantity = product.totalSoldQuantity || 0

        return {
          id: product._id,
          date: product.createdAt ? formatDateToDDMMYYYY(product.createdAt) : formatDateToDDMMYYYY(new Date()),
          itemName: product.name,
          category: product.category,
          purchaseQuantity,
          purchaseAmount,
          balanceQuantity,
          balanceAmount,
          totalSoldQuantity,
          purchaseRate: product.purchaseRate,
          factoryOverhead: product.factoryOverhead || 0,
          factoryOverheadBreakdown: product.factoryOverheadBreakdown || [],
          saleRate: product.saleRate,
          purchaseStockValue: purchaseAmount,  // (Qty × Rate) + O/H
          saleStockValue: balanceQuantity * product.saleRate,
          balanceStockValue: balanceAmount,
          // Profit = (Balance Qty × Sale Rate) - Purchase Amount
          // Purchase Amount already = (Qty × Purchase Rate) + Factory O/H
          profit: (product.saleRate * balanceQuantity) - balanceAmount,
          potentialProfit: (product.saleRate * balanceQuantity) - balanceAmount,
          totalAmount: balanceQuantity * product.saleRate,
          customerName: "",
          vendorPhone: product.vendorPhone || "",
          notes: product.notes || "",
          serialNumber: product.serialNumber || "",
          vendorName: vendorNameStr,
          vendorBillNumber: product.vendorBillNumber || "",
          grn: product.grn || "",
          expiryDate: product.expiryDate || "",
          voucherId: product.voucherId || "",
          purchaseType: purchaseTypeStr,
          purchaseTypeId: purchaseTypeRawId,
        }
      })

      setStockEntries(entries)
      setProducts(productsData)

      if (onStockUpdate) {
        onStockUpdate(entries)
      }
    } catch (err) {
      setError(err.message)
      console.error("Error fetching stock entries:", err)
      setStockEntries([])
    } finally {
      setLoading(false)
    }
  }

  const createNotification = async (type, title, message, priority = "medium", relatedId = null) => {
    try {
      const notificationData = {
        type,
        title,
        message,
        priority,
        relatedId,
        relatedModel: relatedId ? "Product" : null,
      }
      await ApiHandler.createNotification(notificationData)
      if (onNotificationCreate) {
        onNotificationCreate({
          ...notificationData,
          _id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          isRead: false,
        })
      }
    } catch (err) {
      console.error("Error creating notification:", err)
    }
  }

  const emitVoucherChangedEvent = () => {
    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("voucher:changed", { detail: { action: "refresh", at: Date.now() } }))
      } catch (_) {}
    }
  }

  useEffect(() => {
    // Load vendors & purchases first, then pass fresh data directly to fetchStockEntries
    Promise.all([loadVendors(), loadPurchasesAccounts()]).then(([vList, pList]) => {
      fetchStockEntries(vList, pList)
    })
    fetchReturnHistory()
  }, [])

  const fetchReturnHistory = async () => {
    try {
      setLoadingReturns(true)
      const response = await ApiHandler.getPurchaseReturns()
      let returns = []
      if (response && Array.isArray(response)) returns = response
      else if (response && response.data && Array.isArray(response.data)) returns = response.data
      else if (response && response.returns && Array.isArray(response.returns)) returns = response.returns
      setReturnHistory(returns)
    } catch (err) {
      console.error("[PRN] Error fetching return history:", err)
      setReturnHistory([])
    } finally {
      setLoadingReturns(false)
    }
  }

  const handleScannerConfirm = async (cartItems) => {
    setScannerProcessing(true)
    const errors = []
    const successes = []

    for (const item of cartItems) {
      try {
        await ApiHandler.updateStock(item.product._id, { quantity: item.qty, operation: "add" })

        if (item.purchaseRate !== item.product.purchaseRate || item.saleRate !== item.product.saleRate) {
          await ApiHandler.updateProduct(item.product._id, { purchaseRate: item.purchaseRate, saleRate: item.saleRate })
        }

        successes.push(item.product.name)
        await createNotification(
          "success",
          "Stock Updated via Scanner",
          `${item.qty} units of ${item.product.name} added (Purchase: ₨${item.purchaseRate}, Sale: ₨${item.saleRate})`,
          "medium",
          item.product._id
        )
      } catch (err) {
        console.error(`Error updating ${item.product.name}:`, err)
        errors.push(`${item.product.name}: ${err.message}`)
      }
    }

    setScannerProcessing(false)
    await fetchStockEntries()

    if (errors.length > 0) {
      alert(`Completed with errors:\n✓ ${successes.join(", ")}\n✗ ${errors.join("\n")}`)
    } else {
      alert(`✓ Stock updated successfully for:\n${successes.map((n) => `• ${n}`).join("\n")}`)
    }
  }

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      name: "",
      category: "",
      quantity: "",
      purchaseRate: "",
      factoryOverhead: "",
      saleRate: "",
      customerName: "",
      vendorPhone: "",
      notes: "",
      serialNumber: "",
      expiryDate: "",
      lastPurchase: "",
      vendorName: "",
      vendorBillNumber: "",
      grn: "",
      purchasesType: "",
    })
    setIsEditing(false)
    setEditingId(null)
    setEditingVoucherId(null)
    setShowForm(false)
    setError(null)
    setPendingEditEntry(null)
    resetOverheadItems()
  }

  const resetReturnForm = () => {
    setReturnFormData({
      productId: "",
      returnQuantity: "",
      returnDate: new Date().toISOString().split("T")[0],
      reason: "",
    })
    setSelectedProductForReturn(null)
    setShowReturnForm(false)
    setError(null)
  }

  const handleOpenReturnForm = (entry) => {
    setSelectedProductForReturn(entry)
    setReturnFormData({
      productId: entry.id,
      returnQuantity: "",
      returnDate: new Date().toISOString().split("T")[0],
      reason: "",
    })
    setShowReturnForm(true)
    setError(null)
  }

  const handleReturnChange = (e) => {
    const { name, value } = e.target
    setReturnFormData({ ...returnFormData, [name]: value })
  }

  const handleReturnSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const returnQty = Number(returnFormData.returnQuantity)
      if (!returnQty || returnQty <= 0) { setError("Return quantity must be greater than 0"); return }
      if (returnQty > selectedProductForReturn.balanceQuantity) {
        setError(`Cannot return more than available quantity (${selectedProductForReturn.balanceQuantity} units)`)
        return
      }
      const returnData = {
        productId: returnFormData.productId,
        returnQuantity: returnQty,
        returnDate: returnFormData.returnDate,
        reason: returnFormData.reason,
        productName: selectedProductForReturn.itemName,
        vendorName: selectedProductForReturn.vendorName,
        grnDate: selectedProductForReturn.date,
        returnAmount: returnQty * selectedProductForReturn.purchaseRate,
        purchaseRate: selectedProductForReturn.purchaseRate,
        category: selectedProductForReturn.category,
        grn: selectedProductForReturn.grn,
      }
      const response = await ApiHandler.returnProduct(returnData)
      if (response && response.success) {
        await createNotification("warning", "Purchase Return Processed",
          `${returnQty} units of ${selectedProductForReturn.itemName} returned successfully`, "high", returnFormData.productId)
        resetReturnForm()
        await fetchStockEntries()
        await fetchReturnHistory()
        alert(`Return Processed Successfully!\n\nProduct: ${selectedProductForReturn.itemName}\nQuantity: ${returnQty} units\nAmount: ${formatCurrency(returnQty * selectedProductForReturn.purchaseRate)}`)
      }
    } catch (err) {
      console.error("Error processing return:", err)
      setError(err.message || "Failed to process purchase return")
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    if (name === "name") {
      const product = products.find((p) => p.name.toLowerCase() === value.toLowerCase())
      if (product) {
        setFormData((prev) => ({
          ...prev,
          category: product.category || "",
          purchaseRate: product.purchaseRate || "",
          factoryOverhead: product.factoryOverhead || "",
          saleRate: product.saleRate || "",
          serialNumber: product.serialNumber || "",
          vendorName: product.vendorName || "",
        }))
      }
    }
  }

  // ── Factory Overhead Categories — fetched from backend ───────────────────
  const [OVERHEAD_CATEGORIES, setOVERHEAD_CATEGORIES] = useState([])
  const [loadingOverheadCats, setLoadingOverheadCats] = useState(true)

  useEffect(() => {
    const fetchOverheadCategories = async () => {
      try {
        setLoadingOverheadCats(true)
        const res = await ApiHandler.getOverheadCategories()
        const cats = (res?.data || res || []).map((cat) => ({
          id: cat.id,
          label: cat.label,
          icon: cat.icon || "➕",
          color: cat.color || "gray",
        }))
        setOVERHEAD_CATEGORIES(cats)
        setOverheadItems(Object.fromEntries(cats.map((c) => [c.id, { checked: false, amount: "" }])))
      } catch (err) {
        console.error("Error loading overhead categories:", err)
        const fallback = [
          { id: "labour",    label: "Labour Cost",        icon: "👷", color: "blue"   },
          { id: "transport", label: "Transport",           icon: "🚛", color: "green"  },
          { id: "packaging", label: "Packaging",           icon: "📦", color: "purple" },
          { id: "customs",   label: "Customs / Duty",      icon: "🏛️", color: "red"    },
          { id: "insurance", label: "Insurance",           icon: "🛡️", color: "yellow" },
          { id: "loading",   label: "Loading / Unloading", icon: "⚓", color: "orange" },
          { id: "other",     label: "Other",               icon: "➕", color: "gray"   },
        ]
        setOVERHEAD_CATEGORIES(fallback)
        setOverheadItems(Object.fromEntries(fallback.map((c) => [c.id, { checked: false, amount: "" }])))
      } finally {
        setLoadingOverheadCats(false)
      }
    }
    fetchOverheadCategories()
  }, [])

  const COLOR_MAP = {
    blue:   { border: "border-blue-200",   bg: "bg-blue-50",   check: "accent-blue-600",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700"   },
    green:  { border: "border-green-200",  bg: "bg-green-50",  check: "accent-green-600",  text: "text-green-700",  badge: "bg-green-100 text-green-700"  },
    purple: { border: "border-purple-200", bg: "bg-purple-50", check: "accent-purple-600", text: "text-purple-700", badge: "bg-purple-100 text-purple-700" },
    red:    { border: "border-red-200",    bg: "bg-red-50",    check: "accent-red-600",    text: "text-red-700",    badge: "bg-red-100 text-red-700"      },
    yellow: { border: "border-yellow-200", bg: "bg-yellow-50", check: "accent-yellow-600", text: "text-yellow-700", badge: "bg-yellow-100 text-yellow-700" },
    orange: { border: "border-orange-200", bg: "bg-orange-50", check: "accent-orange-600", text: "text-orange-700", badge: "bg-orange-100 text-orange-700" },
    gray:   { border: "border-gray-200",   bg: "bg-gray-50",   check: "accent-gray-600",   text: "text-gray-700",   badge: "bg-gray-100 text-gray-700"    },
  }

  const [overheadItems, setOverheadItems] = useState({})

  const toggleOverhead = (id) => {
    setOverheadItems((prev) => {
      const next = { ...prev, [id]: { ...prev[id], checked: !prev[id].checked } }
      if (!next[id].checked) next[id] = { checked: false, amount: "" }
      const total = OVERHEAD_CATEGORIES.reduce((s, c) => s + (next[c.id]?.checked ? Number(next[c.id].amount) || 0 : 0), 0)
      setFormData((f) => ({ ...f, factoryOverhead: total.toString() }))
      return next
    })
  }

  const setOverheadAmount = (id, val) => {
    setOverheadItems((prev) => {
      const next = { ...prev, [id]: { ...prev[id], amount: val } }
      const total = OVERHEAD_CATEGORIES.reduce((s, c) => s + (next[c.id]?.checked ? Number(next[c.id].amount) || 0 : 0), 0)
      setFormData((f) => ({ ...f, factoryOverhead: total.toString() }))
      return next
    })
  }

  const resetOverheadItems = () => {
    setOverheadItems(Object.fromEntries(OVERHEAD_CATEGORIES.map((c) => [c.id, { checked: false, amount: "" }])))
  }

  const getOverheadTotal = () =>
    OVERHEAD_CATEGORIES.reduce((s, c) => s + (overheadItems[c.id]?.checked ? Number(overheadItems[c.id].amount) || 0 : 0), 0)

  const getTotalCostPerUnit = () => {
    const pr = Number(formData.purchaseRate) || 0
    const fo = getOverheadTotal()
    return pr + fo
  }

  const getTotalPurchaseAmount = () => {
    const qty = Number(formData.quantity) || 0
    return qty * getTotalCostPerUnit()
  }

  // ── Core edit-apply logic ────────────────────────────────────────────────────
  // Pass `cats` explicitly so it always uses the freshly loaded categories list
  const _applyEditToForm = (entry, cats) => {
    const activeCats = (cats && cats.length > 0) ? cats : OVERHEAD_CATEGORIES
    const dateForForm = entry.date ? formatDateToYYYYMMDD(new Date(entry.date.split("-").reverse().join("-"))) : ""
    const vendorObj = vendors.find((v) => v.name === entry.vendorName)
    const vendorNameForForm = vendorObj?.name || entry.vendorName || ""

    const savedBreakdown = entry.factoryOverheadBreakdown || []

    let restoredItems
    if (savedBreakdown.length > 0) {
      // New data: breakdown array exists — restore each checked item
      restoredItems = Object.fromEntries(
        activeCats.map((cat) => {
          const saved = savedBreakdown.find((b) => b.id === cat.id)
          return [
            cat.id,
            saved && Number(saved.amount) > 0
              ? { checked: true, amount: saved.amount.toString() }
              : { checked: false, amount: "" },
          ]
        })
      )
    } else if (Number(entry.factoryOverhead) > 0) {
      // Legacy data: only total saved, no breakdown — put full total in "other"
      restoredItems = Object.fromEntries(
        activeCats.map((cat) => [
          cat.id,
          cat.id === "other"
            ? { checked: true, amount: entry.factoryOverhead.toString() }
            : { checked: false, amount: "" },
        ])
      )
    } else {
      // No overhead at all
      restoredItems = Object.fromEntries(
        activeCats.map((cat) => [cat.id, { checked: false, amount: "" }])
      )
    }

    const totalOverhead = Object.values(restoredItems).reduce(
      (s, item) => s + (item.checked ? Number(item.amount) || 0 : 0), 0
    )

    // ─── Set overhead items FIRST, then formData ───────────────────────────
    setOverheadItems(restoredItems)

    setFormData({
      date: dateForForm,
      name: entry.itemName,
      category: entry.category,
      quantity: entry.balanceQuantity.toString(),
      purchaseRate: entry.purchaseRate.toString(),
      factoryOverhead: totalOverhead.toString(),
      saleRate: entry.saleRate.toString(),
      customerName: entry.customerName || "",
      vendorPhone: entry.vendorPhone || "",
      notes: entry.notes || "",
      serialNumber: entry.serialNumber || "",
      expiryDate: entry.expiryDate || "",
      lastPurchase: entry.lastPurchase || "",
      vendorName: vendorNameForForm,
      vendorBillNumber: entry.vendorBillNumber || "",
      grn: entry.grn || "",
      purchasesType: (() => {
        // If name already resolved, use it; otherwise look up by _id
        if (entry.purchaseType) return entry.purchaseType
        if (entry.purchaseTypeId) {
          const found = purchasesAccounts.find((p) => p._id === entry.purchaseTypeId)
          return found?.name || ""
        }
        return ""
      })(),
    })

    setIsEditing(true)
    setEditingId(entry.id)
    setEditingVoucherId(entry.voucherId)
    setShowForm(true)
  }

  // ── KEY FIX: Deferred apply — runs when categories finish loading ─────────
  useEffect(() => {
    if (loadingOverheadCats) return
    if (!pendingEditEntry) return
    if (OVERHEAD_CATEGORIES.length === 0) return

    _applyEditToForm(pendingEditEntry, OVERHEAD_CATEGORIES)
    setPendingEditEntry(null)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingOverheadCats, OVERHEAD_CATEGORIES.length, pendingEditEntry])

  const handleEdit = (entry) => {
    if (loadingOverheadCats || OVERHEAD_CATEGORIES.length === 0) {
      // Categories not ready yet — queue the entry, show form with spinner
      setPendingEditEntry(entry)
      setIsEditing(true)
      setEditingId(entry.id)
      setEditingVoucherId(entry.voucherId)
      setShowForm(true)
    } else {
      // Categories already loaded — apply all values immediately
      _applyEditToForm(entry, OVERHEAD_CATEGORIES)
    }
  }

  const handleViewDetails = (entry) => {
    setSelectedEntry(entry)
    setShowDetails(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this stock entry? This will also delete the associated GRN voucher.")) {
      try {
        const entry = stockEntries.find((e) => e.id === id)
        if (entry?.voucherId) {
          try { await ApiHandler.deleteVoucher(entry.voucherId); emitVoucherChangedEvent() }
          catch (voucherErr) { console.error("Error deleting voucher:", voucherErr) }
        }
        await ApiHandler.deleteProduct(id)
        await createNotification("warning", "Stock Entry Deleted", `Stock entry for ${entry?.itemName || "item"} and its GRN voucher have been deleted`, "medium")
        await fetchStockEntries()
      } catch (err) {
        setError(err.message)
        console.error("Error deleting stock entry:", err)
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const qty = Number(formData.quantity) || 0
      const purchaseRate = Number(formData.purchaseRate) || 0
      const factoryOverhead = getOverheadTotal()
      const saleRate = Number(formData.saleRate) || 0

      if (!formData.name || !formData.name.trim()) { setError("Product name is required"); return }
      if (!formData.category) { setError("Category is required"); return }
      if (!purchaseRate || purchaseRate < 0) { setError("Purchase rate is required and must be non-negative"); return }
      if (!saleRate || saleRate < 0) { setError("Sale rate is required and must be non-negative"); return }
      if (qty === undefined || qty < 0) { setError("Quantity is required and must be non-negative"); return }
      if (!formData.vendorName || !formData.vendorName.trim()) { setError("Vendor name is required"); return }
      if (!formData.purchasesType || !formData.purchasesType.trim()) { setError("Purchases Type is required"); return }

      const selectedVendor = vendors.find((v) => v.name === formData.vendorName)
      const selectedPurchaseAccount = purchasesAccounts.find((p) => p.name === formData.purchasesType)

      if (!selectedVendor) { setError("Selected vendor not found"); return }
      if (!selectedPurchaseAccount) { setError("Selected purchase type not found"); return }

      const totalCostPerUnit = purchaseRate + factoryOverhead
      const totalPurchaseAmount = qty * totalCostPerUnit

      const productData = {
        name: formData.name.trim(),
        category: formData.category,
        purchaseRate,
        factoryOverhead,
        factoryOverheadBreakdown: OVERHEAD_CATEGORIES
          .filter((cat) => overheadItems[cat.id]?.checked && Number(overheadItems[cat.id]?.amount) > 0)
          .map((cat) => ({
            id: cat.id,
            label: cat.label,
            icon: cat.icon,
            amount: Number(overheadItems[cat.id].amount) || 0,
          })),
        saleRate,
        quantity: qty,
        serialNumber: formData.serialNumber,
        vendorName: selectedVendor._id,
        vendorPhone: formData.vendorPhone,
        vendorBillNumber: formData.vendorBillNumber,
        notes: formData.notes,
        expiryDate: formData.expiryDate,
        purchaseType: selectedPurchaseAccount._id,
      }

      if (isEditing) {
        await ApiHandler.updateProduct(editingId, productData)
        if (editingVoucherId) {
          const updatedVoucherData = {
            voucherDate: formData.date,
            narration: `Goods Receipt Note - ${formData.name}`,
            entries: [
              { pairId: "PAIR001", entryType: "DEBIT", account: `${selectedPurchaseAccount.code} - ${selectedPurchaseAccount.name}`, description: `Purchase of ${formData.name}`, debitAmount: totalPurchaseAmount, creditAmount: 0, serialNo: 1 },
              { pairId: "PAIR001", entryType: "CREDIT", account: `${selectedVendor.code} - ${selectedVendor.name}`, description: `Stock received - ${formData.name}`, debitAmount: 0, creditAmount: totalPurchaseAmount, serialNo: 2 },
            ],
          }
          await ApiHandler.updateVoucher(editingVoucherId, updatedVoucherData)
          emitVoucherChangedEvent()
        }
        await createNotification("info", "Stock Entry Updated", `Stock entry for ${formData.name} has been updated`, "medium", editingId)
      } else {
        const response = await ApiHandler.createProduct(productData)
        if (!response || !response._id) throw new Error("Failed to create product - no ID returned")
        try {
          const voucherData = {
            voucherNo: `GRN-${Date.now()}`,
            voucherType: "GRN",
            voucherDate: formData.date,
            narration: `Goods Receipt Note - ${formData.name}`,
            entries: [
              { pairId: "PAIR001", entryType: "DEBIT", account: `${selectedPurchaseAccount.code} - ${selectedPurchaseAccount.name}`, description: `Purchase of ${formData.name} (Qty: ${qty} @ ${purchaseRate} + OH: ${factoryOverhead})`, debitAmount: totalPurchaseAmount, creditAmount: 0, serialNo: 1 },
              { pairId: "PAIR001", entryType: "CREDIT", account: `${selectedVendor.code} - ${selectedVendor.name}`, description: `Stock received - ${formData.name} (Qty: ${qty} @ ${totalCostPerUnit})`, debitAmount: 0, creditAmount: totalPurchaseAmount, serialNo: 2 },
            ],
          }
          const voucherResponse = await ApiHandler.createVoucher(voucherData)
          if (!voucherResponse || !voucherResponse.data || !voucherResponse.data._id) throw new Error("Failed to create voucher - no ID returned")
          await ApiHandler.updateProduct(response._id, { ...productData, voucherId: voucherResponse.data._id })
          emitVoucherChangedEvent()
          await createNotification("success", "Stock Entry & Voucher Created", `Purchase of ${formData.name} for ${formatCurrency(totalPurchaseAmount)} has been recorded in ledger`, "high", response._id)
        } catch (voucherErr) {
          console.error("[GRN] Error creating voucher entry:", voucherErr)
          await createNotification("warning", "Stock Entry Created (Voucher Failed)", `Stock entry added but voucher creation failed: ${voucherErr.message}`, "high", response._id)
        }
      }
      resetForm()
      await fetchStockEntries()
    } catch (err) {
      console.error("[GRN] Detailed error:", err)
      if (err.message.includes("All fields are required")) {
        setError("Please fill in all required fields: Name, Category, Purchase Rate, Sale Rate, Quantity, Vendor, and Purchases Type")
      } else if (err.message.includes("already exists")) {
        setError("A product with this name already exists. Please choose a different name.")
      } else {
        setError(err.message || "An error occurred while saving the purchase")
      }
    }
  }

  const handlePrint = () => {
    const printWindow = window.open("", "", "height=800,width=1200")
    printWindow.document.write("<html><head><title>Stock Report - Goods Receipt Note</title>")
    printWindow.document.write(`<style>body{font-family:Arial,sans-serif;padding:20px}h1{text-align:center;color:#1e40af;margin-bottom:5px}h2{text-align:center;color:#64748b;margin-top:0;font-size:16px;font-weight:normal}.meta{text-align:center;margin-bottom:20px;color:#64748b;font-size:14px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:8px;text-align:left;font-size:12px}th{background-color:#f3f4f6;font-weight:bold}.text-right{text-align:right}.totals{background-color:#f9fafb;font-weight:bold}.footer{margin-top:30px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #ddd;padding-top:10px}.profit-positive{color:#059669}.profit-negative{color:#dc2626}</style>`)
    printWindow.document.write("</head><body>")
    printWindow.document.write("<h1>Goods Receipt Note</h1><h2>Stock Management Report</h2>")
    printWindow.document.write(`<div class="meta">Generated on: ${formatDateToDDMMYYYY(new Date())}</div>`)
    printWindow.document.write("<table><thead><tr><th>Date</th><th>GRN No.</th><th>Product Name</th><th>Category</th><th>Vendor</th><th class='text-right'>Purchase Qty</th><th class='text-right'>Purchase Amount</th><th class='text-right'>Factory O/H</th><th class='text-right'>Balance Qty</th><th class='text-right'>Balance Amount</th><th class='text-right'>Sale Rate</th><th class='text-right'>Potential Profit<br/><small style='font-weight:normal;color:#6b7280'>(Sale Amt - Purchase Amt - O/H)</small></th></tr></thead><tbody>")
    filteredEntries.forEach((entry) => {
      printWindow.document.write(`<tr><td>${entry.date}</td><td>${entry.grn || "-"}</td><td>${entry.itemName}</td><td>${entry.category}</td><td>${entry.vendorName || "-"}</td><td class="text-right">${entry.purchaseQuantity}</td><td class="text-right">${formatCurrency(entry.purchaseAmount)}</td><td class="text-right">${formatCurrency(entry.factoryOverhead || 0)}</td><td class="text-right">${entry.balanceQuantity}</td><td class="text-right">${formatCurrency(entry.balanceAmount)}</td><td class="text-right">${formatCurrency(entry.saleRate)}</td><td class="text-right ${entry.profit >= 0 ? "profit-positive" : "profit-negative"}">${formatCurrency(entry.profit)}</td></tr>`)
    })
    printWindow.document.write(`<tr class="totals"><td colspan="6" class="text-right">Totals:</td><td class="text-right">${formatCurrency(subtotals.purchaseAmount)}</td><td class="text-right">${formatCurrency(subtotals.totalFactoryOverhead)}</td><td class="text-right">${subtotals.balanceQuantity}</td><td class="text-right">${formatCurrency(subtotals.balanceAmount)}</td><td class="text-right"></td><td class="text-right ${subtotals.totalProfit >= 0 ? "profit-positive" : "profit-negative"}">${formatCurrency(subtotals.totalProfit)}</td></tr>`)
    printWindow.document.write("</tbody></table><div class='footer'>Created by Soft-Technix</div></body></html>")
    printWindow.document.close()
    printWindow.print()
  }

  const handleExport = () => {
    const csvContent = [
      ["Date", "GRN No.", "Item Name", "Category", "Vendor", "Purchase Qty", "Purchase Rate", "Factory Overhead", "Purchase Amount", "Balance Qty", "Balance Amount", "Sale Rate", "Sold Qty", "Profit"],
      ...filteredEntries.map((entry) => [entry.date, entry.grn || "-", entry.itemName, entry.category, entry.vendorName || "-", entry.purchaseQuantity, entry.purchaseRate, entry.factoryOverhead || 0, entry.purchaseAmount, entry.balanceQuantity, entry.balanceAmount, entry.saleRate, entry.totalSoldQuantity, entry.profit]),
    ].map((row) => row.join(",")).join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `stock-ledger-grn-${formatDateToDDMMYYYY(new Date())}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const filteredEntries = stockEntries.filter((entry) => {
    const matchesSearch = entry.itemName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = categoryFilter === "" || entry.category === categoryFilter
    let matchesDate = true
    if (dateFilter) {
      const filterDate = formatDateToDDMMYYYY(new Date(dateFilter))
      matchesDate = entry.date === filterDate
    }
    return matchesSearch && matchesCategory && matchesDate
  })

  const totalPages = Math.ceil(filteredEntries.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedEntries = filteredEntries.slice(startIndex, startIndex + itemsPerPage)

  const subtotals = filteredEntries.reduce(
    (acc, entry) => ({
      purchaseQuantity: acc.purchaseQuantity + entry.purchaseQuantity,
      purchaseAmount: acc.purchaseAmount + entry.purchaseAmount,
      balanceQuantity: acc.balanceQuantity + entry.balanceQuantity,
      balanceAmount: acc.balanceAmount + entry.balanceAmount,
      totalSoldQuantity: acc.totalSoldQuantity + entry.totalSoldQuantity,
      totalProfit: acc.totalProfit + (entry.profit || 0),
      totalFactoryOverhead: acc.totalFactoryOverhead + (entry.factoryOverhead || 0),
    }),
    { purchaseQuantity: 0, purchaseAmount: 0, balanceQuantity: 0, balanceAmount: 0, totalSoldQuantity: 0, totalProfit: 0, totalFactoryOverhead: 0 }
  )

  const formatCurrency = (value) =>
    new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 2 }).format(value)

  if (loading) {
    return (
      <div className="p-6 bg-white rounded-lg shadow">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Stock Management...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow">
      {showScanner && (
        <BarcodeScannerModal
          onClose={() => setShowScanner(false)}
          products={products}
          onProductScanned={handleScannerConfirm}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Goods Receipt Note (GRN)
          </h2>
          <p className="text-sm text-gray-600">Manage product inventory and stock levels</p>
        </div>
        <div className="flex gap-2 flex-wrap mt-4 md:mt-0">
          <button
            className="bg-emerald-600 text-white px-4 py-2 rounded-md hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
            onClick={() => setShowScanner(true)}
            disabled={scannerProcessing}
          >
            <Scan className="h-4 w-4" />
            {scannerProcessing ? "Processing..." : "Scan Products"}
          </button>
          <button className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2" onClick={() => setShowReturnHistory(true)}>
            <RotateCcw className="h-4 w-4" />Purchases Return ({returnHistory.length})
          </button>
          <button className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2" onClick={handlePrint} disabled={filteredEntries.length === 0}>
            <Printer className="h-4 w-4" />Print
          </button>
          <button className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors flex items-center gap-2" onClick={handleExport} disabled={filteredEntries.length === 0}>
            <Download className="h-4 w-4" />Export
          </button>
          <button onClick={fetchStockEntries} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2" disabled={loading}>
            <RefreshCw className="h-4 w-4" />Refresh
          </button>
          <button className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />Record New Purchase
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-blue-600">Total Purchase Amount</p><p className="text-xl font-bold text-blue-900">{formatCurrency(subtotals.purchaseAmount)}</p></div>
            <TrendingUp className="h-8 w-8 text-blue-600" />
          </div>
        </div>
        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-green-600">Total Balance Amount</p><p className="text-xl font-bold text-green-900">{formatCurrency(subtotals.balanceAmount)}</p></div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <div className="bg-purple-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-purple-600">Total Balance Quantity</p><p className="text-xl font-bold text-purple-900">{subtotals.balanceQuantity} units</p></div>
            <Package className="h-8 w-8 text-purple-600" />
          </div>
        </div>
        <div className="bg-orange-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div><p className="text-sm font-medium text-orange-600">Total Products</p><p className="text-xl font-bold text-orange-900">{filteredEntries.length}</p></div>
            <Filter className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700"><X className="h-4 w-4" /></button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input type="text" placeholder="Search products..." className="w-full pl-10 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <select className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
          <option value="">All Categories</option>
          {productCategories.map((category) => (<option key={category} value={category}>{category}</option>))}
        </select>
        <input type="date" className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} />
        <select className="p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" value={itemsPerPage} onChange={(e) => { setItemsPerPage(Number(e.target.value)); setCurrentPage(1) }}>
          <option value={10}>10 per page</option>
          <option value={25}>25 per page</option>
          <option value={50}>50 per page</option>
          <option value={100}>100 per page</option>
        </select>
        <div className="flex items-center text-sm text-gray-600">
          <Filter className="h-4 w-4 mr-1" />
          {filteredEntries.length} of {stockEntries.length}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GRN No.</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Rate</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-amber-600 uppercase tracking-wider bg-amber-50">Factory O/H</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Purchase Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Qty</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Balance Amount</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Sale Rate</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                <div>Potential Profit</div>
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedEntries.length > 0 ? (
              paginatedEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.grn || "-"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.itemName}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.category}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{entry.vendorName || "-"}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{entry.purchaseQuantity}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(entry.purchaseRate)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right bg-amber-50">
                    {entry.factoryOverhead > 0 ? (
                      <span className="text-amber-700 font-semibold">{formatCurrency(entry.factoryOverhead)}</span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-blue-600 text-right font-bold">{formatCurrency(entry.purchaseAmount)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-medium">{entry.balanceQuantity}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-green-600 text-right font-bold">{formatCurrency(entry.balanceAmount)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(entry.saleRate)}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-right font-medium">
                    <span className={entry.profit >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(entry.profit)}</span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-center text-sm font-medium">
                    <div className="flex justify-center space-x-2">
                      <button onClick={() => handleOpenReturnForm(entry)} className="text-orange-600 hover:text-orange-900 transition-colors" title="Return purchase"><RotateCcw className="h-4 w-4" /></button>
                      <button onClick={() => handleViewDetails(entry)} className="text-blue-600 hover:text-blue-900 transition-colors" title="View details"><Eye className="h-4 w-4" /></button>
                      <button onClick={() => handleEdit(entry)} className="text-indigo-600 hover:text-indigo-900 transition-colors" title="Edit product"><Edit className="h-4 w-4" /></button>
                      <button onClick={() => handleDelete(entry.id)} className="text-red-600 hover:text-red-900 transition-colors" title="Delete product"><Trash2 className="h-4 w-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="14" className="px-4 py-8 text-center text-sm text-gray-500">No products found. Add some products to get started.</td>
              </tr>
            )}
          </tbody>
          {filteredEntries.length > 0 && (
            <tfoot className="bg-gray-100">
              <tr>
                <td colSpan="5" className="px-4 py-4 text-sm font-medium text-gray-900 text-right">Totals:</td>
                <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">{subtotals.purchaseQuantity}</td>
                <td className="px-4 py-4"></td>
                <td className="px-4 py-4 text-sm font-bold text-amber-700 text-right bg-amber-50">{formatCurrency(subtotals.totalFactoryOverhead)}</td>
                <td className="px-4 py-4 text-sm font-bold text-blue-600 text-right">{formatCurrency(subtotals.purchaseAmount)}</td>
                <td className="px-4 py-4 text-sm font-bold text-gray-900 text-right">{subtotals.balanceQuantity}</td>
                <td className="px-4 py-4 text-sm font-bold text-green-600 text-right">{formatCurrency(subtotals.balanceAmount)}</td>
                <td className="px-4 py-4"></td>
                <td className="px-4 py-4 text-sm font-bold text-right">
                  <span className={subtotals.totalProfit >= 0 ? "text-green-600" : "text-red-600"}>{formatCurrency(subtotals.totalProfit)}</span>
                </td>
                <td className="px-4 py-4"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredEntries.length)} of {filteredEntries.length} results
          </div>
          <div className="flex space-x-2">
            <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1} className="px-3 py-1 border rounded disabled:opacity-50">Previous</button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const page = i + Math.max(1, currentPage - 2)
              return (
                <button key={page} onClick={() => setCurrentPage(page)} className={`px-3 py-1 border rounded ${currentPage === page ? "bg-blue-500 text-white" : "bg-white"}`}>{page}</button>
              )
            })}
            <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages} className="px-3 py-1 border rounded disabled:opacity-50">Next</button>
          </div>
        </div>
      )}

      <div className="mt-8 pt-4 border-t border-gray-200 text-center text-sm text-gray-500">
        Created by <span className="font-semibold text-blue-600">Soft-Technix</span>
      </div>

      {/* Purchase Return Modal */}
      {showReturnForm && selectedProductForReturn && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2"><RotateCcw className="h-5 w-5 text-orange-600" />Purchase Return - PRN</h2>
              <button onClick={resetReturnForm} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
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
                <div><label className="block text-sm font-medium text-gray-700">Vendor</label><p className="text-sm text-gray-900">{selectedProductForReturn.vendorName || "N/A"}</p></div>
              </div>
            </div>
            <form onSubmit={handleReturnSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Quantity <span className="text-red-500">*</span></label>
                  <input type="number" name="returnQuantity" value={returnFormData.returnQuantity} onChange={handleReturnChange} required min="1" max={selectedProductForReturn.balanceQuantity} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Enter quantity to return" />
                  <p className="text-xs text-gray-500 mt-1">Maximum: {selectedProductForReturn.balanceQuantity} units</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Return Date <span className="text-red-500">*</span></label>
                  <input type="date" name="returnDate" value={returnFormData.returnDate} onChange={handleReturnChange} required max={new Date().toISOString().split("T")[0]} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Return</label>
                  <textarea name="reason" value={returnFormData.reason} onChange={handleReturnChange} rows="3" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-orange-500 focus:border-orange-500" placeholder="Enter reason for return (optional)" />
                </div>
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
                <button type="button" onClick={resetReturnForm} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors flex items-center gap-2" disabled={loading}>
                  <RotateCcw className="h-4 w-4" />Process Return (PRN)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Product Form Modal (Add / Edit) ─────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{isEditing ? "Edit Product" : "Add New Purchase"}</h2>
              <button onClick={resetForm} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md"><p className="text-sm text-red-800">{error}</p></div>}

            {/* Loading overlay when categories are still being fetched during edit */}
            {isEditing && loadingOverheadCats && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                <p className="text-sm text-amber-800 font-medium">Loading product data, please wait...</p>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">

                {/* Product Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Product Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {isEditing ? "Edit Date" : "Purchase Date"} <span className="text-red-500">*</span>
                      </label>
                      <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Item / Model Name <span className="text-red-500">*</span></label>
                      <input type="text" name="name" value={formData.name} onChange={handleChange} required className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter product name" list="products-list" />
                      <datalist id="products-list">{products.map((product) => (<option key={product._id} value={product.name} />))}</datalist>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                      <select name="category" value={formData.category} onChange={handleChange} required className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                        <option value="">Select category</option>
                        {productCategories.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                      <input type="text" name="serialNumber" value={formData.serialNumber} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter serial number" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date (Optional)</label>
                      <input type="date" name="expiryDate" value={formData.expiryDate} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                    </div>
                  </div>
                </div>

                {/* Quantity & Pricing */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Quantity & Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Quantity <span className="text-red-500">*</span></label>
                      <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} required min="0" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter quantity" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Rate <span className="text-red-500">*</span></label>
                      <input type="number" name="purchaseRate" value={formData.purchaseRate} onChange={handleChange} required min="0" step="0.01" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter purchase rate" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Sale Rate <span className="text-red-500">*</span></label>
                      <input type="number" name="saleRate" value={formData.saleRate} onChange={handleChange} required min="0" step="0.01" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter sale rate" />
                    </div>
                  </div>
                </div>

                {/* Factory Overhead Breakdown */}
                <div className="border-2 border-amber-200 rounded-xl overflow-hidden">
                  <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-200">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">🏭</span>
                      <h3 className="text-base font-semibold text-amber-800">Factory Overhead</h3>
                    </div>
                    {getOverheadTotal() > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-amber-600">Total O/H:</span>
                        <span className="bg-amber-600 text-white text-sm font-bold px-3 py-0.5 rounded-full">{formatCurrency(getOverheadTotal())}</span>
                      </div>
                    )}
                  </div>

                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 bg-white">
                    {loadingOverheadCats ? (
                      <div className="col-span-4 flex items-center justify-center py-8 gap-3 text-amber-500">
                        <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                        </svg>
                        <span className="text-sm font-medium">Loading overhead categories...</span>
                      </div>
                    ) : (
                      OVERHEAD_CATEGORIES.map((cat) => {
                        const item = overheadItems[cat.id] || { checked: false, amount: "" }
                        const c = COLOR_MAP[cat.color] || COLOR_MAP.gray
                        return (
                          <div key={cat.id} className={`rounded-xl border-2 transition-all ${item.checked ? `${c.border} ${c.bg}` : "border-gray-200 bg-gray-50"}`}>
                            <label className="flex items-center gap-2 px-3 pt-3 pb-2 cursor-pointer select-none">
                              <input type="checkbox" checked={item.checked} onChange={() => toggleOverhead(cat.id)} className={`w-4 h-4 rounded ${item.checked ? c.check : "accent-gray-400"}`} />
                              <span className="text-base">{cat.icon}</span>
                              <span className={`text-sm font-semibold ${item.checked ? c.text : "text-gray-500"}`}>{cat.label}</span>
                            </label>
                            {item.checked && (
                              <div className="px-3 pb-3">
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-400 font-medium">₨</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.amount}
                                    onChange={(e) => setOverheadAmount(cat.id, e.target.value)}
                                    placeholder="0.00"
                                    className={`w-full pl-6 pr-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 ${c.border} bg-white font-semibold ${c.text}`}
                                    autoFocus
                                  />
                                </div>
                                {Number(item.amount) > 0 && (
                                  <p className="text-xs mt-1 text-center font-medium opacity-70">
                                    <span className={c.text}>{formatCurrency(Number(item.amount))} / unit</span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        )
                      })
                    )}
                  </div>

                </div>

                {/* Vendor Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Vendor Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Name <span className="text-red-500">*</span></label>
                      <select name="vendorName" value={formData.vendorName} onChange={handleChange} required disabled={loadingVendors || vendors.length === 0} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100">
                        <option value="">{loadingVendors ? "Loading vendors..." : vendors.length === 0 ? "No vendors available" : "Select vendor"}</option>
                        {vendors.map((vendor) => (<option key={vendor._id} value={vendor.name}>{vendor.name} ({vendor.code})</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Purchases Type <span className="text-red-500">*</span></label>
                      <select name="purchasesType" value={formData.purchasesType} onChange={handleChange} required disabled={loadingPurchases || purchasesAccounts.length === 0} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100">
                        <option value="">{loadingPurchases ? "Loading purchases..." : purchasesAccounts.length === 0 ? "No purchases accounts available" : "Select purchases type"}</option>
                        {purchasesAccounts.map((account) => (<option key={account._id} value={account.name}>{account.name} ({account.code})</option>))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Phone</label>
                      <input type="tel" name="vendorPhone" value={formData.vendorPhone} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter vendor phone" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Vendor Bill Number</label>
                      <input type="text" name="vendorBillNumber" value={formData.vendorBillNumber} onChange={handleChange} className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter vendor bill number" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea name="notes" value={formData.notes} onChange={handleChange} rows="3" className="w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder="Enter any additional notes" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Purchase Summary */}
              {formData.quantity && formData.purchaseRate && formData.saleRate && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-semibold text-blue-900 mb-3">Purchase Summary</h4>


                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <span className="text-xs font-medium text-gray-600">Purchase Quantity</span>
                      <div className="text-lg font-bold text-blue-900">{Number(formData.quantity) || 0}</div>
                    </div>
                    <div className="bg-white p-3 rounded border border-blue-100">
                      <span className="text-xs font-medium text-gray-600">Purchase Rate Amount</span>
                      <div className="text-lg font-bold text-blue-600">{formatCurrency((Number(formData.quantity) || 0) * (Number(formData.purchaseRate) || 0))}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{formatCurrency(Number(formData.purchaseRate))}</div>
                    </div>
                    {getOverheadTotal() > 0 && (
                      <div className="bg-amber-50 p-3 rounded border border-amber-200">
                        <span className="text-xs font-medium text-amber-700">Factory Overhead Amount</span>
                        <div className="text-lg font-bold text-amber-700">{formatCurrency(getOverheadTotal())}</div>
                      </div>
                    )}
                    <div className={`p-3 rounded border-2 ${getOverheadTotal() > 0 ? "bg-green-50 border-green-300" : "bg-white border-blue-100"}`}>
                      <span className="text-xs font-medium text-gray-600">
                        {getTotalPurchaseAmount() > 0 ? "Total Purchase Amount (incl. O/H)" : "Total Purchase Amount"}
                      </span>
                      <div className={`text-lg font-extrabold ${getOverheadTotal() > 0 ? "text-green-700" : "text-blue-700"}`}>
                        {formatCurrency(getOverheadTotal() + (Number(formData.quantity) || 0) * (Number(formData.purchaseRate) || 0))}
                      </div>
                      {getOverheadTotal() > 0 && (
                        <div className="text-xs text-green-600 mt-0.5">{formatCurrency(getTotalCostPerUnit())} × {Number(formData.quantity)}</div>
                      )}
                    </div>
                   
                    
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end space-x-3">
                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2" disabled={loading || loadingVendors || loadingPurchases || loadingOverheadCats}>
                  <Save className="h-4 w-4" />{isEditing ? "Update" : "Add"} Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Return History Modal */}
      {showReturnHistory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2"><RotateCcw className="h-5 w-5 text-orange-600" />Purchase Return History (PRN)</h2>
              <button onClick={() => setShowReturnHistory(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
            {loadingReturns ? (
              <div className="flex items-center justify-center h-64"><div className="text-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div><p className="text-gray-600">Loading return history...</p></div></div>
            ) : returnHistory.length === 0 ? (
              <div className="text-center py-12"><RotateCcw className="h-16 w-16 text-gray-300 mx-auto mb-4" /><p className="text-gray-500 text-lg">No returns processed yet</p></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-orange-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">GRN Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Vendor</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Return Qty</th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">Return Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {returnHistory.map((returnItem, index) => (
                      <tr key={returnItem._id || index} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{returnItem.grnDate ? formatDateToDDMMYYYY(returnItem.grnDate) : "N/A"}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{returnItem.productName || "N/A"}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-500">{returnItem.vendorName || "N/A"}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 text-right font-bold">{returnItem.returnQuantity || 0}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-orange-600 text-right font-bold">{formatCurrency(returnItem.returnAmount || 0)}</td>
                        <td className="px-4 py-4 text-sm text-gray-500">{returnItem.reason || "N/A"}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-orange-50">
                    <tr>
                      <td colSpan="3" className="px-4 py-4 text-sm font-medium text-gray-900 text-right">Total Returns:</td>
                      <td className="px-4 py-4 text-sm font-bold text-orange-600 text-right">{returnHistory.reduce((sum, item) => sum + (item.returnQuantity || 0), 0)}</td>
                      <td className="px-4 py-4 text-sm font-bold text-orange-600 text-right">{formatCurrency(returnHistory.reduce((sum, item) => sum + (item.returnAmount || 0), 0))}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button onClick={() => setShowReturnHistory(false)} className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Product Details - GRN Tracking</h2>
              <button onClick={() => setShowDetails(false)} className="text-gray-500 hover:text-gray-700"><X className="h-5 w-5" /></button>
            </div>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">Purchase Rate</label><p className="text-sm text-gray-900 font-medium">{formatCurrency(selectedEntry.purchaseRate)}</p></div>
                  <div><label className="block text-sm font-medium text-amber-700">Factory Overhead</label><p className="text-sm text-amber-700 font-medium">{selectedEntry.factoryOverhead > 0 ? formatCurrency(selectedEntry.factoryOverhead) : "N/A"}</p></div>
                  <div><label className="block text-sm font-medium text-gray-700">Sale Rate</label><p className="text-sm text-gray-900 font-medium">{formatCurrency(selectedEntry.saleRate)}</p></div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Potential Profit</label>
                    <p className={`text-sm font-medium ${selectedEntry.profit >= 0 ? "text-green-600" : "text-red-600"}`}>{formatCurrency(selectedEntry.profit)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      ({selectedEntry.balanceQuantity} × {formatCurrency(selectedEntry.saleRate)}) − {formatCurrency(selectedEntry.purchaseAmount)}
                    </p>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Vendor Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium text-gray-700">Vendor Name</label><p className="text-sm text-gray-900">{selectedEntry.vendorName || "N/A"}</p></div>
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