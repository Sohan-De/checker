import csv
import os
from colorama import init, Fore, Style

# Initialize colorama for Windows
init(autoreset=True)

class Reporter:
    """Handles terminal output and CSV report generation."""
    
    def __init__(self, output_dir: str):
        self.output_dir = output_dir
        self.csv_path = os.path.join(output_dir, 'report.csv')
        
    def print_site_header(self, site: str):
        print(f"\n{Style.BRIGHT}Scanning {site}...")

    def print_result(self, result: dict):
        status = result['status']
        check_name = result['check']
        
        color = Fore.WHITE
        if status == "PASS":
            color = Fore.GREEN
        elif status == "FAIL":
            color = Fore.RED
        elif status == "WARNING":
            color = Fore.YELLOW
        elif status == "ERROR":
            color = Fore.RED
            
        print(f"{check_name}: {color}{status}{Style.RESET_ALL}")

    def save_to_csv(self, all_results: list):
        """Save results to CSV file."""
        if not os.path.exists(self.output_dir):
            os.makedirs(self.output_dir)
            
        keys = ["site", "check", "status", "details"]
        with open(self.csv_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=keys)
            writer.writeheader()
            for site_results in all_results:
                writer.writerows(site_results)
        
        print(f"\n{Style.BRIGHT}Report saved to: {self.csv_path}")

    def print_summary(self, total_sites: int, duration: float):
        print(f"\n{Style.BRIGHT}{'='*40}")
        print(f"{Style.BRIGHT}Scan Complete!")
        print(f"Total Sites Scanned: {total_sites}")
        print(f"Total Duration: {duration:.2f} seconds")
        print(f"{Style.BRIGHT}{'='*40}")
