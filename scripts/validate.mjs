import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const parse = async (path) => JSON.parse(await readFile(resolve(ROOT, path), "utf8"));
const fail = (message) => { throw new Error(message); };

const manifest = await parse("public/manifest.json");
const data = await parse("public/data/movies.json");

if (manifest.resources?.includes("catalog") !== true) fail("El manifest debe declarar el recurso catalog.");
if (!Array.isArray(manifest.catalogs) || manifest.catalogs.length !== 4) fail("Se esperaban cuatro catálogos.");
if (!Array.isArray(data.movies) || data.movies.length < 10) fail("El catálogo maestro tiene muy pocas películas.");
if (data.count !== data.movies.length) fail("El contador del catálogo maestro es inconsistente.");

const ids = new Set();
for (const movie of data.movies) {
  if (!/^tt\d{7,10}$/.test(movie.imdbId ?? "")) fail(`IMDb ID inválido: ${movie.imdbId}`);
  if (ids.has(movie.imdbId)) fail(`IMDb ID duplicado: ${movie.imdbId}`);
  ids.add(movie.imdbId);
  if (!movie.title || !Array.isArray(movie.theatricalRatios)) fail(`Registro incompleto: ${movie.imdbId}`);
}

for (const catalog of manifest.catalogs) {
  const relativePath = `public/catalog/${catalog.type}/${catalog.id}.json`;
  await access(resolve(ROOT, relativePath));
  const response = await parse(relativePath);
  if (!Array.isArray(response.metas)) fail(`${catalog.id} no contiene metas.`);
  for (const meta of response.metas) {
    if (!ids.has(meta.id) || meta.type !== "movie" || !meta.name || !meta.poster) {
      fail(`Meta inválida en ${catalog.id}: ${meta.id}`);
    }
  }
}

console.log(`Validación correcta: ${data.movies.length} películas y ${manifest.catalogs.length} catálogos.`);
