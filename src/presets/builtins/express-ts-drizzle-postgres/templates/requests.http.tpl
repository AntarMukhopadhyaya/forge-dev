GET http://localhost:{{port}}/health

###
POST http://localhost:{{port}}/users
Content-Type: application/json

{
  "email": "dev@example.com",
  "name": "Dev"
}
