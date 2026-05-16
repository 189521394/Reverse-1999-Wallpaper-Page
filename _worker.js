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
                // 重写网页标题
                .on('title', {
                    element(element) {
                        element.setInnerContent("Reverse: 1999 Wallpapers | Official CG, Mobile & Desktop");
                    }
                })
                // 重写分享标题
                .on('meta[property="og:title"]', {
                    element(element) {
                        element.setAttribute("content", "Reverse: 1999 Wallpapers | Official CG, Mobile & Desktop");
                    }
                })
                // 重写描述
                .on('meta[name="description"]', {
                    element(element) {
                        element.setAttribute("content", "An HD wallpaper library designed exclusively for Reverse: 1999. It features a massive collection of official CG artwork, available for quick filtering and download.");
                    }
                })
                // 重写关键词
                .on('meta[name="keywords"]', {
                    element(element) {
                        element.setAttribute("content", "Reverse 1999, Reverse: 1999 wallpapers, Reverse 1999 official CG, HD wallpapers, desktop wallpapers, mobile wallpapers, anime game wallpapers, Reverse 1999 wallpaper download, Reverse 1999 phone wallpaper, Reverse 1999 4K wallpaper, Reverse 1999 character art, anime artwork");
                    }
                })
                // 重写og描述
                .on('meta[property="og:description"]', {
                    element(element) {
                        element.setAttribute("content", "An HD wallpaper library designed exclusively for Reverse: 1999. It features a massive collection of official CG artwork, available for quick filtering and download.");
                    }
                })
                // 替换H1标题
                .on('h1#h1-title', {
                    element(element) {
                        element.setInnerContent("Reverse: 1999 Wallpapers | Official CG, Mobile & Desktop");
                    }
                })
                // ogURL
                .on('meta[property="og:url"]', {
                    element(element) {
                        // 动态保留所有高级搜索参数
                        element.setAttribute("content", request.url);
                    }
                })
                // 重写 Canonical URL，告诉搜索引擎这是一个独立的英文页面
                .on('link[rel="canonical"]', {
                    element(element) {
                        element.setAttribute("href", "https://r9wallpaper.org/?lang=en");
                    }
                })
                .transform(response);
        }

        return response;
    }
};