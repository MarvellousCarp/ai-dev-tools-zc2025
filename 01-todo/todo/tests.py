from datetime import date
import time

from django.test import TestCase
from django.urls import reverse, resolve

from .models import Task
from .views import home, toggle_task, delete_task


class TaskModelTests(TestCase):
    def test_create_task_defaults_and_str(self):
        task = Task.objects.create(title="Test task", description="", due_date=None)

        self.assertEqual(task.title, "Test task")
        self.assertEqual(task.description, "")
        self.assertFalse(task.is_completed)
        self.assertIsNone(task.due_date)
        self.assertEqual(str(task), "Test task")

    def test_timestamps_auto_populate_and_update(self):
        task = Task.objects.create(title="With timestamps")

        self.assertIsNotNone(task.created_at)
        self.assertIsNotNone(task.updated_at)

        original_updated_at = task.updated_at
        time.sleep(0.01)
        task.title = "Updated"
        task.save()

        task.refresh_from_db()
        self.assertGreater(task.updated_at, original_updated_at)


class HomeViewTests(TestCase):
    def test_get_all_tasks_ordered_newest_first(self):
        older = Task.objects.create(title="Older")
        newer = Task.objects.create(title="Newer")

        response = self.client.get(reverse("home"))
        self.assertEqual(response.status_code, 200)
        tasks = list(response.context["tasks"])
        self.assertEqual(tasks, [newer, older])

    def test_filter_active_and_completed(self):
        active_task = Task.objects.create(title="Active")
        completed_task = Task.objects.create(title="Done", is_completed=True)

        response_active = self.client.get(reverse("home"), {"filter": "active"})
        self.assertQuerySetEqual(response_active.context["tasks"], [active_task], transform=lambda x: x)

        response_completed = self.client.get(reverse("home"), {"filter": "completed"})
        self.assertQuerySetEqual(response_completed.context["tasks"], [completed_task], transform=lambda x: x)

    def test_post_creates_task_with_optional_fields(self):
        due = date.today()
        response = self.client.post(reverse("home"), {
            "title": "New task",
            "description": "Details",
            "due_date": due.strftime("%Y-%m-%d"),
        })

        self.assertRedirects(response, reverse("home"))
        task = Task.objects.get()
        self.assertEqual(task.title, "New task")
        self.assertEqual(task.description, "Details")
        self.assertEqual(task.due_date, due)

    def test_post_with_invalid_due_date_ignores_it(self):
        self.client.post(reverse("home"), {
            "title": "Task without valid due date",
            "due_date": "invalid-date",
        })

        task = Task.objects.get()
        self.assertIsNone(task.due_date)

    def test_post_without_title_does_not_create_task(self):
        response = self.client.post(reverse("home"), {
            "description": "No title here",
        })

        self.assertRedirects(response, reverse("home"))
        self.assertEqual(Task.objects.count(), 0)

    def test_csrf_token_present_in_form(self):
        response = self.client.get(reverse("home"))
        self.assertContains(response, "csrfmiddlewaretoken")

    def test_rendering_of_optional_fields_and_tags(self):
        task = Task.objects.create(
            title="Task with extras",
            description="Extra details",
            due_date=date(2024, 1, 1),
            is_completed=True,
        )

        response = self.client.get(reverse("home"))
        content = response.content.decode()

        self.assertIn("Extra details", content)
        self.assertIn("Due: 2024-01-01", content)
        self.assertIn("Done", content)

    def test_filter_tabs_show_active_state(self):
        response_active = self.client.get(reverse("home"), {"filter": "active"})
        self.assertContains(response_active, "tab--active\">\n                ACTIVE")

        response_completed = self.client.get(reverse("home"), {"filter": "completed"})
        self.assertContains(response_completed, "tab--active\">\n                COMPLETED")


class ToggleTaskTests(TestCase):
    def test_toggle_flips_completion_status(self):
        task = Task.objects.create(title="Toggle me")

        response = self.client.post(reverse("toggle_task", args=[task.id]))
        self.assertRedirects(response, reverse("home"))

        task.refresh_from_db()
        self.assertTrue(task.is_completed)

    def test_toggle_non_existent_task_returns_404(self):
        response = self.client.post(reverse("toggle_task", args=[999]))
        self.assertEqual(response.status_code, 404)


class DeleteTaskTests(TestCase):
    def test_delete_existing_task(self):
        task = Task.objects.create(title="Delete me")

        response = self.client.post(reverse("delete_task", args=[task.id]))
        self.assertRedirects(response, reverse("home"))
        self.assertEqual(Task.objects.count(), 0)

        response_after = self.client.get(reverse("home"))
        self.assertContains(response_after, "No tasks yet.")

    def test_delete_non_existent_task_returns_404(self):
        response = self.client.post(reverse("delete_task", args=[123]))
        self.assertEqual(response.status_code, 404)


class RoutingTests(TestCase):
    def test_url_patterns(self):
        self.assertEqual(resolve(reverse("home")).func, home)
        self.assertEqual(resolve(reverse("toggle_task", args=[1])).func, toggle_task)
        self.assertEqual(resolve(reverse("delete_task", args=[1])).func, delete_task)
