# API

All endpoints are local at `http://127.0.0.1:3001/api`. Successful resource payloads use `{ "data": ... }`; errors use `{ "error": "message" }`.

| Method | Endpoint | Purpose |
| --- | --- | --- |
| GET | `/health` | API health |
| GET | `/stats` | Dashboard aggregates |
| POST | `/monitors` | Create a monitor |
| GET | `/monitors?page=1&limit=20` | List monitors |
| GET/PATCH/DELETE | `/monitors/:id` | Read, edit, delete |
| POST | `/monitors/:id/pause` | Pause checks |
| POST | `/monitors/:id/resume` | Resume checks |
| GET | `/monitors/:id/checks` | Check history |
| GET | `/monitors/:id/incidents` | Incident history |
| GET | `/incidents` | All incidents |

Create example:

```json
POST /api/monitors
{"name":"Example","url":"https://example.com","intervalSeconds":60,"timeoutMs":10000}
```

Intervals are 15–86400 seconds; timeouts are 1000–60000 milliseconds. List endpoints accept `page` and `limit` (1–100).
