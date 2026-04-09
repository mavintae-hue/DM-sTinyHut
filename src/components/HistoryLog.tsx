"use client";

import { useEffect, useRef } from "react";
import { Dices, ScrollText } from "lucide-react";
import { RollResult } from "@/hooks/useSupabaseRealtime";

interface HistoryLogProps {
  logs: RollResult[];
}

export default function HistoryLog({ logs }: HistoryLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

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
    <div className="flex flex-col h-full w-full bg-darker/20 backdrop-blur-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-gold/10 rounded-lg">
            <ScrollText className="w-4 h-4 text-gold" />
          </div>
          <h2 className="text-sm font-black tracking-tight uppercase text-white">ROLL LOG</h2>
        </div>
        <div className="text-[8px] font-bold text-gray-500 uppercase tracking-[0.2em]">Live Sync</div>
      </div>

      {/* Log Body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-black/40">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 italic mt-10 text-xs">
            No rolls yet in this realm.
          </div>
        ) : (
          logs.slice().reverse().map((log, idx) => (
            <div key={idx} className="bg-[#111] border border-white/5 p-3 rounded-xl shadow-sm relative group/item">
              <div className="flex justify-between items-start mb-3 gap-4">
                <span className="text-[9px] text-gray-500 font-mono mt-1 opacity-70">[{formatTime(log.timestamp)}]</span>
                <div className="flex items-center gap-2 flex-row-reverse text-right">
                  {log.resultDetails?.player_avatar ? (
                    <img src={log.resultDetails.player_avatar} alt={log.playerName} className="w-8 h-8 rounded-lg border border-white/10 object-cover shadow-lg bg-dark transform group-hover/item:scale-105 transition-transform" />
                  ) : (
                    <div className="w-8 h-8 rounded-lg border border-white/10 bg-dark flex items-center justify-center shadow-lg">
                      <span className="text-xs text-gray-500 font-black">{log.playerName.charAt(0).toUpperCase()}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-black text-white block leading-tight">{log.playerName}</span>
                    <span className="text-[8px] text-gold uppercase tracking-widest font-bold opacity-60">Player</span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-gray-300 mb-1">
                Used <span className="font-semibold text-cyan-400">{log.actionName}</span>
                {getRollTypeLabel(log.rollType) && <span className="ml-2 text-[8px] bg-dark px-1.5 py-0.5 rounded text-gray-400 border border-white/5">{getRollTypeLabel(log.rollType)}</span>}
              </div>

              <div className={`flex items-center justify-between mt-2 p-2 rounded-lg border transition-all ${log.resultDetails?.isNat20 ? 'bg-gold/10 border-gold/30 shadow-[0_0_15px_rgba(234,179,8,0.1)]' : log.resultDetails?.isNat1 ? 'bg-red-500/10 border-red-500/30' : 'bg-black/40 border-white/5'}`}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-1.5">
                    <Dices className={`w-3 h-3 ${log.resultDetails?.isNat20 ? 'text-gold' : 'text-gray-500'}`} />
                    <span className="text-[9px] text-gray-400 font-mono">
                      {log.resultDetails.formula} → [{log.resultDetails.rolls.join(", ")}]{log.resultDetails.modifier !== 0 ? ` ${log.resultDetails.modifier > 0 ? "+" : ""}${log.resultDetails.modifier}` : ""}
                    </span>
                  </div>
                </div>
                <div className={`text-xl font-black italic tracking-tighter drop-shadow-lg ${log.resultDetails?.isNat20 ? 'text-gold' : log.resultDetails?.isNat1 ? 'text-red-500' : 'text-white'}`}>
                  {log.resultTotal}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
