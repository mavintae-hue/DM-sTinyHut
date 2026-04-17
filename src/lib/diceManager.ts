import type { RollRequest, RollResult } from "@/hooks/useSupabaseRealtime";

export type DiceStatus = 'idle' | 'loading' | 'ready' | 'error';
type RollCompleteCallback = (result: Omit<RollResult, "timestamp">) => void;

interface QueueItem {
  req: RollRequest;
  getPlayerName: () => string;
  onComplete: RollCompleteCallback;
}

let _diceBox: any = null;
let _diceInitStatus: DiceStatus = 'idle';
const _pendingRolls = new Map<string, QueueItem>();

/** Destroy the current DiceBox instance (called before reinitializing) */
export function destroyDiceBox() {
  _diceBox = null;
  _diceInitStatus = 'idle';
  _pendingRolls.clear();
  console.log("[DiceManager] DiceBox destroyed");
}

/** Called by DiceCanvas once DiceBox is initialized */
export function registerDiceBox(box: any) {
  if (!box) return;
  console.log("[DiceManager] Registering DiceBox instance");
  _diceBox = box;

  // dice-box-threejs fires onRollComplete with { sets, total, notation }
  box.onRollComplete = (result: any) => {
    console.log("[DiceManager] onRollComplete fired:", result);

    // Grab the first (and only) pending roll
    let item: QueueItem | undefined;
    if (_pendingRolls.size > 0) {
      const entries = Array.from(_pendingRolls.entries());
      item = entries[entries.length - 1][1];
      _pendingRolls.clear();
    }

    if (!item) {
      console.warn("[DiceManager] Roll result received but no pending request found.");
      safeClear();
      return;
    }

    const { req, onComplete } = item;

    // Parse the new result format: { sets: [{rolls:[{value},...], total},...], total, modifier }
    const rolls: number[] = [];
    let totalFromDice = 0;

    if (result?.sets && Array.isArray(result.sets)) {
      result.sets.forEach((set: any) => {
        if (Array.isArray(set.rolls)) {
          set.rolls.forEach((r: any) => {
            rolls.push(r.value);
            totalFromDice += r.value;
          });
        }
      });
    } else if (typeof result?.total === "number") {
      // Fallback: just use total
      totalFromDice = result.total;
      rolls.push(result.total);
    }

    let chosenDie = rolls[0] || 0;
    let finalTotal = totalFromDice + req.modifier;

    if (req.rollType === "hit_adv" && rolls.length >= 2) {
      chosenDie = Math.max(...rolls);
      finalTotal = chosenDie + req.modifier;
    } else if (req.rollType === "hit_disadv" && rolls.length >= 2) {
      chosenDie = Math.min(...rolls);
      finalTotal = chosenDie + req.modifier;
    }

    const isD20 = req.formula.toLowerCase().includes("d20") || req.rollType.startsWith("hit_");
    const isNat20 = isD20 && chosenDie === 20;
    const isNat1  = isD20 && chosenDie === 1;

    onComplete({
      playerName: req.playerName,
      actionName: req.actionName,
      rollType: req.rollType,
      resultTotal: finalTotal,
      resultDetails: { rolls, modifier: req.modifier, formula: req.formula, isNat20, isNat1 },
    });

    // Clear dice after animation settles
    setTimeout(safeClear, 3000);
  };

  _diceInitStatus = 'ready';
  console.log("[DiceManager] ThreeJS DiceBox registered and ready ✓");
}

function safeClear() {
  try {
    // dice-box-threejs uses clearDice(), not clear()
    if (_diceBox?.clearDice) _diceBox.clearDice();
  } catch (_) {}
}

export const setDiceInitStatus = (status: DiceStatus) => {
  _diceInitStatus = status;
};

export const getDiceInitStatus = () => _diceInitStatus;

/** Theme-setting is handled at construction time, this is a no-op stub for compat */
export function setDiceTheme(_color: string, _theme: string = "wood") {
  // dice-box-threejs doesn't expose updateConfig — theme is set at init time
  // Future: could reinitialize the box with new theme
}

