# SuperTokens Dashboard Setup Guide

## Quick Start

To access the SuperTokens dashboard at `https://api.localhost:3020/auth/dashboard`, you first need to create an admin user.

1. Create a new admin user using cURL checking the allowed emails in the server `Dashboard.init()` function:

```bash
curl --location --request POST 'http://localhost:3567/recipe/dashboard/user' \
--header 'rid: dashboard' \
--header 'api-key: YOUR_API_KEY' \
--header 'Content-Type: application/json' \
--data-raw '{
    "email": "YOUR_EMAIL",
    "password": "YOUR_PASSWORD"
}'
```

2. Replace the placeholders:
   - `YOUR_API_KEY`: The API key set in your docker-compose environment (`AUTH_API_KEY`)
   - `YOUR_EMAIL`: Your admin email
   - `YOUR_PASSWORD`: Your chosen password

3. Once created, visit `{SERVER_URL}/auth/dashboard` on the browser

4. Log in with your email and password

Note: Make sure your SuperTokens service is running before attempting to create the admin user or access the dashboard.

## Verify JWKS (JSON Web Key Set)

To verify JWTs or obtain the public keys for token verification, you can query the JWKS endpoint:

```bash
curl --location --request GET 'https://api.localhost:3020/auth/jwt/jwks.json'
```

This will return the public keys used for JWT verification. The response includes both static (prefixed with `s-`) and dynamic (prefixed with `d-`) keys. For manual verification, always use the static key (prefixed with `s-`).

Note: The JWKS endpoint is publicly accessible and does not require authentication.
