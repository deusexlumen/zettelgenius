import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Note } from '../types';
import { Sparkles, Search, Loader2, ArrowRight, Type, SplitSquareHorizontal, Eye, Save, Link as LinkIcon } from 'lucide-react';
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
  
  // --- Autocomplete Logic (bleibt gleich) ---
  const [suggestions, setSuggestions] = useState<{isOpen: boolean; top: number; left: number; filter: string; matchIndex: number;}>({ isOpen: false, top: 0, left: 0, filter: '', matchIndex: -1 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // Update Handler
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onUpdate({ ...note, content: newVal });
    
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

  // Helper für Cursor Position (Autocomplete)
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
             <div className="flex items-center gap-2 text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded">
                <Save size={10} />
                <span>GESPEICHERT: {lastSaveTime}</span>
             </div>
        </div>
        
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg">
           <button onClick={() => setShowPreview(!showPreview)} className="p-1.5 text-slate-400 hover:text-white" title="Vorschau an/aus">
             {showPreview ? <SplitSquareHorizontal size={18} /> : <Eye size={18} />}
           </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 flex h-full relative">
        {/* Editor (Links) */}
        <div className={`h-full transition-all duration-300 ${showPreview ? 'w-1/2 border-r border-white/5' : 'w-full'}`}>
            <textarea
                ref={textareaRef}
                value={note.content}
                onChange={handleContentChange}
                placeholder="Schreibe hier..."
                className="w-full h-full p-8 bg-transparent text-slate-300 font-mono resize-none outline-none leading-relaxed text-base"
                spellCheck={false}
            />
            {/* Autocomplete Popup */}
            {suggestions.isOpen && (
                <div className="absolute bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50 w-64 overflow-hidden" style={{ top: suggestions.top, left: suggestions.left }}>
                    {allNotes.filter(n => n.title.toLowerCase().includes(suggestions.filter.toLowerCase())).map((s, i) => (
                        <div key={s.id} onClick={() => insertSuggestion(s)} className="px-3 py-2 hover:bg-indigo-500 hover:text-white cursor-pointer text-sm truncate">
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
                onClick={(e) => {
                    // Klick-Handler für Links
                    const target = e.target as HTMLElement;
                    // Wir suchen das Element oder dessen Eltern (falls man aufs Icon klickt)
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