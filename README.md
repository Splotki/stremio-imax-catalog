# IMAX Aspect Catalog para Stremio

Addon estático de catálogo que clasifica películas por sus presentaciones IMAX `1.43:1`, `1.90:1` y por la disponibilidad de una edición doméstica expandida.

## Qué hace

- Publica cuatro catálogos compatibles con Stremio.
- Utiliza identificadores IMDb para que Stremio complete fichas y metadatos.
- Se actualiza diariamente desde Wikipedia y obtiene los IMDb IDs mediante Wikidata.
- Conserva el último catálogo válido si la fuente falla o cambia inesperadamente.
- Valida identificadores, duplicados, rutas y respuestas antes de publicar.

Este addon no proporciona streams, torrents ni archivos de vídeo. Funciona junto con los addons de reproducción que cada usuario tenga instalados.

## Publicarlo en GitHub Pages

1. Crea un repositorio vacío en GitHub y sube el contenido de esta carpeta a la rama `main`.
2. En **Settings → Pages**, selecciona **GitHub Actions** como fuente.
3. Abre **Actions** y ejecuta el workflow **Actualizar catálogo y publicar** por primera vez.
4. Al terminar, GitHub mostrará la URL pública. El manifest estará en `https://USUARIO.github.io/REPOSITORIO/manifest.json`.

Después de esa configuración inicial, el workflow se ejecuta diariamente y con cada cambio enviado a `main`. También puede ejecutarse manualmente desde GitHub cuando se desee.

## Mantenimiento esperado

No hay tareas manuales periódicas. El catálogo se importa, valida, guarda y publica automáticamente. El workflow realiza un pequeño commit diario, incluso cuando no hay cambios sustanciales, para conservar un historial recuperable y evitar que GitHub considere inactivo el repositorio.

Solo debería intervenir una persona en situaciones excepcionales: una corrección factual discutible, un cambio grande en la estructura de Wikipedia/Wikidata o la desactivación manual de GitHub Actions. En cualquiera de esos casos, el addon continúa sirviendo el último catálogo validado.

## Actualización segura

El importador rechaza resultados remotos sospechosamente pequeños y conserva `public/data/movies.json`. Las correcciones excepcionales pueden declararse en `src/overrides.json` sin modificar el generador.

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

Después instala `http://localhost:8080/manifest.json` en Stremio.

## Fuentes y licencia de datos

El código de este proyecto puede utilizarse bajo la licencia MIT. Los datos derivados de Wikipedia/Wikidata conservan sus requisitos de atribución y licencias aplicables; consulta `NOTICE.md`.
