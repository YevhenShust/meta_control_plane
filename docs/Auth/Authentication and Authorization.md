The Meta Service performs authentication and authorization independently. For this purpose, it includes a dedicated subsystem called the Auth Engine.

Authentication
A simple authentication sequence is applied:

Issue an access token based on the provided credentials via a dedicated endpoint.

Verify the token with each request to the service.

The following constraints apply:

The access token is permanent and non-revocable.

No refresh token is provided.

Adding users and their credentials is done outside the API. A special configuration file, accessible to the Meta Service and read at startup, is used for this purpose.
Instead of a password, a hash is used to ensure minimal security, generated using a specific one-way algorithm. This algorithm is applied on the API client side to hash the password, and the same algorithm is used to generate the password hash stored in the credentials configuration file.

JWT is used as an access token, with payload fields:
iss – token issuer, issuer meta service identity.
sub – token subject, user id in Meta Service, who gets an access.
iat – issued at, date and time when token is created.
jti - JWT id, token identificator for traceability and further purposes.

Open API specification for auth endpoints is provided below /meta.auth.v0.0.1.yml

