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
let _isJustInitialized = false;
let _latestRollId: string | null = null;
const _pendingRolls = new Map<string, QueueItem>();

/** Destroy the current DiceBox instance (called before reinitializing) */
export function destroyDiceBox() {
  _diceBox = null;
  _diceInitStatus = 'loading'; // Signal that we are waiting for a new one
  _isJustInitialized = false;
  _pendingRolls.clear();
  console.log("[DiceManager] DiceBox reference cleared, status set to loading");
}

/** Called by DiceCanvas once DiceBox is initialized */
export function registerDiceBox(box: any) {
  if (!box) return;
  console.log("[DiceManager] Registering DiceBox instance");
  _diceBox = box;

  // dice-box-threejs fires onRollComplete with { sets, total, notation }
  box.onRollComplete = (result: any) => {
    console.log("[DiceManager] onRollComplete fired:", result);

    // Grab the first pending roll (FIFO)
    let item: QueueItem | undefined;
    if (_pendingRolls.size > 0) {
      const entries = Array.from(_pendingRolls.entries());
      const [key, firstItem] = entries[0];
      item = firstItem;
      _pendingRolls.delete(key);
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

    // Smart Auto-Clear: Only clear if this is still the latest roll after 7 seconds
    const thisRollId = _latestRollId;
    setTimeout(() => {
      if (_latestRollId === thisRollId) {
        console.log("[DiceManager] Auto-clearing dice after 7s timeout.");
        safeClear();
      }
    }, 7000);
  };

  _diceInitStatus = 'ready';
  _isJustInitialized = true;
  console.log("[DiceManager] ThreeJS DiceBox registered and ready ✓");
  
  // Reset the "just initialized" flag after 2 seconds
  setTimeout(() => { _isJustInitialized = false; }, 2000);
}

export function safeClear() {
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
  let notation = (req.rollType === "hit_adv" || req.rollType === "hit_disadv") ? "2d20" : req.formula;
  
  const cleanNotation = notation.replace(/k[hl]\d+/gi, "");
  const groups = cleanNotation.match(/(?:\d+)?d\d+/gi) || [];
  
  const rolls: number[] = [];
  let totalFromDice = 0;

  groups.forEach(group => {
    const match = group.match(/^(\d*)d(\d+)/i);
    const count = parseInt(match?.[1] || "1") || 1;
    const faces = parseInt(match?.[2] || "20") || 20;
    for (let i = 0; i < count; i++) {
      const r = Math.ceil(Math.random() * faces);
      rolls.push(r);
      totalFromDice += r;
    }
  });

  let chosenDie = rolls[0] || 0;
  let finalTotal = totalFromDice + req.modifier;

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
  // Construct one single valid string for the parser: NOTATION@VALUE1,VALUE2,...
  // Example: ["1d8@5", "2d6@3,4"] -> "1d8+2d6@5,3,4"
  const notations: string[] = [];
  const values: string[] = [];

  forcedNotations.forEach(fn => {
    const [not, val] = fn.split('@');
    if (not) notations.push(not);
    if (val) values.push(val);
  });

  const notationStr = notations.join('+');
  const valuesStr = values.length > 0 ? `@${values.join(',')}` : '';
  
  return (notationStr + valuesStr) || "1d20";
}

/** ─── Main roll entry point ──────────────────────────────────────────────── */
export async function rollDice(
  req: RollRequest,
  getPlayerName: () => string,
  onComplete: RollCompleteCallback,
  _retryCount = 0
) {
  // If we are currently loading or idle (re-initializing), wait a bit.
  // This prevents the "buggy first roll" fallback to instant JS roll.
  if ((_diceInitStatus === 'loading' || _diceInitStatus === 'idle' || !_diceBox) && _retryCount < 30) {
    console.log(`[DiceManager] DiceBox not ready (status: ${_diceInitStatus}), waiting retry ${_retryCount}...`);
    setTimeout(() => rollDice(req, getPlayerName, onComplete, _retryCount + 1), 200);
    return;
  }

  // Cooldown after switching themes to ensure physics world is stable
  if (_isJustInitialized && _retryCount === 0) {
    console.log("[DiceManager] DiceBox just initialized, adding 200ms cooldown for first roll stability...");
    const timeout = Math.random() * 50 + 150; // Jitter to prevent multi-client sync pileup
    setTimeout(() => rollDice(req, getPlayerName, onComplete, _retryCount + 1), timeout);
    return;
  }

  if (_diceBox && _diceInitStatus === 'ready') {
    let notation: string;

    if (req.forcedNotations && req.forcedNotations.length > 0) {
      notation = buildNotationString(req.forcedNotations);
    } else {
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
      notation = groups.join('+');
    }

    const rollId = `roll_${Date.now()}`;
    _latestRollId = rollId;
    _pendingRolls.set(rollId, { req, getPlayerName, onComplete });

    try {
      console.log(`[DiceManager] Rolling notation: "${notation}"`);
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
