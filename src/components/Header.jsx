import Logo from './Logo'

export default function Header({ currentPage, setCurrentPage }) {
  const COLORS = {
    burgundy: '#4f0f12',
    gold: '#D39B00', 
    ivoryWhite: '#FFFEF7',
    ink: '#111827',
    gray: '#9CA3AF',
    brightGreen: '#00FF00',
    darkGray: '#404040'
  }

  return (
    <header 
      className="shadow-sm"
      style={{ 
        backgroundColor: COLORS.burgundy,
        borderBottom: `1px solid ${COLORS.gold}`
      }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Logo />
          </div>
          
          {/* Navigation */}
          <nav className="hidden md:flex space-x-8">
            <button 
              onClick={() => setCurrentPage('live-map')}
              className="px-3 py-2 text-sm font-medium transition-colors text-white hover:opacity-80"
              style={{ 
                borderBottom: currentPage === 'live-map' ? `2px solid ${COLORS.gold}` : 'none'
              }}
            >
              Live Map
            </button>
            <button 
              onClick={() => setCurrentPage('analytics')}
              className="px-3 py-2 text-sm font-medium transition-colors text-white hover:opacity-70"
              style={{ 
                borderBottom: currentPage === 'analytics' ? `2px solid ${COLORS.gold}` : 'none'
              }}
            >
              Analytics
            </button>
          </nav>
          
          {/* Status indicator */}
          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 text-sm text-white">
              <div 
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: COLORS.brightGreen }}
              ></div>
              <span>System Online</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
