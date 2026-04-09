import * as pdfjsLib from 'pdfjs-dist';

if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface ParsedAction {
  name: string;
  hitBonus: number;
  damageDice: string;
  range: string;
  notes: string;
}

export interface ParsedSkill {
  name: string;
  modifier: number;
  isProficient: boolean;
}

export interface ParsedCharacter {
  name: string;
  classLevel: string;
  race: string;
  ac: number;
  hpMax: number;
  hpCurrent: number;
  initiative: number;
  speed: string;
  proficiencyBonus: number;
  abilityScores: { [key: string]: number };
  skills: ParsedSkill[];
  saves: ParsedSkill[];
  actions: ParsedAction[];
}

export async function parseDnDBeyondPdf(file: File): Promise<ParsedCharacter> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  const items = textContent.items as any[];
  
  // Group text items by Y coordinate (rows)
  const rows: { [key: number]: any[] } = {};
  items.forEach(item => {
    const y = Math.round(item.transform[5]);
    if (!rows[y]) rows[y] = [];
    rows[y].push(item);
  });
  
  const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
  const sortedRows = sortedY.map(y => rows[y].sort((a, b) => a.transform[4] - b.transform[4]));

  const result: ParsedCharacter = {
    name: "Unknown",
    classLevel: "",
    race: "",
    ac: 10,
    hpMax: 10,
    hpCurrent: 10,
    initiative: 0,
    speed: "30 ft.",
    proficiencyBonus: 2,
    abilityScores: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
    skills: [],
    saves: [],
    actions: []
  };

  let inSkills = false;
  let inSaves = false;
  let inAttacks = false;
  let attackHeaderFound = false;

  for (let i = 0; i < sortedRows.length; i++) {
    const row = sortedRows[i];
    const rowText = row.map(item => item.str).join(' ');
    const y = sortedY[i];

    // --- CHARACTER IDENTITY ---
    if (rowText.includes("CHARACTER NAME")) {
       result.name = sortedRows[i-1]?.map(it => it.str).join(' ').trim() || result.name;
    }
    if (rowText.includes("CLASS & LEVEL")) {
       result.classLevel = sortedRows[i-1]?.map(it => it.str).join(' ').trim() || "";
    }
    if (rowText.includes("SPECIES")) {
       result.race = sortedRows[i-1]?.map(it => it.str).join(' ').trim() || "";
    }

    // --- COMBAT STATS (COORDINATE BASED) ---
    // Proficiency Bonus (Center, around Y 720)
    if (rowText.includes("PROFICIENCY BONUS")) {
       const val = sortedRows[i-1]?.map(it => it.str).join(' ').trim();
       result.proficiencyBonus = parseInt(val.replace(/[^-0-9]/g, '')) || 2;
    }
    // Armor Class (Center, around Y 720)
    if (rowText.includes("ARMOR CLASS")) {
       const val = sortedRows[i-1]?.map(it => it.str).join(' ').trim();
       result.ac = parseInt(val) || 10;
    }
    // Initiative
    if (rowText.includes("INITIATIVE")) {
       const val = sortedRows[i-1]?.map(it => it.str).join(' ').trim();
       result.initiative = parseInt(val.replace(/[^-0-9]/g, '')) || 0;
    }
    // HP
    if (rowText.includes("Max HP")) {
       const val = sortedRows[i-1]?.map(it => it.str).join(' ').trim();
       result.hpMax = parseInt(val) || 10;
       result.hpCurrent = result.hpMax; // Start full
    }
    // Speed
    if (rowText.includes("SPEED") && !rowText.includes("CLASS")) {
       result.speed = sortedRows[i-1]?.map(it => it.str).join(' ').trim() || "30 ft.";
    }

    // --- ABILITY SCORES (LEFT BOXES) ---
    // STR: ~685, DEX: ~586, CON: ~487, INT: ~388, WIS: ~288, CHA: ~189
    if (y > 670 && y < 700 && row[0]?.transform[4] < 120) result.abilityScores.str = parseInt(rowText) || result.abilityScores.str;
    if (y > 575 && y < 600 && row[0]?.transform[4] < 120) result.abilityScores.dex = parseInt(rowText) || result.abilityScores.dex;
    if (y > 475 && y < 505 && row[0]?.transform[4] < 120) result.abilityScores.con = parseInt(rowText) || result.abilityScores.con;
    if (y > 375 && y < 405 && row[0]?.transform[4] < 120) result.abilityScores.int = parseInt(rowText) || result.abilityScores.int;
    if (y > 275 && y < 305 && row[0]?.transform[4] < 120) result.abilityScores.wis = parseInt(rowText) || result.abilityScores.wis;
    if (y > 175 && y < 205 && row[0]?.transform[4] < 120) result.abilityScores.cha = parseInt(rowText) || result.abilityScores.cha;

    // --- SAVES & SKILLS ---
    if (rowText.includes("SAVING THROWS")) { inSaves = true; inSkills = false; continue; }
    if (rowText.includes("SKILLS") && !rowText.includes("ADDITIONAL")) { inSkills = true; inSaves = false; continue; }
    
    if (inSaves || inSkills) {
      if (rowText.includes("PASSIVE")) { inSkills = false; inSaves = false; }
      
      const modStr = row.find(it => it.str.match(/[+-]\d+/))?.str;
      if (modStr) {
        const nameText = row.map(it => it.str).join(' ').replace(modStr, '').trim();
        // Identify if name is a skill or save
        const isProf = row.some(it => it.str === 'E' || it.str === 'P'); // D&D Beyond uses symbols for proficiency
        
        const item = {
          name: nameText.split(' ').filter(w => w.length > 2).join(' '),
          modifier: parseInt(modStr),
          isProficient: isProf
        };
        
        if (inSaves) result.saves.push(item);
        else result.skills.push(item);
      }
    }

    // --- ATTACKS ---
    if (rowText.includes("WEAPON ATTACKS & CANTRIPS")) { inAttacks = true; continue; }
    if (inAttacks) {
      if (rowText.includes("NAME") && rowText.includes("HIT")) { attackHeaderFound = true; continue; }
      if (attackHeaderFound) {
        const namePart = row.filter(it => it.transform[4] < 150).map(it => it.str).join(' ').trim();
        const hitPart = row.filter(it => it.transform[4] >= 150 && it.transform[4] < 220).map(it => it.str).join(' ').trim();
        const damagePart = row.filter(it => it.transform[4] >= 220 && it.transform[4] < 380).map(it => it.str).join(' ').trim();
        const notesPart = row.filter(it => it.transform[4] >= 380).map(it => it.str).join(' ').trim();

        if (namePart && hitPart && (damagePart || hitPart.startsWith('+'))) {
          const diceMatch = damagePart.match(/(\d+d\d+([+-]\d+)?)/i);
          result.actions.push({
            name: namePart,
            hitBonus: parseInt(hitPart.replace(/[^-0-9]/g, '')) || 0,
            damageDice: diceMatch ? diceMatch[0] : (damagePart || "0"),
            range: "5 ft.",
            notes: notesPart
          });
        }
      }
    }
  }

  return result;
}
