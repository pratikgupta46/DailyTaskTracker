# Daily Priority Tracker

A Progressive Web App (PWA) for managing daily tasks with smart prioritization using the Eisenhower Matrix and a custom Smart Score algorithm.

## Features

- Add tasks with name, purpose, target completion datetime, estimated time required, priority (1-100), and Eisenhower Matrix quadrant.
- Tasks are automatically ranked by a Smart Score combining priority, urgency, Eisenhower quadrant, and effort.
- Overdue tasks are visually highlighted.
- Responsive mobile-first design with offline support via service worker.
- Export and import tasks as JSON files.
- Installable as a PWA on desktop and mobile devices.

## Installation

1. Clone or download the repository.
2. Open `index.html` in a modern browser.
3. To install on mobile, open the app URL and use "Add to Home screen".

## Development

- Uses localStorage for data persistence.
- Service worker enables offline functionality.
- Hosted on GitHub Pages: https://pratikgupta46.github.io/DailyTaskTracker/

## License

MIT License
