"use client";

import { useState } from "react";
import { FlaskConical, Target, MoreVertical, ShieldAlert, Crosshair } from "lucide-react";
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
}

export default function ActionRow({ action, playerName, onRoll }: ActionRowProps) {
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
    <tr className="border-b border-border/50 hover:bg-dark/50 transition-colors group relative">
      <td className="py-3 px-4 w-1/4">
        <div className="flex flex-col">
          <span className="font-semibold text-blue-400 group-hover:text-blue-300 transition-colors">
            {action.name}
          </span>
          <span className="text-xs text-gray-500">Action</span>
        </div>
      </td>
      <td className="py-3 px-4 text-sm text-gray-300 w-1/6">
        {action.range}
      </td>
      
      {/* HIT COLUMN */}
      <td className="py-3 px-4 w-1/6">
        <div className="flex items-center gap-1 relative">
          <button
            onClick={() => handleHitRoll("hit_normal")}
            className="flex items-center justify-center border border-border bg-card hover:border-gold hover:text-gold transition-colors px-3 py-2 rounded-md font-bold text-lg min-w-[3rem]"
          >
            {action.hitBonus >= 0 ? `+${action.hitBonus}` : action.hitBonus}
          </button>
          <button 
             onClick={handleHitClick}
             className="p-1 rounded text-gray-500 hover:text-gold transition-colors"
          >
             <MoreVertical className="w-4 h-4" />
          </button>
          
          {showHitMenu && (
            <div className="absolute top-full left-0 mt-1 z-20 w-40 bg-card border border-border rounded-md shadow-xl flex flex-col overflow-hidden">
              <button 
                onClick={() => handleHitRoll("hit_normal")}
                className="px-4 py-2 text-left hover:bg-dark text-sm border-b border-border/50 flex items-center"
              >
                <Target className="w-4 h-4 mr-2 text-gray-400" />
                Normal
              </button>
              <button 
                onClick={() => handleHitRoll("hit_adv")}
                className="px-4 py-2 text-left hover:bg-dark text-sm border-b border-border/50 text-green-400 flex items-center"
              >
                <Crosshair className="w-4 h-4 mr-2" />
                Advantage
              </button>
              <button 
                onClick={() => handleHitRoll("hit_disadv")}
                className="px-4 py-2 text-left hover:bg-dark text-sm text-red-400 flex items-center"
              >
                <ShieldAlert className="w-4 h-4 mr-2" />
                Disadvantage
              </button>
            </div>
          )}
        </div>
      </td>

      {/* DAMAGE COLUMN */}
      <td className="py-3 px-4 w-1/6">
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleDamageRoll(false)}
            className="border border-border bg-card hover:border-gold hover:text-gold transition-colors px-3 py-2 rounded-md text-sm font-semibold tracking-wide"
          >
            {action.damageDice}
          </button>
          <button
            onClick={() => handleDamageRoll(true)}
            className="p-2 text-gray-500 hover:text-red-500 hover:bg-dark rounded-md transition-colors"
            title="Critical Hit"
          >
            <FlaskConical className="w-4 h-4" />
          </button>
        </div>
      </td>

      <td className="py-3 px-4 text-xs text-gray-400 max-w-xs truncate">
        {action.notes}
      </td>
    </tr>
  );
}
