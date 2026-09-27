# RentRelay Frontend

## Quick Start

```bash
cd DivHacks-2026-Track-2   # repo root (the web app lives in app/)
npm install
npm run dev
```

Open **http://localhost:3000**

## What's Inside

### Pages

| URL | What it shows |
|-----|--------------|
| `localhost:3000` | Tenant app (main product) |
| `localhost:3000/demo` | Landlord + Guardian demo (laptop browser) |

### Tenant App (localhost:3000)

Switch between users using the dropdown in the top right:

| User | Role | Status |
|------|------|--------|
| Abhimanyu | Tenant, Unit 4B (50%) | Paid — September settled |
| Kashish | Tenant, Unit 4B (50%) | Late — 8 days overdue, $15 fee |
| Musammat | Tenant, Unit 2A (100%) | Due — Oct 1 autopay scheduled |
| Arpey | Landlord | Building console + Guardian demo |

### Features

- **Dashboard** — rent dues, wallet balance, rules, activity feed
- **Unit 4B Chat** — group chat with roommates and agents (Polo, Polo-K). Type messages like "what do I owe" or "is everyone paid"
- **1-on-1 Chat** — tap the teal chat bubble. Ask "Why is ConEd $38?" or "Total owed?"
- **Notifications** — tap the bell. Click any notification for full details
- **Top up** — tap "Top up" on the wallet to simulate adding RLUSD
- **Dark mode** — tap the moon/sun icon in the nav
- **Landlord view** — select "Arpey" from dropdown. Building console with rent day simulation, agent spawning, and Guardian demo with 5 attack scenarios

### Landlord Features (select Arpey)

- **Building tab** — unit grid, tenant status, rent day simulation, agent spawn animation, audit log
- **Guardian Demo tab** — run 5 attack scenarios (scam, inflated bill, double charge, illegal fee, stolen key)
- **Rent day** — click "Rent day" to process all payments. Abhimanyu and Musammat pay, Kashish fails (short wallet)
- **Spawn agent** — click "Spawn" to watch a new tenant agent get created on-chain step by step

## Running on iPhone Simulator

> Optional. This wraps the running web app in a small SwiftUI WebView app that you create as a **separate Xcode project outside this repo**; nothing here is part of the repo's build. Start the web app first with `npm run dev`.

### Prerequisites
- Xcode installed
- The web app running (`npm run dev`)

### Setup (5 min)

1. Open Xcode → File → New → Project → iOS → App
2. Product Name: `RentRelay`, Interface: SwiftUI, Language: Swift
3. Select all code in `ContentView.swift`, delete, paste:

```swift
import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.allowsInlineMediaPlayback = true
        let webView = WKWebView(frame: .zero, configuration: config)
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        if webView.url == nil {
            webView.load(URLRequest(url: url))
        }
    }
}

struct ContentView: View {
    var body: some View {
        WebView(url: URL(string: "http://localhost:3000")!)
            .ignoresSafeArea()
    }
}
```

4. Pick iPhone 16 Pro from the device dropdown
5. Press Cmd+R

### App Icon (optional)

1. With the web app running, open `localhost:3000/icon-download.html` in Chrome
2. Click "Download Icon"
3. In Xcode: Assets → AppIcon → drag the PNG into the slot
4. Cmd+R to rebuild

## Tech Stack

- **Next.js 14** (TypeScript)
- **React 18**
- **Tailwind CSS**
- **Lucide React** (icons)
- **DM Sans + DM Mono** (fonts, loaded from Google Fonts)

## Project Structure

```
DivHacks-2026-Track-2/
├── app/
│   ├── page.tsx          # Tenant app (all views)
│   ├── demo/
│   │   └── page.tsx      # Standalone demo page (dark theme)
│   ├── layout.tsx        # Root layout + viewport meta
│   └── globals.css       # CSS variables, themes, animations
├── public/
│   ├── icon.svg          # App icon (SVG)
│   ├── icon-download.html # Download icon as PNG
│   └── manifest.json     # PWA manifest
└── package.json
```

## For Teammates

The frontend runs on mock data right now. To connect to real APIs:

1. Replace mock tenant data in `page.tsx` with `fetch('/api/state')`
2. Replace mock chat answers with `fetch('/api/chat')`
3. Replace mock attack results with `fetch('/api/attacks/:name')`
4. Replace mock rent day with `fetch('/api/tick')`

All mock data is at the top of `page.tsx` — search for `initT`, `ACT`, `CHAT1`, `GRP`, `ATK`, `AUD`.

## Environment

No `.env` needed for the frontend alone. When connecting to backend APIs, add:

```
NEXT_PUBLIC_API_URL=http://localhost:3001
```
