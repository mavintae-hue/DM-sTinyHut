import type { RollRequest, RollResult } from "@/hooks/useSupabaseRealtime";

export type DiceStatus = 'idle' | 'loading' | 'ready' | 'error';
type RollCompleteCallback = (result: Omit<RollResult, "timestamp">) => void;

interface QueueItem {
  req: RollRequest;
  getPlayerName: () => string;
  onComplete: RollCompleteCallback;
}

let _diceBox: any = null;
let _currentTheme = "default";
let _diceInitStatus: DiceStatus = 'idle';

const _pendingRolls = new Map<string, QueueItem>();

/** Called by DiceCanvas once DiceBox is initialized */
export function registerDiceBox(box: any) {
  if (!box) return;
  console.log("[DiceManager] Registering DiceBox instance", box);
  _diceBox = box;

  box.onRollComplete = (results: any) => {
    // dice-box-threejs results normally come in an array
    const rollId = results[0]?.groupId || results[0]?.id || "unknown";
    let item = _pendingRolls.get(rollId);
    
    if (!item && _pendingRolls.size > 0) {
      const entries = Array.from(_pendingRolls.entries());
      item = entries[entries.length - 1][1];
      _pendingRolls.clear();
    } else if (item) {
      _pendingRolls.delete(rollId);
    }
    
    if (!item) {
        console.warn("[DiceManager] Result received but unmatched to a pending request.");
        setTimeout(() => { try { _diceBox?.clear(); } catch (_) {} }, 2500);
        return;
    }
    
    const { req, onComplete } = item;

    let totalFromDice = 0;
    const rolls: number[] = [];

    if (Array.isArray(results)) {
      results.forEach((group: any) => {
          if (group.value !== undefined) {
              totalFromDice += group.value;
              rolls.push(group.value);
          } 
          else if (group.rolls) {
              group.rolls.forEach((r: any) => {
                  totalFromDice += r.value;
                  rolls.push(r.value);
              });
          }
      });
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

    setTimeout(() => {
      try { _diceBox?.clear(); } catch (_) {}
    }, 2500);
  };

  _diceInitStatus = 'ready';
  console.log("[DiceManager] ThreeJS DiceBox registered and ready ✓");
}

export const setDiceInitStatus = (status: DiceStatus) => {
  _diceInitStatus = status;
};

export const getDiceInitStatus = () => _diceInitStatus;

/** Update dice theme or color globally */
export function setDiceTheme(color: string, theme: string = "wood") {
  _currentTheme = theme;
  if (_diceBox) {
    const config: any = { theme_texture: `/dice-assets/textures/${theme}.webp` };
    if (color && color.startsWith('#')) {
        config.theme_color = color;
    }
    try { _diceBox.updateConfig(config); } catch (_) {}
  }
}

/** ─── Fallback: instant JS roll ─────────────────────────────────────────── */
function instantRoll(
  req: RollRequest,
  onComplete: RollCompleteCallback
) {
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
    return `${group}@${rolls.join(',')}`;
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
    const theme = overrideTheme || req.diceTheme || _currentTheme;
    
    // We expect the network payload to provide the perfectly synced predetermined values
    // If not provided (i.e. single-player isolated test), fallback to natural formula
    let rollPayload: string | string[] = req.formula;

    if (req.forcedNotations && req.forcedNotations.length > 0) {
      rollPayload = req.forcedNotations;
    } else {
      let notation = req.formula;
      if (req.rollType === "hit_adv" || req.rollType === "hit_disadv") {
        notation = "2d20";
      }
      const cleanNotation = notation.replace(/k[hl]\d+/gi, "");
      rollPayload = cleanNotation.match(/(?:\d+)?d\d+/gi) || [];
    }

    if (rollPayload.length === 0) {
       console.warn("[DiceManager] No valid dice found in formula:", req.formula);
       instantRoll(req, onComplete);
       return;
    }

    const rollId = `roll_${Date.now()}`;
    _pendingRolls.set(rollId, { req, getPlayerName, onComplete });

    try {
      console.log(`[DiceManager] Rolling payload:`, rollPayload, `with theme: ${theme}`);
      
      // For dice-box-threejs we might want to map theme names back to textures if we have complex logic,
      // but for now we'll just pipe it back to theme_texture. 
      // If the URL is provided, it handles it in updateConfig
      _diceBox.updateConfig({ theme_color: style }); 

      const result = _diceBox.roll(rollPayload);
      
      if (result instanceof Promise) {
          result.catch(e => console.error("[DiceBox] Roll Promise rejected:", e));
      }
      return;
    } catch (err: any) {
      console.error("[DiceManager] DiceBox.roll() failed entirely:", err);
      _pendingRolls.delete(rollId);
    }
  } else {
    console.warn("[DiceManager] DiceBox not ready, falling back to instant JS roll.");
  }

  // Always fallback to instant JS roll if 3D dice isn't ready or fails
  instantRoll(req, onComplete);
}
