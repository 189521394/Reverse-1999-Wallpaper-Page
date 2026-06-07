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
        // 路径以 /en 开头时进行分流处理：
        //   - HTML 页面请求 → 取主站根 HTML 并重写英文 SEO 内容
        //   - 静态资源请求 → 剥离 /en 前缀，从根路径获取真实资源
        // ============================================================
        if (url.pathname.startsWith('/en')) {
            const accept = request.headers.get('Accept') || '';

            // 非 HTML 请求（CSS/JS/图片/字体/数据等）：剥离 /en 前缀，从根路径获取
            if (!accept.includes('text/html')) {
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

            // HTMLRewriter：流式重写 HTML，在边缘节点边传输边修改
            return new HTMLRewriter()
                // 设置 html lang 属性
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
                // 重写 OG 分享标题
                .on('meta[property="og:title"]', {
                    element(element) {
                        element.setAttribute("content", "Reverse: 1999 Wallpapers | Official CG, Mobile & Desktop");
                    }
                })
                // 重写 meta 描述
                .on('meta[name="description"]', {
                    element(element) {
                        element.setAttribute("content", "An HD wallpaper library designed exclusively for Reverse: 1999. It features a massive collection of official CG artwork, available for quick filtering and download.");
                    }
                })
                // 重写 meta 关键词
                .on('meta[name="keywords"]', {
                    element(element) {
                        element.setAttribute("content", "Reverse 1999, Reverse: 1999 wallpapers, Reverse 1999 official CG, HD wallpapers, desktop wallpapers, mobile wallpapers, anime game wallpapers, Reverse 1999 wallpaper download, Reverse 1999 phone wallpaper, Reverse 1999 4K wallpaper, Reverse 1999 character art, anime artwork");
                    }
                })
                // 重写 OG 描述
                .on('meta[property="og:description"]', {
                    element(element) {
                        element.setAttribute("content", "An HD wallpaper library designed exclusively for Reverse: 1999. It features a massive collection of official CG artwork, available for quick filtering and download.");
                    }
                })
                // 重写 H1 标题
                .on('h1#h1-title', {
                    element(element) {
                        element.setInnerContent("Reverse: 1999 Wallpapers | Official CG, Mobile & Desktop");
                    }
                })
                // 动态保留所有高级搜索参数到 og:url
                .on('meta[property="og:url"]', {
                    element(element) {
                        element.setAttribute("content", request.url);
                    }
                })
                // 重写 Canonical URL，告诉搜索引擎英文版独立地址
                .on('link[rel="canonical"]', {
                    element(element) {
                        element.setAttribute("href", "https://r9wallpaper.org/en/");
                    }
                })
                // hreflang 标签已在源站 index.html 中正确声明（zh→/，en→/en/），无需重复注入
                .transform(response);
        }

        // ============================================================
        // 第三阶段：中文路径 (/) 正常透传
        // index.html 中已写死正确的 hreflang 标签，直接返回即可
        // ============================================================
        return env.ASSETS.fetch(request);
    }
};