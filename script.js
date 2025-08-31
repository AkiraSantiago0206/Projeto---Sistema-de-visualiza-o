document.addEventListener('DOMContentLoaded', () => {
    // --- Referências aos Elementos DOM ---
    const connectionStatus = document.getElementById('connection-status'); // Exibe o status atual da conexão (conectado/desconectado)
    const messagesDiv = document.getElementById('messages');             // Área onde as mensagens do WebSocket são exibidas
    const clearLogBtn = document.getElementById('clear-log-btn');       // Botão para limpar o histórico de mensagens
    const toastContainer = document.getElementById('toast-container'); // Contêiner para exibir notificações de toast

    // Elementos do Modal de Configurações
    const openSettingsBtn = document.getElementById('open-settings-btn'); // Botão para abrir o modal de configurações
    const settingsModal = document.getElementById('settings-modal');     // O modal em si
    const closeButton = document.querySelector('.close-button');         // Botão para fechar o modal

    // Elementos dentro do Modal (apenas o input de URL e o botão de salvar)
    const websocketUrlInput = document.getElementById('websocket-url'); // Campo de entrada para a URL do WebSocket
    const saveSettingsBtn = document.getElementById('save-settings-btn'); // Botão para salvar as configurações de URL

    // NOVO: O botão de conectar/desconectar agora é referenciado diretamente da página principal
    const toggleConnectionBtn = document.getElementById('toggle-connection-btn'); // Botão principal de conexão/desconexão

    // --- Variáveis de Estado da Aplicação ---
    const DEFAULT_WEBSOCKET_URL = 'ws://localhost:1880/ws/dashboard'; // URL padrão do WebSocket
    // Carrega a URL salva no localStorage ou usa a padrão
    let currentWebsocketUrl = localStorage.getItem('websocketUrl') || DEFAULT_WEBSOCKET_URL;

    let ws = null; // Instância do objeto WebSocket
    let reconnectInterval = null; // ID do intervalo para tentativas de reconexão automática
    let isManuallyDisconnected = false; // Flag para controlar desconexões manuais vs. automáticas

    // --- Inicialização ---
    websocketUrlInput.value = currentWebsocketUrl; // Define o valor inicial do input da URL
    updateButtonState(); // Atualiza o texto e o estilo do botão de conexão com base no estado inicial

    // --- Funções Auxiliares ---

    /**
     * Atualiza o texto, a classe e o estado de habilitação do botão de conexão
     * com base no estado atual do WebSocket.
     */
    function updateButtonState() {
        if (!ws || ws.readyState === WebSocket.CLOSED) {
            toggleConnectionBtn.textContent = 'Conectar';
            toggleConnectionBtn.className = 'btn-connect';
            toggleConnectionBtn.disabled = false;
        } else if (ws.readyState === WebSocket.OPEN) {
            toggleConnectionBtn.textContent = 'Desconectar';
            toggleConnectionBtn.className = 'btn-disconnect';
            toggleConnectionBtn.disabled = false;
        } else if (ws.readyState === WebSocket.CONNECTING) {
            toggleConnectionBtn.textContent = 'Conectando...';
            toggleConnectionBtn.className = 'btn-connect'; // Mantém a cor de "conectar" durante o processo
            toggleConnectionBtn.disabled = true; // Desabilita o botão enquanto tenta conectar
        }
    }

    /**
     * Adiciona uma mensagem ao log de dados na interface.
     * Suporta mensagens de sistema, erro e dados formatados.
     * @param {string|object} message O conteúdo da mensagem a ser exibida. Pode ser uma string ou um objeto JSON.
     * @param {string} className Classe CSS adicional para estilização da mensagem (ex: 'system-message', 'error-message', 'data-message').
     */
    function addMessageToLog(message, className = '') {
        const messageContainer = document.createElement('div');
        messageContainer.className = `message-entry ${className}`;

        // Se for uma mensagem de dados e um objeto, formata como lista
        if (className === 'data-message' && typeof message === 'object') {
            const timestamp = message.ts ? new Date(message.ts).toLocaleString() : 'N/A';
            const dataList = document.createElement('ul');
            dataList.className = 'data-list';

            // Adiciona o timestamp como primeiro item da lista
            const tsItem = document.createElement('li');
            tsItem.innerHTML = `<strong>Timestamp:</strong> <span class="timestamp-value">${timestamp}</span>`;
            dataList.appendChild(tsItem);

            // Itera sobre as propriedades do objeto (exceto 'ts') para exibi-las
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
            // Para outras mensagens (sistema, erro, texto puro), exibe como texto pré-formatado
            const preElement = document.createElement('pre');
            preElement.textContent = message;
            messageContainer.appendChild(preElement);
        }

        messagesDiv.prepend(messageContainer); // Adiciona a mensagem no topo do log

        // Limita o número de mensagens no log para evitar sobrecarga da DOM e melhorar performance
        if (messagesDiv.children.length > 50) {
            messagesDiv.removeChild(messagesDiv.lastChild); // Remove a mensagem mais antiga
        }
    }

    /**
     * Exibe uma notificação de "toast" no canto superior direito da tela.
     * @param {string} message O texto da notificação.
     * @param {'success'|'error'|'info'} type O tipo da notificação para estilização.
     */
    function showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);

        // Remove o toast após um tempo e quando a transição de ocultação termina
        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }

    /**
     * Valida se uma string é uma URL de WebSocket válida.
     * @param {string} url A URL a ser validada.
     * @returns {boolean} True se a URL for válida, false caso contrário.
     */
    function isValidWebSocketUrl(url) {
        // Regex para validar URLs ws:// ou wss:// com hostname, porta opcional e path
        const urlRegex = /^(ws|wss):\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/;
        return urlRegex.test(url);
    }

    // --- Funções de Conexão WebSocket ---

    /**
     * Inicia a conexão WebSocket com a URL configurada.
     * Gerencia o estado de reconexão automática.
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
            return;
        }

        isManuallyDisconnected = false; // Reseta a flag de desconexão manual
        updateButtonState(); // Atualiza o botão para "Conectando..."

        console.log(`Tentando conectar ao WebSocket em: ${currentWebsocketUrl}`);
        connectionStatus.textContent = 'Conectando...';
        connectionStatus.className = 'connecting';

        ws = new WebSocket(currentWebsocketUrl); // Cria uma nova instância do WebSocket

        // Evento disparado quando a conexão é estabelecida com sucesso
        ws.onopen = () => {
            console.log('Conexão WebSocket estabelecida!');
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'connected';
            clearInterval(reconnectInterval); // Para as tentativas de reconexão automática
            reconnectInterval = null;
            addMessageToLog('Conexão estabelecida com sucesso.', 'system-message');
            updateButtonState(); // Atualiza o botão para "Desconectar"
        };

        // Evento disparado quando uma mensagem é recebida do servidor
        ws.onmessage = (event) => {
            console.log('Mensagem recebida:', event.data);
            try {
                // Tenta fazer o parse da mensagem como JSON
                const data = JSON.parse(event.data);
                addMessageToLog(data, 'data-message'); // Adiciona a mensagem formatada ao log
            } catch (e) {
                // Se o parse falhar, exibe a mensagem bruta como erro
                console.error('Erro ao parsear JSON:', e);
                addMessageToLog(`Erro ao parsear mensagem: ${event.data}`, 'error-message');
            }
        };

        // Evento disparado quando a conexão é fechada (pelo servidor ou cliente)
        ws.onclose = (event) => {
            console.warn('Conexão WebSocket fechada:', event);
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'disconnected';
            // Exibe o código e a razão do fechamento para depuração
            addMessageToLog(`Conexão fechada. Código: ${event.code}, Razão: ${event.reason}`, 'system-message');
            updateButtonState(); // Atualiza o botão para "Conectar"

            // Se não foi uma desconexão manual e não há um intervalo de reconexão ativo, inicia a reconexão automática
            if (!isManuallyDisconnected && !reconnectInterval) {
                reconnectInterval = setInterval(() => {
                    console.log('Tentando reconectar automaticamente...');
                    connectWebSocket(); // Tenta reconectar a cada 5 segundos
                }, 5000);
            }
        };

        // Evento disparado em caso de erro na conexão WebSocket
        ws.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            connectionStatus.textContent = 'Erro';
            connectionStatus.className = 'error';
            addMessageToLog('Ocorreu um erro na conexão WebSocket.', 'error-message');
            updateButtonState(); // Garante que o botão reflita o estado de erro
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
            updateButtonState(); // Atualiza o botão para "Conectar"
        }
    }

    // --- Listeners de Eventos ---

    // Listener para o botão de conectar/desconectar (AGORA NA PÁGINA PRINCIPAL)
    toggleConnectionBtn.addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            disconnectWebSocket(); // Se estiver conectado, desconecta
        } else {
            connectWebSocket(); // Se estiver desconectado, tenta conectar
        }
    });

    // Listener para o botão de salvar configurações (dentro do modal)
    saveSettingsBtn.addEventListener('click', () => {
        const newUrl = websocketUrlInput.value.trim(); // Obtém a nova URL e remove espaços em branco

        // Valida a URL antes de salvar
        if (!isValidWebSocketUrl(newUrl)) {
            showToast('URL do WebSocket inválida. Deve começar com ws:// ou wss:// e ser um formato válido.', 'error');
            return;
        }

        // Se a URL foi alterada, atualiza e persiste
        if (newUrl !== currentWebsocketUrl) {
            currentWebsocketUrl = newUrl;
            localStorage.setItem('websocketUrl', currentWebsocketUrl); // Salva a URL no localStorage para persistência
            showToast(`URL do WebSocket alterada para: ${currentWebsocketUrl}`, 'success');
            addMessageToLog(`URL do WebSocket alterada para: ${currentWebsocketUrl}.`, 'system-message');

            // Se a conexão estiver ativa, desconecta e tenta reconectar com a nova URL
            if (ws && ws.readyState === WebSocket.OPEN) {
                disconnectWebSocket();
                // Pequeno delay para permitir que a desconexão seja processada antes de tentar reconectar
                setTimeout(() => {
                    connectWebSocket();
                }, 500);
            } else if (ws && ws.readyState === WebSocket.CONNECTING) {
                 // Se estiver conectando, fecha a conexão atual e tenta novamente com a nova URL
                 ws.close();
                setTimeout(() => {
                    connectWebSocket();
                }, 500);
            }
        } else {
            showToast('A URL do WebSocket não foi alterada.', 'info');
        }
        settingsModal.style.display = 'none'; // Fecha o modal após salvar
    });

    // Listener para o botão Limpar Log
    clearLogBtn.addEventListener('click', () => {
        messagesDiv.innerHTML = ''; // Remove todos os elementos filhos do log
        addMessageToLog('Log de mensagens limpo.', 'system-message');
        showToast('Log limpo com sucesso!', 'info');
    });

    // --- Lógica para abrir e fechar o modal ---
    openSettingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'flex'; // Exibe o modal
    });

    closeButton.addEventListener('click', () => {
        settingsModal.style.display = 'none'; // Oculta o modal
    });

    // Fecha o modal se o usuário clicar fora do conteúdo do modal
    window.addEventListener('click', (event) => {
        if (event.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });
});