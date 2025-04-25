const fs = require('fs');
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');

const BASE_URL = "https://love-games1.net";
const SAVE_DIR = "results";
const LOG_FILE = "info.txt";
const TOTAL_PAGES = 144;
const HEADERS = { "User-Agent": "Mozilla/5.0" };

if (!fs.existsSync(SAVE_DIR)) fs.mkdirSync(SAVE_DIR, { recursive: true });

const agent = new https.Agent({ rejectUnauthorized: false });

async function loadHTML(url) {
    try {
        const response = await axios.get(url, { headers: HEADERS, httpsAgent: agent });
        return cheerio.load(response.data);
    } catch (error) {
        if (error.response?.status === 503) return cheerio.load("");
        throw error;
    }
}

async function getGameLinksFromPage(pageUrl) {
    const $ = await loadHTML(pageUrl);
    return $('a[href^="/load/igry_dlja_konsolej/igry_dlja_playstation_4/"]')
        .map((_, el) => $(el).attr('href'))
        .get()
        .filter(href => href?.includes("42-"))
        .map(href => new URL(href, BASE_URL).href);
}

function parseMetadata($) {
    const keys = [
        "Year of issue", "Genre", "Disk code", "Game Version",
        "Minimum firmware version", "Interface language", "voice language"
    ];
    return keys.reduce((metadata, key) => ({
        ...metadata,
        [key]: $(`*:contains("${key}:")`).next().text().trim() || "N/A"
    }), {});
}

async function fetchGameInfo(gameUrl) {
    const $ = await loadHTML(gameUrl);
    const title = $('h1').text().trim();
    const filename = title
        ? title.replace(/\s+/g, "-").replace(/[^\w.-]/g, "") + ".torrent"
        : "unknown-title.torrent";
    const torrentLink = $('a[href^="/load/0-0-0-"]').attr('href');
    return {
        title: title || "Unknown Title",
        filename,
        torrentUrl: torrentLink ? new URL(torrentLink, BASE_URL).href : null,
        metadata: parseMetadata($)
    };
}

async function saveTorrent(torrentUrl, filename, metadata) {
    const filepath = path.join(SAVE_DIR, filename);
    if (fs.existsSync(filepath)) {
        console.log(`Skipped (already exists): ${filename}`);
        return;
    }

    const response = await axios.get(torrentUrl, { headers: HEADERS, httpsAgent: agent, responseType: 'stream' });
    const writer = fs.createWriteStream(filepath);
    response.data.pipe(writer);
    await new Promise(resolve => writer.on('finish', resolve));

    const logEntry = [
        `Game Name: ${metadata["Game Name"]}`,
        ...Object.entries(metadata).map(([key, value]) => `${key}: ${value}`),
        `Saved As: ${filepath}`,
        `${'-'.repeat(50)}`
    ].join('\n');
    fs.appendFileSync(LOG_FILE, logEntry);

    console.log(`Downloaded: ${filename}`);
}

async function processSingleGamePage(gameUrl) {
    const { title, filename, torrentUrl, metadata } = await fetchGameInfo(gameUrl);
    metadata["Game Name"] = title;
    if (torrentUrl) {
        await saveTorrent(torrentUrl, filename, metadata);
    }
}

async function main() {
    for (let page = 1; page <= TOTAL_PAGES; page++) {
        const suffix = page > 1 ? `42-${page}` : "42";
        const pageUrl = `${BASE_URL}/load/igry_dlja_konsolej/igry_dlja_playstation_4/${suffix}`;
        const gameLinks = await getGameLinksFromPage(pageUrl);
        await Promise.all(gameLinks.map(processSingleGamePage));
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
}

main();