/** ─── Fallback: instant JS roll ─────────────────────────────────────────── */
function instantRoll(req: RollRequest, onComplete: RollCompleteCallback) {
  console.log("[DiceManager] Triggering INSTANT ROLL fallback...");
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

  const isD20 = req.formula.toLowerCase().includes("d20") || req.rollType.startsWith("hit_");
  const isNat20 = isD20 && chosenDie === 20;
  const isNat1  = isD20 && chosenDie === 1;

  onComplete({
    playerName: req.playerName,
    actionName: req.actionName,
    rollType: req.rollType,
    resultTotal: finalTotal,
    resultDetails: { rolls, modifier: req.modifier, formula: req.formula, isNat20, isNat1 },
  });
}

/** ─── Deterministic Sync Generation ───────────────────────────────────────── */
export function generateDeterministicRoll(req: RollRequest): string[] {
  let notation = req.formula;
  if (req.rollType === "hit_adv" || req.rollType === "hit_disadv") {
    notation = "2d20";
  }

  const cleanNotation = notation.replace(/k[hl]\d+/gi, "");
  const diceGroups = cleanNotation.match(/(?:\d+)?d\d+/gi) || [];

  return diceGroups.map(group => {
    const match = group.match(/^(\d*)d(\d+)/i);
    const count = parseInt(match?.[1] || "1") || 1;
    const faces = parseInt(match?.[2] || "20") || 20;
    const rolls = Array.from({ length: count }, () => Math.ceil(Math.random() * faces));
    // Format: "2d6@3,4" — forces specific outcomes
    return `${group}@${rolls.join(',')}`;
  });
}

/** ─── Build a single notation string from forced notations ─────────────── */
function buildNotationString(forcedNotations: string[]): string {
  // dice-box-threejs roll() takes a SINGLE string, e.g. "2d6@3,4" or "1d20@18"
  // For multiple groups, join them (the library parses "1d8+2d6" style)
  // But forced notation only works on a single group at a time, so roll them one by one
  return forcedNotations[0] || "1d20";
}

/** ─── Main roll entry point ──────────────────────────────────────────────── */
export function rollDice(
  req: RollRequest,
  getPlayerName: () => string,
  onComplete: RollCompleteCallback,
  _overrideTheme?: string
) {
  if (_diceBox && _diceInitStatus === 'ready') {
    let notation: string;

    if (req.forcedNotations && req.forcedNotations.length > 0) {
      // Use first forced group - single notation string for the 3D render
      // The math is already pre-calculated in forcedNotations
      notation = buildNotationString(req.forcedNotations);
    } else {
      // Build notation from formula
      let formula = req.formula;
      if (req.rollType === "hit_adv" || req.rollType === "hit_disadv") {
        formula = "2d20";
      }
      const cleanFormula = formula.replace(/k[hl]\d+/gi, "");
      const groups = cleanFormula.match(/(?:\d+)?d\d+/gi) || [];
      if (groups.length === 0) {
        console.warn("[DiceManager] No valid dice in formula:", req.formula);
        instantRoll(req, onComplete);
        return;
      }
      notation = groups[0] ?? "1d20"; // roll first group visually
    }

    const rollId = `roll_${Date.now()}`;
    _pendingRolls.set(rollId, { req, getPlayerName, onComplete });

    try {
      console.log(`[DiceManager] Rolling notation: "${notation}"`);
      // dice-box-threejs roll() takes a single string — e.g. "1d20@18"
      const result = _diceBox.roll(notation);
      if (result instanceof Promise) {
        result.catch((e: any) => console.error("[DiceBox] Roll promise rejected:", e));
      }
      return;
    } catch (err: any) {
      console.error("[DiceManager] DiceBox.roll() failed:", err?.message || err);
      _pendingRolls.delete(rollId);
    }
  } else {
    console.warn("[DiceManager] DiceBox not ready, falling back to instant JS roll.");
  }

  instantRoll(req, onComplete);
}
