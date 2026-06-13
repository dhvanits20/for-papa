import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, QrCode, Heart, Camera, Film } from 'lucide-react'

import confetti from 'canvas-confetti'
import UploadModal from './Upload'
import { getFileUrl, reactToMemory, getMemories } from '../utils/api'

export default function Hero({ navigateTo, isGuest, shareToken }) {
  const [showUploadType, setShowUploadType] = useState(null)
  const [latestMemory, setLatestMemory] = useState(null)

  useEffect(() => {
    const fetchLatest = async () => {
      try {
        const all = await getMemories(null, null, null, false, shareToken)
        if (all && all.length > 0) {
          const sorted = all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          setLatestMemory(sorted[0])
        }
      } catch (e) {
        console.error(e)
      }
    }
    fetchLatest()
  }, [shareToken])

  const triggerHearts = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (rect.left + rect.width / 2) / window.innerWidth
    const y = (rect.top + rect.height / 2) / window.innerHeight
    
    const defaults = { startVelocity: 15, spread: 360, ticks: 60, zIndex: 0, particleCount: 30 }
    
    const scalar = 2
    const heart = confetti.shapeFromText({ text: '❤️', scalar })

    confetti({
      ...defaults,
      origin: { x, y },
      shapes: [heart],
      colors: ['#ff0000']
    })
  }

  const handleLike = async (e) => {
    triggerHearts(e)
    if (latestMemory) {
      try {
        await reactToMemory(latestMemory.id, 'love')
      } catch (err) {
        console.error(err)
      }
    }
  }

  const d = new Date()

  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-terracotta-50 to-cream text-charcoal">
      {showUploadType && (
        <UploadModal
          year={d.getFullYear()}
          month={d.getMonth() + 1}
          accept={showUploadType}
          onClose={() => setShowUploadType(null)}
          onSuccess={(newMemories) => { 
            setShowUploadType(null)
            if (newMemories && newMemories.length > 0) {
              setLatestMemory(newMemories[0])
            }
          }}
        />
      )}
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background gradient blob */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-terracotta-200 rounded-full blur-3xl opacity-40" />
          <div className="absolute top-1/2 -left-24 w-72 h-72 bg-terracotta-100 rounded-full blur-3xl opacity-50" />
        </div>

        <div className="max-w-5xl mx-auto px-4 pt-16 pb-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left text */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
            >
              <div className="inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm text-terracotta-700 text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full mb-6 border border-white/40">
                <Heart className="w-3 h-3 fill-terracotta-500 text-terracotta-500" />
                A Memory Book for Papa
              </div>

              <h1 className="font-serif text-5xl md:text-6xl text-charcoal leading-tight mb-5">
                Every moment<br />
                with you,{' '}
                <em className="text-terracotta-500 not-italic">treasured.</em>
              </h1>

              <p className="text-warmbrown text-lg leading-relaxed mb-8 max-w-md">
                A living tribute, month by month. Scan, share, and add the small
                things — a smile, a chai together, a laugh — so we can revisit
                them forever.
              </p>

              <div className="flex flex-wrap gap-3">
                <motion.button
                  id="hero-open-book"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigateTo('grid')}
                  className="inline-flex items-center gap-2 bg-terracotta-500 hover:bg-terracotta-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg shadow-terracotta-200 transition-colors"
                >
                  Open the memory book
                  <ArrowRight className="w-4 h-4" />
                </motion.button>

                {!isGuest && (
                  <motion.button
                    id="hero-share-qr"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigateTo('share')}
                    className="inline-flex items-center gap-2 bg-charcoal hover:bg-charcoal-light text-cream font-semibold px-6 py-3 rounded-full transition-colors"
                  >
                    <QrCode className="w-4 h-4" />
                    Share QR
                  </motion.button>
                )}
              </div>
            </motion.div>

            {/* Right visual card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2, ease: 'easeOut' }}
              className="relative"
            >
              {/* Animated orbs behind the glass card */}
              <motion.div 
                animate={{ scale: [1, 1.2, 1], x: [0, 20, 0], y: [0, -30, 0] }}
                transition={{ repeat: Infinity, duration: 8, ease: 'easeInOut' }}
                className="absolute top-10 -left-10 w-48 h-48 bg-terracotta-400 rounded-full blur-3xl opacity-60 -z-10" 
              />
              <motion.div 
                animate={{ scale: [1, 1.5, 1], x: [0, -40, 0], y: [0, 40, 0] }}
                transition={{ repeat: Infinity, duration: 10, ease: 'easeInOut', delay: 1 }}
                className="absolute bottom-10 -right-10 w-56 h-56 bg-terracotta-600 rounded-full blur-3xl opacity-50 -z-10" 
              />

              <div className="relative rounded-3xl overflow-hidden aspect-[4/5] bg-white/20 backdrop-blur-xl shadow-2xl border border-white/40">
                {latestMemory ? (
                  <div className="absolute inset-0">
                    {latestMemory.file_type.startsWith('video') ? (
                      <video
                        src={getFileUrl(latestMemory.id, shareToken)}
                        className="w-full h-full object-contain"
                        autoPlay
                        loop
                        muted
                        playsInline
                      />
                    ) : (
                      <img
                        src={getFileUrl(latestMemory.id, shareToken)}
                        alt={latestMemory.title || "Memory"}
                        className="w-full h-full object-contain"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {(latestMemory.title || latestMemory.description) && (
                      <div className="absolute bottom-6 left-6 right-6 text-white text-left z-10">
                        {latestMemory.title && <h3 className="font-serif text-2xl font-bold mb-1">{latestMemory.title}</h3>}
                        {latestMemory.description && <p className="text-white/80 text-sm line-clamp-2">{latestMemory.description}</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center">
                    <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-full flex items-center justify-center mb-5">
                      <Heart className="w-10 h-10 text-white fill-white" />
                    </div>
                    <p className="font-serif text-white text-2xl italic leading-snug mb-3">
                      "The best gift a child can give a parent is a memory."
                    </p>
                    <p className="text-white/70 text-sm">— The Family</p>
                  </div>
                )}

                {/* Floating photo bubbles */}
                {[
                  { top: '8%', left: '8%', icon: Camera, delay: 0.4, type: 'image/*' },
                  { top: '8%', right: '8%', icon: Film, delay: 0.6, type: 'video/*' },
                  { bottom: '8%', left: '8%', icon: Heart, delay: 0.8, type: 'heart' },
                ].map(({ top, right, bottom, left, icon: Icon, delay, type }, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1, y: [0, -15, 0] }}
                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.4)', y: 0 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={(e) => {
                      if (type === 'heart') {
                        triggerHearts(e);
                        handleLike(e);
                      } else if (!isGuest && type !== 'heart') {
                        setShowUploadType(type);
                      }
                    }}
                    transition={{ 
                      delay: delay, 
                      scale: { type: 'spring', stiffness: 200 },
                      y: { repeat: Infinity, duration: 4 + Math.random(), ease: 'easeInOut' }
                    }}
                    style={{ top, right, bottom, left, position: 'absolute' }}
                    className="w-12 h-12 bg-white/30 backdrop-blur-sm rounded-2xl flex items-center justify-center cursor-pointer shadow-sm hover:shadow-md"
                  >
                    <Icon className="w-5 h-5 text-white" />
                  </motion.button>
                ))}
              </div>

              {/* Shadow card behind */}
              <div className="absolute -bottom-4 -right-4 w-full h-full bg-terracotta-200 rounded-3xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              title: 'Month by Month',
              desc: 'Every month has its own gallery. Browse the timeline and relive precious moments.',
              icon: '📅',
            },
            {
              title: 'Anyone Can Add',
              desc: 'No account needed. Share the QR with family and let everyone contribute memories.',
              icon: '🤳',
            },
            {
              title: 'Photos & Videos',
              desc: 'Upload both photos and videos — up to 100MB — with smooth streaming playback.',
              icon: '🎬',
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5 }}
              className="bg-white/60 backdrop-blur-md rounded-2xl p-6 border border-white/40 hover:border-terracotta-300 hover:shadow-lg transition-all"
            >
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-serif text-lg text-charcoal mb-2">{f.title}</h3>
              <p className="text-warmbrown text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </div>
  )
}
