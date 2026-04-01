"use client";

import { useState, useCallback } from "react";

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
  granted: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null, lng: null, error: null, loading: false, granted: false,
  });

  const request = useCallback(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setState(s => ({ ...s, error: "Geolocation not supported in this browser." }));
      return;
    }
    setState(s => ({ ...s, loading: true, error: null }));
    navigator.geolocation.getCurrentPosition(
      (pos) => setState({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        error: null,
        loading: false,
        granted: true,
      }),
      (err) => setState(s => ({
        ...s,
        error: err.code === 1 ? "Location permission denied." : "Could not get location.",
        loading: false,
        granted: false,
      })),
      { timeout: 10_000, maximumAge: 300_000 }
    );
  }, []);

  return { ...state, request };
}
