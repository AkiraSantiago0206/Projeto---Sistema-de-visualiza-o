// js/main.js

import * as storage from './storage.js';
import * as ui from './ui.js';
import * as websocket from './websocket.js';

// --- Estado da Aplicação ---
let state = {
    servers: [],
    activeServerId: null,
    isEditingServer: false,
    currentView: null, // NOVO: Acompanha a vista ativa atual
};

// --- Funções Auxiliares (ajustadas para o novo contexto) ---

// Esta função agora só atualiza os elementos da UI que são parte da vista do dashboard
function updateDashboardUI() {
    const hasSelectedServer = state.activeServerId !== null && state.servers[state.activeServerId];
    ui.populateServerSelect(state.servers, state.activeServerId);
    ui.updateButtonState(websocket.getConnectionState(), hasSelectedServer);
}

function handleServerSelection(idString) {
    const newId = parseInt(idString, 10);
    if (isNaN(newId) || newId < 0 || newId >= state.servers.length) return;

    if (newId !== state.activeServerId) {
        if (websocket.getConnectionState() === 'open') {
            websocket.disconnect();
        }

        state.activeServerId = newId;
        storage.setActiveServerId(newId);
        ui.addMessageToLog(`Servidor selecionado: ${state.servers[newId].name}. Conecte para começar a receber dados.`, 'system-message');
    }

    updateDashboardUI();
}

function saveServer() {
    const name = ui.DOMElements.serverNameInput.value.trim();
    const url = ui.DOMElements.serverUrlInput.value.trim();

    if (!name) {
        ui.showToast('O nome do servidor não pode ser vazio.', 'error');
        return;
    }
    if (!websocket.isValidWebSocketUrl(url)) {
        ui.showToast('URL do WebSocket inválida.', 'error');
        return;
    }

    if (state.isEditingServer) {
        const isUrlDuplicate = state.servers.some(
            (s, index) => s.url === url && index !== state.activeServerId
        );
        if (isUrlDuplicate) {
            ui.showToast('Esta URL já existe na sua lista de servidores.', 'error');
            return;
        }
        state.servers[state.activeServerId] = { name, url };
        ui.showToast(`Servidor "${name}" atualizado.`, 'success');

    } else {
        const isUrlDuplicate = state.servers.some(s => s.url === url);
        if (isUrlDuplicate) {
            ui.showToast('Esta URL já existe na sua lista de servidores.', 'error');
            return;
        }
        state.servers.push({ name, url });
        state.activeServerId = state.servers.length - 1;
        ui.showToast(`Servidor "${name}" adicionado.`, 'success');
    }
    
    storage.saveServers(state.servers);
    storage.setActiveServerId(state.activeServerId);
    ui.toggleServerModal(false);
    updateDashboardUI();
}

function handleDeleteConfirmation() {
    const server = state.servers[state.activeServerId];
    if (!server) {
        ui.showToast('Nenhum servidor selecionado.', 'info');
        return;
    }
    
    if (websocket.getConnectionState() !== 'closed') {
        websocket.disconnect();
    }
    
    state.servers.splice(state.activeServerId, 1);
    storage.saveServers(state.servers);
    
    state.activeServerId = state.servers.length > 0 ? 0 : null;
    storage.setActiveServerId(state.activeServerId);
    
    ui.showToast(`Servidor "${server.name}" excluído.`, 'info');
    ui.toggleConfirmDeleteModal(false);
    updateDashboardUI();
}

function connectToActiveServer() {
    const server = state.servers[state.activeServerId];
    if (server) {
        ui.updateConnectionStatus('Conectando...');
        updateDashboardUI();
        websocket.connect(server.url);
    } else {
        ui.showToast('Nenhum servidor ativo para conectar.', 'error');
    }
}

function exportData(format) {
    const data = ui.getLogData();
    if (data.length === 0) {
        ui.showToast('O log de dados está vazio!', 'info');
        return;
    }

    let fileContent;
    let mimeType;
    let fileExtension;

    if (format === 'json') {
        fileContent = JSON.stringify(data, null, 2);
        mimeType = 'application/json';
        fileExtension = 'json';
    } else if (format === 'csv') {
        const csvContent = convertToCSV(data);
        fileContent = csvContent;
        mimeType = 'text/csv';
        fileExtension = 'csv';
    } else {
        ui.showToast('Formato de exportação inválido.', 'error');
        return;
    }

    const blob = new Blob([fileContent], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `log-dados-${new Date().toISOString().slice(0, 10)}.${fileExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ui.showToast(`Log de dados exportado para ${fileExtension.toUpperCase()}!`, 'success');
}

function convertToCSV(data) {
    if (!data || data.length === 0) {
        return '';
    }

    const allKeys = new Set();
    data.forEach(item => {
        Object.keys(item).forEach(key => allKeys.add(key));
    });

    const headers = Array.from(allKeys);
    const csvRows = [];
    csvRows.push(headers.join(';'));

    data.forEach(item => {
        const row = headers.map(header => {
            const value = item[header] !== undefined ? item[header] : '';
            return `"${String(value).replace(/"/g, '""')}"`;
        });
        csvRows.push(row.join(';'));
    });

    return csvRows.join('\n');
}

