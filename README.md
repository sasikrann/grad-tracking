# Web Application for Tracking Graduate Thesis Progress

This project is a web application for tracking graduate thesis progress. The system is designed to help students, advisors, and related academic staff monitor thesis stages, progress updates, approvals, and important thesis information in one place.

## Technology Stack

### Frontend

- Vue
- Tailwind CSS
- Vite

### Backend

- Node.js

### Database

- PostgreSQL

## Main Features

- Track graduate thesis progress
- Manage thesis information
- Manage student and advisor information
- Record progress updates
- Support thesis status tracking
- Store structured data using PostgreSQL

## Importing Students

The Admin Student Dashboard accepts `.csv` and `.xlsx` files (maximum 5 MB and 1,000 student rows). Use the **Download Template** button on `/admin/student-dashboard` to get the required column layout:

- Student ID
- Full Name
- Program
- Degree Level (`Master` or `Doctoral`)
- Enrollment Academic Year
- Semester (`1` or `2`)
- Expected Graduation Year
- Advisor ID (optional, but it must already exist when provided)

The frontend sends the selected file to `POST /api/students/import`. The backend validates every row and performs the student upserts in one database transaction. After a successful import, the dashboard reloads `GET /api/students` so the summary cards and table update immediately.

The **Export Excel** action calls `GET /api/students/export` and downloads all current student data as a UTF-8 CSV file that can be opened directly in Excel.

## Advisor Milestone Summary API

The advisor milestone summary is available from:

```text
GET /api/advisors/:advisorId/milestone-summary
GET /api/advisors/:advisorId/milestone-summary?semester=1&year=2026
```

The response contains overall status counts and a per-milestone breakdown. `overallProgress` is calculated as `(Completed + Approved) / all eligible student milestones × 100`; milestones without a student status row are counted as `Missing`.
