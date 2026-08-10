# PhishGuard

> **Real-Time Phishing URL Detection Using Machine Learning**

PhishGuard is a local, full-stack cybersecurity application designed to evaluate and detect phishing threats in web URLs using a classic Machine Learning algorithm. It extracts structural, lexical, and security parameters from a given URL in real-time and evaluates them through a locally trained **Random Forest Classifier** to assess its risk level (Safe, Suspicious, or Phishing).

---

## Key Features

1. **Single URL Threat Scanner**: Analyzes individual URLs for threat profiles.
2. **Real-time Lexical Analyzer**: Highlights URL metrics dynamically as the user types (URL length, domain length, dots, hyphens, and digits count).
3. **Security Advisory Card**: Evaluates URL features to produce color-coded cards (Green: Safe, Yellow: Suspicious, Red: Phishing) with clear security recommendations.
4. **Bulk URL Threat Audit**: Upload CSV or TXT lists of URLs, process them in a batch, search/filter through results, and download reports back to CSV.
5. **Interactive Security Analytics**: Visualize scans, distribution rates, and volume history trends via Recharts.
6. **Audit History Log**: Keeps a persistent record of all scans in a local SQLite database (supports searching, sorting, and pagination).
7. **Model Performance Hub**: Displays metrics from training (Accuracy, Precision, Recall, F1 score, Cross-Validation mean), a styled Confusion Matrix grid, and ranked Feature Importances.

---

## Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** (v4.0)
- **Framer Motion** (Fluid micro-animations & transitions)
- **Recharts** (Interactive data visualizations)
- **Axios** (API integration client)
- **Lucide Icons**

### Backend
- **Flask** (Python API server)
- **Flask-CORS** (Origin security management)
- **Flask-Limiter** (Rate-limiting protection)
- **SQLite** (Persistent storage)

### Machine Learning
- **Scikit-Learn** (Random Forest Classifier)
- **Pandas & NumPy** (Data formatting & extraction)

---

## URL Feature Extraction (15 Features)
PhishGuard parses every URL into the following 15 features:
1. **URL Length** (lexical length)
2. **Domain Length** (domain character count)
3. **Dots Count** (number of `.` characters)
4. **Hyphens Count** (number of `-` characters)
5. **Digits Count** (number of numbers in URL)
6. **Subdomains Count** (number of subdomains)
7. **HTTPS Present** (1 if HTTPS protocol, 0 otherwise)
8. **IP Address Domain** (1 if domain is raw IP address, 0 otherwise)
9. **Suspicious Keywords** (count of words: login, secure, signin, bank, update, verify, etc.)
10. **Special Characters** (count of characters: ?, =, &, _, %)
11. **Redirect Patterns** (redirect URL params & subsequent double slashes)
12. **Presence of `@`** (1 if present, 0 otherwise)
13. **Presence of `//`** (double slash in path, indicating masking)
14. **Entropy Score** (Shannon Entropy measuring domain randomness)
15. **TLD Risk Score** (risk weight mapping of TLD, e.g. `.xyz`, `.top` = high risk; `.gov`, `.edu` = low risk)

---

## Installation & Local Startup

### 1. Backend Setup & Model Training
Navigate to the backend directory, activate the Python virtual environment, install requirements, train the Random Forest model, and start the Flask server:

```bash
# Navigate to backend
cd backend

# Create Virtual Environment
python -m venv venv

# Activate Virtual Environment
# On Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# On Windows (CMD):
.\venv\Scripts\activate.bat
# On macOS/Linux:
source venv/bin/activate

# Install Dependencies
pip install -r requirements.txt

# Generate synthetic dataset and train the Random Forest Classifier
python train_model.py

# Start Flask API server (runs locally on port 5000)
python app.py
```

### 2. Frontend Setup
Navigate to the frontend directory, install dependencies, and run the Next.js dev server:

```bash
# Navigate to frontend (from project root)
cd frontend

# Install Node modules
npm install

# Start Next.js development server (runs locally on port 3000)
npm run dev
```

*Note: Since Node.js may not be globally installed on your machine, a portable Node binary is available under the `node-bin` folder in the root directory. To run commands using the local binary, prepend the PATH variable:*
```powershell
# In PowerShell:
$env:Path = "..\node-bin;" + $env:Path; npm run dev
```

---

## API Documentation

- `POST /api/predict`: Analyzes a single URL.
  - Body: `{"url": "https://example.com"}`
- `POST /api/bulk-predict`: Scans a list of URLs from an uploaded file (CSV or TXT).
  - Body: Form-data with key `file`.
- `GET /api/history`: Retrieves page-wise, sortable, and searchable scan history logs.
  - Query params: `search`, `sortBy`, `order`, `limit`, `page`.
- `GET /api/stats`: Retrieves stats cards values and charting data.
- `GET /api/model-metrics`: Returns Random Forest model validation scores, confusion matrix, and feature importances.
