## Mini Project 2: Budget Tracker

**Budget Tracker** is a browser-based budgeting tool that helps users log expenses, monitor spending totals, and view category-level insights in real time.

It is designed for beginners, students, and anyone who wants a simple way to track personal spending without installing extra software.

## Live Demo

GitHub Pages: https://davinali.github.io/budget-tracker/

## Features List

Users can:
- Create expense entries with amount, category, and description
- View and manage expenses in a dynamic table
- Delete individual expense records
- Filter expenses by category
- View total spending updates instantly
- See category-based analysis on the dashboard
- Reset all tracked data in one action
- Keep data saved between sessions using local storage

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6)
- Browser Local Storage API
- Git & GitHub (version control and hosting)

## AI Tools Used and How They Helped

- **GitHub Copilot / ChatGPT-style AI assistance** was used to:
	- Brainstorm feature ideas and user-flow improvements
	- Refine JavaScript logic structure and edge-case handling
	- Improve documentation clarity and README organization
	- Speed up debugging and explanation of errors

## Challenges Faced and How They Were Solved

- **Challenge:** Keeping UI data consistent after add/delete/reset actions.
	**Solution:** Centralized rendering steps so each state change triggers save + re-render + totals update.

- **Challenge:** Preventing invalid inputs from breaking calculations.
	**Solution:** Added form validation and safe number parsing before creating expense objects.

- **Challenge:** Preserving data after browser refresh.
	**Solution:** Implemented local storage read/write logic and hydrated state on app load.

## Future Improvements

With more time, the app could include:
- User accounts with secure login and cloud sync
- Edit/update existing expense entries
- Budget goals and alerts for overspending
- Date range filters and monthly reports
- Charts (bar/pie/line) for richer analytics
- Export to CSV/PDF and import previous records

