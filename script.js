document.addEventListener('DOMContentLoaded', () => {
    // --- Referências aos Elementos DOM ---
    const connectionStatus = document.getElementById('connection-status');
    const messagesDiv = document.getElementById('messages');
    const clearLogBtn = document.getElementById('clear-log-btn');
    const toastContainer = document.getElementById('toast-container');

    // Elementos de Gerenciamento de Servidores
    const serverSelect = document.getElementById('server-select'); // Dropdown de seleção de servidor
    const addServerBtn = document.getElementById('add-server-btn'); // Botão para adicionar novo servidor
    const editServerBtn = document.getElementById('edit-server-btn'); // Botão para editar servidor
    const deleteServerBtn = document.getElementById('delete-server-btn'); // Botão para excluir servidor

    // Elementos do Modal de Servidor
    const serverModal = document.getElementById('server-modal');
    const modalTitle = document.getElementById('modal-title');
    const closeButton = serverModal.querySelector('.close-button');
    const serverNameInput = document.getElementById('server-name-input');
    const serverUrlInput = document.getElementById('server-url-input');
    const saveServerDetailsBtn = document.getElementById('save-server-details-btn');
    const cancelServerDetailsBtn = document.getElementById('cancel-server-details-btn');

    // Botão principal de Conectar/Desconectar
    const toggleConnectionBtn = document.getElementById('toggle-connection-btn');

    // --- Variáveis de Estado da Aplicação ---
    // Array para armazenar todos os servidores configurados, carregados do localStorage.
    // Se não houver dados, inicializa como um array vazio.
    let servers = JSON.parse(localStorage.getItem('websocketServers')) || [];
    // ID (índice) do servidor atualmente selecionado/ativo, carregado do localStorage.
    // Se não houver, inicializa como null.
    let activeServerId = localStorage.getItem('activeServerId') !== null ? parseInt(localStorage.getItem('activeServerId'), 10) : null;

    let ws = null; // Instância do objeto WebSocket
    let reconnectInterval = null; // ID do intervalo para tentativas de reconexão automática
    let isManuallyDisconnected = false; // Flag para controlar desconexões manuais vs. automáticas

    // Variável para controlar se o modal está em modo de edição ou adição
    let isEditingServer = false;

    // --- Inicialização ---
    // Popula o dropdown com os servidores salvos e tenta selecionar o último ativo.
    populateServerSelect();
    // Garante que o servidor correto esteja selecionado no dropdown e atualiza a UI.
    if (activeServerId !== null && servers[activeServerId]) {
        serverSelect.value = activeServerId;
    } else if (servers.length > 0) {
        // Se o activeServerId for inválido ou não existir, seleciona o primeiro servidor.
        activeServerId = 0;
        serverSelect.value = 0;
        localStorage.setItem('activeServerId', activeServerId);
    } else {
        // Se não houver servidores, garante que activeServerId seja null.
        activeServerId = null;
        localStorage.removeItem('activeServerId');
    }
    updateButtonState(); // Define o estado inicial do botão de conectar/desconectar e dos botões de gerenciamento.

    // --- Funções Auxiliares ---

    /**
     * Atualiza o texto, a classe e o estado de habilitação do botão de conexão
     * com base no estado atual do WebSocket. Também gerencia o estado dos botões
     * de edição e exclusão de servidor.
     */
    function updateButtonState() {
        const hasServers = servers.length > 0;
        const selectedServerExists = activeServerId !== null && servers[activeServerId];

        // Gerencia o botão principal de Conectar/Desconectar
        if (!ws || ws.readyState === WebSocket.CLOSED) {
            toggleConnectionBtn.textContent = 'Conectar';
            toggleConnectionBtn.className = 'btn-connect';
            // Só habilita o botão de conectar se houver um servidor selecionado
            toggleConnectionBtn.disabled = !selectedServerExists;
        } else if (ws.readyState === WebSocket.OPEN) {
            toggleConnectionBtn.textContent = 'Desconectar';
            toggleConnectionBtn.className = 'btn-disconnect';
            toggleConnectionBtn.disabled = false;
        } else if (ws.readyState === WebSocket.CONNECTING) {
            toggleConnectionBtn.textContent = 'Conectando...';
            toggleConnectionBtn.className = 'btn-connect';
            toggleConnectionBtn.disabled = true; // Desabilita enquanto tenta conectar
        }

        // Gerencia os botões de edição e exclusão de servidor
        editServerBtn.disabled = !selectedServerExists;
        deleteServerBtn.disabled = !selectedServerExists;
    }

    /**
     * Adiciona uma mensagem ao log de dados na interface.
     * Suporta mensagens de sistema, erro e dados formatados.
     * Limita o número de mensagens para evitar sobrecarga da DOM.
     * @param {string|object} message O conteúdo da mensagem a ser exibida. Pode ser uma string ou um objeto JSON.
     * @param {string} className Classe CSS adicional para estilização da mensagem (ex: 'system-message', 'error-message', 'data-message').
     */
    function addMessageToLog(message, className = '') {
        const messageContainer = document.createElement('div');
        messageContainer.className = `message-entry ${className}`;

        if (className === 'data-message' && typeof message === 'object') {
            // Formata objetos JSON para exibição mais legível
            const timestamp = message.ts ? new Date(message.ts).toLocaleString() : 'N/A';
            const dataList = document.createElement('ul');
            dataList.className = 'data-list';

            const tsItem = document.createElement('li');
            tsItem.innerHTML = `<strong>Timestamp:</strong> <span class="timestamp-value">${timestamp}</span>`;
            dataList.appendChild(tsItem);

            for (const key in message) {
                if (key !== 'ts' && message.hasOwnProperty(key)) {
                    const listItem = document.createElement('li');
                    let value = message[key];

                    // Adiciona unidades para valores específicos, se aplicável
                    if (key === 'temperatura') value += ' °C';
                    else if (key === 'umidade') value += ' %';
                    else if (key === 'nivel') value += ' m';

                    listItem.innerHTML = `<strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> <span class="data-value">${value}</span>`;
                    dataList.appendChild(listItem);
                }
            }
            messageContainer.appendChild(dataList);
        } else {
            // Exibe mensagens de sistema/erro como texto simples
            const preElement = document.createElement('pre');
            preElement.textContent = message;
            messageContainer.appendChild(preElement);
        }

        messagesDiv.prepend(messageContainer); // Adiciona a mensagem no topo do log

        // Limita o número de mensagens no log para manter a performance
        const maxMessages = 50;
        while (messagesDiv.children.length > maxMessages) {
            messagesDiv.removeChild(messagesDiv.lastChild);
        }
    }

    /**
     * Exibe uma notificação de "toast" no canto superior direito da tela.
     * @param {string} message O texto da notificação.
     * @param {'success'|'error'|'info'} type O tipo da notificação para estilização (cor).
     */
    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        // Remove o toast após um tempo e após a transição de fade-out
        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    /**
     * Valida se uma string é uma URL de WebSocket válida.
     * Utiliza uma expressão regular para verificar o formato `ws://` ou `wss://`.
     * @param {string} url A URL a ser validada.
     * @returns {boolean} True se a URL for válida, false caso contrário.
     */
    function isValidWebSocketUrl(url) {
        // Regex para validar URLs WebSocket (ws:// ou wss:// seguido de hostname/IP e porta opcional)
        const urlRegex = /^(ws|wss):\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/;
        return urlRegex.test(url);
    }

    // --- Funções de Gerenciamento de Servidores ---

    /**
     * Carrega os servidores do localStorage e preenche o dropdown `#server-select`.
     * Atualiza o `localStorage` e o estado dos botões de gerenciamento.
     */
    function populateServerSelect() {
        serverSelect.innerHTML = ''; // Limpa as opções existentes

        if (servers.length === 0) {
            // Adiciona uma opção padrão se não houver servidores configurados
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'Nenhum servidor configurado';
            serverSelect.appendChild(option);
            serverSelect.disabled = true; // Desabilita o dropdown
            activeServerId = null; // Garante que não há servidor ativo
            localStorage.removeItem('activeServerId'); // Remove do localStorage
        } else {
            serverSelect.disabled = false;
            servers.forEach((server, index) => {
                const option = document.createElement('option');
                option.value = index; // Usamos o índice como ID para o dropdown
                option.textContent = server.name;
                serverSelect.appendChild(option);
            });

            // Tenta selecionar o servidor ativo salvo. Se não existir, seleciona o primeiro.
            if (activeServerId === null || !servers[activeServerId]) {
                activeServerId = 0;
                serverSelect.value = 0;
            } else {
                serverSelect.value = activeServerId;
            }
            localStorage.setItem('activeServerId', activeServerId);
        }
        // Persiste a lista atualizada de servidores no localStorage
        localStorage.setItem('websocketServers', JSON.stringify(servers));
        updateButtonState(); // Atualiza o estado dos botões (editar/excluir)
    }

    /**
     * Seleciona um servidor como ativo e atualiza a conexão WebSocket se necessário.
     * @param {string} idString O valor (índice) do servidor selecionado no dropdown.
     */
    function selectServer(idString) {
        const newActiveId = parseInt(idString, 10);

        // Verifica se o ID é válido e se o servidor existe na lista
        if (isNaN(newActiveId) || newActiveId < 0 || newActiveId >= servers.length) {
            if (servers.length > 0) {
                // Se o ID for inválido, tenta selecionar o primeiro servidor disponível
                activeServerId = 0;
                serverSelect.value = 0;
                showToast('Seleção de servidor inválida. Selecionando o primeiro disponível.', 'info');
            } else {
                // Não há servidores para selecionar
                activeServerId = null;
                disconnectWebSocket(); // Garante que nenhuma conexão esteja ativa
                updateButtonState();
                return;
            }
        } else {
            activeServerId = newActiveId;
        }

        localStorage.setItem('activeServerId', activeServerId);
        addMessageToLog(`Servidor selecionado: ${servers[activeServerId].name}`, 'system-message');

        // Se já estiver conectado, desconecta e reconecta ao novo servidor para aplicar a mudança
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            disconnectWebSocket(); // Desconecta a conexão atual
            // Pequeno delay para permitir que a conexão anterior seja totalmente fechada
            setTimeout(() => {
                connectWebSocket(); // Tenta conectar ao novo servidor
            }, 500);
        }
        updateButtonState();
    }

    /**
     * Abre o modal para adicionar um novo servidor.
     * Limpa os campos e define o modo de adição.
     */
    function openAddServerModal() {
        isEditingServer = false;
        modalTitle.textContent = 'Adicionar Novo Servidor';
        serverNameInput.value = '';
        serverUrlInput.value = '';
        serverModal.style.display = 'flex'; // Exibe o modal
    }

    /**
     * Abre o modal para editar o servidor atualmente selecionado.
     * Preenche os campos com os dados do servidor selecionado e define o modo de edição.
     */
    function openEditServerModal() {
        if (activeServerId !== null && servers[activeServerId]) {
            isEditingServer = true;
            modalTitle.textContent = 'Editar Servidor';
            serverNameInput.value = servers[activeServerId].name;
            serverUrlInput.value = servers[activeServerId].url;
            serverModal.style.display = 'flex'; // Exibe o modal
        } else {
            showToast('Nenhum servidor selecionado para editar.', 'info');
        }
    }

    /**
     * Salva os detalhes do servidor (adiciona novo ou edita existente).
     * Realiza validação dos inputs e atualiza o `servers` array e `localStorage`.
     */
    function saveServerDetails() {
        const name = serverNameInput.value.trim();
        const url = serverUrlInput.value.trim();

        if (!name) {
            showToast('O nome do servidor não pode ser vazio.', 'error');
            return;
        }
        if (!isValidWebSocketUrl(url)) {
            showToast('URL do WebSocket inválida. Deve começar com ws:// ou wss:// e ser um formato válido.', 'error');
            return;
        }

        if (isEditingServer) {
            // Atualiza o servidor existente na array
            servers[activeServerId].name = name;
            servers[activeServerId].url = url;
            showToast(`Servidor "${name}" atualizado.`, 'success');
            addMessageToLog(`Servidor "${name}" atualizado.`, 'system-message');
        } else {
            // Adiciona um novo servidor ao final da array
            servers.push({ name, url });
            showToast(`Servidor "${name}" adicionado.`, 'success');
            addMessageToLog(`Servidor "${name}" adicionado.`, 'system-message');
        }

        populateServerSelect(); // Atualiza o dropdown e o localStorage
        if (!isEditingServer) {
            // Se um novo servidor foi adicionado, seleciona-o automaticamente
            selectServer(servers.length - 1);
        } else {
            // Se o servidor ativo foi editado, reconecta para usar a nova URL/nome
            selectServer(activeServerId);
        }
        serverModal.style.display = 'none'; // Fecha o modal
    }

    /**
     * Exclui o servidor atualmente selecionado.
     * Solicita confirmação ao usuário antes de realizar a exclusão.
     */
    function deleteSelectedServer() {
        if (activeServerId !== null && servers[activeServerId]) {
            const serverName = servers[activeServerId].name;
            // Confirmação para evitar exclusões acidentais
            if (confirm(`Tem certeza que deseja excluir o servidor "${serverName}"?`)) {
                // Desconecta se o servidor a ser excluído estiver ativo
                if (ws && ws.readyState === WebSocket.OPEN && serverSelect.value == activeServerId) {
                    disconnectWebSocket();
                }

                servers.splice(activeServerId, 1); // Remove o servidor da array
                showToast(`Servidor "${serverName}" excluído.`, 'info');
                addMessageToLog(`Servidor "${serverName}" excluído.`, 'system-message');

                // Ajusta o activeServerId se o servidor excluído era o ativo ou se a lista ficou vazia
                if (activeServerId >= servers.length) {
                    activeServerId = servers.length > 0 ? servers.length - 1 : null;
                }
                populateServerSelect(); // Atualiza o dropdown e o localStorage
                selectServer(activeServerId); // Seleciona o novo servidor ativo (ou nenhum)
            }
        } else {
            showToast('Nenhum servidor selecionado para excluir.', 'info');
        }
    }

    // --- Funções de Conexão WebSocket ---

    /**
     * Inicia a conexão WebSocket com o servidor ativo.
     * Gerencia estados de conexão e tenta reconectar automaticamente em caso de desconexão inesperada.
     */
    function connectWebSocket() {
        // Limpa qualquer intervalo de reconexão anterior para evitar múltiplas tentativas
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        // Evita tentar conectar se já estiver conectado ou em processo de conexão
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket já está conectado ou conectando.');
            showToast('Já conectado ou conectando.', 'info');
            return;
        }

        // Verifica se há um servidor válido selecionado para conectar
        if (activeServerId === null || !servers[activeServerId]) {
            showToast('Nenhum servidor selecionado ou configurado para conectar.', 'error');
            addMessageToLog('Falha na conexão: Nenhum servidor selecionado.', 'error-message');
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'disconnected';
            updateButtonState();
            return;
        }

        const serverToConnect = servers[activeServerId];
        isManuallyDisconnected = false; // Reseta a flag de desconexão manual
        updateButtonState(); // Atualiza o estado do botão para "Conectando..."

        console.log(`Tentando conectar ao WebSocket em: ${serverToConnect.url}`);
        connectionStatus.textContent = 'Conectando...';
        connectionStatus.className = 'connecting';

        // Cria uma nova instância de WebSocket
        ws = new WebSocket(serverToConnect.url);

        // Evento de abertura da conexão
        ws.onopen = () => {
            console.log('Conexão WebSocket estabelecida!');
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'connected';
            clearInterval(reconnectInterval); // Limpa o intervalo de reconexão se a conexão for bem-sucedida
            reconnectInterval = null;
            addMessageToLog(`Conexão estabelecida com ${serverToConnect.name}.`, 'system-message');
            showToast('Conectado com sucesso!', 'success');
            updateButtonState();
        };

        // Evento de recebimento de mensagem
        ws.onmessage = (event) => {
            console.log('Mensagem recebida:', event.data);
            try {
                // Tenta fazer o parse da mensagem como JSON
                const data = JSON.parse(event.data);
                addMessageToLog(data, 'data-message');
            } catch (e) {
                // Se não for JSON válido, exibe como texto simples com erro
                console.error('Erro ao parsear JSON:', e);
                addMessageToLog(`Erro ao parsear mensagem: ${event.data}`, 'error-message');
                showToast('Erro ao processar dados recebidos.', 'error');
            }
        };

        // Evento de fechamento da conexão
        ws.onclose = (event) => {
            console.warn('Conexão WebSocket fechada:', event);
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'disconnected';
            addMessageToLog(`Conexão fechada. Código: ${event.code}, Razão: ${event.reason || 'N/A'}.`, 'system-message');
            updateButtonState();

            // Tenta reconectar automaticamente apenas se não foi uma desconexão manual
            // e se ainda não há um intervalo de reconexão ativo
            if (!isManuallyDisconnected && !reconnectInterval) {
                showToast('Conexão perdida. Tentando reconectar...', 'error');
                reconnectInterval = setInterval(() => {
                    console.log('Tentando reconectar automaticamente...');
                    connectWebSocket();
                }, 5000);
            }
        };

        // Evento de erro na conexão
        ws.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            connectionStatus.textContent = 'Erro';
            connectionStatus.className = 'error';
            addMessageToLog('Ocorreu um erro na conexão WebSocket.', 'error-message');
            showToast('Erro na conexão WebSocket.', 'error');
            updateButtonState();
        };
    }

    /**
     * Desconecta o WebSocket manualmente.
     * Impede tentativas de reconexão automática após a desconexão manual.
     */
    function disconnectWebSocket() {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('Desconectando WebSocket manualmente...');
            isManuallyDisconnected = true; // Define a flag para evitar reconexão automática
            clearInterval(reconnectInterval); // Limpa qualquer intervalo de reconexão pendente
            reconnectInterval = null;
            ws.close(); // Fecha a conexão WebSocket
            addMessageToLog('Desconectado manualmente.', 'system-message');
            showToast('Desconectado.', 'info');
            updateButtonState();
        }
    }

    // --- Listeners de Eventos ---

    // Listener para o botão principal de conectar/desconectar
    toggleConnectionBtn.addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            disconnectWebSocket();
        } else {
            connectWebSocket();
        }
    });

    // Listener para o botão Limpar Log
    clearLogBtn.addEventListener('click', () => {
        messagesDiv.innerHTML = ''; // Limpa todo o conteúdo do log
        addMessageToLog('Log de mensagens limpo.', 'system-message');
        showToast('Log limpo com sucesso!', 'info');
    });

    // Listener para o dropdown de seleção de servidor
    serverSelect.addEventListener('change', (event) => {
        selectServer(event.target.value);
    });

    // Listener para o botão "Adicionar Novo Servidor"
    addServerBtn.addEventListener('click', openAddServerModal);

    // Listener para o botão "Editar Servidor"
    editServerBtn.addEventListener('click', openEditServerModal);

    // Listener para o botão "Excluir Servidor"
    deleteServerBtn.addEventListener('click', deleteSelectedServer);

    // Listener para o botão "Salvar Servidor" dentro do modal
    saveServerDetailsBtn.addEventListener('click', saveServerDetails);

    // Listener para o botão "Cancelar" dentro do modal
    cancelServerDetailsBtn.addEventListener('click', () => {
        serverModal.style.display = 'none'; // Fecha o modal
    });

    // Listener para fechar o modal clicando no 'x'
    closeButton.addEventListener('click', () => {
        serverModal.style.display = 'none';
    });

    // Listener para fechar o modal clicando fora dele
    window.addEventListener('click', (event) => {
        if (event.target === serverModal) {
            serverModal.style.display = 'none';
        }
    });
});