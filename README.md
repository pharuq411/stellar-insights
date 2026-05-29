# Stellar Insights

**Real-time payment analytics for Stellar.**

A lean, production-grade stack for measuring and improving cross-border payment reliability.

- Backend: Rust analytics engine
- Frontend: Next.js dashboard
- Contracts: Soroban smart contracts (optional)
- DB: PostgreSQL

## 🔧 Quick start

1. Start Postgres (example):

```bash
docker run --name stellar-postgres -e POSTGRES_PASSWORD=password -e POSTGRES_DB=stellar_insights -p 5432:5432 -d postgres:14
```

2. Run backend

```bash
cd backend
cp .env.example .env
# set DATABASE_URL, STELLAR_RPC_URL, etc.
cargo run
```

3. Run frontend

```bash
cd frontend
npm install
npm run dev
```

## 🧪 Local safety checks (already built)

- `scripts/check_folder_size.sh` (fails if any folder >200MB)
- [`.github/workflows/enforce-folder-size.yml`](.github/workflows/enforce-folder-size.yml)

## 📁 Structure

- `backend/` Rust services
- `frontend/` Next.js dashboard
- `mobile/` React Native mobile app
- `contracts/` Soroban contracts
- `docs/` additional docs

## 📌 Notes

- History has been cleaned to reduce clone size.
- Use `git lfs` for large binaries.
- For full operational details, see `docs/` and module READMEs.
