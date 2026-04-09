"use client";

interface CombatBoxProps {
  label: string;
  value: string | number;
  subValue?: string;
  onRoll?: (type: 'normal' | 'adv' | 'dis') => void;
  accent?: 'gold' | 'cyan' | 'red';
  editable?: boolean;
  onUpdate?: (val: string | number) => void;
}

export default function CombatBox({ label, value, subValue, onRoll, accent = 'cyan', editable, onUpdate }: CombatBoxProps) {
  const accentColor = accent === 'gold' ? 'border-gold/30 text-gold' : 
                     accent === 'red' ? 'border-red-500/30 text-red-500' : 
                     'border-cyan-400/30 text-cyan-400';

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onRoll || editable) return;
    e.preventDefault();
    const event = new CustomEvent('open-roll-menu', {
      detail: { 
        x: e.clientX, 
        y: e.clientY, 
        label: `${label} Roll`, 
        onSelect: onRoll
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div 
      className={`relative flex flex-col items-center justify-center p-2.5 bg-[#1a1a1a] border ${accentColor} rounded-xl shadow-xl min-w-[80px] h-[72px] ${(onRoll && !editable) ? 'cursor-pointer active:scale-95 transition-all hover:bg-white/5 hover:border-cyan-400/60' : ''} group`}
      onClick={() => (!editable && onRoll?.('normal'))}
      onContextMenu={handleContextMenu}
    >
      <span className="text-[8px] font-black opacity-50 uppercase tracking-widest mb-1">{label}</span>
      {editable ? (
        <input 
          type="text"
          className="bg-transparent text-2xl font-black tracking-tighter w-full text-center outline-none focus:text-white border-b border-white/10"
          value={value}
          onChange={(e) => onUpdate?.(e.target.value)}
          autoFocus
        />
      ) : (
        <span className="text-2xl font-black tracking-tighter">{value}</span>
      )}
      {subValue && <span className="text-[10px] font-bold opacity-40 mt-1 uppercase">{subValue}</span>}
    </div>
  );
}
