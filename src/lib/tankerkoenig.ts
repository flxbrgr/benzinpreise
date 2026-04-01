export interface Station {
  id: string;
  name: string;
  brand: string;
  street: string;
  place: string;
  lat: number;
  lng: number;
  dist: number;
  diesel: number;
  e5: number;
  e10: number;
}

let lastFetchTime: number | null = null;
let cachedStations: Station[] = [];

export async function fetchGermanPrices(lat: number, lng: number, rad: number = 5): Promise<Station[]> {
  // 5-minute Cooldown
  const now = Date.now();
  if (lastFetchTime && (now - lastFetchTime) < 5 * 60 * 1000) {
    console.log("Using cached German prices (5m cooldown)");
    return cachedStations;
  }

  const apiKey = process.env.NEXT_PUBLIC_TANKERKOENIG_API_KEY || "00000000-0000-0000-0000-000000000002"; // Demo Key
  const url = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lng}&rad=${rad}&sort=dist&type=all&apikey=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok) {
      cachedStations = data.stations;
      lastFetchTime = Date.now();
      return data.stations;
    }
    return [];
  } catch (error) {
    console.error("Tankerkönig API Error:", error);
    return [];
  }
}
