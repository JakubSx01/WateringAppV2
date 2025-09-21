# 🌿 PlantCare (WateringAppV2)

Aplikacja webowa do zarządzania roślinami domowymi i monitorowania ich podlewania. Użytkownicy zakładają konto, dodają swoje rośliny, wykonują akcje podlewania i przeglądają historię.

> Frontend: React • Backend: Django REST • DB: PostgreSQL • Auth: JWT

---

## Spis treści

* [Funkcje](#funkcje)
* [Architektura](#architektura)
* [Stos technologiczny](#stos-technologiczny)
* [Szybki start (lokalnie)](#szybki-start-lokalnie)
* [Konfiguracja środowiska](#konfiguracja-środowiska)
* [API (skrót)](#api-skrót)
* [Role i uprawnienia](#role-i-uprawnienia)
* [Bezpieczeństwo – zalecenia](#bezpieczeństwo--zalecenia)
* [Wdrożenie (zarys)](#wdrożenie-zarys)
* [Rozwój / TODO](#rozwój--todo)
* [Licencja](#licencja)

---

## Funkcje

* Rejestracja i logowanie użytkowników (JWT).
* Dodawanie / usuwanie roślin w swoim koncie.
* Akcja **„podlej roślinę”** + zapis do historii.
* Podgląd historii podlewania.
* Intuicyjny panel użytkownika (dashboard).

---

## Architektura

```
Frontend (React)  ──Axios──►  Backend (Django REST, JWT)  ──ORM──►  PostgreSQL
```

* **Frontend** (`Frontend/my-react-app`): routing, UI, wywołania API.
* **Backend** (`Backend/MyappBackend`): REST API (Django + DRF), autoryzacja JWT, logika roślin i podlewań.
* **Baza**: PostgreSQL – użytkownicy, rośliny globalne, rośliny użytkowników, historia podlewania.

---

## Stos technologiczny

**Backend**

* Django, Django REST Framework
* `django-cors-headers`
* JWT (`djangorestframework-simplejwt`)
* PostgreSQL (`psycopg2`)
* Python 3.11+

**Frontend**

* React, React Router
* Axios
* Node.js 18+ / npm

---

## Szybki start (lokalnie)

### Wymagania

* Python 3.11+
* Node.js 18+ i npm
* PostgreSQL 14+

### Backend

```bash
cd Backend/MyappBackend
python -m venv .venv
# Windows: .venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
python manage.py migrate
python manage.py createsuperuser  # opcjonalnie
python manage.py runserver
```

Domyślnie serwer działa pod `http://127.0.0.1:8000/`.

### Frontend

```bash
cd Frontend/my-react-app
npm install
npm start
```

Domyślne dev-URL: `http://localhost:3000/`.
Skonfiguruj URL API w `.env` frontendu (patrz niżej).

---

## Konfiguracja środowiska

### Backend – plik `.env` (przykład)

Utwórz `Backend/MyappBackend/.env`:

```
# Django
SECRET_KEY=zmien_to_na_silny_klucz
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# DB
DB_NAME=plantcare
DB_USER=postgres
DB_PASSWORD=postgres
DB_HOST=127.0.0.1
DB_PORT=5432

# CORS/CSRF – podaj swoje domeny frontowe
CORS_ALLOWED_ORIGINS=http://localhost:3000
CSRF_TRUSTED_ORIGINS=http://localhost:3000
```

> **Ważne:** w produkcji wyłącz `DEBUG`, ustaw restrykcyjny `ALLOWED_HOSTS` i zawęź CORS do zaufanych domen.

### Frontend – plik `.env` (przykład)

W katalogu `Frontend/my-react-app`:

```
REACT_APP_API_URL=http://127.0.0.1:8000
```

W kodzie frontendu odwołuj się do `process.env.REACT_APP_API_URL`.

---

## API (skrót)

### Autoryzacja (JWT)

* `POST /api/token/`
  Body: `{ "username": "...", "password": "..." }`
  Response: `{ "access": "...", "refresh": "..." }`

* `POST /api/token/refresh/`
  Body: `{ "refresh": "..." }`
  Response: `{ "access": "..." }`

### Rośliny i podlewanie (przykłady)

* `GET /api/plants/` – lista gatunków (globalna).
* `GET /api/user-plants/` – lista roślin zalogowanego użytkownika.
* `POST /api/user-plants/` – dodaj roślinę do swojego konta.
* `DELETE /api/user-plants/{id}/` – usuń roślinę z konta.
* `POST /api/user-plants/{id}/water/` – akcja „podlej” + zapis w historii.
* `GET /api/watering-history/` – historia podlewania zalogowanego użytkownika.

> Wszystkie endpointy (poza logowaniem/rejestracją) wymagają nagłówka `Authorization: Bearer <ACCESS_TOKEN>`.

---

## Role i uprawnienia

* **User** – zarządza *swoimi* roślinami, podlewa, przegląda historię.
* **Moderator** – przegląda rośliny i historię użytkowników, akceptuje zgłoszenia nowych gatunków.
* **Admin** – pełny dostęp (Django Admin), zarządzanie użytkownikami/rolami, eksport danych.

---

## Bezpieczeństwo – zalecenia

* **CSRF**: tokeny Anti-CSRF dla operacji modyfikujących stan.
* **CSP**: ustaw nagłówek `Content-Security-Policy` (np. `default-src 'self'`).
* **CORS**: zawęź do konkretnych domen frontendu (bez `*`).
* **Clickjacking**: `X-Frame-Options: DENY` lub `frame-ancestors` w CSP.
* **MIME sniffing**: `X-Content-Type-Options: nosniff`.
* **Ukrywanie szczegółów serwera**: usuń/zmień nagłówki `Server`/`X-Powered-By`.
* **Obsługa błędów**: niestandardowe strony błędów (bez stack trace w prod).
* **Dependencje**: aktualizuj pakiety i włącz automatyczne alerty (np. Dependabot).

Checklistę wdrożeniową rozbij w `docs/SECURITY.md` (nagłówki, CORS/CSRF, rotacja kluczy, backup DB, monitoring).

---

## Wdrożenie (zarys)

**Cel:** 1 VPS / 3 kontenery (Frontend przez NGINX, Backend z Gunicorn, Postgres).

* Certyfikat SSL (Let’s Encrypt) terminowany w NGINX.
* CI/CD (GitHub Actions): build + deploy obrazów + migracje + restart usług.
* Zmienna `DJANGO_SETTINGS_MODULE` wskazująca na konfigurację prod (np. `MyappBackend.settings`).

Przykład uruchomienia backendu w prod:

```bash
gunicorn MyappBackend.wsgi:application --bind 0.0.0.0:8000 --workers 3
```

> Jeśli korzystasz z Docker Compose: serwisy `frontend`, `backend`, `db`, wolumen na dane Postgresa i sieć wewnętrzna. Frontend serwuj statycznie (`npm run build` + NGINX).

---

## Rozwój / TODO

* [ ] Testy jednostkowe (pytest + DRF).
* [ ] Walidacja formularzy po stronie frontendu (spójne komunikaty błędów).
* [ ] Sekcja „Zrzuty ekranu” w README.
* [ ] `Dockerfile` + `docker-compose.yml` dla środowiska produkcyjnego.
* [ ] `SECURITY.md` + `CONTRIBUTING.md`.

---

## Licencja

Brak pliku licencji w repozytorium – wybierz i dodaj (np. MIT/Apache-2.0) lub pozostaw „All rights reserved”.
