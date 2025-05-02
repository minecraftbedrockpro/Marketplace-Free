// Função para mudar a seção
function changeSection(section) {
    // Remove a classe 'selected' de todos os botões
    const buttons = document.querySelectorAll('.sidebar button');
    buttons.forEach(button => button.classList.remove('selected'));

    // Adiciona a classe 'selected' ao botão clicado
    const selectedButton = document.querySelector(`.sidebar button[onclick="changeSection('${section}')"]`);
    selectedButton.classList.add('selected');

    if (section === 'procure') {
        // Carregar todas as seções, exceto "popular"
        loadAllSections();
    } else {
        fetch(`secoes/${section}.html`)
            .then(response => response.text())
            .then(data => {
                document.getElementById('results').innerHTML = data;
            })
            .catch(error => console.error('Erro ao carregar a seção:', error));
    }
}

function loadAllSections() {
    const sections = ['mundos', 'addon', 'textura', 'shader'];
    const sectionInfo = {
        mundos: { name: 'Mundos', icon: 'icones/mundo.png' },
        addon: { name: 'Add-Ons', icon: 'icones/addon.png' },
        textura: { name: 'Texturas', icon: 'icones/textura.png' },
        shader: { name: 'Shader', icon: 'icones/shader.png' }
    };

    let allProducts = '';

    // Função para carregar uma seção com seus produtos
    function loadSection(section) {
        return fetch(`secoes/${section}.html`)
            .then(response => response.text())
            .then(data => {
                const { name, icon } = sectionInfo[section];

                // Adiciona o título da categoria e ícone
                allProducts += `
                    <div style="display: flex; align-items: center; gap: 10px; background-color: #333; padding: 10px; border-radius: 8px; margin: 20px 0 10px;">
                        <img src="${icon}" alt="${name}" style="width: 24px; height: 24px;">
                        <h2 style="color: white; margin: 0;">${name}</h2>
                    </div>
                `;

                // Adiciona os produtos da categoria
                allProducts += data;
            })
            .catch(error => console.error(`Erro ao carregar a seção ${section}:`, error));
    }

    // Resetar a área de resultados antes de carregar as novas seções
    const resultsContainer = document.getElementById('results');
    resultsContainer.innerHTML = ''; // Limpa qualquer conteúdo anterior

    // Carregar as seções na ordem especificada
    Promise.all(sections.map(loadSection))
        .then(() => {
            // Atualiza a área de resultados com o conteúdo das seções carregadas
            resultsContainer.innerHTML = allProducts;
        })
        .catch(error => console.error('Erro ao carregar todas as seções:', error));
}


// Função de busca
document.getElementById('search-bar').addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const allProducts = document.querySelectorAll('.produto'); // Seleciona todos os produtos
    let results = '';

    allProducts.forEach(produto => {
        const title = produto.querySelector('h2').innerText.toLowerCase();

        // Verificar se o título do produto contém a busca
        if (title.includes(query)) {
            results += produto.outerHTML; // Adiciona o produto ao resultado
        }
    });

    // Atualiza os resultados
    const resultsContainer = document.getElementById('results');

    if (query === '') {
        resultsContainer.innerHTML = ''; // Quando o campo estiver vazio, não exibe nada
        loadAllSections(); // Carrega todas as seções novamente
    } else if (results) {
        resultsContainer.innerHTML = results; // Exibe apenas os produtos encontrados
    } else {
        // Aplica o fundo correto para a área de "Nenhum produto encontrado"
        resultsContainer.innerHTML = '<p style="background-color: #222; color: #fff; padding: 20px; margin: 0;">Nenhum produto encontrado.</p>';
    }
});

// Carregar a seção "procure" automaticamente ao carregar a página
window.onload = function() {
    changeSection('procure');
};
// Seleciona a logo
const logoBanner = document.getElementById('logo-banner');

// Adiciona um evento de clique à logo
logoBanner.addEventListener('click', () => {
    // Navega para a primeira seção
    changeSection('procure');
});
