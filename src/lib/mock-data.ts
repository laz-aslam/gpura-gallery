import { ArchiveItem } from "./types";

/**
 * Generate mock Kerala archive items for development/testing
 */

const MOCK_TITLES = [
  "കേരള പാണിനീയം (Kerala Paniniyam)",
  "മലയാള മനോരമ (Malayala Manorama)",
  "ഐതിഹ്യമാല (Aithihyamala)",
  "മാതൃഭൂമി ആഴ്ചപ്പതിപ്പ് (Mathrubhumi Weekly)",
  "കുമാരനാശാൻ കവിതകൾ (Kumaran Asan Poems)",
  "ഇന്ദുലേഖ (Indulekha)",
  "മർത്ത്യാണ്ഡവർമ്മ (Marthanda Varma)",
  "ചന്ദ്രോത്സവം (Chandrotsavam)",
  "കേരള ചരിത്രം (Kerala History)",
  "തിരുവിതാംകൂർ രാജ്യചരിത്രം (Travancore State History)",
  "മലയാള സാഹിത്യ ചരിത്രം (Malayalam Literary History)",
  "കേരളോൽപ്പത്തി (Keralolpathi)",
  "നാലുകെട്ട് (Nalukettu)",
  "രണ്ടാമൂഴം (Randamoozham)",
  "ബാല്യകാലസഖി (Balyakalasakhi)",
  "ഒരു ദേശത്തിന്റെ കഥ (Story of a Land)",
  "ആടുജീവിതം (Goat Days)",
  "ചെമ്മീൻ (Chemmeen)",
  "ഖസാക്കിന്റെ ഇതിഹാസം (Legends of Khasak)",
  "മയ്യഴിപ്പുഴയുടെ തീരങ്ങളിൽ (On the Banks of Mayyazhi)",
  "വൈക്കം മുഹമ്മദ് ബഷീർ കഥകൾ (Vaikom Muhammad Basheer Stories)",
  "എം.ടി. വാസുദേവൻ നായർ കഥകൾ (M.T. Vasudevan Nair Stories)",
  "തകഴി ശിവശങ്കര പിള്ള കഥകൾ (Thakazhi Stories)",
  "പൊൻകുന്നം വർക്കി കഥകൾ (Ponkunnam Varkey Stories)",
  "ഉറൂബ് കഥകൾ (Uroob Stories)",
  "കാരൂർ നീലകണ്ഠ പിള്ള കഥകൾ (Karoor Stories)",
  "ബഷീറിന്റെ പ്രേമലേഖനം (Basheer's Love Letter)",
  "പാത്തുമ്മയുടെ ആട് (Pathummayude Aadu)",
  "ശബ്ദതാരാവലി (Shabdatharavali)",
  "മലയാള വ്യാകരണം (Malayalam Grammar)",
  "കേരള സംഗീത നാടക അക്കാദമി (Kerala Sangeetha Nataka Akademi)",
  "തിരുവനന്തപുരം ഗസറ്റ് (Thiruvananthapuram Gazette)",
  "കൊച്ചി രാജ്യ ചരിത്രം (Cochin State History)",
  "മലബാർ മാന്വൽ (Malabar Manual)",
  "ശ്രീ ശങ്കരാചാര്യ കൃതികൾ (Sri Shankaracharya Works)",
  "നാരായണീയം (Narayaneeyam)",
  "അദ്വൈത വേദാന്തം (Advaita Vedanta)",
  "തുഞ്ചത്ത് എഴുത്തച്ഛൻ കൃതികൾ (Thunchathu Ezhuthachan Works)",
  "അധ്യാത്മ രാമായണം (Adhyatma Ramayanam)",
  "മഹാഭാരതം കിളിപ്പാട്ട് (Mahabharatam Kilippattu)",
];

