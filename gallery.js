const galleryAssetVersion = "20260612-photo-import";
const galleryDataUrl = "src/data/gallery.json";

const galleryCategoryLabels = {
  all: "All",
  windows: "Windows",
  "pressure-cleaning": "Pressure Cleaning",
  "roof-cleaning": "Roof Cleaning",
  gutters: "Gutters",
  "carpet-upholstery": "Carpet & Upholstery",
  "tile-grout": "Tile & Grout",
  commercial: "Commercial",
  "before-after": "Before & After",
  other: "Other"
};

const galleryCategoryOrder = [
  "all",
  "windows",
  "pressure-cleaning",
  "roof-cleaning",
  "gutters",
  "carpet-upholstery",
  "tile-grout",
  "commercial",
  "before-after",
  "other"
];

let galleryItems = [];
let filteredItems = [];
let activeCategory = "all";
let activeTrigger = null;
let activeLightboxIndex = 0;
let activeShowcaseIndex = 0;

function getGallerySrc(path) {
  if (!path) {
    return "";
  }
  return `${path}?v=${galleryAssetVersion}`;
}

function getDisplayTitle(item) {
  return galleryCategoryLabels[item.category] || "Cleaning Work";
}

function normalizeItem(item) {
  return {
    image: item.image || item.src || "",
    thumbnail: item.thumbnail || item.image || item.src || "",
    category: item.category || "other",
    source: item.source || "manual",
    alt: item.alt || "T & A Pro Cleaning gallery photo",
    featured: Boolean(item.featured),
    beforeAfter: Boolean(item.beforeAfter),
    categoryNeedsReview: Boolean(item.categoryNeedsReview),
    dateAdded: item.dateAdded || ""
  };
}

