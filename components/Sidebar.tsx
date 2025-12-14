import React from 'react';
import { Note } from '../types';
import { Plus, Search, Network, FileText, Hash, Command, Ghost, Download } from 'lucide-react';

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

  // --- Export Funktion ---
  const handleExport = () => {
    // 1. Daten vorbereiten
    const dataStr = JSON.stringify(notes, null, 2);
    // 2. Blob erstellen (virtuelle Datei)
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    // 3. Download erzwingen
    const link = document.createElement('a');
    link.href = url;
    link.download = `zettelgenius_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    // 4. Aufräumen
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-80 h-full flex flex-col shrink-0 z-30 bg-slate-950 border-r border-white/5 relative overflow-hidden">
      {/* Background Ambient Glow */}
      <div className="absolute top-0 left-0 w-full h-64 bg-indigo-500/5 blur-[80px] pointer-events-none" />

      {/* Header Section */}
      <div className="p-5 shrink-0 relative z-10">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3 select-none group">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.2)] group-hover:shadow-[0_0_20px_rgba(99,102,241,0.4)] transition-all duration-300">
                    <span className="text-indigo-400 font-bold text-lg font-mono">Z</span>
                </div>
                <h1 className="text-sm font-semibold text-slate-200 tracking-wide">
                    Zettel<span className="text-indigo-400">Genius</span>
                </h1>
            </div>
            <button
                onClick={onToggleView}
                className={`p-2 rounded-md transition-all duration-200 active:scale-95 ${
                    viewMode === 'GRAPH' 
                    ? 'bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20' 
                    : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
                title={viewMode === 'GRAPH' ? "Back to Editor" : "View Graph"}
            >
                {viewMode === 'GRAPH' ? <FileText size={16} /> : <Network size={16} />}
            </button>
        </div>

        {/* Primary Action */}
        <button
          onClick={onCreateNote}
          className="w-full group bg-indigo-600 hover:bg-indigo-500 text-white p-3 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-indigo-900/20 active:scale-95 border border-indigo-400/20"
        >
          <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Search Section */}
      <div className="px-5 pb-4 shrink-0 relative z-10">
        <div className="relative group">
          <Search className="absolute left-3 top-2.5 text-slate-500 group-focus-within:text-indigo-400 transition-colors duration-200" size={14} />
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white/5 border border-white/5 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:bg-slate-900/80 focus:border-indigo-500/30 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200 font-medium"
          />
          <div className="absolute right-2 top-2 text-xs text-slate-600 border border-white/5 rounded px-1.5 py-0.5 font-mono pointer-events-none hidden md:block">
            <Command size={10} className="inline mr-0.5" />K
          </div>
        </div>
      </div>

      {/* Scrollable Note List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-1 pb-4 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-600 animate-in fade-in slide-in-from-bottom-2 duration-500">
                <Ghost size={24} className="mb-3 opacity-20" />
                <p className="text-xs font-medium">No notes found</p>
            </div>
        ) : (
            filteredNotes.map((note) => {
                const isActive = activeNoteId === note.id;
                return (
                    <button
                        key={note.id}
                        onClick={() => onSelectNote(note.id)}
                        className={`w-full text-left p-3 rounded-lg transition-all duration-200 group relative border ${
                            isActive 
                            ? 'bg-indigo-500/10 border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]' 
                            : 'bg-transparent border-transparent hover:bg-white/[0.02] hover:border-white/5'
                        } active:scale-[0.98]`}
                    >
                        {isActive && (
                            <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-indigo-500 rounded-r-full shadow-[0_0_8px_#6366f1]" />
                        )}

                        <div className={`flex flex-col gap-1 ${isActive ? 'pl-2' : ''} transition-all duration-200`}>
                            <div className="flex items-center justify-between w-full">
                                <h3 className={`font-medium text-sm truncate ${isActive ? 'text-indigo-200' : 'text-slate-300 group-hover:text-slate-200'}`}>
                                    {note.title || 'Untitled Note'}
                                </h3>
                                <span className="text-[10px] text-slate-600 font-mono whitespace-nowrap ml-2">
                                    {new Date(note.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                            </div>
                            
                            <p className={`text-[11px] truncate leading-relaxed ${isActive ? 'text-indigo-300/60' : 'text-slate-500 group-hover:text-slate-400'}`}>
                                {note.content.slice(0, 60).replace(/[#*`\[\]]/g, '') || 'No additional text...'}
                            </p>
                            
                            {note.tags.length > 0 && (
                                <div className="mt-2 flex gap-1.5 flex-wrap">
                                    {note.tags.slice(0, 3).map(tag => (
                                        <span key={tag} className={`text-[9px] flex items-center gap-0.5 px-1.5 py-0.5 rounded-[3px] border transition-colors font-mono ${
                                            isActive 
                                            ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' 
                                            : 'bg-slate-900/50 border-white/10 text-slate-500'
                                        }`}>
                                            <Hash size={8} className="opacity-50" /> {tag}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </button>
                );
            })
        )}
      </div>
      
      {/* Footer / Status with Export */}
      <div className="p-4 border-t border-white/5 bg-slate-950/50 backdrop-blur-md shrink-0 flex items-center justify-between z-20">
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-widest flex items-center gap-2">
           <span className={`w-1.5 h-1.5 rounded-full ${notes.length > 0 ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]' : 'bg-slate-700'}`}></span>
           <span>{notes.length} Nodes</span>
        </div>

        <button 
            onClick={handleExport}
            className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono uppercase tracking-widest hover:text-indigo-400 transition-colors group/export active:scale-95"
            title="Download JSON Backup"
        >
            <Download size={12} className="group-hover/export:translate-y-0.5 transition-transform duration-300" />
            <span>Backup</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;