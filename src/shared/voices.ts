/**
 * No speech provider exposes voice gender as data: Google publishes only a
 * character word per voice, OpenAI publishes nothing, and the Web Speech API
 * dropped its `gender` attribute before shipping. The tables below are curated
 * from listening reports and are presented in the UI as approximate.
 */
export type VoiceGender = "female" | "male" | "neutral";

export interface VoiceOption {
  id: string;
  gender?: VoiceGender;
  /** Google's published character word, where one exists. */
  character?: string;
}

export const VOICE_GENDER_LABELS: Record<VoiceGender, string> = {
  female: "Female",
  male: "Male",
  neutral: "Neutral",
};

export const VOICE_GENDER_ORDER: readonly VoiceGender[] = [
  "female",
  "male",
  "neutral",
];

/** Gemini's 30 prebuilt voices. */
export const GEMINI_VOICES: readonly VoiceOption[] = [
  { id: "Achernar", gender: "female", character: "Soft" },
  { id: "Aoede", gender: "female", character: "Breezy" },
  { id: "Autonoe", gender: "female", character: "Bright" },
  { id: "Callirrhoe", gender: "female", character: "Easy-going" },
  { id: "Despina", gender: "female", character: "Smooth" },
  { id: "Erinome", gender: "female", character: "Clear" },
  { id: "Gacrux", gender: "female", character: "Mature" },
  { id: "Kore", gender: "female", character: "Firm" },
  { id: "Laomedeia", gender: "female", character: "Upbeat" },
  { id: "Leda", gender: "female", character: "Youthful" },
  { id: "Sulafat", gender: "female", character: "Warm" },
  { id: "Vindemiatrix", gender: "female", character: "Gentle" },
  { id: "Zephyr", gender: "female", character: "Bright" },
  { id: "Achird", gender: "male", character: "Friendly" },
  { id: "Algenib", gender: "male", character: "Gravelly" },
  { id: "Algieba", gender: "male", character: "Smooth" },
  { id: "Alnilam", gender: "male", character: "Firm" },
  { id: "Charon", gender: "male", character: "Informative" },
  { id: "Enceladus", gender: "male", character: "Breathy" },
  { id: "Fenrir", gender: "male", character: "Excitable" },
  { id: "Iapetus", gender: "male", character: "Clear" },
  { id: "Orus", gender: "male", character: "Firm" },
  { id: "Puck", gender: "male", character: "Upbeat" },
  { id: "Pulcherrima", gender: "male", character: "Forward" },
  { id: "Rasalgethi", gender: "male", character: "Informative" },
  { id: "Sadachbia", gender: "male", character: "Lively" },
  { id: "Sadaltager", gender: "male", character: "Knowledgeable" },
  { id: "Schedar", gender: "male", character: "Even" },
  { id: "Umbriel", gender: "male", character: "Easy-going" },
  { id: "Zubenelgenubi", gender: "male", character: "Casual" },
];

/** OpenAI Speech API voices. */
export const OPENAI_VOICES: readonly VoiceOption[] = [
  { id: "coral", gender: "female", character: "Warm" },
  { id: "marin", gender: "female", character: "Natural" },
  { id: "nova", gender: "female", character: "Energetic" },
  { id: "sage", gender: "female", character: "Measured" },
  { id: "shimmer", gender: "female", character: "Soft" },
  { id: "alloy", gender: "male", character: "Balanced" },
  { id: "ash", gender: "male", character: "Clear" },
  { id: "ballad", gender: "male", character: "Melodic" },
  { id: "cedar", gender: "male", character: "Natural" },
  { id: "echo", gender: "male", character: "Expressive" },
  { id: "fable", gender: "male", character: "British" },
  { id: "onyx", gender: "male", character: "Deep" },
  { id: "verse", gender: "male", character: "Versatile" },
];

