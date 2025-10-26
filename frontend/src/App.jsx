import { useState } from 'react'
import Header from './components/Header'
import FloorMap from './components/FloorMap'
import Status from './components/Status'
import Analytics from './components/Analytics'

function App() {
  const [currentPage, setCurrentPage] = useState('live-map')
  
  const COLORS = {
    burgundy: '#4f0f12',
    gold: '#D39B00',
    ivoryWhite: '#FFFEF7',
    ink: '#111827',
    gray: '#9CA3AF'
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'analytics':
        return <Analytics />
      case 'status':
        return <Status />
      case 'live-map':
      default:
        return <FloorMap />
    }
  }

  return (
    <div className="min-h-screen transition-colors" style={{ backgroundColor: COLORS.burgundy }}>
      {/* Header */}
      <Header currentPage={currentPage} setCurrentPage={setCurrentPage} />
      
      {/* MC */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {renderPage()}
      </main>

      {/* Footer */}
      <footer 
        className="mt-12"
        style={{ 
          backgroundColor: COLORS.burgundy,
          borderTop: `1px solid ${COLORS.gold}`
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <p className="text-sm text-white">
              Table Enable • Real-time occupancy monitoring • No images stored - only counts & states
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default App
