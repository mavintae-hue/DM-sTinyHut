import type { RollRequest, RollResult } from "@/hooks/useSupabaseRealtime";

type RollCompleteCallback = (result: Omit<RollResult, "timestamp">) => void;

interface QueueItem {
  req: RollRequest;
  getPlayerName: () => string;
  onComplete: RollCompleteCallback;
}

let _diceBox: any = null;
let _currentTheme = "default";
const _queue: QueueItem[] = [];

// Predefined Style Palettes
const RAINBOW_COLORS = ["#ff0000", "#ff7f00", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#8b00ff"];
const MAGIC_COLORS = ["#9333ea", "#c026d3", "#4f46e5", "#06b6d4", "#7e22ce"];
const MECHANIC_COLORS = ["#71717a", "#52525b", "#3f3f46", "#27272a", "#d4d4d8"];

/** Called by DiceCanvas once DiceBox is initialized */
export function registerDiceBox(box: any) {
  _diceBox = box;

  box.onRollComplete = (results: any) => {
    const item = _queue.shift();
    if (!item) return;

    const { req, onComplete } = item;

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

    onComplete({
      playerName: req.playerName,
      actionName: req.actionName,
      rollType: req.rollType,
      resultTotal: finalTotal,
      resultDetails: { rolls, modifier: req.modifier, formula: req.formula, isNat20, isNat1 },
    });

    // Clear dice from screen after 2.5s
    setTimeout(() => {
      try { _diceBox?.clear(); } catch (_) {}
    }, 2500);
  };

  console.log("[DiceManager] DiceBox registered and ready ✓");
}

/** Update dice theme or color globally */
export function setDiceTheme(color: string, theme: string = "default") {
  _currentTheme = theme;
  if (_diceBox) {
    const config: any = { theme };
    if (color.startsWith('#')) {
        config.themeColor = color;
    }
    try { _diceBox.updateConfig(config); } catch (_) {}
  }
}

/** ─── Fallback: instant JS roll ─────────────────────────────────────────── */
function instantRoll(
  req: RollRequest,
  onComplete: RollCompleteCallback
) {
  const notation = (req.rollType === "hit_adv" || req.rollType === "hit_disadv") ? "2d20" : req.formula;
  const match = notation.match(/^(\d*)d(\d+)/i);
  const count = parseInt(match?.[1] || "1") || 1;
  const faces = parseInt(match?.[2] || "20") || 20;

  const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * faces));
  let chosenDie = rolls[0] || 0;
  let finalTotal = rolls.reduce((a, b) => a + b, 0) + req.modifier;

  if (req.rollType === "hit_adv" && rolls.length === 2) {
    chosenDie = Math.max(...rolls);
    finalTotal = chosenDie + req.modifier;
  } else if (req.rollType === "hit_disadv" && rolls.length === 2) {
    chosenDie = Math.min(...rolls);
    finalTotal = chosenDie + req.modifier;
  }

  const isNat20 = req.rollType.startsWith("hit_") && chosenDie === 20;
  const isNat1  = req.rollType.startsWith("hit_") && chosenDie === 1;

  onComplete({
    playerName: req.playerName,
    actionName: req.actionName,
    rollType: req.rollType,
    resultTotal: finalTotal,
    resultDetails: { rolls, modifier: req.modifier, formula: req.formula, isNat20, isNat1 },
  });
}

/** ─── Main roll entry point ──────────────────────────────────────────────── */
export function rollDice(
  req: RollRequest,
  getPlayerName: () => string,
  onComplete: RollCompleteCallback,
  overrideTheme?: string
) {
  if (_diceBox) {
    const style = req.themeColor || "#9b111e";
    const theme = overrideTheme || _currentTheme;
    
    let notation = req.formula;
    if (req.rollType === "hit_adv" || req.rollType === "hit_disadv") {
      notation = "2d20";
    }

    const groups = notation.split("+").map(s => s.trim()).filter(s => /\d*d\d+/i.test(s));

    if (groups.length > 0) {
      _queue.push({ req, getPlayerName, onComplete });

      try {
        _diceBox.show();
        _diceBox.updateConfig({ theme }); // Ensure the theme is correct for this roll

        const rollArray: any[] = [];
        groups.forEach(g => {
            const match = g.match(/^(\d*)d(\d+)/i);
            const count = parseInt(match?.[1] || "1") || 1;
            const faces = parseInt(match?.[2] || "20") || 20;

            for (let i = 0; i < count; i++) {
                let color = style;
                if (style === "rainbow") color = RAINBOW_COLORS[Math.floor(Math.random() * RAINBOW_COLORS.length)];
                if (style === "magic") color = MAGIC_COLORS[Math.floor(Math.random() * MAGIC_COLORS.length)];
                if (style === "mechanic") color = MECHANIC_COLORS[Math.floor(Math.random() * MECHANIC_COLORS.length)];
                
                rollArray.push({
                    qty: 1,
                    sides: faces,
                    themeColor: color,
                    theme // Per-roll theme
                });
            }
        });

        _diceBox.roll(rollArray);
        return;
      } catch (err) {
        console.error("[DiceManager] DiceBox.roll() error:", err);
        _queue.pop();
      }
    }
  }

  instantRoll(req, onComplete);
}
