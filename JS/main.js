// js/main.js

import * as storage from './storage.js';
import * as ui from './ui.js';
import * as websocket from './websocket.js';

// --- Estado da Aplicação ---
let state = {
    servers: [],
    activeServerId: null,
    isEditingServer: false,
};

// --- Funções Principais ---

function updateUI() {
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

    updateUI();
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

    // Lógica de validação de URL duplicada
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

    } else { // Cenário de adicionar novo servidor
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
    updateUI();
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
    updateUI();
}

function connectToActiveServer() {
    const server = state.servers[state.activeServerId];
    if (server) {
        ui.updateConnectionStatus('Conectando...');
        updateUI();
        websocket.connect(server.url);
    } else {
        ui.showToast('Nenhum servidor ativo para conectar.', 'error');
    }
}

// --- Configuração e Inicialização ---

function setupEventListeners() {
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

    ui.DOMElements.serverSelect.addEventListener('change', (e) => handleServerSelection(e.target.value));
    
    ui.DOMElements.addServerBtn.addEventListener('click', () => {
        state.isEditingServer = false;
        ui.toggleServerModal(true, false);
    });

    ui.DOMElements.editServerBtn.addEventListener('click', () => {
        state.isEditingServer = true;
        const server = state.servers[state.activeServerId];
        // Adicionada a verificação para garantir que o servidor existe antes de editar
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
}

function initialize() {
    state.servers = storage.getServers();
    state.activeServerId = storage.getActiveServerId();

    if (state.activeServerId !== null && !state.servers[state.activeServerId]) {
        state.activeServerId = state.servers.length > 0 ? 0 : null;
        storage.setActiveServerId(state.activeServerId);
    }
    
    ui.hideAllModals();
    
    websocket.configure({
        onOpen: () => {
            const server = state.servers[state.activeServerId];
            ui.updateConnectionStatus('Conectado');
            ui.addMessageToLog(`Conectado a ${server.name}.`, 'system-message');
            ui.showToast('Conectado com sucesso!', 'success');
            updateUI();
        },
        onMessage: (data) => ui.addMessageToLog(data, 'data-message'),
        onClose: (event) => {
            ui.updateConnectionStatus('Desconectado');
            ui.addMessageToLog(`Conexão fechada. Código: ${event.code}`, 'system-message');
            updateUI();
        },
        onError: (error) => {
            ui.updateConnectionStatus('Erro');
            ui.addMessageToLog(error, 'error-message');
            ui.showToast('Erro na conexão.', 'error');
            updateUI();
        },
    });

    setupEventListeners();
    updateUI();
}

document.addEventListener('DOMContentLoaded', initialize);