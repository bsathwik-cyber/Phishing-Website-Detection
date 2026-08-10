import sqlite3
import os
from datetime import datetime

DATABASE_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "phishguard.db")

def get_db_connection():
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Initializes the SQLite database schema.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS scans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                url TEXT NOT NULL,
                prediction TEXT NOT NULL,
                confidence REAL NOT NULL,
                risk_level TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                actual_label TEXT
            )
        """)
        
        # Add actual_label column dynamically to support existing database migrations
        try:
            cursor.execute("ALTER TABLE scans ADD COLUMN actual_label TEXT")
        except sqlite3.OperationalError:
            # Column already exists
            pass
            
        conn.commit()
    finally:
        conn.close()
    print("SQLite Database initialized successfully.")

def save_scan(url, prediction, confidence, risk_level, actual_label=None):
    """
    Saves a single scan record to the database.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        cursor.execute("""
            INSERT INTO scans (url, prediction, confidence, risk_level, timestamp, actual_label)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (url, prediction, float(confidence), risk_level, timestamp, actual_label))
        conn.commit()
        return cursor.lastrowid
    finally:
        conn.close()

def save_scans_bulk(scans_list):
    """
    Saves multiple scan records to the database in a single transaction.
    scans_list is a list of dicts: {"url": str, "prediction": str, "confidence": float, "risk_level": str, "actual_label": str/None}
    """
    if not scans_list:
        return
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        timestamp = datetime.now().isoformat()
        
        # Prepare parameters for executemany
        data_to_insert = []
        for s in scans_list:
            url = s["url"]
            prediction = s["prediction"]
            confidence = float(s["confidence"])
            risk_level = s["risk_level"]
            actual_label = s.get("actual_label", None)
            data_to_insert.append((url, prediction, confidence, risk_level, timestamp, actual_label))
            
        cursor.executemany("""
            INSERT INTO scans (url, prediction, confidence, risk_level, timestamp, actual_label)
            VALUES (?, ?, ?, ?, ?, ?)
        """, data_to_insert)
        conn.commit()
    finally:
        conn.close()

def get_history(search_query=None, sort_by='timestamp', order='DESC', limit=10, offset=0):
    """
    Retrieves scan history with support for search, sorting, and pagination.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # Whitelist sort columns to prevent SQL injection
        valid_sort_columns = {
            'id': 'id',
            'url': 'url',
            'prediction': 'prediction',
            'confidence': 'confidence',
            'risk_level': 'risk_level',
            'timestamp': 'timestamp'
        }
        sort_col = valid_sort_columns.get(sort_by, 'timestamp')
        sort_order = 'DESC' if order.upper() == 'DESC' else 'ASC'
        
        base_query = "FROM scans"
        params = []
        
        if search_query:
            base_query += " WHERE url LIKE ? OR prediction LIKE ? OR risk_level LIKE ?"
            search_pattern = f"%{search_query}%"
            params.extend([search_pattern, search_pattern, search_pattern])
            
        # Count total matching scans for pagination
        count_query = f"SELECT COUNT(*) {base_query}"
        cursor.execute(count_query, params)
        total_count = cursor.fetchone()[0]
        
        # Get paginated scans
        select_query = f"SELECT id, url, prediction, confidence, risk_level, timestamp {base_query} ORDER BY {sort_col} {sort_order} LIMIT ? OFFSET ?"
        query_params = params + [limit, offset]
        cursor.execute(select_query, query_params)
        
        rows = cursor.fetchall()
        scans = []
        for r in rows:
            scans.append({
                "id": r["id"],
                "url": r["url"],
                "prediction": r["prediction"],
                "confidence": r["confidence"],
                "risk_level": r["risk_level"],
                "timestamp": r["timestamp"]
            })
    finally:
        conn.close()
        
    return {
        "scans": scans,
        "total_count": total_count
    }

def get_stats():
    """
    Calculates aggregated analytics for the security dashboard.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        
        # 1. Basic Stats
        cursor.execute("SELECT COUNT(*) FROM scans")
        total_scans = cursor.fetchone()[0]
        
        if total_scans == 0:
            return {
                "total_scanned": 0,
                "safe_count": 0,
                "suspicious_count": 0,
                "phishing_count": 0,
                "avg_confidence": 0.0,
                "latest_scan_timestamp": None,
                "trends": [
                    {
                        "date": datetime.now().strftime("%Y-%m-%d"),
                        "total": 0,
                        "safe": 0,
                        "suspicious": 0,
                        "phishing": 0
                    }
                ],
                "distribution": [
                    {"name": "Safe", "value": 0},
                    {"name": "Suspicious", "value": 0},
                    {"name": "Phishing", "value": 0}
                ]
            }
            
        cursor.execute("SELECT COUNT(*) FROM scans WHERE prediction = 'Safe'")
        safe_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM scans WHERE prediction = 'Suspicious'")
        suspicious_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM scans WHERE prediction = 'Phishing'")
        phishing_count = cursor.fetchone()[0]
        
        cursor.execute("SELECT AVG(confidence) FROM scans")
        avg_confidence = cursor.fetchone()[0] or 0.0
        
        cursor.execute("SELECT timestamp FROM scans ORDER BY id DESC LIMIT 1")
        latest_row = cursor.fetchone()
        latest_scan_timestamp = latest_row[0] if latest_row else None
        
        # 2. Scans over time (Trend Chart)
        trend_query = """
            SELECT 
                substr(timestamp, 1, 10) as scan_date,
                COUNT(*) as total,
                SUM(case when prediction = 'Safe' then 1 else 0 end) as safe,
                SUM(case when prediction = 'Suspicious' then 1 else 0 end) as suspicious,
                SUM(case when prediction = 'Phishing' then 1 else 0 end) as phishing
            FROM scans
            GROUP BY scan_date
            ORDER BY scan_date ASC
            LIMIT 30
        """
        cursor.execute(trend_query)
        trend_rows = cursor.fetchall()
        
        trends = []
        for r in trend_rows:
            trends.append({
                "date": r["scan_date"],
                "total": r["total"],
                "safe": r["safe"],
                "suspicious": r["suspicious"],
                "phishing": r["phishing"]
            })
            
        if not trends:
            trends.append({
                "date": datetime.now().strftime("%Y-%m-%d"),
                "total": total_scans,
                "safe": safe_count,
                "suspicious": suspicious_count,
                "phishing": phishing_count
            })
    finally:
        conn.close()
        
    return {
        "total_scanned": total_scans,
        "safe_count": safe_count,
        "suspicious_count": suspicious_count,
        "phishing_count": phishing_count,
        "avg_confidence": round(avg_confidence, 2),
        "latest_scan_timestamp": latest_scan_timestamp,
        "trends": trends,
        "distribution": [
            {"name": "Safe", "value": safe_count},
            {"name": "Suspicious", "value": suspicious_count},
            {"name": "Phishing", "value": phishing_count}
        ]
    }

def get_db_confusion_matrix():
    """
    Calculates the confusion matrix dynamically based on scans that have a known actual_label.
    Returns a dictionary with tn, fp, fn, tp, or {"insufficient_data": True} if not enough data.
    """
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        # Query all scans where actual_label is populated
        cursor.execute("""
            SELECT prediction, actual_label 
            FROM scans 
            WHERE actual_label IS NOT NULL
        """)
        rows = cursor.fetchall()
        
        if len(rows) < 5:  # Require at least 5 labeled records to compute metrics
            return {"insufficient_data": True}
            
        tn = 0  # Actual Safe (0/"Safe"), Predicted Safe
        fp = 0  # Actual Safe (0/"Safe"), Predicted Phishing/Suspicious
        fn = 0  # Actual Phishing (1/"Phishing"), Predicted Safe
        tp = 0  # Actual Phishing (1/"Phishing"), Predicted Phishing/Suspicious
        
        for r in rows:
            pred = r["prediction"]
            act = str(r["actual_label"]).strip()
            
            # Map actual label: 0, "0", "Safe", "0.0" -> Safe; 1, "1", "Phishing", "1.0" -> Phishing
            is_actual_phish = act in ["1", "1.0", "Phishing", "phishing"]
            is_pred_phish = pred in ["Phishing", "Suspicious"]
            
            if not is_actual_phish:  # Actual Safe
                if not is_pred_phish:  # Predicted Safe
                    tn += 1
                else:  # Predicted Phishing/Suspicious
                    fp += 1
            else:  # Actual Phishing
                if not is_pred_phish:  # Predicted Safe
                    fn += 1
                else:  # Predicted Phishing/Suspicious
                    tp += 1
                    
        return {
            "insufficient_data": False,
            "tn": tn,
            "fp": fp,
            "fn": fn,
            "tp": tp
        }
    finally:
        conn.close()
