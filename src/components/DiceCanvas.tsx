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

export default function DiceCanvas({ channel, playerName, themeColor, onRollComplete }: DiceCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rollQueueRef = useRef<RollRequest[]>([]);
  const onRollCompleteRef = useRef(onRollComplete);
  const [isReady, setIsReady] = useState(false);

  // Keep the callback ref up to date so the one-time init can always use the latest prop
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  useEffect(() => {
    // Determine if we're in a browser environment
    if (typeof window === "undefined") return;

    // Prevent multiple initializations even if React re-renders this effect once
    if (diceBoxRef.current) return;

    // Use a small delay to ensure the container is truly ready in the DOM
    const initDelay = setTimeout(() => {
      if (!containerRef.current) return;

      const diceBox = new DiceBox({
        container: containerRef.current, 
        assetPath: "/assets/dice-box/",
        theme: "default",
        themeColor: themeColor,
        scale: 7.2, // 10% smaller than 8
        spinForce: 15,
        throwForce: 35, 
        gravity: 2.5,
        startingHeight: 15
      });

      diceBoxRef.current = diceBox;

      diceBox.init().then(() => {
        setIsReady(true);
        
        // Setup ONE-TIME callback when dice finish rolling
        diceBox.onRollComplete = (results: any) => {
          const req = rollQueueRef.current.shift();
          if (!req) return;

          // If it's the player who requested the roll, save it to DB
          if (req.playerName === playerName) {
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

            // Handling Advantage / Disadvantage for 2d20 logic
            let chosenDie = rolls[0] || 0;
            if (req.rollType === "hit_adv" && rolls.length === 2) {
              chosenDie = Math.max(...rolls);
              finalTotal = chosenDie + modifier;
            } else if (req.rollType === "hit_disadv" && rolls.length === 2) {
              chosenDie = Math.min(...rolls);
              finalTotal = chosenDie + modifier;
            }

            let isNat20 = (req.rollType.startsWith("hit_") && chosenDie === 20);
            let isNat1 = (req.rollType.startsWith("hit_") && chosenDie === 1);

            // Use the ref to ensure we call the latest version of the prop
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
                isNat1
              }
            });
          }
        };
      }).catch((e: Error) => console.error("DiceBox failed to initialize. Assets might be missing.", e));
    }, 200);

    return () => {
      clearTimeout(initDelay);
    };
  }, []); // Run ONLY once on mount

  useEffect(() => {
    if (isReady && diceBoxRef.current) {
        diceBoxRef.current.updateConfig({ themeColor });
    }
  }, [themeColor, isReady]);

  useEffect(() => {
    if (!channel || !isReady) return;

    const listener = (payload: any) => {
      const request = payload.payload as RollRequest;
      const diceBox = diceBoxRef.current;
      if (!diceBox) return;

      // Add to stable queue ref
      rollQueueRef.current.push(request);

      // Sync dice color for this specific roll
      if (request.themeColor) {
        diceBox.updateConfig({ themeColor: request.themeColor });
      }

      let diceNotation = request.formula;
      if (request.rollType === "hit_adv" || request.rollType === "hit_disadv") {
        diceNotation = "2d20";
      }
      
      const diceArray = diceNotation.split('+')
        .map(s => s.trim())
        .filter(s => s.toLowerCase().includes('d'));
      
      try {
        diceBox.show();
        // Use persistence-friendly .add() if possible, but safely
        if (typeof diceBox.add === 'function') {
          diceBox.add(diceArray);
        } else {
          diceBox.roll(diceArray);
        }
      } catch (err) {
        console.error("Dice roll execution error:", err);
        try { diceBox.roll(diceArray); } catch (e) {}
      }
    };

    channel.on("broadcast", { event: "roll_request" }, listener);

    return () => {
      // Shared channel listeners are handled via the parent channel subscription
    };
  }, [channel, isReady, playerName]);

  return (
    <div
      id="dice-canvas"
      ref={containerRef}
      className="fixed top-0 left-0 w-screen h-screen z-[9999] pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
