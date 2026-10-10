"""Tests de l'API : python manage.py test"""
import json

from django.core.cache import cache
from django.test import TestCase

from .models import Bug, Score


class ApiTests(TestCase):
    def setUp(self):
        cache.clear()

    def post(self, url, data):
        return self.client.post(url, json.dumps(data), content_type='application/json')

    def test_ping_et_cors(self):
        r = self.client.get('/api/ping/', HTTP_ORIGIN='https://exemple.org')
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.json()['ok'])
        self.assertEqual(r['Access-Control-Allow-Origin'], '*')
        r = self.client.options('/api/scores/', HTTP_ORIGIN='https://exemple.org')
        self.assertEqual(r.status_code, 204)
        self.assertIn('POST', r['Access-Control-Allow-Methods'])

    def test_scores_et_classement(self):
        for name, t in [('Oswel', 30.5), ('Zeus', 25.0), ('Oswel', 20.1), ('Ange', 41)]:
            r = self.post('/api/scores/', {'world': 4, 'level': 9, 'name': name, 'time': t, 'deaths': 2, 'mode': 'solo'})
            self.assertEqual(r.status_code, 201, r.content)
        r = self.client.get('/api/scores/top/?world=4&level=9')
        sc = r.json()['scores']
        self.assertEqual([s['name'] for s in sc], ['Oswel', 'Zeus', 'Ange'])   # un seul temps par joueur : son meilleur
        self.assertEqual(sc[0]['time'], 20.1)

    def test_versions_separees(self):
        # un vieux temps (niveau court, version 0) ne se mélange pas aux grands niveaux (version 13)
        self.post('/api/scores/', {'world': 1, 'level': 0, 'name': 'Ancien', 'time': 9.0, 'mode': 'solo'})
        r = self.post('/api/scores/', {'world': 1, 'level': 0, 'name': 'Nouveau', 'time': 95.0, 'mode': 'solo', 'v': 13})
        self.assertEqual(r.json()['rank'], 1)
        sc = self.client.get('/api/scores/top/?world=1&level=0&v=13').json()['scores']
        self.assertEqual([s['name'] for s in sc], ['Nouveau'])
        sc = self.client.get('/api/scores/top/?world=1&level=0').json()['scores']
        self.assertEqual([s['name'] for s in sc], ['Ancien'])

    def test_scores_refuses(self):
        bad = [
            {'world': 9, 'level': 0, 'name': 'A', 'time': 10},
            {'world': 1, 'level': 10, 'name': 'A', 'time': 10},
            {'world': 1, 'level': 0, 'name': '', 'time': 10},
            {'world': 1, 'level': 0, 'name': 'A', 'time': 0.5},
            {'world': 1, 'level': 0, 'name': 'A', 'time': 'abc'},
            {'world': 1, 'level': 0, 'name': 'A', 'time': float('inf')},
        ]
        for d in bad:
            r = self.client.post('/api/scores/', json.dumps(d), content_type='application/json')
            self.assertEqual(r.status_code, 400, d)
        self.assertEqual(Score.objects.count(), 0)
        r = self.client.post('/api/scores/', 'pas du json', content_type='application/json')
        self.assertEqual(r.status_code, 400)

    def test_anti_spam(self):
        codes = [self.post('/api/bugs/', {'text': f'bug numéro {i}'}).status_code for i in range(7)]
        self.assertEqual(codes[:5], [201] * 5)
        self.assertEqual(codes[5], 429)
        self.assertEqual(Bug.objects.count(), 5)

    def test_bug(self):
        r = self.post('/api/bugs/', {'text': 'La porte ne s\'ouvre pas en 2-7', 'info': {'version': '5.0', 'niveau': '2-7'}})
        self.assertEqual(r.status_code, 201)
        b = Bug.objects.get()
        self.assertIn('2-7', b.info)
        self.assertEqual(self.post('/api/bugs/', {'text': ''}).status_code, 400)

    def test_sauvegarde_nuage(self):
        r = self.post('/api/saves/', {'data': 'OT4:eyJuYW1lIjoiT3N3ZWwifQ=='})
        self.assertEqual(r.status_code, 201)
        code = r.json()['code']
        self.assertEqual(len(code), 6)
        r = self.client.get(f'/api/saves/{code.lower()}/')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['data'], 'OT4:eyJuYW1lIjoiT3N3ZWwifQ==')
        self.assertEqual(self.client.get('/api/saves/ZZZZZZ/').status_code, 404)
        self.assertEqual(self.post('/api/saves/', {'data': 'pas une sauvegarde'}).status_code, 400)
