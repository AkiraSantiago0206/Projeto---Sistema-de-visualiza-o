document.addEventListener('DOMContentLoaded', () => {
    const connectionStatus = document.getElementById('connection-status');
    const messagesDiv = document.getElementById('messages');
    const toggleConnectionBtn = document.getElementById('toggle-connection-btn');

    const websocketUrl = 'ws://localhost:1880/ws/dashboard';
    let ws = null; // Inicializa ws como null para começar desconectado
    let reconnectInterval = null;
    let isManuallyDisconnected = false; // Flag para controlar a reconexão automática

    // Função para atualizar o texto e estado do botão
    function updateButtonState() {
        if (!ws || ws.readyState === WebSocket.CLOSED) {
            toggleConnectionBtn.textContent = 'Conectar';
            toggleConnectionBtn.className = 'btn-connect';
            toggleConnectionBtn.disabled = false; // Habilita para conectar
        } else if (ws.readyState === WebSocket.OPEN) {
            toggleConnectionBtn.textContent = 'Desconectar';
            toggleConnectionBtn.className = 'btn-disconnect';
            toggleConnectionBtn.disabled = false; // Habilita para desconectar
        } else if (ws.readyState === WebSocket.CONNECTING) {
            toggleConnectionBtn.textContent = 'Conectando...';
            toggleConnectionBtn.className = 'btn-connect'; // Mantém a classe visual de conectar
            toggleConnectionBtn.disabled = true; // Desabilita enquanto está conectando
        }
    }

    function connectWebSocket() {
        // Limpa qualquer intervalo de reconexão pendente antes de tentar uma nova conexão
        if (reconnectInterval) {
            clearInterval(reconnectInterval);
            reconnectInterval = null;
        }

        // Se já estiver conectado ou conectando, não faz nada
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket já está conectado ou conectando.');
            return;
        }

        isManuallyDisconnected = false; // O usuário está iniciando uma conexão, então não é mais uma desconexão manual
        updateButtonState(); // Atualiza o botão para "Conectando..." e desabilitado

        console.log(`Tentando conectar ao WebSocket em: ${websocketUrl}`);
        connectionStatus.textContent = 'Conectando...';
        connectionStatus.className = 'connecting';

        ws = new WebSocket(websocketUrl);

        ws.onopen = () => {
            console.log('Conexão WebSocket estabelecida!');
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'connected';
            clearInterval(reconnectInterval); // Para de tentar reconectar se a conexão for bem-sucedida
            reconnectInterval = null;
            addMessageToLog('Conexão estabelecida com sucesso.', 'system-message');
            updateButtonState(); // Atualiza o botão para "Desconectar"
        };

        ws.onmessage = (event) => {
            console.log('Mensagem recebida:', event.data);
            try {
                const data = JSON.parse(event.data);
                addMessageToLog(JSON.stringify(data, null, 2), 'data-message');
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
            updateButtonState(); // Atualiza o botão para "Conectar" e habilitado

            // Tenta reconectar automaticamente APENAS se não foi desconectado manualmente
            // e se não há um intervalo de reconexão já ativo
            if (!isManuallyDisconnected && !reconnectInterval) {
                reconnectInterval = setInterval(() => {
                    console.log('Tentando reconectar automaticamente...');
                    connectWebSocket(); // Chama connectWebSocket para re-iniciar a conexão
                }, 5000); // Tenta reconectar a cada 5 segundos
            }
        };

        ws.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            connectionStatus.textContent = 'Erro';
            connectionStatus.className = 'error';
            addMessageToLog('Ocorreu um erro na conexão WebSocket.', 'error-message');
            // O ws.onclose será chamado após o onerror, então não é necessário chamar ws.close() aqui
            updateButtonState(); // Atualiza o estado do botão
        };
    }

    function disconnectWebSocket() {
        if (ws && ws.readyState === WebSocket.OPEN) {
            console.log('Desconectando WebSocket manualmente...');
            isManuallyDisconnected = true; // Define a flag para evitar reconexão automática
            clearInterval(reconnectInterval); // Limpa qualquer intervalo de reconexão automática
            reconnectInterval = null;
            ws.close(); // Fecha a conexão
            addMessageToLog('Desconectado manualmente.', 'system-message');
            updateButtonState(); // Atualiza o botão para "Conectar" e habilitado
        }
    }

    // Listener para o botão de toggle
    toggleConnectionBtn.addEventListener('click', () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            disconnectWebSocket();
        } else {
            // Se não estiver aberto, tenta conectar. Isso lida com a conexão inicial e a reconexão após desconexão manual.
            connectWebSocket();
        }
    });

    function addMessageToLog(message, className = '') {
        const messageElement = document.createElement('pre');
        messageElement.textContent = message;
        messageElement.className = className;
        messagesDiv.prepend(messageElement);

        if (messagesDiv.children.length > 50) {
            messagesDiv.removeChild(messagesDiv.lastChild);
        }
    }

    // NOVO: Remove a chamada inicial a connectWebSocket().
    // Apenas inicializa o estado do botão para "Conectar" e habilitado.
    updateButtonState();
});