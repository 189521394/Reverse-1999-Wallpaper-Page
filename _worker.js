// 构建时由 tools/build.py 注入：
// const PIC_ID_TO_THUMB = { "ATCG_xxx": ["resource/thumbnails/...webp", "中文短标题", "English Short Title"], ... };

export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const origin = 'https://r9wallpaper.org';

        // ============================================================
        // 第一阶段：老链接 ?lang=en 301 重定向（向后兼容）
        // 将 ?lang=en 的旧格式永久重定向到 /en/ 虚拟目录
        // ============================================================
        if (url.searchParams.get('lang') === 'en') {
            url.searchParams.delete('lang');
            // 保留可能存在的其他查询参数（如高级分享的 mode/q/precise）
            const remainingSearch = url.search;
            return Response.redirect(origin + '/en/' + remainingSearch, 301);
        }

        // ============================================================
        // 第二阶段：单图分享路由 /i/<pic_id>/ 与 /en/i/<pic_id>/ 动态拦截
        // 拉取对应语言的首页 HTML 作模板，注入该图的社交分享卡片（OG/Twitter）
        // ============================================================
        const picMatch = url.pathname.match(/^(\/en)?\/i\/([^/]+)\/$/);
        if (picMatch) {
            const isEn = !!picMatch[1];
            const picId = picMatch[2];
            const picInfo = PIC_ID_TO_THUMB[picId];

            // 未知单图 ID 直接 404
            if (!picInfo) {
                return new Response('Not Found', { status: 404 });
            }

            const [thumbPath, zhTitle, enTitle] = picInfo;
            const shortTitle = isEn ? enTitle : zhTitle;
            const ogImage = 'https://img.r9wallpaper.org/' + thumbPath;
            const pageTitle = `${shortTitle} | Reverse: 1999 Wallpaper (${picId})`;

            // 拉取对应语言的首页 HTML 作为响应模板（/en/ 版本已有实体文件）
            const rootUrl = new URL(request.url);
            rootUrl.pathname = isEn ? '/en/index.html' : '/index.html';
            const rootRequest = new Request(rootUrl.toString(), {
                method: 'GET',
                headers: request.headers
            });
            const response = await env.ASSETS.fetch(rootRequest);

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('text/html')) {
                return response;
            }

            const fullUrl = url.origin + url.pathname + url.search;

            // HTMLRewriter：注入单图专属的社交分享卡片（noindex 防止稀释整站 SEO 权重）
            return new HTMLRewriter()
                .on('title', {
                    element(element) {
                        element.setInnerContent(pageTitle);
                    }
                })
                .on('meta[property="og:title"]', {
                    element(element) {
                        element.setAttribute('content', pageTitle);
                    }
                })
                .on('meta[property="og:image"]', {
                    element(element) {
                        element.setAttribute('content', ogImage);
                    }
                })
                .on('meta[property="og:url"]', {
                    element(element) {
                        element.setAttribute('content', fullUrl);
                    }
                })
                .on('link[rel="canonical"]', {
                    element(element) {
                        element.setAttribute('href', fullUrl);
                    }
                })
                .on('head', {
                    element(element) {
                        element.append('<meta name="robots" content="noindex, follow">', { html: true });
                        element.append('<meta name="twitter:card" content="summary_large_image">', { html: true });
                    }
                })
                .transform(response);
        }

        // ============================================================
        // 第三阶段：尾部斜杠规范化
        // 非静态资源请求不带尾斜杠（如 /c/vertin、/en、/i/ATCG_xxx）→ 301 补斜杠
        // 与全站 hreflang、sitemap 中声明的 URL 格式统一
        // ============================================================
        const isAsset = url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|ico|svg|webp|woff2?|json|xml|txt)$/i);
        if (!isAsset && !url.pathname.endsWith('/')) {
            return Response.redirect(origin + url.pathname + '/' + url.search, 301);
        }

        // ============================================================
        // 第四阶段：/en/ 静态资源路径修正
        // 若请求以 /en/ 开头且是静态资源（如 /en/bundle_index.css）：
        // 剥离 /en 前缀后从根路径获取（双保险，配合 build.py 的根路径引用）
        // ============================================================
        if (url.pathname.startsWith('/en/') && isAsset) {
            const strippedPath = url.pathname.replace(/^\/en/, '') || '/';
            const resourceUrl = new URL(request.url);
            resourceUrl.pathname = strippedPath;
            return env.ASSETS.fetch(new Request(resourceUrl.toString(), request));
        }

        // ============================================================
        // 第五阶段：其余所有请求直接透传 Cloudflare Pages 静态资产
        // （含 /、/en/、/c/vertin/、/en/c/vertin/、/about/ 等——
        //  build.py 已在 dist/ 下预生成对应的实体 index.html）
        // ============================================================
        return env.ASSETS.fetch(request);
    }
};
