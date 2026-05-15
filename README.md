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

### 1. Deploy the contract
```bash
cd contracts
npm install
cp .env.example .env       # fill in PRIVATE_KEY and CELOSCAN_API_KEY
npm run deploy:alfajores   # 3 default plans created on deploy
# deployment saved to contracts/deployments/alfajores.json
```

### 2. Run the frontend
```bash
cd frontend
npm install
# paste the deployed address into lib/contracts.ts (COVER_CHAIN_ADDRESS[44787])
npm run dev
```

### Testnet faucet
Get free Alfajores cUSD at: https://faucet.celo.org/alfajores

### Verify contract on Celoscan
```bash
cd contracts
npx hardhat verify --network alfajores <DEPLOYED_ADDRESS> <CUSD_ADDRESS>
```

## Deployment checklist
- [ ] Set `PRIVATE_KEY` in `contracts/.env`
- [ ] Run `npm run deploy:alfajores` and copy the address
- [ ] Paste address into `frontend/lib/contracts.ts`
- [ ] Run `npm run dev` and open in MiniPay browser
