"use client";

import { useEffect } from "react";
import { registerDiceBox, setDiceTheme } from "@/lib/diceManager";

interface DiceCanvasProps {
  themeColor: string;
  diceTheme: string;
}

// Module-level guard — DiceBox is a heavy singleton, only init once per page load
let _boxInitialized = false;
let _boxInitializing = false;

export default function DiceCanvas({ themeColor, diceTheme }: DiceCanvasProps) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (_boxInitialized || _boxInitializing) return;
    _boxInitializing = true;

    // Inject container directly into body so it's guaranteed to exist
    // and is NOT inside any React-managed subtree that could unmount
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

    const initDice = async () => {
      console.log("[DiceCanvas] Starting DiceBox initialization...");
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
        _boxInitialized = true;
        _boxInitializing = false;
        (window as any).__diceBox = box;
        console.log("[DiceCanvas] ✓ DiceBox ready and registered!");

      } catch (err) {
        console.error("[DiceCanvas] DiceBox init FAILED:", err);
        _boxInitializing = false;
      }
    };

    initDice();
    return () => {};
  }, []);

  // Sync theme/color to DiceBox whenever props change
  useEffect(() => {
    setDiceTheme(themeColor, diceTheme);
  }, [themeColor, diceTheme]);

  // No rendered DOM — container lives directly in document.body
  return null;
}