async function loadGalleryItems() {
  try {
    const response = await fetch(`${galleryDataUrl}?v=${galleryAssetVersion}`, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Gallery data failed with ${response.status}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data.map(normalizeItem) : [];
  } catch (error) {
    console.warn("Gallery data could not be loaded", error);
    return [];
  }
}

function createPill(text, className = "") {
  const pill = document.createElement("span");
  pill.className = `gallery-pill ${className}`.trim();
  pill.textContent = text;
  return pill;
}

function createGalleryCard(item, index, mode) {
  const card = document.createElement("article");
  card.className = "gallery-card";
  card.dataset.galleryIndex = String(index);
  card.dataset.galleryCategory = item.category;

  const button = document.createElement("button");
  button.type = "button";
  button.className = "gallery-card-button";
  button.setAttribute("aria-label", `Open ${item.alt}`);
  button.dataset.galleryOpen = String(index);

  const media = document.createElement("span");
  media.className = "gallery-card-media";

  const img = document.createElement("img");
  img.src = getGallerySrc(item.thumbnail);
  img.alt = item.alt;
  img.loading = mode === "preview" ? "lazy" : "lazy";
  img.decoding = "async";

  const placeholder = document.createElement("span");
  placeholder.className = "gallery-placeholder";
  placeholder.setAttribute("aria-hidden", "true");
  placeholder.innerHTML = `<strong>Photo loading</strong><small>${getDisplayTitle(item)}</small>`;

  img.addEventListener("load", () => {
    card.classList.add("is-loaded");
    card.classList.remove("is-missing");
  });

  img.addEventListener("error", () => {
    img.hidden = true;
    button.disabled = true;
    card.classList.add("is-missing");
    card.classList.remove("is-loaded");
    button.setAttribute("aria-label", `${getDisplayTitle(item)} photo unavailable`);
  });

  const caption = document.createElement("span");
  caption.className = "gallery-card-caption";

  const title = document.createElement("strong");
  title.textContent = getDisplayTitle(item);

  const meta = document.createElement("span");
  meta.textContent = `${item.source}${item.beforeAfter ? " / Before & after" : ""}`;

  const tags = document.createElement("span");
  tags.className = "gallery-card-tags";
  tags.appendChild(createPill(galleryCategoryLabels[item.category] || "Other"));
  if (item.beforeAfter) {
    tags.appendChild(createPill("Before & After", "gallery-pill-accent"));
  }

  caption.append(title, meta, tags);
  media.append(img, placeholder);
  button.append(media, caption);
  card.append(button);
  return card;
}

function getItemsForMode(mode) {
  if (mode === "preview") {
    const featured = galleryItems.filter((item) => item.featured);
    return (featured.length ? featured : galleryItems).slice(0, 8);
  }
  if (mode === "before-after") {
    return galleryItems.filter((item) => item.beforeAfter).slice(0, 8);
  }
  if (activeCategory === "all") {
    return galleryItems;
  }
  return galleryItems.filter((item) => item.category === activeCategory);
}

function getShowcaseItems() {
  const priority = ["before-after", "roof-cleaning", "windows", "pressure-cleaning", "commercial"];
  const selected = [];

  priority.forEach((category) => {
    galleryItems
      .filter((item) => item.category === category)
      .sort((a, b) => Number(Boolean(b.beforeAfter)) - Number(Boolean(a.beforeAfter)) || Number(Boolean(b.featured)) - Number(Boolean(a.featured)))
      .forEach((item) => {
        if (!selected.some((existing) => existing.image === item.image)) {
          selected.push(item);
        }
      });
  });

  const fallback = galleryItems.filter((item) => item.featured);
  fallback.forEach((item) => {
    if (!selected.some((existing) => existing.image === item.image)) {
      selected.push(item);
    }
  });

  return selected.slice(0, 6);
}

function renderBeforeAfterShowcase() {
  const sections = document.querySelectorAll("[data-before-after-showcase]");
  if (!sections.length) {
    return;
  }

  const items = getShowcaseItems();
  sections.forEach((section) => {
    const slider = section.querySelector("[data-before-after-slider]");
    const dots = section.querySelector("[data-before-after-dots]");
    if (!slider || !dots) {
      return;
    }

    if (!items.length) {
      section.hidden = true;
      return;
    }

    section.hidden = false;
    activeShowcaseIndex = (activeShowcaseIndex + items.length) % items.length;
    const item = items[activeShowcaseIndex];
    const galleryIndex = galleryItems.indexOf(item);
    const category = galleryCategoryLabels[item.category] || "Cleaning Work";

    slider.innerHTML = `
      <article class="home-showcase-slide">
        <button type="button" class="home-showcase-image" data-gallery-open="${galleryIndex}" aria-label="Open ${item.alt}">
          <img src="${getGallerySrc(item.image)}" alt="${item.alt}" loading="eager" decoding="async" />
        </button>
        <div class="home-showcase-caption">
          <span>${category}</span>
          <strong>${item.beforeAfter ? "Before & after result" : "Premium project result"}</strong>
          <p>${item.alt}</p>
        </div>
      </article>
    `;

    dots.innerHTML = "";
    items.forEach((dotItem, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.beforeAfterDot = String(index);
      button.setAttribute("aria-label", `Show ${galleryCategoryLabels[dotItem.category] || "project"} image ${index + 1}`);
      button.setAttribute("aria-pressed", String(index === activeShowcaseIndex));
      dots.appendChild(button);
    });
  });
}

function updateCount(items) {
  const countNode = document.querySelector("[data-gallery-count]");
  if (!countNode) {
    return;
  }
  const label = activeCategory === "all" ? "all categories" : galleryCategoryLabels[activeCategory] || activeCategory;
  countNode.textContent = `Showing ${items.length} ${items.length === 1 ? "photo" : "photos"} in ${label}`;
}

function renderGalleryGrid(grid) {
  const mode = grid.dataset.galleryGrid || "full";
  const items = getItemsForMode(mode);
  if (mode === "full") {
    filteredItems = items;
    updateCount(items);
  }

  grid.innerHTML = "";
  if (!items.length) {
    const empty = document.createElement("p");
    empty.className = "gallery-empty";
    empty.textContent = "No gallery photos in this category yet.";
    grid.appendChild(empty);
    return;
  }

  items.forEach((item, index) => {
    const actualIndex = galleryItems.indexOf(item);
    grid.appendChild(createGalleryCard(item, actualIndex >= 0 ? actualIndex : index, mode));
  });
}

function renderAllGrids() {
  document.querySelectorAll("[data-gallery-grid]").forEach(renderGalleryGrid);
  renderBeforeAfterShowcase();

  const beforeAfterSection = document.querySelector("[data-gallery-before-after-section]");
  if (beforeAfterSection) {
    beforeAfterSection.hidden = !galleryItems.some((item) => item.beforeAfter);
  }
}

function getAvailableCategories() {
  const set = new Set(galleryItems.map((item) => item.category));
  return galleryCategoryOrder.filter((category) => category === "all" || set.has(category));
}

function renderFilters() {
  const filterWrap = document.querySelector("[data-gallery-filters]");
  if (!filterWrap) {
    return;
  }

  filterWrap.innerHTML = "";
  getAvailableCategories().forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "gallery-filter-button";
    button.textContent = galleryCategoryLabels[category] || category;
    button.dataset.galleryFilter = category;
    button.setAttribute("aria-pressed", String(category === activeCategory));
    filterWrap.appendChild(button);
  });
}

