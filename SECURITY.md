# Security Policy

Security fixes are merged directly into the `main` branch.

## Reporting a Vulnerability

If you discover a security vulnerability in Apyclipy:
1. Please do **not** publicly disclose vulnerability details, API keys, cookies, or secrets in public issues or comments.
2. Open a private security advisory on the GitHub repository or contact the repository owner privately.
3. Provide a clear description of the vulnerability, affected versions, and reproduction steps with sanitized evidence.

## Security Best Practices for Deployment

- The desktop client and default Docker setups are intended for localhost or trusted local network environments.
- If exposing services over public networks, configure proper authentication, TLS/HTTPS, and network firewalls.
- Never expose Redis, Celery Flower, or internal API endpoints without protective proxy layers.
- Do not commit `.env` files or API keys into version control.
