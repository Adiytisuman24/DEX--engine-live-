import { create } from 'zustand';

interface UIStore {
  selectedOrderIds: string[];
  activeTimelineOrderId: string | null;
  hoveredOrderId: string | null;

  selectOrder: (id: string, multi?: boolean) => void;
  deselectOrder: (id: string) => void;
  setHoveredOrder: (id: string | null) => void;
  clearSelection: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  selectedOrderIds: [],
  activeTimelineOrderId: null,
  hoveredOrderId: null,

  selectOrder: (id, multi = false) =>
    set((s) => {
      // If already selected and single select mode, do nothing explicitly or treating as select
      // But user requested toggle logic potentially or just select.
      // Rules:
      // Single click -> select order + show timeline
      // Ctrl+click -> multi-select (add to list)
      
      let newSelected = multi 
        ? (s.selectedOrderIds.includes(id) ? s.selectedOrderIds : [...s.selectedOrderIds, id])
        : [id];
      
      // If clicking already selected in multi-mode, maybe we want to keep it? 
      // User prompt says 'Click again -> deselect'. 
      // But typically selectOrder is 'ensure selected'. Toggle is separate.
      // Let's implement robust toggle logic if requested, but for now strict select.
      // Wait, "Click again -> deselect" implies toggle behavior for multi-select.
      
      if (multi && s.selectedOrderIds.includes(id)) {
        newSelected = s.selectedOrderIds.filter(oid => oid !== id);
      }

      return {
        selectedOrderIds: newSelected,
        activeTimelineOrderId: id // Timeline always shows last selected/clicked
      };
    }),

  deselectOrder: (id) =>
    set((s) => {
      const newSelected = s.selectedOrderIds.filter(o => o !== id);
      return {
          selectedOrderIds: newSelected,
          activeTimelineOrderId: s.activeTimelineOrderId === id 
            ? (newSelected.length > 0 ? newSelected[newSelected.length - 1] : null) 
            : s.activeTimelineOrderId
      };
    }),

  setHoveredOrder: (id) =>
    set(() => ({ hoveredOrderId: id })),
    
  clearSelection: () => set({ selectedOrderIds: [], activeTimelineOrderId: null })
}));
