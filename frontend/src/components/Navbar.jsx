import { motion } from 'framer-motion'
import { Heart, QrCode, BookOpen } from 'lucide-react'

export default function Navbar({ page, navigateTo }) {
  const links = [
    { id: 'home', label: 'Home', icon: null },
    { id: 'grid', label: 'Memories', icon: null },
    { id: 'favorites', label: 'Favorites', icon: null },
    { id: 'search', label: 'Search', icon: null },
    { id: 'share', label: 'Share QR', icon: null },
  ]

  return (
    <nav className="sticky top-0 z-50 bg-cream/90 backdrop-blur-md border-b border-terracotta-100">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <button
          onClick={() => navigateTo('home')}
          className="flex items-center gap-2 group"
          id="nav-logo"
        >
          <motion.div
            whileHover={{ scale: 1.15 }}
            className="w-8 h-8 bg-terracotta-500 rounded-full flex items-center justify-center"
          >
            <Heart className="w-4 h-4 text-white fill-white" />
          </motion.div>
          <span className="font-serif font-semibold text-charcoal group-hover:text-terracotta-600 transition-colors">
            For Papa
          </span>
        </button>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <button
              key={link.id}
              id={`nav-${link.id}`}
              onClick={() => navigateTo(link.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                page === link.id
                  ? 'bg-charcoal text-cream'
                  : 'text-charcoal hover:bg-terracotta-100 hover:text-terracotta-700'
              }`}
            >
              {link.label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
