# PocketSmart

A lightweight budget and spending recommendation dashboard. Track monthly cash flow, set a budget and savings goal, and explore spending by category.

## Run it

Open `index.html` in a modern browser, or start a local server from this directory:

```sh
python3 -m http.server 8000
```

Then visit [http://localhost:8000](http://localhost:8000).

## What it does

- Shows monthly income, expenses, available cash, and budget progress.
- Adds and searches transactions, with income and expense filters.
- Breaks down spending by category and generates rule-based suggestions.
- Edits the monthly budget and a savings goal.
- Exports transactions to CSV.
- Saves data in this browser using `localStorage`; nothing is sent to a server.

The dashboard starts with example transactions. This is a front-end prototype: it does not connect to bank accounts, and its recommendations are simple budgeting rules, not personalized financial advice.