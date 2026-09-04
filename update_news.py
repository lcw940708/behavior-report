import os
import time
import datetime
import html
import requests
import feedparser
import trafilatura
from bs4 import BeautifulSoup
from googlenewsdecoder import gnewsdecoder

# 網站基本設定 (SEO 用)
SITE_DOMAIN = "https://www.behavior-report.com"
SITE_NAME = "ABRG 大數據行為觀察中心"

# Cloudflare 認證資訊（已直接代入你的 Token）
CLOUDFLARE_ACCOUNT_ID = "d15b83e3434840eb29469592d22bb2bc"
CLOUDFLARE_API_TOKEN = "cfat_bFpebjVaCLDDCllvcTdBdH3VdEXZUpJrMyQaxi32f67fe4fa"

# 使用 Mistral 7B 模型，反應快且結構穩定
CF_MODEL = "@cf/meta/llama-3.2-1b-instruct"
CF_API_URL = f"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/run/{CF_MODEL}"

headers = {
    "Authorization": f"Bearer {CLOUDFLARE_API_TOKEN}",
    "Content-Type": "application/json"
}

CATEGORIES = [
    {"name": "香港時事", "url": "https://news.google.com/rss?hl=zh-HK&gl=HK&ceid=HK:zh-Hant"},
    {"name": "娛樂新聞", "url": "https://news.google.com/rss/headlines/section/topic/ENTERTAINMENT?hl=zh-HK&gl=HK&ceid=HK:zh-Hant"},
    {"name": "體育新聞", "url": "https://news.google.com/rss/headlines/section/topic/SPORTS?hl=zh-HK&gl=HK&ceid=HK:zh-Hant"},
    {"name": "國際時事", "url": "https://news.google.com/rss/headlines/section/topic/WORLD?hl=zh-HK&gl=HK&ceid=HK:zh-Hant"}
]

