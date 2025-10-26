
export async function getOccupancy(roomId) {
    const url = import.meta.env?.VITE_OCCUPANCY_URL || `/occupancy.json`;
    console.log(url);
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
    const raw = await res.json();
  
    if (!raw || raw.room_id !== roomId || !Array.isArray(raw.zones)) {
      throw new Error("Bad occupancy payload");
    }
  
    const transformed = {
      roomId: raw.room_id,
      updatedAt: new Date(raw.updated_at * 1000),
      tableIds: raw.zones.map(t => t.id),
      tablesById: Object.fromEntries(
        raw.zones.map(t => [t.id, { occupied: t.occupied, conf: t.conf }])
      ),
    };
  
    return transformed;
  }
  
