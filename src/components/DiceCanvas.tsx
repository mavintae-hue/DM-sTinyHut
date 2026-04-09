"use client";

import { useEffect, useRef, useState } from "react";
import DiceBox from "@3d-dice/dice-box";
import { RollRequest, RollResult } from "@/hooks/useSupabaseRealtime";

interface DiceCanvasProps {
  playerName: string;
  themeColor: string;
  rollRequest: RollRequest | null;        // NEW: receive roll directly as prop
  onRollComplete: (result: Omit<RollResult, "timestamp">) => void;
}

// Module-level singleton — survives React StrictMode double-mount
let globalDiceBox: any = null;

export default function DiceCanvas({ playerName, themeColor, rollRequest, onRollComplete }: DiceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rollQueueRef = useRef<RollRequest[]>([]);
  const onRollCompleteRef = useRef(onRollComplete);
  const playerNameRef = useRef(playerName);
  const [isReady, setIsReady] = useState(!!globalDiceBox);

  // Keep callbacks/refs in sync without re-init
  useEffect(() => { onRollCompleteRef.current = onRollComplete; }, [onRollComplete]);
  useEffect(() => { playerNameRef.current = playerName; }, [playerName]);

  // ─── One-time DiceBox initialization ───────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already initialized in a previous mount — just mark ready
    if (globalDiceBox) {
      setIsReady(true);
      return;
    }

    const timer = setTimeout(async () => {
      // Guard against double-call
      if (globalDiceBox || !containerRef.current) return;

      try {
        const diceBox = new DiceBox({
          container: "#dice-container",
          assetPath: "https://unpkg.com/@3d-dice/dice-box@1.1.4/dist/assets/",
          theme: "default",
          themeColor,
          scale: 7,
          spinForce: 10,
          throwForce: 30,
          gravity: 2,
          startingHeight: 12,
        });

        console.log("[DiceBox] Initializing…");
        await diceBox.init();
        console.log("[DiceBox] Ready!");

        globalDiceBox = diceBox;

        diceBox.onRollComplete = (results: any) => {
          const req = rollQueueRef.current.shift();
          if (!req) return;

          let totalFromDice = 0;
          const rolls: number[] = [];

          if (Array.isArray(results)) {
            results.forEach((group: any) =>
              group.rolls.forEach((r: any) => {
                totalFromDice += r.value;
                rolls.push(r.value);
              })
            );
          }

          let chosenDie = rolls[0] || 0;
          let finalTotal = totalFromDice + req.modifier;

          if (req.rollType === "hit_adv" && rolls.length === 2) {
            chosenDie = Math.max(...rolls);
            finalTotal = chosenDie + req.modifier;
          } else if (req.rollType === "hit_disadv" && rolls.length === 2) {
            chosenDie = Math.min(...rolls);
            finalTotal = chosenDie + req.modifier;
          }

          const isNat20 = req.rollType.startsWith("hit_") && chosenDie === 20;
          const isNat1  = req.rollType.startsWith("hit_") && chosenDie === 1;

          onRollCompleteRef.current({
            playerName: req.playerName,
            actionName: req.actionName,
            rollType:   req.rollType,
            resultTotal: finalTotal,
            resultDetails: { rolls, modifier: req.modifier, formula: req.formula, isNat20, isNat1 },
          });
        };

        setIsReady(true);
      } catch (e) {
        console.error("[DiceBox] Init failed:", e);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Theme color updates ───────────────────────────────────────────────────
  useEffect(() => {
    if (isReady && globalDiceBox) {
      try { globalDiceBox.updateConfig({ themeColor }); } catch (_) {}
    }
  }, [themeColor, isReady]);

  // ─── React to incoming roll requests (via prop, not Supabase broadcast) ────
  useEffect(() => {
    if (!rollRequest || !isReady || !globalDiceBox) return;

    const req = rollRequest;

    // Apply requester's theme color if provided
    if (req.themeColor) {
      try { globalDiceBox.updateConfig({ themeColor: req.themeColor }); } catch (_) {}
    }

    // Determine dice notation
    let notation = req.formula;
    if (req.rollType === "hit_adv" || req.rollType === "hit_disadv") {
      notation = "2d20";
    }

    // Extract dice parts only (e.g. "1d20" from "1d20+5")
    const diceArray = notation
      .split("+")
      .map((s) => s.trim())
      .filter((s) => /\d*d\d+/i.test(s));

    if (diceArray.length === 0) {
      console.warn("[DiceBox] No valid dice in notation:", notation);
      return;
    }

    console.log("[DiceBox] Rolling:", diceArray, "| Request:", req);
    rollQueueRef.current.push(req);

    try {
      globalDiceBox.show();
      globalDiceBox.roll(diceArray);
    } catch (err) {
      console.error("[DiceBox] Roll error:", err);
      rollQueueRef.current.pop(); // Remove from queue if roll failed
    }
  }, [rollRequest, isReady]);

  return (
    <div
      id="dice-container"
      ref={containerRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ width: "100vw", height: "100vh", background: "transparent" }}
    />
  );
}
