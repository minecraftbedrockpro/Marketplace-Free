function showSection(id) {
    // Esconde todas as seções
    var sections = document.querySelectorAll('.section');
    sections.forEach(function(section) {
        section.classList.remove('active');
    });

    // Mostra a seção selecionada
    document.getElementById(id).classList.add('active');
}

// Recupera a seção ativa ao carregar a página
window.onload = function() {
    const savedSection = localStorage.getItem('activeSection');
    if (savedSection && document.getElementById(savedSection)) {
        showSection(savedSection);
    } else {
        // Mostra a seção principal (default) se nada estiver salvo
        showSection('mapas-world');
    }

    function showSection(id) {
        // Salva a seção ativa no localStorage
        localStorage.setItem('activeSection', id);
    
        // Esconde todas as seções
        var sections = document.querySelectorAll('.section');
        sections.forEach(function(section) {
            section.classList.remove('active');
        });
    
        // Mostra a seção selecionada
        document.getElementById(id).classList.add('active');
    }
    
    // Recupera a seção ativa ao carregar a página
    window.onload = function() {
        const savedSection = localStorage.getItem('activeSection');
        if (savedSection && document.getElementById(savedSection)) {
            showSection(savedSection);
        } else {
            // Mostra a seção principal (default) se nada estiver salvo
            showSection('mapas-world');
        }
    };
}
function search() {
    // Obtém o valor da pesquisa
    var input = document.getElementById('searchInput').value.toLowerCase();
    // Obtém todos os elementos h2
    var h2s = document.querySelectorAll('h2');
    var found = false;

    h2s.forEach(function(h2) {
        // Verifica se o texto do h2 corresponde ao valor da pesquisa
        if (h2.textContent.toLowerCase().includes(input)) {
            // Mostra a seção correspondente
            showSection(h2.closest('.section').id);
            // Destaca o h2 correspondente
            h2.style.backgroundColor = 'yellow';
            found = true;
        } else {
            // Remove o destaque dos h2s que não correspondem
            h2.style.backgroundColor = '';
        }
    });

    if (!found) {
        alert("Nenhum resultado encontrado.");
    }
}

