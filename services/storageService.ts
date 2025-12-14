import { Note } from '../types';
import { INITIAL_NOTE_CONTENT } from '../constants';

// Wir nutzen einen neuen Key für einen sauberen Neustart
const STORAGE_KEY = 'zettel_genius_v2_db';

export const getNotes = (): Note[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  
  if (!stored) {
    // Erster Start: Willkommens-Notiz anlegen
    const initialNote: Note = {
      id: crypto.randomUUID(),
      title: 'Erste Schritte',
      content: INITIAL_NOTE_CONTENT,
      tags: ['start'],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify([initialNote]));
    return [initialNote];
  }

  try {
    const parsed = JSON.parse(stored);
    // Sicherheitscheck: Ist es ein Array?
    if (Array.isArray(parsed)) {
      // Sortieren: Neueste zuerst
      return parsed.sort((a: Note, b: Note) => b.updatedAt - a.updatedAt);
    }
  } catch (e) {
    console.error("Datenbank Fehler", e);
  }
  
  return []; // Fallback falls alles kaputt ist
};

export const saveNote = (updatedNote: Note): Note[] => {
  // Aktuellen Stand laden
  const notes = getNotes();
  const index = notes.findIndex((n) => n.id === updatedNote.id);
  
  let newNotes: Note[];
  
  if (index >= 0) {
    // Update existierende Notiz
    newNotes = [...notes];
    newNotes[index] = { ...updatedNote, updatedAt: Date.now() };
  } else {
    // Neue Notiz hinzufügen
    newNotes = [updatedNote, ...notes];
  }
  
  // WICHTIG: Sofort speichern
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newNotes));
    console.log("Gespeichert:", updatedNote.title); // Debug Info
  } catch (e) {
    alert("Fehler beim Speichern! Ist der Speicher voll?");
  }
  
  return newNotes;
};

export const deleteNote = (id: string): Note[] => {
  const notes = getNotes().filter((n) => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  return notes;
};