import React from 'react';
import { Note } from '../types';
import { Plus, Search, Network, FileText, Hash, Command } from 'lucide-react';

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onCreateNote: () => void;
  onToggleView: () => void;
  viewMode: 'EDITOR' | 'GRAPH';
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onToggleView,
  viewMode,
  searchTerm,
  onSearchChange,
}) => {
  const filteredNotes = notes.filter((note) =>
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <aside className="w-80 bg-[#020617] border-r border-slate-800/60 flex flex-col h-full shrink-0 z-30 shadow-2xl shadow-black/50">
      {/* Header */}
      <div className="p-6 pb-4 shrink-0">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 select-none">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-900/40 ring-1 ring-white/10">
                    <span className="text-white font-bold text-lg font-sans">Z</span>
                </div>
                <h1 className="text-lg font-bold text-slate-100 tracking-tight bg-gradient-to-r from-slate-100 to-slate-400 bg-clip-text text-transparent">
                    ZettelGenius
                </h1>
            </div>
            <button
                onClick={onToggleView}
                className={`p-2 rounded-lg transition-all duration-200 ${
                    viewMode === 'GRAPH' 
                    ? 'bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-500/40' 
                    : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
                title={viewMode === 'GRAPH' ? "Back to Editor" : "View Graph"}
            >
                {viewMode === 'GRAPH' ? <FileText size={18} /> : <Network size={18} />}
            </button>
        </div>

        {/* Primary CTA */}
        <button
          onClick={onCreateNote}
          className="group w-full bg-slate-100 hover:bg-white text-slate-900 px-4 py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm font-bold shadow-lg shadow-slate-900/20 active:scale-[0.98] ring-1 ring-slate-200/50"
        >
          <div className="bg-slate-900/10 rounded-full p-0.5 group-hover:scale-110 transition-transform">
             <Plus size={16} strokeWidth={3} /> 
          </div>
          <span>New Note</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-6 pb-4 shrink-0">
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={16} />
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/50 border border-slate-800/80 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:bg-slate-900 focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all font-medium"
          />
        </div>
      </div>

      {/* Note List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 space-y-1 pb-4">
        {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-600 text-sm animate-in fade-in duration-500">
                <div className="w-12 h-12 rounded-full bg-slate-900/50 flex items-center justify-center mb-3">
                    <Search size={20} className="opacity-40" />
                </div>
                <p>No notes found</p>
            </div>
        ) : (
            filteredNotes.map((note) => {
                const isActive = activeNoteId === note.id;
                return (
                    <button
                        key={note.id}
                        onClick={() => onSelectNote(note.id)}
                        className={`w-full text-left p-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden border ${
                            isActive 
                            ? 'bg-slate-800/40 border-slate-700/50 shadow-md shadow-black/20' 
                            : 'border-transparent hover:bg-slate-800/30 hover:border-slate-800/50'
                        }`}
                    >
                        {isActive && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.6)]"></div>
                        )}
                        <div className={`pl-2 ${isActive ? 'translate-x-0.5' : ''} transition-transform duration-200`}>
                            <h3 className={`font-semibold text-sm truncate mb-1 leading-snug ${isActive ? 'text-indigo-200' : 'text-slate-300 group-hover:text-slate-200'}`}>
                                {note.title || 'Untitled Note'}
                            </h3>
                            <p className={`text-xs truncate font-mono ${isActive ? 'text-indigo-300/60' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                {note.content.slice(0, 60).replace(/[#*`\[\]]/g, '') || 'Empty note...'}
                            </p>
                            {note.tags.length > 0 && (
                                <div className="mt-2.5 flex gap-1.5 flex-wrap">
                                    {note.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className={`text-[10px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-[4px] border transition-colors ${
                                            isActive 
                                            ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-300' 
                                            : 'bg-slate-900/50 border-slate-800 text-slate-500'
                                        }`}>
                                            <Hash size={9} strokeWidth={2.5} /> {tag}
                                        </span>
                                    ))}
                                    {note.tags.length > 3 && (
                                        <span className="text-[10px] text-slate-600 px-1">+{note.tags.length - 3}</span>
                                    )}
                                </div>
                            )}
                        </div>
                    </button>
                );
            })
        )}
      </div>
      
      {/* Footer */}
      <div className="p-4 border-t border-slate-800/60 bg-[#020617] shrink-0">
        <div className="flex items-center justify-between text-[11px] text-slate-600 font-medium font-mono uppercase tracking-wider">
           <span>{notes.length} Notes</span>
           <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50"></div> Local</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;