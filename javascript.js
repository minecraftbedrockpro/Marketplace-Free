document.addEventListener('DOMContentLoaded', (event) => {
    console.log("JavaScript carregado!");

    // Criar o HUD dinamicamente
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.classList.add('hud');

    // Criar o item da versão
    const versionElement = document.createElement('div');
    versionElement.id = 'version';
    versionElement.classList.add('hud-item');
    versionElement.style.color = '#00ff00'; // Cor verde para a versão
    versionElement.textContent = 'Versão: 1.0.0';
    hud.appendChild(versionElement);

    // Criar o alerta de Skins/Maps
    const skinsMapsAlert = document.createElement('div');
    skinsMapsAlert.id = 'skinsMapsAlert';
    skinsMapsAlert.classList.add('hud-item', 'alert');
    skinsMapsAlert.style.color = '#ff0000'; // Cor vermelha para o alerta
    skinsMapsAlert.textContent = 'Skins Packs e Mapas World 4D não suportados';
    hud.appendChild(skinsMapsAlert);

    // Adicionar o HUD ao body
    document.body.appendChild(hud);
});
// Função para mostrar o modal
function showModal() {
    modal.style.display = 'flex';
}
