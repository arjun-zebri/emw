/**
 * Crawlers, link previews, monitors and scripts, by the name they give in their user agent. Used
 * to leave them out of vendor views and the site's visitor numbers.
 */
export const BOT_UA =
  /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|headless|lighthouse|pingdom|monitor|curl|wget|python|httpclient|axios|node-fetch|undici|go-http|java\/|okhttp|scrapy|phantom|selenium|puppeteer|playwright|pagerenderer|vercel/i;
