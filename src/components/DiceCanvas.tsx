"use client";

import { useEffect, useRef, useState } from "react";
import DiceBox from "@3d-dice/dice-box";
import { RealtimeChannel } from "@supabase/supabase-js";
import { RollRequest, RollResult } from "@/hooks/useSupabaseRealtime";

interface DiceCanvasProps {
  channel: RealtimeChannel | null;
  playerName: string;
  themeColor: string;
  onRollComplete: (result: Omit<RollResult, "timestamp">) => void;
}

// Use a module-level variable to prevent double-init across React StrictMode remounts
let globalDiceBox: any = null;
let globalIsReady = false;

export default function DiceCanvas({ channel, playerName, themeColor, onRollComplete }: DiceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rollQueueRef = useRef<RollRequest[]>([]);
  const onRollCompleteRef = useRef(onRollComplete);
  const playerNameRef = useRef(playerName);
  const [isReady, setIsReady] = useState(globalIsReady);

  // Keep refs up to date without triggering re-init
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  useEffect(() => {
    playerNameRef.current = playerName;
  }, [playerName]);

  // One-time initialization - never re-runs
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (globalDiceBox) {
      // Already initialized from a previous mount, just sync state
      setIsReady(true);
      return;
    }

    const initDelay = setTimeout(async () => {
      if (!containerRef.current || globalDiceBox) return;

      try {
        const diceBox = new DiceBox({
          container: "#dice-container",
          assetPath: "https://unpkg.com/@3d-dice/dice-box@1.1.4/dist/assets/",
          theme: "default",
          themeColor: themeColor,
          scale: 7,
          spinForce: 10,
          throwForce: 30,
          gravity: 2,
          startingHeight: 12,
        });

        console.log("DiceBox: Starting initialization...");
        await diceBox.init();
        console.log("DiceBox: Initialization successful!");

        globalDiceBox = diceBox;
        globalIsReady = true;

        diceBox.onRollComplete = (results: any) => {
          const req = rollQueueRef.current.shift();
          if (!req) return;

          if (req.playerName === playerNameRef.current) {
            let modifier = req.modifier;
            let totalFromDice = 0;
            let rolls: number[] = [];

            if (Array.isArray(results)) {
              results.forEach((group: any) => {
                group.rolls.forEach((r: any) => {
                  totalFromDice += r.value;
                  rolls.push(r.value);
                });
              });
            }

            let finalTotal = totalFromDice + modifier;
            let chosenDie = rolls[0] || 0;
            if (req.rollType === "hit_adv" && rolls.length === 2) {
              chosenDie = Math.max(...rolls);
              finalTotal = chosenDie + modifier;
            } else if (req.rollType === "hit_disadv" && rolls.length === 2) {
              chosenDie = Math.min(...rolls);
              finalTotal = chosenDie + modifier;
            }

            const isNat20 = req.rollType.startsWith("hit_") && chosenDie === 20;
            const isNat1 = req.rollType.startsWith("hit_") && chosenDie === 1;

            onRollCompleteRef.current({
              playerName: req.playerName,
              actionName: req.actionName,
              rollType: req.rollType,
              resultTotal: finalTotal,
              resultDetails: {
                rolls,
                modifier,
                formula: req.formula,
                isNat20,
                isNat1,
              },
            });
          }
        };

        setIsReady(true);
      } catch (e) {
        console.error("DiceBox: Initialization failed!", e);
      }
    }, 500);

    // Do NOT destroy globalDiceBox on cleanup — it persists across mounts
    return () => clearTimeout(initDelay);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Update theme color without re-initializing
  useEffect(() => {
    if (isReady && globalDiceBox) {
      try {
        globalDiceBox.updateConfig({ themeColor });
      } catch (e) {}
    }
  }, [themeColor, isReady]);

  // Subscribe to roll requests from realtime channel
  useEffect(() => {
    if (!channel || !isReady) return;

    const listener = (payload: any) => {
      const request = payload.payload as RollRequest;
      if (!globalDiceBox) {
        console.warn("DiceBox: Request received but box not ready.");
        return;
      }

      rollQueueRef.current.push(request);

      if (request.themeColor) {
        try {
          globalDiceBox.updateConfig({ themeColor: request.themeColor });
        } catch (e) {}
      }

      let diceNotation = request.formula;
      if (request.rollType === "hit_adv" || request.rollType === "hit_disadv") {
        diceNotation = "2d20";
      }

      // Parse notation: extract only dice parts (e.g. "1d20" from "1d20+5")
      const diceArray = diceNotation
        .split("+")
        .map((s) => s.trim())
        .filter((s) => s.toLowerCase().includes("d"));

      console.log("DiceBox: Rolling", diceArray);
      try {
        globalDiceBox.show();
        globalDiceBox.roll(diceArray);
      } catch (err) {
        console.error("DiceBox: Roll failed!", err);
      }
    };

    channel.on("broadcast", { event: "roll_request" }, listener);

    // No cleanup needed — channel itself is cleaned up in useSupabaseRealtime
  }, [channel, isReady]);

  return (
    <div
      id="dice-container"
      ref={containerRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ width: "100vw", height: "100vh", background: "transparent" }}
    />
  );
}
