import { Note } from '../types';
import { INITIAL_NOTE_CONTENT } from '../constants';

const STORAGE_KEY = 'zettel_genius_notes_v1';

export const getNotes = (): Note[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    const initialNote: Note = {
      id: crypto.randomUUID(),
      title: 'Welcome',
      content: INITIAL_NOTE_CONTENT,
      tags: ['intro', 'guide'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([initialNote]));
    return [initialNote];
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error('Failed to parse notes', e);
    return [];
  }
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
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
  return newNotes;
};

export const deleteNote = (id: string): Note[] => {
  const notes = getNotes().filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  return notes;
};
