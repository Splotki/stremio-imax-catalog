const manifestUrl = new URL("manifest.json", window.location.href).href;
const installUrl = manifestUrl.replace(/^https?:\/\//, "stremio://");
const install = document.querySelector("#install");
const copy = document.querySelector("#copy");
const feedback = document.querySelector("#feedback");

install.href = installUrl;
copy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(manifestUrl);
    feedback.textContent = "URL del manifest copiada. También puedes pegarla manualmente en Stremio.";
    copy.textContent = "Copiado";
  } catch {
    window.prompt("Copia la URL del manifest:", manifestUrl);
  }
});

fetch("data/movies.json")
  .then((response) => response.json())
  .then((data) => {
    document.querySelector("#movie-count").textContent = new Intl.NumberFormat("es-MX").format(data.count);
    document.querySelector("#updated").textContent = new Intl.DateTimeFormat("es-MX", { dateStyle: "medium" }).format(new Date(data.generatedAt));
  })
  .catch(() => {
    document.querySelector("#movie-count").textContent = "En línea";
    document.querySelector("#updated").textContent = "Automática";
  });