function ensureLightbox() {
  let lightbox = document.querySelector("[data-gallery-lightbox]");
  if (lightbox) {
    return lightbox;
  }

  lightbox = document.createElement("div");
  lightbox.className = "gallery-lightbox";
  lightbox.dataset.galleryLightbox = "true";
  lightbox.hidden = true;
  lightbox.setAttribute("role", "dialog");
  lightbox.setAttribute("aria-modal", "true");
  lightbox.setAttribute("aria-label", "Gallery image preview");
  lightbox.innerHTML = `
    <button type="button" class="gallery-lightbox-close" data-gallery-close aria-label="Close gallery image">×</button>
    <button type="button" class="gallery-lightbox-nav gallery-lightbox-prev" data-gallery-prev aria-label="Previous gallery image">‹</button>
    <div class="gallery-lightbox-panel" role="document">
      <div class="gallery-lightbox-media">
        <img data-gallery-lightbox-image alt="" />
        <div class="gallery-lightbox-fallback" data-gallery-lightbox-fallback hidden>
          <strong>Photo unavailable</strong>
          <span>This image can be reviewed in the gallery folder.</span>
        </div>
      </div>
      <div class="gallery-lightbox-caption">
        <p data-gallery-lightbox-caption></p>
        <span data-gallery-lightbox-meta></span>
      </div>
    </div>
    <button type="button" class="gallery-lightbox-nav gallery-lightbox-next" data-gallery-next aria-label="Next gallery image">›</button>
  `;
  document.body.appendChild(lightbox);
  return lightbox;
}

function closeLightbox() {
  const lightbox = document.querySelector("[data-gallery-lightbox]");
  if (!lightbox) {
    return;
  }

  lightbox.hidden = true;
  lightbox.classList.remove("is-open");
  document.body.classList.remove("gallery-lightbox-open");

  if (activeTrigger && typeof activeTrigger.focus === "function") {
    activeTrigger.focus();
  }
  activeTrigger = null;
}

function updateLightbox(index) {
  const item = galleryItems[index];
  const lightbox = ensureLightbox();
  if (!item || !lightbox) {
    return;
  }

  activeLightboxIndex = index;
  const image = lightbox.querySelector("[data-gallery-lightbox-image]");
  const caption = lightbox.querySelector("[data-gallery-lightbox-caption]");
  const meta = lightbox.querySelector("[data-gallery-lightbox-meta]");
  const fallback = lightbox.querySelector("[data-gallery-lightbox-fallback]");

  fallback.hidden = true;
  image.hidden = false;
  image.src = getGallerySrc(item.image);
  image.alt = item.alt;
  caption.textContent = item.alt;
  meta.textContent = `${galleryCategoryLabels[item.category] || "Other"} / ${item.source}${item.beforeAfter ? " / Before & after" : ""}`;

  image.onerror = () => {
    image.hidden = true;
    fallback.hidden = false;
  };
}

function openLightbox(index, trigger) {
  if (!galleryItems[index]) {
    return;
  }

  activeTrigger = trigger;
  const lightbox = ensureLightbox();
  updateLightbox(index);

  lightbox.hidden = false;
  lightbox.classList.add("is-open");
  document.body.classList.add("gallery-lightbox-open");
  lightbox.querySelector("[data-gallery-close]").focus();
}

function moveLightbox(direction) {
  if (!galleryItems.length) {
    return;
  }
  const nextIndex = (activeLightboxIndex + direction + galleryItems.length) % galleryItems.length;
  updateLightbox(nextIndex);
}

function setActiveFilter(category) {
  activeCategory = category;
  document.querySelectorAll("[data-gallery-filter]").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.galleryFilter === activeCategory));
  });
  renderAllGrids();
}

async function setupGallery() {
  const grids = document.querySelectorAll("[data-gallery-grid]");
  if (!grids.length) {
    return;
  }

  galleryItems = await loadGalleryItems();
  renderFilters();
  renderAllGrids();
  const lightbox = ensureLightbox();

  document.addEventListener("click", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }

    const filterButton = target.closest("[data-gallery-filter]");
    if (filterButton) {
      setActiveFilter(filterButton.dataset.galleryFilter || "all");
      return;
    }

    const openButton = target.closest("[data-gallery-open]");
    if (openButton && !openButton.disabled) {
      openLightbox(Number(openButton.dataset.galleryOpen), openButton);
      return;
    }

    if (target.closest("[data-gallery-prev]")) {
      moveLightbox(-1);
      return;
    }

    if (target.closest("[data-gallery-next]")) {
      moveLightbox(1);
      return;
    }

    if (target.closest("[data-before-after-prev]")) {
      const total = getShowcaseItems().length;
      if (total) {
        activeShowcaseIndex = (activeShowcaseIndex - 1 + total) % total;
        renderBeforeAfterShowcase();
      }
      return;
    }

    if (target.closest("[data-before-after-next]")) {
      const total = getShowcaseItems().length;
      if (total) {
        activeShowcaseIndex = (activeShowcaseIndex + 1) % total;
        renderBeforeAfterShowcase();
      }
      return;
    }

    const showcaseDot = target.closest("[data-before-after-dot]");
    if (showcaseDot) {
      activeShowcaseIndex = Number(showcaseDot.dataset.beforeAfterDot) || 0;
      renderBeforeAfterShowcase();
      return;
    }

    if (target.closest("[data-gallery-close]") || target === lightbox) {
      closeLightbox();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) {
      return;
    }
    if (event.key === "Escape") {
      closeLightbox();
    }
    if (event.key === "ArrowLeft") {
      moveLightbox(-1);
    }
    if (event.key === "ArrowRight") {
      moveLightbox(1);
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupGallery);
} else {
  setupGallery();
}
