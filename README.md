
-----

# Dashboard de Monitoramento Node-RED

<p align="center">
<img src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white" />
<img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" />
<img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" />
</p>

### Visão Geral

Este projeto é um dashboard web interativo, desenvolvido com **HTML**, **CSS** e **JavaScript** puro, para monitorar e visualizar dados em tempo real enviados de um servidor **Node-RED** via **WebSocket**. A aplicação permite que você adicione, edite e gerencie múltiplos servidores de dados, se conecte a eles e visualize um log de mensagens que pode ser filtrado e exportado.

A arquitetura do projeto foi pensada para ser modular e de fácil manutenção, com a lógica dividida em diferentes arquivos JavaScript, cada um com uma responsabilidade específica:

  * `main.js`: Lógica principal e orquestração dos módulos.
  * `ui.js`: Gerenciamento da interface do usuário (DOM, modais, toasts).
  * `websocket.js`: Conexão, desconexão e reconexão automática com o servidor WebSocket.
  * `storage.js`: Persistência dos dados de configuração de servidores no `localStorage`.

### Funcionalidades

  * **Gerenciamento de Servidores**: Adicione, edite e exclua URLs de servidores WebSocket.
  * **Conexão Dinâmica**: Conecte e desconecte de diferentes servidores com um clique.
  * **Log de Dados em Tempo Real**: Visualize as mensagens recebidas do servidor Node-RED, com destaque visual para mensagens do sistema, erros e dados.
  * **Filtragem de Dados**: Filtre o log de mensagens por nome ou valor para encontrar informações rapidamente.
  * **Exportação de Log**: Exporte os dados do log em formato **JSON** ou **CSV**.
  * **Persistência de Dados**: As configurações dos servidores são salvas automaticamente no navegador para uso futuro.

### Como Rodar o Projeto

1.  **Clone o repositório:**

    ```bash
    git clone [URL_DO_SEU_REPOSITÓRIO]
    ```

2.  **Navegue até o diretório do projeto:**

    ```bash
    cd [NOME_DA_PASTA]
    ```

3.  **Abra o arquivo `index.html`:**
    Simplesmente abra o arquivo `index.html` em seu navegador web preferido (Google Chrome, Firefox, etc.).

O projeto não requer um servidor local para rodar, pois toda a lógica de frontend é executada diretamente no navegador.

### Como Usar

1.  **Adicionar um Servidor**: Clique em **"Adicionar Novo"**, insira o nome e a URL do seu servidor WebSocket (ex: `ws://localhost:1880/ws/dashboard`) e clique em **"Salvar Servidor"**.
2.  **Selecionar o Servidor**: Use a lista suspensa **"Servidor Ativo"** para alternar entre os servidores configurados.
3.  **Conectar**: Clique em **"Conectar"** para iniciar a conexão WebSocket. O status no topo da página mudará para "Conectado".
4.  **Monitorar**: As mensagens do Node-RED aparecerão no log de dados em tempo real. Você pode filtrar a visualização usando a barra de pesquisa.
5.  **Exportar**: Selecione o formato desejado (JSON ou CSV) e clique em **"Exportar"** para baixar o log.

### Tecnologias Utilizadas

  * **HTML5**: Estrutura do documento.
  * **CSS3**: Estilização e layout, com foco em design moderno.
  * **JavaScript (ES6+)**: Lógica da aplicação, gerenciamento de estado e manipulação do DOM.
  * **WebSockets**: Protocolo de comunicação para dados em tempo real.
  * **Node-RED**: Plataforma de desenvolvimento visual para fluxos de dados (backend).

-----

### Contato

Se você tiver alguma dúvida ou sugestão, sinta-se à vontade para me contatar.

  * **Nome:** Akira Santiago
  * **Email:** akirasantiago0206@gmail.com
  * **GitHub:** https://github.com/AkiraSantiago0206
