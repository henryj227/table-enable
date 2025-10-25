# API Integration Test Guide

## ✅ Integration Complete!

The pulled code from the repository has been successfully integrated into your application. All visuals remain unchanged, but the data management system now uses the API-based polling system.

## What Changed:

### 1. **FloorMap Component** (`src/components/FloorMap.jsx`)

- ✅ Now imports and uses `useOccupancy` hook
- ✅ Fetches data from `/mock/occupancy.json` every 3 seconds
- ✅ Transforms API data format to match your existing visual components
- ✅ Falls back to static mock data if API fails
- ✅ All visuals remain identical

### 2. **Data Flow**

```
API Hook (useOccupancy)
  → Fetches /mock/occupancy.json every 3s
  → Transforms: { occupied: true, conf: 0.92 }
  → Into: { status: 'occupied', confidence: 0.92 }
  → Updates table visualization
```

## How to Test:

### Test 1: Check if API is accessible

Open in browser:

```
http://localhost:5173/mock/occupancy.json
```

✅ You should see JSON data with table "t1"

### Test 2: Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. You should NOT see any errors
4. Go to Network tab
5. Look for requests to `occupancy.json` every 3 seconds

### Test 3: Verify Live Updates

1. Open your browser at `http://localhost:5173`
2. Open the `public/mock/occupancy.json` file in your editor
3. Change the data:

```json
{
  "room_id": "lib_1",
  "updated_at": 1730174400,
  "tables": [{ "id": "t1", "occupied": false, "conf": 0.85 }]
}
```

4. Save the file
5. Within 3 seconds, the table color should change from dark gray (occupied) to bright green (free)

### Test 4: Check Error Handling

1. Rename `public/mock/occupancy.json` to `public/mock/occupancy.json.bak`
2. Refresh the browser
3. The status should show "Disconnected"
4. The app should fall back to static mock data (won't crash)
5. Rename the file back to test recovery

## Features:

✅ **Auto-polling**: Data updates every 3 seconds automatically
✅ **Error handling**: Falls back to mock data if API fails
✅ **Status indicator**: "Live" when connected, "Disconnected" on error
✅ **Data transformation**: Converts API format to your visual format
✅ **Zero visual changes**: All UI remains exactly the same

## API Data Format:

The API expects this format (from repository):

```json
{
  "room_id": "lib_1",
  "updated_at": 1730174400,
  "tables": [{ "id": "t1", "occupied": true, "conf": 0.92 }]
}
```

This gets transformed to:

```javascript
{
  t1: { status: 'occupied', confidence: 0.92 }
}
```

## Backend Integration (Future):

When you're ready to connect to the real backend:

1. Update `public/mock/occupancy.json` with real-time data, OR
2. Modify `src/lib/api.js` to fetch from your backend endpoint
3. The rest of the system will work automatically!

## Current Status:

✅ API integration complete
✅ Polling working (every 3s)
✅ Data transformation working
✅ Error handling implemented
✅ Fallback to static data working
✅ All visuals unchanged
