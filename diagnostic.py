import os
import subprocess
import socket
import sys

def check_file_exists(path):
    exists = os.path.exists(path)
    print(f"Checking path: {path} -> {'[OK]' if exists else '[MISSING]'}")
    return exists

def run_command_diagnostic(args, env=None):
    try:
        res = subprocess.run(args, capture_output=True, text=True, env=env, timeout=5)
        print(f"Running: {' '.join(args)} -> [SUCCESS]")
        print(f"  Stdout: {res.stdout.strip()[:100]}")
        return True
    except Exception as e:
        print(f"Running: {' '.join(args)} -> [FAILED]: {str(e)}")
        return False

def check_port(port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    s.settimeout(1)
    try:
        s.bind(("127.0.0.1", port))
        bound = False # Port is free
    except socket.error:
        bound = True # Port is occupied
    finally:
        s.close()
    print(f"Testing port {port} -> {'[OCCUPIED]' if bound else '[FREE]'}")
    return bound

def main():
    print("====================================================")
    print("           PHISHGUARD SYSTEM DIAGNOSTICS            ")
    print("====================================================\n")
    
    root_dir = os.path.dirname(os.path.abspath(__file__))
    print(f"Diagnostic Root Directory: {root_dir}\n")
    
    # 1. Check folder paths
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")
    node_bin_dir = os.path.abspath(os.path.join(root_dir, "..", "node-bin"))
    
    print("--- Checking Folders ---")
    check_file_exists(backend_dir)
    check_file_exists(frontend_dir)
    check_file_exists(node_bin_dir)
    print("")

    # 2. Check binary paths
    print("--- Checking Executables ---")
    node_exe = os.path.join(node_bin_dir, "node.exe")
    npm_cmd = os.path.join(node_bin_dir, "npm.cmd")
    python_exe = os.path.join(backend_dir, "venv", "Scripts", "python.exe")
    model_pkl = os.path.join(backend_dir, "model", "phishing_model.pkl")
    
    check_file_exists(node_exe)
    check_file_exists(npm_cmd)
    check_file_exists(python_exe)
    check_file_exists(model_pkl)
    print("")

    # 3. Test execution
    print("--- Executing Binary Verifications ---")
    if os.path.exists(node_exe):
        run_command_diagnostic([node_exe, "-v"])
    if os.path.exists(python_exe):
        run_command_diagnostic([python_exe, "-V"])
    print("")

    # 4. Check network ports
    print("--- Checking Ports (Conflicts check) ---")
    check_port(3000)
    check_port(5001)
    print("")

    print("====================================================")
    print("Diagnostics completed. Please review the log above.")
    print("====================================================")

if __name__ == "__main__":
    main()
