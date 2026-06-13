import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Image } from 'lucide-react'
import { getStats, getCovers, getFileUrl } from '../utils/api'

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December'
]

export default function Grid({ navigateTo, shareToken, isGuest }) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [stats, setStats] = useState({})  // { "YYYY-MM": count }
  const [covers, setCovers] = useState({}) // { "YYYY-MM": memoryId }
  const [loading, setLoading] = useState(true)

  // Available years: past 50 years to current
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [statsArr, coversMap] = await Promise.all([getStats(shareToken), getCovers(shareToken)])
        // Transform stats array into map { "YYYY-MM": count }
        const statsMap = {}
        statsArr.forEach(s => {
          statsMap[`${s.year}-${String(s.month).padStart(2, '0')}`] = s.count
        })
        setStats(statsMap)
        setCovers(coversMap)
      } catch(e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [shareToken])

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <p className="text-xs font-bold tracking-widest uppercase text-warmbrown mb-1">The Memory Book</p>
        <h1 className="font-serif text-5xl text-charcoal">Pick a month.</h1>
        <p className="text-warmbrown mt-2">
          Choose a year, then tap any month to see the photos and videos saved there.
        </p>
      </motion.div>

      {/* Year Selector */}
      <div className="flex items-center gap-2 mb-8 overflow-x-auto pb-4 custom-scrollbar">
        {years.map(year => (
          <motion.button
            key={year}
            id={`year-${year}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedYear(year)}
            className={`px-4 py-2 rounded-full font-semibold text-sm transition-all flex-shrink-0 ${
              selectedYear === year
                ? 'bg-charcoal text-cream shadow-md'
                : 'bg-cream-dark text-warmbrown hover:bg-terracotta-100 hover:text-terracotta-700 border border-terracotta-100'
            }`}
          >
            {year}
          </motion.button>
        ))}
      </div>

      {/* Month Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {MONTHS.map((month, idx) => {
          const monthNum = idx + 1
          const key = `${selectedYear}-${String(monthNum).padStart(2, '0')}`
          const count = stats[key] || 0
          const coverId = covers[key]

          return (
            <motion.button
              key={key}
              id={`month-card-${key}`}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: idx * 0.05, type: 'spring', stiffness: 100 }}
              whileHover={{ scale: 1.05, y: -8, rotateZ: idx % 2 === 0 ? 2 : -2 }}
              whileTap={{ scale: 0.97, rotateZ: 0 }}
              onClick={() => navigateTo('gallery', { year: selectedYear, month: monthNum })}
              className="relative overflow-hidden rounded-2xl aspect-[4/5] text-left group border border-transparent hover:border-white/50 hover:shadow-2xl transition-all duration-300"
            >
              {/* Cover Image / Placeholder */}
              {coverId ? (
                <img
                  src={getFileUrl(coverId, shareToken)}
                  alt={month}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className={`absolute inset-0 ${
                  count > 0
                    ? 'bg-gradient-to-br from-terracotta-100 to-terracotta-200'
                    : 'bg-cream-dark border-2 border-dashed border-terracotta-100'
                }`}>
                  {count === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Image className="w-8 h-8 text-terracotta-200" />
                    </div>
                  )}
                </div>
              )}

              {/* Dark overlay on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors rounded-2xl" />

              {/* Card content */}
              <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/50 via-black/20 to-transparent">
                <p className="text-xs text-white/70 font-medium">{selectedYear}</p>
                <p className="font-serif text-white text-xl leading-tight">{month}</p>
                <p className="text-white/70 text-xs mt-0.5">
                  {count === 0 ? 'No memories yet' : `${count} ${count === 1 ? 'memory' : 'memories'}`}
                </p>
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
