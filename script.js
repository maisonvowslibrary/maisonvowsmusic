const STORAGE_KEY = "kk-music-vault-v2";
const THEME_KEY = "kk-music-vault-theme";

const defaultMusic = [
  {
    id: crypto.randomUUID(), title: "Kesariya", artist: "Arijit Singh",
    album: "Brahmāstra", category: "Bollywood",
    url: "https://www.youtube.com/results?search_query=Kesariya+Arijit+Singh",
    art: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
    note: "", favorite: true, createdAt: Date.now() - 5000
  },
  {
    id: crypto.randomUUID(), title: "Insane", artist: "AP Dhillon",
    album: "", category: "Punjabi",
    url: "https://www.youtube.com/results?search_query=AP+Dhillon+Insane",
    art: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=80",
    note: "", favorite: false, createdAt: Date.now() - 4000
  },
  {
    id: crypto.randomUUID(), title: "A Moment Apart", artist: "ODESZA",
    album: "A Moment Apart", category: "Electronic",
    url: "https://open.spotify.com/search/A%20Moment%20Apart%20ODESZA",
    art: "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=900&q=80",
    note: "", favorite: false, createdAt: Date.now() - 3000
  },
  {
    id: crypto.randomUUID(), title: "lofi radio", artist: "Lofi Girl",
    album: "", category: "Lo-Fi",
    url: "https://www.youtube.com/@LofiGirl",
    art: "https://images.unsplash.com/photo-1478737270239-2f02b77fc618?auto=format&fit=crop&w=900&q=80",
    note: "Background music.", favorite: true, createdAt: Date.now() - 2000
  }
];

let music = loadMusic();
let state = { view: "all", category: "All", search: "", sort: "recent" };

function loadMusic() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (_) {}
  localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultMusic));
  return [...defaultMusic];
}

function saveMusic() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(music));
}

function categories() {
  return [...new Set(music.map(x => x.category).filter(Boolean))].sort((a,b) => a.localeCompare(b));
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
    return `<button class="cat-side ${state.category === cat ? "active" : ""}" onclick="setCategory(${JSON.stringify(cat)})"><span>${escapeHtml(cat)}</span><span>${count}</span></button>`;
  }).join("");
  document.getElementById("categoryList").innerHTML = categories().map(cat => `<option value="${escapeHtml(cat)}"></option>`).join("");

  const mobile = document.getElementById("mobileCategories");
  mobile.innerHTML = ["All", ...categories()].map(cat =>
    `<button class="category-btn ${state.category === cat ? "active" : ""}" onclick="setCategory(${JSON.stringify(cat)})">${escapeHtml(cat)}</button>`
  ).join("");
}

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

document.getElementById("musicForm").addEventListener("submit", event => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.target).entries());
  music.unshift({
    id: crypto.randomUUID(),
    title: data.title.trim(),
    artist: data.artist.trim(),
    album: data.album.trim(),
    category: data.category.trim(),
    url: data.url.trim(),
    art: data.art.trim(),
    note: data.note.trim(),
    favorite: false,
    createdAt: Date.now()
  });
  saveMusic();
  closeModal();
  state.view = "all";
  state.category = "All";
  render();
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

(function init() {
  const savedTheme = localStorage.getItem(THEME_KEY);
  const light = savedTheme === "light";
  document.documentElement.classList.toggle("light", light);
  updateThemeText(light);
  render();
})();
