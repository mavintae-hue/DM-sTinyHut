"use client";

import { Check } from "lucide-react";

interface SkillRowProps {
  name: string;
  modifier: number;
  isProficient: boolean;
  type: 'skill' | 'save';
  onRoll: (label: string, mod: number, type: 'normal' | 'adv' | 'dis') => void;
}

export default function SkillRow({ name, modifier, isProficient, type, onRoll }: SkillRowProps) {
  const modText = modifier >= 0 ? `+${modifier}` : modifier.toString();

  const handleContextMenu = (e: React.MouseEvent) => {
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
      className="group flex items-center justify-between py-1.5 px-2 hover:bg-white/5 rounded-lg border border-transparent hover:border-white/5 transition-all cursor-pointer active:bg-white/10"
      onClick={() => onRoll(name, modifier, 'normal')}
      onContextMenu={handleContextMenu}
    >
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full border border-cyan-400/30 flex items-center justify-center ${isProficient ? 'bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]' : 'bg-transparent'}`}>
          {isProficient && <div className="w-1 h-1 bg-white rounded-full shadow-sm" />}
        </div>
        <span className="text-[13px] font-medium text-gray-300 group-hover:text-white transition-colors">{name}</span>
      </div>
      <span className={`text-[13px] font-bold ${modifier >= 0 ? 'text-cyan-400' : 'text-red-400'} min-w-[24px] text-right`}>
        {modText}
      </span>
    </div>
  );
}
