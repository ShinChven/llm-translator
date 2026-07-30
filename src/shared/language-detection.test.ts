import assert from "node:assert/strict";
import test from "node:test";
import { detectLanguage } from "./language-detection.ts";

const LATIN_SAMPLES: Array<[string, string]> = [
  ["en", "This sentence is plainly written in English for the test."],
  ["es", "El corazón de la ciudad está lleno de música y canción."],
  ["fr", "Le français est une langue romane parlée dans le monde entier."],
  ["de", "Das ist ein schöner Tag und wir gehen später nach Hause."],
  ["pt", "A informação está disponível na página oficial da empresa."],
  ["it", "Questo testo non contiene accenti ma è chiaramente italiano."],
  ["nl", "Dit is een korte tekst zonder speciale tekens erin."],
  ["pl", "To jest krótki tekst napisany w języku polskim dla testu."],
  ["tr", "Bu cümle Türkçe olarak yazıldı ve çok kısa bir metindir."],
  ["ro", "Aceasta este o propoziție scrisă în limba română."],
  ["cs", "Toto je krátký text napsaný v českém jazyce."],
  ["hu", "Ez egy rövid magyar nyelvű szöveg, amely nem túl hosszú."],
  ["sv", "Det har varit en lang dag och jag ar mycket trott nu."],
  ["fi", "Tämä on lyhyt teksti, joka on kirjoitettu suomen kielellä."],
  ["vi", "Đây là một đoạn văn bản ngắn được viết bằng tiếng Việt."],
  ["id", "Ini adalah teks pendek yang ditulis dengan bahasa Indonesia."],
];

for (const [expected, sample] of LATIN_SAMPLES) {
  test(`detects ${expected} from Latin script`, () => {
    assert.equal(detectLanguage(sample), expected);
  });
}

test("scores the whole sample instead of the first accented letter", () => {
  // "ç" also belongs to Turkish, "ó" to Polish, "á" to Portuguese. Picking the
  // first diacritic match used to label these French, Spanish and Czech texts
  // as Turkish, Polish and Portuguese.
  assert.equal(detectLanguage("Ce garçon est très content de nous."), "fr");
  assert.equal(detectLanguage("La canción es una pasión del pueblo."), "es");
  assert.equal(detectLanguage("Je to krásný a klidný den v Praze."), "cs");
});

test("separates languages that share most of their function words", () => {
  assert.equal(
    detectLanguage("Det er ikke en god idé at gå ud af huset med den hat."),
    "da",
  );
  assert.equal(
    detectLanguage("Det er ikke en god idé å gå ut av huset med den hatten."),
    "no",
  );
  assert.equal(
    detectLanguage("Toto je krátky text, ktorý je napísaný v slovenskom jazyku."),
    "sk",
  );
  assert.equal(
    detectLanguage("To je kratko besedilo, ki je napisano v slovenskem jeziku."),
    "sl",
  );
});

test("detects a short greeting that carries no accented letters", () => {
  assert.equal(detectLanguage("Guten Morgen, wie geht es Ihnen heute?"), "de");
});

test("keeps a single accented word from outvoting the sentence", () => {
  assert.equal(
    detectLanguage("The café is open and the staff will be there for you."),
    "en",
  );
});

test("detects non-Latin scripts", () => {
  assert.equal(detectLanguage("これは日本語の文章です。"), "ja");
  assert.equal(detectLanguage("이것은 한국어 문장입니다."), "ko");
  assert.equal(detectLanguage("这是一段简体中文文本。"), "zh-CN");
  assert.equal(detectLanguage("這是一段繁體中文的說明文字。"), "zh-TW");
  assert.equal(detectLanguage("Это короткий текст на русском языке."), "ru");
  assert.equal(detectLanguage("Це короткий текст українською мовою."), "uk");
  assert.equal(detectLanguage("هذا نص قصير مكتوب باللغة العربية."), "ar");
  assert.equal(detectLanguage("นี่คือข้อความภาษาไทย"), "th");
});

test("falls back to English for text with no signal", () => {
  assert.equal(detectLanguage(""), "en");
  assert.equal(detectLanguage("12345 6789"), "en");
});
