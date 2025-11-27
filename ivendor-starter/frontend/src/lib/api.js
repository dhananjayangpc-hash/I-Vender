const API_PREFIX = '/api/v1';

export const api = {
  baseURL: 'http://localhost:3000/api/v1',
  
  async post(path, body) {
    return fetch(`${API_PREFIX}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
  },

  async get(path) {
    return fetch(`${API_PREFIX}/${path}`);
  }
};

export default api;

