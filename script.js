const STORAGE_KEY = "kk-music-vault-v3";
const THEME_KEY = "kk-music-vault-theme";

function makeId() {
  if (globalThis.crypto && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return "track-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 10);
}

function showToast(message) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}


const defaultMusic = [];

// Main categories for a wedding-editor music library.
// Any additional category entered while adding a song is also kept automatically.
const FIXED_CATEGORIES = [
  "Bride",
  "Groom",
  "Couple",
  "Haldi",
  "Mehendi",
  "Sangeet",
  "Wedding",
  "Reception",
  "Vidaai",
  "Romantic",
  "Emotional",
  "Cinematic"
];

let music = loadMusic();
let state = { view: "all", category: "All", search: "", sort: "recent" };

function loadMusic() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (_) {}
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMusic)); } catch (_) {}
  return [...defaultMusic];
}

function saveMusic() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(music));
    return true;
  } catch (error) {
    showToast("Could not save in this browser");
    return false;
  }
}


function compressPoster(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve("");
    if (!file.type.startsWith("image/")) {
      reject(new Error("Poster must be an image file."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read poster."));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxSide = 700;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.onerror = () => reject(new Error("Could not decode poster."));
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function clearPosterPreview() {
  const input = document.getElementById("posterFile");
  const preview = document.getElementById("posterPreview");
  const image = document.getElementById("posterPreviewImg");
  input.value = "";
  image.removeAttribute("src");
  preview.hidden = true;
}

document.getElementById("posterFile").addEventListener("change", async event => {
  const file = event.target.files[0];
  const preview = document.getElementById("posterPreview");
  const image = document.getElementById("posterPreviewImg");
  if (!file) {
    preview.hidden = true;
    return;
  }
  try {
    const dataUrl = await compressPoster(file);
    image.src = dataUrl;
    preview.hidden = false;
  } catch (error) {
    event.target.value = "";
    preview.hidden = true;
    alert(error.message);
  }
});

function categories() {
  const custom = music.map(x => String(x.category || "").trim()).filter(Boolean);
  return [...new Set([...FIXED_CATEGORIES, ...custom])];
}

function setView(view) {
  state.view = view;
  state.category = "All";
  document.querySelectorAll(".side-link[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === view));
  render();
}

function setCategory(category) {
  state.category = category;
  state.view = "all";
  document.querySelectorAll(".side-link[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === "all"));
  render();
}

function getResults() {
  const q = state.search.trim().toLowerCase();
  let result = music.filter(item => {
    const text = `${item.title} ${item.artist} ${item.album} ${item.category} ${item.note}`.toLowerCase();
    const matchesSearch = !q || text.includes(q);
    const matchesCategory = state.category === "All" || item.category === state.category;
    const matchesView = state.view !== "favorites" || item.favorite;
    return matchesSearch && matchesCategory && matchesView;
  });

  result.sort((a,b) => {
    if (state.sort === "title") return a.title.localeCompare(b.title);
    if (state.sort === "artist") return (a.artist || "").localeCompare(b.artist || "");
    if (state.sort === "category") return a.category.localeCompare(b.category);
    return b.createdAt - a.createdAt;
  });
  return result;
}

function renderSidebar() {
  document.getElementById("allCount").textContent = music.length;
  document.getElementById("favCount").textContent = music.filter(x => x.favorite).length;
  const wrapper = document.getElementById("sidebarCategories");
  wrapper.innerHTML = categories().map(cat => {
    const count = music.filter(x => x.category === cat).length;
    return `<button class="cat-side ${state.category === cat ? "active" : ""}" data-category="${escapeAttr(cat)}">
      <span>${escapeHtml(cat)}</span><span>${count}</span>
    </button>`;
  }).join("");

  document.getElementById("categoryList").innerHTML = categories().map(cat => `<option value="${escapeHtml(cat)}"></option>`).join("");

  const mobile = document.getElementById("mobileCategories");
  mobile.innerHTML = ["All", ...categories()].map(cat =>
    `<button class="category-btn ${state.category === cat ? "active" : ""}" data-category="${escapeAttr(cat)}">${escapeHtml(cat)}</button>`
  ).join("");
}

document.getElementById("sidebarCategories").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  setCategory(button.dataset.category);
});

document.getElementById("mobileCategories").addEventListener("click", event => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  setCategory(button.dataset.category);
});

function renderStats() {
  const favs = music.filter(x => x.favorite).length;
  const cats = categories().length;
  document.getElementById("heroTotal").textContent = music.length;
  document.getElementById("heroCategories").textContent = cats;
  document.getElementById("heroFavorites").textContent = favs;
}

function renderMusic() {
  const results = getResults();
  const grid = document.getElementById("musicGrid");
  const empty = document.getElementById("emptyState");
  document.getElementById("resultsCount").textContent = `${results.length} ${results.length === 1 ? "track" : "tracks"}`;

  let label = state.view === "favorites" ? "FAVORITES" : (state.category === "All" ? "ALL MUSIC" : state.category.toUpperCase());
  document.getElementById("viewLabel").textContent = label;
  document.getElementById("resultsTitle").textContent =
    state.view === "favorites" ? "Your favorites" : (state.category === "All" ? "Your collection" : `${state.category} collection`);

  grid.innerHTML = results.map(cardHtml).join("");
  empty.hidden = results.length > 0;
}

function cardHtml(item) {
  const art = item.art ? `<img src="${safeAttrUrl(item.art)}" alt="" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='grid'">` : "";
  return `
    <article class="card">
      <div class="art">
        ${art}
        <div class="art-fallback" style="${item.art ? "display:none" : ""}">♫</div>
        <button class="heart ${item.favorite ? "on" : ""}" onclick="toggleFavorite('${item.id}')" aria-label="Toggle favorite">${item.favorite ? "♥" : "♡"}</button>
      </div>
      <div class="card-body">
        <div class="card-meta">
          <span class="badge">${escapeHtml(item.category)}</span>
        </div>
        <h3 title="${escapeAttr(item.title)}">${escapeHtml(item.title)}</h3>
        <p class="artist">${escapeHtml(item.artist || "Unknown artist")}</p>
        ${item.album ? `<p class="album">${escapeHtml(item.album)}</p>` : ""}
        ${item.note ? `<p class="album">${escapeHtml(item.note)}</p>` : ""}
        <div class="card-actions">
          <a class="open-link" href="${safeAttrUrl(item.url)}" target="_blank" rel="noopener noreferrer">Open link ↗</a>
          <button class="delete-btn" onclick="deleteTrack('${item.id}')" title="Delete">Delete</button>
        </div>
      </div>
    </article>
  `;
}

function toggleFavorite(id) {
  const item = music.find(x => x.id === id);
  if (!item) return;
  item.favorite = !item.favorite;
  saveMusic();
  render();
}

function deleteTrack(id) {
  const item = music.find(x => x.id === id);
  if (!item) return;
  if (!confirm(`Delete “${item.title}” from your library?`)) return;
  music = music.filter(x => x.id !== id);
  saveMusic();
  render();
}

function openModal() {
  document.getElementById("overlay").hidden = false;
  document.getElementById("musicModal").hidden = false;
  document.querySelector('#musicForm input[name="title"]').focus();
}
function closeAllModals() {
  document.getElementById("musicModal").hidden = true;
  document.getElementById("helpModal").hidden = true;
  document.getElementById("exportModal").hidden = true;
  document.getElementById("overlay").hidden = true;
}
function closeModal() {
  document.getElementById("musicModal").hidden = true;
  document.getElementById("overlay").hidden = true;
  document.getElementById("musicForm").reset();
  clearPosterPreview();
}
function openHelp() {
  document.getElementById("overlay").hidden = false;
  document.getElementById("helpModal").hidden = false;
}
function closeHelp() {
  document.getElementById("helpModal").hidden = true;
  document.getElementById("overlay").hidden = true;
}
function openExport() {
  document.getElementById("overlay").hidden = false;
  document.getElementById("exportModal").hidden = false;
}
function closeExport() {
  document.getElementById("exportModal").hidden = true;
  document.getElementById("overlay").hidden = true;
}

document.getElementById("musicForm").addEventListener("submit", async event => {
  event.preventDefault();
  try {
    const data = Object.fromEntries(new FormData(event.target).entries());
    const posterFile = document.getElementById("posterFile").files[0];
    const uploadedPoster = await compressPoster(posterFile);

    const track = {
      id: makeId(),
      title: data.title.trim(),
      artist: data.artist.trim(),
      album: data.album.trim(),
      category: data.category.trim(),
      url: data.url.trim(),
      art: uploadedPoster || data.art.trim(),
      note: data.note.trim(),
      favorite: false,
      createdAt: Date.now()
    };

    music.unshift(track);
    if (!saveMusic()) {
      music.shift();
      throw new Error("Browser storage is full or unavailable. Remove a few old tracks/posters and try again.");
    }

    closeModal();
    state.view = "all";
    state.category = "All";
    state.search = "";
    document.getElementById("searchInput").value = "";
    render();
    showToast(`Saved “${track.title}” to your library.`);
  } catch (error) {
    console.error(error);
    alert(error.message || "The track could not be saved.");
  }
});

document.getElementById("searchInput").addEventListener("input", e => {
  state.search = e.target.value;
  renderMusic();
});
document.getElementById("sortSelect").addEventListener("change", e => {
  state.sort = e.target.value;
  renderMusic();
});

function clearFilters() {
  state.view = "all";
  state.category = "All";
  state.search = "";
  document.getElementById("searchInput").value = "";
  document.querySelectorAll(".side-link[data-view]").forEach(btn => btn.classList.toggle("active", btn.dataset.view === "all"));
  render();
}

function toggleTheme() {
  const light = document.documentElement.classList.toggle("light");
  localStorage.setItem(THEME_KEY, light ? "light" : "dark");
  updateThemeText(light);
}
function updateThemeText(light) {
  document.getElementById("themeLabel").textContent = light ? "Dark mode" : "Light mode";
  document.getElementById("themeIcon").textContent = light ? "☾" : "◐";
}

function exportLibrary() {
  const blob = new Blob([JSON.stringify(music, null, 2)], {type: "application/json"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "my-music-vault-backup.json";
  a.click();
  URL.revokeObjectURL(a.href);
}
function importLibrary(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = JSON.parse(reader.result);
      if (!Array.isArray(imported)) throw new Error("Invalid backup");
      music = imported.map(x => ({
        id: x.id || crypto.randomUUID(), title: String(x.title || "Untitled"),
        artist: String(x.artist || ""), album: String(x.album || ""),
        category: String(x.category || "Uncategorized"), url: String(x.url || ""),
        art: String(x.art || ""), note: String(x.note || ""),
        favorite: !!x.favorite, createdAt: Number(x.createdAt) || Date.now()
      }));
      saveMusic();
      closeExport();
      render();
      alert("Library imported successfully.");
    } catch (e) {
      alert("That file does not look like a valid music-library backup.");
    }
  };
  reader.readAsText(file);
  event.target.value = "";
}

function toggleSidebar() {
  document.querySelector(".sidebar").classList.toggle("open");
}
document.getElementById("overlay").addEventListener("click", () => {
  closeAllModals();
  document.querySelector(".sidebar").classList.remove("open");
});

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;" }[c]));
}
function escapeAttr(value) { return escapeHtml(value).replace(/`/g, "&#096;"); }
function safeAttrUrl(url) {
  const value = String(url || "");
  return /^https?:\/\//i.test(value) ? value.replace(/"/g, "%22") : "#";
}


function render() {
  renderSidebar();
  renderStats();
  renderMusic();
}

(function init() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const light = savedTheme === "light";
  document.documentElement.classList.toggle("light", light);
  updateThemeText(light);
  render();
})();
