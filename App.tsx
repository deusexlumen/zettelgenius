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

  // Initial Load
  useEffect(() => {
    const loadedNotes = storage.getNotes();
    setNotes(loadedNotes);
    if (loadedNotes.length > 0 && !activeNoteId) {
      setActiveNoteId(loadedNotes[0].id);
    }
  }, []);

  const handleUpdateNote = (updatedNote: Note) => {
    // 1. Save to Disk immediately
    const newNotes = storage.saveNote(updatedNote);
    // 2. Update State
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
    setViewMode(AppView.EDITOR);
  };

  // --- Die neue Hyperlink-Engine ---
  const handleWikiLink = (title: string) => {
    const targetNote = notes.find(n => n.title.toLowerCase() === title.toLowerCase());
    if (targetNote) {
        setActiveNoteId(targetNote.id);
        setViewMode(AppView.EDITOR); // Switch back to editor if in graph
    } else {
        // Optional: Create draft if not exists? For now just alert or ignore.
        alert(`Notiz "${title}" nicht gefunden.`);
    }
  };

  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0];

  return (
    <div className="flex h-screen w-screen bg-[#020617] text-slate-200 font-sans overflow-hidden selection:bg-indigo-500/30 selection:text-indigo-200">
      
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        onSelectNote={(id) => {
            setActiveNoteId(id);
            if (viewMode === AppView.GRAPH) setViewMode(AppView.EDITOR);
        }}
        onCreateNote={handleCreateNote}
        onToggleView={() => setViewMode(viewMode === AppView.EDITOR ? AppView.GRAPH : AppView.EDITOR)}
        viewMode={viewMode === AppView.EDITOR ? 'EDITOR' : 'GRAPH'}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      <main className="flex-1 h-full relative flex flex-col bg-[#020617] shadow-2xl z-10 overflow-hidden">
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
               key={activeNote.id} 
               note={activeNote}
               allNotes={notes}
               onUpdate={handleUpdateNote}
               onWikiLink={handleWikiLink} // Pass the handler
             />
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-6 animate-in fade-in zoom-in-95 duration-500">
               <div className="text-center space-y-2">
                 <p className="text-xl font-medium text-slate-400">System Ready</p>
                 <p className="text-sm text-slate-600">Select a node to edit or create a new entry.</p>
               </div>
               <button 
                 onClick={handleCreateNote} 
                 className="px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20 active:scale-95"
               >
                 Initialize New Entry
               </button>
             </div>
           )
        )}
      </main>
    </div>
  );
};

export default App;