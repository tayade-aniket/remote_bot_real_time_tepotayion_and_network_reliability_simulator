import hmac
import hashlib
import base64
import json
import time
from typing import Optional, Dict, Any
from app.core.config import settings

def hash_password(password: str) -> str:
    salt = settings.SECRET_KEY[:16]
    derived = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 100000)
    return derived.hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return hmac.compare_digest(hash_password(plain_password), hashed_password)

def create_access_token(data: Dict[str, Any], expires_delta_sec: Optional[int] = None) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    exp_time = time.time() + (expires_delta_sec if expires_delta_sec else (settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60))
    payload = {**data, "exp": exp_time}
    
    header_b64 = base64.urlsafe_b64encode(json.dumps(header).encode()).decode().rstrip("=")
    payload_b64 = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode().rstrip("=")
    signature_input = f"{header_b64}.{payload_b64}".encode()
    
    signature = hmac.new(settings.SECRET_KEY.encode(), signature_input, hashlib.sha256).digest()
    sig_b64 = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    
    return f"{header_b64}.{payload_b64}.{sig_b64}"

def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        header_b64, payload_b64, sig_b64 = parts
        
        # Verify signature
        signature_input = f"{header_b64}.{payload_b64}".encode()
        expected_sig = hmac.new(settings.SECRET_KEY.encode(), signature_input, hashlib.sha256).digest()
        
        # Pad base64
        padded_sig = sig_b64 + "=" * (-len(sig_b64) % 4)
        received_sig = base64.urlsafe_b64decode(padded_sig.encode())
        if not hmac.compare_digest(expected_sig, received_sig):
            return None
            
        padded_payload = payload_b64 + "=" * (-len(payload_b64) % 4)
        payload = json.loads(base64.urlsafe_b64decode(padded_payload.encode()).decode())
        
        if payload.get("exp", 0) < time.time():
            return None
            
        return payload
    except Exception:
        return None
