import { motion } from 'framer-motion'
import { Heart, QrCode, BookOpen, LogOut } from 'lucide-react'
import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext'

export default function Navbar({ page, navigateTo, isGuest }) {
  const { logout, user } = useContext(AuthContext)
  
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
          className="flex items-center gap-2 group shrink-0"
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
        <div className="flex items-center gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] ml-4">
          {links.filter(l => !isGuest || l.id !== 'share').map((link) => (
            <button
              key={link.id}
              id={`nav-${link.id}`}
              onClick={() => navigateTo(link.id)}
              className={`whitespace-nowrap px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                page === link.id
                  ? 'bg-charcoal text-cream'
                  : 'text-charcoal hover:bg-terracotta-100 hover:text-terracotta-700'
              }`}
            >
              {link.label}
            </button>
          ))}
          
          <div className="w-px h-6 bg-terracotta-200 mx-2 shrink-0" />
          
          {isGuest ? (
            <button
              onClick={() => { window.location.href = '/' }}
              className="whitespace-nowrap shrink-0 px-4 py-1.5 bg-rust text-white rounded-full text-sm font-medium hover:bg-[#A64B3A] transition-all"
            >
              Create your own
            </button>
          ) : (
            <button
              onClick={logout}
              className="whitespace-nowrap shrink-0 px-3 py-1.5 flex items-center gap-2 rounded-full text-sm font-medium text-charcoal hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              title="Log out"
            >
              <LogOut className="w-4 h-4 shrink-0" />
              <span className="inline">Logout</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  )
}
