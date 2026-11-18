import os
import re
import pickle
import json
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.utils import secure_filename

# Import database and ML modules
from database import init_db, save_scan, save_scans_bulk, get_history, get_stats
from feature_extractor import extract_features

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 1 * 1024 * 1024  # Limit uploaded batch files to 1 MiB

# Configure CORS - allow localhost:3000 (standard Next.js default)
CORS(app, resources={r"/api/*": {"origins": ["http://localhost:3000", "http://127.0.0.1:3000"]}})

# Configure Rate Limiting
limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    default_limits=["500 per day", "100 per hour"]
)

# Global variables to hold model and metrics
MODEL = None
METRICS = None
FEATURE_NAMES = []

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BACKEND_DIR, "model", "phishing_model.pkl")
METRICS_PATH = os.path.join(BACKEND_DIR, "model", "model_metrics.json")

def load_ml_model():
    """Load locally generated model artifacts, training when they are absent.

    Pickle files can execute code when loaded. Only load model artifacts that
    were generated locally by this project or obtained from a trusted source.
    """
    global MODEL, METRICS, FEATURE_NAMES
    MODEL = None
    METRICS = None
    FEATURE_NAMES = []

    if not os.path.exists(MODEL_PATH):
        print("Model file not found. Training the local Random Forest model...")
        try:
            import train_model
            train_model.main()
        except Exception as train_err:
            message = f"Model training failed: {train_err}"
            print(message)
            METRICS = {"status": "unavailable", "message": message}
            return

    if not os.path.exists(MODEL_PATH) or not os.path.exists(METRICS_PATH):
        METRICS = {
            "status": "unavailable",
            "message": "Model artifacts are missing. Run python train_model.py from the backend directory."
        }
        return

    try:
        with open(MODEL_PATH, "rb") as model_file:
            MODEL = pickle.load(model_file)

        with open(METRICS_PATH, "r", encoding="utf-8") as metrics_file:
            METRICS = json.load(metrics_file)

        FEATURE_NAMES = METRICS.get("feature_names", [])
        if not FEATURE_NAMES and hasattr(MODEL, "feature_names_in_"):
            FEATURE_NAMES = list(MODEL.feature_names_in_)

        print("Random Forest model and evaluation metrics loaded.")
    except Exception as load_error:
        MODEL = None
        METRICS = {
            "status": "unavailable",
            "message": f"Could not load local model artifacts: {load_error}"
        }
        print(METRICS["message"])

# URL Validation Helper
def is_valid_url(url):
    """
    Checks if a URL has a valid structure, supporting standard domains, IP addresses, and localhost.
    """
    if not url:
        return False
        
    # Standard domain regex
    domain_pattern = re.compile(
        r'^(https?://)?'  # protocol (optional)
        r'([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}'  # domain with TLD
        r'(:\d+)?'  # port (optional)
        r'(/.*)?$'  # path (optional)
    )
    
    # IPv4 address regex
    ip_pattern = re.compile(
        r'^(https?://)?'  # protocol (optional)
        r'(?:\d{1,3}\.){3}\d{1,3}'  # IP octets
        r'(:\d+)?'  # port (optional)
        r'(/.*)?$'  # path (optional)
    )
    
    # Localhost regex
    localhost_pattern = re.compile(
        r'^(https?://)?'  # protocol (optional)
        r'localhost'  # localhost
        r'(:\d+)?'  # port (optional)
        r'(/.*)?$'  # path (optional)
    )
    
    return bool(domain_pattern.match(url) or ip_pattern.match(url) or localhost_pattern.match(url))

def sanitize_url(url):
    """
    Sanitizes URL input by removing whitespaces and control characters.
    """
    if not url:
        return ""
    # Strip whitespaces and control characters
    url = url.strip()
    url = re.sub(r'[\r\n\t]', '', url)
    return url

