// js/ui.js

// Referências aos elementos DOM
export const DOMElements = {
    // Elementos globais que estão sempre presentes no index.html
    mainContent: document.getElementById('main-content'), // NOVO: Área principal de conteúdo
    toastContainer: document.getElementById('toast-container'),
    toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
    sidebar: document.getElementById('sidebar'),
    closeSidebarBtn: document.getElementById('close-sidebar-btn'),
    sidebarOverlay: document.getElementById('sidebar-overlay'),

    // Modais (também globais e sempre presentes)
    serverModal: document.getElementById('server-modal'),
    modalTitle: document.getElementById('modal-title'),
    serverNameInput: document.getElementById('server-name-input'),
    serverUrlInput: document.getElementById('server-url-input'),
    saveServerDetailsBtn: document.getElementById('save-server-details-btn'),
    cancelServerDetailsBtn: document.getElementById('cancel-server-details-btn'),
    confirmDeleteModal: document.getElementById('confirm-delete-modal'),
    serverToDeleteName: document.getElementById('server-to-delete-name'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    closeButtons: document.querySelectorAll('.close-button'),

    // Elementos específicos do Dashboard (serão carregados dinamicamente)
    // Inicialmente nulos, serão atualizados após o carregamento da vista 'dashboard'
    connectionStatus: null,
    messagesDiv: null,
    clearLogBtn: null,
    exportLogBtn: null,
    exportFormatSelect: null,
    filterInput: null,
    searchBtn: null,
    serverSelect: null,
    addServerBtn: null,
    editServerBtn: null,
    deleteServerBtn: null,
    toggleConnectionBtn: null,
};

// NOVA FUNÇÃO: Atualiza as referências dos elementos DOM específicos do dashboard
export function updateDashboardDOMElements() {
    DOMElements.connectionStatus = document.getElementById('connection-status');
    DOMElements.messagesDiv = document.getElementById('messages');
    DOMElements.clearLogBtn = document.getElementById('clear-log-btn');
    DOMElements.exportLogBtn = document.getElementById('export-log-btn');
    DOMElements.exportFormatSelect = document.getElementById('export-format-select');
    DOMElements.filterInput = document.getElementById('filter-input');
    DOMElements.searchBtn = document.getElementById('search-btn');
    DOMElements.serverSelect = document.getElementById('server-select');
    DOMElements.addServerBtn = document.getElementById('add-server-btn');
    DOMElements.editServerBtn = document.getElementById('edit-server-btn');
    DOMElements.deleteServerBtn = document.getElementById('delete-server-btn');
    DOMElements.toggleConnectionBtn = document.getElementById('toggle-connection-btn');
}

// As funções existentes (updateConnectionStatus, updateButtonState, etc.)
// precisarão de verificações para garantir que os elementos existam antes de tentar manipulá-los.

export function updateConnectionStatus(status) {
    if (DOMElements.connectionStatus) { // Verifica se o elemento existe
        DOMElements.connectionStatus.textContent = status;
        let statusClass = 'disconnected';
        if (status === 'Conectado') statusClass = 'connected';
        if (status === 'Conectando...') statusClass = 'connecting';
        if (status === 'Erro') statusClass = 'error';
        DOMElements.connectionStatus.className = statusClass;
    }
}

export function updateButtonState(connectionState, hasSelectedServer) {
    if (DOMElements.toggleConnectionBtn) { // Verifica se o elemento existe
        if (connectionState === 'closed') {
            DOMElements.toggleConnectionBtn.textContent = 'Conectar';
            DOMElements.toggleConnectionBtn.className = 'btn-connect';
            DOMElements.toggleConnectionBtn.disabled = !hasSelectedServer;
        } else if (connectionState === 'open') {
            DOMElements.toggleConnectionBtn.textContent = 'Desconectar';
            DOMElements.toggleConnectionBtn.className = 'btn-disconnect';
            DOMElements.toggleConnectionBtn.disabled = false;
        } else if (connectionState === 'connecting') {
            DOMElements.toggleConnectionBtn.textContent = 'Conectando...';
            DOMElements.toggleConnectionBtn.className = 'btn-connect';
            DOMElements.toggleConnectionBtn.disabled = true;
        }
    }
    if (DOMElements.editServerBtn) DOMElements.editServerBtn.disabled = !hasSelectedServer;
    if (DOMElements.deleteServerBtn) DOMElements.deleteServerBtn.disabled = !hasSelectedServer;
}

export function addMessageToLog(message, className = '') {
    if (!DOMElements.messagesDiv) return; // Verifica se o elemento existe

    const messageContainer = document.createElement('div');
    messageContainer.className = `message-entry ${className}`;

    if (className === 'data-message' && typeof message === 'object') {
        const timestamp = message.ts ? new Date(message.ts).toLocaleString() : 'N/A';
        const dataList = document.createElement('ul');
        dataList.className = 'data-list';

        const tsItem = document.createElement('li');
        tsItem.innerHTML = `<strong>Timestamp:</strong> <span class="timestamp-value">${timestamp}</span>`;
        dataList.appendChild(tsItem);

        for (const key in message) {
            if (key !== 'ts' && Object.prototype.hasOwnProperty.call(message, key)) {
                const listItem = document.createElement('li');
                listItem.innerHTML = `<strong>${key}:</strong> <span class="data-value">${message[key]}</span>`;
                dataList.appendChild(listItem);
            }
        }
        messageContainer.appendChild(dataList);
    } else {
        const preElement = document.createElement('pre');
        preElement.textContent = message;
        messageContainer.appendChild(preElement);
    }

    DOMElements.messagesDiv.prepend(messageContainer);

    const maxMessages = 50;
    while (DOMElements.messagesDiv.children.length > maxMessages) {
        DOMElements.messagesDiv.removeChild(DOMElements.messagesDiv.lastChild);
    }
}

export function showToast(message, type) {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    DOMElements.toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000);
}

