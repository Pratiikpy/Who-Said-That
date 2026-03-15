# Who Said That

Anonymous encrypted confessions on Base. Send anonymous messages. Guess who sent them. Buy AI-powered hints.

Built as a Farcaster Mini App with Fully Homomorphic Encryption via Fhenix CoFHE.

---

## How It Works

1. **Share your link** — Get a unique anonymous link and share it anywhere
2. **Receive confessions** — People send you anonymous messages through your link
3. **Guess who sent it** — You get 3 guesses per confession. The sender's identity is FHE-encrypted on-chain — even the contract can't see it
4. **Buy AI hints** — Pay ETH to unlock AI-generated clues about the sender's identity
5. **Community unmask** — On public confessions, the community can pool ETH to reveal the sender

## Architecture

```
Frontend (Next.js 15)
├── Farcaster Mini App SDK — auth, notifications, haptics
├── OnchainKit — wallet connect, transactions
├── cofhejs — client-side FHE encryption
├── Supabase — database, realtime subscriptions
└── NVIDIA NIM — AI hint generation, content moderation

Smart Contract (Solidity 0.8.25, Base Sepolia)
├── ConfessionVault V2
├── FHE-encrypted sender identity (euint32)
├── FHE.eq comparison for guessing game
├── Async threshold network decryption
├── Registrar-controlled user registration
├── Fund distribution for reveal/block pools
└── 5-tier progressive hint pricing
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Chain | Base (OP Stack L2) |
| Encryption | Fhenix CoFHE (Fully Homomorphic Encryption) |
| Frontend | Next.js 15, Tailwind CSS v4, framer-motion |
| Wallet | OnchainKit, wagmi, viem |
| Database | Supabase (Postgres + Realtime) |
| AI | NVIDIA NIM (minimaxai/minimax-m2.5) |
| Distribution | Farcaster Mini App |
| Auth | Farcaster Quick Auth (JWT) |

## Smart Contract

**ConfessionVault V2** — deployed on Base Sepolia

Core functions:
- `sendConfession(encryptedFid, recipientId, messageRef, platform)` — Store an FHE-encrypted confession
- `submitGuess(confessionId, encryptedGuess)` + `resolveGuess(confessionId)` — Two-step guessing with FHE.eq comparison
- `buyHint(confessionId)` — Pay ETH for progressive hint tiers
- `postPublic(encryptedFid, messageRef, platform, revealPrice)` — Post a public anonymous confession
- `contributeToReveal(confessionId)` / `blockReveal(confessionId)` — Community unmask economics

Security features (V2):
- Registrar-only user registration (prevents identity hijacking)
- Proper fund distribution for reveal/block pools with 30-day refund
- Stuck guess timeout with `cancelPendingGuess()`
- Two-step treasury transfer (propose + accept)
- Exact payment required on hints (no overpayment)
- Struct packing for gas optimization

## Project Structure

```
who-said-that/
├── packages/
│   ├── hardhat/
│   │   ├── contracts/
│   │   │   └── ConfessionVault.sol     # V2 with all security fixes
│   │   ├── tasks/
│   │   │   └── deploy-confession-vault.ts
│   │   └── hardhat.config.ts           # Base Sepolia config
│   └── miniapp/
│       ├── src/
│       │   ├── app/                    # 8 pages + 10 API routes
│       │   ├── components/             # 15 React components
│       │   ├── hooks/                  # 10 custom hooks
│       │   ├── lib/                    # 7 utility modules
│       │   └── contracts/              # ABI (93 functions)
│       └── supabase-rls-policies.sql   # Row Level Security
└── package.json
```

### Pages

| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/[username]` | Share link — anonymous send (no auth required) |
| `/app` | Inbox with realtime updates |
| `/app/compose` | Send confession with FHE encryption |
| `/app/c/[id]` | Confession detail — guessing game, hints, thread |
| `/app/feed` | Public anonymous feed with reactions |
| `/app/me` | Profile, stats, settings |
| `/app/rooms` | Whisper Rooms (coming soon) |

### API Routes

| Route | Auth | Description |
|-------|------|-------------|
| `/api/confessions/anon` | Rate limited | Anonymous confession (share link) |
| `/api/confessions/send` | JWT | Authenticated confession with sender FID |
| `/api/hints/[id]` | JWT | AI hint generation via NVIDIA NIM |
| `/api/reactions` | JWT | Toggle reactions on public confessions |
| `/api/threads/[id]` | JWT | Reply thread messages |
| `/api/webhook` | Signature verified | Farcaster notification webhook |
| `/api/users/search` | None | Farcaster user search via Neynar |
| `/api/card/[id]` | None | OG image generation |
| `/api/auth` | None | JWT verification |

### Components

| Component | Description |
|-----------|-------------|
| `AmbientCard` | Cards with overhead light simulation |
| `AnimatedNumber` | Count-up animation on stat numbers |
| `BottomTabs` | iOS-style bottom navigation with SVG icons |
| `BreathingAnimation` | Subtle idle animation wrapper |
| `ConfessionBorder` | Category-based card borders (crush, roast, secret) |
| `ConfessionCard` | Inbox card with staggered entrance |
| `DecryptReveal` | FHE decrypt character-by-character animation |
| `FloatingReaction` | Physics-based floating emoji on reaction tap |
| `Onboarding` | 3-step first-run tutorial |
| `PullToRefresh` | Native pull-to-refresh with custom SVG indicator |
| `RecipientSearch` | Farcaster user autocomplete |
| `SmartEmptyState` | Context-aware empty states (5 types) |
| `Toast` | Notification toasts with SVG icons |

## Setup

### Prerequisites

- Node.js >= 18
- Base Sepolia ETH ([faucet](https://portal.cdp.coinbase.com/products/faucet))

### 1. Install

```bash
npm run install:all
```

### 2. Environment Variables

**`packages/hardhat/.env`**
```
PRIVATE_KEY=your_private_key
```

**`packages/miniapp/.env.local`** (copy from `.example.env`)
```
NEXT_PUBLIC_URL=http://localhost:3000
NEXT_PUBLIC_ONCHAINKIT_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_COFHE_CONTRACT_ADDRESS=
NEYNAR_API_KEY=
NVIDIA_NIM_API_KEY=
```

### 3. Supabase

Create a project at [supabase.com](https://supabase.com), then run the schema SQL from the project's Supabase setup (9 tables: users, confessions, guesses, hints, threads, reactions, notification_tokens, rooms, room_messages).

After creating tables, run `packages/miniapp/supabase-rls-policies.sql` for Row Level Security.

### 4. Deploy Contract

```bash
cd packages/hardhat
npx hardhat compile
npx hardhat deploy-vault --network base-sepolia
```

Update `NEXT_PUBLIC_COFHE_CONTRACT_ADDRESS` in `.env.local` with the deployed address.

### 5. Run

```bash
# Development
npm run dev:miniapp

# Production
cd packages/miniapp
npx next build && npx next start
```

### 6. Deploy to Vercel

```bash
cd packages/miniapp
npx vercel --prod
```

After deploying:
1. Set environment variables in Vercel dashboard
2. Generate `accountAssociation` at [base.dev/preview](https://www.base.dev/preview)
3. Update `minikit.config.ts` with the signed values
4. Redeploy

## Security

- JWT authentication on all mutating API routes
- Webhook signature verification via `@farcaster/miniapp-node`
- IP-based rate limiting on all endpoints
- Supabase Row Level Security on all tables
- FHE-encrypted sender identity (never stored in plaintext)
- Server-only API keys (NVIDIA, Neynar)
- Content moderation via AI on every submission

## License

MIT
