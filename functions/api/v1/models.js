const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

const MODELS = [
  '@cf/openai/gpt-oss-120b',
  '@cf/qwen/qwen3-30b-a3b-fp8',
  '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
];

export async function onRequest(context) {
  const { request } = context;
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

  const data = MODELS.map((m, i) => ({
    id: i === 0 ? 'zhinao' : m,
    object: 'model',
    created: Math.floor(Date.now() / 1000),
    owned_by: 'haidashu-zhinao',
    root: m,
  }));

  return new Response(JSON.stringify({ object: 'list', data }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...CORS },
  });
}
