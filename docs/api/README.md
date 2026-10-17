# API summary (all under /api)
auth: POST register, POST login, GET/PATCH me | crops: GET list (q,category,state,minPrice,maxPrice,page,limit), GET /mine, GET/:id, POST, PUT/:id, DELETE/:id (multipart, field `images`)
cart (buyer): GET, PUT items, DELETE items/:cropId | orders: POST, POST checkout, GET, GET/:id, PATCH/:id/status
companies: GET (verified only for non-admin), GET match?crop&country (farmer), GET/:id, admin: POST, PUT, POST/:id/verify, DELETE | enquiries: POST, GET (farmer)
collection-centers / export-guides: GET public; admin POST/PUT/DELETE (+ GET /all, POST /:id/verify for centers)
notifications: GET, POST read-all, PATCH/:id/read | currency: GET rates, GET convert | ai (farmer): POST price-prediction, crop-recommendation | admin: users, crops, orders, stats
AI service: GET /health, POST /predict/price, POST /recommend/crop
