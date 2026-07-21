import { create } from 'zustand';

interface NodeConfigState {
  editingConfig: Record<string, any> | null;
  isEditorOpen: boolean;
  startEditing: (initialConfig: Record<string, any>) => void;
  updateField: (key: string, value: any) => void;
  clearEditor: () => void;
}

export const useNodeConfigStore = create<NodeConfigState>((set) => ({
  editingConfig: null,
  isEditorOpen: false,

  startEditing: (initialConfig) => set({
    editingConfig: { ...initialConfig },
    isEditorOpen: true
  }),

  updateField: (key, value) => set((state) => ({
    editingConfig: state.editingConfig ? { ...state.editingConfig, [key]: value } : null
  })),

  clearEditor: () => set((state) => {
    // Explicitly overwrite plaintext values in memory before dropping reference
    if (state.editingConfig) {
      Object.keys(state.editingConfig).forEach((key) => {
        state.editingConfig![key] = null;
        delete state.editingConfig![key];
      });
    }
    return { editingConfig: null, isEditorOpen: false };
  }),
}));