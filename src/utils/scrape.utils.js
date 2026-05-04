const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const cheerio = require("cheerio");
const axios = require("axios");
const { rag, getReleventdata } = require("../services/rag.service");
const config = require("../config/config");
const path = require("path");

async function scrape(url) {
    let allData = "";

    console.log("[Scraper] Starting scrape for: " + url);

    // --- STRATEGY 1: PURE NODE (High Speed & Most Stable) ---
    try {
        console.log("[Scraper] Attempting Pure Node Scrape (Axios)...");
        const response = await axios.get(url, { 
            timeout: 8000,
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5',
            }
        });

        if (response.data) {
            const $ = cheerio.load(response.data);
            
            // Extract Meta Data first (Great for AI context if body is empty)
            const metaDescription = $('meta[name="description"]').attr('content') || "";
            const title = $('title').text() || "";
            
            // Remove junk
            $('script, style, nav, footer, header, iframe, noscript').remove();
            
            // Extract body text
            let bodyText = $('body').text().replace(/\s+/g, ' ').trim();
            
            allData = `Title: ${title}\nDescription: ${metaDescription}\nContent: ${bodyText}`;
            
            if (allData.length > 200) {
                console.log("[Scraper] Axios scrape successful. Length:", allData.length);
                // Continue to RAG processing
            } else {
                console.log("[Scraper] Axios content too short, will try browser...");
                allData = ""; // Reset to trigger browser
            }
        }
    } catch (axiosError) {
        console.log("[Scraper] Axios method failed:", axiosError.message);
    }

    // --- STRATEGY 2: BROWSER (Fallback for SPAs) ---
    if (!allData) {
        let browser;
        try {
            if (config.NODE_ENV === 'production') {
                const graphicsPath = path.join(process.cwd(), '.chromium-bin');
                const executablePath = await chromium.executablePath(graphicsPath);
                browser = await puppeteerCore.launch({
                    args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--single-process'],
                    executablePath: executablePath,
                    headless: chromium.headless,
                });
            } else {
                browser = await puppeteer.launch({
                    headless: "new",
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });
            }

            const page = await browser.newPage();
            console.log("[Scraper] Browser launched. Scraping page...");
            const text = await scrapePage(page, url);
            allData = text;
            await browser.close();
        } catch (browserError) {
            console.error("[Scraper] BROWSER ALSO FAILED:", browserError.message);
        }
    }

    if (!allData || allData.length < 50) {
        console.warn("[Scraper] FINAL WARNING: Scraped data is very short.");
        // If everything else failed, just return a fallback description so it doesn't crash
        allData = `Content for ${url} could not be fully extracted due to bot protection or SPA architecture. Please visit the site directly for more info.`;
    }

    await rag(allData, url);
    console.log("[Scraper] RAG Indexing started...");
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    return await getReleventdata(url);
}

async function scrapePage(page, url) {
    await page.goto(url, {
        waitUntil: "networkidle2"
    });

    await page.evaluate(() => {
        const tags = [
            "h1", "h2", "h3", "h4", "h5", "h6",
            "p",
            "a",
            "li",
            "span",
            "strong",
            "em",
            "b",
            "i",
            "button",
            "label",
            "small",
            "blockquote",
            "caption",
            "figcaption",
            "summary",
            "form",
            "input",
            "textarea",
            "option",
            "select"
        ];

        const content = [];

        tags.forEach(tag => {
            document.querySelectorAll(tag).forEach(el => {
                const text = el.innerText.trim();
                if (text) {
                    content.push(`<${tag}>${text}</${tag}>`);
                }
            });
        });

        ["script", "style", "img", "svg", "noscript", "iframe"].forEach(tag => {
            document.querySelectorAll(tag).forEach(el => el.remove());
        });
        document.querySelectorAll("*").forEach(el => {
            el.removeAttribute("class");
            el.removeAttribute("style");
        });
    });

    const text = await page.evaluate(() => document.body.innerText);
    console.log(text);
    return text;
}

module.exports = { scrape };