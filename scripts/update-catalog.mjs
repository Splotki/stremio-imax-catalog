import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DATA_FILE = resolve(ROOT, "public/data/movies.json");
const OVERRIDES_FILE = resolve(ROOT, "src/overrides.json");
const WIKI_PAGE = "List_of_films_released_in_IMAX";
const SOURCE_URL = `https://en.wikipedia.org/wiki/${WIKI_PAGE}`;
const MINIMUM_SAFE_IMPORT = 25;
const USER_AGENT = "StremioImaxCatalog/1.0 (GitHub Pages catalog updater)";

const decodeHtml = (value) => value
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", "\"")
  .replaceAll("&#39;", "'")
  .replaceAll("&nbsp;", " ")
  .replaceAll("&ndash;", "–")
  .replaceAll("&mdash;", "—")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));

function stripHtml(value) {
  return decodeHtml(value
    .replace(/<sup\b[\s\S]*?<\/sup>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim());
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: { "user-agent": USER_AGENT, accept: "application/json" },
    signal: AbortSignal.timeout(30_000)
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return response.json();
}

function extractCandidateRows(html) {
  const tables = [...html.matchAll(/<table\b[^>]*\bwikitable\b[^>]*>([\s\S]*?)<\/table>/gi)];
  const candidates = [];

  for (const [, table] of tables) {
    for (const [, row] of table.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)) {
      const cells = [...row.matchAll(/<(?:th|td)\b[^>]*>([\s\S]*?)<\/(?:th|td)>/gi)].map((match) => match[1]);
      if (cells.length < 2) continue;

      const link = cells[0].match(/<a\b[^>]*href="\/wiki\/([^"#]+)"[^>]*>/i);
      if (!link) continue;

      const title = stripHtml(cells[0]);
      const details = cells.slice(1).map(stripHtml).join(" ");
      if (!title || /^(name|film|title)$/i.test(title)) continue;
      if (!/IMAX/i.test(details) || !/(1[.:](?:43|90|78|85)[:.]1|expanded aspect ratio|aspect ratio opened)/i.test(details)) continue;

      const pageTitle = decodeURIComponent(link[1]).replaceAll("_", " ");
      const yearMatch = details.match(/\b(19\d{2}|20\d{2})\b/);
      const theatricalRatios = [...new Set(
        [...details.matchAll(/\b(1[.:](?:43|90|85))[:.]1\b/g)].map((match) => `${match[1].replace(":", ".")}:1`)
      )];
      const homeMarker = details.search(/home[ -]?media|Blu-ray|Disney\+|streaming|IMAX Enhanced/i);
      const homeText = homeMarker >= 0 ? details.slice(homeMarker) : "";
      const homePositive = /(?:preserved|retained|available).{0,140}(?:home[ -]?media|Blu-ray|Disney\+|streaming)|(?:home[ -]?media|Blu-ray|Disney\+|streaming).{0,140}(?:preserved|retained|expanded)|IMAX Enhanced/i.test(details);
      let homeRatios = homePositive
        ? [...new Set([...homeText.matchAll(/\b(1[.:](?:43|90|78|85))[:.]1\b/g)].map((match) => `${match[1].replace(":", ".")}:1`))]
        : [];
      if (homePositive && homeRatios.length === 0 && /preserved|retained/i.test(details)) {
        homeRatios = [...theatricalRatios];
      }

      candidates.push({
        pageTitle,
        title,
        year: yearMatch ? Number(yearMatch[1]) : null,
        theatricalRatios,
        homeRatios,
        coverage: /entire (?:film|runtime)|throughout the (?:film|entire)/i.test(details)
          ? "full"
          : /\b\d+\s*(?:minutes?|mins?)\b|sequences?|scenes?|sections?/i.test(details) ? "sequences" : "unknown",
        homeExpandedAvailable: homePositive && !/(not available|did not retain|not preserved)/i.test(details),
        notes: details.slice(0, 700),
        sourcePage: pageTitle.replaceAll(" ", "_")
      });
    }
  }

  return [...new Map(candidates.map((movie) => [movie.pageTitle, movie])).values()];
}

async function getImdbIds(pageTitles) {
  const result = new Map();
  for (let index = 0; index < pageTitles.length; index += 40) {
    const batch = pageTitles.slice(index, index + 40);
    const params = new URLSearchParams({
      action: "wbgetentities",
      format: "json",
      sites: "enwiki",
      titles: batch.join("|"),
      props: "claims|sitelinks",
      origin: "*"
    });
    const payload = await fetchJson(`https://www.wikidata.org/w/api.php?${params}`);
    for (const entity of Object.values(payload.entities ?? {})) {
      const pageTitle = entity.sitelinks?.enwiki?.title;
      const imdbId = entity.claims?.P345?.[0]?.mainsnak?.datavalue?.value;
      if (pageTitle && /^tt\d{7,10}$/.test(imdbId ?? "")) result.set(pageTitle, imdbId);
    }
  }
  return result;
}

function applyOverrides(movies, overrides) {
  const excluded = new Set(overrides.excludeImdbIds ?? []);
  const adjusted = movies
    .filter((movie) => !excluded.has(movie.imdbId))
    .map((movie) => ({ ...movie, ...(overrides.movies?.[movie.imdbId] ?? {}) }));
  return [...adjusted, ...(overrides.additions ?? [])];
}

function normalizeMovies(movies) {
  return [...new Map(movies
    .filter((movie) => /^tt\d{7,10}$/.test(movie.imdbId ?? "") && movie.title)
    .map((movie) => [movie.imdbId, movie]))
    .values()]
    .sort((a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title));
}

function meta(movie) {
  const ratios = movie.theatricalRatios.join(" / ");
  return {
    id: movie.imdbId,
    type: "movie",
    name: movie.title,
    poster: `https://images.metahub.space/poster/medium/${movie.imdbId}/img`,
    releaseInfo: movie.year ? String(movie.year) : undefined,
    description: ratios ? `IMAX ${ratios} · ${movie.coverage === "full" ? "película completa" : "secuencias expandidas"}` : "Formato IMAX"
  };
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function writeCatalogs(movies) {
  const definitions = [
    ["imax-all", movies],
    ["imax-143", movies.filter((movie) => movie.theatricalRatios.includes("1.43:1"))],
    ["imax-190", movies.filter((movie) => movie.theatricalRatios.includes("1.90:1"))],
    ["imax-home", movies.filter((movie) => movie.homeExpandedAvailable)]
  ];
  for (const [id, entries] of definitions) {
    await writeJson(resolve(ROOT, `public/catalog/movie/${id}.json`), { metas: entries.map(meta) });
  }
}

async function main() {
  const [current, overrides] = await Promise.all([
    readFile(DATA_FILE, "utf8").then(JSON.parse),
    readFile(OVERRIDES_FILE, "utf8").then(JSON.parse)
  ]);

  let movies = current.movies;
  let source = current.source ?? "last-known-good";
  try {
    const params = new URLSearchParams({ action: "parse", page: WIKI_PAGE, prop: "text", format: "json", origin: "*" });
    const parsed = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
    const candidates = extractCandidateRows(parsed.parse?.text?.["*"] ?? "");
    const imdbIds = await getImdbIds(candidates.map((movie) => movie.pageTitle));
    const imported = candidates
      .map((movie) => ({ ...movie, imdbId: imdbIds.get(movie.pageTitle) }))
      .filter((movie) => movie.imdbId);

    if (imported.length < MINIMUM_SAFE_IMPORT) {
      throw new Error(`La importación produjo solo ${imported.length} películas; se conserva el último catálogo válido.`);
    }
    movies = imported;
    source = "Wikipedia + Wikidata";
  } catch (error) {
    console.warn(`Actualización remota omitida: ${error.message}`);
  }

  movies = normalizeMovies(applyOverrides(movies, overrides));
  if (!movies.length) throw new Error("El catálogo no puede quedar vacío.");

  const output = {
    generatedAt: new Date().toISOString(),
    source,
    sourceUrl: SOURCE_URL,
    count: movies.length,
    movies
  };
  await writeJson(DATA_FILE, output);
  await writeCatalogs(movies);
  console.log(`Catálogo generado: ${movies.length} películas (${source}).`);
}

await main();
