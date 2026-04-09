import * as pdfjsLib from 'pdfjs-dist';

// Set up worker
// In a Next.js environment, we need to handle the worker properly.
// Using a CDN link for the worker as it's the most reliable way in some environments.
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export interface ParsedAction {
  name: string;
  hitBonus: number;
  damageDice: string;
  range: string;
  notes: string;
}

export interface ParsedCharacter {
  name: string;
  actions: ParsedAction[];
}

export async function parseDnDBeyondPdf(file: File): Promise<ParsedCharacter> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  
  // We only really need the first page for characters name and attacks
  const page = await pdf.getPage(1);
  const textContent = await page.getTextContent();
  
  // Group text items by Y coordinate (rows)
  const items = textContent.items as any[];
  const rows: { [key: number]: any[] } = {};
  
  items.forEach(item => {
    const y = Math.round(item.transform[5]);
    if (!rows[y]) rows[y] = [];
    rows[y].push(item);
  });
  
  // Sort rows from top to bottom
  const sortedY = Object.keys(rows).map(Number).sort((a, b) => b - a);
  const sortedRows = sortedY.map(y => {
    // Sort items within each row from left to right
    return rows[y].sort((a, b) => a.transform[4] - b.transform[4]);
  });

  let characterName = "Unknown Explorer";
  const actions: ParsedAction[] = [];
  
  let inAttacksSection = false;
  let attackHeaderFound = false;

  for (let i = 0; i < sortedRows.length; i++) {
    const row = sortedRows[i];
    const rowText = row.map(item => item.str).join(' ');

    // 1. Identify Character Name
    // Usually near the top, under "CHARACTER NAME" or before "CLASS & LEVEL"
    if (rowText.includes("CHARACTER NAME")) {
       // Look at the row ABOVE this one (since we iterate top to bottom)
       // Or the one containing the actual name
       const possibleName = sortedRows[i-1]?.map(it => it.str).join(' ').trim();
       if (possibleName && possibleName !== "CHARACTER NAME") {
         characterName = possibleName;
       }
    }

    // 2. Identify Attacks Section
    if (rowText.includes("WEAPON ATTACKS & CANTRIPS")) {
      inAttacksSection = true;
      continue;
    }

    if (inAttacksSection) {
      // Look for the header
      if (rowText.includes("NAME") && rowText.includes("HIT") && rowText.includes("DAMAGE")) {
        attackHeaderFound = true;
        continue;
      }

      if (attackHeaderFound) {
        // We are inside the rows of the table
        // D&D Beyond PDF columns for attacks: Name | Hit | Damage/Type | Notes
        // A valid attack row should have at least 3 parts (Name, Hit, Damage)
        
        // Group columns by X position
        // Name usually at X < 100
        // Hit usually around X 150-200
        // Damage around X 250-300
        // Notes X > 400
        
        const namePart = row.filter(it => it.transform[4] < 150).map(it => it.str).join(' ').trim();
        const hitPart = row.filter(it => it.transform[4] >= 150 && it.transform[4] < 220).map(it => it.str).join(' ').trim();
        const damagePart = row.filter(it => it.transform[4] >= 220 && it.transform[4] < 380).map(it => it.str).join(' ').trim();
        const notesPart = row.filter(it => it.transform[4] >= 380).map(it => it.str).join(' ').trim();

        if (namePart && hitPart && (damagePart || hitPart.startsWith('+') || hitPart.startsWith('-'))) {
          // Found a potential attack
          const hitBonus = parseInt(hitPart.replace(/[^0-9+-]/g, '')) || 0;
          
          // Regex to extract just the dice part (e.g. "1d4+6" from "1d4+6 Piercing")
          const diceMatch = damagePart.match(/(\d+d\d+([+-]\d+)?)/i);
          const damageDice = diceMatch ? diceMatch[0] : (damagePart || "0");

          actions.push({
            name: namePart,
            hitBonus,
            damageDice,
            range: "5 ft.", // Default, we can try to improve this
            notes: notesPart
          });
        }
        
        // If we hit another major section or empty rows, we might be done
        if (rowText.includes("TM & \u00A9 2018 Wizards") || (actions.length > 0 && row.length === 0)) {
           // We've reached the bottom of page or end of table
           // But let's keep going until we are sure
        }
      }
    }
  }

  return {
    name: characterName,
    actions
  };
}
