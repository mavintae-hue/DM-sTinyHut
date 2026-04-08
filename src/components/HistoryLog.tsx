"use client";

import { RollResult } from "@/hooks/useSupabaseRealtime";
import { useEffect, useRef } from "react";
import { Dices, ScrollText } from "lucide-react";

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
    switch(type) {
        case "hit_adv": return "Advantage";
        case "hit_disadv": return "Disadvantage";
        case "damage_crit": return "CRITICAL MATCH";
        default: return "";
    }
  }

  return (
    <div className="flex flex-col h-[700px] w-full lg:w-[450px] bg-darker/60 backdrop-blur-xl border border-border/50 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
      <div className="p-6 border-b border-border/30 bg-gold/5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ScrollText className="w-6 h-6 text-gold" />
          <h2 className="text-2xl font-black tracking-tight" style={{ color: 'var(--theme-font, white)' }}>ROLL LOG</h2>
        </div>
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Live Sync</div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {logs.length === 0 ? (
          <div className="text-center text-gray-500 italic mt-10">
            No rolls yet in this room.
          </div>
        ) : (
          logs.slice().reverse().map((log, idx) => (
            <div key={idx} className="bg-card border border-border p-3 rounded shadow-sm relative">
              <div className="flex justify-between items-start mb-3 gap-4">
                <span className="text-[10px] text-gray-500 font-mono mt-1 opacity-70">[{formatTime(log.timestamp)}]</span>
                <div className="flex items-center gap-3 flex-row-reverse text-right">
                   {log.resultDetails?.player_avatar ? (
                      <img src={log.resultDetails.player_avatar} alt={log.playerName} className="w-14 h-14 rounded-xl border-2 border-border/50 object-cover shadow-xl bg-dark transform hover:scale-110 transition-transform pixel-sprite" />
                   ) : (
                      <div className="w-14 h-14 rounded-xl border-2 border-border/50 bg-dark flex items-center justify-center shadow-xl">
                         <span className="text-xl text-gray-500 font-black">{log.playerName.charAt(0).toUpperCase()}</span>
                      </div>
                   )}
                   <div>
                     <span className="text-lg font-black text-white hover:text-gold transition-colors block leading-tight">{log.playerName}</span>
                     <span className="text-[10px] text-gold uppercase tracking-widest font-bold opacity-60">Player</span>
                   </div>
                </div>
              </div>
              
              <div className="text-sm text-gray-300 mb-1">
                Used <span className="font-semibold text-blue-400">{log.actionName}</span>
                {getRollTypeLabel(log.rollType) && <span className="ml-2 text-xs bg-dark px-1.5 py-0.5 rounded text-gray-400 border border-border">{getRollTypeLabel(log.rollType)}</span>}
              </div>

              <div className={`flex items-center justify-between mt-4 p-3 rounded-xl border transition-all ${log.resultDetails?.isNat20 ? 'bg-yellow-500/20 border-yellow-500/50 shadow-[0_0_20px_rgba(234,179,8,0.2)]' : log.resultDetails?.isNat1 ? 'bg-red-500/20 border-red-500/50' : 'bg-dark/40 border-border/30'}`}>
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Dices className={`w-4 h-4 ${log.resultDetails?.isNat20 ? 'text-yellow-400' : 'text-gray-500'}`} />
                    <span className="text-[11px] text-gray-400 font-mono">
                      {log.resultDetails.formula} → [{log.resultDetails.rolls.join(", ")}]{log.resultDetails.modifier !== 0 ? ` ${log.resultDetails.modifier > 0 ? "+" : ""}${log.resultDetails.modifier}` : ""}
                    </span>
                  </div>
                </div>
                <div className={`text-4xl font-black italic tracking-tighter drop-shadow-lg ${log.resultDetails?.isNat20 ? 'text-yellow-400' : log.resultDetails?.isNat1 ? 'text-red-500' : 'text-white'}`}>
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
