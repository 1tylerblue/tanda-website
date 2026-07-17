(() => {
  const SERVICE_CATEGORIES = [
    "All Services",
    "Window Cleaning",
    "Pressure Cleaning",
    "House Washing",
    "Roof Cleaning",
    "Gutter Cleaning",
    "Solar Cleaning",
    "Carpet Cleaning",
    "Upholstery Cleaning",
    "Tile & Grout Cleaning",
    "Commercial Cleaning",
  ];

  const SOURCE_LABELS = ["All Reviews", "Google", "Airtasker", "Oneflare"];
  const GOOGLE_REVIEW_PROFILE_URL = "https://www.google.com/maps/search/?api=1&query=T%20%26%20A%20Pro%20Cleaning%20Gold%20Coast%20reviews";

  const SERVICE_GALLERY_MAP = {
    "Window Cleaning": ["windows"],
    "Pressure Cleaning": ["pressure-cleaning", "before-after"],
    "House Washing": ["pressure-cleaning", "other"],
    "Roof Cleaning": ["roof-cleaning", "before-after"],
    "Gutter Cleaning": ["gutters", "roof-cleaning"],
    "Solar Cleaning": ["roof-cleaning"],
    "Solar Panel Cleaning": ["roof-cleaning"],
    "Carpet Cleaning": ["carpet-upholstery"],
    "Upholstery Cleaning": ["carpet-upholstery"],
    "Tile & Grout Cleaning": ["tile-grout", "other"],
    "Commercial Cleaning": ["commercial", "windows", "pressure-cleaning"],
  };

  const RELATED_SERVICE_MAP = {
    "Window Cleaning": ["Commercial Cleaning", "House Washing"],
    "Pressure Cleaning": ["House Washing", "Roof Cleaning", "Commercial Cleaning"],
    "House Washing": ["Pressure Cleaning", "Roof Cleaning", "Commercial Cleaning"],
    "Roof Cleaning": ["Pressure Cleaning", "Gutter Cleaning", "House Washing"],
    "Gutter Cleaning": ["Roof Cleaning", "Pressure Cleaning", "House Washing"],
    "Solar Cleaning": ["Roof Cleaning", "Gutter Cleaning", "House Washing"],
    "Solar Panel Cleaning": ["Roof Cleaning", "Gutter Cleaning", "House Washing"],
    "Carpet Cleaning": ["Upholstery Cleaning", "Tile & Grout Cleaning", "Commercial Cleaning"],
    "Upholstery Cleaning": ["Carpet Cleaning", "Tile & Grout Cleaning", "Commercial Cleaning"],
    "Tile & Grout Cleaning": ["Carpet Cleaning", "Upholstery Cleaning", "Commercial Cleaning"],
    "Commercial Cleaning": ["Window Cleaning", "Pressure Cleaning", "Carpet Cleaning"],
  };

  const SERVICE_ALIASES = {
    "Pressure Washing": "Pressure Cleaning",
    "Driveway Cleaning": "Pressure Cleaning",
    "Solar Panel Cleaning": "Solar Cleaning",
  };

  const TRUST_BADGES = [
    "Fully Insured",
    "5-Star Rated",
    "Satisfaction Guarantee",
    "Professional Equipment",
    "Hundreds of Properties Serviced",
  ];

  let reviews = [];
  let galleryItems = [];
  let activeSource = "All Reviews";
  let activeService = "All Services";
  let query = "";

  function clean(value) {
    return String(value ?? "").trim();
  }

  function canonicalService(value) {
    const service = clean(value);
    return SERVICE_ALIASES[service] || service;
  }

  function hasReviewText(review) {
    return review?.hasText !== false && clean(review?.review).length > 0;
  }

  function escapeHtml(value) {
    return clean(value).replace(/[&<>"']/g, (char) => (
      {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[char]
    ));
  }

  function routeDepthPrefix() {
    const path = window.location.pathname;
    return /\/(?:reviews|services)\//i.test(path) ? "../" : "";
  }

  function dataPaths(fileName) {
    const prefix = routeDepthPrefix();
    return [
      `${prefix}src/data/${fileName}`,
      `/src/data/${fileName}`,
      `src/data/${fileName}`,
      `frontend/src/data/${fileName}`,
    ];
  }

  async function fetchJson(paths) {
    for (const path of paths) {
      try {
        const response = await fetch(path, { cache: "no-store" });
        if (response.ok) {
          return await response.json();
        }
      } catch {
        // Try the next static path.
      }
    }
    return [];
  }

  async function fetchReviews() {
    return fetchJson(dataPaths("reviews.json"));
  }

  async function fetchGallery() {
    return fetchJson(dataPaths("gallery.json"));
  }

  function averageRating(items) {
    const ratings = items.map((item) => Number(item.rating)).filter(Number.isFinite);
    if (!ratings.length) {
      return "0.0";
    }
    return (ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length).toFixed(1);
  }

  function sourceCounts(items) {
    return items.reduce((counts, item) => {
      counts[item.source] = (counts[item.source] || 0) + 1;
      return counts;
    }, {});
  }

  function setText(selector, value) {
    document.querySelectorAll(selector).forEach((node) => {
      node.textContent = value;
    });
  }

  function reviewTitle(review) {
    return clean(review.service) || clean(review.jobType) || "Cleaning Review";
  }

  function starText(rating) {
    const value = Number(rating);
    if (!Number.isFinite(value)) {
      return "Rating from source";
    }
    return `${value.toFixed(1)} / 5`;
  }

  const STAR_MARKUP = "&#9733;&#9733;&#9733;&#9733;&#9733;";

  function absoluteUrl(value) {
    const path = clean(value);
    if (!path) {
      return "";
    }
    try {
      return new URL(path, window.location.origin).href;
    } catch {
      return path;
    }
  }

  function mediaPath(value) {
    const path = clean(value);
    if (!path || /^https?:\/\//i.test(path)) {
      return path;
    }
    return `/${path.replace(/^\/+/, "")}`;
  }

  function sourceMark(source) {
    const label = clean(source);
    const letter = label === "Google" ? "G" : label === "Airtasker" ? "A" : label.slice(0, 1) || "R";
    return `<span class="review-source-mark review-source-mark-${escapeHtml(label.toLowerCase())}" aria-hidden="true">${escapeHtml(letter)}</span>`;
  }

  function sourceBadgeText(count, source) {
    return count === 1 ? `1 verified ${source} review` : `${count} verified ${source} reviews`;
  }

  function createSourceBadges(items) {
    const counts = sourceCounts(items);
    const fragment = document.createDocumentFragment();

    ["Google", "Airtasker", "Oneflare"].forEach((source) => {
      const count = counts[source] || 0;
      if (!count) {
        return;
      }
      const badge = document.createElement("span");
      badge.className = `review-source-badge review-source-${source.toLowerCase()}`;
      badge.innerHTML = `${sourceMark(source)}<span><strong>${source}</strong><small>${sourceBadgeText(count, source)}</small></span>`;
      fragment.appendChild(badge);
    });

    return fragment;
  }

  function renderSourceBadges() {
    document.querySelectorAll("[data-review-source-badges]").forEach((node) => {
      node.innerHTML = "";
      node.appendChild(createSourceBadges(reviews));
    });
  }

  function reviewStrength(review) {
    const text = clean(review.review).toLowerCase();
    const signals = [
      "highly recommend",
      "excellent",
      "professional",
      "reliable",
      "friendly",
      "communication",
      "amazing",
      "attention",
      "five stars",
      "use again",
      "wonderful",
      "fantastic",
      "great service",
    ];
    const signalScore = signals.reduce((score, term) => score + (text.includes(term) ? 1 : 0), 0);
    return (
      Number(Boolean(review.featured)) * 100 +
      Number(Boolean(review.reviewerPhoto)) * 20 +
      signalScore * 12 +
      Math.min(clean(review.review).length / 45, 16) +
      Number(review.rating || 0)
    );
  }

  function bestReviews(limit = 6, filter = () => true) {
    return reviews
      .filter((review) => hasReviewText(review) && filter(review))
      .sort((a, b) => reviewStrength(b) - reviewStrength(a))
      .slice(0, limit);
  }

  function initialsFor(review) {
    return clean(review.name)
      .split(/\s+/)
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "TA";
  }

  function avatarMarkup(review, className = "") {
    const reviewerPhoto = clean(review.reviewerPhoto);
    const reviewerPhotoAlt = clean(review.reviewerPhotoAlt) || `Profile photo of ${clean(review.name) || "customer"}`;
    const classes = ["review-avatar", reviewerPhoto ? "review-avatar-photo" : "", className].filter(Boolean).join(" ");
    const initials = escapeHtml(initialsFor(review));

    if (!reviewerPhoto) {
      return `<span class="${classes}" aria-hidden="true"><span class="review-avatar-initials">${initials}</span></span>`;
    }

    return `
      <span class="${classes}">
        <span class="review-avatar-initials" aria-hidden="true">${initials}</span>
        <img src="${escapeHtml(reviewerPhoto)}" alt="${escapeHtml(reviewerPhotoAlt)}" loading="lazy" decoding="async" onerror="this.remove()">
      </span>
    `;
  }

  function createReviewCard(review, options = {}) {
    const card = document.createElement("article");
    card.className = [
      "review-card",
      options.compact ? "review-card-compact" : "",
      options.featured ? "review-card-featured" : "",
      options.large ? "review-card-large" : "",
    ].filter(Boolean).join(" ");
    card.dataset.reviewSource = clean(review.source);
    card.dataset.reviewService = clean(review.service);

    const sourceDate = [clean(review.source), clean(review.date)].filter(Boolean).join(" | ");
    const bodyMarkup = hasReviewText(review)
      ? `<p>${escapeHtml(review.review)}</p>`
      : `<p class="review-rating-only">Rating-only review from ${escapeHtml(review.source)}.</p>`;

    card.innerHTML = `
      <div class="review-card-top">
        ${avatarMarkup(review)}
        <div>
          <strong>${escapeHtml(review.name)}</strong>
          <span>${escapeHtml(sourceDate)}</span>
        </div>
        ${sourceMark(review.source)}
      </div>
      <div class="review-stars" aria-label="${starText(review.rating)}">
        <span aria-hidden="true">${STAR_MARKUP}</span>
        <strong>${starText(review.rating)}</strong>
      </div>
      ${bodyMarkup}
      <div class="review-card-footer">
        <span>${escapeHtml(reviewTitle(review))}</span>
        ${review.reviewUrl ? `<a href="${escapeHtml(review.reviewUrl)}" target="_blank" rel="noopener noreferrer">Source</a>` : ""}
      </div>
    `;

    return card;
  }

  function renderAvatarStacks() {
    const people = reviews.filter((review) => clean(review.reviewerPhoto)).slice(0, 9);
    document.querySelectorAll("[data-review-avatar-stack]").forEach((node) => {
      node.innerHTML = "";
      people.forEach((review) => {
        const wrapper = document.createElement("span");
        wrapper.className = "review-avatar-stack-item";
        wrapper.innerHTML = avatarMarkup(review, "review-avatar-stack-photo");
        node.appendChild(wrapper);
      });
    });
  }

  function renderTrustBadges() {
    document.querySelectorAll("[data-home-trust-badges]").forEach((node) => {
      node.innerHTML = TRUST_BADGES.map((badge) => `<span><i aria-hidden="true">&#10003;</i>${escapeHtml(badge)}</span>`).join("");
    });
  }

  function renderReviewWall() {
    const wall = document.querySelector("[data-review-wall]");
    if (!wall) {
      return;
    }

    const counts = sourceCounts(reviews);
    const featured = bestReviews(5);
    wall.innerHTML = `
      <div class="review-wall-topline">
        <div>
          <span>Verified review database</span>
          <strong><span data-review-total>${reviews.length}</span> Reviews</strong>
        </div>
        <div class="review-wall-rating">
          <span>Average Rating</span>
          <strong data-review-average>${averageRating(reviews)}</strong>
        </div>
      </div>
      <div class="review-wall-source-row">
        <span>${sourceMark("Google")}<strong>${counts.Google || 0}</strong><small>Google</small></span>
        <span>${sourceMark("Airtasker")}<strong>${counts.Airtasker || 0}</strong><small>Airtasker</small></span>
      </div>
      <div class="review-avatar-stack" data-review-avatar-stack aria-label="Customer profile images"></div>
      <div class="review-floating-wall" aria-label="Featured review snapshots">
        ${featured.map((review, index) => `
          <article class="review-float-card review-float-${index + 1}">
            <div>${avatarMarkup(review, "review-avatar-mini")}<strong>${escapeHtml(review.name)}</strong>${sourceMark(review.source)}</div>
            <p>${escapeHtml(clean(review.review).slice(0, 128))}${clean(review.review).length > 128 ? "..." : ""}</p>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderFeaturedReviews() {
    document.querySelectorAll("[data-featured-review-grid]").forEach((grid) => {
      const limit = Number(grid.dataset.featuredReviewGrid) || 6;
      grid.innerHTML = "";
      bestReviews(limit).forEach((review, index) => {
        grid.appendChild(createReviewCard(review, { featured: true, large: index < 2 }));
      });
    });
  }

  function galleryForService(service, limit = 3) {
    const normalizedService = canonicalService(service);
    const categories = SERVICE_GALLERY_MAP[service] || SERVICE_GALLERY_MAP[normalizedService] || [];
    return galleryItems
      .filter((item) => categories.includes(clean(item.category)))
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(Boolean(b.beforeAfter)) - Number(Boolean(a.beforeAfter)))
      .slice(0, limit);
  }

  function caseStudies() {
    const configs = [
      {
        service: "Roof Cleaning",
        title: "Roof and exterior transformation",
        summary: "Review-backed exterior cleaning paired with roof and before-after project photos.",
      },
      {
        service: "Window Cleaning",
        title: "Clearer glass, tracks and presentation",
        summary: "Window feedback paired with balcony, apartment and modern-property gallery work.",
      },
      {
        service: "Pressure Cleaning",
        title: "Hard-surface pressure cleaning",
        summary: "Driveway, patio and concrete cleaning work connected to pressure-cleaning feedback where available.",
      },
    ];

    return configs.map((config) => {
      const review = bestReviews(1, (item) => clean(item.service) === config.service)[0]
        || bestReviews(1, (item) => clean(item.service).toLowerCase().includes(config.service.split(" ")[0].toLowerCase()))[0];
      const photos = galleryForService(config.service, 3);
      return { ...config, review, photos };
    }).filter((item) => item.review && item.photos.length);
  }

  function renderCaseStudies() {
    const grid = document.querySelector("[data-case-study-grid]");
    if (!grid) {
      return;
    }

    const studies = caseStudies();
    grid.innerHTML = "";
    if (!studies.length) {
      grid.closest("[data-review-case-studies]")?.setAttribute("hidden", "");
      return;
    }

    studies.forEach((study) => {
      const card = document.createElement("article");
      card.className = "review-case-card";
      card.innerHTML = `
        <div class="review-case-media">
          ${study.photos.map((photo, index) => `
            <figure>
              <img src="${escapeHtml(mediaPath(photo.thumbnail || photo.image))}" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async">
              <figcaption>${index === 0 && photo.beforeAfter ? "Before and after" : "Project photo"}</figcaption>
            </figure>
          `).join("")}
        </div>
        <div class="review-case-copy">
          <span class="review-case-service">${escapeHtml(study.service)}</span>
          <h3>${escapeHtml(study.title)}</h3>
          <p>${escapeHtml(study.summary)}</p>
          <blockquote>
            <span aria-label="${starText(study.review.rating)}">${STAR_MARKUP}</span>
            ${escapeHtml(study.review.review)}
          </blockquote>
          <div class="review-case-person">
            ${avatarMarkup(study.review, "review-avatar-mini")}
            <span><strong>${escapeHtml(study.review.name)}</strong><small>${escapeHtml(study.review.source)} review</small></span>
          </div>
          <a class="btn-primary" href="#quote">Request a similar result</a>
        </div>
      `;
      grid.appendChild(card);
    });
  }

  function renderGoogleTrustBanners() {
    const counts = sourceCounts(reviews);
    const googleCount = counts.Google || 0;
    const googleReviews = reviews.filter((review) => review.source === "Google");
    const googleAverage = averageRating(googleReviews);

    document.querySelectorAll("[data-google-trust-banner]").forEach((banner) => {
      banner.innerHTML = `
        <div class="google-trust-main">
          <span class="google-logo-mark" aria-hidden="true">G</span>
          <div>
            <span>Google Business Profile</span>
            <strong>${googleCount} Google Reviews</strong>
          </div>
        </div>
        <div class="google-trust-rating">
          <span>Average rating</span>
          <strong>${googleAverage}</strong>
        </div>
        <a class="btn-primary" href="${GOOGLE_REVIEW_PROFILE_URL}" target="_blank" rel="noopener noreferrer">See All Reviews</a>
      `;
    });
  }

  function renderAnimatedStats() {
    const counts = sourceCounts(reviews);
    const statData = [
      ["Verified Reviews", reviews.length, "Source-attributed Google and Airtasker reviews"],
      ["Google Reviews", counts.Google || 0, "Public Google customer feedback"],
      ["Average Rating", averageRating(reviews), "Across imported public reviews"],
      ["Service Coverage", "4 Areas", "Gold Coast, Brisbane, Logan and Ipswich"],
      ["Service Types", "9+", "Residential, commercial and specialist cleaning"],
      ["Profile Images", reviews.filter((review) => clean(review.reviewerPhoto)).length, "Customer profile images included where permitted"],
    ];

    document.querySelectorAll("[data-animated-review-stats]").forEach((wrap) => {
      wrap.innerHTML = statData.map(([label, value, text]) => `
        <article class="animated-proof-card">
          <strong ${Number.isFinite(Number(value)) ? `data-count-to="${Number(value)}"` : ""}>${escapeHtml(value)}</strong>
          <span>${escapeHtml(label)}</span>
          <p>${escapeHtml(text)}</p>
        </article>
      `).join("");
    });

    animateCounters();
  }

  function animateCounters() {
    const counters = [...document.querySelectorAll("[data-count-to]")];
    if (!counters.length) {
      return;
    }

    const startCounter = (node) => {
      if (node.dataset.counted === "true") {
        return;
      }
      node.dataset.counted = "true";
      const target = Number(node.dataset.countTo);
      if (!Number.isFinite(target)) {
        return;
      }
      const duration = 900;
      const start = performance.now();
      const tick = (now) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        node.textContent = String(Math.round(target * eased));
        if (progress < 1) {
          requestAnimationFrame(tick);
        }
      };
      requestAnimationFrame(tick);
    };

    if (!("IntersectionObserver" in window)) {
      counters.forEach(startCounter);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          startCounter(entry.target);
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.35 });

    counters.forEach((counter) => observer.observe(counter));
  }

  function quoteSnippetMarkup(review) {
    return `
      <div class="quote-review-stars" aria-label="${starText(review.rating)}">${STAR_MARKUP}</div>
      <p>"${escapeHtml(review.review)}"</p>
      <span>${escapeHtml(review.name)} | ${escapeHtml(review.source)} | ${escapeHtml(reviewTitle(review))}</span>
    `;
  }

  function renderQuoteSnippets() {
    const pool = bestReviews(12);
    if (!pool.length) {
      return;
    }

    document.querySelectorAll("[data-random-review-snippet]").forEach((node, index) => {
      const review = pool[(Math.floor(Math.random() * pool.length) + index) % pool.length];
      node.innerHTML = quoteSnippetMarkup(review);
    });

    document.querySelectorAll("[data-random-review-list]").forEach((node) => {
      node.innerHTML = "";
      [...pool].sort(() => Math.random() - 0.5).slice(0, 3).forEach((review) => {
        const item = document.createElement("article");
        item.className = "quote-review-mini";
        item.innerHTML = quoteSnippetMarkup(review);
        node.appendChild(item);
      });
    });
  }

  function serviceMatches(review, service) {
    const target = canonicalService(service).toLowerCase();
    const reviewService = canonicalService(review.service).toLowerCase();
    const source = [review.service, review.jobType, review.review].map(clean).join(" ").toLowerCase();
    if (!target) {
      return false;
    }
    if (reviewService === target || source.includes(target)) {
      return true;
    }
    return false;
  }

  function uniqueReviews(items) {
    const seen = new Set();
    return items.filter((review) => {
      const key = clean(review.id) || [review.name, review.source, review.review].map(clean).join("|").toLowerCase();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  function serviceReviewSelection(service, limit = 4) {
    const normalizedService = canonicalService(service);
    const dedicated = bestReviews(30, (review) => serviceMatches(review, normalizedService));
    const relatedServices = RELATED_SERVICE_MAP[normalizedService] || [];
    const related = bestReviews(30, (review) => relatedServices.some((relatedService) => serviceMatches(review, relatedService)));
    const featured = bestReviews(30);
    const selected = uniqueReviews([...dedicated, ...related, ...featured]).slice(0, limit);

    return {
      dedicated,
      selected,
      usedFallback: selected.some((review) => !dedicated.includes(review)),
    };
  }

  function gallerySelection(service, limit = 4) {
    const normalizedService = canonicalService(service);
    const direct = galleryForService(normalizedService, limit);
    if (direct.length >= Math.min(2, limit)) {
      return direct;
    }

    const relatedCategories = (RELATED_SERVICE_MAP[normalizedService] || [])
      .flatMap((relatedService) => SERVICE_GALLERY_MAP[relatedService] || [])
      .filter(Boolean);
    const related = galleryItems
      .filter((item) => relatedCategories.includes(clean(item.category)))
      .sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || Number(Boolean(b.beforeAfter)) - Number(Boolean(a.beforeAfter)));
    const featured = galleryItems
      .filter((item) => item.featured)
      .sort((a, b) => Number(Boolean(b.beforeAfter)) - Number(Boolean(a.beforeAfter)));

    const merged = [];
    [...direct, ...related, ...featured, ...galleryItems].forEach((item) => {
      const key = clean(item.image);
      if (key && !merged.some((existing) => clean(existing.image) === key)) {
        merged.push(item);
      }
    });
    return merged.slice(0, limit);
  }

  function renderServiceGalleryBlocks() {
    document.querySelectorAll("[data-service-gallery-block]").forEach((block) => {
      const service = clean(block.dataset.galleryService || block.dataset.serviceFilter);
      const grid = block.querySelector("[data-service-gallery-grid]");
      if (!grid) {
        return;
      }

      const items = gallerySelection(service, Number(block.dataset.galleryLimit) || 4);
      grid.innerHTML = "";
      items.forEach((item) => {
        const figure = document.createElement("figure");
        figure.className = "service-gallery-card";
        figure.innerHTML = `
          <img src="${escapeHtml(mediaPath(item.thumbnail || item.image))}" alt="${escapeHtml(item.alt)}" loading="lazy" decoding="async">
          <figcaption>
            <strong>${item.beforeAfter ? "Before and after" : "Project result"}</strong>
            <span>${escapeHtml(clean(item.category).replace(/-/g, " "))}</span>
          </figcaption>
        `;
        grid.appendChild(figure);
      });
    });
  }

  function renderServiceCaseStudies() {
    document.querySelectorAll("[data-service-case-study]").forEach((block) => {
      const service = clean(block.dataset.caseStudyService || block.dataset.serviceFilter);
      const { selected, usedFallback } = serviceReviewSelection(service, 1);
      const photos = gallerySelection(service, 3);
      const review = selected[0];
      if (!review || !photos.length) {
        block.hidden = true;
        return;
      }

      block.hidden = false;
      block.innerHTML = `
        <article class="service-case-card">
          <div class="service-case-review">
            <span class="service-case-kicker">${escapeHtml(canonicalService(service))}</span>
            <h3>Review-backed project proof</h3>
            <blockquote>
              <span aria-label="${starText(review.rating)}">${STAR_MARKUP}</span>
              ${escapeHtml(review.review)}
            </blockquote>
            <div class="review-case-person">
              ${avatarMarkup(review, "review-avatar-mini")}
              <span><strong>${escapeHtml(review.name)}</strong><small>${escapeHtml(review.source)} review${usedFallback ? " | related proof" : ""}</small></span>
            </div>
            <a class="btn-primary" href="../index.html#quote">Get Quote</a>
          </div>
          <div class="service-case-media">
            ${photos.map((photo) => `
              <figure>
                <img src="${escapeHtml(mediaPath(photo.thumbnail || photo.image))}" alt="${escapeHtml(photo.alt)}" loading="lazy" decoding="async">
                <figcaption>${photo.beforeAfter ? "Before and after" : "Project result"}</figcaption>
              </figure>
            `).join("")}
          </div>
        </article>
      `;
    });
  }

  function renderServiceReviewBlocks() {
    document.querySelectorAll("[data-service-review-block]").forEach((block) => {
      const service = clean(block.dataset.serviceFilter);
      const grid = block.querySelector("[data-service-review-grid]");
      const count = block.querySelector("[data-service-review-count]");
      const average = block.querySelector("[data-service-review-average]");
      const note = block.querySelector("[data-service-review-note]");
      const sourceWrap = block.querySelector("[data-review-source-badges]");
      const { dedicated, selected, usedFallback } = serviceReviewSelection(service, Number(block.dataset.reviewLimit) || 4);
      const ratingSet = dedicated.length ? dedicated : selected;

      if (count) {
        count.textContent = String(dedicated.length || selected.length);
      }
      if (average) {
        average.textContent = averageRating(ratingSet);
      }
      if (note) {
        note.textContent = usedFallback
          ? "Includes related high-rated customer feedback because dedicated service reviews are limited."
          : "Showing customer reviews matched to this service.";
      }
      if (sourceWrap) {
        sourceWrap.innerHTML = "";
        sourceWrap.appendChild(createSourceBadges(selected));
      }
      if (grid) {
        grid.innerHTML = "";
        selected.forEach((review) => grid.appendChild(createReviewCard(review, { featured: true })));
      }
    });
  }

  function renderHomeReviewCarousel() {
    const carousel = document.querySelector("[data-review-carousel]");
    const shell = carousel?.closest("[data-home-review-carousel]");
    if (!carousel || !shell) {
      return;
    }

    if (typeof shell.reviewCarouselCleanup === "function") {
      shell.reviewCarouselCleanup();
    }

    const items = bestReviews(9);
    const prev = shell.querySelector("[data-review-prev]");
    const next = shell.querySelector("[data-review-next]");
    const dots = shell.querySelector("[data-review-carousel-dots]");
    const status = shell.querySelector("[data-review-carousel-status]");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let activePage = 0;
    let timerId = 0;
    let scrollTimerId = 0;
    let focusTimerId = 0;

    carousel.innerHTML = "";
    items.forEach((review) => {
      carousel.appendChild(createReviewCard(review, { compact: true, featured: true }));
    });

    if (!items.length) {
      shell.hidden = true;
      return;
    }

    shell.hidden = false;

    const cardsPerView = () => {
      if (window.matchMedia("(max-width: 760px)").matches) return 1;
      if (window.matchMedia("(max-width: 1080px)").matches) return 2;
      return 3;
    };

    const pageCount = () => Math.max(1, Math.ceil(items.length / cardsPerView()));

    const cardStride = () => {
      const card = carousel.querySelector(".review-card");
      if (!card) return carousel.clientWidth;
      const styles = window.getComputedStyle(carousel);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 18;
      return card.getBoundingClientRect().width + gap;
    };

    const updateIndicators = (announce = false) => {
      const totalPages = pageCount();
      activePage = Math.min(activePage, totalPages - 1);
      dots?.querySelectorAll("button").forEach((button, index) => {
        const active = index === activePage;
        button.setAttribute("aria-pressed", String(active));
        button.toggleAttribute("data-active", active);
      });

      if (status) {
        const first = activePage * cardsPerView() + 1;
        const last = Math.min(first + cardsPerView() - 1, items.length);
        status.setAttribute("aria-live", announce ? "polite" : "off");
        status.textContent = `Showing reviews ${first} to ${last} of ${items.length}`;
      }
    };

    const goToPage = (index, { instant = false, announce = false } = {}) => {
      const totalPages = pageCount();
      activePage = (index + totalPages) % totalPages;
      const left = activePage * cardsPerView() * cardStride();
      carousel.scrollTo({ left, behavior: instant || reducedMotion.matches ? "auto" : "smooth" });
      updateIndicators(announce);
    };

    const buildDots = () => {
      if (!dots) return;
      dots.innerHTML = "";
      for (let index = 0; index < pageCount(); index += 1) {
        const button = document.createElement("button");
        button.type = "button";
        button.setAttribute("aria-label", `Show review page ${index + 1}`);
        button.addEventListener("click", () => {
          goToPage(index, { announce: true });
          restartTimer();
        });
        dots.appendChild(button);
      }
      updateIndicators(false);
    };

    const stopTimer = () => {
      window.clearInterval(timerId);
      timerId = 0;
    };

    const startTimer = () => {
      stopTimer();
      if (
        reducedMotion.matches
        || pageCount() <= 1
        || document.hidden
        || shell.matches(":hover")
        || shell.contains(document.activeElement)
      ) {
        return;
      }
      timerId = window.setInterval(() => {
        goToPage(activePage + 1);
      }, 4800);
    };

    const restartTimer = () => {
      stopTimer();
      startTimer();
    };

    const handlePrevious = () => {
      goToPage(activePage - 1, { announce: true });
      restartTimer();
    };

    const handleNext = () => {
      goToPage(activePage + 1, { announce: true });
      restartTimer();
    };

    const handleMouseEnter = () => stopTimer();
    const handleMouseLeave = () => startTimer();
    const handleFocusIn = () => stopTimer();
    const handleFocusOut = () => {
      window.clearTimeout(focusTimerId);
      focusTimerId = window.setTimeout(() => {
        if (!shell.contains(document.activeElement)) startTimer();
      }, 0);
    };
    const handleVisibility = () => document.hidden ? stopTimer() : startTimer();
    const handleMotionChange = () => reducedMotion.matches ? stopTimer() : startTimer();
    const handleResize = () => {
      buildDots();
      goToPage(Math.min(activePage, pageCount() - 1), { instant: true });
      restartTimer();
    };
    const handleScroll = () => {
      window.clearTimeout(scrollTimerId);
      scrollTimerId = window.setTimeout(() => {
        const pageWidth = Math.max(1, cardStride() * cardsPerView());
        activePage = Math.min(pageCount() - 1, Math.max(0, Math.round(carousel.scrollLeft / pageWidth)));
        updateIndicators(false);
      }, 120);
    };

    prev?.addEventListener("click", handlePrevious);
    next?.addEventListener("click", handleNext);
    shell.addEventListener("mouseenter", handleMouseEnter);
    shell.addEventListener("mouseleave", handleMouseLeave);
    shell.addEventListener("focusin", handleFocusIn);
    shell.addEventListener("focusout", handleFocusOut);
    carousel.addEventListener("scroll", handleScroll, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("resize", handleResize);
    reducedMotion.addEventListener?.("change", handleMotionChange);

    buildDots();
    goToPage(0, { instant: true });
    startTimer();

    shell.reviewCarouselCleanup = () => {
      stopTimer();
      window.clearTimeout(scrollTimerId);
      window.clearTimeout(focusTimerId);
      prev?.removeEventListener("click", handlePrevious);
      next?.removeEventListener("click", handleNext);
      shell.removeEventListener("mouseenter", handleMouseEnter);
      shell.removeEventListener("mouseleave", handleMouseLeave);
      shell.removeEventListener("focusin", handleFocusIn);
      shell.removeEventListener("focusout", handleFocusOut);
      carousel.removeEventListener("scroll", handleScroll);
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("resize", handleResize);
      reducedMotion.removeEventListener?.("change", handleMotionChange);
    };
  }

  function renderHomeShowcase() {
    if (!document.querySelector("[data-review-showcase], [data-featured-review-grid], [data-review-carousel]")) {
      return;
    }

    setText("[data-review-average]", averageRating(reviews));
    setText("[data-review-total]", String(reviews.length));
    setText("[data-review-average-inline]", averageRating(reviews));
    setText("[data-review-total-inline]", String(reviews.length));
    renderSourceBadges();
    renderTrustBadges();
    renderReviewWall();
    renderAvatarStacks();
    renderFeaturedReviews();
    renderCaseStudies();
    renderGoogleTrustBanners();
    renderAnimatedStats();
    renderQuoteSnippets();
    renderTrustCards();

    renderHomeReviewCarousel();
  }

  function createFilterButton(label, active, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "review-filter-button";
    button.textContent = label;
    button.setAttribute("aria-pressed", String(active));
    button.addEventListener("click", onClick);
    return button;
  }

  function matchingReviews() {
    const normalizedQuery = query.toLowerCase();
    return reviews.filter((review) => {
      if (!hasReviewText(review)) {
        return false;
      }
      const sourceMatches = activeSource === "All Reviews" || review.source === activeSource;
      const serviceMatches = activeService === "All Services" || review.service === activeService;
      const text = [review.name, review.source, review.service, review.review, review.jobType].map(clean).join(" ").toLowerCase();
      const queryMatches = !normalizedQuery || text.includes(normalizedQuery);
      return sourceMatches && serviceMatches && queryMatches;
    });
  }

  function renderReviewsGrid() {
    const grid = document.querySelector("[data-reviews-grid]");
    if (!grid) {
      return;
    }

    const items = matchingReviews();
    grid.innerHTML = "";
    items.forEach((review) => {
      grid.appendChild(createReviewCard(review));
    });

    const resultCount = document.querySelector("[data-review-result-count]");
    if (resultCount) {
      const textReviewTotal = reviews.filter(hasReviewText).length;
      resultCount.textContent = `Showing ${items.length} of ${textReviewTotal} written reviews`;
    }

    const empty = document.querySelector("[data-review-empty]");
    if (empty) {
      empty.hidden = items.length > 0;
    }
  }

  function renderReviewFilters() {
    const sourceWrap = document.querySelector("[data-review-source-filters]");
    if (sourceWrap) {
      sourceWrap.innerHTML = "";
      SOURCE_LABELS.forEach((label) => {
        const count = label === "All Reviews" ? reviews.length : reviews.filter((review) => review.source === label).length;
        if (label !== "All Reviews" && !count) {
          return;
        }
        sourceWrap.appendChild(
          createFilterButton(label, activeSource === label, () => {
            activeSource = label;
            renderReviewFilters();
            renderReviewsGrid();
          })
        );
      });
    }

    const serviceWrap = document.querySelector("[data-review-service-filters]");
    if (serviceWrap) {
      serviceWrap.innerHTML = "";
      SERVICE_CATEGORIES.forEach((label) => {
        const count = label === "All Services" ? reviews.length : reviews.filter((review) => review.service === label).length;
        if (label !== "All Services" && !count) {
          return;
        }
        serviceWrap.appendChild(
          createFilterButton(label, activeService === label, () => {
            activeService = label;
            renderReviewFilters();
            renderReviewsGrid();
          })
        );
      });
    }
  }

  function renderReviewsPage() {
    if (!document.querySelector("[data-reviews-grid]")) {
      return;
    }

    setText("[data-review-average]", averageRating(reviews));
    setText("[data-review-total]", String(reviews.length));
    renderSourceBadges();
    renderAvatarStacks();
    renderFeaturedReviews();
    renderGoogleTrustBanners();
    renderAnimatedStats();
    renderReviewFilters();
    renderReviewsGrid();
    renderTrustCards();
    injectReviewPageSchema();

    document.querySelector("[data-review-search]")?.addEventListener("input", (event) => {
      query = event.target.value;
      renderReviewsGrid();
    });
  }

  function trustCards() {
    return [
      ["Fully Insured", "Business profile lists ABN 33 122 902 990 and insurance-backed service positioning."],
      ["5-Star Rated", `${averageRating(reviews)} average from ${reviews.length} imported public reviews.`],
      ["Satisfaction Guarantee", "Review language repeatedly mentions professional service, communication and customers recommending the team."],
      ["Professional Equipment", "Service scope and review language support specialist exterior and interior cleaning work."],
      ["Gold Coast & Brisbane Coverage", "Serving Gold Coast, Brisbane, Logan and Ipswich."],
      ["Verified Customer Reviews", `${reviews.length} imported reviews captured from source-attributed public review checks.`],
    ];
  }

  function renderTrustCards() {
    document.querySelectorAll("[data-review-trust-cards]").forEach((wrap) => {
      wrap.innerHTML = "";
      trustCards().forEach(([title, text]) => {
        const card = document.createElement("article");
        card.className = "review-trust-card";
        card.innerHTML = `<strong>${title}</strong><p>${text}</p>`;
        wrap.appendChild(card);
      });
    });
  }

  function injectReviewPageSchema() {
    if (!document.body.classList.contains("reviews-page")) {
      return;
    }

    const existing = document.querySelector("#reviews-testimonial-schema");
    existing?.remove();
    const writtenReviews = reviews.filter(hasReviewText);
    const schemaReviews = bestReviews(12);

    const schema = {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: "Reviews | T & A Pro Cleaning",
      url: "https://www.tandaprocleaning.com.au/reviews/",
      description: "Source-attributed customer reviews from Google and Airtasker customers.",
      about: {
        "@type": "LocalBusiness",
        name: "T & A Pro Cleaning",
        url: "https://www.tandaprocleaning.com.au/",
        telephone: "+61466224927",
        areaServed: ["Gold Coast", "Brisbane", "Logan", "Ipswich"],
      },
      mainEntity: {
        "@type": "ItemList",
        name: "Source-attributed customer testimonials",
        numberOfItems: writtenReviews.length,
        itemListElement: schemaReviews.map((review, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "CreativeWork",
            name: `${review.service} testimonial from ${review.name}`,
            text: review.review,
            author: {
              "@type": "Person",
              name: review.name,
              ...(review.reviewerPhoto ? { image: absoluteUrl(review.reviewerPhoto) } : {}),
            },
            publisher: {
              "@type": "Organization",
              name: review.source,
            },
            ...(review.reviewUrl ? { citation: review.reviewUrl } : {}),
          },
        })),
      },
      potentialAction: {
        "@type": "Action",
        name: "Request a Quote",
        target: "https://www.tandaprocleaning.com.au/#quote",
      },
    };

    const script = document.createElement("script");
    script.id = "reviews-testimonial-schema";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);
  }

  async function init() {
    [reviews, galleryItems] = await Promise.all([fetchReviews(), fetchGallery()]);
    renderHomeShowcase();
    renderReviewsPage();
    renderServiceGalleryBlocks();
    renderServiceCaseStudies();
    renderServiceReviewBlocks();
    renderQuoteSnippets();
  }

  init();
})();
