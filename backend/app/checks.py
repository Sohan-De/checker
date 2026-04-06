import re
import aiohttp
from typing import List, Dict
from bs4 import BeautifulSoup
from urllib.parse import urlparse

class RulesEvaluator:
    """Evaluates generic patterns against HTML and JS content."""
    
    @staticmethod
    def evaluate(content: str, rule: dict) -> tuple:
        """Evaluates a rule on content. Returns (status, detail)."""
        name = rule['name']
        rule_type = rule['type']
        pattern = rule['pattern']
        
        if isinstance(pattern, list):
            found = any(p.lower() in content.lower() for p in pattern)
            pattern_str = " | ".join(pattern)
        else:
            found = pattern.lower() in content.lower()
            pattern_str = pattern
        
        if rule_type == 'fail_if_found':
            if found:
                return "FAIL", f"{name} found pattern '{pattern_str}'"
            return "PASS", "-"
        
        if rule_type == 'fail_if_missing':
            if not found:
                return "FAIL", f"{name} missing pattern '{pattern_str}'"
            return "PASS", "-"
            
        if rule_type == 'warn_if_missing':
            if not found:
                return "WARNING", f"{name} missing pattern '{pattern_str}'"
            return "PASS", "-"
            
        return "UNKNOWN", f"Invalid rule type: {rule_type}"

class SpecialChecks:
    """Implements non-pattern checks like Sitemap, Robots, and HTTPS."""
    
    @staticmethod
    async def check_sitemap(session: aiohttp.ClientSession, base_url: str) -> tuple:
        """Verify sitemap exists."""
        sitemap_url = f"{base_url.rstrip('/')}/sitemap.xml"
        try:
            async with session.get(sitemap_url) as response:
                if response.status == 200:
                    return "PASS", "-"
                return "FAIL", f"Sitemap returned HTTP {response.status}"
        except Exception as e:
            return "FAIL", f"Sitemap error: {str(e)}"

    @staticmethod
    async def check_robots(session: aiohttp.ClientSession, base_url: str) -> tuple:
        """Verify robots.txt isn't blocking everything."""
        robots_url = f"{base_url.rstrip('/')}/robots.txt"
        try:
            async with session.get(robots_url) as response:
                if response.status == 200:
                    text = await response.text()
                    if "Disallow: /" in text and "Disallow: / " not in text.split('\n'):
                        # Simplistic check for Disallow: /
                        # Real robots parsing is complex, but the requirement is simple.
                        for line in text.split('\n'):
                            if line.strip().lower() == "disallow: /":
                                return "FAIL", "Disallow: / found in robots.txt"
                    return "PASS", "-"
                return "PASS", "No robots.txt found (Warning: optional but recommended)"
        except Exception as e:
            return "WARNING", f"Robots.txt error: {str(e)}"

    @staticmethod
    def check_https(base_url: str) -> tuple:
        """Verify the site uses HTTPS."""
        if base_url.startswith('https://'):
            return "PASS", "-"
        return "FAIL", "Site does not use HTTPS"
