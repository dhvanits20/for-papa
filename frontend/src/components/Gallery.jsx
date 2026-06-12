import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Heart, Laugh, Star, Frown, Play, ChevronLeft, ChevronRight,
  Upload, Trash2, Image as ImageIcon, MessageCircle, Send, Quote, MapPin, Hash } from 'lucide-react'
import { getMemories, getFileUrl, reactToMemory, commentOnMemory, deleteMemory, setCover, toggleFavorite } from '../utils/api'
import { useCurator } from '../context/CuratorContext'
import UploadModal from './Upload'

const MONTHS = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December']

const REACTIONS = [
  { type: 'love', emoji: '❤️', label: 'Love' },
  { type: 'haha', emoji: '😄', label: 'Haha' },
  { type: 'wow', emoji: '🌟', label: 'Wow' },
  { type: 'sad', emoji: '😢', label: 'Miss you' },
]

export default function Gallery({ year, month, autoUpload, navigateTo, favoritesOnly, searchMode }) {
  const [memories, setMemories] = useState([])
  const [loading, setLoading] = useState(true)
  const [lightbox, setLightbox] = useState(null) // index
  const [showUpload, setShowUpload] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [commentAuthor, setCommentAuthor] = useState('')
  const { curatorPin } = useCurator()

  const load = async () => {
    setLoading(true)
    try {
      let fetchYear = year;
      let fetchMonth = month;
      if (favoritesOnly || searchMode) {
        fetchYear = null;
        fetchMonth = null;
      }
      let data = await getMemories(fetchYear, fetchMonth)
      if (favoritesOnly) {
        data = data.filter(m => m.is_favorite);
      }
      setMemories(data)
    } catch(e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const [searchQuery, setSearchQuery] = useState('')

  const displayedMemories = searchMode 
     ? memories.filter(m => 
         (m.title && m.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
         (m.description && m.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
         (m.tags && m.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))) ||
         (m.location_name && m.location_name.toLowerCase().includes(searchQuery.toLowerCase()))
       )
     : memories;

  useEffect(() => { 
    load()
    if (autoUpload) {
      setShowUpload(true)
    }
  }, [year, month, autoUpload])

  const handleReact = async (memoryId, rType) => {
    try {
      const updated = await reactToMemory(memoryId, rType)
      setMemories(prev => prev.map(m => m.id === memoryId ? updated : m))
    } catch(e) { console.error(e) }
  }

  const handleComment = async (memoryId) => {
    if (!commentText.trim() || !commentAuthor.trim()) return
    try {
      const updated = await commentOnMemory(memoryId, commentAuthor, commentText)
      setMemories(prev => prev.map(m => m.id === memoryId ? updated : m))
      setCommentText('')
    } catch(e) { console.error(e) }
  }

  const handleDelete = async (memoryId) => {
    if (!curatorPin) return
    if (!confirm('Delete this memory? This cannot be undone.')) return
    try {
      await deleteMemory(memoryId, curatorPin)
      setMemories(prev => prev.filter(m => m.id !== memoryId))
      if (lightbox !== null) setLightbox(null)
    } catch(e) { alert(e.message) }
  }

  const handleSetCover = async (memoryId) => {
    if (!curatorPin) return
    try {
      const ym = `${year}-${String(month).padStart(2, '0')}`
      await setCover(ym, memoryId, curatorPin)
      alert('✅ Cover photo updated!')
    } catch(e) { alert(e.message) }
  }

  const handleToggleFavorite = async (memoryId) => {
    if (!curatorPin) {
      alert("Please enter the Curator PIN to favorite memories.");
      return;
    }
    try {
      const updated = await toggleFavorite(memoryId, curatorPin);
      setMemories(prev => prev.map(m => m.id === memoryId ? updated : m));
    } catch(e) { alert(e.message) }
  }

  const isVideo = (m) => m.file_type?.startsWith('video')

  const lb = lightbox !== null ? displayedMemories[lightbox] : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div>
          {!searchMode && !favoritesOnly && (
            <button
              onClick={() => navigateTo('grid')}
              className="text-xs font-bold tracking-widest uppercase text-warmbrown hover:text-terracotta-500 transition-colors mb-1 flex items-center gap-1"
              id="back-to-grid"
            >
              ← Back to months
            </button>
          )}
          <h1 className="font-serif text-5xl text-charcoal">
            {favoritesOnly ? 'Favorites' : searchMode ? 'Search Memories' : `${MONTHS[month]} `}
            {!favoritesOnly && !searchMode && <span className="text-warmbrown">{year}</span>}
          </h1>
          <p className="text-warmbrown mt-1">{displayedMemories.length} {displayedMemories.length === 1 ? 'memory' : 'memories'} found</p>
        </div>

        {searchMode && (
          <div className="flex-1 min-w-[280px] max-w-md mx-4 mt-2 sm:mt-0">
            <input 
              type="text" 
              placeholder="Search by title, location, quote, or tags..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full border border-terracotta-200 rounded-full px-5 py-2.5 text-charcoal focus:outline-none focus:border-terracotta-500 shadow-sm bg-white"
              autoFocus
            />
          </div>
        )}

        <motion.button
          id="open-upload"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setShowUpload(true)}
          className="inline-flex items-center gap-2 bg-terracotta-500 hover:bg-terracotta-600 text-white font-semibold px-5 py-2.5 rounded-full shadow-lg shadow-terracotta-200 transition-colors"
        >
          <Upload className="w-4 h-4" />
          Add a Memory
        </motion.button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-2xl aspect-square bg-cream-dark animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && displayedMemories.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-24 text-center"
        >
          <div className="w-24 h-24 bg-terracotta-50 rounded-full flex items-center justify-center mb-5 border-2 border-dashed border-terracotta-200">
            <ImageIcon className="w-10 h-10 text-terracotta-300" />
          </div>
          <h3 className="font-serif text-2xl text-charcoal mb-2">{searchMode && searchQuery ? 'No results found' : 'No memories yet'}</h3>
          <p className="text-warmbrown mb-5">
            {searchMode && searchQuery ? `Try searching for something else.` : favoritesOnly ? 'You haven\'t added any favorites yet.' : `Be the first to add a photo or video for ${MONTHS[month]}!`}
          </p>
          {!searchMode && !favoritesOnly && (
            <button
              onClick={() => setShowUpload(true)}
              className="bg-terracotta-500 text-white font-semibold px-6 py-2.5 rounded-full hover:bg-terracotta-600 transition-colors"
            >
              Add First Memory
            </button>
          )}
        </motion.div>
      )}

      {/* Masonry Grid */}
      {!loading && displayedMemories.length > 0 && (
        <div className="columns-2 sm:columns-3 gap-3 space-y-0">
          {displayedMemories.map((m, idx) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              className="masonry-item break-inside-avoid mb-3"
            >
              <div
                className="relative rounded-2xl overflow-hidden group cursor-pointer bg-cream-dark"
                onClick={() => setLightbox(idx)}
              >
                {m.file_type === 'text/quote' ? (
                  <div className="relative p-8 flex flex-col justify-center min-h-[240px] text-center bg-[#FDFBF7]">
                     <Quote className="w-10 h-10 text-terracotta-200 mx-auto mb-4" />
                     <p className="font-serif text-xl md:text-2xl text-charcoal leading-relaxed">"{m.description}"</p>
                     {m.title && <p className="text-terracotta-600 mt-4 font-semibold text-sm tracking-wide uppercase">— {m.title}</p>}
                  </div>
                ) : isVideo(m) ? (
                  <div className="relative overflow-hidden rounded-2xl">
                    <video
                      src={getFileUrl(m.id)}
                      className="w-full object-cover rounded-2xl max-h-72 group-hover:scale-105 transition-transform duration-500"
                      muted
                      preload="metadata"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-12 h-12 bg-white/80 backdrop-blur rounded-full flex items-center justify-center">
                        <Play className="w-5 h-5 text-terracotta-600 fill-terracotta-600 ml-0.5" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-2xl">
                    <img
                      src={getFileUrl(m.id)}
                      alt={m.title || 'Memory'}
                      className="w-full object-cover rounded-2xl group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>
                )}

                {m.is_favorite && (
                  <div className="absolute top-3 right-3 z-10 drop-shadow-md">
                    <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  </div>
                )}

                {/* Hover overlay with quick reactions */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all rounded-2xl flex flex-col justify-end p-4">
                  <div className="absolute top-3 right-3">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleToggleFavorite(m.id); }}
                      className="hover:scale-110 transition-transform p-2 bg-black/20 rounded-full backdrop-blur-sm"
                    >
                      <Star className={`w-5 h-5 ${m.is_favorite ? 'text-yellow-400 fill-yellow-400' : 'text-white/90 hover:text-yellow-400'} drop-shadow-md`} />
                    </button>
                  </div>
                  {m.title && m.file_type !== 'text/quote' && (
                    <p className="text-white text-sm font-medium truncate mb-1">{m.title}</p>
                  )}
                  {m.location_name && (
                    <p className="text-white/80 text-xs flex items-center gap-1 mb-2">
                      <MapPin className="w-3 h-3" /> {m.location_name}
                    </p>
                  )}
                  {m.tags && m.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {m.tags.slice(0, 3).map((t, i) => (
                        <span key={i} className="text-[10px] bg-white/20 text-white px-2 py-0.5 rounded-full backdrop-blur-sm">#{t}</span>
                      ))}
                      {m.tags.length > 3 && <span className="text-[10px] text-white/70">+{m.tags.length - 3}</span>}
                    </div>
                  )}
                  <div className="flex gap-1.5">
                    {REACTIONS.map(r => (
                      <button
                        key={r.type}
                        id={`react-${m.id}-${r.type}`}
                        onClick={(e) => { e.stopPropagation(); handleReact(m.id, r.type) }}
                        className="text-sm hover:scale-125 transition-transform"
                        title={r.label}
                      >
                        {r.emoji}
                        {m.reactions[r.type] > 0 && (
                          <span className="text-white/80 text-xs ml-0.5">{m.reactions[r.type]}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lb && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/95 flex flex-col"
            id="lightbox-modal"
          >
            {/* Top bar */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div>
                <p className="text-white font-semibold">{lb.title || 'Memory'}</p>
                <p className="text-white/50 text-xs">{MONTHS[lb.month]} {lb.year}</p>
              </div>
              <div className="flex items-center gap-3">
                {curatorPin && (
                  <>
                    <button
                      id="lightbox-favorite"
                      onClick={() => handleToggleFavorite(lb.id)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                    >
                      <Star className={`w-3 h-3 ${lb.is_favorite ? 'text-yellow-400 fill-yellow-400' : ''}`} />
                      {lb.is_favorite ? 'Unfavorite' : 'Favorite'}
                    </button>
                    <button
                      id="lightbox-set-cover"
                      onClick={() => handleSetCover(lb.id)}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full transition-colors"
                    >
                      📌 Set as Cover
                    </button>
                    <button
                      id="lightbox-delete"
                      onClick={() => handleDelete(lb.id)}
                      className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-300 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </>
                )}
                <button
                  id="lightbox-close"
                  onClick={() => setLightbox(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>

            {/* Media */}
            <div className="flex-1 flex items-center justify-center relative overflow-hidden p-4">
              {/* Prev/Next */}
              {lightbox > 0 && (
                <button
                  id="lightbox-prev"
                  onClick={() => setLightbox(lightbox - 1)}
                  className="absolute left-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              )}
              {lightbox < displayedMemories.length - 1 && (
                <button
                  id="lightbox-next"
                  onClick={() => setLightbox(lightbox + 1)}
                  className="absolute right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/25 rounded-full flex items-center justify-center transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-white" />
                </button>
              )}

              {lb.file_type === 'text/quote' ? (
                 <div className="w-full max-w-2xl bg-cream p-12 rounded-2xl shadow-2xl text-center relative">
                    <Quote className="w-16 h-16 text-terracotta-200 absolute top-6 left-6 opacity-50" />
                    <p className="font-serif text-3xl text-charcoal leading-relaxed mt-8 mb-6">"{lb.description}"</p>
                    {lb.title && <p className="text-terracotta-600 font-semibold uppercase tracking-widest">— {lb.title}</p>}
                    <div className="mt-8 pt-6 border-t border-terracotta-100 flex flex-wrap justify-center gap-3">
                      {lb.location_name && (
                        <span className="text-warmbrown text-sm flex items-center gap-1 bg-terracotta-50 px-3 py-1 rounded-full"><MapPin className="w-3 h-3"/> {lb.location_name}</span>
                      )}
                      {lb.tags && lb.tags.map((t, i) => (
                        <span key={i} className="text-warmbrown text-sm flex items-center gap-1 bg-terracotta-50 px-3 py-1 rounded-full"><Hash className="w-3 h-3"/> {t}</span>
                      ))}
                    </div>
                 </div>
              ) : isVideo(lb) ? (
                <video
                  key={lb.id}
                  src={getFileUrl(lb.id)}
                  controls
                  autoPlay
                  className="max-h-full max-w-full rounded-xl object-contain"
                  style={{ maxHeight: '65vh' }}
                />
              ) : (
                <img
                  key={lb.id}
                  src={getFileUrl(lb.id)}
                  alt={lb.title}
                  className="max-h-full max-w-full rounded-xl object-contain"
                  style={{ maxHeight: '65vh' }}
                />
              )}
            </div>

            {/* Bottom: reactions + comments */}
            <div className="border-t border-white/10 p-4 max-h-52 overflow-y-auto">
              {/* Reactions */}
              <div className="flex gap-3 mb-4">
                {REACTIONS.map(r => (
                  <button
                    key={r.type}
                    id={`lb-react-${lb.id}-${r.type}`}
                    onClick={() => handleReact(lb.id, r.type)}
                    className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full text-sm transition-all hover:scale-105"
                  >
                    {r.emoji} <span className="text-white/70">{lb.reactions[r.type] || 0}</span>
                  </button>
                ))}
              </div>

              {/* Comments */}
              {lb.comments.map((c, ci) => (
                <div key={ci} className="mb-2 flex gap-2">
                  <div className="w-7 h-7 bg-terracotta-500 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold">
                    {c.author[0]?.toUpperCase()}
                  </div>
                  <div>
                    <span className="text-white/70 text-xs font-semibold">{c.author}</span>
                    <p className="text-white text-sm">{c.text}</p>
                  </div>
                </div>
              ))}

              {/* Add comment */}
              <div className="flex gap-2 mt-3">
                <input
                  id="comment-author"
                  placeholder="Your name"
                  value={commentAuthor}
                  onChange={e => setCommentAuthor(e.target.value)}
                  className="w-28 bg-white/10 text-white placeholder-white/40 text-sm px-3 py-2 rounded-full border border-white/20 focus:outline-none focus:border-terracotta-400"
                />
                <input
                  id="comment-text"
                  placeholder="Add a comment…"
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleComment(lb.id)}
                  className="flex-1 bg-white/10 text-white placeholder-white/40 text-sm px-3 py-2 rounded-full border border-white/20 focus:outline-none focus:border-terracotta-400"
                />
                <button
                  id="comment-submit"
                  onClick={() => handleComment(lb.id)}
                  className="w-9 h-9 bg-terracotta-500 hover:bg-terracotta-600 rounded-full flex items-center justify-center transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUpload && (
          <UploadModal
            year={year}
            month={month}
            accept={autoUpload}
            onClose={() => setShowUpload(false)}
            onSuccess={() => { setShowUpload(false); load() }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
