import { create } from 'zustand'

export interface Tool {
  id: string; title: string; slug: string; description?: string;
  prompt: string; tool_type: string; style: string; html_code: string;
  download_count: number; is_premium: boolean; premium_price?: number;
  user_id?: string; created_at: string;
}

type Step = 'input' | 'generating' | 'preview'

interface ToolState {
  tools: Tool[]; totalCount: number; isLoading: boolean;
  step: Step; generatedHtml: string; generatedTitle: string;
  retryContext: { previousOutput: string; userFeedback: string } | null;
  formData: { prompt: string; toolType: string; style: string; requirements: string };
  currentTool: Tool | null;
  quota: { remainingFree: number } | null;

  setTools: (t: Tool[], n: number) => void;
  setLoading: (v: boolean) => void;
  setStep: (s: Step) => void;
  setGenerated: (html: string, title: string) => void;
  setRetryContext: (c: { previousOutput: string; userFeedback: string } | null) => void;
  setFormData: (d: Partial<ToolState['formData']>) => void;
  setCurrentTool: (t: Tool | null) => void;
  setQuota: (q: { remainingFree: number } | null) => void;
  resetGenerate: () => void;
}

const initForm = { prompt: '', toolType: 'utility', style: 'clean', requirements: '' };

export const useToolStore = create<ToolState>((set) => ({
  tools: [], totalCount: 0, isLoading: false,
  step: 'input', generatedHtml: '', generatedTitle: '', retryContext: null,
  formData: { ...initForm }, currentTool: null, quota: null,

  setTools: (tools, total) => set({ tools, totalCount: total }),
  setLoading: (v) => set({ isLoading: v }),
  setStep: (s) => set({ step: s }),
  setGenerated: (html, title) => set({ generatedHtml: html, generatedTitle: title }),
  setRetryContext: (ctx) => set({ retryContext: ctx }),
  setFormData: (d) => set((s) => ({ formData: { ...s.formData, ...d } })),
  setCurrentTool: (t) => set({ currentTool: t }),
  setQuota: (q) => set({ quota: q }),
  resetGenerate: () => set({ step: 'input', generatedHtml: '', generatedTitle: '', retryContext: null, formData: { ...initForm } })
}))
