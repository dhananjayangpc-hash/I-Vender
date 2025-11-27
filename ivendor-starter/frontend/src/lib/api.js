const API_PREFIX = '/api/v1';

async function post(path, body){
  return fetch(`${API_PREFIX}/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function get(path){
  return fetch(`${API_PREFIX}/${path}`);
}

export default { post, get };