export function populateServerSelect(servers, activeServerId) {
    if (!DOMElements.serverSelect) return; // Verifica se o elemento existe
    DOMElements.serverSelect.innerHTML = '';
    if (servers.length === 0) {
        const option = document.createElement('option');
        option.textContent = 'Nenhum servidor configurado';
        DOMElements.serverSelect.appendChild(option);
        DOMElements.serverSelect.disabled = true;
    } else {
        DOMElements.serverSelect.disabled = false;
        servers.forEach((server, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = server.name;
            DOMElements.serverSelect.appendChild(option);
        });
        if (activeServerId !== null) {
            DOMElements.serverSelect.value = activeServerId;
        }
    }
}

export function toggleServerModal(show, isEditing = false, server = null) {
    if (show) {
        DOMElements.modalTitle.textContent = isEditing ? 'Editar Servidor' : 'Adicionar Novo Servidor';
        DOMElements.serverNameInput.value = isEditing && server ? server.name : '';
        DOMElements.serverUrlInput.value = isEditing && server ? server.url : '';
        DOMElements.serverModal.style.display = 'flex';
    } else {
        DOMElements.serverModal.style.display = 'none';
    }
}

export function toggleConfirmDeleteModal(show, serverName = '') {
    if (show) {
        DOMElements.serverToDeleteName.textContent = serverName;
        DOMElements.confirmDeleteModal.style.display = 'flex';
    } else {
        DOMElements.confirmDeleteModal.style.display = 'none';
    }
}

export function hideAllModals() {
    DOMElements.serverModal.style.display = 'none';
    DOMElements.confirmDeleteModal.style.display = 'none';
}

export function getLogData() {
    if (!DOMElements.messagesDiv) return []; // Verifica se o elemento existe
    const logEntries = Array.from(DOMElements.messagesDiv.children);
    const logData = logEntries.map(entry => {
        if (entry.classList.contains('data-message')) {
            const data = {};
            const items = entry.querySelectorAll('.data-list li');
            items.forEach(item => {
                const keyElement = item.querySelector('strong');
                const valueElement = item.querySelector('span');
                if (keyElement && valueElement) {
                    const key = keyElement.textContent.replace(':', '').trim();
                    const value = valueElement.textContent;
                    data[key] = value;
                }
            });
            return data;
        }
        return null;
    }).filter(item => item !== null);

    return logData.reverse();
}

export function filterLog(searchText) {
    if (!DOMElements.messagesDiv) return; // Verifica se o elemento existe
    const messages = DOMElements.messagesDiv.querySelectorAll('.message-entry');
    const lowerCaseSearchText = searchText.toLowerCase();
    
    if (lowerCaseSearchText === '') {
        messages.forEach(message => message.style.display = '');
    } else {
        messages.forEach(message => {
            const textContent = message.textContent.toLowerCase();
            if (textContent.includes(lowerCaseSearchText)) {
                message.style.display = '';
            } else {
                message.style.display = 'none';
            }
        });
    }
}

export function toggleSidebar(show) {
    if (show) {
        DOMElements.sidebar.classList.add('open');
        DOMElements.sidebarOverlay.classList.add('active');
    } else {
        DOMElements.sidebar.classList.remove('open');
        DOMElements.sidebarOverlay.classList.remove('active');
    }
}

// NOVA FUNÇÃO: Carrega uma vista (página) no main-content
export async function loadView(viewName) {
    try {
        const response = await fetch(`views/${viewName}.html`);
        if (!response.ok) {
            throw new Error(`Falha ao carregar a vista: ${response.statusText}`);
        }
        const html = await response.text();
        DOMElements.mainContent.innerHTML = html;

        // Após carregar uma vista, atualiza as referências dos elementos DOM específicos do dashboard
        if (viewName === 'dashboard') {
            updateDashboardDOMElements();
        } else {
            // Limpa as referências específicas do dashboard se não estiver na vista do dashboard
            DOMElements.connectionStatus = null;
            DOMElements.messagesDiv = null;
            DOMElements.clearLogBtn = null;
            DOMElements.exportLogBtn = null;
            DOMElements.exportFormatSelect = null;
            DOMElements.filterInput = null;
            DOMElements.searchBtn = null;
            DOMElements.serverSelect = null;
            DOMElements.addServerBtn = null;
            DOMElements.editServerBtn = null;
            DOMElements.deleteServerBtn = null;
            DOMElements.toggleConnectionBtn = null;
        }
        return true; // Indica sucesso
    } catch (error) {
        console.error('Erro ao carregar a vista:', error);
        showToast(`Erro ao carregar a página: ${viewName}.`, 'error');
        // Exibe uma mensagem de erro na área principal
        DOMElements.mainContent.innerHTML = `<div class="container"><h1>Erro ao carregar a página</h1><p>${error.message}</p></div>`;
        return false; // Indica falha
    }
}