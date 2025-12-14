export interface Note {
  id: string;
  title: string;
  content: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface SearchResult {
  text: string;
  sources: { uri: string; title: string }[];
}

export enum AppView {
  EDITOR = 'EDITOR',
  GRAPH = 'GRAPH',
}

export interface AIState {
  isGenerating: boolean;
  error: string | null;
}
