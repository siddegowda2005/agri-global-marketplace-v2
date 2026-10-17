# Skipped / Deferred
- Optional crop image identification: skipped (needs dataset and training; must not risk upload flow).
- Map markers for individual crop locations: crops have text locations only; geocoding not integrated.
- Audit logs collection, ModelMetadata collection: metadata stored as JSON beside models instead.
- React Hook Form / Zod on frontend: manual validation used for simplicity (backend uses Zod).
- Server-side JWT revocation on logout: stateless JWT, token removed client-side.
- Real company and collection-center data: not fabricated; must be imported via admin with source URLs.
- Payments, real shipping: excluded by requirement.
