# 💸 Personal Expense Manager

A mobile-first web app that pulls your Splitwise group expenses, cross-references them with your bank statements, and shows exactly what you owe — with charts and tables.

---

## 🚀 Quick Start

```bash
# 1. Install all dependencies
npm run install:all

# 2. Start dev servers (frontend + backend in parallel)
npm run dev
```

- **Frontend** → http://localhost:5173  
- **Backend API** → http://localhost:3001

---

## 🔑 Splitwise API Key

1. Go to https://secure.splitwise.com/apps
2. Click **"Register your application"**
3. Copy the **API key**
4. Paste it into the app's **Splitwise** tab

> The key is stored only in your browser's localStorage — never sent anywhere except directly to Splitwise.

---

## 📊 How It Works

### The matching logic
| Bank Transaction | Splitwise Match? | What counts as your expense |
|---|---|---|
| ✅ Matched | Yes (within 5 days, ~same amount) | **Your owed share** (e.g. $15 of a $60 dinner) |
| ❌ No match | No | **Full transaction amount** (100% yours) |

A match requires:
- Date within **5 days** of the Splitwise expense  
- Amount within **5%** of the total expense cost  
- Optional: description similarity boost

---

## 📁 Project Structure

```
├── server/          Express backend
│   ├── routes/
│   │   ├── splitwise.js   Splitwise API proxy (avoids CORS)
│   │   └── parse.js       PDF bank statement parser
│   └── index.js
│
└── client/          React + Vite frontend
    └── src/
        ├── pages/         Home · Splitwise · Statements · Reports
        ├── components/    Dashboard charts, table, upload UI
        ├── context/       Global state (React Context)
        ├── utils/         Matcher · Category detector · CSV parser
        └── services/      API calls
```

---

## 📂 Supported Statement Formats

### CSV
Auto-detects columns for: **Chase, BoA, Wells Fargo, Capital One, Citi, Amex, Discover**  
Required columns (any name): Date, Description/Merchant, Amount/Debit

### PDF
Text-layer extraction. Works best with bank-generated PDFs (not scanned images).  
Supported patterns: `MM/DD/YYYY`, `MM/DD`, `YYYY-MM-DD`

### Manual Entry
Enter individual transactions directly in the **Statements → Manual Entry** tab.

---

## 🛠 Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS 3 |
| Charts | Recharts 2 |
| Routing | React Router 6 |
| Backend | Node.js + Express 4 |
| PDF parse | pdf-parse |
| CSV parse | Papa Parse |
| Date utils | date-fns |
