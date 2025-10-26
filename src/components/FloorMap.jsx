import { useState, useEffect, useRef } from 'react'
import { MapContainer, Circle, Polygon, Tooltip, useMap, Rectangle, Marker } from 'react-leaflet'
import L from 'leaflet'
import { defaultRoom, mockOccupancyData } from '../lib/defaultRoom.js'
import { useOccupancy } from '../lib/useOccupancy.js'
import Legend from './Legend.jsx'
import 'leaflet/dist/leaflet.css'

// Brand color scheme (BC Theme - exact hex values)
const COLORS = {
  burgundy: '#7B1E28',      // Occupied
  gold: '#D39B00',          // Empty  
  white: '#FFFFFF',         // Room/surfaces
  ink: '#111827',           // Text
  gray: '#9CA3AF',          // Unknown
  ivoryWhite: '#FFFEF7',    // UI surfaces
  brightGreen: '#00FF00',   // Status indicators
  darkGray: '#404040'       // Current occupied (will be replaced)
}

// Helper function to darken color by 10%
const darkenColor = (color, percent = 10) => {
  const hex = color.replace('#', '')
  const r = parseInt(hex.substr(0, 2), 16)
  const g = parseInt(hex.substr(2, 2), 16)
  const b = parseInt(hex.substr(4, 2), 16)
  
  const newR = Math.max(0, Math.floor(r * (1 - percent / 100)))
  const newG = Math.max(0, Math.floor(g * (1 - percent / 100)))
  const newB = Math.max(0, Math.floor(b * (1 - percent / 100)))
  
  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`
}

// Status to color mapping (BC Theme)
const colorFor = (status) => {
  switch (status) {
    case 'occupied': return COLORS.darkGray // Keep current dark gray for now
    case 'free': 
    case 'empty': return COLORS.brightGreen // Keep current bright green for now
    case 'unknown': 
    default: return COLORS.gray
  }
}

const strokeColorFor = (status) => {
  return darkenColor(colorFor(status), 10)
}

const opacityFor = (confidence) => {
  return Math.max(0.3, Math.min(1.0, 0.3 + (confidence || 0.5) * 0.7))
}

// Component to handle map bounds and initialization
function MapBounds({ room }) {
  const map = useMap()
  
  useEffect(() => {
    const bounds = L.latLngBounds(
      L.latLng(0, 0),
      L.latLng(room.size.h, room.size.w)
    )
    // Only fit bounds once on initial load, don't keep recentering
    map.fitBounds(bounds, { animate: false })
    // Set max bounds but with viscosity 0.5 to allow some flexibility
    map.setMaxBounds(bounds.pad(0.1))
  }, []) // Empty dependency array - only run once on mount
  
  return null
}

// Component to render the white room rectangle
function RoomBackground({ room }) {
  const roomPolygon = [
    [0, 0],
    [0, room.size.w],
    [room.size.h, room.size.w],
    [room.size.h, 0]
  ]
  
  return (
    <Polygon
      positions={roomPolygon}
      pathOptions={{
        fillColor: COLORS.white,
        fillOpacity: 1,
        color: darkenColor(COLORS.burgundy, 10),
        weight: 2,
        opacity: 0.3
      }}
      pane="shadowPane"
    />
  )
}

// Component to render a 4x4 grid of labeled squares (4 columns, 4 rows)
function GridSquares() {
  const squareSize = 1200 // Size of each square (must match gridSquareSize in defaultRoom.js) - MUCH bigger
  const startX = 0 // Start at map origin
  const startY = 0 // Start at map origin
  const cols = 4 // 4 columns (left to right) - expanded to include sections 9 and 10
  const rows = 4 // 4 rows (top to bottom)
  
  const squares = []
  let label = 1
  
  // Sections to make gray (no labels)
  const graySections = [3, 4, 7, 8, 11, 12]
  
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = startX + (col * squareSize)
      const y = startY + (row * squareSize)
      
      // Rectangle bounds: [[y1, x1], [y2, x2]]
      const bounds = [
        [y, x],
        [y + squareSize, x + squareSize]
      ]
      
      const isGray = graySections.includes(label)
      
      squares.push(
        <Rectangle
          key={`square-${label}`}
          bounds={bounds}
          pathOptions={{
            fillColor: isGray ? COLORS.gray : COLORS.white,
            fillOpacity: 1,
            color: '#000000', // Black lines
            weight: 2,
            opacity: 1
          }}
          pane="overlayPane" // Render above the room background
        >
          {!isGray && (
            <Tooltip 
              permanent 
              direction="center" 
              className="grid-label-tooltip"
              opacity={1}
            >
              <div style={{ 
                color: COLORS.ink, 
                fontSize: '24px', 
                fontWeight: 'bold',
                textAlign: 'center'
              }}>
                {label}
              </div>
            </Tooltip>
          )}
        </Rectangle>
      )
      label++
    }
  }
  
  return <>{squares}</>
}

export default function FloorMap() {
  const [room, setRoom] = useState(defaultRoom)
  const [tables, setTables] = useState({})
  const layersRef = useRef({ tables: new Map(), seats: new Map() })
  
  // Use the API hook to fetch occupancy data
  const { data: apiData, loading, error } = useOccupancy('lib_1', 3000)
  const [isConnected, setIsConnected] = useState(true)

  // Update tables when API data arrives
  useEffect(() => {
    if (apiData && apiData.tablesById) {
      // Transform API data format to match our table state format
      const transformedTables = {}
      Object.entries(apiData.tablesById).forEach(([id, tableData]) => {
        transformedTables[id] = {
          status: tableData.occupied ? 'occupied' : 'free',
          confidence: tableData.conf
        }
      })
      setTables(transformedTables)
      setIsConnected(true)
      
      // Update existing layers with new styles
      Object.entries(transformedTables).forEach(([id, state]) => {
        const layer = layersRef.current.tables.get(id)
        if (layer) {
          const fillColor = colorFor(state.status)
          const strokeColor = strokeColorFor(state.status)
          const opacity = opacityFor(state.confidence)
          
          layer.setStyle({
            fillColor,
            color: strokeColor,
            fillOpacity: opacity
          })
        }
      })
    }
  }, [apiData])

  // Handle loading and error states
  useEffect(() => {
    if (error) {
      console.error('Error fetching occupancy data:', error)
      setIsConnected(false)
      // Fallback to mock data on error
      setTables(mockOccupancyData.tables)
    }
  }, [error])

  const renderTable = (table) => {
    console.log(tables);
    const state = tables[table.id]
    console.log(state)
    const status = state?.status || 'unknown'
    const confidence = state?.confidence || 0.5
    const fillColor = colorFor(status)
    const strokeColor = strokeColorFor(status)
    const opacity = opacityFor(confidence)
    const tooltip = `${table.id}: ${status} (${Math.round(confidence * 100)}%)`

    // Convert pixel coordinates to Leaflet coordinates [lat, lng] = [y, x]
    const center = [table.center[1], table.center[0]]
    
    return (
      <Circle
        key={table.id}
        center={center}
        radius={table.radius}
        pathOptions={{
          fillColor,
          fillOpacity: opacity,
          color: strokeColor,
          weight: 2
        }}
        eventHandlers={{
          add: (e) => {
            layersRef.current.tables.set(table.id, e.target)
          }
        }}
      >
        <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
          <div style={{ color: COLORS.ink }}>
            <strong>{table.id}</strong><br/>
            {status} ({Math.round(confidence * 100)}%)
          </div>
        </Tooltip>
      </Circle>
    )
  }

  const renderSeat = (seat) => {
    const tooltip = `Chair: ${seat.id}`
    
    // Fixed burgundy color for all chairs
    const chairColor = '#4f0f12'
    const chairStroke = darkenColor(chairColor, 10)
    
    // Convert chair polygon coordinates to Leaflet format [lat, lng] = [y, x]
    // Create a simple square around the seat position
    const half = seat.size / 2
    const seatPolygon = [
      [seat.y - half, seat.x - half],
      [seat.y - half, seat.x + half],
      [seat.y + half, seat.x + half],
      [seat.y + half, seat.x - half]
    ]
    
    return (
      <Polygon
        key={seat.id}
        positions={seatPolygon}
        pathOptions={{
          fillColor: chairColor,
          fillOpacity: 1,
          color: chairStroke,
          weight: 1.5
        }}
        eventHandlers={{
          add: (e) => {
            layersRef.current.seats.set(seat.id, e.target)
          }
        }}
      >
        <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
          <div style={{ color: COLORS.ink }}>
            <strong>{tooltip}</strong>
          </div>
        </Tooltip>
      </Polygon>
    )
  }

  return (
    <div className="w-full">
      <div 
        className="rounded-lg shadow-sm p-6"
        style={{
          backgroundColor: COLORS.ivoryWhite,
          border: `3px solid ${COLORS.gold}`,
          boxShadow: `0 0 0 1px ${COLORS.gold}, 0 4px 12px rgba(211, 155, 0, 0.3)`
        }}
      >
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: COLORS.ink }}>
              {room.name}
            </h1>
            <div className="mt-2">
              <select 
                className="px-3 py-1 rounded border text-sm"
                style={{ 
                  borderColor: COLORS.gold,
                  backgroundColor: COLORS.ivoryWhite,
                  color: COLORS.ink
                }}
              >
                <option value="1">Floor 1</option>
                <option value="2">Floor 2</option>
                <option value="3">Floor 3</option>
                <option value="4">Floor 4</option>
                <option value="5">Floor 5</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Legend />
            <div 
              className="px-3 py-1 rounded-full text-xs font-medium text-white"
              style={{ 
                backgroundColor: COLORS.brightGreen,
                boxShadow: `0 0 0 2px ${COLORS.gold}40`
              }}
            >
              {isConnected ? 'Live' : 'Disconnected'}
            </div>
          </div>
        </div>
        
        <div 
          className="w-full rounded-lg overflow-hidden"
          style={{ 
            backgroundColor: COLORS.ivoryWhite,
            height: '600px',
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(17, 24, 39, 0.08) 0px, rgba(17, 24, 39, 0.08) 1px, transparent 1px, transparent 40px),
              repeating-linear-gradient(90deg, rgba(17, 24, 39, 0.08) 0px, rgba(17, 24, 39, 0.08) 1px, transparent 1px, transparent 40px)
            `,
            backgroundSize: '40px 40px'
          }}
        >
          <MapContainer
            crs={L.CRS.Simple}
            center={[room.size.h / 2, room.size.w / 2]}
            zoom={0}
            style={{ height: '100%', width: '100%', background: 'transparent' }}
            zoomControl={true}
            dragging={true}
            touchZoom={true}
            doubleClickZoom={true}
            scrollWheelZoom={true}
            boxZoom={true}
            keyboard={true}
            zoomSnap={0.25}
            zoomDelta={0.5}
            minZoom={-3}
            maxZoom={5}
            preferCanvas={true}
            maxBoundsViscosity={0.5}
          >
            <MapBounds room={room} />
            
            {/* 2x4 Grid of labeled squares - this IS the room */}
            <GridSquares />
            
            {/* Tables */}
            {room.tables.map(table => renderTable(table))}
            
            {/* Seats */}
            {room.seats.map(seat => renderSeat(seat))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
