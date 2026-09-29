import { isSupportedLocale, detectBrowserLocale, resolveLocale } from "../I18nProvider";
import { SUPPORTED_LOCALES } from "../index";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log("Running locale switcher & resolution tests...");

// 1. Test supported locales
assert(isSupportedLocale("en-US") === true, "en-US should be supported");
assert(isSupportedLocale("zh-CN") === true, "zh-CN should be supported");
assert(isSupportedLocale("ja-JP") === true, "ja-JP should be supported");
assert(isSupportedLocale("ko-KR") === true, "ko-KR should be supported");
assert(isSupportedLocale("ru-RU") === true, "ru-RU should be supported");
assert(isSupportedLocale("ar-SA") === true, "ar-SA should be supported");
assert(isSupportedLocale("he-IL") === true, "he-IL should be supported");
assert(isSupportedLocale("es-ES") === true, "es-ES should be supported");
assert(isSupportedLocale("pt-BR") === true, "pt-BR should be supported");
assert(isSupportedLocale("fr-FR") === false, "fr-FR should not be supported");
assert(isSupportedLocale("invalid") === false, "invalid locale should not be supported");

// 2. Test browser detection
const navExact = { languages: ["ja-JP", "en-US"] };
assert(detectBrowserLocale(navExact) === "ja-JP", "Exact match browser detection failed");

const navPrefix = { languages: ["es-MX"] };
assert(detectBrowserLocale(navPrefix) === "es-ES", "Prefix match browser detection failed");

const navUnsupported = { languages: ["de-DE", "fr-FR"] };
assert(detectBrowserLocale(navUnsupported) === null, "Unsupported browser language should return null");

// 3. Test resolution order: URL > localStorage > Browser Detection > Default
// 3a. URL parameter precedence over localStorage
const res1 = resolveLocale({
  urlSearch: "?locale=zh-CN",
  storedLocale: "ja-JP",
  navigatorObj: { languages: ["es-ES"] },
});
assert(res1 === "zh-CN", "URL search param ?locale should take highest priority");

const res1b = resolveLocale({
  urlSearch: "?lang=ar-SA",
  storedLocale: "en-US",
  navigatorObj: { languages: ["es-ES"] },
});
assert(res1b === "ar-SA", "URL search param ?lang should take highest priority");

// 3b. localStorage precedence over browser detection when URL parameter absent
const res2 = resolveLocale({
  urlSearch: "",
  storedLocale: "ko-KR",
  navigatorObj: { languages: ["es-ES"] },
});
assert(res2 === "ko-KR", "localStorage preference should take priority over browser detection when URL has no locale");

// 3c. Browser detection fallback when no URL param and no localStorage preference
const res3 = resolveLocale({
  urlSearch: "",
  storedLocale: null,
  navigatorObj: { languages: ["pt-BR"] },
});
assert(res3 === "pt-BR", "Browser detection should be used when no URL param or stored choice exists");

// 3d. Default fallback when no match anywhere
const res4 = resolveLocale({
  urlSearch: "",
  storedLocale: null,
  navigatorObj: { languages: ["de-DE"] },
});
assert(res4 === "en-US", "Default fallback en-US should be returned when no match found");

console.log("✅ All locale switcher & persistence tests passed!");
