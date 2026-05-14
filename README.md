# CoverChain

Parametric micro-insurance mini app for MiniPay. Protect your phone, health, and farm.

## Plans (deployed on contract creation)
| Plan | Premium | Max Payout | Claim Type |
|------|---------|------------|------------|
| Device Cover | 0.50 cUSD/mo | 50 cUSD | Community vote |
| Medical Cover | 0.80 cUSD/mo | 100 cUSD | Community vote |
| Farm Weather Cover | 1.00 cUSD/mo | 200 cUSD | Auto-trigger (oracle) |

## Features
- Buy 1–12 month policies in cUSD
- File claims with evidence (device/medical)
- Community validator voting (3-day window)
- Parametric weather: automatic payout, no claim needed
- Validator staking: stake 10 cUSD, earn 1% of approved claims

## Setup
```bash
cd contracts && npm install
npm run deploy:alfajores
# 3 default plans are created on deploy

cd frontend && npm install
# paste deployed address into lib/contracts.ts
npm run dev
```
