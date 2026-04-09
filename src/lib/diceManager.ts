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

  console.log("[DiceManager] DiceBox registered and ready ✓");
}

/** Update dice theme color */
export function setDiceTheme(color: string) {
  if (_diceBox) {
    try { _diceBox.updateConfig({ themeColor: color }); } catch (_) {}
  }
}

/** ─── Fallback: instant JS roll (no 3D animation) ─────────────────────────── */
function instantRoll(
  req: RollRequest,
  onComplete: RollCompleteCallback
) {
  // Parse dice count and faces from formula (e.g. "2d20", "1d6")
  const notation = (req.rollType === "hit_adv" || req.rollType === "hit_disadv")
    ? "2d20"
    : req.formula;

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
  } else {
    chosenDie = rolls[0] || 0;
  }

  const isNat20 = req.rollType.startsWith("hit_") && chosenDie === 20;
  const isNat1  = req.rollType.startsWith("hit_") && chosenDie === 1;

  console.log("[DiceManager] Instant fallback roll:", rolls, "total:", finalTotal);

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
  onComplete: RollCompleteCallback
) {
  // ── Try 3D DiceBox first ──────────────────────────────────────────────────
  if (_diceBox) {
    if (req.themeColor) {
      try { _diceBox.updateConfig({ themeColor: req.themeColor }); } catch (_) {}
    }

    let notation = req.formula;
    if (req.rollType === "hit_adv" || req.rollType === "hit_disadv") {
      notation = "2d20";
    }

    const diceArray = notation
      .split("+")
      .map((s) => s.trim())
      .filter((s) => /\d*d\d+/i.test(s));

    if (diceArray.length > 0) {
      console.log("[DiceManager] 3D rolling:", diceArray, "for", req.actionName);
      _queue.push({ req, getPlayerName, onComplete });

      try {
        _diceBox.show();
        _diceBox.roll(diceArray);
        return; // Success — onRollComplete will call onComplete
      } catch (err) {
        console.error("[DiceManager] DiceBox.roll() error:", err);
        _queue.pop(); // Remove from queue — fall through to instant roll
      }
    }
  } else {
    console.warn("[DiceManager] DiceBox not ready, using instant fallback");
  }

  // ── Fallback: instant JS roll ─────────────────────────────────────────────
  instantRoll(req, onComplete);
}
