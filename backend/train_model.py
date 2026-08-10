import os
import json
import pickle
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix

# Import our custom feature extractor
from feature_extractor import extract_features
import generate_dataset

def main():
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(backend_dir, "dataset.csv")
    model_dir = os.path.join(backend_dir, "model")
    os.makedirs(model_dir, exist_ok=True)
    
    # 1. Generate dataset if it does not exist
    if not os.path.exists(dataset_path):
        print("Dataset not found. Generating...")
        generate_dataset.main()
        
    # 2. Load dataset
    print("Loading dataset...")
    df = pd.read_csv(dataset_path)
    
    # 3. Extract features
    print("Extracting features from URLs (this may take a few seconds)...")
    feature_list = []
    for index, row in df.iterrows():
        features = extract_features(row['url'])
        features['label'] = row['label']
        feature_list.append(features)
        
    feature_df = pd.DataFrame(feature_list)
    
    # 4. Prepare X and y
    X = feature_df.drop(columns=['label'])
    y = feature_df['label']
    
    # Save column names to ensure consistency in predictions
    feature_names = list(X.columns)
    
    # 5. Train Test Split
    print("Performing Train-Test Split (80% train, 20% test)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # 6. Grid Search and Hyperparameter Tuning
    print("Running Hyperparameter Tuning (Grid Search) on Random Forest...")
    param_grid = {
        'n_estimators': [100, 300],
        'max_depth': [15, 25],
        'min_samples_split': [2, 5]
    }
    
    base_rf = RandomForestClassifier(random_state=42)
    grid_search = GridSearchCV(
        estimator=base_rf, 
        param_grid=param_grid, 
        cv=3, 
        scoring='accuracy', 
        n_jobs=-1,
        verbose=1
    )
    grid_search.fit(X_train, y_train)
    print(f"Best Grid Search Parameters: {grid_search.best_params_}")
    
    # 7. Train target RandomForest model with user's specific requested parameters
    print("Training final RandomForestClassifier(n_estimators=300, max_depth=25, random_state=42)...")
    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=25,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # 8. Cross Validation
    print("Running 5-fold Cross-Validation on target model...")
    cv_scores = cross_val_score(model, X, y, cv=5, scoring='accuracy')
    print(f"Cross-Validation Accuracy Scores: {cv_scores}")
    
    # 9. Evaluate model
    print("Evaluating model on test set...")
    y_pred = model.predict(X_test)
    
    accuracy = accuracy_score(y_test, y_pred)
    precision = precision_score(y_test, y_pred)
    recall = recall_score(y_test, y_pred)
    f1 = f1_score(y_test, y_pred)
    cm = confusion_matrix(y_test, y_pred)
    
    tn, fp, fn, tp = cm.ravel()
    
    # Format metrics as percentages rounded to two decimal places
    acc_pct = float(round(accuracy * 100, 2))
    prec_pct = float(round(precision * 100, 2))
    rec_pct = float(round(recall * 100, 2))
    f1_pct = float(round(f1 * 100, 2))
    cv_mean_pct = float(round(cv_scores.mean() * 100, 2))
    cv_std_pct = float(round(cv_scores.std() * 100, 2))
    
    print("\n--- Model Evaluation Metrics ---")
    print(f"Accuracy:  {acc_pct}%")
    print(f"Precision: {prec_pct}%")
    print(f"Recall:    {rec_pct}%")
    print(f"F1 Score:  {f1_pct}%")
    print(f"Cross Validation Mean: {cv_mean_pct}%")
    print(f"CV Std: {cv_std_pct}%")
    print(f"Confusion Matrix: TN={tn}, FP={fp}, FN={fn}, TP={tp}")
    print("--------------------------------\n")
    
    # 10. Extract Feature Importances directly from the model
    importances = model.feature_importances_
    feature_importances = {feature_names[i]: float(round(importances[i] * 100, 2)) for i in range(len(feature_names))}
    # Sort feature importances
    feature_importances = dict(sorted(feature_importances.items(), key=lambda item: item[1], reverse=True))
    
    # 11. Save model
    model_path = os.path.join(model_dir, "phishing_model.pkl")
    with open(model_path, "wb") as f:
        pickle.dump(model, f)
    print(f"Model saved to {model_path}")
    
    # 12. Save metrics
    metrics = {
        "accuracy": acc_pct,
        "precision": prec_pct,
        "recall": rec_pct,
        "f1_score": f1_pct,
        "cross_validation": cv_mean_pct,
        "cv_std": cv_std_pct,
        "confusion_matrix": {
            "tn": int(tn),
            "fp": int(fp),
            "fn": int(fn),
            "tp": int(tp)
        },
        "feature_importances": feature_importances,
        "feature_names": feature_names
    }
    
    metrics_path = os.path.join(model_dir, "model_metrics.json")
    with open(metrics_path, "w") as f:
        json.dump(metrics, f, indent=4)
    print(f"Metrics saved to {metrics_path}")
    
    # 13. Write test partition evaluation records to SQLite scans table
    print("Writing test partition evaluation records to SQLite...")
    from database import init_db, save_scans_bulk
    init_db()
    
    test_scans = []
    for idx in X_test.index:
        url = df.loc[idx, 'url']
        actual = int(df.loc[idx, 'label'])  # 0 or 1
        
        # Run prediction using newly trained model
        pred_details = y_pred[list(X_test.index).index(idx)]  # matching index prediction
        prediction_str = "Phishing" if pred_details == 1 else "Safe"
        
        # Compute confidence
        probs = model.predict_proba(pd.DataFrame([X_test.loc[idx]])[feature_names])[0]
        confidence = probs[pred_details] * 100
        
        # Determine risk level
        risk_level = "High" if prediction_str == "Phishing" else "Low"
        
        test_scans.append({
            "url": url,
            "prediction": prediction_str,
            "confidence": confidence,
            "risk_level": risk_level,
            "actual_label": str(actual)
        })
        
    save_scans_bulk(test_scans)
    print(f"Loaded {len(test_scans)} test partition evaluation records into SQLite database.")
    print("Model training successfully completed!")

if __name__ == "__main__":
    main()
