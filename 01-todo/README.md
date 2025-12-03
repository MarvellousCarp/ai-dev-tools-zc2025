# Django To-Do App

A simple Django application for creating, completing, and deleting to-do tasks. It demonstrates basic CRUD views, filtering by active/completed status, and server-side rendering with Django templates.

## Project layout
- `manage.py` – Django management entrypoint.
- `todo_project/` – project settings and URL configuration.
- `todo/` – application code (models, views, templates, tests).
- `templates/` – base HTML templates.

## Prerequisites
- Python 3.11+
- `pip` for installing Python packages
- (Optional) `python -m venv` for creating a virtual environment

## Setup and installation
1. **Create and activate a virtual environment** (recommended):
   ```bash
   python -m venv .venv
   source .venv/bin/activate   # On Windows: .venv\\Scripts\\activate
   ```
2. **Install dependencies** (Django is the only runtime requirement):
   ```bash
   pip install "Django>=5.0,<6.0"
   ```
3. **Apply migrations** (uses the default SQLite database):
   ```bash
   python manage.py migrate
   ```

## Running the app
From the `01-todo` directory, start the development server:
```bash
python manage.py runserver
```
Then open http://127.0.0.1:8000/ to view the to-do list UI.

## Running tests
Execute the Django test suite:
```bash
python manage.py test
```

## Additional notes
- The default database is SQLite (`db.sqlite3`). You can remove it and rerun migrations to start fresh.
- Environment variables (e.g., secret keys) should be stored in a local `.env` file, which is ignored by Git.
- Static and media files produced during development are ignored by Git; collect and serve them as needed for production deployments.
