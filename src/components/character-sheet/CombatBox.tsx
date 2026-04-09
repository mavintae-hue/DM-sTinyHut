"use client";

interface CombatBoxProps {
  label: string;
  value: string | number;
  subValue?: string;
  onRoll?: (type: 'normal' | 'adv' | 'dis') => void;
  accent?: 'gold' | 'cyan' | 'red';
}

export default function CombatBox({ label, value, subValue, onRoll, accent = 'cyan' }: CombatBoxProps) {
  const accentColor = accent === 'gold' ? 'border-gold/30 text-gold' : 
                     accent === 'red' ? 'border-red-500/30 text-red-500' : 
                     'border-cyan-400/30 text-cyan-400';

  const handleContextMenu = (e: React.MouseEvent) => {
    if (!onRoll) return;
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
      className={`relative flex flex-col items-center justify-center p-4 bg-[#1a1a1a] border ${accentColor} rounded-2xl shadow-xl min-w-[100px] h-24 ${onRoll ? 'cursor-pointer active:scale-95 transition-all hover:bg-white/5' : ''}`}
      onClick={() => onRoll?.('normal')}
      onContextMenu={handleContextMenu}
    >
      <span className="text-[10px] font-black opacity-50 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-3xl font-black tracking-tighter">{value}</span>
      {subValue && <span className="text-[10px] font-bold opacity-40 mt-1 uppercase">{subValue}</span>}
    </div>
  );
}
