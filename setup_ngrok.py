import paramiko
import sys
import time
import re

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = "217.60.3.122"
USERNAME = "root"
PASSWORD = "ZiW_1qjEippLtS2xrV"
NGROK_TOKEN = "2q8TLmjV0SjHaEAezdVHtTaH2sX_36dxbVz5LU5hEmyf5491v"
APP_PATH = "/root/subscription-tracker"

def run_command(ssh, command, print_output=True):
    stdin, stdout, stderr = ssh.exec_command(command)
    output = stdout.read().decode('utf-8')
    error = stderr.read().decode('utf-8')
    if print_output:
        if output:
            print(output)
        if error:
            print(f"STDERR: {error}")
    return output, error

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)
print("Connected!\n")

# Configure ngrok authtoken
print("=== Configuring ngrok ===")
run_command(ssh, f"ngrok config add-authtoken {NGROK_TOKEN}")

# Kill any existing ngrok
run_command(ssh, "pkill ngrok || true", print_output=False)

# Create ngrok service for port 80 (will serve frontend)
print("\n=== Creating ngrok systemd service ===")
ngrok_service = """[Unit]
Description=Ngrok Tunnel
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/ngrok http 80 --log=stdout
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
"""

run_command(ssh, f"""cat > /etc/systemd/system/ngrok.service << 'EOF'
{ngrok_service}
EOF""")

# Install nginx if not present
print("\n=== Setting up nginx ===")
run_command(ssh, "apt-get install -y nginx")

# Configure nginx to serve frontend and proxy API
nginx_config = f"""server {{
    listen 80;
    server_name _;

    # Frontend (static files)
    location / {{
        root {APP_PATH}/dist;
        try_files $uri $uri/ /index.html;
    }}

    # API proxy
    location /api {{
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }}

    # Health check
    location /health {{
        proxy_pass http://127.0.0.1:3001;
    }}
}}
"""

run_command(ssh, f"""cat > /etc/nginx/sites-available/subscription-tracker << 'EOF'
{nginx_config}
EOF""")

run_command(ssh, "ln -sf /etc/nginx/sites-available/subscription-tracker /etc/nginx/sites-enabled/")
run_command(ssh, "rm -f /etc/nginx/sites-enabled/default")
run_command(ssh, "nginx -t")
run_command(ssh, "systemctl restart nginx")

# Start ngrok
print("\n=== Starting ngrok ===")
run_command(ssh, "systemctl daemon-reload")
run_command(ssh, "systemctl enable ngrok")
run_command(ssh, "systemctl restart ngrok")

time.sleep(5)

# Get ngrok URL
print("\n=== Getting ngrok URL ===")
output, _ = run_command(ssh, "curl -s http://127.0.0.1:4040/api/tunnels")

# Parse URL from ngrok API
url_match = re.search(r'"public_url":"(https://[^"]+)"', output)
if url_match:
    ngrok_url = url_match.group(1)
    print(f"\n*** NGROK URL: {ngrok_url} ***\n")

    # Update .env with new URL
    print("=== Updating backend .env ===")
    run_command(ssh, f"""cat > {APP_PATH}/backend/.env << 'EOF'
BOT_TOKEN=8205357635:AAHuNLismxRNT1pHaDYII16VYNwzf0KHymM
WEBAPP_URL={ngrok_url}
PORT=3001
EOF""")

    # Restart subscription-tracker service
    print("\n=== Restarting subscription-tracker ===")
    run_command(ssh, "systemctl restart subscription-tracker")

    time.sleep(2)

    # Check status
    print("\n=== Status ===")
    run_command(ssh, "systemctl status subscription-tracker --no-pager | head -10")
    run_command(ssh, "systemctl status ngrok --no-pager | head -10")

    print("\n" + "="*60)
    print(f"ГОТОВО!")
    print(f"")
    print(f"Mini App URL: {ngrok_url}")
    print(f"API URL: {ngrok_url}/api")
    print(f"")
    print(f"Теперь открой @FCTracerBot и нажми /start")
    print("="*60)
else:
    print("ERROR: Could not get ngrok URL")
    print("Raw response:", output)

ssh.close()