def get_prediction_details(url):
    """
    Runs URL through the model and computes risk category, confidence, and security recommendations.
    Includes a heuristic rules fallback if the ML model is not loaded.
    """
    # Extract features
    features = extract_features(url)
    
    # 1. Prediction using Model if loaded, else use heuristic rules fallback
    if MODEL is not None:
        try:
            # Convert feature dict into DataFrame with correct column order
            input_data = pd.DataFrame([features])[FEATURE_NAMES]
            # Predict probabilities (class 0: Safe, class 1: Phishing)
            probabilities = MODEL.predict_proba(input_data)[0]
            p_phish = probabilities[1]
        except Exception as e:
            print(f"Error predicting with ML model: {str(e)}. Falling back to heuristic rules.")
            p_phish = calculate_heuristic_risk(features)
    else:
        p_phish = calculate_heuristic_risk(features)
        
    # Determine Category, Confidence, and Risk Level
    # We map the continuous probability space to 3 categories:
    # p_phish < 0.35 -> Safe, Low Risk
    # 0.35 <= p_phish < 0.65 -> Suspicious, Medium Risk
    # p_phish >= 0.65 -> Phishing, High Risk
    if p_phish < 0.35:
        prediction = "Safe"
        confidence = (1 - p_phish) * 100
        risk_level = "Low"
        recommendations = [
            "This URL is classified as Safe. The URL features match standard trustworthy domains.",
            "Verify the connection has a valid SSL certificate (HTTPS indicator in address bar).",
            "Always inspect the domain name spelling to avoid lookalike domains (typosquatting).",
            "Continue using standard browser protection and verify authentication pages before entering passwords."
        ]
    elif p_phish < 0.65:
        prediction = "Suspicious"
        confidence = max(p_phish, 1 - p_phish) * 100
        risk_level = "Medium"
        recommendations = [
            "This URL is flagged as Suspicious. It exhibits features commonly seen in phishing attempts (e.g., suspicious keywords or special character counts).",
            "DO NOT enter passwords, credit card numbers, or personal details on this webpage.",
            "If this link was received via email, SMS, or chat, verify the identity of the sender through an independent channel.",
            "Inspect the domain name carefully. Check if it is a subdomain of an unfamiliar top-level domain."
        ]
    else:
        prediction = "Phishing"
        confidence = p_phish * 100
        risk_level = "High"
        recommendations = [
            "DANGER: This URL is classified as Phishing! It strongly exhibits signature patterns of malicious spoofed sites.",
            "CLOSE the browser tab immediately to protect your session.",
            "DO NOT download any files, click links, or fill out forms on this website.",
            "If you entered credentials, change your passwords on the real website immediately and enable Two-Factor Authentication (2FA)."
        ]
        
    return {
        "prediction": prediction,
        "probability_score": round(p_phish, 4),
        "confidence": round(confidence, 2),
        "risk_level": risk_level,
        "features": features,
        "recommendations": recommendations
    }

def calculate_heuristic_risk(features):
    """
    Computes heuristic phishing probability based on URL features as a fallback classifier.
    """
    p_phish = 0.1
    
    # Feature weights mirroring model characteristics
    if features.get("tld_risk_score", 0.5) > 0.6:
        p_phish += 0.35
    elif features.get("tld_risk_score", 0.5) < 0.2:
        p_phish -= 0.1
        
    if features.get("keywords_count", 0) > 0:
        p_phish += min(0.4, 0.2 * features["keywords_count"])
        
    if features.get("ip_present", 0) > 0:
        p_phish += 0.45
        
    if features.get("at_present", 0) > 0:
        p_phish += 0.35
        
    if features.get("double_slash_present", 0) > 0:
        p_phish += 0.25
        
    if features.get("hyphens_count", 0) > 2:
        p_phish += 0.15
        
    if features.get("url_length", 0) > 75:
        p_phish += 0.15
        
    if features.get("https_present", 1) == 0:
        p_phish += 0.15
        
    return min(0.99, max(0.01, p_phish))

# --- ENDPOINTS ---

