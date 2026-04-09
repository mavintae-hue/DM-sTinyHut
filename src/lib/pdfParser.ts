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
  senses: any;
}

export async function parseDnDBeyondPdf(file: File): Promise<ParsedCharacter> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  const page = await pdf.getPage(1);
  const annotations = await page.getAnnotations();
  // Get text content as fallback for AC/Speed sometimes
  const textContent = await page.getTextContent();
  const items = textContent.items as any[];

  // Define the result object
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
    actions: [],
    senses: {}
  };

  // Helper to find annotation by name regex or exact string
  const getAnn = (name: string | RegExp) => {
    const ann = annotations.find(a => a.fieldName && (typeof name === 'string' ? a.fieldName === name : name.test(a.fieldName)));
    return ann ? ann.fieldValue || "" : "";
  };

  // --- Extract Identity ---
  result.name = getAnn("CharacterName") || result.name;
  result.classLevel = getAnn("CLASS  LEVEL") || getAnn(/class.*level/i) || result.classLevel;
  result.race = getAnn("RACE") || result.race;

  // --- Extract Core Stats ---
  const hpRaw = getAnn("MaxHP") || getAnn(/hp.*max/i);
  result.hpMax = parseInt(hpRaw) || 10;
  result.hpCurrent = result.hpMax;

  const acRaw = getAnn("AC");
  result.ac = parseInt(acRaw) || 10;

  const initRaw = getAnn("Init");
  result.initiative = parseInt(initRaw.replace(/[^-0-9]/g, '')) || 0;

  result.speed = getAnn("Speed") || "30 ft.";
  
  const profRaw = getAnn("ProfBonus");
  result.proficiencyBonus = parseInt(profRaw.replace(/[^-0-9]/g, '')) || 2;

  // --- Extract Ability Scores ---
  const extractScore = (key: string, name: string) => {
     const val = getAnn(name);
     if (val) result.abilityScores[key] = parseInt(val) || result.abilityScores[key];
  };
  extractScore('str', 'STR');
  extractScore('dex', 'DEX');
  extractScore('con', 'CON');
  extractScore('int', 'INT');
  extractScore('wis', 'WIS');
  extractScore('cha', 'CHA');

  // --- Extract Weapons (Actions) ---
  // Weapons usually follow Wpn Name, Wpn1 AtkBonus, Wpn1 Damage
  for (let i = 1; i <= 10; i++) {
     const nameKey = i === 1 ? "Wpn Name" : `Wpn Name ${i}`;
     const wpnName = getAnn(nameKey);
     
     if (wpnName) {
        const hitBonus = parseInt(getAnn(`Wpn${i} AtkBonus`).replace(/[^-0-9]/g, '')) || 0;
        const damage = getAnn(`Wpn${i} Damage`) || "0";
        const notes = getAnn(`Wpn Notes ${i}`) || "";
        
        // Try to identify range vs melee from notes or name
        let rangeType = "Melee";
        if (notes.toLowerCase().includes("range") || wpnName.toLowerCase().includes("bow") || wpnName.toLowerCase().includes("rifle") || wpnName.toLowerCase().includes("pistol")) {
            rangeType = "Range";
        }

        const diceMatch = damage.match(/(\d+d\d+([+-]\d+)?)/i);
        
        result.actions.push({
           name: wpnName,
           hitBonus: hitBonus,
           damageDice: diceMatch ? diceMatch[0] : damage,
           range: rangeType,
           notes: notes
        });
     }
  }

  // --- Extract Skills ---
  const skillList = ["Acrobatics", "Animal", "Arcana", "Athletics", "Deception", "History", "Insight", "Intimidation", "Investigation", "Medicine", "Nature", "Perception", "Performance", "Persuasion", "Religion", "SleightofHand", "Stealth", "Survival"];
  skillList.forEach(skill => {
      const val = getAnn(skill);
      if (val) {
          result.skills.push({
              name: skill === "Animal" ? "Animal Handling" : skill === "SleightofHand" ? "Sleight of Hand" : skill,
              modifier: parseInt(val.replace(/[^-0-9]/g, '')) || 0,
              isProficient: !!getAnn(`${skill}Prof`)
          });
      }
  });

  // --- Extract Senses ---
  result.senses = {
      passive_perception: parseInt(getAnn("Passive1")) || 10,
      passive_investigation: parseInt(getAnn("Passive2")) || 10,
      passive_insight: parseInt(getAnn("Passive3")) || 10,
      darkvision: getAnn("AdditionalSenses") || ""
  };

  return result;
}
