import { ChartPie, Mic, Image as ImageIcon, Search, Sparkles } from 'lucide-react';

export const AI_MODELS = {
  RESEARCH: 'gemini-2.5-flash',
  IMAGE: 'gemini-3-pro-preview',
  AUDIO: 'gemini-2.5-flash',
  GENERAL: 'gemini-2.5-flash', // Fast generic tasks
  COMPLEX: 'gemini-3-pro-preview',
};

export const INITIAL_NOTE_CONTENT = `# Welcome to ZettelGenius

This is a Zettelkasten-style note-taking app enhanced with Gemini AI.

## Features
- **Smart Links**: Use [[WikiLink]] syntax to connect notes.
- **Graph View**: Visualize your knowledge network.
- **AI Research**: Use Google Search to ground your notes.
- **Media**: Transcribe audio and analyze images directly into your notes.

Start by creating a new note or editing this one!
`;
