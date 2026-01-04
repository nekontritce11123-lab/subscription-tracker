import paramiko
import time
import sys

# Fix encoding for Windows console
sys.stdout.reconfigure(encoding='utf-8', errors='replace')

# Server credentials
HOST = "217.60.3.122"
USERNAME = "root"
PASSWORD = "ZiW_1qjEippLtS2xrV"

# New app path (separate from crypto-trading-bot)
APP_PATH = "/root/subscription-tracker"
SERVICE_NAME = "subscription-tracker"

def run_command(ssh, command, print_output=True):
    """Execute command and return output"""
    stdin, stdout, stderr = ssh.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    if print_output:
        if output:
            print(output)
        if error:
            print(f"STDERR: {error}")
    return output, error

def main():
    print("Connecting to server...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(HOST, username=USERNAME, password=PASSWORD)
    print("Connected!\n")

    # Step 1: Check existing services (don't touch crypto-trading-bot)
    print("=== Checking existing services ===")
    run_command(ssh, "systemctl status trading-bot --no-pager | head -5")

    # Step 2: Install Node.js if not present
    print("\n=== Checking Node.js ===")
    output, _ = run_command(ssh, "node --version 2>/dev/null || echo 'not found'")
    if "not found" in output:
        print("Installing Node.js...")
        run_command(ssh, "curl -fsSL https://deb.nodesource.com/setup_20.x | bash -")
        run_command(ssh, "apt-get install -y nodejs")

    # Step 3: Clone or update repository
    print("\n=== Setting up subscription-tracker ===")
    run_command(ssh, f"mkdir -p {APP_PATH}")

    # Check if repo exists
    output, _ = run_command(ssh, f"ls {APP_PATH}/.git 2>/dev/null || echo 'not found'", print_output=False)
    if "not found" in output:
        print("Removing old directory and cloning repository...")
        run_command(ssh, f"rm -rf {APP_PATH}")
        run_command(ssh, f"cd /root && git clone https://github.com/nekontritce11123-lab/subscription-tracker.git")
    else:
        print("Pulling latest changes...")
        run_command(ssh, f"cd {APP_PATH} && git pull origin master")

    # Step 4: Install dependencies
    print("\n=== Installing dependencies ===")
    run_command(ssh, f"cd {APP_PATH} && npm run install:all")

    # Step 5: Build
    print("\n=== Building ===")
    run_command(ssh, f"cd {APP_PATH} && npm run build:all")

    # Step 6: Create .env files
    print("\n=== Creating .env files ===")

    # Frontend .env
    run_command(ssh, f"""cat > {APP_PATH}/.env << 'EOF'
VITE_API_URL=http://217.60.3.122:3001
EOF""")

    # Backend .env
    run_command(ssh, f"""cat > {APP_PATH}/backend/.env << 'EOF'
BOT_TOKEN=8205357635:AAHuNLismxRNT1pHaDYII16VYNwzf0KHymM
WEBAPP_URL=http://217.60.3.122
PORT=3001
EOF""")

    # Create data directory and db.json
    print("\n=== Creating database directory ===")
    run_command(ssh, f"mkdir -p {APP_PATH}/backend/data")
    run_command(ssh, f"""cat > {APP_PATH}/backend/data/db.json << 'EOF'
{{"users": [], "subscriptions": []}}
EOF""")

    # Step 7: Create systemd service
    print("\n=== Creating systemd service ===")
    service_content = f"""[Unit]
Description=Subscription Tracker Bot
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory={APP_PATH}/backend
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
"""

    run_command(ssh, f"""cat > /etc/systemd/system/{SERVICE_NAME}.service << 'EOF'
{service_content}
EOF""")

    # Step 8: Start service
    print("\n=== Starting service ===")
    run_command(ssh, "systemctl daemon-reload")
    run_command(ssh, f"systemctl enable {SERVICE_NAME}")
    run_command(ssh, f"systemctl restart {SERVICE_NAME}")

    time.sleep(2)

    # Step 9: Check status
    print("\n=== Service status ===")
    run_command(ssh, f"systemctl status {SERVICE_NAME} --no-pager")

    # Check logs
    print("\n=== Recent logs ===")
    run_command(ssh, f"journalctl -u {SERVICE_NAME} -n 30 --no-pager")

    # Step 10: Verify both services running
    print("\n=== All services ===")
    run_command(ssh, "systemctl status trading-bot --no-pager | head -3")
    run_command(ssh, f"systemctl status {SERVICE_NAME} --no-pager | head -3")

    print("\n=== DONE ===")
    print(f"Subscription Tracker deployed to {APP_PATH}")
    print(f"API running on port 3001")
    print(f"Service: {SERVICE_NAME}.service")

    ssh.close()

if __name__ == "__main__":
    main()
