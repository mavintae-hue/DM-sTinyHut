"use client";

import { useEffect, useState, useRef } from "react";

interface RollContextMenuProps {
  x: number;
  y: number;
  onSelect: (type: 'normal' | 'adv' | 'dis') => void;
  onClose: () => void;
  label: string;
}

export default function RollContextMenu({ x, y, onSelect, onClose, label }: RollContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [onClose]);

  return (
    <div 
      ref={menuRef}
      className="fixed z-[500] bg-[#1a1a1a]/95 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl py-2 w-48 overflow-hidden animate-in fade-in zoom-in duration-150"
      style={{ top: y, left: x }}
    >
      <div className="px-4 py-2 border-b border-white/5 mb-1">
        <p className="text-[10px] font-black text-gold uppercase tracking-widest truncate">{label}</p>
      </div>
      <button 
        onClick={() => onSelect('adv')}
        className="w-full text-left px-4 py-2.5 text-sm text-cyan-400 hover:bg-cyan-400/10 transition-colors flex items-center justify-between group"
      >
        <span>Advantage</span>
        <span className="text-[10px] bg-cyan-400/20 px-1.5 py-0.5 rounded text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity">Roll 2, High</span>
      </button>
      <button 
        onClick={() => onSelect('normal')}
        className="w-full text-left px-4 py-2.5 text-sm text-white hover:bg-white/5 transition-colors"
      >
        Normal Roll
      </button>
      <button 
        onClick={() => onSelect('dis')}
        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/10 transition-colors flex items-center justify-between group"
      >
        <span>Disadvantage</span>
        <span className="text-[10px] bg-red-400/20 px-1.5 py-0.5 rounded text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">Roll 2, Low</span>
      </button>
    </div>
  );
}
