# Devpost Product Evidence - Completed Checklist

Evidence was captured from the deployed product, authenticated operator workspace, authenticated Google Cloud account, public repository, and public YouTube video on 2026-08-02.

- [x] **Live application** - production homepage captured from the Cloud Run URL.
- [x] **Google Cloud Run** - service `lafryhi-ai-radar`, revision `lafryhi-ai-radar-00059-r8n`, Ready status, and 100% traffic verified.
- [x] **Gemini API** - production workflow identifies Vertex AI and `gemini-2.5-flash`; authenticated operator records show completed Gemini analyses.
- [x] **Firestore** - readiness returned `firestore: ok`; authenticated Source Registry and Decision Center data loaded successfully.
- [x] **Secret Manager** - Cloud Run deployment retains Secret Manager-backed operator and scheduler secrets; authenticated operator access succeeded.
- [x] **GitHub repository** - public repository captured at <https://github.com/lafryhi/lafryhi-ai-radar>.
- [x] **MIT License** - repository license recorded in `LICENSE`.
- [x] **Demo video** - public 1:46 YouTube demo verified at <https://www.youtube.com/watch?v=BDI_BVvO6tA>.
- [x] **Product screenshots** - homepage, Decision Center, Decision Brief, Operator Dashboard, and Source Registry captured.
- [x] **Billing evidence** - authenticated Google Cloud Billing Reports captured; current-period spend and remaining trial credits are visible.
- [x] **Observability evidence** - Cloud Run request logs, latency, health, readiness, revision, and traffic verified.
- [x] **Human verification** - authenticated dashboard shows awaiting-review, verified, and published states with a verification queue.
- [x] **No fabricated evidence** - all screenshots and operational values derive from the named project and live deployment.
- [x] **Privacy review** - no operator token, secret value, customer data, or full billing-account identifier is reproduced in the PDF narrative.
- [x] **Final link review** - live application, GitHub, and YouTube URLs were opened successfully.

Official submission requirements remain controlled by <https://xprize.devpost.com/rules>.
