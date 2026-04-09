"use client";

import { useState } from "react";
import { parseDnDBeyondPdf, ParsedAction, ParsedCharacter } from "@/lib/pdfParser";
import { UploadCloud, X, Check, FileText, Loader2, Sparkles, Sword } from "lucide-react";

interface PdfImporterProps {
  onImport: (character: ParsedCharacter) => void;
  onClose: () => void;
}

export default function PdfImporter({ onImport, onClose }: PdfImporterProps) {
  const [isParsing, setIsParsing] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedCharacter | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setError(null);
    try {
      const result = await parseDnDBeyondPdf(file);
      setParsedResult(result);
      // Select all by default
      setSelectedIds(result.actions.map((_, i) => i));
    } catch (err) {
      console.error(err);
      setError("Failed to read PDF. Make sure it's a D&D Beyond Character Sheet.");
    } finally {
      setIsParsing(false);
    }
  };

  const toggleAction = (index: number) => {
    if (selectedIds.includes(index)) {
      setSelectedIds(selectedIds.filter(id => id !== index));
    } else {
      setSelectedIds([...selectedIds, index]);
    }
  };

  const handleConfirm = () => {
    if (!parsedResult) return;
    
    // Create a copy with only selected actions
    const finalCharacter: ParsedCharacter = {
        ...parsedResult,
        actions: parsedResult.actions.filter((_, i) => selectedIds.includes(i))
    };
    
    onImport(finalCharacter);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1000] flex items-center justify-center p-4">
      <div className="bg-[#111] border border-white/10 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex justify-between items-center p-6 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gold/20 rounded-xl">
              <Sword className="w-6 h-6 text-gold" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Summon from Beyond</h3>
              <p className="text-xs text-gray-400">Extract stats & actions from PDF</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {!parsedResult && !isParsing ? (
            <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-white/10 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors group">
              <input
                type="file"
                id="pdf-upload"
                className="hidden"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <label 
                htmlFor="pdf-upload" 
                className="flex flex-col items-center cursor-pointer text-center px-4"
              >
                <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-8 h-8 text-gold" />
                </div>
                <span className="text-white font-bold mb-1">Drop the Ancient Scroll here</span>
                <span className="text-xs text-gray-500">Only D&D Beyond Character PDFs supported</span>
              </label>
              {error && <p className="mt-4 text-red-400 text-sm font-medium">{error}</p>}
            </div>
          ) : isParsing ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-12 h-12 text-gold animate-spin mb-4" />
              <p className="text-white font-medium animate-pulse">Transcribing Character Essence...</p>
            </div>
          ) : parsedResult && (
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 transition-all hover:border-gold/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center border border-blue-500/30">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">{parsedResult.name}</h4>
                    <p className="text-xs text-blue-400 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" /> Fully Analyzed: {parsedResult.actions.length} Actions + Stats
                    </p>
                  </div>
                </div>
                <button 
                   onClick={() => setParsedResult(null)}
                   className="text-xs text-gray-500 hover:text-white transition-colors underline"
                >
                  New File
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] ml-2">Available Actions</label>
                <div className="grid gap-2">
                  {parsedResult.actions.map((action, i) => (
                    <div 
                      key={i}
                      onClick={() => toggleAction(i)}
                      className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                        selectedIds.includes(i) 
                        ? 'bg-gold/10 border-gold/50 shadow-[0_0_15px_rgba(234,179,8,0.1)]' 
                        : 'bg-white/5 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                          selectedIds.includes(i) ? 'bg-gold' : 'bg-white/10'
                        }`}>
                          {selectedIds.includes(i) && <Check className="w-3.5 h-3.5 text-darker font-bold" />}
                        </div>
                        <div>
                          <p className="text-white text-sm font-bold">{action.name}</p>
                          <p className="text-[10px] text-gray-500">Hit +{action.hitBonus} | {action.damageDice}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-white/5 border-t border-white/5 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-gray-400 hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button 
            disabled={selectedIds.length === 0 || !parsedResult}
            onClick={handleConfirm}
            className="px-8 py-2.5 rounded-xl text-sm font-black bg-gradient-to-br from-gold/90 to-gold text-darker disabled:opacity-30 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg"
          >
            Import Character
          </button>
        </div>
      </div>
    </div>
  );
}
