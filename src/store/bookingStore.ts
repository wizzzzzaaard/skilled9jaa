import { create } from "zustand";
import type { BookingType } from "@/types/booking";

interface BookingState {
  // Flow state
  currentStep: number;
  selectedProviderId: string | null;
  selectedServiceId: string | null;
  selectedLocationId: string | null;
  bookingType: BookingType;
  scheduledDate: string | null;
  scheduledTime: string | null;
  eventAddress: string | null;
  eventState: string | null;
  eventCity: string | null;
  description: string | null;
  totalAmount: number;
  
  setCurrentStep: (step: number) => void;
  setSelectedProviderId: (id: string | null) => void;
  setSelectedServiceId: (id: string | null) => void;
  setSelectedLocationId: (id: string | null) => void;
  setBookingType: (type: BookingType) => void;
  setScheduledDate: (date: string | null) => void;
  setScheduledTime: (time: string | null) => void;
  setEventAddress: (address: string | null) => void;
  setEventState: (state: string | null) => void;
  setEventCity: (city: string | null) => void;
  setDescription: (desc: string | null) => void;
  setTotalAmount: (amount: number) => void;
  reset: () => void;
}

const initialState = {
  currentStep: 0,
  selectedProviderId: null,
  selectedServiceId: null,
  selectedLocationId: null,
  bookingType: "at_home" as BookingType,
  scheduledDate: null,
  scheduledTime: null,
  eventAddress: null,
  eventState: null,
  eventCity: null,
  description: null,
  totalAmount: 0,
};

export const useBookingStore = create<BookingState>((set) => ({
  ...initialState,

  setCurrentStep: (currentStep) => set({ currentStep }),
  setSelectedProviderId: (selectedProviderId) => set({ selectedProviderId }),
  setSelectedServiceId: (selectedServiceId) => set({ selectedServiceId }),
  setSelectedLocationId: (selectedLocationId) => set({ selectedLocationId }),
  setBookingType: (bookingType) => set({ bookingType }),
  setScheduledDate: (scheduledDate) => set({ scheduledDate }),
  setScheduledTime: (scheduledTime) => set({ scheduledTime }),
  setEventAddress: (eventAddress) => set({ eventAddress }),
  setEventState: (eventState) => set({ eventState }),
  setEventCity: (eventCity) => set({ eventCity }),
  setDescription: (description) => set({ description }),
  setTotalAmount: (totalAmount) => set({ totalAmount }),
  reset: () => set(initialState),
}));
