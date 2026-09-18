import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Client único do app: antes cada componente criava sua própria instância
// axios.create() sem nenhum jeito de anexar o token JWT nas requisições.
// withCredentials: true faz o navegador enviar o cookie httpOnly de
// autenticação (setado pelo backend no login) em toda requisição — não há
// mais token em localStorage nem header Authorization anexado manualmente.
const api = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

let onUnauthorized = null;

// App.jsx registra aqui o que fazer quando o backend recusa o token (expirado/
// inválido) — mantém o client desacoplado do estado de autenticação do React.
export function setUnauthorizedHandler(handler) {
    onUnauthorized = handler;
}

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && onUnauthorized) {
            onUnauthorized();
        }
        return Promise.reject(error);
    }
);

export default api;
