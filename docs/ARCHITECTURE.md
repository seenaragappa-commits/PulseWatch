# PulseWatch architecture

PulseWatch is a modular monolith: the React/Vite dashboard calls one local Express API, which validates requests, uses repositories for SQLite data, and has a small monitoring worker.

`Browser → /api → controllers → validation/services → repositories → SQLite`

Each second the worker finds enabled monitors that are due. It limits concurrent work, prevents a duplicate in-flight check for the same monitor, performs a DNS-pinned HTTP(S) request, then stores the result in one database transaction. Three consecutive DOWN results open one incident. The next UP result resolves that open incident.

The tables are `monitors`, `checks` (many per monitor), and `incidents` (many per monitor). Foreign keys, indexes, a one-open-incident partial unique index, and WAL mode protect consistency and common query speed.

For a larger deployment, put the scheduler behind a distributed lock, move SQLite to a managed relational database, and use a job queue. Those changes are deliberately not required for this local MVP.

On shutdown, the scheduler stops accepting new checks and waits for already-running checks to finish database persistence before the SQLite connection closes. This is process-local graceful shutdown, not a distributed coordination mechanism.
