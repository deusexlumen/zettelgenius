import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Note } from '../types';
import { Sparkles, Search, Loader2, ArrowRight, SplitSquareHorizontal, Eye, Save, Link as LinkIcon, Trash2, Bot, Wand2 } from 'lucide-react';
import * as gemini from '../services/geminiService';
import VoiceInput from './VoiceInput';
import ImageInput from './ImageInput';
import { marked } from 'marked';

/**
 * NoteEditor Component
 * * The primary workspace for knowledge creation.
 * * Features: Dual-pane editing, AI integration, Wiki-style linking.
 */
interface NoteEditorProps {
  note: Note;
  allNotes: Note[];
  onUpdate: (note: Note) => void;
  onWikiLink?: (title: string) => void;
  onDelete: (id: string) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, allNotes, onUpdate, onWikiLink, onDelete }) => {
  // Local state for debounced editing
  // We initialize from props. key={note.id} in parent ensures re-mount on note switch.
  const [content, setContent] = useState(note.content);
  const [title, setTitle] = useState(note.title);
  const [isSaving, setIsSaving] = useState(false);

  const [aiLoading, setAiLoading] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [showResearchInput, setShowResearchInput] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState<string>("Gerade eben");
  
  // --- Autocomplete State ---
  const [suggestions, setSuggestions] = useState<{isOpen: boolean; top: number; left: number; filter: string; matchIndex: number;}>({ isOpen: false, top: 0, left: 0, filter: '', matchIndex: -1 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const researchInputRef = useRef<HTMLInputElement>(null);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingNoteRef = useRef<Note | null>(null);

  // Focus research input
  useEffect(() => {
    if (showResearchInput && researchInputRef.current) {
        researchInputRef.current.focus();
    }
  }, [showResearchInput]);

  // Update Handler
  const updateSaveTime = useCallback(() => {
    const now = new Date();
    setLastSaveTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`);
  }, []);

  // Debounce Logic
  const triggerUpdate = useCallback((updatedNote: Note, immediate = false) => {
    pendingNoteRef.current = updatedNote;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (immediate) {
        onUpdate(updatedNote);
        pendingNoteRef.current = null;
        updateSaveTime();
        setIsSaving(false);
        return;
    }

    setIsSaving(true);
    timerRef.current = setTimeout(() => {
        onUpdate(updatedNote);
        pendingNoteRef.current = null;
        setIsSaving(false);
        updateSaveTime();
        timerRef.current = null;
    }, 1000);
  }, [onUpdate, updateSaveTime]);

  // Cleanup on unmount (flush pending changes)
  useEffect(() => {
      return () => {
          if (timerRef.current && pendingNoteRef.current) {
              clearTimeout(timerRef.current);
              onUpdate(pendingNoteRef.current);
          }
      };
  }, [onUpdate]);

  const handleDelete = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingNoteRef.current = null;
      onDelete(note.id);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    triggerUpdate({ ...note, title: newTitle, content });
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setContent(newVal);
    triggerUpdate({ ...note, content: newVal, title });
    
    // Trigger Autocomplete [[...]]
    const selectionStart = e.target.selectionStart;
    const textBefore = newVal.slice(0, selectionStart);
    const lastOpen = textBefore.lastIndexOf('[[');
    if (lastOpen !== -1) {
        const textAfterOpen = textBefore.slice(lastOpen + 2);
        if (!textAfterOpen.includes(']]') && !textAfterOpen.includes('\n') && textareaRef.current) {
             const coords = getCaretCoordinates(textareaRef.current, lastOpen);
             setSuggestions({ isOpen: true, top: coords.top + coords.height + 10, left: coords.left, filter: textAfterOpen, matchIndex: lastOpen });
             setSelectedIndex(0);
             return;
        }
    }
    setSuggestions({ ...suggestions, isOpen: false });
  };
  
  // Helfen Funktionen (Autocomplete etc.)
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div');
    const style = window.getComputedStyle(element);
    Array.from(style).forEach(prop => div.style.setProperty(prop, style.getPropertyValue(prop), style.getPropertyPriority(prop)));
    div.style.position = 'absolute'; div.style.visibility = 'hidden'; div.style.whiteSpace = 'pre-wrap'; div.style.width = style.width;
    div.textContent = element.value.substring(0, position);
    const span = document.createElement('span'); span.textContent = '|'; div.appendChild(span);
    document.body.appendChild(div);
    const coords = { top: span.offsetTop - element.scrollTop, left: span.offsetLeft - element.scrollLeft, height: parseInt(style.lineHeight) || 24 };
    document.body.removeChild(div);
    return coords;
  };

  const insertSuggestion = (targetNote: Note) => {
      const { matchIndex, filter } = suggestions;
      // Use local content state
      const newContent = content.slice(0, matchIndex) + `[[${targetNote.title}]]` + content.slice(matchIndex + 2 + filter.length);
      setContent(newContent);
      triggerUpdate({ ...note, content: newContent, title });
      setSuggestions({ ...suggestions, isOpen: false });
  };
  
  const filteredSuggestions = allNotes
    .filter(n => n.title.toLowerCase().includes(suggestions.filter.toLowerCase()) && n.id !== note.id)
    .slice(0, 10);

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (suggestions.isOpen && filteredSuggestions.length > 0) {
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex((prev) => (prev + 1) % filteredSuggestions.length);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex((prev) => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              insertSuggestion(filteredSuggestions[selectedIndex]);
          } else if (e.key === 'Escape') {
              setSuggestions({ ...suggestions, isOpen: false });
          }
      }
  };
  
  const appendToNote = useCallback((text: string) => {
    setContent(prevContent => {
        const newContent = prevContent + '\n\n' + text;
        triggerUpdate({ ...note, content: newContent, title }, true); // Maybe immediate save for AI/Voice?
        return newContent;
    });
  }, [note, title, triggerUpdate]);
  
  // --- AI Actions ---

  const handleResearch = async () => {
    if (!researchQuery.trim()) return;
    setAiLoading(true);
    setShowResearchInput(false);
    try {
      const result = await gemini.researchTopic(researchQuery);
      let textToAppend = `### Research: ${researchQuery}\n${result.text}`;
      if (result.sources.length > 0) {
        textToAppend += '\n\n**Sources:**\n' + result.sources.map(s => `- [${s.title}](${s.uri})`).join('\n');
      }
      appendToNote(textToAppend);
      setResearchQuery('');
    } catch (e) {
      alert("Research failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleEnhance = async () => {
    setAiLoading(true);
    try {
      const result = await gemini.enhanceText("Enhance this note. Improve clarity, fix grammar, and suggest related Zettelkasten tags.", content);
      setContent(result);
      triggerUpdate({ ...note, content: result, title });
    } catch (e) {
      alert("Enhancement failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAutoConnect = async () => {
    setAiLoading(true);
    try {
        const otherTitles = allNotes.filter(n => n.id !== note.id).map(n => n.title);
        if (otherTitles.length === 0) {
            alert("No other notes to link to yet!");
            return;
        }
        const result = await gemini.autoConnect(content, otherTitles);
        setContent(result);
        triggerUpdate({ ...note, content: result, title });
    } catch (e) {
        alert("Auto-connect failed.");
    } finally {
        setAiLoading(false);
    }
  };
  // Ende AI Actions

  const handlePreviewClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const linkElement = target.closest('[data-wiki-title]');
    if (linkElement) {
        const title = linkElement.getAttribute('data-wiki-title');
        if (title && onWikiLink) onWikiLink(title);
    }
  };

  const getPreviewHtml = () => {
    try {
        const rawHtml = marked.parse(content) as string;
        return rawHtml.replace(
            /\[\[(.*?)\]\]/g, 
            '<span class="inline-flex items-center gap-1 text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-400/20 transition-colors font-medium select-none" data-wiki-title="$1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>$1</span>'
        );
    } catch (e) { return 'Error rendering'; }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-indigo-600/5 blur-[100px] pointer-events-none" />

      {/* --- Floating Toolbar (mit allen Buttons) --- */}
      <div className="h-16 flex items-center px-6 justify-between absolute top-0 left-0 right-0 z-20 transition-all select-none">
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/5" />

        <div className="relative flex items-center gap-4">
             {/* AI Loading Status oder Save Status */}
             {aiLoading ? (
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-pulse">
                    <Loader2 size={14} className="animate-spin text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-200 tracking-wide">AI Processing...</span>
                </div>
            ) : (
                <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
                    <span className={`text-[10px] font-medium ${isSaving ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 'text-slate-400 bg-white/5 border-white/5'} border px-2 py-1 rounded-md flex items-center gap-1.5 font-mono`}>
                       {isSaving ? <Loader2 size={10} className="animate-spin" /> : <Save size={10} className="text-emerald-500" />}
                       {isSaving ? 'SPEICHERT...' : `GESPEICHERT: ${lastSaveTime}`}
                    </span>
                    <div className="h-3 w-px bg-slate-800"></div>
                    <span className="text-[10px] text-slate-500 font-mono tracking-tight">
                        {content.split(/\s+/).filter(Boolean).length} WORDS
                    </span>
                </div>
            )}
        </div>
        
        <div className="relative flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-white/5 shadow-xl shadow-black/20">
           
           {/* LÖSCHEN BUTTON */}
           <button 
               onClick={handleDelete}
               className="p-2 rounded-lg text-red-500 hover:bg-red-500/10 transition-colors active:scale-95"
               title="Notiz löschen"
           >
               <Trash2 size={18} strokeWidth={1.5} />
           </button>
           
           <div className="w-px h-5 bg-slate-800 mx-1"></div> {/* Separator */}

           {/* --- AI TOOLS START --- */}
           
           {/* Research Tool */}
           <div className="relative">
              {showResearchInput && (
                  <div className="absolute right-0 top-full mt-3 flex items-center bg-[#0f172a] shadow-2xl border border-slate-700/80 rounded-xl p-2 z-30 w-80 animate-in slide-in-from-top-1 fade-in duration-200 ring-1 ring-black/50 origin-top-right">
                      <div className="p-1.5 bg-indigo-500/20 rounded-lg mr-2">
                          <Bot size={16} className="text-indigo-400" />
                      </div>
                      <input 
                        ref={researchInputRef}
                        className="text-sm px-2 py-1.5 flex-1 bg-transparent border-none outline-none text-slate-100 placeholder-slate-500 font-sans"
                        placeholder="Search web via Gemini..."
                        value={researchQuery}
                        onChange={e => setResearchQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleResearch();
                            if (e.key === 'Escape') setShowResearchInput(false);
                        }}
                      />
                      <button onClick={handleResearch} className="p-1.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg transition-all shadow-lg active:scale-95">
                          <ArrowRight size={14} strokeWidth={3} />
                      </button>
                  </div>
              )}
              <button 
                onClick={() => setShowResearchInput(!showResearchInput)}
                className={`p-2 rounded-lg transition-all duration-200 ${
                    showResearchInput 
                    ? 'bg-indigo-500/20 text-indigo-300' 
                    : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                } active:scale-95`}
                title="AI Research"
              >
                <Search size={18} strokeWidth={1.5} />
              </button>
           </div>

           {/* Image Input */}
           <ImageInput 
             onAnalysis={(text) => appendToNote(`### Image Analysis\n${text}`)} 
             onLoadingChange={setAiLoading}
             analyzeService={gemini.analyzeImage}
           />
           
           {/* Voice Input */}
           <VoiceInput 
             onTranscription={(text) => appendToNote(`### Audio Transcription\n${text}`)} 
             onLoadingChange={setAiLoading}
             transcribeService={gemini.transcribeAudio}
           />

           <div className="w-px h-4 bg-slate-800 mx-1"></div>

           {/* Auto Connect */}
           <button 
             onClick={handleAutoConnect}
             className="p-2 rounded-lg text-emerald-400 hover:bg-emerald-500/10 hover:hover:text-emerald-300 transition-all duration-200 active:scale-95"
             title="Auto Connect Links"
           >
             <LinkIcon size={18} strokeWidth={1.5} />
           </button>

           {/* Enhance */}
           <button 
             onClick={handleEnhance}
             className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all duration-200 active:scale-95"
             title="Enhance Note"
           >
             <Sparkles size={18} strokeWidth={1.5} />
           </button>

           <div className="w-px h-4 bg-slate-800 mx-1"></div>

           {/* Toggle Preview */}
           <button
             onClick={() => setShowPreview(!showPreview)}
             className={`p-2 rounded-lg transition-all duration-200 ${showPreview ? 'bg-white/10 text-slate-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'} active:scale-95`}
             title="Toggle Preview"
           >
             {showPreview ? <SplitSquareHorizontal size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
           </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex pt-16 h-full relative">
        {/* Editor (Links) */}
        <div className={`h-full transition-all duration-300 ${showPreview ? 'w-1/2 border-r border-white/5' : 'w-full'}`}>
            <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Untitled Entry"
                className="w-full text-3xl font-bold text-slate-100 placeholder-slate-700/50 border-none outline-none bg-transparent pt-8 px-8 tracking-tight font-sans"
            />
            <textarea
                ref={textareaRef}
                value={content}
                onChange={handleContentChange}
                onKeyDown={handleKeyDown}
                placeholder="Schreibe hier..."
                className="w-full h-[calc(100%-80px)] p-8 pt-4 bg-transparent text-slate-300 font-mono resize-none outline-none leading-relaxed text-base"
                spellCheck={false}
            />
            {/* Autocomplete Popup */}
            {suggestions.isOpen && filteredSuggestions.length > 0 && (
                <div className="absolute bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 w-64 overflow-hidden" 
                    style={{ top: suggestions.top, left: suggestions.left }}>
                    {filteredSuggestions.map((s, i) => (
                        <div
                           key={s.id}
                           onClick={() => insertSuggestion(s)}
                           className={`px-3 py-2 cursor-pointer text-sm truncate ${i === selectedIndex ? 'bg-indigo-500 text-white' : 'hover:bg-indigo-500/50 hover:text-white'}`}
                        >
                            {s.title}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Preview (Rechts) */}
        {showPreview && (
             <div 
                className="w-1/2 h-full overflow-y-auto p-8 prose prose-invert prose-indigo max-w-none"
                onClick={handlePreviewClick}
                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} 
             />
        )}
      </div>
    </div>
  );
};

export default NoteEditor;