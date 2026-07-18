const manifestUrl = new URL("manifest.json", window.location.href).href;
const installUrl = manifestUrl.replace(/^https?:\/\//, "stremio://");
const install = document.querySelector("#install");
const copy = document.querySelector("#copy");
const feedback = document.querySelector("#feedback");
const languageButtons = document.querySelectorAll("[data-language]");

const STORAGE_KEY = "imax-catalog-language";
const SPANISH_SPEAKING_COUNTRIES = new Set([
  "AR", "BO", "CL", "CO", "CR", "CU", "DO", "EC", "SV", "GQ", "GT",
  "HN", "MX", "NI", "PA", "PY", "PE", "PR", "ES", "UY", "VE"
]);

const translations = {
  en: {
    pageTitle: "IMAX Aspect Catalog for Stremio",
    description: "A community catalog of movies with IMAX 1.43:1 and 1.90:1 presentations for Stremio.",
    languageLabel: "Language",
    eyebrow: "Automatic catalog for Stremio",
    title: "Find the version that fills the screen.",
    lede: "A discovery catalog for movies with an expanded IMAX frame, updated from public sources and organized by format.",
    install: "Install in Stremio",
    copy: "Copy manifest",
    copied: "Copied",
    copiedFeedback: "Manifest URL copied. You can also paste it manually into Stremio.",
    copyPrompt: "Copy the manifest URL:",
    helper: "This addon only organizes the catalog; your other addons provide the playback options.",
    statsAriaLabel: "Catalog status",
    verifiedMovies: "verified movies",
    lastUpdated: "last updated",
    specializedCatalogs: "specialized catalogs",
    formatsLabel: "FORMATS",
    formatsTitle: "Not every IMAX theatrical release keeps its expanded image at home.",
    fullFrameDescription: "The tall frame associated with IMAX GT, dual-laser projection and 70 mm prints.",
    expandedDescription: "The most widespread digital IMAX format, with up to 26% more picture than 2.39:1.",
    availableAtHome: "Available at home",
    homeDescription: "Movies whose home release or streaming service preserves an expanded presentation.",
    footer: "Data derived from Wikipedia and Wikidata. Community project not affiliated with IMAX, IMDb or Stremio.",
    viewData: "View data",
    online: "Online",
    automatic: "Automatic"
  },
  es: {
    pageTitle: "IMAX Aspect Catalog para Stremio",
    description: "Catálogo comunitario de películas con presentaciones IMAX 1.43:1 y 1.90:1 para Stremio.",
    languageLabel: "Idioma",
    eyebrow: "Catálogo automático para Stremio",
    title: "Encuentra la versión que llena la pantalla.",
    lede: "Un catálogo de descubrimiento para películas con encuadre IMAX expandido, actualizado desde fuentes públicas y separado por formato.",
    install: "Instalar en Stremio",
    copy: "Copiar manifest",
    copied: "Copiado",
    copiedFeedback: "URL del manifest copiada. También puedes pegarla manualmente en Stremio.",
    copyPrompt: "Copia la URL del manifest:",
    helper: "Este addon solo organiza el catálogo; tus otros addons proporcionan las opciones de reproducción.",
    statsAriaLabel: "Estado del catálogo",
    verifiedMovies: "películas verificadas",
    lastUpdated: "última actualización",
    specializedCatalogs: "catálogos especializados",
    formatsLabel: "FORMATOS",
    formatsTitle: "No todo lo que se estrena en IMAX conserva la imagen expandida en casa.",
    fullFrameDescription: "El encuadre alto asociado con IMAX GT, proyección láser dual y copias de 70 mm.",
    expandedDescription: "El formato digital IMAX más extendido, con hasta 26% más imagen que 2.39:1.",
    availableAtHome: "Disponible en casa",
    homeDescription: "Películas cuya edición doméstica o servicio de streaming conserva una presentación expandida.",
    footer: "Datos derivados de Wikipedia y Wikidata. Proyecto comunitario no afiliado con IMAX, IMDb ni Stremio.",
    viewData: "Ver datos",
    online: "En línea",
    automatic: "Automática"
  }
};

let currentLanguage = "en";
let catalogData = null;
let copyConfirmed = false;

install.href = installUrl;

function browserLanguage() {
  const preferredLanguages = navigator.languages?.length ? navigator.languages : [navigator.language];
  return preferredLanguages.some((language) => language?.toLowerCase().startsWith("es")) ? "es" : "en";
}

function renderCatalogStats() {
  const messages = translations[currentLanguage];
  const locale = currentLanguage === "es" ? "es-MX" : "en-US";

  if (!catalogData) {
    document.querySelector("#movie-count").textContent = messages.online;
    document.querySelector("#updated").textContent = messages.automatic;
    return;
  }

  document.querySelector("#movie-count").textContent = new Intl.NumberFormat(locale).format(catalogData.count);
  document.querySelector("#updated").textContent = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(catalogData.generatedAt));
}

function applyLanguage(language) {
  currentLanguage = language === "es" ? "es" : "en";
  const messages = translations[currentLanguage];

  document.documentElement.lang = currentLanguage;
  document.title = messages.pageTitle;
  document.querySelector('meta[name="description"]').content = messages.description;
  document.querySelector(".language-switcher").setAttribute("aria-label", messages.languageLabel);

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = messages[element.dataset.i18n];
  });
  document.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
    element.setAttribute("aria-label", messages[element.dataset.i18nAriaLabel]);
  });
  languageButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.language === currentLanguage));
  });

  copyConfirmed = false;
  copy.textContent = messages.copy;
  feedback.textContent = messages.helper;
  renderCatalogStats();
}

async function detectCountryLanguage() {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1800);

  try {
    const response = await fetch("https://freeipapi.com/api/json", {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!response.ok) throw new Error("Country lookup failed");
    const location = await response.json();
    return SPANISH_SPEAKING_COUNTRIES.has(location.countryCode) ? "es" : "en";
  } catch {
    return browserLanguage();
  } finally {
    window.clearTimeout(timeout);
  }
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const language = button.dataset.language;
    localStorage.setItem(STORAGE_KEY, language);
    applyLanguage(language);
  });
});

copy.addEventListener("click", async () => {
  const messages = translations[currentLanguage];
  try {
    await navigator.clipboard.writeText(manifestUrl);
    copyConfirmed = true;
    feedback.textContent = messages.copiedFeedback;
    copy.textContent = messages.copied;
  } catch {
    window.prompt(messages.copyPrompt, manifestUrl);
  }
});

fetch("data/movies.json")
  .then((response) => {
    if (!response.ok) throw new Error("Catalog unavailable");
    return response.json();
  })
  .then((data) => {
    catalogData = data;
    renderCatalogStats();
  })
  .catch(renderCatalogStats);

const savedLanguage = localStorage.getItem(STORAGE_KEY);
if (savedLanguage === "es" || savedLanguage === "en") {
  applyLanguage(savedLanguage);
} else {
  applyLanguage(browserLanguage());
  detectCountryLanguage().then(applyLanguage);
}
