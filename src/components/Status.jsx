import { useState, useEffect } from 'react'
import { defaultRoom, mockOccupancyData } from '../lib/defaultRoom.js'
import { useOccupancy } from '../lib/useOccupancy.js'

// Brand color scheme
const COLORS = {
  burgundy: '#7B1E28',
  gold: '#D39B00',
  white: '#FFFFFF',
  ink: '#111827',
  gray: '#9CA3AF',
  brightGreen: '#00FF00',
  darkGray: '#404040'
}

// Status to color mapping
const colorFor = (status) => {
  switch (status) {
    case 'occupied': return COLORS.darkGray
    case 'free': 
    case 'empty': return COLORS.brightGreen
    case 'unknown': 
    default: return COLORS.gray
  }
}

export default function Status() {
  const [room] = useState(defaultRoom)
  const [tables, setTables] = useState({})
  const [isConnected, setIsConnected] = useState(true)

  // Use the API hook to fetch occupancy data
  const { data: apiData, loading, error } = useOccupancy('lib_1', 3000)

  // Update tables when API data arrives
  useEffect(() => {
    if (apiData && apiData.tablesById) {
      const transformedTables = {}
      Object.entries(apiData.tablesById).forEach(([id, tableData]) => {
        transformedTables[id] = {
          status: tableData.occupied ? 'occupied' : 'free',
          confidence: tableData.conf
        }
      })
      setTables(transformedTables)
      setIsConnected(true)
    }
  }, [apiData])

  // Handle error states
  useEffect(() => {
    if (error) {
      console.error('Error fetching occupancy data:', error)
      setIsConnected(false)
      setTables(mockOccupancyData.tables)
    }
  }, [error])

  return (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl w-full">
        {/* Header with connection status */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: COLORS.ink }}>
              {room.name}
            </h1>
            <p className="text-sm mt-1" style={{ color: COLORS.gray }}>
              {room.tables.length} tables
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span style={{ color: COLORS.gray }}>
              {isConnected ? 'Live' : 'Disconnected'}
            </span>
          </div>
        </div>

        {/* Table List View */}
        <div className="bg-gray-50 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Object.entries(tables).map(([tableId, tableData]) => {
              const status = tableData.status || 'unknown'
              const confidence = tableData.confidence || 0.5
              
              return (
                <div 
                  key={tableId}
                  className="bg-white rounded-lg p-4 shadow-sm border-2 transition-all hover:shadow-md"
                  style={{ borderColor: colorFor(status) }}
                >
                  {/* Table ID Header */}
                  <div className="flex items-center gap-3 mb-3">
                    <div 
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: colorFor(status) }}
                    />
                    <h3 className="font-bold text-lg" style={{ color: COLORS.ink }}>
                      {tableId}
                    </h3>
                  </div>
                  
                  {/* Status */}
                  <div className="mb-2">
                    <span 
                      className="text-sm font-medium px-3 py-1 rounded-full"
                      style={{ 
                        backgroundColor: colorFor(status),
                        color: 'white',
                        opacity: 0.9
                      }}
                    >
                      {status.toUpperCase()}
                    </span>
                  </div>
                  
                  {/* Confidence */}
                  <div className="text-xs" style={{ color: COLORS.gray }}>
                    Confidence: {Math.round(confidence * 100)}%
                  </div>
                  
                  {/* Confidence bar */}
                  <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full transition-all duration-300"
                      style={{ 
                        width: `${confidence * 100}%`,
                        backgroundColor: colorFor(status)
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Show message if no tables */}
          {Object.keys(tables).length === 0 && (
            <div className="text-center py-12">
              <p style={{ color: COLORS.gray }}>
                {loading ? 'Loading...' : 'No tables found'}
              </p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-6 flex justify-center gap-8">
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: colorFor('occupied') }}
            />
            <span style={{ color: COLORS.ink }}>Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: colorFor('free') }}
            />
            <span style={{ color: COLORS.ink }}>Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div 
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: colorFor('unknown') }}
            />
            <span style={{ color: COLORS.ink }}>Unknown</span>
          </div>
        </div>
      </div>
    </div>
  )
}