@app.route("/api/predict", methods=["POST"])
@limiter.limit("60 per minute")
def predict_single():
    """
    Endpoint for Single URL Scan.
    """
    try:
        data = request.get_json()
        if not data or "url" not in data:
            return jsonify({"error": "No URL provided in request body."}), 400
            
        raw_url = data["url"]
        url = sanitize_url(raw_url)
        
        if not url:
            return jsonify({"error": "URL cannot be empty."}), 400
            
        if not is_valid_url(url):
            return jsonify({"error": "Invalid URL structure. Please enter a valid URL (e.g., https://example.com)."}), 400
            
        # Get predictions
        res = get_prediction_details(url)
        
        # Save to database
        save_scan(url, res["prediction"], res["confidence"], res["risk_level"])
        
        return jsonify({
            "url": url,
            "prediction": res["prediction"],
            "probability_score": res["probability_score"],
            "confidence": res["confidence"],
            "risk_level": res["risk_level"],
            "features": res["features"],
            "recommendations": res["recommendations"]
        })
        
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/api/bulk-predict", methods=["POST"])
@limiter.limit("20 per minute")
def predict_bulk():
    """
    Endpoint for Bulk URL Scan (via CSV or TXT file upload).
    Does not drop invalid URLs but returns them with an "Invalid" state.
    Saves valid scans to the database in a single batch insert.
    """
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded in the request."}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected."}), 400
            
        filename = secure_filename(file.filename)
        file_ext = os.path.splitext(filename)[1].lower()
        
        if file_ext not in ['.csv', '.txt']:
            return jsonify({"error": "Unsupported file format. Please upload a .csv or .txt file."}), 400
            
        urls_with_labels = []
        
        if file_ext == '.csv':
            try:
                df = pd.read_csv(file)
                url_col = None
                for col in df.columns:
                    if 'url' in col.lower():
                        url_col = col
                        break
                
                if url_col is None:
                    url_col = df.columns[0]
                    
                label_col = None
                for col in df.columns:
                    if any(x in col.lower() for x in ['label', 'actual', 'class', 'target', 'ground_truth']):
                        label_col = col
                        break
                        
                for _, row in df.iterrows():
                    u = row[url_col]
                    if pd.isna(u):
                        continue
                    u = str(u).strip()
                    act = str(row[label_col]).strip() if (label_col is not None and not pd.isna(row[label_col])) else None
                    urls_with_labels.append((u, act))
            except Exception as csv_err:
                return jsonify({"error": f"Failed to parse CSV file: {str(csv_err)}"}), 400
        else:
            try:
                content = file.read().decode("utf-8")
                for line in content.splitlines():
                    line = line.strip()
                    if line:
                        urls_with_labels.append((line, None))
            except Exception as txt_err:
                return jsonify({"error": f"Failed to parse TXT file: {str(txt_err)}"}), 400
                
        if not urls_with_labels:
            return jsonify({"error": "The uploaded file is empty."}), 400
            
        results = []
        valid_scans_to_save = []
        
        # Process each URL (limit to 500 for safety and performance)
        for u, act in urls_with_labels[:500]:
            san_u = sanitize_url(u)
            if not san_u:
                continue
                
            if is_valid_url(san_u):
                # Run standard prediction
                res = get_prediction_details(san_u)
                
                # Append to bulk database insert queue
                valid_scans_to_save.append({
                    "url": san_u,
                    "prediction": res["prediction"],
                    "confidence": res["confidence"],
                    "risk_level": res["risk_level"],
                    "actual_label": act
                })
                
                results.append({
                    "url": san_u,
                    "prediction": res["prediction"],
                    "confidence": res["confidence"],
                    "risk_level": res["risk_level"]
                })
            else:
                # For invalid URLs, report back as "Invalid" to frontend instead of failing
                results.append({
                    "url": san_u,
                    "prediction": "Invalid",
                    "confidence": 0.0,
                    "risk_level": "N/A"
                })
                
        # Batch save all valid scans to SQLite database in one transaction
        if valid_scans_to_save:
            save_scans_bulk(valid_scans_to_save)
            
        return jsonify({
            "total_submitted": len(urls_with_labels),
            "total_processed": len(results),
            "results": results
        })
        
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/api/history", methods=["GET"])
def get_scan_history():
    """
    Endpoint to fetch paginated, searchable, and sortable scan history.
    """
    try:
        search_query = request.args.get("search", None)
        sort_by = request.args.get("sortBy", "timestamp")
        order = request.args.get("order", "DESC")
        limit = int(request.args.get("limit", 10))
        page = int(request.args.get("page", 1))
        
        offset = (page - 1) * limit
        
        history_data = get_history(
            search_query=search_query,
            sort_by=sort_by,
            order=order,
            limit=limit,
            offset=offset
        )
        
        return jsonify({
            "history": history_data["scans"],
            "total_count": history_data["total_count"],
            "page": page,
            "limit": limit,
            "total_pages": max(1, (history_data["total_count"] + limit - 1) // limit)
        })
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/api/stats", methods=["GET"])
def get_dashboard_stats():
    """
    Endpoint to retrieve dashboard metrics.
    """
    try:
        stats = get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/api/model-metrics", methods=["GET"])
def get_model_performance():
    """
    Endpoint to fetch metrics JSON from trained model.
    """
    try:
        if METRICS is None:
            load_ml_model()
        return jsonify(METRICS or {
            "status": "unavailable",
            "message": "Model metrics have not been generated yet."
        })
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# --- NEW DASHBOARD API ENDPOINTS ---

@app.route("/api/dashboard/stats", methods=["GET"])
def get_dashboard_stats_realtime():
    """
    Returns real-time counts, rates, averages, trends, and distribution from database.
    """
    try:
        stats = get_stats()
        
        # Calculate detection rate (Suspicious + Phishing / Total Scans) in %
        total = stats["total_scanned"]
        threat_count = stats["suspicious_count"] + stats["phishing_count"]
        detection_rate = round((threat_count / total * 100), 2) if total > 0 else 0.0
        
        return jsonify({
            "totalScans": total,
            "safe": stats["safe_count"],
            "suspicious": stats["suspicious_count"],
            "phishing": stats["phishing_count"],
            "avgConfidence": stats["avg_confidence"],
            "detectionRate": detection_rate,
            "latestScanTimestamp": stats.get("latest_scan_timestamp"),
            "trends": stats["trends"],
            "distribution": stats["distribution"]
        })
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/api/dashboard/feature-importance", methods=["GET"])
def get_dashboard_feature_importance():
    """
    Returns relative feature importances calculated directly from the trained model.
    """
    try:
        if METRICS is None:
            load_ml_model()
        return jsonify({
            "feature_importances": (METRICS or {}).get("feature_importances", {})
        })
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

@app.route("/api/dashboard/confusion-matrix", methods=["GET"])
def get_dashboard_confusion_matrix():
    """
    Returns dynamic confusion matrix computed from SQLite user scans with known labels.
    """
    try:
        from database import get_db_confusion_matrix
        matrix = get_db_confusion_matrix()
        return jsonify(matrix)
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500

# Error Handler
@app.errorhandler(413)
def payload_too_large(e):
    return jsonify({"error": "Uploaded file is too large. The maximum allowed size is 1 MiB."}), 413


@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({"error": "Rate limit exceeded. Please try again later."}), 429

# Startup Routine
with app.app_context():
    init_db()
    load_ml_model()

if __name__ == "__main__":
    # Run locally on 5001
    app.run(host="127.0.0.1", port=5001, debug=True)
