import sys
import unittest
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(BACKEND_DIR))

from feature_extractor import extract_features


class FeatureExtractorTests(unittest.TestCase):
    def test_https_scheme_is_detected(self):
        features = extract_features("https://example.com/login")
        self.assertEqual(features["https_present"], 1)

    def test_hostname_length_excludes_port_and_user_info(self):
        features = extract_features("https://user:pass@example.com:8443/login")
        self.assertEqual(features["domain_length"], len("example.com"))
        self.assertEqual(features["at_present"], 1)

    def test_protocol_separator_is_not_counted_as_path_double_slash(self):
        features = extract_features("https://example.com/account")
        self.assertEqual(features["double_slash_present"], 0)

    def test_repeated_slash_in_path_is_detected(self):
        features = extract_features("https://example.com/account//verify")
        self.assertEqual(features["double_slash_present"], 1)
        self.assertGreater(features["redirect_count"], 0)

    def test_ipv4_hostname_is_detected(self):
        features = extract_features("http://192.0.2.10/login")
        self.assertEqual(features["ip_present"], 1)

    def test_feature_schema_is_stable(self):
        features = extract_features("https://example.com/")
        self.assertEqual(len(features), 15)
        self.assertIn("entropy_score", features)
        self.assertIn("tld_risk_score", features)


if __name__ == "__main__":
    unittest.main()
