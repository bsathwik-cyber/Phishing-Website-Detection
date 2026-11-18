import json
import os
import pickle

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)
from sklearn.model_selection import GridSearchCV, train_test_split

from feature_extractor import extract_features
import generate_dataset


RANDOM_STATE = 42


def main():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(backend_dir, "dataset.csv")
    model_dir = os.path.join(backend_dir, "model")
    os.makedirs(model_dir, exist_ok=True)

    # Generate a deterministic synthetic sample when no dataset is supplied.
    dataset_generated_this_run = not os.path.exists(dataset_path)
    if dataset_generated_this_run:
        print("Dataset not found. Generating the documented synthetic dataset...")
        generate_dataset.main()

    df = pd.read_csv(dataset_path)
    if not {"url", "label"}.issubset(df.columns):
        raise ValueError("Dataset must contain 'url' and 'label' columns.")
    if df.empty or df["url"].isna().any():
        raise ValueError("Dataset is empty or contains missing URL values.")

    labels = set(pd.to_numeric(df["label"], errors="raise").unique())
    if not labels.issubset({0, 1}) or len(labels) != 2:
        raise ValueError("Labels must contain both binary classes: 0 (legitimate) and 1 (phishing).")

    print(f"Extracting URL features for {len(df)} rows...")
    feature_frame = pd.DataFrame([extract_features(str(url)) for url in df["url"]])
    X = feature_frame
    y = df["label"].astype(int)
    feature_names = list(X.columns)

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.20,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    parameter_grid = {
        "n_estimators": [100, 300],
        "max_depth": [15, 25],
        "min_samples_split": [2, 5],
    }

    search = GridSearchCV(
        estimator=RandomForestClassifier(random_state=RANDOM_STATE),
        param_grid=parameter_grid,
        cv=3,
        scoring="accuracy",
        n_jobs=-1,
        refit=True,
        verbose=1,
    )
    # Hyperparameter selection happens only within the training partition.
    search.fit(X_train, y_train)
    model = search.best_estimator_

    # The held-out test partition is used once for the final report only.
    predictions = model.predict(X_test)
    accuracy = accuracy_score(y_test, predictions)
    precision = precision_score(y_test, predictions, zero_division=0)
    recall = recall_score(y_test, predictions, zero_division=0)
    f1 = f1_score(y_test, predictions, zero_division=0)
    tn, fp, fn, tp = confusion_matrix(y_test, predictions, labels=[0, 1]).ravel()

    importances = {
        name: round(float(value) * 100, 2)
        for name, value in zip(feature_names, model.feature_importances_)
    }
    importances = dict(
        sorted(importances.items(), key=lambda item: item[1], reverse=True)
    )

    cv_mean = float(search.cv_results_["mean_test_score"][search.best_index_])
    cv_std = float(search.cv_results_["std_test_score"][search.best_index_])

    metrics = {
        "status": "available",
        "evaluation_dataset": "synthetic_generated_this_run" if dataset_generated_this_run else "existing_dataset_provenance_unverified",
        "evaluation_note": (
            "Metrics are from a stratified hold-out split of the supplied dataset. "
            "The default dataset is synthetic and does not establish real-world phishing detection performance."
        ),
        "training_rows": int(len(X_train)),
        "test_rows": int(len(X_test)),
        "accuracy": round(float(accuracy) * 100, 2),
        "precision": round(float(precision) * 100, 2),
        "recall": round(float(recall) * 100, 2),
        "f1_score": round(float(f1) * 100, 2),
        "cross_validation": round(cv_mean * 100, 2),
        "cv_std": round(cv_std * 100, 2),
        "cv_scoring": "accuracy",
        "best_parameters": search.best_params_,
        "random_state": RANDOM_STATE,
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp),
        },
        "feature_importances": importances,
        "feature_names": feature_names,
    }

    model_path = os.path.join(model_dir, "phishing_model.pkl")
    metrics_path = os.path.join(model_dir, "model_metrics.json")

    # Pickle artifacts should only be loaded from trusted, locally generated sources.
    with open(model_path, "wb") as model_file:
        pickle.dump(model, model_file)

    with open(metrics_path, "w", encoding="utf-8") as metrics_file:
        json.dump(metrics, metrics_file, indent=2)

    print("Model training and held-out evaluation completed.")
    print(f"Accuracy: {metrics['accuracy']}%")
    print(f"Precision: {metrics['precision']}%")
    print(f"Recall: {metrics['recall']}%")
    print(f"F1 score: {metrics['f1_score']}%")
    print(f"Model saved to: {model_path}")
    print(f"Metrics saved to: {metrics_path}")


if __name__ == "__main__":
    main()
