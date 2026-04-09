"use client";

import { useState } from "react";
import { FlaskConical, Target, MoreVertical, ShieldAlert, Crosshair, Edit2, Trash2 } from "lucide-react";
import { RollRequest } from "@/hooks/useSupabaseRealtime";

interface ActionItem {
  id: string;
  name: string;
  range: string;
  hitBonus: number;
  damageDice: string; // e.g. "1d8", "2d6+2"
  notes: string;
}

interface ActionRowProps {
  action: ActionItem;
  playerName: string;
  onRoll: (request: RollRequest) => void;
  onEdit: () => void;
  onDelete: () => void;
}

export default function ActionRow({ action, playerName, onRoll, onEdit, onDelete }: ActionRowProps) {
  const [showHitMenu, setShowHitMenu] = useState(false);
  const [showDamageMenu, setShowDamageMenu] = useState(false);

  const handleHitClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setShowHitMenu(!showHitMenu);
    setShowDamageMenu(false);
  };

  const handleHitRoll = (type: "hit_normal" | "hit_adv" | "hit_disadv") => {
    onRoll({
      playerName,
      actionName: action.name,
      rollType: type,
      formula: "1d20", // DiceCanvas handles making it 2d20 for adv/disadv
      modifier: action.hitBonus,
    });
    setShowHitMenu(false);
  };

  const handleDamageRoll = (isCrit: boolean) => {
    let formulaStr = action.damageDice.replace(/\s+/g, '');
    let baseDiceParts: string[] = [];
    let modifierTotal = 0;
    
    const chunks = formulaStr.match(/[+-]?[^+-]+/g) || [];
    
    chunks.forEach(chunk => {
       if (chunk.toLowerCase().includes('d')) {
           baseDiceParts.push(chunk);
       } else {
           modifierTotal += parseInt(chunk, 10) || 0;
       }
    });

    let baseDice = "";

    if (isCrit) {
       const doubledParts = baseDiceParts.map(chunk => {
           let sign = '';
           let content = chunk;
           if (chunk.startsWith('+') || chunk.startsWith('-')) {
               sign = chunk[0];
               content = chunk.substring(1);
           }
           const dParts = content.split(/d/i);
           if (dParts.length === 2) {
               const num = parseInt(dParts[0] || "1", 10) * 2;
               return `${sign}${num}d${dParts[1]}`;
           }
           return chunk;
       });
       baseDice = doubledParts.join('');
    } else {
       baseDice = baseDiceParts.join('');
    }
    
    if (baseDice.startsWith('+')) baseDice = baseDice.substring(1);
    if (!baseDice) baseDice = "0d20";

    onRoll({
      playerName,
      actionName: action.name,
      rollType: isCrit ? "damage_crit" : "damage_normal",
      formula: baseDice,
      modifier: modifierTotal,
    });
    setShowDamageMenu(false);
  };

  return (
    <tr className="border-b border-border/10 hover:bg-white/5 transition-all group">
      <td className="py-4 px-4 w-[25%]">
        <div className="flex flex-col">
          <span className="font-bold text-blue-400 group-hover:text-blue-300 transition-colors truncate">
            {action.name}
          </span>
          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-0.5">Physical Action</span>
        </div>
      </td>
      <td className="py-4 px-4 text-xs text-gray-400 w-[15%]">
        {action.range}
      </td>
      
      {/* HIT COLUMN */}
      <td className="py-4 px-4 w-[15%]">
        <div className="flex items-center gap-2 relative">
          <button
            onClick={() => handleHitRoll("hit_normal")}
            className="flex items-center justify-center border border-white/10 bg-white/5 hover:border-gold hover:text-gold transition-all px-3 py-1.5 rounded-xl font-black text-sm min-w-[3.5rem] shadow-sm active:scale-95"
          >
            {action.hitBonus >= 0 ? `+${action.hitBonus}` : action.hitBonus}
          </button>
          <button 
             onClick={handleHitClick}
             className="p-2 rounded-lg text-gray-600 hover:text-gold hover:bg-gold/10 transition-all"
          >
             <MoreVertical className="w-4 h-4" />
          </button>
          
          {showHitMenu && (
            <div className="absolute top-full left-0 mt-2 z-[2005] w-48 bg-[#111] border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden p-1 backdrop-blur-xl">
              <button 
                onClick={() => handleHitRoll("hit_normal")}
                className="px-4 py-3 text-left hover:bg-white/5 rounded-xl text-xs font-bold text-gray-400 hover:text-white flex items-center gap-3 transition-colors"
              >
                <Target className="w-4 h-4 text-gray-500" />
                Normal Strike
              </button>
              <button 
                onClick={() => handleHitRoll("hit_adv")}
                className="px-4 py-3 text-left hover:bg-green-500/10 rounded-xl text-xs font-bold text-green-500 flex items-center gap-3 transition-colors"
              >
                <Crosshair className="w-4 h-4" />
                With Advantage
              </button>
              <button 
                onClick={() => handleHitRoll("hit_disadv")}
                className="px-4 py-3 text-left hover:bg-red-500/10 rounded-xl text-xs font-bold text-red-500 flex items-center gap-3 transition-colors"
              >
                <ShieldAlert className="w-4 h-4" />
                With Disadvantage
              </button>
            </div>
          )}
        </div>
      </td>

      {/* DAMAGE COLUMN */}
      <td className="py-4 px-4 w-[20%]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDamageRoll(false)}
            className="border border-white/10 bg-white/5 hover:border-red-500/50 hover:text-red-400 transition-all px-3 py-1.5 rounded-xl text-xs font-black tracking-tighter active:scale-95 shadow-sm"
          >
            {action.damageDice}
          </button>
          <button
            onClick={() => handleDamageRoll(true)}
            className="p-2 text-gray-600 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
            title="Critical Hit"
          >
            <FlaskConical className="w-4 h-4" />
          </button>
        </div>
      </td>

      <td className="py-4 px-4 w-[15%]">
        <div className="text-[10px] text-gray-500 leading-relaxed font-medium line-clamp-2 hover:line-clamp-none transition-all cursor-help" title={action.notes}>
          {action.notes || "-"}
        </div>
      </td>
      <td className="py-4 px-4 w-[10%]">
        <div className="flex items-center gap-1.5 opacity-40 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-400/10 rounded-xl transition-all"
            title="Edit Action"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => { 
              e.stopPropagation(); 
              if (confirm(`Are you sure you want to delete "${action.name}"?`)) {
                onDelete();
              }
            }}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
            title="Delete Action"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}
