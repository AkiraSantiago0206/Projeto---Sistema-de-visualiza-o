document.addEventListener('DOMContentLoaded', () => {
    const connectionStatus = document.getElementById('connection-status');
    const messagesDiv = document.getElementById('messages');

    // URL do WebSocket do seu Node-RED
    // Certifique-se de que o IP e a porta correspondem à sua instalação do Node-RED.
    // Se estiver rodando localmente, geralmente é ws://localhost:1880
    // O caminho /ws/dashboard é o que você configurou no nó 'websocket-listener' do Node-RED.
    const websocketUrl = 'ws://localhost:1880/ws/dashboard'; 
    let ws;
    let reconnectInterval;

    function connectWebSocket() {
        if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
            console.log('WebSocket já está conectado ou conectando.');
            return;
        }

        console.log(`Tentando conectar ao WebSocket em: ${websocketUrl}`);
        connectionStatus.textContent = 'Conectando...';
        connectionStatus.className = 'connecting';

        ws = new WebSocket(websocketUrl);

        ws.onopen = () => {
            console.log('Conexão WebSocket estabelecida!');
            connectionStatus.textContent = 'Conectado';
            connectionStatus.className = 'connected';
            clearInterval(reconnectInterval); // Para de tentar reconectar se a conexão for bem-sucedida
            addMessageToLog('Conexão estabelecida com sucesso.', 'system-message');
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
            
            // Tenta reconectar após um tempo
            if (!reconnectInterval) {
                reconnectInterval = setInterval(() => {
                    console.log('Tentando reconectar...');
                    connectWebSocket();
                }, 5000); // Tenta reconectar a cada 5 segundos
            }
        };

        ws.onerror = (error) => {
            console.error('Erro no WebSocket:', error);
            connectionStatus.textContent = 'Erro';
            connectionStatus.className = 'error';
            addMessageToLog('Ocorreu um erro na conexão WebSocket.', 'error-message');
            ws.close(); // Força o fechamento para acionar o onclose e a reconexão
        };
    }

    function addMessageToLog(message, className = '') {
        const messageElement = document.createElement('pre'); // Usar <pre> para formatar JSON
        messageElement.textContent = message;
        messageElement.className = className;
        messagesDiv.prepend(messageElement); // Adiciona a mensagem mais recente no topo

        // Limita o número de mensagens para evitar sobrecarga da DOM
        if (messagesDiv.children.length > 50) {
            messagesDiv.removeChild(messagesDiv.lastChild);
        }
    }

    // Inicia a conexão quando a página é carregada
    connectWebSocket();
});