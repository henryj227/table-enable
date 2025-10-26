export default function Legend() {
  const COLORS = {
    brightGreen: '#00FF00',
    burgundy: '#7B1E28',
    ink: '#111827'
  }

  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded" 
          style={{ backgroundColor: COLORS.brightGreen }}
        ></div>
        <span style={{ color: COLORS.ink }}>Free</span>
      </div>
      <div className="flex items-center gap-2">
        <div 
          className="w-3 h-3 rounded" 
          style={{ backgroundColor: COLORS.burgundy }}
        ></div>
        <span style={{ color: COLORS.ink }}>Occupied</span>
      </div>
    </div>
  )
}
