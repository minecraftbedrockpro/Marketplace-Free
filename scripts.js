function setSelectedSection(section) {
    const buttons = document.querySelectorAll('.sidebar button');
    buttons.forEach((button) => button.classList.remove('selected'));
    const selectedButton = document.querySelector(`.sidebar button[onclick="changeSection('${section}')"]`);
    if (selectedButton) selectedButton.classList.add('selected');
}

let currentGitlabGroups = [];
const VALID_SECTIONS = new Set(['procure', 'popular', 'mundos', 'addon', 'textura', 'shader', 'personagens']);

function getSectionFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const section = (params.get('aba') || '').trim().toLowerCase();
    return VALID_SECTIONS.has(section) ? section : 'procure';
}

function updateSectionUrl(section) {
    const url = new URL(window.location.href);
    if (section === 'procure') {
        url.searchParams.delete('aba');
    } else {
        url.searchParams.set('aba', section);
    }
    if (url.toString() !== window.location.href) {
        history.replaceState(null, '', url);
    }
}

function hideProductsWithoutImages(container) {
    if (!container) return;
    const produtos = container.querySelectorAll('.produto');
    produtos.forEach((produto) => {
        const imgEl = produto.querySelector('.produto-imagem');
        if (!imgEl) return;

        if (imgEl.tagName === 'DIV' && imgEl.textContent.includes('❌')) {
            produto.style.display = 'none';
            return;
        }

        if (imgEl.tagName === 'IMG') {
            const src = imgEl.getAttribute('src') || '';
            if (!src.trim()) {
                produto.style.display = 'none';
                return;
            }

            if (imgEl.complete && imgEl.naturalWidth === 0) {
                produto.style.display = 'none';
                return;
            }

            imgEl.addEventListener('error', () => {
                produto.style.display = 'none';
            });

            imgEl.addEventListener('load', () => {
                produto.style.display = '';
            });
        }
    });
}

function buildSectionHeader(name, icon) {
    return `
        <div style="display:flex;align-items:center;gap:10px;width:calc(100% - 20px);box-sizing:border-box;background-color:#333;padding:10px;border-radius:8px;margin:6px 10px 2px;">
            <img src="${icon}" alt="${name}" style="width: 24px; height: 24px;">
            <h2 style="color: white; margin: 0;">${name}</h2>
        </div>
    `;
}

const SECTION_STATIC_DISABLED = new Set(['popular', 'personagens']);

async function fetchSectionMarkup(section) {
    if (SECTION_STATIC_DISABLED.has(section)) return '';
    const response = await fetch(`secoes/${section}.html`);
    if (!response.ok) {
        throw new Error(`Erro ao carregar a seção ${section}`);
    }
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const wrapper = parsed.querySelector('.section');
    return wrapper ? wrapper.innerHTML : html;
}

async function renderSection(section) {
    const results = document.getElementById('results');
    const staticMarkup = await fetchSectionMarkup(section);
    const dynamic = await window.GitlabMcApp.buildSectionHtml(section);
    results.innerHTML = `${staticMarkup}${dynamic.html}`;
    currentGitlabGroups = dynamic.groups;
    window.GitlabMcApp.bindVersionButtons(results, dynamic.groups);
    await window.GitlabMcApp.decorateFixedCards(results);
    hideProductsWithoutImages(results);
}

async function loadAllSections() {
    const sections = ['mundos', 'addon', 'textura', 'shader', 'personagens'];
    const sectionInfo = {
        mundos: { name: 'Mundos', icon: 'icones/mundo.png' },
        addon: { name: 'Add-Ons', icon: 'icones/addon.png' },
        textura: { name: 'Texturas', icon: 'icones/textura.png' },
        shader: { name: 'Shader', icon: 'icones/shader.png' },
        personagens: { name: 'Skins', icon: 'icones/persona.png' }
    };

    const results = document.getElementById('results');
    results.innerHTML = '';

    let combinedMarkup = '';
    let combinedGroups = [];

    for (const section of sections) {
        const [staticMarkup, dynamic] = await Promise.all([
            fetchSectionMarkup(section),
            window.GitlabMcApp.buildSectionHtml(section)
        ]);

        if (!staticMarkup.trim() && !dynamic.html.trim()) continue;

        const { name, icon } = sectionInfo[section];
        combinedMarkup += buildSectionHeader(name, icon);
        combinedMarkup += staticMarkup;
        combinedMarkup += dynamic.html;
        combinedGroups = combinedGroups.concat(dynamic.groups);
    }

    results.innerHTML = combinedMarkup;
    currentGitlabGroups = combinedGroups;
    window.GitlabMcApp.bindVersionButtons(results, combinedGroups);
    await window.GitlabMcApp.decorateFixedCards(results);
    hideProductsWithoutImages(results);
}

async function changeSection(section) {
    if (!VALID_SECTIONS.has(section)) section = 'procure';
    updateSectionUrl(section);
    setSelectedSection(section);

    try {
        if (section === 'procure') {
            await loadAllSections();
            return;
        }

        await renderSection(section);
    } catch (error) {
        console.error('Erro ao carregar a seção:', error);
        document.getElementById('results').innerHTML = '<p style="background-color: #222; color: #fff; padding: 20px; margin: 0;">Erro ao carregar a seção.</p>';
    }
}

document.getElementById('search-bar').addEventListener('input', async function() {
    const query = this.value.trim();
    const resultsContainer = document.getElementById('results');

    if (query === '') {
        await changeSection(getSectionFromUrl());
        return;
    }

    const matchedGroups = window.GitlabMcApp.searchGroups(currentGitlabGroups, query);
    if (!matchedGroups.length) {
        resultsContainer.innerHTML = '<p style="background-color: #222; color: #fff; padding: 20px; margin: 0;">Nenhum produto encontrado.</p>';
        return;
    }

    resultsContainer.innerHTML = window.GitlabMcApp.buildCardsHtml(matchedGroups);
    window.GitlabMcApp.bindVersionButtons(resultsContainer, matchedGroups);
    hideProductsWithoutImages(resultsContainer);
});

window.onload = function() {
    changeSection(getSectionFromUrl());
};

window.addEventListener('popstate', () => {
    const section = getSectionFromUrl();
    setSelectedSection(section);
    if (section === 'procure') {
        loadAllSections().catch((error) => {
            console.error('Erro ao carregar a seção:', error);
        });
        return;
    }
    renderSection(section).catch((error) => {
        console.error('Erro ao carregar a seção:', error);
    });
});

const logoBanner = document.getElementById('logo-banner');
logoBanner.addEventListener('click', () => {
    document.getElementById('search-bar').value = '';
    changeSection('procure');
});
