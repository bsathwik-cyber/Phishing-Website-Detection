# PhishGuard Random Forest Model Card

## Purpose

This model is provided as a pre-trained development artifact for the PhishGuard local URL-classification prototype. It consumes the 15 URL-structure and lexical features produced by `backend/feature_extractor.py` and predicts binary labels: `0` (legitimate) or `1` (phishing).

## Training data

The model is trained with the repository's built-in synthetic URL generator. It creates URL strings from predefined safe-domain, brand-name, keyword, path, and top-level-domain lists, then introduces approximately 3.5% label flips. A recent deterministic run generated 4,857 unique examples.

This dataset is synthetic. It is not a collection of current URLs from live phishing feeds and is not representative of internet traffic.

## Evaluation method

The training script uses a stratified 80/20 hold-out split. GridSearchCV selects hyperparameters using 3-fold cross-validation on the training partition only. The held-out test partition is evaluated once.

The currently generated reference artifact reports:

| Metric | Result |
|---|---:|
| Accuracy | 96.40% |
| Precision | 96.56% |
| Recall | 96.36% |
| F1 score | 96.46% |
| Cross-validation mean accuracy | 96.76% |
| Cross-validation standard deviation | 0.49 percentage points |

Confusion matrix on the generated synthetic hold-out set:

| | Predicted legitimate | Predicted phishing |
|---|---:|---:|
| Actual legitimate | 460 | 17 |
| Actual phishing | 18 | 477 |

**These figures describe only the synthetic evaluation sample. They must not be represented as real-world phishing detection performance.** Since the synthetic labels and URLs are generated using predefined patterns, the evaluation may be optimistic.

## Intended use

- Demonstrating local model loading and URL-feature inference.
- Educational experimentation and software development.
- Testing the PhishGuard application flow.

## Not intended for

- Production blocking, allow-listing, or incident response decisions.
- Declaring a URL safe.
- Replacing browser protections, threat-intelligence services, or human review.
- Claims about detection performance against current live phishing campaigns.

## Known limitations

- The model analyses URL strings only; it does not fetch or inspect the website.
- It performs no DNS, TLS, page-content, redirect-chain, or live reputation checks.
- The synthetic dataset has limited domain diversity and hand-crafted signals.
- The displayed probability is not calibrated as the real-world probability of phishing.
- URL patterns and attacker behaviour change over time.

## Runtime compatibility

The downloadable model is generated with:

- Python 3.11
- scikit-learn 1.8.0
- NumPy 2.3.5
- pandas 2.2.3

Use `backend/model-requirements.txt` to install the pinned model dependencies. scikit-learn pickle artifacts are version-sensitive. If you use another scikit-learn version, train a new model in that environment rather than assuming that the pickle is portable.

## Artifact storage

The binary model is not committed to Git. The GitHub Actions workflow builds a ZIP artifact retained for 90 days. The workflow can be run manually to regenerate it.
