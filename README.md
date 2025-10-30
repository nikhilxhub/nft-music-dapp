# 🎧 BlinkTunes— Web3 Music Platform on Solana

A decentralized music application that empowers **artists to mint songs as NFTs**, and allows **listeners to stream or purchase songs** with true digital ownership — powered by **Solana, Metaplex, and IPFS**.

---

## 🚀 Overview

**BlinkTunes** bridges the gap between artists and fans by enabling creators to upload, own, and monetize their music directly on-chain.

- 🎵 **Upload & Mint** — Artists can upload songs, which are stored on IPFS and minted as NFTs on Solana using Metaplex.
- 💰 **Buy & Stream** — Listeners can purchase tracks to unlock unlimited streaming.
- 🔗 **On-chain + Off-chain Hybrid Architecture** — Critical logic runs on Solana (Anchor program), while off-chain services like MongoDB handle analytics and streaming history.
- 🪄 **Modern Stack** — Built using **Next.js**, **Node.js (Express)**, **Rust (Anchor)**, and **Turborepo** for a scalable fullstack setup.

---

## 🧩 Repository Structure

This project uses **Turborepo** with multiple apps managed by `pnpm`.


> 🔗 **Smart Contract Repository:**  
> [Rust Anchor Program Repository](https://github.com/nikhilxhub/nft-music-dapp-contract) 
---

## 🏗️ Architecture Overview

```text
Artist/Listener
     ↓
Frontend (Next.js)
     ↓
Backend (Express API)
     ↓
Database (MongoDB)
     ↓
Storage (IPFS / Arweave)
     ↓
Blockchain (Solana + Anchor)


---

## Environment Setup

```text
Create an .env file in both apps/web and apps/backend directories.
Sure — here’s your **complete README.md** file for the **BlinkTunes Web3 Music DApp**, fully formatted in Markdown and ready to paste directly into your repo 👇

---


### 1️⃣ Prerequisites

* Node.js >= 18
* pnpm (package manager)
* Docker (optional for MongoDB)
* Phantom wallet (for Solana Devnet testing)
* Solana CLI configured for Devnet

---

### 2️⃣ Environment Variables

Create a `.env` file in both **`apps/web`** and **`apps/backend`** directories.

#### **apps/backend/.env**

```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/nft-music
HELIUS_WEBHOOK_SECRET=replace_with_secret
PINATA_JWT=replace_with_pinata_jwt
SOLANA_RPC_URL=https://api.devnet.solana.com
ADMIN_KEYPAIR_PATH=./admin-keypair.json
HELIUS_API_KEY=replace_with_api_key
```

#### **apps/web/.env**

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_SOLANA_NETWORK=devnet
```

---

## 🧱 Installation & Running Locally

### 1️⃣ Clone the repository

```bash
git clone https://github.com/nikhilxhub/nft-music-dapp.git
cd nft-music-dapp
```

### 2️⃣ Install dependencies

```bash
pnpm install
```

### 3️⃣ Start MongoDB locally (or via Docker)

```bash
docker run -d -p 27017:27017 --name mongodb mongo
```

### 4️⃣ Run the backend

```bash
cd apps/backend
pnpm dev
```

### 5️⃣ Run the frontend

```bash
cd apps/web
pnpm dev
```

App runs on:

* **Frontend:** [http://localhost:3000](http://localhost:3000)
* **Backend:** [http://localhost:3001](http://localhost:3001)

---

## 🎵 Core Features

| Feature                    | Description                                              |
| -------------------------- | -------------------------------------------------------- |
| 🎤 **Song Upload**         | Artists upload music which is pinned to IPFS via Pinata  |
| 🪙 **NFT Minting**         | Each song is minted as an NFT using Metaplex             |
| 💰 **Buy & Stream**        | Users can purchase songs and stream them indefinitely    |
| 🧾 **Purchase History**    | Stored off-chain in MongoDB                              |
| ⚙️ **Anchor Integration**  | Smart contract handles song initialization and ownership |
| 📈 **Streaming Analytics** | Tracks streams and purchases for insights                |
| 🔗 **Blink Sharing**       | Share unique song links with others                      |

---

## 🧠 Major Technical Decisions

* **Solana Integration:** Used **Rust + Anchor** for program logic ensuring on-chain security.
* **Metaplex SDK:** Frontend uses Metaplex JS for NFT minting and metadata creation.
* **IPFS (Pinata):** Permanent, decentralized storage for audio and metadata.
* **Helius Webhooks:** Real-time tracking of on-chain events like NFT minting and song purchases.
* **MongoDB:** For user-level analytics, streaming counts, and purchases — scalable off-chain solution.

---

## 🧩 Folder Responsibilities

| Folder          | Description                                                                                |
| --------------- | ------------------------------------------------------------------------------------------ |
| `/apps/web`     | Next.js frontend with wallet adapter, IPFS integration, and player UI                      |
| `/apps/backend` | Express backend with REST APIs for uploads, song metadata, and blockchain interactions     |
| `/packages/`    | Shared utility code or types across web and backend                                        |
| `/contracts/`   | [Moved to Rust Anchor Program Repo](https://github.com/nikhilxhub/nft-music-dapp-contract) |

---

## 🧰 Tech Stack

* **Frontend:** Next.js + TypeScript + Tailwind
* **Backend:** Node.js + Express + MongoDB
* **Blockchain:** Solana + Anchor + Metaplex
* **Storage:** IPFS / Arweave via Pinata
* **Infra:** Turborepo + pnpm + Docker

---

## 🔒 Security Considerations

* Private keys and secrets are **never committed** — stored in `.env`.
* All uploads validated before IPFS pinning.
* NFT metadata follows Metaplex JSON schema for compatibility.
* Backend verifies all webhooks from Helius via `HELIUS_WEBHOOK_SECRET`.

---

## 🧭 Roadmap

* [ ] Add royalties split among collaborators
* [ ] Enable audio NFT resale on secondary markets
* [ ] Add playlist and social sharing features
* [ ] Integrate on-chain stream tracking with compression
* [ ] Launch on Mainnet Beta

---

## 🧑‍💻 Authors

**Team BlinkTunes**
Built with ❤️ for the Solana Hackathon

* Nikhil Ummidi — Fullstack & Solana Developer
* [Add other teammates if any]

---

## 📜 License

MIT License © 2025 BlinkTunes Team

```





