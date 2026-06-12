import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Upload, Image, Film, Loader2, Quote, Hash, MapPin } from 'lucide-react'
import { uploadMemories } from '../utils/api'

const MONTHS = ['','January','February','March','April','May','June',
  'July','August','September','October','November','December']

export default function UploadModal({ year, month, accept, onClose, onSuccess }) {
  const [files, setFiles] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [locationName, setLocationName] = useState('')
  const [tab, setTab] = useState('media') // 'media' | 'quote'
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (selected) => {
    const arr = Array.from(selected)
    const valid = arr.filter(f =>
      f.type.startsWith('image/') || f.type.startsWith('video/')
    )
    setFiles(prev => [...prev, ...valid])
  }

  const removeFile = (idx) => setFiles(f => f.filter((_, i) => i !== idx))

  const handleSubmit = async () => {
    if (tab === 'media' && files.length === 0) { setError('Please add at least one photo or video'); return }
    if (tab === 'quote' && !description) { setError('Please write a quote or text'); return }
    setError('')
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('year', year)
      formData.append('month', month)
      formData.append('title', title)
      formData.append('description', description)
      formData.append('tags', tags)
      formData.append('location_name', locationName)
      if (tab === 'media') {
        files.forEach(f => formData.append('files', f))
      }
      const newMemories = await uploadMemories(formData)
      onSuccess(newMemories)
    } catch(e) {
      setError(e.message || 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      id="upload-modal-overlay"
    >
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="bg-cream w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        id="upload-modal"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-terracotta-100 shrink-0">
          <div>
            <h2 className="font-serif text-2xl text-charcoal">Add a Memory</h2>
            <p className="text-warmbrown text-sm">{MONTHS[month]} {year}</p>
          </div>
          <button
            id="upload-modal-close"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-cream-dark hover:bg-terracotta-100 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-charcoal" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-terracotta-100 shrink-0">
          <button 
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${tab === 'media' ? 'text-terracotta-600 border-b-2 border-terracotta-500' : 'text-warmbrown hover:text-charcoal bg-cream-dark/50'}`}
            onClick={() => setTab('media')}
          >
            <Image className="w-4 h-4"/> Photos & Videos
          </button>
          <button 
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${tab === 'quote' ? 'text-terracotta-600 border-b-2 border-terracotta-500' : 'text-warmbrown hover:text-charcoal bg-cream-dark/50'}`}
            onClick={() => setTab('quote')}
          >
            <Quote className="w-4 h-4"/> Text / Quote
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {tab === 'media' && (
            <>
              {/* Drop zone */}
              <div
                id="upload-dropzone"
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files) }}
                onClick={() => inputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  dragOver
                    ? 'border-terracotta-500 bg-terracotta-50'
                    : 'border-terracotta-200 hover:border-terracotta-400 hover:bg-terracotta-50'
                }`}
              >
                <div className="flex justify-center gap-3 mb-3">
                  <Image className="w-8 h-8 text-terracotta-300" />
                  <Film className="w-8 h-8 text-terracotta-300" />
                </div>
                <p className="font-semibold text-charcoal">Drop photos & videos here</p>
                <p className="text-warmbrown text-sm mt-1">or click to browse · up to 100MB each</p>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept={accept && typeof accept === 'string' ? accept : "image/*,video/*"}
                  className="hidden"
                  id="upload-file-input"
                  onChange={(e) => handleFiles(e.target.files)}
                />
              </div>

              {/* Selected file previews */}
              {files.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {files.map((f, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden aspect-square bg-cream-dark group border border-terracotta-100">
                      {f.type.startsWith('image/') ? (
                        <img
                          src={URL.createObjectURL(f)}
                          alt={f.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                          <Film className="w-6 h-6 text-terracotta-400 mb-1" />
                          <p className="text-xs text-warmbrown truncate w-full text-center">{f.name}</p>
                        </div>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                        className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Title & Description */}
          <input
            id="upload-title"
            type="text"
            placeholder={tab === 'quote' ? "Quote Title or Context (optional)" : "Title (optional)"}
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full border border-terracotta-100 rounded-xl px-4 py-3 text-charcoal placeholder-warmbrown/60 focus:outline-none focus:border-terracotta-400 bg-white text-sm"
          />
          <textarea
            id="upload-description"
            placeholder={tab === 'quote' ? "What did Papa say?..." : "Description — what was happening? (optional)"}
            value={description}
            onChange={e => setDescription(e.target.value)}
            rows={tab === 'quote' ? 4 : 2}
            className={`w-full border border-terracotta-100 rounded-xl px-4 py-3 text-charcoal placeholder-warmbrown/60 focus:outline-none focus:border-terracotta-400 bg-white text-sm resize-none ${tab === 'quote' ? 'font-serif text-lg leading-relaxed' : ''}`}
          />

          <div className="flex gap-3 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Hash className="w-4 h-4 absolute left-3 top-3.5 text-warmbrown/60" />
              <input
                type="text"
                placeholder="Tags (comma separated)"
                value={tags}
                onChange={e => setTags(e.target.value)}
                className="w-full border border-terracotta-100 rounded-xl pl-9 pr-4 py-3 text-charcoal placeholder-warmbrown/60 focus:outline-none focus:border-terracotta-400 bg-white text-sm"
              />
            </div>
            <div className="flex-1 relative">
              <MapPin className="w-4 h-4 absolute left-3 top-3.5 text-warmbrown/60" />
              <input
                type="text"
                placeholder="Location"
                value={locationName}
                onChange={e => setLocationName(e.target.value)}
                className="w-full border border-terracotta-100 rounded-xl pl-9 pr-4 py-3 text-charcoal placeholder-warmbrown/60 focus:outline-none focus:border-terracotta-400 bg-white text-sm"
              />
            </div>
          </div>

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 pt-2 shrink-0 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 border border-terracotta-200 text-warmbrown font-semibold rounded-full hover:bg-cream-dark transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            id="upload-submit"
            onClick={handleSubmit}
            disabled={uploading}
            className="flex-1 py-3 bg-terracotta-500 hover:bg-terracotta-600 text-white font-semibold rounded-full transition-colors flex items-center justify-center gap-2 shadow-lg shadow-terracotta-200 disabled:opacity-60 text-sm"
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</>
            ) : (
              <><Upload className="w-4 h-4" /> Upload {tab === 'media' && files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Memory'}</>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
