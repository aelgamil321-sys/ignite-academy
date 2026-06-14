/** Quick check: Qur'an ayah and Hadith lines stay protected. Run: node scripts/verify-islamic-protection.mjs */
import {
  hasProtectedIslamicContent,
  mergeProtectedSegments,
  splitIslamicProtectedText,
  translatableSegments,
} from "../src/lib/islamic-text-protection.ts";

const sample = `Learning about sincerity.

قال الله تعالى: ﴿إِنَّمَا الْأَعْمَالُ بِالنِّيَّاتِ﴾

The intention behind every action matters.`;

const segments = splitIslamicProtectedText(sample);
const protectedText = segments.filter((s) => s.protected).map((s) => s.text).join("");
const translatable = translatableSegments(segments);

console.log("Protected segments include ayah:", protectedText.includes("﴿"));
console.log("Protected segments include qala:", protectedText.includes("قال الله"));
console.log("Translatable parts:", translatable.length);
console.log("Has protected content:", hasProtectedIslamicContent(sample));

const mock = mergeProtectedSegments(segments, ["[FR1]", "[FR2]"]);
console.log("Mock merge keeps Arabic:", mock.includes("﴿") && mock.includes("[FR1]"));
