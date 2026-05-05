import { create } from "zustand";

interface LocationState {
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  state: string | null;
  address: string | null;
  permissionStatus: "prompt" | "granted" | "denied" | null;
  isLoading: boolean;
  setLocation: (lat: number, lng: number) => void;
  setCityState: (city: string, state: string) => void;
  setAddress: (address: string) => void;
  setPermissionStatus: (status: "prompt" | "granted" | "denied") => void;
  setIsLoading: (loading: boolean) => void;
  requestLocation: () => Promise<void>;
}

export const useLocationStore = create<LocationState>((set) => ({
  latitude: null,
  longitude: null,
  city: null,
  state: null,
  address: null,
  permissionStatus: null,
  isLoading: false,

  setLocation: (latitude, longitude) => set({ latitude, longitude }),
  setCityState: (city, state) => set({ city, state }),
  setAddress: (address) => set({ address }),
  setPermissionStatus: (permissionStatus) => set({ permissionStatus }),
  setIsLoading: (isLoading) => set({ isLoading }),

  requestLocation: async () => {
    set({ isLoading: true });
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const { latitude, longitude } = position.coords;
      set({
        latitude,
        longitude,
        permissionStatus: "granted",
        isLoading: false,
      });
    } catch {
      // Fallback to Lagos
      set({
        latitude: 6.5244,
        longitude: 3.3792,
        city: "Lagos",
        state: "Lagos",
        permissionStatus: "denied",
        isLoading: false,
      });
    }
  },
}));
