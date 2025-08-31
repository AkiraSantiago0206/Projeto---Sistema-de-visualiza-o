// js/ui.js

// Referências aos elementos DOM
export const DOMElements = {
    connectionStatus: document.getElementById('connection-status'),
    messagesDiv: document.getElementById('messages'),
    clearLogBtn: document.getElementById('clear-log-btn'),
    toastContainer: document.getElementById('toast-container'),
    serverSelect: document.getElementById('server-select'),
    addServerBtn: document.getElementById('add-server-btn'),
    editServerBtn: document.getElementById('edit-server-btn'),
    deleteServerBtn: document.getElementById('delete-server-btn'),
    toggleConnectionBtn: document.getElementById('toggle-connection-btn'),
    
    // Modal de Adicionar/Editar
    serverModal: document.getElementById('server-modal'),
    modalTitle: document.getElementById('modal-title'),
    serverNameInput: document.getElementById('server-name-input'),
    serverUrlInput: document.getElementById('server-url-input'),
    saveServerDetailsBtn: document.getElementById('save-server-details-btn'),
    cancelServerDetailsBtn: document.getElementById('cancel-server-details-btn'),
    
    // Modal de Confirmação de Exclusão
    confirmDeleteModal: document.getElementById('confirm-delete-modal'),
    serverToDeleteName: document.getElementById('server-to-delete-name'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    
    // Botões de fechar modais
    closeButtons: document.querySelectorAll('.close-button'),
};

export function updateConnectionStatus(status) {
    DOMElements.connectionStatus.textContent = status;
    let statusClass = 'disconnected';
    if (status === 'Conectado') statusClass = 'connected';
    if (status === 'Conectando...') statusClass = 'connecting';
    if (status === 'Erro') statusClass = 'error';
    DOMElements.connectionStatus.className = statusClass;
}

export function updateButtonState(connectionState, hasSelectedServer) {
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

    DOMElements.editServerBtn.disabled = !hasSelectedServer;
    DOMElements.deleteServerBtn.disabled = !hasSelectedServer;
}


export function addMessageToLog(message, className = '') {
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