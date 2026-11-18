import os
import shutil
import socket
import sys


def check_file_exists(path, label=None):
    exists = os.path.exists(path)
    description = label or path
    print(f"Checking {description}: {'[OK]' if exists else '[MISSING]'}")
    return exists


def run_command_diagnostic(args):
    import subprocess

    try:
        result = subprocess.run(
            args,
            capture_output=True,
            text=True,
            timeout=5,
            check=True,
        )
        print(f"Running {' '.join(args)} -> [OK]")
        output = result.stdout.strip() or result.stderr.strip()
        if output:
            print(f"  {output[:160]}")
        return True
    except (OSError, subprocess.SubprocessError) as error:
        print(f"Running {' '.join(args)} -> [FAILED]: {error}")
        return False


def check_port(port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(1)
    try:
        sock.bind(("127.0.0.1", port))
        occupied = False
    except OSError:
        occupied = True
    finally:
        sock.close()

    print(f"Port {port}: {'[OCCUPIED]' if occupied else '[FREE]'}")
    return occupied


def main():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(root_dir, "backend")
    frontend_dir = os.path.join(root_dir, "frontend")

    print("=" * 58)
    print("PHISHGUARD LOCAL DEVELOPMENT DIAGNOSTICS")
    print("=" * 58)
    print(f"Repository: {root_dir}\n")

    print("--- Project folders ---")
    check_file_exists(backend_dir, "backend directory")
    check_file_exists(frontend_dir, "frontend directory")

    print("\n--- Runtime tools ---")
    python_exe = sys.executable
    node_exe = shutil.which("node")
    npm_exe = shutil.which("npm")

    run_command_diagnostic([python_exe, "--version"])
    if node_exe:
        run_command_diagnostic([node_exe, "--version"])
    else:
        print("Node.js: [MISSING] Install Node.js 20.9 or newer.")

    if npm_exe:
        run_command_diagnostic([npm_exe, "--version"])
    else:
        print("npm: [MISSING] Install Node.js with npm.")

    print("\n--- Optional local artifacts ---")
    check_file_exists(
        os.path.join(backend_dir, "venv"),
        "backend virtual environment (create during setup)",
    )
    check_file_exists(
        os.path.join(backend_dir, "model", "phishing_model.pkl"),
        "trained model (generated during training)",
    )

    print("\n--- Development ports ---")
    check_port(3000)
    check_port(5001)

    print("\nDiagnostics completed. Missing model/venv items can be created by following README.md.")


if __name__ == "__main__":
    main()
