import aiohttp
from .crawler import Crawler
from .checks import RulesEvaluator, SpecialChecks

class Scanner:
    """Coordinates the scan for a single website."""
    
    def __init__(self, rules: list, crawler_settings: dict):
        self.rules = rules
        self.crawler = Crawler(
            max_pages=crawler_settings.get('max_pages', 10),
            max_js_files=crawler_settings.get('max_js_files', 10),
            timeout=crawler_settings.get('timeout', 10)
        )

    async def scan_site(self, base_url: str) -> list:
        """Runs all checks on a given site and returns a list of results."""
        results = []
        
        # 1. SPECIAL CHECKS first (HTTPS)
        res_https = SpecialChecks.check_https(base_url)
        results.append({"site": base_url, "check": "HTTPS Check", "status": res_https[0], "details": res_https[1]})
        
        # 2. CRAWL SITE
        crawl_results = await self.crawler.crawl_site(base_url)
        
        if crawl_results["status"] == "ERROR":
            status_msg = crawl_results["pages"].get(base_url.rstrip('/'), "Connection failed")
            results.append({"site": base_url, "check": "Site Accessibility", "status": "ERROR", "details": status_msg})
            return results

        # 3. SPECIAL CHECKS requiring network (Sitemap, Robots)
        async with aiohttp.ClientSession(headers=self.crawler.session_headers) as session:
            s_status, s_detail = await SpecialChecks.check_sitemap(session, base_url)
            results.append({"site": base_url, "check": "SITEMAP", "status": s_status, "details": s_detail})
            
            r_status, r_detail = await SpecialChecks.check_robots(session, base_url)
            results.append({"site": base_url, "check": "ROBOTS", "status": r_status, "details": r_detail})

        # 4. RULE-BASED SCANNING
        # Combine all HTML and JS content for general scanning
        combined_content = ""
        for page_html in crawl_results["pages"].values():
            combined_content += page_html
        for js_content in crawl_results["scripts"].values():
            combined_content += js_content
            
        for rule in self.rules:
            status, detail = RulesEvaluator.evaluate(combined_content, rule)
            results.append({
                "site": base_url,
                "check": rule['name'],
                "status": status,
                "details": detail
            })
            
        return results
