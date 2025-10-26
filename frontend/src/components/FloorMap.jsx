import { useState, useEffect, useRef } from 'react'
import { MapContainer, Circle, Polygon, Tooltip, useMap, ImageOverlay, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import { defaultRoom, mockOccupancyData } from '../lib/mapped_buildings/245beacon/level2.js'
import { useOccupancy } from '../lib/useOccupancy.js'
import Legend from './Legend.jsx'
import 'leaflet/dist/leaflet.css'


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

// Status to color mapping
const colorFor = (status) => {
  switch (status) {
    case 'occupied': return COLORS.burgundy
    case 'free': 
    case 'empty': return COLORS.brightGreen 
    case 'unknown': 
    default: return COLORS.gray
  }
}

const strokeColorFor = (status) => {
  return darkenColor(colorFor(status), 10)
}

const opacityFor = (confidence) => { //note: we don't adjust opacity based on confidence for now
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

// Image overlay for the floorplan background spanning the room bounds
function FloorplanLayer({ room, url = '/level2.jpg', opacity = 1 }) {
  const bounds = [
    [0, 0],
    [room.size.h, room.size.w]
  ]
  return (
    <ImageOverlay url={url} bounds={bounds} opacity={opacity} pane="tilePane" />
  )
}

// Simple helper to log click coordinates (y, x) to the console for mapping
function CoordinateHelper() {
  useMapEvents({
    click: (e) => {
      const { lat, lng } = e.latlng
      // Leaflet CRS.Simple uses [lat, lng] as [y, x]
      // eslint-disable-next-line no-console
      console.log(`Clicked at pixel coords -> x: ${lng.toFixed(1)}, y: ${lat.toFixed(1)}`)
    }
  })
  return null
}

export default function FloorMap() {
  const [room, setRoom] = useState(defaultRoom)
  const [selectedFloor, setSelectedFloor] = useState('level2')
  const [tables, setTables] = useState(mockOccupancyData.tables) // Initialize with mock data
  const layersRef = useRef({ tables: new Map(), seats: new Map() })
  
  //floors available in this building
  const floors = [
    { id: 'level2', label: defaultRoom.name, room: defaultRoom }
  ]
  
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
          status: tableData.occupied ? 'occupied' : 'free'
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
          const opacity = opacityFor(state.confidence) //note: we don't adjust opacity based on confidence for now
          
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
    const state = tables[table.id]
    const status = state?.status || 'unknown'
    const confidence = state?.confidence || 0.5 //note: we don't adjust opacity based on confidence for now
    const fillColor = colorFor(status)
    const strokeColor = strokeColorFor(status)
    const opacity = opacityFor(confidence) //note: we don't adjust opacity based on confidence for now

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
          </div>
        </Tooltip>
      </Circle>
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
              {room.building_id}
            </h1>
            <div className="mt-2">
              <select 
                className="px-3 py-1 rounded border text-sm"
                value={selectedFloor}
                style={{ 
                  borderColor: COLORS.gold,
                  backgroundColor: COLORS.ivoryWhite,
                  color: COLORS.ink
                }}
                onChange={(e) => {
                  const id = e.target.value
                  setSelectedFloor(id)
                  const f = floors.find(fl => fl.id === id)
                  if (f) setRoom(f.room)
                }}
              >
                {floors.map(f => (
                  <option key={f.id} value={f.id}>{f.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Legend />
            <div 
              className="px-3 py-1 rounded-full text-xs font-medium"
              style={{ 
                backgroundColor: isConnected ? COLORS.brightGreen : COLORS.gray,
                color: COLORS.white,
                boxShadow: `0 0 0 2px ${COLORS.gold}40`,
                opacity: 1
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
            <CoordinateHelper />
            
            {/* Floorplan image spanning the full room */}
            <FloorplanLayer room={room} url={room.floorplan || '/level2.jpg'} />
            
            {/* Tables */}
            {room.tables.map(table => renderTable(table))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
