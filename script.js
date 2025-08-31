document.addEventListener('DOMContentLoaded', () => {
    const connectionStatus = document.getElementById('connection-status');
    const messagesDiv = document.getElementById('messages');
    const toggleConnectionBtn = document.getElementById('toggle-connection-btn');
    // const sendSignalBtn = document.getElementById('send-signal-btn'); // Removido conforme sua solicitação anterior

    const websocketUrl = 'ws://localhost:1880/ws/dashboard';
    let ws = null;
    let reconnectInterval = null;
    let isManuallyDisconnected = false;

    function updateButtonState() {
        if (!ws || ws.readyState === WebSocket.CLOSED) {
            toggleConnectionBtn.textContent = 'Conectar';
            toggleConnectionBtn.className = 'btn-connect';
            toggleConnectionBtn.disabled = false;
            // sendSignalBtn.disabled = true; // Removido
        } else if (ws.readyState === WebSocket.OPEN) {
            toggleConnectionBtn.textContent = 'Desconectar';
            toggleConnectionBtn.className = 'btn-disconnect';
            toggleConnectionBtn.disabled = false;
            // sendSignalBtn.disabled = false; // Removido
        } else if (ws.readyState === WebSocket.CONNECTING) {
            toggleConnectionBtn.textContent = 'Conectando...';
            toggleConnectionBtn.className = 'btn-connect';
            toggleConnectionBtn.disabled = true;
            // sendSignalBtn.disabled = true; // Removido
        }
    }

    function connectWebSocket() {
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket já está conectado ou conectando.');
            return;
        }

        isManuallyDisconnected = false;
        updateButtonState();

        console.log(`Tentando conectar ao WebSocket em: ${websocketUrl}`);
        connectionStatus.textContent = 'Conectando...';
        connectionStatus.className = 'connecting';

        ws = new WebSocket(websocketUrl);

        ws.onopen = () => {
            console.log('Conexão WebSocket estabelecida!');
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'connected';
            clearInterval(reconnectInterval);
            reconnectInterval = null;
            addMessageToLog('Conexão estabelecida com sucesso.', 'system-message');
            updateButtonState();
        };

        ws.onmessage = (event) => {
            console.log('Mensagem recebida:', event.data);
            try {
                const data = JSON.parse(event.data);
                // Passa o objeto de dados diretamente para a função de log
                addMessageToLog(data, 'data-message');
            } catch (e) {
                console.error('Erro ao parsear JSON:', e);
                addMessageToLog(`Erro ao parsear mensagem: ${event.data}`, 'error-message');
            }
        };

        ws.onclose = (event) => {
            console.warn('Conexão WebSocket fechada:', event);
            connectionStatus.textContent = 'Desconectado';
            connectionStatus.className = 'disconnected';
            addMessageToLog(`Conexão fechada. Código: ${event.code}, Razão: ${event.reason}`, 'system-message');
            updateButtonState();

            if (!isManuallyDisconnected && !reconnectInterval) {
                reconnectInterval = setInterval(() => {
                    console.log('Tentando reconectar automaticamente...');
                    connectWebSocket();
                }, 5000);
            }
        };

        ws.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            connectionStatus.textContent = 'Erro';
            connectionStatus.className = 'error';
            addMessageToLog('Ocorreu um erro na conexão WebSocket.', 'error-message');
            updateButtonState();
        };
    }

    function disconnectWebSocket() {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('Desconectando WebSocket manualmente...');
            isManuallyDisconnected = true;
            clearInterval(reconnectInterval);
            reconnectInterval = null;
            ws.close();
            addMessageToLog('Desconectado manualmente.', 'system-message');
            updateButtonState();
        }
    }

    toggleConnectionBtn.addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            disconnectWebSocket();
        } else {
            connectWebSocket();
        }
    });

    // Removido o listener do botão de sinal

    // FUNÇÃO addMessageToLog MELHORADA
    function addMessageToLog(message, className = '') {
        const messageContainer = document.createElement('div');
        messageContainer.className = `message-entry ${className}`;

        if (className === 'data-message' && typeof message === 'object') {
            // Se for uma mensagem de dados, formatar como lista
            const timestamp = message.ts ? new Date(message.ts).toLocaleString() : 'N/A';
            const dataList = document.createElement('ul');
            dataList.className = 'data-list';

            // Adiciona o timestamp primeiro
            const tsItem = document.createElement('li');
            tsItem.innerHTML = `<strong>Timestamp:</strong> <span class="timestamp-value">${timestamp}</span>`;
            dataList.appendChild(tsItem);

            // Itera sobre as chaves do objeto (exceto 'ts')
            for (const key in message) {
                if (key !== 'ts' && message.hasOwnProperty(key)) {
                    const listItem = document.createElement('li');
                    let value = message[key];

                    // Adiciona unidade para temperatura, umidade e nível
                    if (key === 'temperatura') value += ' °C';
                    else if (key === 'umidade') value += ' %';
                    else if (key === 'nivel') value += ' m';

                    listItem.innerHTML = `<strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> <span class="data-value">${value}</span>`;
                    dataList.appendChild(listItem);
                }
            }
            messageContainer.appendChild(dataList);
        } else {
            // Para mensagens de sistema ou erro, usa <pre> para manter formatação
            const preElement = document.createElement('pre');
            preElement.textContent = message;
            messageContainer.appendChild(preElement);
        }

        messagesDiv.prepend(messageContainer);

        if (messagesDiv.children.length > 50) {
            messagesDiv.removeChild(messagesDiv.lastChild);
        }
    }

    updateButtonState();
});