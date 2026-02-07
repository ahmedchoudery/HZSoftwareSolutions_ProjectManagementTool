# HZ Project Management Tool

A collaborative project management tool similar to Trello/Asana, built for the HZSoftwareSolutions Full Stack Development Internship.

## Features
- **Authentication**: Secure login/register with JWT.
- **Projects**: Create, Read, and Delete projects.
- **Tasks**: Kanban-style board with To Do, In Progress, and Done columns.
- **Task Management**: Create, Edit, Delete, and Drag & Drop tasks.
- **Collaboration**: Add members to projects via email.
- **Real-time**: Updates, comments, and moves appear instantly via Socket.io.
- **Professional UI**: Loading states, empty states, and responsive design.

## Tech Stack
- **Backend**: Node.js, Express, MongoDB, Socket.io
- **Frontend**: HTML, CSS, Vanilla JavaScript

## Project Structure
- `client/`: Frontend files (HTML, CSS, JS).
- `server/`: Backend logic.
    - `models/`: Database schemas.
    - `routes/`: API endpoints.
    - `middleware/`: Auth middleware.
    - `config/`: Database config.
    - `server.js`: Main entry point.

## Setup & Run

1.  **Navigate to Server Directory**
    ```bash
    cd server
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Database Connection**
    - Ensure you have MongoDB running locally on `localhost:27017` or configure `.env`.

4.  **Run Server**
    ```bash
    npm start
    ```
    or
    ```bash
    npm run dev
    ```

5.  **Access App**
    Open `http://localhost:5000` in your browser.
