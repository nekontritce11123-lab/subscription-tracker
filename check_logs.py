import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8', errors='replace')

HOST = "217.60.3.122"
USERNAME = "root"
PASSWORD = "ZiW_1qjEippLtS2xrV"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(HOST, username=USERNAME, password=PASSWORD)

print("=== Service logs ===")
stdin, stdout, stderr = ssh.exec_command("journalctl -u subscription-tracker -n 50 --no-pager")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

print("\n=== Check files ===")
stdin, stdout, stderr = ssh.exec_command("ls -la /root/subscription-tracker/backend/")
print(stdout.read().decode('utf-8'))

print("\n=== Check dist ===")
stdin, stdout, stderr = ssh.exec_command("ls -la /root/subscription-tracker/backend/dist/")
print(stdout.read().decode('utf-8'))

print("\n=== Check .env ===")
stdin, stdout, stderr = ssh.exec_command("cat /root/subscription-tracker/backend/.env")
print(stdout.read().decode('utf-8'))

print("\n=== Try running manually ===")
stdin, stdout, stderr = ssh.exec_command("cd /root/subscription-tracker/backend && node dist/index.js 2>&1 & sleep 3 && kill $!")
print(stdout.read().decode('utf-8'))
print(stderr.read().decode('utf-8'))

ssh.close()
