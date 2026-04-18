(function () {
  const CONFIG = {
    gitlabRef: "main",
    cacheKey: "gitlab-mc-cache-v10",
    cacheTtlMs: 1000 * 60 * 30,
    marketplaceCacheKey: "gitlab-mc-marketplace-cache-v10",
    marketplaceCacheUrl: "data/gitlab-marketplace-cache.json",
    marketplaceCacheTtlMs: 1000 * 60 * 60 * 12,
    firebaseMetaUrl: "https://rochawiki-4981e-default-rtdb.firebaseio.com/gitlabMc/meta.json",
    firebaseGroupsUrl: "https://rochawiki-4981e-default-rtdb.firebaseio.com/gitlabMc/items.json",
    firebaseFixedMetaUrl: "https://rochawiki-4981e-default-rtdb.firebaseio.com/gitlabMc/fixedMeta.json",
    firebaseGroupsCacheKey: "gitlab-mc-firebase-groups-v1",
    firebaseFixedMetaCacheKey: "gitlab-mc-firebase-fixed-meta-v1",
    firebaseMetaCacheKey: "gitlab-mc-firebase-meta-v1",
    firebaseCacheTtlMs: 1000 * 60 * 20,
    localFixedMetaUrl: "data/fixed-marketplace-meta.json",
    sources: [
      {
        project: "kironaura/public",
        paths: [{ path: "", category: "" }],
      },
      {
        project: "marketplacefree/MarketplaceArquivos",
        paths: [
          { path: "DLC/Skin", category: "Skin" },
          { path: "DLC/addon", category: "Add-On" },
          { path: "DLC/texturas", category: "Textura" },
          { path: "DLC/world", category: "Mundo" },
        ],
      },
      {
        project: "marketplacefree/marketplace1.0.1",
        paths: [
          { path: "Addons", category: "Add-On" },
          { path: "Texturas", category: "Textura" },
          { path: "shader", category: "Shader" },
        ],
      },
    ],
  };
  const CATEGORY_OVERRIDES = {
    "prizma visuals": "Shader",
    "classic shadows": "Shader",
    "luminosity": "Shader",
    "luminosity realism": "Shader",
    "realism shades": "Shader",
  };
  const RATING_STAR_ICON = "icones/estrela-rating.svg";

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[char]));
  }

  function inferCategory(filename) {
    const lower = filename.toLowerCase();
    if (lower.endsWith(".mcaddon")) return "Add-On";
    if (lower.endsWith(".mcpack")) return "Pacote";
    if (lower.endsWith(".mctemplate")) return "Mundo";
    if (lower.endsWith(".zip")) return "Arquivo";
    return "Conteudo";
  }

  function extractVersion(value) {
    const normalized = String(value ?? "").replace(/[_-]+/g, " ");
    const match = normalized.match(/(^|[^0-9a-z])(v?\d+(?:\.\d+)+)(?![0-9a-z])/i);
    return match ? match[2] : "";
  }

  function normalizeFilename(filename) {
    return filename
      .replace(/\.[^.]+$/, "")
      .replace(/\(skin_pack\)/gi, "")
      .replace(/pack name/gi, "")
      .replace(/skin pack/gi, "")
      .replace(/skins/gi, "")
      .replace(/resource pack/gi, "")
      .replace(/__world_template_/gi, "")
      .replace(/__resources_/gi, "")
      .replace(/__addon_/gi, "")
      .replace(/#+/g, "")
      .replace(/[_+]+/g, " ")
      .replace(/\s+/g, " ")
      .replace(/\b(v?\d+(?:\.\d+)+)\b/gi, "$1")
      .trim();
  }

  function getComparableName(value) {
    return normalizeFilename(value)
      .toLowerCase()
      .replace(/\b(v?\d+(?:\.\d+)+)\b/gi, "")
      .replace(/\b(add on|addon|world template|resource|resources|pack|skin|skins)\b/gi, "")
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function mergeTitleWithGitlabVersion(marketplaceTitle, product) {
    if (!marketplaceTitle || !product.gitlabVersion) return marketplaceTitle;
    const marketplaceVersion = extractVersion(marketplaceTitle);
    if (!marketplaceVersion || marketplaceVersion === product.gitlabVersion) return marketplaceTitle;
    return marketplaceTitle.replace(marketplaceVersion, product.gitlabVersion);
  }

  function getGroupKey(product) {
    const title = product.filename || product.displayName || product.marketplaceTitle;
    return getComparableName(title);
  }

  function getProductTitle(product) {
    return product.marketplaceTitle || product.displayName;
  }

  function mapPackTypeToCategory(packType) {
    const value = String(packType || "").toLowerCase();
    if (value === "resourcepack") return "Textura";
    if (value === "worldtemplate") return "Mundo";
    if (value === "addon") return "Add-On";
    if (value === "skinpack") return "Skin";
    if (value === "persona") return "Persona";
    return "";
  }

  function getDisplayCategory(product) {
    const baseName = getComparableName(product?.marketplaceTitle || product?.displayName || product?.filename || "");
    if (CATEGORY_OVERRIDES[baseName]) return CATEGORY_OVERRIDES[baseName];
    return mapPackTypeToCategory(product?.marketplacePackType) || product?.category || "";
  }

  function getMarketplaceMatchConfidence(product) {
    const sourceTitle = product?.displayName || product?.filename || "";
    const marketplaceTitle = product?.marketplaceTitle || "";
    const sourceKey = getComparableName(sourceTitle);
    const marketplaceKey = getComparableName(marketplaceTitle);
    if (!sourceKey || !marketplaceKey) return 0;
    if (sourceKey === marketplaceKey) return 100;
    if (sourceKey.includes(marketplaceKey) || marketplaceKey.includes(sourceKey)) return 60;

    const sourceWords = new Set(sourceKey.split(" ").filter(Boolean));
    const marketplaceWords = new Set(marketplaceKey.split(" ").filter(Boolean));
    let overlap = 0;
    sourceWords.forEach((word) => {
      if (marketplaceWords.has(word)) overlap += 1;
    });
    if (overlap >= 2) return 30;
    if (overlap >= 1) return 15;
    return 0;
  }

  function sanitizeMarketplaceMatch(product) {
    if (!product) return product;
    const packType = String(product.marketplacePackType || "").toLowerCase();
    const category = String(product.category || "").toLowerCase();
    const confidence = getMarketplaceMatchConfidence(product);
    const isSkinLike = packType === "skinpack" || category === "skin";

    if (!isSkinLike || confidence >= 60) {
      return product;
    }

    return {
      ...product,
      marketplaceTitle: product.displayName || product.filename || product.marketplaceTitle,
      marketplaceImage: "",
      marketplaceUrl: "",
      marketplaceRating: null,
      marketplaceTime: null,
    };
  }

  function slugifyKey(value) {
    return normalizeFilename(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "item";
  }

  function getGroupCategory(group) {
    const currentBaseName = getComparableName(
      group?.current?.marketplaceTitle || group?.current?.displayName || group?.current?.filename || ""
    );
    if (CATEGORY_OVERRIDES[currentBaseName]) {
      return CATEGORY_OVERRIDES[currentBaseName];
    }

    const categories = group.versions.map((product) => getDisplayCategory(product)).filter(Boolean);
    if (!categories.length) return "";
    if (categories.includes("Shader")) return "Shader";
    if (categories.includes("Textura")) return "Textura";
    if (categories.includes("Add-On")) return "Add-On";
    if (categories.includes("Mundo")) return "Mundo";
    return categories[0];
  }

  function formatRating(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return "";
    return numeric.toFixed(1).replace(/\.0$/, "");
  }

  function getVersionOptionTitle(product, group) {
    const baseTitle = getProductTitle(product);
    const normalizedCurrent = getComparableName(group.current.filename);
    const normalizedProduct = getComparableName(product.filename);

    if (normalizedCurrent === normalizedProduct && group.versions.length === 1) {
      return baseTitle;
    }

    const categoryMap = {
      Skin: "Skin Pack",
      "Add-On": "Add-On",
      Mundo: "Mundo",
      Textura: "Textura",
      Shader: "Shader",
      Persona: "Persona",
    };

    const suffix = categoryMap[product.category] || product.category || "";
    if (!suffix) return baseTitle;

    const lowerTitle = baseTitle.toLowerCase();
    const lowerSuffix = suffix.toLowerCase();
    if (lowerTitle.includes(lowerSuffix)) {
      return baseTitle;
    }

    return `${baseTitle} (${suffix})`;
  }

  function getUpdatedTime(product) {
    const time = new Date(product.gitlabUpdatedAt || 0).getTime();
    return Number.isNaN(time) ? 0 : time;
  }

  function getRatingValue(product) {
    const numeric = Number(product?.marketplaceRating);
    return Number.isFinite(numeric) ? numeric : -1;
  }

  function formatUpdatedAt(updatedAt) {
    if (!updatedAt) return "Sem data";
    const date = new Date(updatedAt);
    if (Number.isNaN(date.getTime())) return "Sem data";
    const diffMs = Date.now() - date.getTime();
    if (diffMs < 0) return "agora";

    const minuteMs = 60 * 1000;
    const hourMs = 60 * minuteMs;
    const dayMs = 24 * hourMs;
    const monthMs = 30 * dayMs;
    const yearMs = 365 * dayMs;

    if (diffMs < minuteMs) return "agora";
    if (diffMs < hourMs) {
      const minutes = Math.floor(diffMs / minuteMs);
      return `ha ${minutes} minuto${minutes === 1 ? "" : "s"}`;
    }
    if (diffMs < dayMs) {
      const hours = Math.floor(diffMs / hourMs);
      return `ha ${hours} hora${hours === 1 ? "" : "s"}`;
    }
    if (diffMs < monthMs) {
      const days = Math.floor(diffMs / dayMs);
      return `ha ${days} dia${days === 1 ? "" : "s"}`;
    }
    if (diffMs < yearMs) {
      const months = Math.floor(diffMs / monthMs);
      return `ha ${months} mes${months === 1 ? "" : "es"}`;
    }

    const years = Math.floor(diffMs / yearMs);
    return `ha ${years} ano${years === 1 ? "" : "s"}`;
  }

  function buildRawUrl(project, path) {
    const encodedPath = path.split("/").map(encodeURIComponent).join("/");
    return `https://gitlab.com/${project}/-/raw/${CONFIG.gitlabRef}/${encodedPath}`;
  }

  function getProjectApiBase(project) {
    return `https://gitlab.com/api/v4/projects/${encodeURIComponent(project)}`;
  }

  function readCache(key, ttlMs) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.savedAt || !parsed.data) return null;
      if (Date.now() - parsed.savedAt > ttlMs) return null;
      return parsed.data;
    } catch (error) {
      return null;
    }
  }

  function writeCache(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (error) {
      console.warn("Nao foi possivel salvar cache local.", error);
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Falha ao carregar ${url} (${response.status})`);
    }
    return response.json();
  }

  async function fetchMarketplaceCache() {
    const cached = readCache(CONFIG.marketplaceCacheKey, CONFIG.marketplaceCacheTtlMs);
    if (cached) return cached;

    try {
      const response = await fetch(CONFIG.marketplaceCacheUrl, { cache: "no-store" });
      if (!response.ok) return {};
      const data = await response.json();
      writeCache(CONFIG.marketplaceCacheKey, data);
      return data;
    } catch (error) {
      return {};
    }
  }

  async function fetchFileUpdates(project, files) {
    const projectApiBase = getProjectApiBase(project);
    const commitRequests = files.map(async (file) => {
      const params = new URLSearchParams({
        ref_name: CONFIG.gitlabRef,
        path: file.path,
        per_page: "1",
      });
      const commits = await fetchJson(`${projectApiBase}/repository/commits?${params.toString()}`);
      const latestCommit = Array.isArray(commits) ? commits[0] : null;
      return {
        ...file,
        gitlabUpdatedAt: latestCommit?.committed_date || null,
        gitlabCommitId: latestCommit?.short_id || "",
      };
    });

    return Promise.all(commitRequests);
  }

  async function fetchSourceFiles(source) {
    const projectApiBase = getProjectApiBase(source.project);
    const groups = await Promise.all(source.paths.map(async (entry) => {
      const params = new URLSearchParams({
        ref: CONFIG.gitlabRef,
        per_page: "100",
      });
      if (entry.path) {
        params.set("path", entry.path);
      }

      const tree = await fetchJson(`${projectApiBase}/repository/tree?${params.toString()}`);
      const files = tree
        .filter((item) => item.type === "blob" && item.name !== ".gitkeep")
        .map((item) => ({
          filename: item.name,
          path: item.path,
          displayName: normalizeFilename(item.name),
          gitlabVersion: extractVersion(item.name),
          category: entry.category || inferCategory(item.name),
          downloadUrl: buildRawUrl(source.project, item.path),
          sourceProject: source.project,
        }));

      return fetchFileUpdates(source.project, files);
    }));

    return groups.flat();
  }

  async function fetchGitlabProducts() {
    const cached = readCache(CONFIG.cacheKey, CONFIG.cacheTtlMs);
    if (cached) return cached;

    const sourceResults = await Promise.all(CONFIG.sources.map(fetchSourceFiles));
    const products = sourceResults.flat();
    writeCache(CONFIG.cacheKey, products);
    return products;
  }

  async function fetchFirebaseMeta() {
    const cached = readCache(CONFIG.firebaseMetaCacheKey, CONFIG.firebaseCacheTtlMs);
    if (cached) return cached;
    if (!CONFIG.firebaseMetaUrl) return null;
    try {
      const response = await fetch(CONFIG.firebaseMetaUrl, { cache: "no-store" });
      if (!response.ok) return null;
      const payload = await response.json();
      if (!payload || typeof payload !== "object") return null;
      writeCache(CONFIG.firebaseMetaCacheKey, payload);
      return payload;
    } catch (error) {
      return cached;
    }
  }

  function normalizeFirebaseGroups(payload) {
    if (!payload || typeof payload !== "object") return null;

    const rawGroups = Object.values(payload)
      .filter(Boolean)
      .map((item, index) => ({
        id: item.id || `gitlab-mc-firebase-${index}`,
        key: item.key || item.id || `gitlab-mc-firebase-${index}`,
        current: item.current || item,
        versions: Array.isArray(item.versions)
          ? item.versions
          : (item.current ? [item.current] : [item]),
      }))
      .filter((group) => group.current);

    if (!rawGroups.length) return null;

      const mergedMap = new Map();
    rawGroups.forEach((group, index) => {
      const mergeKey = getGroupKey(group.current) || group.key || `gitlab-mc-firebase-merged-${index}`;
      if (!mergedMap.has(mergeKey)) {
        mergedMap.set(mergeKey, {
          id: group.id || `gitlab-mc-firebase-merged-${index}`,
          key: mergeKey,
          current: group.current,
          versions: [],
        });
      }

      const target = mergedMap.get(mergeKey);
      const allVersions = [...target.versions, ...(Array.isArray(group.versions) ? group.versions : [])];
      const deduped = [];
      const seenPaths = new Set();

      allVersions.forEach((version) => {
        const versionId = version?.path || version?.downloadUrl || version?.filename || JSON.stringify(version);
        if (!versionId || seenPaths.has(versionId)) return;
        seenPaths.add(versionId);
        deduped.push(version);
      });

        deduped.sort((left, right) => getUpdatedTime(right) - getUpdatedTime(left));
      target.versions = deduped.map(sanitizeMarketplaceMatch);
      target.current = target.versions[0] || sanitizeMarketplaceMatch(group.current);
    });

    const groups = Array.from(mergedMap.values()).sort((left, right) => {
      const ratingDiff = getRatingValue(right.current) - getRatingValue(left.current);
      if (ratingDiff !== 0) return ratingDiff;
      return getUpdatedTime(right.current) - getUpdatedTime(left.current);
    });

    return groups.length ? groups : null;
  }

  async function fetchFirebaseGroups() {
    if (!CONFIG.firebaseGroupsUrl) return null;
    try {
      const cachedMeta = readCache(CONFIG.firebaseMetaCacheKey, CONFIG.firebaseCacheTtlMs);
      const cachedGroups = readCache(CONFIG.firebaseGroupsCacheKey, CONFIG.firebaseCacheTtlMs);
      const meta = await fetchFirebaseMeta();

      if (meta && cachedMeta && cachedGroups && meta.lastSync && cachedMeta.lastSync === meta.lastSync) {
        return cachedGroups;
      }

      const response = await fetch(CONFIG.firebaseGroupsUrl, { cache: "no-store" });
      if (!response.ok) return cachedGroups || null;
      const payload = await response.json();
      const groups = normalizeFirebaseGroups(payload);
      if (groups) {
        writeCache(CONFIG.firebaseGroupsCacheKey, groups);
      }
      return groups || cachedGroups || null;
    } catch (error) {
      return readCache(CONFIG.firebaseGroupsCacheKey, CONFIG.firebaseCacheTtlMs);
    }
  }

  async function fetchFirebaseFixedMeta() {
    const mergeFixedMetaEntries = (localEntry, remoteEntry) => {
      if (!localEntry) return remoteEntry;
      if (!remoteEntry) return localEntry;
      return {
        ...localEntry,
        ...remoteEntry,
        rating: remoteEntry.rating ?? localEntry.rating,
        marketplaceTime: remoteEntry.marketplaceTime ?? localEntry.marketplaceTime,
        marketplaceUrl: remoteEntry.marketplaceUrl || localEntry.marketplaceUrl,
        versionsCount: remoteEntry.versionsCount ?? localEntry.versionsCount,
      };
    };

    const mergeFixedMetaMaps = (localMap, remoteMap) => {
      const merged = { ...(localMap || {}) };
      Object.entries(remoteMap || {}).forEach(([key, value]) => {
        merged[key] = mergeFixedMetaEntries(merged[key], value);
      });
      return merged;
    };

    const readLocalFixedMeta = async () => {
      if (!CONFIG.localFixedMetaUrl) return null;
      try {
        const response = await fetch(CONFIG.localFixedMetaUrl, { cache: "no-store" });
        if (!response.ok) return null;
        const payload = await response.json();
        return payload && typeof payload === "object" ? payload : null;
      } catch (error) {
        return null;
      }
    };

    const localFixedMeta = await readLocalFixedMeta();
    if (!CONFIG.firebaseFixedMetaUrl) return localFixedMeta;
    try {
      const cachedMeta = readCache(CONFIG.firebaseMetaCacheKey, CONFIG.firebaseCacheTtlMs);
      const cachedFixedMeta = readCache(CONFIG.firebaseFixedMetaCacheKey, CONFIG.firebaseCacheTtlMs);
      const meta = await fetchFirebaseMeta();

      if (meta && cachedMeta && cachedFixedMeta && meta.lastSync && cachedMeta.lastSync === meta.lastSync) {
        return mergeFixedMetaMaps(localFixedMeta, cachedFixedMeta);
      }

      const response = await fetch(CONFIG.firebaseFixedMetaUrl, { cache: "no-store" });
      if (!response.ok) {
        return mergeFixedMetaMaps(localFixedMeta, cachedFixedMeta);
      }
      const payload = await response.json();
      if (payload && typeof payload === "object" && Object.keys(payload).length) {
        writeCache(CONFIG.firebaseFixedMetaCacheKey, payload);
        return mergeFixedMetaMaps(localFixedMeta, payload);
      }
      return mergeFixedMetaMaps(localFixedMeta, cachedFixedMeta);
    } catch (error) {
      return mergeFixedMetaMaps(localFixedMeta, readCache(CONFIG.firebaseFixedMetaCacheKey, CONFIG.firebaseCacheTtlMs));
    }
  }

  function formatMarketplaceTime(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric <= 0) return "";
    return formatUpdatedAt(new Date(numeric * 1000).toISOString());
  }

  function buildMetaFooter(rating, timeLabel, versionsCount, disabled = false, groupId = "") {
    return `
      <div class="gitlab-mc-meta">
        <p>
          <span class="gitlab-mc-rating">
            <span class="gitlab-mc-rating-icon" aria-hidden="true"></span>
            <span>${escapeHtml(formatRating(rating))}</span>
          </span>
          <span class="gitlab-mc-time">${escapeHtml(timeLabel || "")}</span>
        </p>
        <button class="gitlab-mc-version-button" type="button"${groupId ? ` data-group-id="${escapeHtml(groupId)}"` : ""}${disabled ? " disabled" : ""}>${escapeHtml(String(versionsCount))} versoes</button>
      </div>
    `;
  }

  function buildPlaceholder(product) {
    return `
      <div class="produto-imagem produto-imagem--placeholder">
        <span>${escapeHtml(getDisplayCategory(product) || product.category)}</span>
      </div>
    `;
  }

  function buildCard(group) {
    const product = group.current;
    const imageMarkup = product.marketplaceImage
      ? `<img src="${escapeHtml(product.marketplaceImage)}" alt="${escapeHtml(product.marketplaceTitle || product.displayName)}" class="produto-imagem">`
      : buildPlaceholder(product);

    const title = getProductTitle(product);
    const extraVersionsCount = Math.max(group.versions.length - 1, 0);
    const versionButton = `<button class="gitlab-mc-version-button" type="button" data-group-id="${escapeHtml(group.id)}">${extraVersionsCount} versoes</button>`;

    return `
      <div class="produto produto--gitlab-mc">
        <a href="${escapeHtml(product.downloadUrl)}" target="_blank" rel="noopener noreferrer">
          ${imageMarkup}
          <h2>${escapeHtml(title)}</h2>
        </a>
        ${buildMetaFooter(product.marketplaceRating, formatUpdatedAt(product.gitlabUpdatedAt), extraVersionsCount, false, group.id)}
      </div>
    `;
  }

  function searchGroups(groups, query) {
    const normalizedQuery = getComparableName(query || "");
    if (!normalizedQuery) return groups;

    return groups.filter((group) => {
      const haystack = [
        group?.current?.marketplaceTitle,
        group?.current?.displayName,
        group?.current?.filename,
        ...((group?.versions || []).flatMap((version) => [
          version?.marketplaceTitle,
          version?.displayName,
          version?.filename,
        ])),
      ]
        .filter(Boolean)
        .join(" ");

      return getComparableName(haystack).includes(normalizedQuery);
    });
  }

  function getSectionFilter(section) {
    if (section === "popular") {
      return (group) => getRatingValue(group.current) >= 4.8;
    }
    if (section === "mundos") {
      return (group) => getGroupCategory(group) === "Mundo";
    }
    if (section === "addon") {
      return (group) => getGroupCategory(group) === "Add-On";
    }
    if (section === "textura") {
      return (group) => getGroupCategory(group) === "Textura";
    }
    if (section === "shader") {
      return (group) => getGroupCategory(group) === "Shader";
    }
    if (section === "personagens") {
      return (group) => ["Skin", "Persona"].includes(getGroupCategory(group));
    }
    if (section === "procure") {
      return (group) => ["Mundo", "Add-On", "Textura", "Shader", "Persona"].includes(getGroupCategory(group));
    }
    return () => false;
  }

  function enrichWithMarketplaceCache(products, marketplaceCache) {
    return products.map((product) => {
      const cachedEntry = marketplaceCache[product.filename] || marketplaceCache[product.path] || null;
      const fallbackEntry = cachedEntry || findSimilarMarketplaceEntry(product, marketplaceCache);
      if (!fallbackEntry) return product;
      const title = mergeTitleWithGitlabVersion(fallbackEntry.title, product) || product.displayName;

      return sanitizeMarketplaceMatch({
        ...product,
        marketplaceTitle: title,
        marketplaceImage: fallbackEntry.image || "",
        marketplaceUrl: fallbackEntry.productUrl || "",
        marketplacePackType: fallbackEntry.packType || product.category,
        marketplaceVersion: extractVersion(fallbackEntry.title || ""),
        marketplaceRating: fallbackEntry.rating ?? null,
      });
    });
  }

  function findSimilarMarketplaceEntry(product, marketplaceCache) {
    const productKey = getComparableName(product.filename);
    if (!productKey) return null;

    const entries = Object.entries(marketplaceCache);
    for (const [filename, entry] of entries) {
      if (!entry?.image) continue;
      const cacheKey = getComparableName(filename);
      if (!cacheKey) continue;
      if (productKey === cacheKey || productKey.includes(cacheKey) || cacheKey.includes(productKey)) {
        return entry;
      }
    }

    return null;
  }

  function buildProductGroups(products) {
    const map = new Map();
    products.forEach((product) => {
      const key = getGroupKey(product) || `${product.sourceProject}:${product.path}`;
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(product);
    });

    return Array.from(map.entries()).map(([key, versions], index) => {
      const sortedVersions = versions
        .slice()
        .sort((left, right) => getUpdatedTime(right) - getUpdatedTime(left));

      return {
        id: `gitlab-mc-group-${index}`,
        key,
        current: sortedVersions[0],
        versions: sortedVersions,
      };
    }).sort((left, right) => {
      const ratingDiff = getRatingValue(right.current) - getRatingValue(left.current);
      if (ratingDiff !== 0) return ratingDiff;
      return getUpdatedTime(right.current) - getUpdatedTime(left.current);
    });
  }

  function buildVersionModal() {
    let modal = document.getElementById("gitlab-mc-version-modal");
    if (modal) return modal;

    modal = document.createElement("div");
    modal.id = "gitlab-mc-version-modal";
    modal.style.cssText = [
      "display:none",
      "position:fixed",
      "inset:0",
      "z-index:999999",
      "align-items:center",
      "justify-content:center",
      "background:rgba(0,0,0,.78)",
    ].join(";");
    document.body.appendChild(modal);
    modal.addEventListener("click", (event) => {
      if (event.target === modal || event.target.hasAttribute("data-close-version-modal")) {
        closeVersionModal();
      }
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        closeVersionModal();
      }
    });
    return modal;
  }

  function closeVersionModal() {
    const modal = document.getElementById("gitlab-mc-version-modal");
    if (modal) {
      modal.style.display = "none";
      modal.innerHTML = "";
    }
  }

  function openVersionModal(group) {
    const modal = buildVersionModal();
    const optionBaseStyle = "display:block;padding:12px;margin-bottom:10px;background:#303030;color:white;text-decoration:none;border-radius:10px;transition:background .15s ease,transform .15s ease;box-sizing:border-box;";
    const otherVersions = group.versions.filter((product) => product.path !== group.current.path);
    const currentOptionStyle = "display:block;padding:12px;margin-bottom:10px;background:#3a2412;color:white;text-decoration:none;border-radius:10px;border:1px solid #ff9f1c;box-sizing:border-box;";
    modal.innerHTML = `
      <div style="position:relative;width:min(420px,calc(100vw - 32px));max-height:min(680px,calc(100vh - 48px));background:#202020;border:2px solid #ff9f1c;border-radius:18px;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6);" role="dialog" aria-modal="true">
        <div style="position:relative;padding:18px 18px 10px 18px;">
          <button class="gitlab-mc-version-inline-close" type="button" data-close-version-modal style="position:absolute;top:12px;right:12px;width:34px;height:34px;border-radius:50%;border:1px solid #777;background:#111;color:white;font-size:22px;cursor:pointer;transition:background .15s ease,border-color .15s ease,transform .15s ease;">×</button>
          <h2 style="margin:0 40px 0 0;color:white;">Selecionar versao</h2>
        </div>
        <div style="max-height:min(680px,calc(100vh - 120px));overflow-y:auto;padding:8px 18px 40px 18px;box-sizing:border-box;scrollbar-gutter:stable;">
          <a href="${escapeHtml(group.current.downloadUrl)}" target="_blank" rel="noopener noreferrer" style="${currentOptionStyle}">
            <span style="display:block;">${escapeHtml(getVersionOptionTitle(group.current, group))} <strong style="color:#ff9f1c;">(Atual)</strong></span>
            <small style="display:block;margin-top:4px;color:#d8d8d8;">${escapeHtml(formatUpdatedAt(group.current.gitlabUpdatedAt))}</small>
          </a>
          ${otherVersions.length ? otherVersions.map((product) => `
            <a class="gitlab-mc-version-inline-option" href="${escapeHtml(product.downloadUrl)}" target="_blank" rel="noopener noreferrer" style="${optionBaseStyle}">
              <span style="display:block;">${escapeHtml(getVersionOptionTitle(product, group))}</span>
              <small style="display:block;margin-top:4px;color:#bdbdbd;">${escapeHtml(formatUpdatedAt(product.gitlabUpdatedAt))}</small>
            </a>
          `).join("") + `<div style="height:8px;"></div>` : `<div style="padding:12px;border-radius:10px;background:#303030;color:#bdbdbd;">Nenhuma outra versao.</div>`}
        </div>
      </div>
    `;
    modal.querySelectorAll(".gitlab-mc-version-inline-option").forEach((option) => {
      option.addEventListener("mouseenter", () => {
        option.style.background = "#3d3d3d";
        option.style.transform = "translateY(-1px)";
      });
      option.addEventListener("mouseleave", () => {
        option.style.background = "#303030";
        option.style.transform = "";
      });
    });
    const closeButton = modal.querySelector(".gitlab-mc-version-inline-close");
    if (closeButton) {
      closeButton.addEventListener("mouseenter", () => {
        closeButton.style.background = "#3a2412";
        closeButton.style.borderColor = "#ff9f1c";
        closeButton.style.color = "#ff9f1c";
        closeButton.style.transform = "scale(1.06)";
      });
      closeButton.addEventListener("mouseleave", () => {
        closeButton.style.background = "#111";
        closeButton.style.borderColor = "#777";
        closeButton.style.color = "white";
        closeButton.style.transform = "";
      });
    }
    modal.style.display = "flex";
  }

  function renderLoading(container) {
    container.innerHTML = `
      <div class="gitlab-mc-panel">
        <p>Carregando pacotes...</p>
      </div>
    `;
  }

  function renderError(container, message) {
    container.innerHTML = `
      <div class="gitlab-mc-panel">
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  function renderProducts(container, products) {
    const groups = buildProductGroups(products);
    container.innerHTML = groups.map(buildCard).join("");
    bindVersionButtons(container, groups);
  }

  function bindVersionButtons(container, groups) {
    container.querySelectorAll(".gitlab-mc-version-button").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        const group = groups.find((item) => item.id === button.dataset.groupId);
        if (group) {
          openVersionModal(group);
        }
      });
    });
  }

  async function decorateFixedCards(container) {
    const fixedMeta = await fetchFirebaseFixedMeta();
    if (!fixedMeta || !container) return;

    const findFixedMeta = (title) => {
      const directKey = slugifyKey(title || "");
      if (fixedMeta[directKey]) return fixedMeta[directKey];

      const comparableSlug = getComparableName(title || "").replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
      if (comparableSlug && fixedMeta[comparableSlug]) return fixedMeta[comparableSlug];

      const normalizedTitle = normalizeFilename(title || "").toLowerCase();
      return Object.values(fixedMeta).find((item) => normalizeFilename(item?.title || "").toLowerCase() === normalizedTitle) || null;
    };

    container.querySelectorAll(".produto:not(.produto--gitlab-mc)").forEach((card) => {
      if (card.querySelector(".gitlab-mc-meta")) return;
      const titleElement = card.querySelector("h2");
      if (!titleElement) return;
      const meta = findFixedMeta(titleElement.textContent || "");
      if (!meta) return;
      card.insertAdjacentHTML(
        "beforeend",
        buildMetaFooter(meta.rating, formatMarketplaceTime(meta.marketplaceTime), meta.versionsCount ?? 0, true)
      );
    });
  }

  async function getAllGroups() {
    const firebaseGroups = await fetchFirebaseGroups();
    if (firebaseGroups) return firebaseGroups;

    const [products, marketplaceCache] = await Promise.all([
      fetchGitlabProducts(),
      fetchMarketplaceCache(),
    ]);
    return buildProductGroups(enrichWithMarketplaceCache(products, marketplaceCache));
  }

  async function getGroupsForSection(section) {
    const groups = await getAllGroups();
    const filter = getSectionFilter(section);
    return groups.filter(filter);
  }

  async function buildSectionHtml(section) {
    const groups = await getGroupsForSection(section);
    return {
      groups,
      html: groups.map(buildCard).join(""),
    };
  }

  async function renderGitlabMc(container) {
    renderLoading(container);

    try {
      const [products, marketplaceCache] = await Promise.all([
        fetchGitlabProducts(),
        fetchMarketplaceCache(),
      ]);
      renderProducts(container, enrichWithMarketplaceCache(products, marketplaceCache));
    } catch (error) {
      console.error(error);
      renderError(container, "Nao foi possivel carregar os arquivos do GitLab agora.");
    }
  }

  window.GitlabMcApp = {
    render: renderGitlabMc,
    getGroupsForSection,
    buildSectionHtml,
    buildCardsHtml: (groups) => groups.map(buildCard).join(""),
    searchGroups,
    bindVersionButtons,
    decorateFixedCards,
  };
})();