/**
 * Base names of the system voices Chrome commonly reports on macOS and
 * Windows. Locale suffixes and the "Microsoft " prefix are stripped before
 * lookup. Novelty voices (Bells, Zarvox, Trinoids …) are deliberately absent
 * so they stay unlabelled rather than mislabelled.
 */
const BROWSER_VOICE_GENDERS: Record<string, VoiceGender> = {};

const FEMALE_BROWSER_VOICES = [
  // macOS
  "Alice", "Allison", "Alva", "Amélie", "Amelie", "Amira", "Anna", "Ava",
  "Carmit", "Catherine", "Damayanti", "Daria", "Ellen", "Fiona", "Flo",
  "Geeta", "Grandma", "Ioana", "Joana", "Kanya", "Karen", "Kate", "Kathy",
  "Kyoko", "Lana", "Laura", "Lekha", "Lesya", "Linh", "Luciana", "Marie",
  "Mariska", "Mei-Jia", "Meijia", "Melina", "Milena", "Moira", "Mónica",
  "Monica", "Montse", "Nicky", "Nora", "Paulina", "Petra", "Piya", "Samantha",
  "Sandy", "Sara", "Satu", "Serena", "Shelley", "Sin-ji", "Sinji", "Soumya",
  "Susan", "Tessa", "Tina", "Ting-Ting", "Tingting", "Tünde", "Tunde", "Vani",
  "Veena", "Vicki", "Victoria", "Yelda", "Yuna", "Zosia", "Zuzana",
  // Windows
  "Ana", "Aria", "Emma", "Eva", "Hazel", "Heera", "Jenny", "Linda", "Michelle",
  "Zira",
];

const MALE_BROWSER_VOICES = [
  // macOS
  "Aaron", "Albert", "Alex", "Bruce", "Carlos", "Daniel", "Diego", "Eddy",
  "Felipe", "Fred", "Gordon", "Grandpa", "Hattori", "Jacques", "Jorge", "Juan",
  "Junior", "Luca", "Maged", "Majed", "Martin", "Nicolas", "Oliver", "Otoya",
  "Ralph", "Reed", "Rishi", "Rocko", "Thomas", "Tom", "Xander", "Yuri",
  // Windows
  "Andrew", "Brian", "Christopher", "David", "George", "Guy", "James", "Mark",
  "Ravi", "Richard", "Roger", "Sean", "Steffan",
];

for (const name of FEMALE_BROWSER_VOICES) {
  BROWSER_VOICE_GENDERS[name.toLowerCase()] = "female";
}
for (const name of MALE_BROWSER_VOICES) {
  BROWSER_VOICE_GENDERS[name.toLowerCase()] = "male";
}

/** Best-effort gender for a Web Speech API voice name. */
export function browserVoiceGender(name: string): VoiceGender | undefined {
  // Chrome OS voices state it outright ("Google UK English Female").
  // Test female first: "female" contains "male".
  if (/\bfemale\b/i.test(name)) return "female";
  if (/\bmale\b/i.test(name)) return "male";

  const base = name
    .replace(/^Microsoft\s+/i, "")
    .replace(/^Google\s+/i, "")
    .split(/\s+[(-]/)[0]
    .trim()
    .toLowerCase();

  return BROWSER_VOICE_GENDERS[base];
}

/** Splits options into gender groups, preserving order and keeping leftovers. */
export function groupVoicesByGender<T>(
  options: readonly T[],
  genderOf: (option: T) => VoiceGender | undefined,
): Array<{ gender?: VoiceGender; label: string; options: T[] }> {
  const groups = VOICE_GENDER_ORDER.map((gender) => ({
    gender: gender as VoiceGender | undefined,
    label: VOICE_GENDER_LABELS[gender],
    options: options.filter((option) => genderOf(option) === gender),
  }));
  const ungrouped = options.filter((option) => !genderOf(option));
  if (ungrouped.length > 0) {
    groups.push({ gender: undefined, label: "Not labelled", options: ungrouped });
  }
  return groups.filter((group) => group.options.length > 0);
}
