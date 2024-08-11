export function onRequest(context) {
  return handleRequest(context.request);
}

const targetURLs = (process.env.TARGET_URL || '').split(',').filter(Boolean);
const maxRetries = 5;

async function handleRequest(request) {
  let response;
  for (let retry = 0; retry < maxRetries; retry++) {
    const randomIndex = Math.floor(Math.random() * targetURLs.length);
    const targetURL = targetURLs[randomIndex];
    const userURI = new URL(request.url).pathname;
    const proxyURL = targetURL + userURI;

    const headers = new Headers(request.headers);
    headers.set('Content-Type', 'application/json');
    // 移除 Cloudflare 特定的 header
    // headers.set('cf-ip-override', 'v4');

    // 添加伪装的 header
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
    headers.set('Accept-Language', 'en-US,en;q=0.9');
    headers.set('Accept-Encoding', 'gzip, deflate, br');
    headers.set('Referer', proxyURL);
    headers.set('Origin', proxyURL);

    const requestBody = await request.text();
    console.log('Request URL:', proxyURL);

    try {
      response = await fetch(proxyURL, {
        method: request.method,
        headers: headers,
        body: requestBody,
      });

      if (response) {
        console.log('Server Response Status:', response.status);
        console.log('Server Response Headers:', JSON.stringify(Object.fromEntries(response.headers.entries())));
        const responseBody = await response.text();

        const modifiedHeaders = new Headers(response.headers);
        modifiedHeaders.set('Access-Control-Allow-Origin', '*');
        modifiedHeaders.set('Access-Control-Allow-Headers', '*');
        modifiedHeaders.set('Content-Type', 'application/json');
        // 移除 Cloudflare 特定的 header
        // modifiedHeaders.set('cf-ip-override', 'v4');

        // 添加伪装的 header
        modifiedHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36');
        modifiedHeaders.set('Accept-Language', 'en-US,en;q=0.9');
        modifiedHeaders.set('Accept-Encoding', 'gzip, deflate, br');
        modifiedHeaders.set('Referer', proxyURL);
        modifiedHeaders.set('Origin', proxyURL);
        modifiedHeaders.delete('cf-ray');

        console.log('Response Body:', responseBody);

        if (response.status === 200) {
          try {
            const jsonResponse = JSON.parse(responseBody);
            if (jsonResponse.code === 200) {
              return new Response(JSON.stringify(jsonResponse), {
                status: response.status,
                statusText: response.statusText,
                headers: modifiedHeaders
              });
            }
          } catch (jsonError) {
            console.error('Error parsing JSON:', jsonError);
          }
        }
      }
    } catch (error) {
      console.error('Error during fetch:', error);
    }
  }

  if (!response) {
    console.error('No valid response received after retries');
    return new Response('无法获取有效响应', { status: 500 });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}
