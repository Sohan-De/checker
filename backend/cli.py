import asyncio
import time
import os
import sys

# Add current directory to path for imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from app.config_loader import ConfigLoader
from app.scanner import Scanner
from app.reporter import Reporter

async def main():
    start_time = time.time()
    
    # Paths
    root_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Load config and sites
    config_tool = ConfigLoader(root_dir)
    config_data = config_tool.load_rules()
    sites = config_tool.load_sites()
    
    if not sites:
        print("No sites found in input/sites.txt. Please add URLs to scan.")
        return

    # Initialize components
    rules = config_data.get('rules', [])
    settings = config_data.get('crawler_settings', {})
    scanner = Scanner(rules, settings)
    reporter = Reporter(os.path.join(root_dir, 'reports'))

    print(f"Starting Scan for {len(sites)} sites...\n")

    # Run scans concurrently
    tasks = [scanner.scan_site(site) for site in sites]
    
    # Progress indicator of sorts (just basic printing for now)
    all_site_results = []
    
    # Gather results as they complete to print progress
    for coro in asyncio.as_completed(tasks):
        site_results = await coro
        if site_results:
            reporter.print_site_header(site_results[0]['site'])
            for res in site_results:
                reporter.print_result(res)
            all_site_results.append(site_results)

    # Save and summarize
    reporter.save_to_csv(all_site_results)
    
    end_time = time.time()
    reporter.print_summary(len(sites), end_time - start_time)

if __name__ == "__main__":
    asyncio.run(main())