const MOCK_AUTHORS = [
  ["എ.ആർ. രാജരാജവർമ്മ"],
  ["കുമാരനാശാൻ"],
  ["ചന്തുമേനോൻ"],
  ["സി.വി. രാമൻ പിള്ള"],
  ["തകഴി ശിവശങ്കര പിള്ള"],
  ["വൈക്കം മുഹമ്മദ് ബഷീർ"],
  ["എം.ടി. വാസുദേവൻ നായർ"],
  ["ഒ.വി. വിജയൻ"],
  ["പി. കുഞ്ഞിരാമൻ നായർ"],
  ["വള്ളത്തോൾ നാരായണ മേനോൻ"],
  ["ഉള്ളൂർ എസ്. പരമേശ്വര അയ്യർ"],
  ["ജി. ശങ്കരക്കുറുപ്പ്"],
  ["ബാലാമണിയമ്മ"],
  ["കമലാ സുരയ്യ"],
  ["എൻ.എൻ. കക്കാട്"],
  ["അക്കിത്തം"],
  ["കെ. അയ്യപ്പ പണിക്കർ"],
  ["സുഗതകുമാരി"],
  ["മാധവിക്കുട്ടി"],
  ["സാറാ ജോസഫ്"],
];

const MOCK_TYPES = ["book", "periodical", "image", "manuscript", "newspaper"];
const MOCK_LANGUAGES = ["ml", "en", "ta", "sa", "hi"];
const MOCK_COLLECTIONS = [
  "Main collection",
  "Original collection",
  "Rare books",
  "Periodicals archive",
  "Manuscripts",
];

// Placeholder image URLs (using picsum for variety)
const getPlaceholderImage = (id: number): string => {
  // Use deterministic but varied placeholder images
  const imageId = (id * 17 + 100) % 1000;
  return `https://picsum.photos/seed/${imageId}/160/220`;
};

/**
 * Seeded random number generator for deterministic results
 */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generate a single mock archive item
 */
function generateMockItem(index: number): ArchiveItem {
  const random = seededRandom(index);

  const titleIndex = Math.floor(random() * MOCK_TITLES.length);
  const authorIndex = Math.floor(random() * MOCK_AUTHORS.length);
  const typeIndex = Math.floor(random() * MOCK_TYPES.length);
  const langIndex = Math.floor(random() * MOCK_LANGUAGES.length);
  const collIndex = Math.floor(random() * MOCK_COLLECTIONS.length);

  // Year between 1850 and 2020
  const year = Math.floor(random() * 170) + 1850;

  return {
    id: `mock-${index}`,
    title: MOCK_TITLES[titleIndex],
    year,
    language: MOCK_LANGUAGES[langIndex],
    type: MOCK_TYPES[typeIndex],
    collection: MOCK_COLLECTIONS[collIndex],
    authors: MOCK_AUTHORS[authorIndex],
    thumbnailUrl: getPlaceholderImage(index),
    sourceUrl: `https://gpura.org/item/${index}`,
  };
}

/**
 * Generate a batch of mock items
 */
export function generateMockItems(count: number = 200): ArchiveItem[] {
  return Array.from({ length: count }, (_, i) => generateMockItem(i));
}

/**
 * Get mock items for a specific tile
 * Uses deterministic generation based on tile coordinates
 */
export function getMockTileItems(
  tileX: number,
  tileY: number,
  limit: number = 40
): ArchiveItem[] {
  // Create deterministic seed from tile coordinates
  const seed = tileX * 10000 + tileY + 1;
  const random = seededRandom(seed);

  return Array.from({ length: limit }, (_, i) => {
    const itemIndex = Math.floor(random() * 10000) + seed * 100 + i;
    return generateMockItem(itemIndex);
  });
}

/**
 * Search mock items (simple text matching)
 */
export function searchMockItems(
  query: string,
  allItems: ArchiveItem[]
): ArchiveItem[] {
  if (!query.trim()) return allItems;

  const lowerQuery = query.toLowerCase();
  return allItems.filter(
    (item) =>
      item.title.toLowerCase().includes(lowerQuery) ||
      item.authors?.some((a) => a.toLowerCase().includes(lowerQuery)) ||
      item.collection?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get a single mock item by ID
 */
export function getMockItem(id: string): ArchiveItem | null {
  const match = id.match(/mock-(\d+)/);
  if (!match) return null;

  const index = parseInt(match[1], 10);
  return generateMockItem(index);
}

