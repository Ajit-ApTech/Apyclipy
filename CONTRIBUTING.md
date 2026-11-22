# Contributing to Apyclipy

Thank you for your interest in contributing to **Apyclipy**! We welcome bug fixes, documentation improvements, translation updates, and confirmed feature enhancements.

## Getting Started

1. **Bug Reports**: Open an issue on GitHub with reproduction steps, system details (OS, version, model provider), expected vs. actual behavior, and sanitized logs.
2. **Feature Requests & Ideas**: Start a discussion on GitHub explaining your use case and desired functionality before submitting large pull requests.
3. **Security Reports**: Follow the guidelines in [SECURITY.md](SECURITY.md).

## Development Setup

```bash
# 1. Clone the repository
git clone https://github.com/Ajit-ApTech/Apyclipy.git
cd Apyclipy

# 2. Setup backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp env.example .env

# 3. Setup frontend
cd frontend
npm ci
cd ..
```

## Pull Request Guidelines

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Follow standard code formatting and type checks:
   - Frontend: `cd frontend && npx tsc --noEmit && npm run build`
   - Backend: Ensure syntax and imports are valid.
3. Keep pull requests focused on a single change or fix.
4. Test thoroughly before submitting.
