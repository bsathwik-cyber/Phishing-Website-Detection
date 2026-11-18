from urllib.parse import urlparse
import ipaddress
import math
import re

def extract_features(url):
    """
    Extracts 15 key features from a URL for machine learning prediction.
    """
    url = url.strip()
    
    # Ensure protocol is present for urlparse, default to http if not present
    parsed_url = url
    if not (url.startswith('http://') or url.startswith('https://')):
        parsed_url = 'http://' + url
        
    try:
        parsed = urlparse(parsed_url)
        # Use the parsed hostname rather than netloc so user-info and ports
        # are not mistaken for part of the registered host.
        domain = parsed.hostname or ""
        path = parsed.path
        query = parsed.query
    except Exception:
        # Fallback if URL parsing fails
        domain = ""
        path = ""
        query = ""

    # 1. URL Length
    url_len = len(url)
    
    # 2. Domain Length
    domain_len = len(domain)
    
    # 3. Number Of Dots
    dots_count = url.count('.')
    
    # 4. Number Of Hyphens
    hyphens_count = url.count('-')
    
    # 5. Number Of Digits
    digits_count = sum(c.isdigit() for c in url)
    
    # 6. Number Of Subdomains
    domain_parts = domain.split('.')
    if len(domain_parts) > 2:
        subdomains_count = max(0, len(domain_parts) - 2)
        if "www" in domain_parts:
            subdomains_count = max(0, subdomains_count - 1)
    else:
        subdomains_count = 0
        
    # 7. HTTPS Present
    https_present = 1 if url.startswith('https://') else 0
    
    # 8. IP Address Usage (IPv4 or IPv6)
    try:
        ipaddress.ip_address(domain)
        ip_present = 1
    except ValueError:
        ip_present = 0
    
    # 9. Suspicious Keywords Count
    keywords = ["login", "signin", "verify", "secure", "bank", "update", "account", 
                "support", "billing", "free", "bonus", "gift", "card", "service", 
                "safety", "alert", "recover", "limited", "wallet", "crypto"]
    keywords_count = sum(1 for kw in keywords if kw in url.lower())
    
    # 10. Special Character Count
    special_chars = ['?', '=', '&', '_', '%']
    special_chars_count = sum(url.count(c) for c in special_chars)
    
    # 11. Redirect Count
    # Count occurrence of redirect parameters + presence of multiple slashes inside path/query
    redirect_kw = ["redirect", "url", "link", "to", "goto", "destination"]
    redirect_kw_count = sum(1 for kw in redirect_kw if kw in query.lower())
    # Count repeated slashes in the parsed path, not in the protocol separator.
    double_slash_count_after_proto = path.count('//')
    redirect_count = redirect_kw_count + double_slash_count_after_proto
    
    # 12. Presence Of @
    at_present = 1 if '@' in url else 0
    
    # 13. Presence Of Double Slash
    double_slash_present = 1 if double_slash_count_after_proto > 0 else 0
    
    # 14. Entropy Score
    # Shannon Entropy of the URL string (measures randomness)
    entropy = 0.0
    if len(url) > 0:
        entropy = -sum((url.count(c)/len(url)) * math.log2(url.count(c)/len(url)) for c in set(url))
        
    # 15. TLD Risk Score
    tld_risk = 0.5 # default risk
    if len(domain_parts) >= 2:
        tld = "." + domain_parts[-1].lower()
        high_risk_tlds = {
            ".xyz": 0.9, ".top": 0.9, ".click": 0.8, ".fit": 0.8, ".info": 0.7, 
            ".gq": 0.9, ".cf": 0.9, ".ml": 0.9, ".cc": 0.6, ".icu": 0.8, 
            ".work": 0.7, ".live": 0.6, ".today": 0.6, ".tk": 0.8, ".ga": 0.8
        }
        medium_risk_tlds = {
            ".com": 0.3, ".net": 0.4, ".org": 0.2, ".co": 0.4, ".uk": 0.3, 
            ".us": 0.3, ".ca": 0.3, ".de": 0.2, ".in": 0.4, ".io": 0.4
        }
        low_risk_tlds = {
            ".gov": 0.05, ".edu": 0.05, ".mil": 0.05, ".int": 0.1
        }
        
        if tld in high_risk_tlds:
            tld_risk = high_risk_tlds[tld]
        elif tld in medium_risk_tlds:
            tld_risk = medium_risk_tlds[tld]
        elif tld in low_risk_tlds:
            tld_risk = low_risk_tlds[tld]
            
    return {
        "url_length": url_len,
        "domain_length": domain_len,
        "dots_count": dots_count,
        "hyphens_count": hyphens_count,
        "digits_count": digits_count,
        "subdomains_count": subdomains_count,
        "https_present": https_present,
        "ip_present": ip_present,
        "keywords_count": keywords_count,
        "special_chars_count": special_chars_count,
        "redirect_count": redirect_count,
        "at_present": at_present,
        "double_slash_present": double_slash_present,
        "entropy_score": round(entropy, 4),
        "tld_risk_score": tld_risk
    }
