/**
 * Omeka S Property Mappings
 *
 * Customize these mappings for your specific Omeka S installation.
 * The default values work with gpura.org (Dublin Core terms).
 */

export const omekaPropertyMap = {
  // Core metadata
  title: "dcterms:title",
  creator: "dcterms:creator",
  date: "dcterms:date",
  language: "dcterms:language",
  type: "dcterms:type",
  description: "dcterms:description",
  subject: "dcterms:subject",
  publisher: "dcterms:publisher",
  rights: "dcterms:rights",

  // Additional properties (uncomment if needed)
  // identifier: "dcterms:identifier",
  // source: "dcterms:source",
  // contributor: "dcterms:contributor",
  // format: "dcterms:format",
  // coverage: "dcterms:coverage",
  // relation: "dcterms:relation",
} as const;

/**
 * Language code mappings
 * Maps language names/codes from Omeka to ISO 639-1 codes
 */
export const languageCodeMap: Record<string, string> = {
  // Full names to ISO codes
  malayalam: "ml",
  english: "en",
  tamil: "ta",
  sanskrit: "sa",
  hindi: "hi",
  kannada: "kn",
  telugu: "te",
  arabic: "ar",
  portuguese: "pt",
  dutch: "nl",
  german: "de",
  french: "fr",
  latin: "la",
  punjabi: "pa",

  // ISO codes map to themselves
  ml: "ml",
  en: "en",
  ta: "ta",
  sa: "sa",
  hi: "hi",
  kn: "kn",
  te: "te",
  ar: "ar",
  pt: "pt",
  nl: "nl",
  de: "de",
  fr: "fr",
  la: "la",
  pa: "pa",
};

/**
 * Resource type mappings
 * Maps Omeka resource types to normalized values
 */
export const resourceTypeMap: Record<string, string> = {
  book: "book",
  periodical: "periodical",
  image: "image",
  "still image": "image",
  audio: "audio",
  sound: "audio",
  video: "video",
  "moving image": "video",
  manuscript: "manuscript",
  text: "book",
  map: "map",
  newspaper: "newspaper",
};

/**
 * Display labels for languages
 */
export const languageLabels: Record<string, string> = {
  ml: "മലയാളം (Malayalam)",
  en: "English",
  ta: "தமிழ் (Tamil)",
  sa: "संस्कृत (Sanskrit)",
  hi: "हिन्दी (Hindi)",
  kn: "ಕನ್ನಡ (Kannada)",
  te: "తెలుగు (Telugu)",
  ar: "العربية (Arabic)",
  pt: "Português (Portuguese)",
  nl: "Nederlands (Dutch)",
  de: "Deutsch (German)",
  fr: "Français (French)",
  la: "Latina (Latin)",
  pa: "ਪੰਜਾਬੀ (Punjabi)",
};

/**
 * Display labels for resource types
 */
export const typeLabels: Record<string, string> = {
  book: "Book",
  periodical: "Periodical",
  image: "Image",
  audio: "Audio",
  video: "Video",
  manuscript: "Manuscript",
  map: "Map",
  newspaper: "Newspaper",
};

/**
 * Time period ranges for filtering
 */
export const timePeriods = [
  { label: "Before 1900", min: undefined, max: 1899 },
  { label: "1900–1947", min: 1900, max: 1947 },
  { label: "1947–1975", min: 1948, max: 1975 },
  { label: "1975–2000", min: 1976, max: 2000 },
  { label: "After 2000", min: 2001, max: undefined },
] as const;