// --- Funções de Inicialização de Vistas ---

function initializeHomeView() {
    // Nenhuma lógica JavaScript específica necessária para a vista "Home" por enquanto
    console.log('Vista "Home" inicializada.');
}

function initializeDashboardView() {
    // Re-anexa os event listeners para os elementos específicos do dashboard
    // Estes elementos são agora parte do HTML carregado dinamicamente
    if (!ui.DOMElements.toggleConnectionBtn) {
        console.warn('Elementos do Dashboard não encontrados. Não é possível inicializar a vista do dashboard.');
        return;
    }

    ui.DOMElements.toggleConnectionBtn.addEventListener('click', () => {
        if (websocket.getConnectionState() === 'open') {
            websocket.disconnect();
            ui.addMessageToLog('Desconectado manualmente.', 'system-message');
            ui.showToast('Desconectado.', 'info');
        } else {
            connectToActiveServer();
        }
    });

    ui.DOMElements.clearLogBtn.addEventListener('click', () => {
        ui.DOMElements.messagesDiv.innerHTML = '';
        ui.addMessageToLog('Log de mensagens limpo.', 'system-message');
        ui.showToast('Log limpo!', 'info');
    });
    
    ui.DOMElements.exportLogBtn.addEventListener('click', () => {
        const format = ui.DOMElements.exportFormatSelect.value;
        exportData(format);
    });
    
    ui.DOMElements.searchBtn.addEventListener('click', () => {
        const searchText = ui.DOMElements.filterInput.value;
        ui.filterLog(searchText);
    });

    ui.DOMElements.filterInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            const searchText = ui.DOMElements.filterInput.value;
            ui.filterLog(searchText);
        }
    });

    ui.DOMElements.serverSelect.addEventListener('change', (e) => handleServerSelection(e.target.value));
    
    ui.DOMElements.addServerBtn.addEventListener('click', () => {
        state.isEditingServer = false;
        ui.toggleServerModal(true, false);
    });

    ui.DOMElements.editServerBtn.addEventListener('click', () => {
        state.isEditingServer = true;
        const server = state.servers[state.activeServerId];
        if (server) {
            ui.toggleServerModal(true, true, server);
        } else {
            ui.showToast('Nenhum servidor selecionado para editar.', 'info');
        }
    });
    
    ui.DOMElements.deleteServerBtn.addEventListener('click', () => {
        const server = state.servers[state.activeServerId];
        if (server) {
            ui.toggleConfirmDeleteModal(true, server.name);
        }
    });

    // Configura os callbacks do WebSocket específicos para a vista do dashboard
    websocket.configure({
        onOpen: () => {
            const server = state.servers[state.activeServerId];
            ui.updateConnectionStatus('Conectado');
            ui.addMessageToLog(`Conectado a ${server.name}.`, 'system-message');
            ui.showToast('Conectado com sucesso!', 'success');
            ui.filterLog(ui.DOMElements.filterInput.value);
            updateDashboardUI();
        },
        onMessage: (data) => {
            ui.addMessageToLog(data, 'data-message');
            ui.filterLog(ui.DOMElements.filterInput.value);
        },
        onClose: (event) => {
            ui.updateConnectionStatus('Desconectado');
            ui.addMessageToLog(`Conexão fechada. Código: ${event.code}`, 'system-message');
            updateDashboardUI();
        },
        onError: (error) => {
            ui.updateConnectionStatus('Erro');
            ui.addMessageToLog(error, 'error-message');
            ui.showToast('Erro na conexão.', 'error');
            updateDashboardUI();
        },
    });

    // Atualização inicial da UI para os elementos do dashboard
    updateDashboardUI();
    console.log('Vista "Dashboard" inicializada.');
}

// --- Gerenciamento de Navegação entre Vistas ---

