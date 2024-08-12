export async function onRequest(context) {
  return handleRequest(context);
}

async function handleRequest(context) {
  const { request, env } = context;
  const targetURLs = (env.TARGET_URL || '').split(',').filter(Boolean);
  const maxRetries = 5;

  for (let retry = 0; retry < maxRetries; retry++) {
    const randomIndex = Math.floor(Math.random() * targetURLs.length);
    const targetURL = targetURLs[randomIndex];
    const userURI = new URL(request.url).pathname;
    const proxyURL = targetURL + userURI;

    const headers = new Headers(request.headers);
    headers.set('Content-Type', 'application/json');

    // 移除可能导致问题的头部
    headers.delete('host');
    headers.delete('cf-ray');
    headers.delete('cf-connecting-ip');
    headers.delete('x-real-ip');

    // 添加或修改其他头部
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    headers.set('Accept-Language', 'en-US,en;q=0.9');
    headers.set('Accept-Encoding', 'gzip, deflate, br');
    headers.set('Referer', new URL(proxyURL).origin);
    headers.set('Origin', new URL(proxyURL).origin);

    console.log('Request URL:', proxyURL);
    console.log('Request Method:', request.method);

    try {
      const response = await fetch(proxyURL, {
        method: request.method,
        headers: headers,
        body: ['GET', 'HEAD'].includes(request.method) ? null : await request.text(),
      });

      if (response) {
        console.log('Server Response Status:', response.status);
        
        // 创建新的响应头
        const modifiedHeaders = new Headers(response.headers);
        modifiedHeaders.set('Access-Control-Allow-Origin', '*');
        modifiedHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        modifiedHeaders.set('Access-Control-Allow-Headers', '*');

        // 如果是 OPTIONS 请求，直接返回 200
        if (request.method === 'OPTIONS') {
          return new Response(null, {
            status: 200,
            headers: modifiedHeaders,
          });
        }

        // 对于其他请求，返回原始响应
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: modifiedHeaders,
        });
      }
    } catch (error) {
      console.error('Error during fetch:', error);
    }
  }

  console.error('No valid response received after retries');
  return new Response('无法获取有效响应', { status: 500 });
}
