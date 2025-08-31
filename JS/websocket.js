// js/websocket.js

let ws = null;
let reconnectInterval = null;
let isManuallyDisconnected = false;
let currentUrl = '';

const callbacks = {
    onOpen: () => {},
    onMessage: () => {},
    onClose: () => {},
    onError: () => {},
};

export function configure(options) {
    Object.assign(callbacks, options);
}

export function connect(url) {
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        return;
    }
    
    currentUrl = url;
    isManuallyDisconnected = false;
    clearInterval(reconnectInterval);
    reconnectInterval = null;

    ws = new WebSocket(url);

    ws.onopen = () => {
        clearInterval(reconnectInterval);
        reconnectInterval = null;
        callbacks.onOpen();
    };

    ws.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data);
            callbacks.onMessage(data);
        } catch (e) {
            callbacks.onError(`Erro ao parsear mensagem: ${event.data}`);
        }
    };

    ws.onclose = (event) => {
        ws = null;
        callbacks.onClose(event);
        if (!isManuallyDisconnected && !reconnectInterval) {
            reconnectInterval = setInterval(() => connect(currentUrl), 5000);
        }
    };

    ws.onerror = (error) => {
        console.error("WebSocket Error:", error);
        callbacks.onError('Ocorreu um erro na conexão WebSocket.');
    };
}

export function disconnect() {
    if (ws) {
        isManuallyDisconnected = true;
        clearInterval(reconnectInterval);
        reconnectInterval = null;
        ws.close();
    }
}

export function getConnectionState() {
    if (!ws) return 'closed';
    switch (ws.readyState) {
        case WebSocket.OPEN: return 'open';
        case WebSocket.CONNECTING: return 'connecting';
        case WebSocket.CLOSING: return 'closing';
        case WebSocket.CLOSED: return 'closed';
        default: return 'closed';
    }
}

export function isValidWebSocketUrl(url) {
    const urlRegex = /^(ws|wss):\/\/[a-zA-Z0-9.-]+(?::\d+)?(?:\/[a-zA-Z0-9-._~:/?#[\]@!$&'()*+,;=]*)?$/;
    return urlRegex.test(url);
}