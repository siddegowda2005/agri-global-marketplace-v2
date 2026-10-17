# Architecture
React (Vite, :5173) --/api proxy--> Express (:5000) --> MongoDB
                                         |--> FastAPI AI service (:8000, scikit-learn models in ai-service/app/models)
                                         |--> exchange-rate API (cached in MongoDB)
Maps: Leaflet + OpenStreetMap tiles in the browser. No payment gateway; no shipping.
Roles: farmer, buyer, admin (admin only via `seed:admin`). JWT bearer auth; role middleware on every route.
