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
  isOpen: boolean;
}

export async function fetchGermanPrices(lat: number, lng: number, rad: number = 5): Promise<Station[]> {
  const apiKey = process.env.NEXT_PUBLIC_TANKERKOENIG_API_KEY || "00000000-0000-0000-0000-000000000002"; // Demo Key
  const url = `https://creativecommons.tankerkoenig.de/json/list.php?lat=${lat}&lng=${lng}&rad=${rad}&sort=dist&type=all&apikey=${apiKey}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.ok) {
      return data.stations;
    }
    return [];
  } catch (error) {
    console.error("Tankerkönig API Error:", error);
    return [];
  }
}
