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
  const diceBoxRef = useRef<any>(null);
  const [isReady, setIsReady] = useState(false);

  // Keep the callback ref up to date so the one-time init can always use the latest prop
  useEffect(() => {
    onRollCompleteRef.current = onRollComplete;
  }, [onRollComplete]);

  useEffect(() => {
    // Determine if we're in a browser environment
    if (typeof window === "undefined") return;

    // Use a small delay to ensure the container is truly ready in the DOM
    let diceBox: any = null;
    const initDelay = setTimeout(async () => {
      if (!containerRef.current || diceBoxRef.current) return;

      try {
        diceBox = new DiceBox({
          container: "#dice-container", 
          assetPath: "https://unpkg.com/@3d-dice/dice-box@1.1.4/dist/assets/",
          theme: "default",
          themeColor: themeColor,
          scale: 7, 
          spinForce: 10,
          throwForce: 30, 
          gravity: 2,
          startingHeight: 12
        });

        console.log("DiceBox: Starting initialization...");
        await diceBox.init();
        console.log("DiceBox: Initialization successful!");
        
        diceBoxRef.current = diceBox;
        setIsReady(true);
        
        diceBox.onRollComplete = (results: any) => {
          const req = rollQueueRef.current.shift();
          if (!req) return;

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
      } catch (e) {
        console.error("DiceBox: Initialization failed!", e);
      }
    }, 500); // Increased delay for stability

    return () => {
      clearTimeout(initDelay);
      if (diceBoxRef.current) {
        // Clear references
        diceBoxRef.current = null;
        setIsReady(false);
      }
    };
  }, []); 

  useEffect(() => {
    if (isReady && diceBoxRef.current) {
        try {
          diceBoxRef.current.updateConfig({ themeColor });
        } catch (e) {}
    }
  }, [themeColor, isReady]);

  useEffect(() => {
    if (!channel || !isReady) return;

    const listener = (payload: any) => {
      const request = payload.payload as RollRequest;
      const diceBox = diceBoxRef.current;
      if (!diceBox) {
        console.warn("DiceBox: Request received but box not ready.");
        return;
      }

      rollQueueRef.current.push(request);

      if (request.themeColor) {
        try { diceBox.updateConfig({ themeColor: request.themeColor }); } catch (e) {}
      }

      let diceNotation = request.formula;
      if (request.rollType === "hit_adv" || request.rollType === "hit_disadv") {
        diceNotation = "2d20";
      }
      
      const diceArray = diceNotation.split('+')
        .map(s => s.trim())
        .filter(s => s.toLowerCase().includes('d'));
      
      console.log("DiceBox: Rolling", diceArray);
      try {
        diceBox.show();
        // Use roll() as the primary method for better compatibility
        diceBox.roll(diceArray);
      } catch (err) {
        console.error("DiceBox: Roll failed!", err);
      }
    };

    const sub = channel.on("broadcast", { event: "roll_request" }, listener);

    return () => {
      // Supabase V2 cleans up broadcast listeners when channel is removed/unsubscribed
    };
  }, [channel, isReady, playerName]);

  return (
    <div
      id="dice-container"
      ref={containerRef}
      className="fixed inset-0 z-[9999] pointer-events-none"
      style={{ width: '100vw', height: '100vh', background: 'transparent' }}
    />
  );
}
