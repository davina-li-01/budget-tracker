# Budget Tracker Web App

A beginner-friendly budget tracker built with HTML, CSS, and Vanilla JavaScript.

This project demonstrates core JavaScript concepts for a college assignment:
- DOM manipulation
- Event handling
- State management with arrays/objects
- Optional persistence with `localStorage`

## Features

- Add expenses with amount, category, and optional description
- View all expenses in a dynamically updated table
- Delete individual expenses
- Filter visible expenses by category
- See running total spending
- See dashboard breakdown by category
- Reset all app data without refreshing the page
- Persist data in `localStorage`

## Technologies Used

- HTML5
- CSS3
- Vanilla JavaScript (ES6)

## File Structure

- `index.html` — semantic page structure and app UI
- `styles.css` — clean, simple styling
- `script.js` — app logic, state, events, and rendering
- `README.md` — setup and usage guide
- `PROPOSAL.md` — assignment planning notes

## How to Run Locally

1. Download or clone this repository.
2. Open the project folder.
3. Double-click `index.html` (or open it in your browser).
4. Start adding expenses.

No build tools or package installs are required.

## How It Works (High-Level)

- The app stores expenses in an array called `expenses`.
- Every expense is an object:

	```js
	{
		id: 1,
		amount: 20,
		category: "Food",
		description: "Lunch"
	}
	```

- Whenever data changes (add/delete/reset), the app:
	1. Saves to `localStorage`
	2. Re-renders the expense list
	3. Recalculates total spending
	4. Rebuilds the category dashboard

## GitHub Pages Deployment Instructions

1. Push this project to GitHub.
2. Open your repository on GitHub.
3. Go to **Settings**.
4. Click **Pages** in the sidebar.
5. Under **Build and deployment**, choose:
	 - **Source**: Deploy from a branch
	 - **Branch**: `main` (root)
6. Save.
7. Wait for deployment to finish.
8. Open the generated GitHub Pages URL.

## Learning Notes

This project is intentionally written in a clear, beginner-readable style with comments explaining:
- How the expense array is the single source of truth
- How DOM updates are triggered after each data change
- How totals and dashboard values are recalculated from state

