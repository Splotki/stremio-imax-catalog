# IMAX Aspect Catalog para Stremio

Addon estÃ¡tico de catÃ¡logo que clasifica pelÃ­culas por sus presentaciones IMAX `1.43:1`, `1.90:1` y por la disponibilidad de una ediciÃ³n domÃ©stica expandida.

## QuÃ© hace

- Publica cuatro catÃ¡logos compatibles con Stremio.
- Utiliza identificadores IMDb para que Stremio complete fichas y metadatos.
- Se actualiza diariamente desde Wikipedia y obtiene los IMDb IDs mediante Wikidata.
- Conserva el Ãºltimo catÃ¡logo vÃ¡lido si la fuente falla o cambia inesperadamente.
- Valida identificadores, duplicados, rutas y respuestas antes de publicar.

Este addon no proporciona streams, torrents ni archivos de vÃ­deo. Funciona junto con los addons de reproducciÃ³n que cada usuario tenga instalados.

## Publicarlo en GitHub Pages

1. Crea un repositorio vacÃ­o en GitHub y sube el contenido de esta carpeta a la rama `main`.
2. En **Settings â†’ Pages**, selecciona **GitHub Actions** como fuente.
3. Abre **Actions** y ejecuta el workflow **Actualizar catÃ¡logo y publicar** por primera vez.
4. Al terminar, GitHub mostrarÃ¡ la URL pÃºblica. El manifest estarÃ¡ en `https://USUARIO.github.io/REPOSITORIO/manifest.json`.

DespuÃ©s de esa configuraciÃ³n inicial, el workflow se ejecuta diariamente y con cada cambio enviado a `main`. TambiÃ©n puede ejecutarse manualmente desde GitHub cuando se desee.

## Mantenimiento esperado

No hay tareas manuales periÃ³dicas. El catÃ¡logo se importa, valida, guarda y publica automÃ¡ticamente. El workflow realiza un pequeÃ±o commit diario, incluso cuando no hay cambios sustanciales, para conservar un historial recuperable y evitar que GitHub considere inactivo el repositorio.

Solo deberÃ­a intervenir una persona en situaciones excepcionales: una correcciÃ³n factual discutible, un cambio grande en la estructura de Wikipedia/Wikidata o la desactivaciÃ³n manual de GitHub Actions. En cualquiera de esos casos, el addon continÃºa sirviendo el Ãºltimo catÃ¡logo validado.

## ActualizaciÃ³n segura

El importador rechaza resultados remotos sospechosamente pequeÃ±os y conserva `public/data/movies.json`. Las correcciones excepcionales pueden declararse en `src/overrides.json` sin modificar el generador.

```json
{
  "excludeImdbIds": ["tt0000000"],
  "movies": {
    "tt15398776": { "homeExpandedAvailable": true }
  },
  "additions": []
}
```

## Probar localmente

Con Node.js 20 o superior:

```bash
node scripts/update-catalog.mjs
node scripts/validate.mjs
npx http-server public --cors -c-1
```

DespuÃ©s instala `http://localhost:8080/manifest.json` en Stremio.

## Fuentes y licencia de datos

El cÃ³digo de este proyecto puede utilizarse bajo la licencia MIT. Los datos derivados de Wikipedia/Wikidata conservan sus requisitos de atribuciÃ³n y licencias aplicables; consulta `NOTICE.md`.
