import { create } from "zustand";

interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info" | "warning";
}

interface UIState {
  // Sheet/Modal state
  activeSheet: string | null;
  activeModal: string | null;
  sheetData: Record<string, unknown>;
  
  // Toast notifications
  toasts: Toast[];
  
  // Global loading
  isPageLoading: boolean;
  
  setActiveSheet: (sheet: string | null) => void;
  setActiveModal: (modal: string | null) => void;
  setSheetData: (data: Record<string, unknown>) => void;
  addToast: (message: string, type: Toast["type"]) => void;
  removeToast: (id: string) => void;
  setIsPageLoading: (loading: boolean) => void;
  closeSheet: () => void;
  closeModal: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeSheet: null,
  activeModal: null,
  sheetData: {},
  toasts: [],
  isPageLoading: false,

  setActiveSheet: (activeSheet) => set({ activeSheet }),
  setActiveModal: (activeModal) => set({ activeModal }),
  setSheetData: (sheetData) => set({ sheetData }),
  setIsPageLoading: (isPageLoading) => set({ isPageLoading }),

  addToast: (message, type) => {
    const id = Math.random().toString(36).substring(7);
    set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
    setTimeout(() => {
      set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },

  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  closeSheet: () => set({ activeSheet: null, sheetData: {} }),
  closeModal: () => set({ activeModal: null }),
}));
