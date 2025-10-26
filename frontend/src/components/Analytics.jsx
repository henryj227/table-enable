import { useState, useEffect } from 'react'
import { useOccupancy } from '../lib/useOccupancy.js'

export default function Analytics() {
  const COLORS = {
    burgundy: '#7B1E28',
    burgundyLight: '#8B2A35',
    gold: '#D39B00', 
    ivoryWhite: '#FFFEF7',
    ink: '#111827',
    gray: '#9CA3AF',
    brightGreen: '#00FF00',
    darkGray: '#404040'
  }

  // Fetch real-time data for Demo Room
  const { data: demoRoomData, loading, error } = useOccupancy('camera_1', 3000)
  const [lastFetchTime, setLastFetchTime] = useState(new Date())
  const [currentTime, setCurrentTime] = useState(new Date())

  // Update current time every 30 seconds to refresh relative timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 30000) // Update every 30 seconds

    return () => clearInterval(timer)
  }, [])

  // Calculate Demo Room statistics from real data
  const getDemoRoomStats = () => {
    if (!demoRoomData || !demoRoomData.tablesById) {
      return {
        totalTables: 4,
        occupiedTables: 0,
        occupancy: 0,
        status: "unknown"
      }
    }

    const tableIds = Object.keys(demoRoomData.tablesById)
    const totalTables = tableIds.length
    const occupiedTables = tableIds.filter(id => demoRoomData.tablesById[id].occupied).length
    const occupancy = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0
    
    let status = "low"
    if (occupancy >= 75) status = "high"
    else if (occupancy >= 40) status = "moderate"

    return { totalTables, occupiedTables, occupancy, status }
  }

  // Update last fetch time whenever data changes
  useEffect(() => {
    if (demoRoomData && !loading && !error) {
      setLastFetchTime(new Date())
    }
  }, [demoRoomData, loading, error])

  const demoRoomStats = getDemoRoomStats()
  
  // Format timestamp to device local time (uses currentTime to trigger updates)
  const formatTimestamp = (date) => {
    const now = currentTime
    const diff = Math.abs(Math.floor((now - date) / 1000)) // difference in seconds (absolute value)
    
    if (diff < 60) return `${diff} sec ago`
    if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
    return date.toLocaleTimeString()
  }
  
  const lastUpdated = demoRoomData ? formatTimestamp(lastFetchTime) : "N/A"

  // Mock data for building occupancy
  const buildings = [
    {
      name: "Demo Room",
      occupancy: demoRoomStats.occupancy,
      status: demoRoomStats.status,
      totalTables: demoRoomStats.totalTables,
      occupiedTables: demoRoomStats.occupiedTables,
      lastUpdated: loading ? "Loading..." : (error ? "Error" : lastUpdated),
      isLive: true
    },
    {
      name: "Bapst",
      occupancy: 45,
      status: "low",
      totalTables: 18,
      occupiedTables: 8,
      lastUpdated: "1 min ago"
    },
    {
      name: "O'Neil",
      occupancy: 92,
      status: "high",
      totalTables: 32,
      occupiedTables: 29,
      lastUpdated: "3 min ago"
    },
    {
      name: "Gasson",
      occupancy: 67,
      status: "moderate",
      totalTables: 28,
      occupiedTables: 19,
      lastUpdated: "1 min ago"
    }
  ]

  const getStatusColor = (status) => {
    switch (status) {
      case 'high': return COLORS.darkGray
      case 'moderate': return COLORS.gray
      case 'low': return COLORS.brightGreen
      default: return COLORS.gray
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'high': return 'High Occupancy'
      case 'moderate': return 'Moderate Occupancy'
      case 'low': return 'Low Occupancy'
      default: return 'Unknown'
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2" style={{ color: COLORS.ink }}>
          Building Analytics
        </h1>
        <p className="text-sm" style={{ color: COLORS.gray }}>
          Real-time occupancy status across all buildings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {buildings.map((building, index) => (
          <div
            key={index}
            className="rounded-lg p-6 shadow-sm"
            style={{
              backgroundColor: COLORS.ivoryWhite,
              border: `2px solid ${COLORS.gold}`,
              boxShadow: `0 2px 8px rgba(211, 155, 0, 0.2)`
            }}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-xl font-bold" style={{ color: COLORS.ink }}>
                  {building.name}
                </h3>
                {building.isLive && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ 
                    backgroundColor: COLORS.brightGreen, 
                    color: COLORS.ink 
                  }}>
                    LIVE
                  </span>
                )}
              </div>
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getStatusColor(building.status) }}
              ></div>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span style={{ color: COLORS.gray }}>Occupancy Rate</span>
                  <span style={{ color: COLORS.ink }}>{building.occupancy}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full"
                    style={{ 
                      width: `${building.occupancy}%`,
                      backgroundColor: getStatusColor(building.status)
                    }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between text-sm">
                <span style={{ color: COLORS.gray }}>Tables</span>
                <span style={{ color: COLORS.ink }}>
                  {building.occupiedTables}/{building.totalTables}
                </span>
              </div>

              <div className="text-xs" style={{ color: COLORS.gray }}>
                {getStatusText(building.status)}
              </div>

              <div className="text-xs" style={{ color: COLORS.gray }}>
                Updated {building.lastUpdated}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
