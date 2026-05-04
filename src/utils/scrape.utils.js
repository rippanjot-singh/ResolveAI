const puppeteer = require("puppeteer");
const puppeteerCore = require("puppeteer-core");
const chromium = require("@sparticuz/chromium");
const cheerio = require("cheerio");
const axios = require("axios");
const { rag, getReleventdata } = require("../services/rag.service");
const config = require("../config/config");
const path = require("path");

async function scrape(url) {
    let browser;
    let allData = "";

    try {
        if (config.NODE_ENV === 'production') {
            console.log("[Scraper] Using production chromium settings...");
            
            // Attempt to force a local execution path
            const graphicsPath = path.join(process.cwd(), '.chromium-bin');
            const executablePath = await chromium.executablePath(graphicsPath);
            
            browser = await puppeteerCore.launch({
                args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--single-process'],
                defaultViewport: chromium.defaultViewport,
                executablePath: executablePath,
                headless: chromium.headless,
            });
        } else {
            console.log("[Scraper] Using local puppeteer settings...");
            browser = await puppeteer.launch({
                headless: "new",
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }

        const page = await browser.newPage();
        console.log("Scraping with Browser: " + url);

        try {
            console.log("Attempting sitemap scrape: " + url + "/sitemap.xml");
            
            let sitemap = "";
            try {
                const response = await axios.get(url + "/sitemap.xml", { timeout: 5000 });
                sitemap = response.data;
                console.log("[Scraper] Sitemap fetched via Axios.");
            } catch (e) {
                await page.goto(url + "/sitemap.xml", { waitUntil: "networkidle2", timeout: 10000 });
                sitemap = await page.content();
            }

            const $ = cheerio.load(sitemap, { xmlMode: true });
            const urls = [];
            $("loc").each((i, el) => {
                if (urls.length >= 5) return false;
                const link = $(el).text().trim();
                if (link) urls.push(link);
            });

            if (urls.length > 0) {
                for (const sUrl of urls) {
                    try {
                        const text = await scrapePage(page, sUrl);
                        allData += text + "\n";
                    } catch (e) {
                        console.log(`Failed browser scrape for ${sUrl}: ${e.message}`);
                    }
                }
            } else {
                const text = await scrapePage(page, url);
                allData += text;
            }
        } catch (error) {
            const text = await scrapePage(page, url);
            allData += text;
        }

        await browser.close();

    } catch (launchError) {
        console.error("[Scraper] BROWSER LAUNCH FAILED. Falling back to Pure Node Scrape:", launchError.message);
        
        // --- PURE NODE FALLBACK (No Browser Required) ---
        try {
            console.log("[Scraper] Fetching homepage with Axios...");
            const response = await axios.get(url, { 
                timeout: 10000,
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' }
            });
            const $ = cheerio.load(response.data);
            
            // Basic text extraction from common tags
            $('script, style, nav, footer, header').remove();
            allData = $('body').text().replace(/\s+/g, ' ').trim();
            console.log("[Scraper] Axios fallback successful. Length:", allData.length);
        } catch (axiosError) {
            console.error("[Scraper] Axios fallback also failed:", axiosError.message);
            throw new Error("Website scraping failed: All methods exhausted.");
        }
    }

    if (!allData || allData.length < 50) {
        throw new Error("Scraped data too short or empty.");
    }

    await rag(allData, url);
    console.log("Waiting for Pinecone to index...");
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