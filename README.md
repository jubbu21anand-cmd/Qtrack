# QTrack

QTrack is a collaborative study and productivity tracking application designed to help students monitor question practice, syllabus completion, study sessions, and examination performance from a single interface.

The application combines daily progress tracking, analytics, syllabus management, study timing, shared sessions, and exam analysis.

**Live Demo:** https://qtrack-alpha.vercel.app/

---

## Features

### Question Tracker

Track daily question practice for multiple users and subjects.

* Add and manage multiple users
* Create and manage subjects
* Log questions solved for each subject
* Add entries for previous dates
* Finalise a day's log to prevent further changes
* View individual and combined progress

### Progress Analytics

Analyse question-solving activity over time.

* Daily, weekly, and monthly charts
* Individual progress comparison
* Trend analysis
* Historical activity tracking
* Navigation through previous weeks and months

### Calendar and History

Review previous study activity and question logs.

* Calendar view of recorded activity
* Historical question logs
* Study consistency tracking
* Activity-based calendar display

### Shared Study Sessions

Collaborate with other users through shared sessions.

* Create a study session
* Generate and share a Session ID
* Join existing sessions
* Maintain session history
* Automatically restore the previously used session

### Leaderboard

Compare progress between users within a shared session.

* Compare question counts
* View individual performance
* Track overall contribution

### Syllabus Tracker

Track syllabus progress at the chapter level.

* Organise chapters by subject
* Group chapters by priority or unit
* Track multiple completion stages
* Mark chapters as:

  * Theory completed
  * PYQs completed
  * Mastered
  * Backlog
* Search and filter chapters
* View overall and subject-wise completion statistics

### Study Tracker

Track focused study sessions using built-in timing tools.

* Stopwatch mode
* Countdown timer
* Visual timer interface
* Study session tracking

### Exam Analytics

Record and analyse performance across multiple examinations.

* Add and manage tests
* Record test name and date
* Record total and obtained marks
* Record rank and total number of candidates
* Automatic percentile calculation
* Subject-wise score breakdown
* Personal notes for each test
* Paper difficulty analysis
* Topic-wise performance analysis
* Support for JEE Main and JEE Advanced test classification
* Optional password protection for individual exam data

### Customisation

* Dark mode
* Light mode
* Custom user colours
* Responsive desktop and mobile layouts

### Data and Sessions

QTrack supports persistent study sessions and shared progress tracking.

* Session information is remembered
* Data persists across sessions
* Shared session functionality
* Offline-friendly behaviour

---

## Technology

QTrack is currently built using:

* HTML5
* CSS3
* Vanilla JavaScript

The application is currently structured as a single-file web application, with the primary interface, styling, and application logic contained in `index.html`.

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/jubbu21anand-cmd/Qtrack.git
```

### Open the project directory

```bash
cd Qtrack
```

Open `index.html` in a modern web browser.

For development, VS Code with a local development server such as Live Server can be used.

---

## Project Structure

```text
Qtrack/
│
├── index.html      # Main application
└── README.md       # Project documentation
```

---

## Live Demo

The application is deployed at:

https://qtrack-alpha.vercel.app/

---

## Development

QTrack is under active development. Recent development has expanded the project from a question-tracking application into a broader study management platform.

Recent additions include:

* Study Tracker
* Syllabus Tracker
* Exam Analytics
* Historical session tracking
* Backdated logging
* Trend analysis
* Session history
* Improved chart visualisation
* Mobile layout improvements
* Light and dark themes
* Shared study sessions

---

## Planned Improvements

Potential future improvements include:

* [ ] User authentication and account management
* [ ] More detailed analytics
* [ ] Data export and backup options
* [ ] Notifications and reminders
* [ ] Improved cloud synchronisation
* [ ] Additional exam analysis tools
* [ ] Further mobile interface improvements
* [ ] Modular project structure

---

## Contributing

Contributions, feature suggestions, and bug reports are welcome.

1. Fork the repository.
2. Create a new branch.

```bash
git checkout -b feature/my-feature
```

3. Make the required changes.
4. Commit the changes.

```bash
git commit -m "Add my feature"
```

5. Push the branch.

```bash
git push origin feature/my-feature
```

6. Open a Pull Request.

---

## Bug Reports

Bugs and issues can be reported through the application's built-in feedback options or through the GitHub repository.

---

## Author

**Arnav Anand**

GitHub: https://github.com/jubbu21anand-cmd

---

## License

This project currently does not include a license.

A suitable open-source license may be added in a future release.
