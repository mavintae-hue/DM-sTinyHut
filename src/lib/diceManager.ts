import type { RollRequest, RollResult } from "@/hooks/useSupabaseRealtime";

type RollCompleteCallback = (result: Omit<RollResult, "timestamp">) => void;

interface QueueItem {
  req: RollRequest;
  getPlayerName: () => string;
  onComplete: RollCompleteCallback;
}

let _diceBox: any = null;
const _queue: QueueItem[] = [];

/** Called by DiceCanvas once DiceBox is initialized */
export function registerDiceBox(box: any) {
  _diceBox = box;

  box.onRollComplete = (results: any) => {
    const item = _queue.shift();
    if (!item) return;

    const { req, getPlayerName, onComplete } = item;
    if (req.playerName !== getPlayerName()) return; // wrong player

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
  };

  console.log("[DiceManager] DiceBox registered and ready.");
}

/** Update dice theme color */
export function setDiceTheme(color: string) {
  if (_diceBox) {
    try { _diceBox.updateConfig({ themeColor: color }); } catch (_) {}
  }
}

/** Directly roll dice — no React state required */
export function rollDice(
  req: RollRequest,
  getPlayerName: () => string,
  onComplete: RollCompleteCallback
) {
  if (!_diceBox) {
    console.warn("[DiceManager] DiceBox not ready yet. Ignoring roll.");
    return;
  }

  if (req.themeColor) {
    try { _diceBox.updateConfig({ themeColor: req.themeColor }); } catch (_) {}
  }

  // Determine dice notation
  let notation = req.formula;
  if (req.rollType === "hit_adv" || req.rollType === "hit_disadv") {
    notation = "2d20";
  }

  // Extract only dice parts (e.g. "1d20" from "1d20+5")
  const diceArray = notation
    .split("+")
    .map((s) => s.trim())
    .filter((s) => /\d*d\d+/i.test(s));

  if (diceArray.length === 0) {
    console.warn("[DiceManager] No valid dice notation in:", notation);
    return;
  }

  console.log("[DiceManager] Rolling", diceArray, "for", req.actionName);
  _queue.push({ req, getPlayerName, onComplete });

  try {
    _diceBox.show();
    _diceBox.roll(diceArray);
  } catch (err) {
    console.error("[DiceManager] roll() failed:", err);
    _queue.pop();
  }
}
