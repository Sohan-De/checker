import asyncio
import aiohttp
from bs4 import BeautifulSoup
from urllib.parse import urljoin, urlparse
import logging

class Crawler:
    """Asynchronous crawler to fetch pages and internal JS files."""
    
    def __init__(self, max_pages: int = 10, max_js_files: int = 10, timeout: int = 10):
        self.max_pages = max_pages
        self.max_js_files = max_js_files
        self.timeout = aiohttp.ClientTimeout(total=timeout)
        self.session_headers = {
            'User-Agent': 'SiteLaunchChecker/1.0 (QA Automation Bot)'
        }

    async def fetch(self, session: aiohttp.ClientSession, url: str) -> str:
        """Fetch a single URL and return its text content."""
        try:
            async with session.get(url, timeout=self.timeout) as response:
                if response.status == 200:
                    return await response.text()
                return f"ERROR: HTTP {response.status}"
        except Exception as e:
            return f"ERROR: {str(e)}"

    def extract_internal_links(self, html: str, base_url: str) -> list:
        """Extract all internal links from HTML."""
        soup = BeautifulSoup(html, 'html.parser')
        domain = urlparse(base_url).netloc
        links = set()
        
        for a_tag in soup.find_all('a', href=True):
            href = a_tag['href']
            full_url = urljoin(base_url, href)
            parsed_href = urlparse(full_url)
            
            # Ensure it's the same domain and not a fragment/parameter duplicate
            if parsed_href.netloc == domain:
                clean_url = f"{parsed_href.scheme}://{parsed_href.netloc}{parsed_href.path}"
                if clean_url:
                    links.add(clean_url.rstrip('/'))
        
        return list(links)

    def extract_js_links(self, html: str, base_url: str) -> list:
        """Extract internal JavaScript file links."""
        soup = BeautifulSoup(html, 'html.parser')
        domain = urlparse(base_url).netloc
        js_links = set()
        
        for script in soup.find_all('script', src=True):
            src = script['src']
            full_url = urljoin(base_url, src)
            if urlparse(full_url).netloc == domain:
                js_links.add(full_url)
                
        return list(js_links)

    async def crawl_site(self, base_url: str) -> dict:
        """Crawl up to max_pages of a site and return collected content."""
        results = {
            "pages": {},
            "scripts": {},
            "status": "SUCCESS"
        }
        
        visited = set()
        to_visit = [base_url.rstrip('/')]
        js_to_fetch = set()
        
        async with aiohttp.ClientSession(headers=self.session_headers) as session:
            # Crawl HTML pages
            while to_visit and len(visited) < self.max_pages:
                current_url = to_visit.pop(0)
                if current_url in visited:
                    continue
                
                visited.add(current_url)
                html = await self.fetch(session, current_url)
                
                if html.startswith("ERROR"):
                    if current_url == base_url.rstrip('/'):
                        results["status"] = "ERROR"
                        results["pages"][current_url] = html
                        return results
                    continue
                
                results["pages"][current_url] = html
                
                # Extract new links and JS
                to_visit.extend([l for l in self.extract_internal_links(html, current_url) if l not in visited])
                js_to_fetch.update(self.extract_js_links(html, current_url))
            
            # Fetch JS files (up to limit)
            js_list = list(js_to_fetch)[:self.max_js_files]
            for js_url in js_list:
                js_content = await self.fetch(session, js_url)
                if not js_content.startswith("ERROR"):
                    results["scripts"][js_url] = js_content
                    
        return results
