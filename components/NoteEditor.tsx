import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Note } from '../types';
import { Sparkles, Search, Loader2, ArrowRight, Type, SplitSquareHorizontal, Eye, EyeOff, Bot, FileText, Wand2 } from 'lucide-react';
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
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, allNotes, onUpdate }) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [showResearchInput, setShowResearchInput] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  // --- Autocomplete State ---
  const [suggestions, setSuggestions] = useState<{
    isOpen: boolean;
    top: number;
    left: number;
    filter: string;
    matchIndex: number;
  }>({ isOpen: false, top: 0, left: 0, filter: '', matchIndex: -1 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLUListElement>(null); 
  const researchInputRef = useRef<HTMLInputElement>(null);
  const [cursorTarget, setCursorTarget] = useState<number | null>(null);

  // Restore cursor position after updates
  useEffect(() => {
    if (cursorTarget !== null && textareaRef.current) {
      textareaRef.current.selectionStart = cursorTarget;
      textareaRef.current.selectionEnd = cursorTarget;
      setCursorTarget(null);
    }
  }, [note.content, cursorTarget]);

  // Focus research input
  useEffect(() => {
    if (showResearchInput && researchInputRef.current) {
        researchInputRef.current.focus();
    }
  }, [showResearchInput]);

  // Scroll active suggestion into view
  useEffect(() => {
    if (suggestions.isOpen && listRef.current) {
      const activeItem = listRef.current.children[selectedIndex + 1] as HTMLElement;
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, suggestions.isOpen]);

  // --- Handlers ---

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdate({ ...note, title: e.target.value });
  };

  // Helper to calculate caret position for the autocomplete popup
  const getCaretCoordinates = (element: HTMLTextAreaElement, position: number) => {
    const div = document.createElement('div');
    const style = window.getComputedStyle(element);
    Array.from(style).forEach(prop => {
        div.style.setProperty(prop, style.getPropertyValue(prop), style.getPropertyPriority(prop));
    });
    div.style.position = 'absolute';
    div.style.visibility = 'hidden';
    div.style.whiteSpace = 'pre-wrap'; 
    div.style.overflow = 'hidden';
    div.style.height = 'auto';
    div.style.width = style.width;
    div.textContent = element.value.substring(0, position);
    const span = document.createElement('span');
    span.textContent = '|'; 
    div.appendChild(span);
    document.body.appendChild(div);
    const coords = {
        top: span.offsetTop - element.scrollTop, 
        left: span.offsetLeft - element.scrollLeft,
        height: parseInt(style.lineHeight) || 24
    };
    document.body.removeChild(div);
    return coords;
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const selectionStart = e.target.selectionStart;
    onUpdate({ ...note, content: newVal });
    
    // Check for "[[" trigger
    const textBefore = newVal.slice(0, selectionStart);
    const lastOpen = textBefore.lastIndexOf('[[');
    
    if (lastOpen !== -1) {
        const textAfterOpen = textBefore.slice(lastOpen + 2);
        if (!textAfterOpen.includes(']]') && !textAfterOpen.includes('\n')) {
             if (textareaRef.current) {
                 const coords = getCaretCoordinates(textareaRef.current, lastOpen);
                 setSuggestions({
                     isOpen: true,
                     top: coords.top + coords.height + 10, 
                     left: coords.left,
                     filter: textAfterOpen,
                     matchIndex: lastOpen
                 });
                 setSelectedIndex(0);
                 return;
             }
        }
    }
    
    if (suggestions.isOpen) {
        setSuggestions({ ...suggestions, isOpen: false });
    }
  };

  const filteredSuggestions = allNotes
    .filter(n => n.title.toLowerCase().includes(suggestions.filter.toLowerCase()) && n.id !== note.id)
    .slice(0, 10);

  const insertSuggestion = (targetNote: Note) => {
      const { matchIndex, filter } = suggestions;
      const prefix = note.content.slice(0, matchIndex);
      const suffix = note.content.slice(matchIndex + 2 + filter.length);
      
      const newContent = prefix + `[[${targetNote.title}]]` + suffix;
      onUpdate({ ...note, content: newContent });
      
      setSuggestions({ ...suggestions, isOpen: false });
      setCursorTarget(prefix.length + targetNote.title.length + 4); 
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
      if (suggestions.isOpen && filteredSuggestions.length > 0) {
          if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelectedIndex(prev => (prev + 1) % filteredSuggestions.length);
          } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelectedIndex(prev => (prev - 1 + filteredSuggestions.length) % filteredSuggestions.length);
          } else if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault();
              insertSuggestion(filteredSuggestions[selectedIndex]);
          } else if (e.key === 'Escape') {
              setSuggestions({ ...suggestions, isOpen: false });
          }
      }
  };

  const appendToNote = useCallback((text: string) => {
    const newContent = note.content + '\n\n' + text;
    onUpdate({ ...note, content: newContent });
  }, [note, onUpdate]);

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
      const result = await gemini.enhanceText("Enhance this note. Improve clarity, fix grammar, and suggest related Zettelkasten tags.", note.content);
      onUpdate({ ...note, content: result });
    } catch (e) {
      alert("Enhancement failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const getPreviewHtml = () => {
    try {
        return marked.parse(note.content) as string;
    } catch (e) {
        return '<p class="text-red-400">Error rendering preview</p>';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 relative overflow-hidden group/editor">
      {/* Background Ambience */}
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-indigo-900/10 blur-[120px] rounded-full pointer-events-none" />

      {/* --- Floating Toolbar --- */}
      <div className="h-16 flex items-center px-6 justify-between absolute top-0 left-0 right-0 z-20 transition-all select-none">
        {/* Background Blur Strip */}
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/5" />

        <div className="relative flex items-center gap-4">
             {aiLoading ? (
                <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.15)] animate-pulse">
                    <Loader2 size={14} className="animate-spin text-indigo-400" />
                    <span className="text-xs font-semibold text-indigo-200 tracking-wide">Gemini Processing...</span>
                </div>
            ) : (
                <div className="flex items-center gap-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
                    <span className="text-[10px] font-medium text-slate-400 bg-white/5 border border-white/5 px-2 py-1 rounded-md flex items-center gap-1.5 font-mono">
                       <Type size={10} className="text-slate-500" /> MARKDOWN
                    </span>
                    <div className="h-3 w-px bg-slate-800"></div>
                    <span className="text-[10px] text-slate-500 font-mono tracking-tight">
                        {note.content.split(/\s+/).filter(Boolean).length} WORDS
                    </span>
                </div>
            )}
        </div>
        
        {/* Tools */}
        <div className="relative flex items-center gap-1 bg-slate-900/50 p-1 rounded-xl border border-white/5 shadow-xl shadow-black/20">
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
                }`}
                title="AI Research"
              >
                <Search size={18} strokeWidth={1.5} />
              </button>
           </div>

           <ImageInput 
             onAnalysis={(text) => appendToNote(`### Image Analysis\n${text}`)} 
             onLoadingChange={setAiLoading}
             analyzeService={gemini.analyzeImage}
           />
           
           <VoiceInput 
             onTranscription={(text) => appendToNote(`### Audio Transcription\n${text}`)} 
             onLoadingChange={setAiLoading}
             transcribeService={gemini.transcribeAudio}
           />

           <div className="w-px h-4 bg-slate-800 mx-1"></div>

           <button 
             onClick={handleEnhance}
             className="p-2 rounded-lg text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all duration-200"
             title="Enhance Note"
           >
             <Sparkles size={18} strokeWidth={1.5} />
           </button>

           <div className="w-px h-4 bg-slate-800 mx-1"></div>

           <button
             onClick={() => setShowPreview(!showPreview)}
             className={`p-2 rounded-lg transition-all duration-200 ${showPreview ? 'bg-white/10 text-slate-200' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'}`}
             title="Toggle Preview"
           >
             {showPreview ? <SplitSquareHorizontal size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
           </button>
        </div>
      </div>

      {/* --- Main Content Area --- */}
      <div className="flex-1 flex pt-16 h-full relative">
        
        {/* Editor Column */}
        <div className={`h-full overflow-y-auto custom-scrollbar transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${showPreview ? 'w-1/2 border-r border-white/5' : 'w-full'}`}>
            <div className={`py-12 px-8 md:px-12 mx-auto ${showPreview ? 'max-w-2xl' : 'max-w-3xl'} relative min-h-full transition-all duration-500`}>
                <input
                    type="text"
                    value={note.title}
                    onChange={handleTitleChange}
                    placeholder="Untitled Entry"
                    className="w-full text-3xl font-bold text-slate-100 placeholder-slate-700/50 border-none outline-none bg-transparent mb-8 tracking-tight font-sans"
                />
                <textarea
                    ref={textareaRef}
                    value={note.content}
                    onChange={handleContentChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Capture your thoughts..."
                    className="w-full h-[calc(100%-100px)] resize-none outline-none text-base md:text-lg text-slate-300 leading-relaxed font-mono bg-transparent placeholder-slate-800 selection:bg-indigo-500/30 selection:text-indigo-200"
                    spellCheck={false}
                />
                
                {/* Autocomplete Popup */}
                {suggestions.isOpen && filteredSuggestions.length > 0 && (
                    <ul 
                        ref={listRef}
                        className="absolute bg-[#0f172a] border border-slate-700/80 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden z-50 w-72 max-h-64 overflow-y-auto ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-100"
                        style={{ top: suggestions.top, left: suggestions.left }}
                    >
                        <li className="px-3 py-2 bg-slate-900 border-b border-white/5 text-[10px] text-slate-500 font-bold uppercase tracking-widest sticky top-0 backdrop-blur-sm z-10 flex items-center gap-2">
                            <Wand2 size={10} /> Link Node
                        </li>
                        {filteredSuggestions.map((suggestion, index) => (
                            <li 
                                key={suggestion.id}
                                onMouseDown={(e) => {
                                    e.preventDefault(); 
                                    insertSuggestion(suggestion);
                                }}
                                className={`px-4 py-2.5 cursor-pointer transition-colors border-l-2 ${
                                    index === selectedIndex 
                                    ? 'bg-indigo-500/10 border-indigo-500' 
                                    : 'border-transparent hover:bg-slate-800/50'
                                }`}
                            >
                                <div className="font-medium text-sm text-slate-200 truncate mb-0.5">
                                    {suggestion.title || 'Untitled'}
                                </div>
                                <div className="text-xs truncate font-mono text-slate-500">
                                    {suggestion.content.substring(0, 40) || 'No content'}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>

        {/* Preview Column */}
        <div className={`h-full overflow-y-auto custom-scrollbar bg-slate-925 transition-all duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] ${showPreview ? 'w-1/2 opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-10 overflow-hidden absolute right-0'}`}>
             {showPreview && (
                 <div className="py-12 px-8 md:px-16 prose prose-invert prose-indigo max-w-2xl mx-auto">
                      <h1 className="mb-8 text-3xl font-bold tracking-tight text-slate-100">{note.title || "Untitled Entry"}</h1>
                      <div 
                        dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} 
                        className="text-slate-300 leading-7 [&>p]:mb-6 [&>h2]:text-xl [&>h2]:font-semibold [&>h2]:mt-10 [&>h2]:mb-4 [&>h2]:text-slate-200 [&>ul]:list-disc [&>ul]:pl-5 [&>ul]:mb-6 [&>li]:mb-1 [&>blockquote]:border-l-4 [&>blockquote]:border-indigo-500/50 [&>blockquote]:pl-4 [&>blockquote]:italic [&>blockquote]:text-slate-400"
                      />
                 </div>
             )}
        </div>
      </div>
    </div>
  );
};

export default NoteEditor;