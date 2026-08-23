# Security

MathTiba's MVP has no accounts, no server-side database, and no
secrets. All state lives in the browser (`localStorage`) for a single
session, and every math verification endpoint (`/api/verify`,
`/api/check-answer`) runs deterministic, dependency-free arithmetic —
no API keys, no third-party calls, no environment variables are
required to run or deploy the app (see `.env.example`).

If you find a security issue in this repository, please open a GitHub
issue describing it. This is a hackathon MVP, not a production system
handling real student data — do not deploy it to collect personally
identifiable information without adding appropriate consent, storage,
and data-protection measures first.
