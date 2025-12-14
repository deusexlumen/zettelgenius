import { Note } from '../types';
import { INITIAL_NOTE_CONTENT } from '../constants';

const STORAGE_KEY = 'zettel_genius_notes_v1';

/**
 * Safely parses JSON from local storage.
 * Recovering from data corruption automatically.
 */
const safeParse = (data: string | null): Note[] | null => {
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) throw new Error("Storage is not an array");
    return parsed;
  } catch (e) {
    console.error('Storage corruption detected. Resetting store.', e);
    return null;
  }
};

export const getNotes = (): Note[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  const parsedNotes = safeParse(stored);

  // If storage is empty or corrupt, initialize with Welcome Note
  if (!parsedNotes || parsedNotes.length === 0) {
    const initialNote: Note = {
      id: crypto.randomUUID(),
      title: '👋 Start Hier',
      content: INITIAL_NOTE_CONTENT,
      tags: ['tutorial', 'system'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([initialNote]));
    return [initialNote];
  }

  // Sort by updated time (newest first)
  return parsedNotes.sort((a, b) => b.updatedAt - a.updatedAt);
};

export const saveNote = (updatedNote: Note): Note[] => {
  const notes = getNotes();
  const index = notes.findIndex((n) => n.id === updatedNote.id);
  
  let newNotes: Note[];
  if (index >= 0) {
    newNotes = [...notes];
    newNotes[index] = { ...updatedNote, updatedAt: Date.now() };
  } else {
    newNotes = [updatedNote, ...notes];
  }
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
  } catch (e) {
    alert("Speicher voll! Bitte lösche einige Notizen.");
  }
  return newNotes;
};

export const deleteNote = (id: string): Note[] => {
  const notes = getNotes().filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  return notes;
};

// Emergency Reset Tool (call from console if needed)
export const hardReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    window.location.reload();
};