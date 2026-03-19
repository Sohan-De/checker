import json
import os

class ConfigLoader:
    """Loads configuration and rules from JSON and text files."""
    
    def __init__(self, root_dir: str):
        self.root_dir = root_dir
        self.rules_path = os.path.join(root_dir, 'config', 'rules.json')
        self.sites_path = os.path.join(root_dir, 'input', 'sites.txt')

    def load_rules(self) -> dict:
        """Load scanning rules and crawler settings from rules.json."""
        if not os.path.exists(self.rules_path):
            return {"rules": [], "crawler_settings": {}}
        
        with open(self.rules_path, 'r', encoding='utf-8') as f:
            return json.load(f)

    def load_sites(self) -> list:
        """Load the list of sites from sites.txt."""
        if not os.path.exists(self.sites_path):
            return []
        
        with open(self.sites_path, 'r', encoding='utf-8') as f:
            return [line.strip() for line in f if line.strip() and not line.strip().startswith('#')]
