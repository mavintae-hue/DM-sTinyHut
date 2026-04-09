"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Dices, ScrollText, ChevronDown, ChevronUp, Move, GripHorizontal } from "lucide-react";
import { RollResult } from "@/hooks/useSupabaseRealtime";

interface HistoryLogProps {
  logs: RollResult[];
}

export default function HistoryLog({ logs }: HistoryLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [position, setPosition] = useState({ x: 16, y: 16 }); // Bottom-left default
  const [size, setSize] = useState({ width: 450, height: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Load persisted state
  useEffect(() => {
    const savedPos = localStorage.getItem("roll_log_pos");
    const savedSize = localStorage.getItem("roll_log_size");
    const savedCollapsed = localStorage.getItem("roll_log_collapsed");

    if (savedPos) setPosition(JSON.parse(savedPos));
    if (savedSize) setSize(JSON.parse(savedSize));
    if (savedCollapsed) setIsCollapsed(JSON.parse(savedCollapsed));
  }, []);

  // Save persisted state
  useEffect(() => {
    localStorage.setItem("roll_log_pos", JSON.stringify(position));
    localStorage.setItem("roll_log_size", JSON.stringify(size));
    localStorage.setItem("roll_log_collapsed", JSON.stringify(isCollapsed));
  }, [position, size, isCollapsed]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isCollapsed]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  }, [position]);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        });
      }
      if (isResizing) {
        const newWidth = Math.max(300, e.clientX - position.x);
        const newHeight = Math.max(200, e.clientY - position.y);
        setSize({ width: newWidth, height: newHeight });
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, isResizing, dragOffset, position]);

  const formatTime = (ts: string) => {
    const d = new Date(ts);
    return `${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}:${d.getSeconds().toString().padStart(2, "0")}`;
  };

  const getRollTypeLabel = (type: string) => {
    switch (type) {
      case "hit_adv": return "Advantage";
      case "hit_disadv": return "Disadvantage";
      case "damage_crit": return "CRITICAL MATCH";
      default: return "";
    }
  }

  return (
    <div
      ref={logRef}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        width: isCollapsed ? '300px' : `${size.width}px`,
        height: isCollapsed ? '64px' : `${size.height}px`,
        zIndex: 100
      }}
      className={`flex flex-col bg-darker/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden transition-[height,width] duration-200 ease-in-out shadow-[0_20px_50px_rgba(0,0,0,0.5)] ${isDragging ? 'cursor-grabbing select-none' : ''}`}
      onMouseDown={handleMouseDown}
    >
      <div
        className="p-4 border-b border-border/30 bg-gold/5 flex items-center justify-between cursor-pointer hover:bg-gold/10 transition-colors drag-handle group"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gold/10 rounded-lg group-hover:scale-110 transition-transform">
            <ScrollText className="w-4 h-4 text-gold" />
          </div>
          <h2 className="text-sm font-black tracking-tight uppercase" style={{ color: 'var(--theme-font, white)' }}>ROLL LOG</h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em] hidden sm:block">Live Sync</div>
          <button
            onClick={(e) => { e.stopPropagation(); setIsCollapsed(!isCollapsed); }}
            className="p-1 hover:bg-white/10 rounded-md transition-colors"
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          <Move className="w-3 h-3 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 italic mt-10">
                No rolls yet in this room.
              </div>
            ) : (
              logs.slice().reverse().map((log, idx) => (
                <div key={idx} className="bg-card border border-border p-3 rounded-xl shadow-sm relative group/item">
                  <div className="flex justify-between items-start mb-3 gap-4">
                    <span className="text-[9px] text-gray-500 font-mono mt-1 opacity-70">[{formatTime(log.timestamp)}]</span>
                    <div className="flex items-center gap-2 flex-row-reverse text-right">
                      {log.resultDetails?.player_avatar ? (
                        <img src={log.resultDetails.player_avatar} alt={log.playerName} className="w-10 h-10 rounded-lg border border-border/50 object-cover shadow-lg bg-dark transform group-hover/item:scale-105 transition-transform" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg border border-border/50 bg-dark flex items-center justify-center shadow-lg">
                          <span className="text-base text-gray-500 font-black">{log.playerName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-sm font-black text-white block leading-tight">{log.playerName}</span>
                        <span className="text-[9px] text-gold uppercase tracking-widest font-bold opacity-60">Player</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-[13px] text-gray-300 mb-1">
                    Used <span className="font-semibold text-blue-400">{log.actionName}</span>
                    {getRollTypeLabel(log.rollType) && <span className="ml-2 text-[9px] bg-dark px-1.5 py-0.5 rounded text-gray-400 border border-border">{getRollTypeLabel(log.rollType)}</span>}
                  </div>

                  <div className={`flex items-center justify-between mt-3 p-3 rounded-xl border transition-all ${log.resultDetails?.isNat20 ? 'bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : log.resultDetails?.isNat1 ? 'bg-red-500/20 border-red-500/50' : 'bg-dark/40 border-border/30'}`}>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Dices className={`w-3.5 h-3.5 ${log.resultDetails?.isNat20 ? 'text-yellow-400' : 'text-gray-500'}`} />
                        <span className="text-[10px] text-gray-400 font-mono">
                          {log.resultDetails.formula} → [{log.resultDetails.rolls.join(", ")}]{log.resultDetails.modifier !== 0 ? ` ${log.resultDetails.modifier > 0 ? "+" : ""}${log.resultDetails.modifier}` : ""}
                        </span>
                      </div>
                    </div>
                    <div className={`text-2xl font-black italic tracking-tighter drop-shadow-lg ${log.resultDetails?.isNat20 ? 'text-yellow-400' : log.resultDetails?.isNat1 ? 'text-red-500' : 'text-white'}`}>
                      {log.resultTotal}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <div
            className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize flex items-center justify-center group/resize"
            onMouseDown={handleResizeMouseDown}
          >
            <GripHorizontal className="w-3 h-3 text-gray-600 group-hover/resize:text-gold transition-colors rotate-45" />
          </div>
        </>
      )}
    </div>
  );
}
