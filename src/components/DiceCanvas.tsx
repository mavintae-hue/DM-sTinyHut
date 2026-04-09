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
  const diceBoxRef = useRef<any>(null);
  const currentRollRequestRef = useRef<RollRequest | null>(null);
  const rollQueueRef = useRef<RollRequest[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Determine if we're in a browser environment
    if (typeof window === "undefined") return;

    // Wait until the container is actually rendered before initializing
    const initDelay = setTimeout(() => {
      // Prevent multiple initializations
      if (diceBoxRef.current || !document.querySelector("#dice-canvas")) return;

      const diceBox = new DiceBox({
        container: containerRef.current!, // Use the ref directly
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
      
      // Setup callback when dice finish rolling
      diceBox.onRollComplete = (results: any) => {
        const req = rollQueueRef.current.shift(); // Take the oldest request from queue
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

           let isNat20 = false;
           let isNat1 = false;
           
           if (req.rollType.startsWith("hit_")) {
               if (chosenDie === 20) isNat20 = true;
               if (chosenDie === 1) isNat1 = true;
           }

           onRollComplete({
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
    })
.catch((e: Error) => console.error("DiceBox failed to initialize. Assets might be missing.", e));
    
    }, 100);

    return () => {
      clearTimeout(initDelay);
    };
  }, [playerName, onRollComplete]); // themeColor intentionally omitted to prevent double init

  useEffect(() => {
    if (isReady && diceBoxRef.current) {
        diceBoxRef.current.updateConfig({ themeColor });
    }
  }, [themeColor, isReady]);

    // Listen to remote roll requests
  useEffect(() => {
    if (!channel || !isReady) return;

    const listener = channel.on("broadcast", { event: "roll_request" }, (payload) => {
      const request = payload.payload as RollRequest;
      const diceBox = diceBoxRef.current;
      if (!diceBox) return;

      // Add to stable queue ref
      rollQueueRef.current.push(request);

      // Ensure we have diceBox
      if (diceBox) {
         // Sync dice color for this specific roll
         if (request.themeColor) {
            diceBox.updateConfig({ themeColor: request.themeColor });
         }

         let diceNotation = request.formula;
         // Special logic for formatting notation 
         // ADV/DISADV require 2d20
         if (request.rollType === "hit_adv" || request.rollType === "hit_disadv") {
             diceNotation = "2d20";
         }
         
         // In actual physics, we only care about the dice format string "1d20", "2d6", etc.
         // Pass an array to diceBox to natively roll multiple groups (e.g. 1d6 + 1d4 -> ["1d6", "1d4"])
         // CRITICAL: Filter out plain numeric modifiers as they aren't valid notation for dice-box.roll()
         const diceArray = diceNotation.split('+').map(s => s.trim()).filter(s => s.toLowerCase().includes('d'));
         
         try {
           diceBox.show();
           // Attempt to use 'add' if available for stacking, otherwise fall back to 'roll'
           if (typeof diceBox.add === 'function') {
             diceBox.add(diceArray);
           } else {
             diceBox.roll(diceArray);
           }
         } catch (err) {
           console.error("Dice roll execution error:", err);
           // Final fallback to the most basic roll if something went wrong
           try { diceBox.roll(diceArray); } catch (e) {}
         }
      }
    });

    return () => {
      // Supabase realtime channel listeners are managed by the parent hook.
      // Avoid calling removeChannel here as it kills the shared channel.
    };
  }, [channel, isReady]);

  return (
    <div
      id="dice-canvas"
      ref={containerRef}
      className="fixed top-0 left-0 w-screen h-screen z-50 pointer-events-none"
      style={{ background: "transparent" }}
    />
  );
}