async function navigateToView(viewName) {
    if (state.currentView === viewName) {
        ui.toggleSidebar(false); // Apenas fecha a sidebar se já estiver na vista
        return;
    }

    // Desconecta o WebSocket se estiver saindo da vista do dashboard
    if (state.currentView === 'dashboard' && websocket.getConnectionState() !== 'closed') {
        websocket.disconnect();
        ui.addMessageToLog('Conexão WebSocket encerrada ao sair do Dashboard.', 'system-message');
    }

    const success = await ui.loadView(viewName); // Carrega o HTML da nova vista
    if (success) {
        state.currentView = viewName;
        ui.toggleSidebar(false); // Fecha a sidebar após a navegação

        // Inicializa o JavaScript específico da vista
        switch (viewName) {
            case 'home':
                initializeHomeView();
                break;
            case 'dashboard':
                initializeDashboardView();
                break;
            // Adicione casos para 'settings', 'about' etc. conforme forem implementados
            case 'settings':
                console.log('Vista "Configurações" selecionada (ainda não implementada).');
                ui.DOMElements.mainContent.innerHTML = `<div class="container"><h1>Configurações</h1><p>Esta seção ainda não foi implementada.</p></div>`;
                break;
            case 'about':
                console.log('Vista "Sobre" selecionada (ainda não implementada).');
                ui.DOMElements.mainContent.innerHTML = `<div class="container"><h1>Sobre</h1><p>Esta seção ainda não foi implementada.</p></div>`;
                break;
            default:
                console.warn(`Vista desconhecida: ${viewName}`);
                break;
        }
    }
}

// --- Configuração Global de Event Listeners (para elementos que estão sempre no index.html) ---

function setupGlobalEventListeners() {
    // Event listeners dos modais (são globais e sempre presentes no index.html)
    ui.DOMElements.saveServerDetailsBtn.addEventListener('click', saveServer);
    ui.DOMElements.cancelServerDetailsBtn.addEventListener('click', () => ui.toggleServerModal(false));
    ui.DOMElements.confirmDeleteBtn.addEventListener('click', handleDeleteConfirmation);
    ui.DOMElements.cancelDeleteBtn.addEventListener('click', () => ui.toggleConfirmDeleteModal(false));
    
    ui.DOMElements.closeButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.getAttribute('data-modal');
            if (modalId === 'server-modal') {
                ui.toggleServerModal(false);
            } else if (modalId === 'confirm-delete-modal') {
                ui.toggleConfirmDeleteModal(false);
            }
        });
    });
    
    window.addEventListener('click', (e) => {
        if (e.target === ui.DOMElements.serverModal) {
            ui.toggleServerModal(false);
        } else if (e.target === ui.DOMElements.confirmDeleteModal) {
            ui.toggleConfirmDeleteModal(false);
        }
    });

    // Event listeners da Sidebar
    ui.DOMElements.toggleSidebarBtn.addEventListener('click', () => {
        ui.toggleSidebar(true);
    });

    ui.DOMElements.closeSidebarBtn.addEventListener('click', () => {
        ui.toggleSidebar(false);
    });

    ui.DOMElements.sidebarOverlay.addEventListener('click', () => {
        ui.toggleSidebar(false);
    });

    // Fechar sidebar com a tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && ui.DOMElements.sidebar.classList.contains('open')) {
            ui.toggleSidebar(false);
        }
    });

    // Event listeners para os links de navegação na sidebar
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault(); // Previne o comportamento padrão do link
            const viewName = e.target.closest('a').getAttribute('data-view');
            if (viewName) {
                navigateToView(viewName);
            } else {
                // Lida com links sem data-view (ex: "Sair")
                console.log(`Link clicado: ${e.target.closest('a').textContent.trim()}`);
                ui.showToast(`Ação para "${e.target.closest('a').textContent.trim()}" não implementada.`, 'info');
                ui.toggleSidebar(false);
            }
        });
    });
}

// --- Inicialização da Aplicação ---

async function initializeApp() {
    state.servers = storage.getServers();
    state.activeServerId = storage.getActiveServerId();

    if (state.activeServerId !== null && !state.servers[state.activeServerId]) {
        state.activeServerId = state.servers.length > 0 ? 0 : null;
        storage.setActiveServerId(state.activeServerId);
    }
    
    ui.hideAllModals();
    ui.toggleSidebar(false); // Garante que a sidebar esteja fechada na carga inicial
    
    setupGlobalEventListeners(); // Configura os listeners para elementos globais

    // Carrega a vista inicial (ex: a página 'home')
    await navigateToView('home'); // Inicia com a página inicial
}

document.addEventListener('DOMContentLoaded', initializeApp);