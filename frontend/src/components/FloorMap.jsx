import { useState, useEffect, useRef } from 'react'
import { MapContainer, Circle, Tooltip, useMap, ImageOverlay } from 'react-leaflet'
import L from 'leaflet'
import { defaultRoom, mockOccupancyData } from '../lib/mapped_buildings/245beacon/level2.js'
import { useOccupancy } from '../lib/useOccupancy.js'
import Legend from './Legend.jsx'
import 'leaflet/dist/leaflet.css'


const COLORS = {
  burgundy: '#7B1E28',
  burgundyDark: '#6e1b24',
  gold: '#D39B00',
  white: '#FFFFFF',
  ink: '#111827',
  gray: '#9CA3AF',
  grayDark: '#8c939e',
  ivoryWhite: '#FFFEF7',
  brightGreen: '#00FF00',
  brightGreenDark: '#00e600'
}

// color mapping
const colorFor = (status) => {
  switch (status) {
    case 'occupied': return COLORS.burgundy
    case 'free': 
    case 'empty': return COLORS.brightGreen 
    default: return COLORS.gray
  }
}

const strokeColorFor = (status) => {
  switch (status) {
    case 'occupied': return COLORS.burgundyDark
    case 'free': 
    case 'empty': return COLORS.brightGreenDark
    default: return COLORS.grayDark
  }
}

// map bounds and initialization
function MapBounds({ room }) {
  const map = useMap()
  
  useEffect(() => {
    const bounds = L.latLngBounds(
      L.latLng(0, 0),
      L.latLng(room.size.h, room.size.w)
    )
    // remove recentering
    map.fitBounds(bounds, { animate: false })
    // Set max bounds with flexibility
    map.setMaxBounds(bounds.pad(0.1))
  }, [])
  return null
}

// blueprint overlay
function FloorplanLayer({ room, url = '/level2.jpg', opacity = 1 }) {
  const bounds = [
    [0, 0],
    [room.size.h, room.size.w]
  ]
  return (
    <ImageOverlay url={url} bounds={bounds} opacity={opacity} pane="tilePane" />
  )
}

export default function FloorMap() {
  const [tables, setTables] = useState(mockOccupancyData.tables) // Initialize with mock data
  const layersRef = useRef({ tables: new Map() })
  
  // fetch occupancy data
  const { data: apiData, loading, error } = useOccupancy('camera_1', 3000)
  const [isConnected, setIsConnected] = useState(true)

  // update tables when API data arrives
  useEffect(() => {
    if (apiData && apiData.tablesById) {
      // matching api data format
      const transformedTables = {}
      Object.entries(apiData.tablesById).forEach(([id, tableData]) => {
        transformedTables["table_" + id.slice(5)] = {
          status: tableData.occupied ? 'occupied' : 'free'
        }
      })
      setTables(transformedTables)
      setIsConnected(true)
      
      // live update with real data
      Object.entries(transformedTables).forEach(([id, state]) => {
        const layer = layersRef.current.tables.get(id)
        if (layer) {
          const fillColor = colorFor(state.status)
          const strokeColor = strokeColorFor(state.status)
          
          layer.setStyle({
            fillColor,
            color: strokeColor,
            fillOpacity: 1
          })
        }
      })
    }
  }, [apiData])

  useEffect(() => {
    if (error) {
      console.error('Error fetching occupancy data:', error)
      setIsConnected(false)
      // Ffallback
      setTables(mockOccupancyData.tables)
    }
  }, [error])

  const renderTable = (table) => {
    const state = tables[table.id]
    const status = state?.status || 'unknown'
    const fillColor = colorFor(status)
    const strokeColor = strokeColorFor(status)

    // pixel to leaflet cords
    const center = [table.center[1], table.center[0]]
    
    return (
      // tables
      <Circle
        key={table.id}
        center={center}
        radius={table.radius}
        pathOptions={{
          fillColor,
          fillOpacity: 1,
          color: strokeColor,
          weight: 2
        }}
        eventHandlers={{
          add: (e) => {
            layersRef.current.tables.set(table.id, e.target) // set to map
          }
        }}
      >
        <Tooltip direction="top" offset={[0, -10]} opacity={0.9}>
          <div style={{ color: COLORS.ink }}>
            <strong>{table.id}</strong><br/>
            <strong>{status}</strong><br/>
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
              {defaultRoom.building_id}
            </h1>
            <p className="text-sm mt-1" style={{ color: COLORS.gray }}>
              {defaultRoom.name}
            </p>
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
            center={[defaultRoom.size.h / 2, defaultRoom.size.w / 2]}
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
            <MapBounds room={defaultRoom} />
            
            {/* Floorplan image spanning the full room */}
            <FloorplanLayer room={defaultRoom} url={defaultRoom.floorplan} />
            
            {/* Tables */}
            {defaultRoom.tables.map(table => renderTable(table))}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
