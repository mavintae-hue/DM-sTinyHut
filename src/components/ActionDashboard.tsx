"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import ActionRow from "./ActionRow";
import { RollRequest } from "@/hooks/useSupabaseRealtime";
import { Plus, X, Import } from "lucide-react";

const PdfImporter = dynamic(() => import("./PdfImporter"), { ssr: false });
import { ParsedAction } from "@/lib/pdfParser";

interface ActionItem {
  id: string;
  name: string;
  range: string;
  hitBonus: number;
  damageDice: string;
  notes: string;
}

interface ActionDashboardProps {
  actions: ActionItem[];
  playerName: string;
  onRoll: (request: RollRequest) => void;
  onAddCustomAction: (action: Omit<ActionItem, "id">) => void;
  onUpdateAction: (action: ActionItem) => void;
  onDeleteAction: (id: string) => void;
  onImportActions: (actions: Omit<ActionItem, "id">[]) => void;
}

export default function ActionDashboard({ 
  actions, 
  playerName, 
  onRoll, 
  onAddCustomAction,
  onUpdateAction,
  onDeleteAction,
  onImportActions
}: ActionDashboardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionItem | null>(null);
  const [newAction, setNewAction] = useState({
    name: "",
    range: "5 ft.",
    hitBonus: 0,
    damageDice: "1d8",
    notes: "",
  });

  // Effect to populate form when editing
  useEffect(() => {
    if (editingAction) {
      setNewAction({
        name: editingAction.name,
        range: editingAction.range,
        hitBonus: editingAction.hitBonus,
        damageDice: editingAction.damageDice,
        notes: editingAction.notes
      });
      setIsModalOpen(true);
    } else {
      setNewAction({ name: "", range: "5 ft.", hitBonus: 0, damageDice: "1d8", notes: "" });
    }
  }, [editingAction]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const actionData = {
      ...newAction,
      hitBonus: parseInt(newAction.hitBonus as any, 10) || 0,
    };

    if (editingAction) {
      onUpdateAction({ ...actionData, id: editingAction.id });
      setEditingAction(null);
    } else {
      onAddCustomAction(actionData);
    }
    
    setIsModalOpen(false);
    setNewAction({ name: "", range: "5 ft.", hitBonus: 0, damageDice: "1d8", notes: "" });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingAction(null);
  };

  return (
    <div className="w-full max-w-4xl bg-darker border border-border rounded-lg overflow-hidden shadow-2xl">
      <div className="flex justify-between items-center p-4 border-b border-border bg-dark/40">
        <h2 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--theme-font, #ECC94B)' }}>
          ACTIONS
        </h2>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPdfModalOpen(true)}
            className="text-xs font-semibold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 bg-blue-400/10 px-3 py-1.5 rounded-lg border border-blue-400/20"
          >
            <Import className="w-4 h-4" /> IMPORT PDF
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="text-xs font-semibold hover:opacity-80 transition-opacity flex items-center gap-1"
            style={{ color: 'var(--theme-font, #ECC94B)' }}
          >
            <Plus className="w-4 h-4" /> MANAGE CUSTOM
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-dark text-xs text-gray-400 font-bold uppercase border-b border-border">
              <th className="py-2 px-4 w-1/4">Attack</th>
              <th className="py-2 px-4 w-1/6">Range</th>
              <th className="py-2 px-4 w-1/6">Hit / DC</th>
              <th className="py-2 px-4 w-1/6">Damage</th>
              <th className="py-2 px-4">Notes</th>
            </tr>
          </thead>
          <tbody>
            {actions.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-gray-500 italic">
                  No actions available. Click "Manage Custom" to add one.
                </td>
              </tr>
            ) : (
              actions.map((action) => (
                <ActionRow
                  key={action.id}
                  action={action}
                  playerName={playerName}
                  onRoll={onRoll}
                  onEdit={() => setEditingAction(action)}
                  onDelete={() => onDeleteAction(action.id)}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-lg shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b border-border bg-dark">
              <h3 className="font-bold text-gold">
                {editingAction ? "Edit Custom Action" : "Add Custom Action"}
              </h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Name</label>
                <input required type="text" className="w-full bg-dark border border-border rounded p-2 text-sm text-foreground focus:border-gold outline-none" value={newAction.name} onChange={e => setNewAction({...newAction, name: e.target.value})} placeholder="e.g. Vicious Quarterstaff" />
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Range</label>
                  <input required type="text" className="w-full bg-dark border border-border rounded p-2 text-sm text-foreground focus:border-gold outline-none" value={newAction.range} onChange={e => setNewAction({...newAction, range: e.target.value})} placeholder="e.g. 5 ft." />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Hit Bonus</label>
                  <input required type="number" className="w-full bg-dark border border-border rounded p-2 text-sm text-foreground focus:border-gold outline-none" value={newAction.hitBonus} onChange={e => setNewAction({...newAction, hitBonus: parseInt(e.target.value)})} placeholder="+5" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="block text-xs text-gray-400 uppercase font-semibold">Damage Dice</label>
                
                <div className="flex flex-wrap gap-1">
                  {["d20", "d12", "d10", "d8", "d6", "d4", "d100"].map((dice) => (
                    <button
                      key={dice}
                      type="button"
                      onClick={() => {
                        const current = newAction.damageDice.trim();
                        if (!current) {
                           setNewAction({...newAction, damageDice: `1${dice}`});
                        } else if (current.endsWith("+") || current.endsWith("-")) {
                           setNewAction({...newAction, damageDice: `${current} 1${dice}`});
                        } else {
                           setNewAction({...newAction, damageDice: `${current} + 1${dice}`});
                        }
                      }}
                      className="px-2 py-1 bg-darker border border-border text-gray-400 rounded hover:border-gold hover:text-gold transition-colors text-xs font-mono"
                    >
                      {dice}
                    </button>
                  ))}
                  <button type="button" className="px-2 py-1 bg-darker border border-border text-gray-400 rounded hover:border-gold hover:text-gold transition-colors text-xs font-mono" onClick={() => setNewAction({...newAction, damageDice: newAction.damageDice + " + "})}>+</button>
                  <button type="button" className="px-2 py-1 bg-dark border border-red-900 text-red-500 rounded hover:bg-red-900 transition-colors text-xs font-mono" onClick={() => setNewAction({...newAction, damageDice: ""})}>Clear</button>
                </div>
                
                <input required type="text" className="w-full bg-dark border border-border rounded p-2 text-sm text-foreground focus:border-gold outline-none" value={newAction.damageDice} onChange={e => setNewAction({...newAction, damageDice: e.target.value})} placeholder="e.g. 1d6+3" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1 uppercase font-semibold">Notes</label>
                <input type="text" className="w-full bg-dark border border-border rounded p-2 text-sm text-foreground focus:border-gold outline-none" value={newAction.notes} onChange={e => setNewAction({...newAction, notes: e.target.value})} placeholder="e.g. Simple, Versatile" />
              </div>
              
              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 rounded text-sm font-semibold text-gray-400 hover:text-white hover:bg-dark">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded text-sm font-semibold bg-gold text-darker hover:bg-gold-hover">
                  {editingAction ? "Save Changes" : "Add Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isPdfModalOpen && (
        <PdfImporter 
          onClose={() => setIsPdfModalOpen(false)} 
          onImport={(character) => {
            onImportActions(character.actions);
            setIsPdfModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
