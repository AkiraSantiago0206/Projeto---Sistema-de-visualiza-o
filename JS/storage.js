// js/storage.js

const SERVERS_KEY = 'websocketServers';
const ACTIVE_SERVER_ID_KEY = 'activeServerId';

export function getServers() {
    return JSON.parse(localStorage.getItem(SERVERS_KEY)) || [];
}

export function saveServers(servers) {
    localStorage.setItem(SERVERS_KEY, JSON.stringify(servers));
}

export function getActiveServerId() {
    const id = localStorage.getItem(ACTIVE_SERVER_ID_KEY);
    return id !== null ? parseInt(id, 10) : null;
}

export function setActiveServerId(id) {
    if (id === null) {
        localStorage.removeItem(ACTIVE_SERVER_ID_KEY);
    } else {
        localStorage.setItem(ACTIVE_SERVER_ID_KEY, id);
    }
}