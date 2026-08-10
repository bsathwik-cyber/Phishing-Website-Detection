import csv
import random
import os

def generate_safe_urls():
    safe_domains = [
        "google.com", "yahoo.com", "wikipedia.org", "microsoft.com", "apple.com",
        "github.com", "amazon.com", "netflix.com", "linkedin.com", "reddit.com",
        "stackoverflow.com", "zoom.us", "dropbox.com", "salesforce.com", "adobe.com",
        "nytimes.com", "cnn.com", "bbc.co.uk", "medium.com", "spotify.com",
        "instagram.com", "pinterest.com", "tumblr.com", "flickr.com", "vimeo.com",
        "ebay.com", "craigslist.org", "walmart.com", "target.com", "bestbuy.com",
        "etsy.com", "paypal.com", "stripe.com", "chase.com", "wellsfargo.com",
        "bankofamerica.com", "citi.com", "hsbc.com", "tax.gov", "nih.gov",
        "stanford.edu", "mit.edu", "harvard.edu", "berkeley.edu", "ox.ac.uk",
        "nasa.gov", "loc.gov", "weather.gov", "usps.com", "fedex.com"
    ]
    
    # Paths that are standard for safe websites, some containing typical keywords
    paths = [
        "", "/", "/search", "/index.html", "/about", "/contact", "/help", "/faq",
        "/terms", "/privacy", "/docs/intro", "/profile/settings", "/item/12345",
        "/feed", "/explore", "/category/news", "/blog/post-1", "/register",
        "/download/app", "/api/v1/status", "/support/tickets", "/careers"
    ]
    
    # Query parameters that contain digits, symbols, and keywords (common on safe sites too!)
    queries = [
        "",
        "?q=login",
        "?session=active&id=29384",
        "?verify=true&email=user@domain.com",
        "?mode=secure&redirect=true",
        "?ref=google-search&search=bank",
        "?update=billing&card=saved",
        "?action=update&id=9876",
        "?hl=en&authuser=0",
        "?support=ticket&status=open"
    ]
    
    urls = []
    # Generate 2500 unique safe URLs
    for _ in range(2500):
        domain = random.choice(safe_domains)
        path = random.choice(paths)
        query = random.choice(queries)
        
        # Safe subdomains including login, accounts, secure, billing, mail
        if random.random() < 0.25:
            sub = random.choice(["www", "blog", "mail", "docs", "support", "api", "accounts", "login", "secure", "billing", "signin"])
            domain = f"{sub}.{domain}"
            
        # Add domains with hyphens occasionally (e.g. stack-overflow.com, weather-channel.com)
        if random.random() < 0.15:
            domain = domain.replace(".", "-services.", 1) if "." in domain else domain
            
        protocol = "https://" if random.random() < 0.95 else "http://"
        urls.append(f"{protocol}{domain}{path}{query}")
        
    return list(set(urls))

def generate_phishing_urls():
    brand_keywords = ["paypal", "chase", "wellsfargo", "bankofamerica", "netflix", "google", "microsoft", "apple", "amazon", "facebook", "instagram", "dropbox", "yahoo", "stripe"]
    suspicious_keywords = ["login", "signin", "verify", "secure", "bank", "update", "account", "support", "billing", "free", "bonus", "gift", "card", "service", "safety", "alert", "recover", "limited", "wallet", "crypto"]
    tlds = [".xyz", ".top", ".click", ".fit", ".info", ".gq", ".cf", ".ml", ".cc", ".icu", ".work", ".live", ".today"]
    
    ip_addresses = [
        "192.168.1.102", "10.0.0.15", "172.16.254.1", "203.0.113.82", "198.51.100.12", "198.51.100.45",
        "45.22.112.5", "82.165.11.23", "91.198.174.192", "104.244.42.1", "185.220.101.5", "190.2.145.67"
    ]
    
    urls = []
    # Generate 2500 unique phishing URLs
    for _ in range(2500):
        # 1. IP Address usage pattern
        if random.random() < 0.15:
            ip = random.choice(ip_addresses)
            protocol = "http://" if random.random() < 0.8 else "https://"
            path = "/" + "-".join(random.sample(suspicious_keywords, random.randint(1, 3)))
            urls.append(f"{protocol}{ip}{path}")
            continue
            
        # 2. Typosquatting / Brand hijacking / Keyword stuffing
        brand = random.choice(brand_keywords)
        kw = random.sample(suspicious_keywords, random.randint(1, 3))
        
        # Combine brand and keywords with hyphens
        parts = [brand] + kw
        random.shuffle(parts)
        domain_name = "-".join(parts)
        
        # Append suspicious TLD
        tld = random.choice(tlds)
        domain = f"{domain_name}{tld}"
        
        # Multiple subdomains (e.g. login.paypal.com.accounts-verify.xyz)
        if random.random() < 0.3:
            sub = ".".join(random.sample(suspicious_keywords, random.randint(1, 2)))
            domain = f"{sub}.{domain}"
            
        # Path with special characters / parameters
        path = ""
        if random.random() < 0.4:
            path = "/" + random.choice(suspicious_keywords)
            if random.random() < 0.5:
                path += f"?id={random.randint(1000, 99999)}&email={random.choice(suspicious_keywords)}@mail.com"
        
        # Presence of @
        if random.random() < 0.15:
            # http://brand.com@phishing.xyz
            domain = f"{brand}.com@{domain}"
            
        # Presence of double slash in path
        if random.random() < 0.1:
            path = f"/secure//web/{random.choice(suspicious_keywords)}"
            
        # Protocol
        protocol = "http://" if random.random() < 0.65 else "https://"
        
        urls.append(f"{protocol}{domain}{path}")
        
    return list(set(urls))

def main():
    print("Generating synthetic URL dataset...")
    safe_urls = generate_safe_urls()
    phishing_urls = generate_phishing_urls()
    
    # Balance the classes to get exactly 2500/2500
    print(f"Generated {len(safe_urls)} unique safe URLs.")
    print(f"Generated {len(phishing_urls)} unique phishing URLs.")
    
    if len(safe_urls) > 2500:
        safe_urls = random.sample(safe_urls, 2500)
    if len(phishing_urls) > 2500:
        phishing_urls = random.sample(phishing_urls, 2500)
        
    dataset = []
    for url in safe_urls:
        dataset.append((url, 0)) # 0 = Safe
    for url in phishing_urls:
        dataset.append((url, 1)) # 1 = Phishing
        
    # Introduce 3.5% random label noise (flips) to represent realistic annotation errors
    # This prevents the model from achieving a perfect 100% boundary
    noise_rate = 0.035
    flipped_count = 0
    for i in range(len(dataset)):
        if random.random() < noise_rate:
            url, label = dataset[i]
            dataset[i] = (url, 1 - label) # Flip 0 -> 1 or 1 -> 0
            flipped_count += 1
            
    print(f"Injected label noise into {flipped_count} samples ({noise_rate*100}% rate).")
    
    random.shuffle(dataset)
    
    output_path = os.path.join(os.path.dirname(__file__), "dataset.csv")
    with open(output_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["url", "label"])
        writer.writerows(dataset)
        
    print(f"Dataset generated and saved to {output_path} with {len(dataset)} records.")

if __name__ == "__main__":
    main()
