from datetime import datetime

from django.shortcuts import render, redirect, get_object_or_404
from .models import Task


def home(request):
    # читаем значение фильтра из query-параметра (?filter=active / completed / all)
    current_filter = request.GET.get("filter", "all")

    if request.method == "POST":
        title = request.POST.get("title")
        description = request.POST.get("description")
        due_date_str = request.POST.get("due_date")

        if title:
            due_date = None
            if due_date_str:
                try:
                    due_date = datetime.strptime(due_date_str, "%Y-%m-%d").date()
                except ValueError:
                    due_date = None

            Task.objects.create(
                title=title,
                description=description or "",
                due_date=due_date,
            )

        # после добавления задачи просто возвращаемся на главную (пока без сохранения фильтра)
        return redirect("home")

    # базовый queryset
    tasks = Task.objects.all().order_by("-created_at")

    # применяем фильтр
    if current_filter == "active":
        tasks = tasks.filter(is_completed=False)
    elif current_filter == "completed":
        tasks = tasks.filter(is_completed=True)

    context = {
        "tasks": tasks,
        "current_filter": current_filter,
    }
    return render(request, "home.html", context)


def toggle_task(request, task_id):
    task = get_object_or_404(Task, pk=task_id)
    task.is_completed = not task.is_completed
    task.save()
    return redirect("home")


def delete_task(request, task_id):
    task = get_object_or_404(Task, pk=task_id)
    task.delete()
    return redirect("home")
