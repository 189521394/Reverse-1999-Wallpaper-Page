export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const lang = url.searchParams.get('lang');

        const response = await env.ASSETS.fetch(request);

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("text/html")) {
            return response;
        }

        if (lang === 'en') {
            return new HTMLRewriter()
                .on('html', {
                    element(element) {
                        element.setAttribute("lang", "en");
                    }
                })
                .on('meta[name="description"]', {
                    element(element) {
                        element.setAttribute("content", "High-quality wallpaper gallery dedicated to Reverse: 1999. Featuring a massive collection of official CG images, ready for quick filtering and download.");
                    }
                })
                .on('meta[name="keywords"]', {
                    element(element) {
                        element.setAttribute("content", "Reverse 1999, Reverse 1999 wallpapers, Reverse 1999 CG, game wallpapers, anime wallpapers");
                    }
                })
                .on('meta[property="og:description"]', {
                    element(element) {
                        element.setAttribute("content", "High-quality wallpaper gallery dedicated to Reverse: 1999. Featuring a massive collection of official CG images, ready for quick filtering and download.");
                    }
                })
                .on('meta[property="og:url"]', {
                    element(element) {
                        // 动态保留所有高级搜索参数
                        element.setAttribute("content", request.url);
                    }
                })
                .transform(response);
        }

        return response;
    }
};