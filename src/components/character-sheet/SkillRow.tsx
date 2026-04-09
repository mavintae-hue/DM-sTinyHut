"use client";

import { Check } from "lucide-react";

interface SkillRowProps {
  name: string;
  modifier: number;
  isProficient: boolean;
  type: 'skill' | 'save';
  onRoll: (label: string, mod: number, type: 'normal' | 'adv' | 'dis') => void;
  editable?: boolean;
  onUpdate?: (updates: Partial<{ modifier: number, isProficient: boolean }>) => void;
}

export default function SkillRow({ name, modifier, isProficient, type, onRoll, editable, onUpdate }: SkillRowProps) {
  const modText = modifier >= 0 ? `+${modifier}` : modifier.toString();

  const handleContextMenu = (e: React.MouseEvent) => {
    if (editable) return;
    e.preventDefault();
    const event = new CustomEvent('open-roll-menu', {
      detail: { 
        x: e.clientX, 
        y: e.clientY, 
        label: `${name} ${type === 'save' ? 'Saving Throw' : 'Skill Check'}`, 
        mod: modifier,
        onSelect: (rollType: 'normal' | 'adv' | 'dis') => onRoll(name, modifier, rollType)
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div 
      className={`group flex items-center justify-between py-1.5 px-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-cyan-400/20 transition-all ${editable ? '' : 'cursor-pointer active:scale-[0.98]'}`}
      onClick={() => (!editable && onRoll(name, modifier, 'normal'))}
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-center gap-3">
        <div 
          onClick={(e) => {
            if (editable) {
              e.stopPropagation();
              onUpdate?.({ isProficient: !isProficient });
            }
          }}
          className={`w-3.5 h-3.5 rounded-full border border-cyan-400/30 flex items-center justify-center transition-all ${isProficient ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-transparent'} ${editable ? 'cursor-pointer hover:border-cyan-400' : ''}`}
        >
          {isProficient && <div className="w-1.5 h-1.5 bg-white rounded-full shadow-sm" />}
        </div>
        <span className="text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors">{name}</span>
      </div>
      
      {editable ? (
        <input 
          type="number"
          className="w-10 bg-transparent text-[13px] font-bold text-cyan-400 text-right outline-none border-b border-white/10 focus:border-cyan-400 transition-colors"
          value={modifier}
          onChange={(e) => onUpdate?.({ modifier: parseInt(e.target.value) || 0 })}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={`text-[13px] font-bold ${modifier >= 0 ? 'text-cyan-400' : 'text-red-400'} min-w-[24px] text-right`}>
          {modText}
        </span>
      )}
    </div>
  );
}
