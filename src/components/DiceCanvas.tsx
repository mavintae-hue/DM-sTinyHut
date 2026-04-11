"use client";

import { useEffect, useRef } from "react";
import { registerDiceBox, setDiceTheme, setDiceInitStatus } from "@/lib/diceManager";

interface DiceCanvasProps {
  themeColor: string;
  diceTheme: string;
}

export default function DiceCanvas({ themeColor, diceTheme }: DiceCanvasProps) {
  const initAttempted = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (initAttempted.current) return;
    initAttempted.current = true;

    const initDice = async () => {
      console.log("[DiceCanvas] Starting DiceBox initialization...");
      setDiceInitStatus('loading');

      // Inject container directly into body so it's guaranteed to exist
      let container = document.getElementById("dice-box-root");
      if (!container) {
        container = document.createElement("div");
        container.id = "dice-box-root";
        Object.assign(container.style, {
          position: "fixed",
          top: "0",
          left: "0",
          width: "100vw",
          height: "100vh",
          pointerEvents: "none",
          zIndex: "500",
          overflow: "visible",
          background: "transparent",
        });
        document.body.appendChild(container);
        console.log("[DiceCanvas] Injected #dice-box-root into body");
      }

      try {
        const mod = await import("@3d-dice/dice-box");
        const DiceBox = mod.default || mod;

        if (typeof DiceBox !== 'function') {
          throw new Error("DiceBox constructor not found in module exports");
        }

        // Standard constructor: (container_selector, options)
        const box = new (DiceBox as any)("#dice-box-root", {
          assetPath: "/dice-assets/", 
          theme: diceTheme,
          themeColor,
          scale: 9,
          gravity: 1.5,
          startingHeight: 25,
          spinForce: 15,
          throwForce: 10,
        });

        await box.init();

        // Style the resulting canvas directly
        const canvas = container!.querySelector("canvas");
        if (canvas) {
          Object.assign(canvas.style, {
            width: "100%",
            height: "100%",
            display: "block",
            pointerEvents: "none",
          });
        }

        registerDiceBox(box);
        setDiceInitStatus('ready');
        console.log("[DiceCanvas] ✓ DiceBox ready and registered!");

      } catch (err) {
        console.error("[DiceCanvas] DiceBox init FAILED:", err);
        setDiceInitStatus('error');
        // Allow retry on next mount
        initAttempted.current = false;
      }
    };

    // Use a slight delay to ensure the body is ready in Next.js hydrate phase
    const timer = setTimeout(initDice, 100);
    return () => clearTimeout(timer);
  }, []);

  // Sync theme/color to DiceBox whenever props change
  useEffect(() => {
    setDiceTheme(themeColor, diceTheme);
  }, [themeColor, diceTheme]);

  // No rendered DOM — container lives directly in document.body
  return null;
}
