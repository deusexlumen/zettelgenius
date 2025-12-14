import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import NoteEditor from './components/NoteEditor';
import NetworkGraph from './components/NetworkGraph';
import { Note, AppView } from './types';
import * as storage from './services/storageService';

const App: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<AppView>(AppView.EDITOR);
  const [searchTerm, setSearchTerm] = useState('');

  // Load notes on mount
  useEffect(() => {
    const loadedNotes = storage.getNotes();
    setNotes(loadedNotes);
    if (loadedNotes.length > 0 && !activeNoteId) {
      setActiveNoteId(loadedNotes[0].id);
    }
  }, []); // Only run once on mount

  const handleUpdateNote = (updatedNote: Note) => {
    const newNotes = storage.saveNote(updatedNote);
    setNotes(newNotes);
  };

  const handleCreateNote = () => {
    const newNote: Note = {
      id: crypto.randomUUID(),
      title: '',
      content: '',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const newNotes = storage.saveNote(newNote);
    setNotes(newNotes);
    setActiveNoteId(newNote.id);
    setViewMode(AppView.EDITOR); // Switch to editor when creating
  };

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  return (
    <div className="flex h-screen w-screen bg-slate-950 text-slate-200 font-sans overflow-hidden">
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={(id) => {
            setActiveNoteId(id);
            if (viewMode === AppView.GRAPH) {
                setViewMode(AppView.EDITOR); // Auto switch to editor on select
            }
        }}
        onCreateNote={handleCreateNote}
        onToggleView={() => setViewMode(viewMode === AppView.EDITOR ? AppView.GRAPH : AppView.EDITOR)}
        viewMode={viewMode === AppView.EDITOR ? 'EDITOR' : 'GRAPH'}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <main className="flex-1 h-full overflow-hidden relative flex flex-col bg-slate-950 shadow-2xl shadow-black z-10">
        {viewMode === AppView.GRAPH ? (
          <NetworkGraph 
            notes={notes} 
            onNoteClick={(id) => {
                setActiveNoteId(id);
                setViewMode(AppView.EDITOR);
            }} 
          />
        ) : (
           activeNote ? (
             <NoteEditor 
               key={activeNote.id} // Force re-render on switch to ensure state is fresh
               note={activeNote}
               allNotes={notes}
               onUpdate={handleUpdateNote} 
             />
           ) : (
             <div className="flex items-center justify-center h-full text-slate-500 bg-slate-950">
               <div className="text-center">
                 <p className="mb-2">No note selected</p>
                 <button onClick={handleCreateNote} className="text-indigo-400 hover:text-indigo-300 hover:underline">Create a new one</button>
               </div>
             </div>
           )
        )}
      </main>
    </div>
  );
};

export default App;