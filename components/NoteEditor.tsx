import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Note } from '../types';
import { Sparkles, Search, Loader2, ArrowRight, Type, SplitSquareHorizontal, Eye, Save, Link as LinkIcon, Wand2, X } from 'lucide-react';
import * as gemini from '../services/geminiService';
import VoiceInput from './VoiceInput';
import ImageInput from './ImageInput';
import { marked } from 'marked';

interface NoteEditorProps {
  note: Note;
  allNotes: Note[];
  onUpdate: (note: Note) => void;
  onWikiLink?: (title: string) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, allNotes, onUpdate, onWikiLink }) => {
  const [aiLoading, setAiLoading] = useState(false);
  const [researchQuery, setResearchQuery] = useState('');
  const [showResearchInput, setShowResearchInput] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [lastSaveTime, setLastSaveTime] = useState<string>("Gerade eben");
  
  // --- Autocomplete State ---
  const [suggestions, setSuggestions] = useState<{isOpen: boolean; top: number; left: number; filter: string; matchIndex: number;}>({ isOpen: false, top: 0, left: 0, filter: '', matchIndex: -1 });
  
  // --- Text Selection AI Menu State ---
  const [selectionMenu, setSelectionMenu] = useState<{
    isOpen: boolean;
    top: number;
    left: number;
    text: string;
    start: number;
    end: number;
  }>({ isOpen: false, top: 0, left: 0, text: '', start: 0, end: 0 });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Update Handler
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onUpdate({ ...note, content: newVal });
    
    // Hide selection menu on typing
    if (selectionMenu.isOpen) setSelectionMenu(prev => ({ ...prev, isOpen: false }));

    // Zeitstempel aktualisieren
    const now = new Date();
    setLastSaveTime(`${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`);

    // Trigger Autocomplete [[...]]
    const selectionStart = e.target.selectionStart;
    const textBefore = newVal.slice(0, selectionStart);
    const lastOpen = textBefore.lastIndexOf('[[');
    if (lastOpen !== -1) {
        const textAfterOpen = textBefore.slice(lastOpen + 2);
        if (!textAfterOpen.includes(']]') && !textAfterOpen.includes('\n') && textareaRef.current) {
             const coords = getCaretCoordinates(textareaRef.current, lastOpen);
             setSuggestions({ isOpen: true, top: coords.top + coords.height + 10, left: coords.left, filter: textAfterOpen, matchIndex: lastOpen });
             return;
        }
    }
    setSuggestions({ ...suggestions, isOpen: false });
  };

  // Handle Text Selection for "Expand" feature
  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
      const textarea = e.currentTarget;
      const { selectionStart, selectionEnd, value } = textarea;
      
      if (selectionEnd > selectionStart) {
          const text = value.substring(selectionStart, selectionEnd);
          // Only show for meaningful selections
          if (text.trim().length < 3) {
             setSelectionMenu(prev => ({ ...prev, isOpen: false }));
             return;
          }

          const coords = getCaretCoordinates(textarea, selectionEnd);
          
          setSelectionMenu({
              isOpen: true,
              top: coords.top - 45, // Position above the cursor
              left: Math.min(coords.left, textarea.clientWidth - 150), // Keep within bounds
              text,
              start: selectionStart,
              end: selectionEnd
          });
      } else {
          setSelectionMenu(prev => ({ ...prev, isOpen: false }));
      }
  };

  const handleExpandSelection = async () => {
      if (!selectionMenu.text) return;
      
      setAiLoading(true);
      // Keep menu open but show loading state, or close it? 
      // Let's close it to prevent double clicks and show global loader or localized loader.
      setSelectionMenu(prev => ({ ...prev, isOpen: false }));
      
      try {
          const expandedText = await gemini.enhanceText(
              "Expand upon this specific text significantly. Add context, missing details, and depth while maintaining the original tone. Return only the expanded text in Markdown.", 
              selectionMenu.text
          );
          
          const newContent = note.content.substring(0, selectionMenu.start) + expandedText + note.content.substring(selectionMenu.end);
          onUpdate({ ...note, content: newContent });
      } catch (e) {
          console.error(e);
          alert("Could not expand text.");
      } finally {
          setAiLoading(false);
      }
  };

  // Helper für Cursor Position (Autocomplete & Selection)
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

  // Insert Suggestion
  const insertSuggestion = (targetNote: Note) => {
      const { matchIndex, filter } = suggestions;
      const newContent = note.content.slice(0, matchIndex) + `[[${targetNote.title}]]` + note.content.slice(matchIndex + 2 + filter.length);
      onUpdate({ ...note, content: newContent });
      setSuggestions({ ...suggestions, isOpen: false });
  };

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
      const newContent = note.content + '\n\n' + textToAppend;
      onUpdate({ ...note, content: newContent });
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
      const context = note.content;
      const result = await gemini.enhanceText("Enhance this note. Improve clarity, fix grammar, and suggest 2-3 related Zettelkasten tags at the end.", context);
      onUpdate({ ...note, content: result });
    } catch (e) {
      alert("Enhancement failed.");
    } finally {
      setAiLoading(false);
    }
  };

  const appendToNote = useCallback((text: string) => {
    const newContent = note.content + '\n\n' + text;
    onUpdate({ ...note, content: newContent });
  }, [note, onUpdate]);

  // HTML Rendering (Vorschau)
  const getPreviewHtml = () => {
    try {
        const rawHtml = marked.parse(note.content) as string;
        // Ersetze [[Link]] durch blauen klickbaren Text
        return rawHtml.replace(
            /\[\[(.*?)\]\]/g, 
            '<span class="inline-flex items-center gap-1 text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded cursor-pointer hover:bg-indigo-400/20 transition-colors font-medium select-none" data-wiki-title="$1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>$1</span>'
        );
    } catch (e) { return 'Error rendering'; }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#020617] relative overflow-hidden">
      {/* Background Effect */}
      <div className="absolute top-0 right-0 w-2/3 h-2/3 bg-indigo-600/5 blur-[100px] pointer-events-none" />

      {/* Toolbar */}
      <div className="h-14 flex items-center px-4 justify-between border-b border-white/5 bg-[#020617]/80 backdrop-blur z-20">
        <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">
                <Save size={10} />
                <span>SAVED: {lastSaveTime}</span>
             </div>
             {aiLoading && (
                <span className="flex items-center gap-2 text-[10px] font-medium text-indigo-300 bg-indigo-500/10 px-2 py-1 rounded border border-indigo-500/20 animate-pulse">
                    <Loader2 size={10} className="animate-spin" />
                    PROCESSING...
                </span>
             )}
        </div>
        
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
           {/* Research Tool */}
           <div className="relative">
              {showResearchInput && (
                  <div className="absolute right-0 top-full mt-2 flex items-center bg-slate-900 shadow-2xl border border-slate-700 rounded-xl p-2 z-30 w-80 animate-in slide-in-from-top-2 fade-in duration-200">
                      <Search size={16} className="text-slate-500 ml-2" />
                      <input 
                        autoFocus
                        className="text-sm px-3 py-1.5 flex-1 bg-transparent border-none outline-none text-slate-200 placeholder-slate-500 font-sans"
                        placeholder="Search web with Gemini..."
                        value={researchQuery}
                        onChange={e => setResearchQuery(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') handleResearch();
                            if (e.key === 'Escape') setShowResearchInput(false);
                        }}
                      />
                      <button onClick={handleResearch} className="p-1.5 bg-indigo-600 text-white hover:bg-indigo-500 rounded-lg transition-colors">
                          <ArrowRight size={14} />
                      </button>
                  </div>
              )}
              <button 
                onClick={() => setShowResearchInput(!showResearchInput)}
                className={`p-1.5 rounded-md transition-all ${showResearchInput ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`}
                title="Google Search Grounding"
              >
                <Search size={18} />
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

           <div className="w-px h-4 bg-white/10 mx-1"></div>

           <button 
             onClick={handleEnhance}
             className="p-1.5 rounded-md text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors"
             title="Enhance Note (Fix grammar, clarify)"
           >
             <Sparkles size={18} />
           </button>

           <div className="w-px h-4 bg-white/10 mx-1"></div>

           <button onClick={() => setShowPreview(!showPreview)} className={`p-1.5 rounded-md transition-all ${showPreview ? 'bg-white/10 text-white' : 'text-slate-400 hover:text-white hover:bg-white/10'}`} title="Toggle Preview">
             {showPreview ? <SplitSquareHorizontal size={18} /> : <Eye size={18} />}
           </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex h-full relative">
        {/* Editor (Left) */}
        <div className={`h-full relative transition-all duration-300 ${showPreview ? 'w-1/2 border-r border-white/5' : 'w-full'}`}>
            <textarea
                ref={textareaRef}
                value={note.content}
                onChange={handleContentChange}
                onSelect={handleSelect}
                placeholder="Start writing..."
                className="w-full h-full p-8 bg-transparent text-slate-300 font-mono resize-none outline-none leading-relaxed text-base placeholder-slate-700"
                spellCheck={false}
            />
            
            {/* Floating Expand Menu */}
            {selectionMenu.isOpen && (
                <div 
                    className="absolute z-50 animate-in fade-in zoom-in-95 duration-150"
                    style={{ top: selectionMenu.top, left: selectionMenu.left }}
                >
                    <button 
                        onClick={handleExpandSelection}
                        onMouseDown={(e) => e.preventDefault()} // Prevent blur
                        className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-xl border border-indigo-500/30 text-indigo-100 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:bg-indigo-500/20 hover:border-indigo-400/50 transition-all active:scale-95 group"
                    >
                        <Wand2 size={14} className="text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                        <span className="text-xs font-medium">Expand with AI</span>
                    </button>
                </div>
            )}

            {/* Autocomplete Popup */}
            {suggestions.isOpen && (
                <div className="absolute bg-slate-800/95 backdrop-blur border border-slate-700 rounded-lg shadow-xl z-50 w-64 overflow-hidden" style={{ top: suggestions.top, left: suggestions.left }}>
                    <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-500 border-b border-white/5">Link Note</div>
                    {allNotes.filter(n => n.title.toLowerCase().includes(suggestions.filter.toLowerCase())).map((s, i) => (
                        <div key={s.id} onClick={() => insertSuggestion(s)} className="px-3 py-2 hover:bg-indigo-500 hover:text-white cursor-pointer text-sm truncate flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                            {s.title || "Untitled"}
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Preview (Right) */}
        {showPreview && (
             <div 
                className="w-1/2 h-full overflow-y-auto p-8 prose prose-invert prose-indigo max-w-none prose-headings:font-sans prose-p:font-sans prose-pre:bg-[#0f172a] prose-pre:border prose-pre:border-white/5"
                onClick={(e) => {
                    const target = e.target as HTMLElement;
                    const linkElement = target.closest('[data-wiki-title]');
                    if (linkElement) {
                        const title = linkElement.getAttribute('data-wiki-title');
                        if (title && onWikiLink) onWikiLink(title);
                    }
                }}
                dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} 
             />
        )}
      </div>
    </div>
  );
};

export default NoteEditor;