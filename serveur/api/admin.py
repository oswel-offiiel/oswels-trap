from django.contrib import admin

from .models import Bug, Save, Score


@admin.register(Score)
class ScoreAdmin(admin.ModelAdmin):
    list_display = ('world', 'level', 'name', 'time', 'deaths', 'mode', 'version', 'created')
    list_filter = ('world', 'level', 'mode', 'version')
    search_fields = ('name',)


@admin.register(Bug)
class BugAdmin(admin.ModelAdmin):
    list_display = ('created', 'text', 'done')
    list_filter = ('done',)
    list_editable = ('done',)


@admin.register(Save)
class SaveAdmin(admin.ModelAdmin):
    list_display = ('code', 'created', 'used')
    search_fields = ('code',)
