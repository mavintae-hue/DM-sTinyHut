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

  // Helper to find annotation by name (robustly)
  const getAnn = (name: string | RegExp) => {
    const ann = annotations.find(a => {
      if (!a.fieldName) return false;
      const field = a.fieldName.trim();
      if (typeof name === 'string') {
        const target = name.trim();
        return field === target || field.toLowerCase() === target.toLowerCase();
      }
      return name.test(field);
    });
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
  for (let i = 1; i <= 10; i++) {
     const wpnName = getAnn(`Wpn Name ${i}`) || (i === 1 ? getAnn("Wpn Name") : "");
     
     if (wpnName) {
        // Try multiple attack bonus patterns due to variable spacing in PDFs
        const hitVal = getAnn(`Wpn${i} AtkBonus`) || getAnn(`Wpn ${i} AtkBonus`) || getAnn(new RegExp(`Wpn.*${i}.*AtkBonus`, 'i'));
        const hitBonus = parseInt(hitVal.replace(/[^-0-9]/g, '')) || 0;
        
        const damageVal = getAnn(`Wpn${i} Damage`) || getAnn(`Wpn ${i} Damage`) || getAnn(new RegExp(`Wpn.*${i}.*Damage`, 'i'));
        const damage = damageVal || "0";
        
        const notes = getAnn(`Wpn Notes ${i}`) || getAnn(new RegExp(`Wpn.*Notes.*${i}`, 'i')) || "";
        
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
      const val = getAnn(skill) || getAnn(new RegExp(`^${skill}`, 'i'));
      if (val) {
          result.skills.push({
              name: skill === "Animal" ? "Animal Handling" : skill === "SleightofHand" ? "Sleight of Hand" : skill,
              modifier: parseInt(val.replace(/[^-0-9]/g, '')) || 0,
              isProficient: !!getAnn(`${skill}Prof`) || getAnn(`${skill.replace(/\s/g, '')}Prof`) !== ""
          });
      }
  });

  // --- Extract Saving Throws ---
  const saveList = [
    { key: "str", name: "Strength" },
    { key: "dex", name: "Dexterity" },
    { key: "con", name: "Constitution" },
    { key: "int", name: "Intelligence" },
    { key: "wis", name: "Wisdom" },
    { key: "cha", name: "Charisma" }
  ];
  saveList.forEach(save => {
      // Try multiple common D&D Beyond field patterns for Saving Throws
      const val = getAnn(`ST ${save.name}`) || getAnn(`${save.name} ST`) || getAnn(`${save.key.toUpperCase()} ST`);
      
      if (val) {
          // Try multiple common patterns for Saving Throw Proficiency
          const prof = getAnn(`ST ${save.name} Prof`) || 
                       getAnn(`${save.name} ST Prof`) || 
                       getAnn(`Check Box ${save.name} ST`) || 
                       getAnn(`${save.key.charAt(0).toUpperCase()}${save.key.slice(1)}Prof`) ||
                       getAnn(`${save.name.substring(0, 3)}Prof`);
          
          result.saves.push({
              name: save.name,
              modifier: parseInt(val.replace(/[^-0-9]/g, '')) || 0,
              isProficient: !!prof && !["Off", "No", ""].includes(prof.toString().trim())
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
