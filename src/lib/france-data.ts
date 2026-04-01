export interface PrixEntry {
  nom: string;
  maj: string;
  valeur: number;
}

export interface FrenchStation {
  id: string;
  cp: string;
  pop: string;
  adresse: string;
  ville: string;
  services: string[];
  prix: PrixEntry[];
}

export async function fetchFrenchPrices(city: string = "Paris"): Promise<FrenchStation[]> {
  const url = `https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/prix-des-carburants-en-france-flux-instantane-v2/records?limit=20&where=ville='${city.toUpperCase()}'`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.results) {
      return data.results.map((r: Record<string, unknown>) => ({
        id: r.id,
        cp: r.cp,
        pop: r.pop,
        adresse: r.adresse,
        ville: r.ville,
        services: r.services ? JSON.parse((r.services as string).replace(/'/g, '"')) : [],
        prix: r.prix ? JSON.parse((r.prix as string).replace(/'/g, '"')) : []
      }));
    }
    return [];
  } catch (error) {
    console.error("France Open Data API Error:", error);
    return [];
  }
}
