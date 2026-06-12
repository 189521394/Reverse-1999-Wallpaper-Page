export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // ============================================================
        // 第一阶段：老链接 301 重定向（向后兼容）
        // 将 ?lang=en 的旧格式永久重定向到 /en/ 虚拟目录
        // ============================================================
        if (url.searchParams.get('lang') === 'en') {
            url.searchParams.delete('lang');
            // 保留可能存在的其他查询参数（如高级分享的 mode/q/precise）
            const remainingSearch = url.search;
            return Response.redirect('https://r9wallpaper.org/en/' + remainingSearch, 301);
        }

        // ============================================================
        // 第二阶段：/en/ 虚拟目录拦截与 SEO 重写
        // ============================================================
        if (url.pathname === '/en' || url.pathname.startsWith('/en/')) {

            // 尾部斜杠规范化：/en（无斜杠）→ /en/（有斜杠）301 永久重定向
            // 确保与全站 hreflang、sitemap 中声明的 URL 格式统一
            if (url.pathname === '/en') {
                return Response.redirect('https://r9wallpaper.org/en/' + url.search, 301);
            }

            // 【核心修复点】：用扩展名判断是否为静态资源，而不是用 Accept 头
            // 如果路径以 .js, .css, .png, .json 等结尾，判定为静态资源
            const isAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?|json|xml)$/i);

            if (isAsset) {
                // 是静态资源（如 /en/bundle_index.css）：剥离 /en 前缀，从根路径获取
                const strippedPath = url.pathname.replace(/^\/en/, '') || '/';
                const resourceUrl = new URL(request.url);
                resourceUrl.pathname = strippedPath;
                return env.ASSETS.fetch(new Request(resourceUrl.toString(), request));
            }

            // HTML 页面请求：获取主站根 HTML 并在边缘节点重写
            const rootUrl = new URL(request.url);
            rootUrl.pathname = '/';

            const rootRequest = new Request(rootUrl.toString(), {
                method: 'GET',
                headers: request.headers
            });

            const response = await env.ASSETS.fetch(rootRequest);

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("text/html")) {
                return response;
            }

            // 动态获取当前访问的纯净路径作为 Canonical
            // 统一确保尾部带 /，与 index.html 及 sitemap.xml 中声明的 hreflang URL 格式一致
            const canonicalPath = url.pathname.replace(/\/?$/, '/');
            const canonicalUrl = url.origin + canonicalPath;

            // HTMLRewriter：流式重写 HTML
            return new HTMLRewriter()
                // 多语言标记参数
                .on('html', {
                    element(element) {
                        element.setAttribute("lang", "en");
                    }
                })
                // 标题
                .on('title', {
                    element(element) {
                        element.setInnerContent("Reverse: 1999 Wallpapers | Official CG, Mobile & Desktop");
                    }
                })
                // 标题
                .on('meta[property="og:title"]', {
                    element(element) {
                        element.setAttribute("content", "Reverse: 1999 Wallpapers | Official CG, Mobile & Desktop");
                    }
                })
                // 描述
                .on('meta[name="description"]', {
                    element(element) {
                        element.setAttribute("content", "An HD wallpaper library designed exclusively for Reverse: 1999. It features a massive collection of official CG artwork, available for quick filtering and download.");
                    }
                })
                // 关键词
                .on('meta[name="keywords"]', {
                    element(element) {
                        element.setAttribute("content", "Reverse 1999, 1999 wallpaper, Reverse: 1999 wallpapers, Reverse 1999 official CG, HD wallpapers, desktop wallpapers, mobile wallpapers, anime game wallpapers, Reverse 1999 wallpaper download, Reverse 1999 phone wallpaper, Reverse 1999 4K wallpaper, Reverse 1999 character art, anime artwork");
                    }
                })
                // 描述
                .on('meta[property="og:description"]', {
                    element(element) {
                        element.setAttribute("content", "An HD wallpaper library designed exclusively for Reverse: 1999. It features a massive collection of official CG artwork, available for quick filtering and download.");
                    }
                })
                // 标题
                .on('h1#h1-title', {
                    element(element) {
                        element.setInnerContent("Reverse: 1999 Wallpapers | Official CG, Mobile & Desktop");
                    }
                })
                // URL
                .on('meta[property="og:url"]', {
                    element(element) {
                        // og:url 保持完整请求链接，方便社交分享包含查询参数
                        element.setAttribute("content", request.url);
                    }
                })
                // canonical
                .on('link[rel="canonical"]', {
                    element(element) {
                        element.setAttribute("href", canonicalUrl);
                    }
                })
                // hreflang 标签已在源站 index.html 中正确声明，无需重复注入
                .transform(response);
        }

        // ============================================================
        // 第三阶段：中文路径 (/) 正常透传
        // ============================================================
        return env.ASSETS.fetch(request);
    }
};
