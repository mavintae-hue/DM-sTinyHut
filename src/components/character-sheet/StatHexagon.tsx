"use client";

interface StatHexagonProps {
  label: string;
  score: number;
  modifier: number;
  onRoll: (label: string, mod: number, type: 'normal' | 'adv' | 'dis') => void;
  editable?: boolean;
  onUpdate?: (score: number) => void;
}

export default function StatHexagon({ label, score, modifier, onRoll, editable, onUpdate }: StatHexagonProps) {
  const modText = modifier >= 0 ? `+${modifier}` : modifier.toString();

  const handleContextMenu = (e: React.MouseEvent) => {
    if (editable) return;
    e.preventDefault();
    // Signal for context menu (will be handled by parent container)
    const event = new CustomEvent('open-roll-menu', {
      detail: { 
        x: e.clientX, 
        y: e.clientY, 
        label: `${label} Check`, 
        mod: modifier,
        onSelect: (type: 'normal' | 'adv' | 'dis') => onRoll(label, modifier, type)
      }
    });
    window.dispatchEvent(event);
  };

  return (
    <div 
      className={`relative w-24 h-28 group select-none active:scale-95 transition-all ${editable ? '' : 'cursor-pointer'}`}
      onClick={() => (!editable && onRoll(label, modifier, 'normal'))}
      onContextMenu={handleContextMenu}
    >
      {/* Hexagon Background SVG */}
      <svg viewBox="0 0 100 115" className="absolute inset-0 w-full h-full drop-shadow-xl">
        <path 
          d="M50 0 L100 28.8 L100 86.2 L50 115 L0 86.2 L0 28.8 Z" 
          fill="#1a1a1a" 
          stroke="rgba(77, 192, 207, 0.3)" 
          strokeWidth="2"
          className="group-hover:stroke-cyan-400/80 transition-colors"
        />
        <path 
          d="M50 85 L100 115 L0 115 Z" 
          fill="#2a2a2a" 
          stroke="rgba(77, 192, 207, 0.2)"
          strokeWidth="1"
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center pb-6 group-hover:scale-110 transition-transform duration-300">
        <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-1 group-hover:text-cyan-400/80 transition-colors">
          {label}
        </span>
        <span className="text-3xl font-black text-white group-hover:text-cyan-400 transition-colors drop-shadow-lg">
          {modText}
        </span>
      </div>

      <div className="absolute bottom-1 left-0 right-0 text-center">
        {editable ? (
          <input 
            type="number"
            className="w-12 bg-transparent text-[14px] font-bold text-white text-center border-b border-white/20 outline-none focus:border-cyan-400 transition-colors"
            value={score}
            onChange={(e) => onUpdate?.(parseInt(e.target.value) || 0)}
          />
        ) : (
          <span className="text-[14px] font-bold text-gray-300">
            {score}
          </span>
        )}
      </div>
    </div>
  );
}
