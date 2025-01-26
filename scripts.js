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

// Função para carregar todas as seções, exceto "popular"
function loadAllSections() {
    const sections = ['mundos', 'addon', 'textura', 'personagens', 'shader'];
    let allProducts = '';

    // Carregar todas as seções
    Promise.all(sections.map(section => 
        fetch(`secoes/${section}.html`)
            .then(response => response.text())
            .then(data => {
                allProducts += data; // Adiciona diretamente o conteúdo sem divs extras
            })
            .catch(error => console.error('Erro ao carregar a seção:', error))
    )).then(() => {
        document.getElementById('results').innerHTML = allProducts;
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
