import { useState } from 'react'
import Hero from './components/Hero'
import Grid from './components/Grid'
import Gallery from './components/Gallery'
import Share from './components/Share'
import Navbar from './components/Navbar'
import { CuratorContext } from './context/CuratorContext'

export default function App() {
  const [page, setPage] = useState('home') // 'home' | 'grid' | 'gallery' | 'share'
  const [selectedMonth, setSelectedMonth] = useState({ year: null, month: null })
  const [curatorPin, setCuratorPin] = useState(null)

  const navigateTo = (p, extra) => {
    if (p === 'gallery' && extra) setSelectedMonth(extra)
    setPage(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <CuratorContext.Provider value={{ curatorPin, setCuratorPin }}>
      <div className="noise-bg" />
      <div className="min-h-screen bg-cream font-sans">
        <Navbar page={page} navigateTo={navigateTo} />
        <main>
          {page === 'home' && <Hero navigateTo={navigateTo} />}
          {page === 'grid' && <Grid navigateTo={navigateTo} />}
          {page === 'gallery' && (
            <Gallery
              year={selectedMonth.year}
              month={selectedMonth.month}
              autoUpload={selectedMonth.autoUpload}
              navigateTo={navigateTo}
            />
          )}
          {page === 'favorites' && (
            <Gallery favoritesOnly={true} navigateTo={navigateTo} />
          )}
          {page === 'search' && (
            <Gallery searchMode={true} navigateTo={navigateTo} />
          )}
          {page === 'share' && <Share />}
        </main>
      </div>
    </CuratorContext.Provider>
  )
}
