"""Les trois choses que le serveur garde : les temps, les bugs signalés, les sauvegardes."""
from django.db import models


class Score(models.Model):
    MODES = [('solo', 'Solo'), ('coop', 'Coop'), ('versus', 'Versus')]
    world = models.PositiveSmallIntegerField('monde')
    level = models.PositiveSmallIntegerField('niveau (0 = premier)')
    name = models.CharField('nom', max_length=40)
    time = models.FloatField('temps (s)')
    deaths = models.PositiveIntegerField('chutes', default=0)
    mode = models.CharField(max_length=8, choices=MODES, default='solo')
    # version du dessin des niveaux (13 = les grands niveaux de la version 1.3 ; 0 = avant)
    version = models.PositiveSmallIntegerField('version des niveaux', default=0)
    created = models.DateTimeField(auto_now_add=True)
    ip_hash = models.CharField(max_length=16, blank=True)

    class Meta:
        indexes = [models.Index(fields=['world', 'level', 'time'])]
        ordering = ['world', 'level', 'time']

    def __str__(self):
        return f'{self.world}-{self.level + 1} · {self.name} · {self.time:.2f} s'


class Bug(models.Model):
    text = models.TextField('description')
    info = models.TextField('infos techniques', blank=True)
    created = models.DateTimeField(auto_now_add=True)
    done = models.BooleanField('corrigé', default=False)

    class Meta:
        ordering = ['-created']

    def __str__(self):
        return self.text[:60]


class Save(models.Model):
    code = models.CharField(max_length=8, unique=True)
    data = models.TextField()
    created = models.DateTimeField(auto_now_add=True)
    used = models.PositiveIntegerField('récupérations', default=0)

    class Meta:
        ordering = ['-created']

    def __str__(self):
        return self.code