def rewrite_with_cf_ai(original_text, title):
    prompt = f"""
請擔任專業新聞觀察員，將以下新聞內容進行精簡重寫與重點提煉。

新聞標題：{title}
新聞原文：{original_text[:2000]}

要求：
1. 嚴禁逐字照搬原文。請使用全新句式、中立且專業的香港中文風格重寫。
2. 全文長度控制在 400 至 450 字內，結構分明：
   - 第一段：概述事件背景與核心經過。
   - 第二段：說明關鍵細節與數據。
   - 第三段：簡述後續影響。
3. 結尾必須完整列出 3 個重點摘要（Bullet Points）。
4. 直接輸出正文，切勿包含任何開場白或結語。
"""
    payload = {
        "messages": [
            {"role": "system", "content": "你是一個專業新聞編輯，只輸出完整且結構清晰的新聞正文。"},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 2048
    }
    try:
        res = requests.post(CF_API_URL, headers=headers, json=payload, timeout=45)
        data = res.json()
        if data.get("success"):
            content = data["result"]["response"].replace("**", "").replace("##", "").strip()
            return content
        else:
            print(f"⚠️ Cloudflare API 回應失敗: {data}")
            return original_text[:450] + "..."
    except Exception as e:
        print(f"❌ 呼叫 Cloudflare AI 發生例外錯誤: {e}")
        return original_text[:450] + "..."

def fetch_and_generate():
    os.makedirs("articles", exist_ok=True)
    all_news_items = []
    global_article_id = 1

    for cat in CATEGORIES:
        cat_name = cat["name"]
        rss_url = cat["url"]
        print(f"\n===== 正在抓取類別：{cat_name} =====")
        
        feed = feedparser.parse(rss_url)
        
        for entry in feed.entries[:5]:
            print(f"[{global_article_id}/20] [{cat_name}] {entry.title}")
            
            raw_text = ""
            real_url = entry.link
            
            try:
                decoded = gnewsdecoder(entry.link, interval=1)
                real_url = decoded.get("decoded_url") if decoded.get("status") else entry.link
                downloaded = trafilatura.fetch_url(real_url)
                if downloaded:
                    raw_text = trafilatura.extract(downloaded, include_comments=False, include_tables=False) or ""
                    
                    # 過濾「其他人也在看」等推薦雜訊
                    for noise_keyword in ["其他人也在看", "熱門推介", "相關新聞", "即時熱話"]:
                        if noise_keyword in raw_text:
                            raw_text = raw_text.split(noise_keyword)[0]
                            
            except Exception as e:
                print(f"抓取內文失敗: {e}")

            if len(raw_text) > 100:
                ai_content = rewrite_with_cf_ai(raw_text, entry.title)
            else:
                ai_content = "目前無法擷取全文內文，請點擊底部的原文連結閱讀更多內容。"

            article_filename = f"articles/{global_article_id}.html"
            canonical_url = f"{SITE_DOMAIN}/{article_filename}"
            
            clean_title = html.escape(entry.title.strip())
            seo_description = html.escape(ai_content.replace("\n", " ").strip()[:150]) + "..."
            
            article_html = f"""<!DOCTYPE html>
<html lang="zh-Hant-HK">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{clean_title} — {SITE_NAME}</title>
    <meta name="description" content="{seo_description}">
    <meta name="keywords" content="{cat_name}, 即時新聞, AI新聞摘要, 香港焦點, {SITE_NAME}">
    <link rel="canonical" href="{canonical_url}" />
    <meta name="robots" content="index, follow">

    <meta property="og:type" content="article">
    <meta property="og:title" content="{clean_title}">
    <meta property="og:description" content="{seo_description}">
    <meta property="og:url" content="{canonical_url}">
    <meta property="og:site_name" content="{SITE_NAME}">

    <meta name="twitter:card" content="summary">
    <meta name="twitter:title" content="{clean_title}">
    <meta name="twitter:description" content="{seo_description}">

    <style>
        * {{ box-sizing: border-box; }}
        body {{ background: #0b0f17; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px 20px; line-height: 1.8; margin: 0; }}
        .container {{ max-width: 760px; margin: 0 auto; background: #131b2e; padding: 40px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.08); box-shadow: 0 20px 40px rgba(0,0,0,0.5); }}
        .back-btn {{ display: inline-flex; align-items: center; margin-bottom: 24px; color: #38bdf8; text-decoration: none; font-weight: 600; font-size: 0.95rem; transition: all 0.2s; }}
        .back-btn:hover {{ color: #7dd3fc; transform: translateX(-4px); }}
        .badge {{ display: inline-block; background: rgba(56,189,248,0.12); color: #38bdf8; font-size: 0.85rem; font-weight: 600; padding: 6px 14px; border-radius: 20px; margin-bottom: 16px; border: 1px solid rgba(56,189,248,0.25); letter-spacing: 0.5px; }}
        
        h1 {{ color: #ffffff; font-size: 2rem; font-weight: 800; margin: 0 0 16px 0; line-height: 1.35; letter-spacing: -0.5px; }}
        .meta {{ color: #64748b; font-size: 0.9rem; margin-bottom: 32px; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 16px; font-weight: 500; }}
        .content {{ font-size: 1.1rem; color: #cbd5e1; white-space: pre-wrap; word-break: break-word; line-height: 1.9; }}
        
        .original-btn {{ display: inline-block; margin-top: 40px; padding: 12px 24px; background: rgba(255,255,255,0.05); color: #38bdf8; font-size: 0.95rem; font-weight: 600; text-decoration: none; border-radius: 8px; border: 1px solid rgba(56,189,248,0.2); transition: all 0.2s; }}
        .original-btn:hover {{ background: rgba(56,189,248,0.15); border-color: #38bdf8; }}
    </style>
</head>
<body>
    <div class="container">
        <a href="../news.html" class="back-btn">← 返回新聞列表</a>
        <article>
            <header>
                <div><span class="badge">{cat_name}</span></div>
                <h1>{entry.title}</h1>
                <div class="meta">發佈時間：<time>{entry.published}</time></div>
            </header>
            <div class="content">{ai_content}</div>
            <footer>
                <a href="{real_url}" target="_blank" rel="nofollow noopener noreferrer" class="original-btn">閱讀新聞來源原文 ↗</a>
            </footer>
        </article>
    </div>
</body>
</html>"""

            with open(article_filename, "w", encoding="utf-8") as f:
                f.write(article_html)

            all_news_items.append({
                "category": cat_name,
                "title": entry.title,
                "local_link": article_filename,
                "pubDate": entry.published,
                "snippet": ai_content[:130].replace("\n", " ") + "..."
            })
            
            global_article_id += 1
            time.sleep(0.5)

    return all_news_items

def update_main_html(news_items):
    now = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cards_html = ""
    
    for item in news_items:
        cards_html += f"""
        <article class="news-card" style="background: #131b2e; padding: 24px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); margin-bottom: 20px; transition: transform 0.2s, border-color 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span style="background: rgba(56,189,248,0.12); color: #38bdf8; font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: 12px; border: 1px solid rgba(56,189,248,0.25);">{item['category']}</span>
                <time class="news-date" style="color: #64748b; font-size: 0.825rem; font-weight: 500;">{item['pubDate']}</time>
            </div>
            <a href="{item['local_link']}" class="news-title" style="color: #ffffff; font-size: 1.25rem; font-weight: 700; text-decoration: none; line-height: 1.45; display: block; margin-bottom: 10px; letter-spacing: -0.3px;">{item['title']}</a>
            <p class="news-summary" style="color: #94a3b8; font-size: 0.95rem; line-height: 1.6; margin: 0;">{item['snippet']}</p>
        </article>
        """

    with open("news.html", "r", encoding="utf-8") as f:
        soup = BeautifulSoup(f.read(), "html.parser")

    container = soup.find(id="news-container")
    time_span = soup.find(id="update-time")

    if container:
        container.string = ""
        container.append(BeautifulSoup(cards_html, "html.parser"))
    if time_span:
        time_span.string = now

    with open("news.html", "w", encoding="utf-8") as f:
        f.write(str(soup))

def update_sitemap(news_items):
    """自動產生含新聞主頁與 20 篇內頁的 sitemap.xml"""
    today = datetime.datetime.now().strftime("%Y-%m-%d")

    urls = [
        f"""  <url>
    <loc>{SITE_DOMAIN}/</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>""",
        f"""  <url>
    <loc>{SITE_DOMAIN}/news.html</loc>
    <lastmod>{today}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>"""
    ]

    for item in news_items:
        rel_path = item["local_link"].replace("\\", "/")
        urls.append(f"""  <url>
    <loc>{SITE_DOMAIN}/{rel_path}</loc>
    <lastmod>{today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>""")

    joined_urls = "\n".join(urls)
    sitemap_content = f"""<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
{joined_urls}
</urlset>"""

    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write(sitemap_content)

if __name__ == "__main__":
    items = fetch_and_generate()
    update_main_html(items)
    update_sitemap(items)
    print("\n✅ 更新完成！新聞內頁已注入動態 SEO 標籤，並自動更新 Sitemap。")