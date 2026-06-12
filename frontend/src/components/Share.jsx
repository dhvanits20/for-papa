import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { Download, Copy, Share2, Check, Lock, LogOut } from 'lucide-react'
import { useCurator } from '../context/CuratorContext'
import { verifyPin } from '../utils/api'

const SITE_URL = window.location.origin

export default function Share() {
  const [copied, setCopied] = useState(false)
  const [pin, setPin] = useState('')
  const [pinError, setPinError] = useState('')
  const [checkingPin, setCheckingPin] = useState(false)
  const { curatorPin, setCuratorPin } = useCurator()
  const qrRef = useRef(null)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(SITE_URL)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQR = () => {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const svgData = new XMLSerializer().serializeToString(svg)
    const canvas = document.createElement('canvas')
    const size = 600
    canvas.width = canvas.height = size
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.onload = () => {
      ctx.fillStyle = '#FAF6F0'
      ctx.fillRect(0, 0, size, size)
      ctx.drawImage(img, 50, 80, 500, 500)

      // Add title text
      ctx.fillStyle = '#2C2A29'
      ctx.font = 'bold 28px serif'
      ctx.textAlign = 'center'
      ctx.fillText('❤️ For Papa', size / 2, 55)

      ctx.font = '16px sans-serif'
      ctx.fillStyle = '#8C7A6B'
      ctx.fillText('Scan to add a memory', size / 2, size - 15)

      const link = document.createElement('a')
      link.download = 'for-papa-qr.png'
      link.href = canvas.toDataURL('image/png')
      link.click()
    }
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)))
  }

  const handleVerifyPin = async () => {
    if (!pin.trim()) return
    setCheckingPin(true)
    setPinError('')
    try {
      await verifyPin(pin)
      setCuratorPin(pin)
      setPin('')
    } catch(e) {
      setPinError('Wrong PIN — try again')
    } finally {
      setCheckingPin(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <p className="text-xs font-bold tracking-widest uppercase text-warmbrown mb-1">Share the love</p>
        <h1 className="font-serif text-5xl text-charcoal">One scan. Everyone joins in.</h1>
        <p className="text-warmbrown mt-2 max-w-lg">
          Print this QR or send the image to family. Anyone with the QR can open the memory
          book and add a photo or short video for Papa.
        </p>
      </motion.div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* QR Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl p-8 shadow-xl border border-terracotta-100 flex flex-col items-center"
          ref={qrRef}
          id="qr-card"
        >
          <p className="font-serif text-xl text-charcoal mb-5">❤️ For Papa</p>
          <div className="p-4 bg-cream rounded-2xl border-2 border-terracotta-100">
            <QRCodeSVG
              id="qr-code"
              value={SITE_URL}
              size={220}
              bgColor="#FAF6F0"
              fgColor="#2C2A29"
              level="H"
              includeMargin={false}
            />
          </div>
          <p className="text-xs text-warmbrown mt-4 tracking-wider uppercase font-semibold">
            Scan to add a memory
          </p>
        </motion.div>

        {/* Actions Panel */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* URL box */}
          <div>
            <label className="text-xs font-bold uppercase tracking-widest text-warmbrown mb-2 block">
              Website Link
            </label>
            <div className="flex items-center gap-2 bg-cream-dark rounded-2xl px-4 py-3 border border-terracotta-100">
              <span className="text-sm text-charcoal flex-1 truncate">{SITE_URL}</span>
            </div>
          </div>

          {/* Action buttons */}
          <button
            id="btn-download-qr"
            onClick={handleDownloadQR}
            className="w-full flex items-center justify-center gap-2 bg-terracotta-500 hover:bg-terracotta-600 text-white font-semibold py-3 rounded-full shadow-lg shadow-terracotta-200 transition-colors"
          >
            <Download className="w-4 h-4" />
            Download QR (PNG)
          </button>

          <button
            id="btn-copy-link"
            onClick={handleCopy}
            className="w-full flex items-center justify-center gap-2 border border-terracotta-200 hover:bg-terracotta-50 text-charcoal font-semibold py-3 rounded-full transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>

          {/* WhatsApp share */}
          <a
            id="btn-whatsapp-share"
            href={`https://wa.me/?text=Open%20our%20memory%20book%20for%20Papa%20here%3A%20${encodeURIComponent(SITE_URL)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1ebe5a] text-white font-semibold py-3 rounded-full transition-colors"
          >
            <Share2 className="w-4 h-4" />
            Share via WhatsApp
          </a>

          <p className="text-xs text-warmbrown text-center">
            💡 Print the QR and stick it on the fridge, or share it in your family group chat.
          </p>

          {/* Curator PIN Section */}
          <div className="mt-6 bg-cream-dark rounded-2xl p-5 border border-terracotta-100">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="w-4 h-4 text-charcoal" />
              <p className="font-semibold text-charcoal text-sm">Curator Mode</p>
            </div>

            {curatorPin ? (
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-600 font-semibold">✅ Curator mode active</p>
                <button
                  id="curator-logout"
                  onClick={() => setCuratorPin(null)}
                  className="flex items-center gap-1 text-xs text-warmbrown hover:text-terracotta-600 transition-colors"
                >
                  <LogOut className="w-3 h-3" /> Log out
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-warmbrown mb-3">
                  Enter the curator PIN to delete memories and set cover photos.
                </p>
                <div className="flex gap-2">
                  <input
                    id="curator-pin-input"
                    type="password"
                    placeholder="Enter PIN"
                    value={pin}
                    onChange={e => setPin(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleVerifyPin()}
                    className="flex-1 border border-terracotta-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-terracotta-400 bg-white"
                  />
                  <button
                    id="curator-pin-verify"
                    onClick={handleVerifyPin}
                    disabled={checkingPin}
                    className="bg-charcoal text-cream px-4 py-2 rounded-full text-sm font-semibold hover:bg-charcoal-light transition-colors disabled:opacity-60"
                  >
                    {checkingPin ? '…' : 'Unlock'}
                  </button>
                </div>
                {pinError && <p className="text-red-500 text-xs mt-2">{pinError}</p>}
              </>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
