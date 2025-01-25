// Seleciona o botão de menu e a sidebar
const menuToggle = document.getElementById('menu-toggle');
const sidebar = document.getElementById('sidebar');

// Adiciona um evento de clique ao botão de menu
menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('open'); // Alterna a classe 'open' na sidebar
});

// Função para mudar a seção
function changeSection(section) {
    // Remove a classe 'selected' de todos os botões
    const buttons = document.querySelectorAll('.sidebar button');
    buttons.forEach(button => button.classList.remove('selected'));

    // Adiciona a classe 'selected' ao botão clicado
    const selectedButton = document.querySelector(`.sidebar button[onclick="changeSection('${section}')"]`);
    selectedButton.classList.add('selected');

    const resultsContainer = document.getElementById('results');

    if (section === 'procure') {
        // Carregar todas as seções, exceto "popular"
        loadAllSections();
    } else {
        fetch(`secoes/${section}.html`)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Erro ao carregar a seção');
                }
                return response.text();
            })
            .then(data => {
                resultsContainer.innerHTML = data;
            })
            .catch(error => {
                console.error('Erro ao carregar a seção:', error);
                resultsContainer.innerHTML = `<p style="background-color: #222; color: #fff; padding: 20px; margin: 0;">Erro ao carregar a seção.</p>`;
            });
    }
}

// Função para carregar todas as seções, exceto "popular"
function loadAllSections() {
    const sections = ['mundos', 'addon', 'textura', 'personagens', 'shader'];
    let allSectionsContent = '<div id="procure-section" class="section"><h1>Faça sua busca</h1></div>';

    // Carregar todas as seções
    Promise.all(sections.map(section => 
        fetch(`secoes/${section}.html`)
            .then(response => response.text())
            .then(data => {
                allSectionsContent += data; // Adiciona diretamente o conteúdo sem divs extras
            })
            .catch(error => console.error('Erro ao carregar a seção:', error))
    )).then(() => {
        document.getElementById('results').innerHTML = allSectionsContent;
    });
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
