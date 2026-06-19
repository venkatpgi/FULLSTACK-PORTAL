import os

# Read from environment; set SECRET_KEY in the server's systemd service file or .env
SECRET_KEY = os.environ.get("SECRET_KEY", "PORTAL_TRIAL_SUPER_SECRET_2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24
