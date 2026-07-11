# Emergent Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session (via mongosh)

```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  phone: '9999999999',
  address: '123 Test St',
  pincode: '110001',
  role: 'user',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

For admin, set `role: 'admin'` and `email: 'admin@clengo.in'`.

## Step 2: Test Backend APIs
```
curl -X GET "$API_URL/api/auth/me" -H "Authorization: Bearer $SESSION_TOKEN"
curl -X GET "$API_URL/api/orders/me" -H "Authorization: Bearer $SESSION_TOKEN"
```

## Step 3: Browser Testing
Set cookie `session_token=<token>` on the app domain (httpOnly=true, secure=true, sameSite=None).

## Checklist
- User document has `user_id` field
- Session `user_id` matches user's `user_id`
- All queries use `{"_id": 0}` projection
- Admin role stored on user document
- `/api/auth/me` returns user data including role
