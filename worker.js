export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/instagram-thumb') {
      const target = url.searchParams.get('url');
      if (!target) return new Response('Missing url', { status: 400 });

      let instagramUrl;
      try {
        instagramUrl = new URL(target);
        if (!/^(www\.|m\.)?instagram\.com$/i.test(instagramUrl.hostname)) throw new Error('invalid host');
      } catch {
        return new Response('Invalid Instagram URL', { status: 400 });
      }

      const cache = caches.default;
      const cacheKey = new Request(url.toString(), request);
      const cached = await cache.match(cacheKey);
      if (cached) return cached;

      const page = await fetch(instagramUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'ko-KR,ko;q=0.9,en;q=0.8',
        },
        redirect: 'follow',
      });

      if (!page.ok) return new Response('Instagram page unavailable', { status: 502 });

      const html = await page.text();
      const match = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
        || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);

      if (!match?.[1]) return new Response('Instagram thumbnail unavailable', { status: 404 });

      const imageUrl = match[1].replace(/&amp;/g, '&');
      const image = await fetch(imageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/140 Safari/537.36',
          'Referer': 'https://www.instagram.com/',
        },
      });

      if (!image.ok) return new Response('Instagram image unavailable', { status: 502 });

      const response = new Response(image.body, {
        status: 200,
        headers: {
          'Content-Type': image.headers.get('Content-Type') || 'image/jpeg',
          'Cache-Control': 'public, max-age=86400, s-maxage=604800',
        },
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }

    return env.ASSETS.fetch(request);
  },
};
