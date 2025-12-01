# todo/models.py
from django.db import models

class Task(models.Model):
    title = models.CharField(max_length=255)          # short text
    description = models.TextField(blank=True)        # optional longer text
    is_completed = models.BooleanField(default=False) # done / not done
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    due_date = models.DateField(null=True, blank=True)  # optional

    def __str__(self):
        return self.title
