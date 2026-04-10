"use client";

import { useState } from "react";
import { Dices, X, RefreshCw, Play } from "lucide-react";
import { RollRequest } from "@/hooks/useSupabaseRealtime";

interface QuickRollerProps {
  playerName: string;
  onRoll: (request: RollRequest) => void;
}

const AVAILABLE_DICE = ["d20", "d12", "d10", "d8", "d6", "d4", "d100"];

export default function QuickRoller({ playerName, onRoll }: QuickRollerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [diceCounts, setDiceCounts] = useState<Record<string, number>>({});

  const handleAddDice = (dice: string) => {
    setDiceCounts((prev) => ({
      ...prev,
      [dice]: (prev[dice] || 0) + 1,
    }));
  };

  const handleReset = () => {
    setDiceCounts({});
  };

  const handleRoll = () => {
    const parts: string[] = [];
    for (const dice of AVAILABLE_DICE) {
      if (diceCounts[dice]) {
        parts.push(`${diceCounts[dice]}${dice}`);
      }
    }

    if (parts.length === 0) return;

    const formula = parts.join("+");

    onRoll({
      playerName,
      actionName: `Quick Roll : ${formula}`,
      rollType: "custom",
      formula: formula,
      modifier: 0,
    });

    // Optionally reset after rolling or keep it for rerolls
    // handleReset();
    setIsOpen(false);
  };

  const totalDice = Object.values(diceCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="fixed bottom-4 left-4 z-40">
      {isOpen ? (
        <div className="bg-card border border-border shadow-2xl rounded-2xl p-4 w-72 xs:w-80 relative flex flex-col gap-4 animate-in slide-in-from-bottom-5">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3 border-b border-border/50 pb-3">
            <div className="bg-dark p-2 rounded-lg border border-border">
              <Dices className="text-gold w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm">Quick Roll</h3>
              <p className="text-xs text-gray-400">Build your dice pool</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {AVAILABLE_DICE.map((dice) => {
              const count = diceCounts[dice] || 0;
              return (
                <button
                  key={dice}
                  onClick={() => handleAddDice(dice)}
                  className={`relative p-2 rounded-xl border flex flex-col items-center justify-center transition-all ${
                    count > 0 
                      ? "border-gold bg-gold/10 text-gold" 
                      : "border-border bg-dark text-gray-400 hover:border-gray-500 hover:text-white"
                  }`}
                >
                  <span className="font-bold text-sm tracking-tighter">{dice.toUpperCase()}</span>
                  {count > 0 && (
                    <span className="absolute -top-2 -right-2 bg-gold text-darker text-[10px] font-black w-5 h-5 flex items-center justify-center rounded-full shadow-md">
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="bg-dark rounded-xl p-3 border border-border/50 flex flex-wrap gap-1 min-h-[3rem] items-center justify-center">
            {totalDice === 0 ? (
              <span className="text-sm text-gray-500 italic">Select dice to roll...</span>
            ) : (
              AVAILABLE_DICE.map(dice => {
                if (!diceCounts[dice]) return null;
                return (
                  <span key={"formula-"+dice} className="text-sm font-bold text-gold bg-gold/10 px-2 py-1 rounded">
                    {diceCounts[dice]}{dice}
                  </span>
                )
              }).reduce((prev, curr, i) => prev === null ? [curr] : [...prev, <span key={"plus-"+i} className="text-gray-500 font-bold px-1">+</span>], null as any)
            )}
          </div>

          <div className="flex gap-2 mt-1">
            <button
              onClick={handleReset}
              className="flex-1 bg-dark text-gray-400 hover:text-white border border-border hover:border-gray-500 py-2 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> RESET
            </button>
            <button
              onClick={handleRoll}
              disabled={totalDice === 0}
              className="flex-1 bg-gold text-darker disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gold-hover py-2 rounded-xl text-sm font-black transition-colors flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-darker" /> ROLL
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-gold hover:bg-gold-hover text-darker p-4 rounded-full shadow-2xl transition-all hover:scale-110 active:scale-95 group relative"
        >
          <Dices className="w-8 h-8" />
          <span className="absolute left-full ml-3 bg-dark text-white text-xs whitespace-nowrap px-2 py-1 flex items-center opacity-0 group-hover:opacity-100 transition-opacity rounded border border-border pointer-events-none">
            Quick Roll
          </span>
        </button>
      )}
    </div>
  );
}
