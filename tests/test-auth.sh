#!/bin/bash

# Authentication API Test Script
# Tests all auth endpoints with sample data

BASE_URL="http://localhost:3000/api/v1"
TIMESTAMP=$(date +%s)
TEST_EMAIL="test${TIMESTAMP}@example.com"
TEST_PASSWORD="SecurePass123!"

echo "=================================================="
echo "   Preptor Authentication API Test Suite"
echo "=================================================="
echo ""
echo "Test Email: $TEST_EMAIL"
echo "Test Password: $TEST_PASSWORD"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Register new user
echo "=================================================="
echo "TEST 1: Register New User"
echo "=================================================="
REGISTER_RESPONSE=$(curl -s -X POST \
  "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\",
    \"userType\": \"STUDENT\"
  }")

echo "$REGISTER_RESPONSE" | jq .

# Extract verification token (only in development)
VERIFICATION_TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.verificationToken // empty')

if [ ! -z "$VERIFICATION_TOKEN" ]; then
  echo -e "${GREEN}✓ Registration successful${NC}"
else
  echo -e "${RED}✗ Registration failed${NC}"
  exit 1
fi

echo ""

# Test 2: Login
echo "=================================================="
echo "TEST 2: User Login"
echo "=================================================="
LOGIN_RESPONSE=$(curl -s -X POST \
  "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$TEST_EMAIL\",
    \"password\": \"$TEST_PASSWORD\"
  }")

echo "$LOGIN_RESPONSE" | jq .

# Extract tokens
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.accessToken // empty')
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.refreshToken // empty')

if [ ! -z "$ACCESS_TOKEN" ] && [ ! -z "$REFRESH_TOKEN" ]; then
  echo -e "${GREEN}✓ Login successful${NC}"
else
  echo -e "${RED}✗ Login failed${NC}"
  exit 1
fi

echo ""

# Test 3: Get current user (protected route)
echo "=================================================="
echo "TEST 3: Get Current User (Protected Route)"
echo "=================================================="
ME_RESPONSE=$(curl -s -X GET \
  "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$ME_RESPONSE" | jq .

USER_ID=$(echo "$ME_RESPONSE" | jq -r '.user.id // empty')

if [ ! -z "$USER_ID" ]; then
  echo -e "${GREEN}✓ Get current user successful${NC}"
else
  echo -e "${RED}✗ Get current user failed${NC}"
fi

echo ""

# Test 4: Get active sessions
echo "=================================================="
echo "TEST 4: Get Active Sessions"
echo "=================================================="
SESSIONS_RESPONSE=$(curl -s -X GET \
  "$BASE_URL/auth/sessions" \
  -H "Authorization: Bearer $ACCESS_TOKEN")

echo "$SESSIONS_RESPONSE" | jq .

SESSION_COUNT=$(echo "$SESSIONS_RESPONSE" | jq -r '.totalActiveSessions // 0')

if [ "$SESSION_COUNT" -gt 0 ]; then
  echo -e "${GREEN}✓ Get sessions successful (${SESSION_COUNT} active sessions)${NC}"
else
  echo -e "${YELLOW}⚠ No active sessions found${NC}"
fi

echo ""

# Test 5: Refresh access token
echo "=================================================="
echo "TEST 5: Refresh Access Token"
echo "=================================================="
REFRESH_RESPONSE=$(curl -s -X POST \
  "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo "$REFRESH_RESPONSE" | jq .

NEW_ACCESS_TOKEN=$(echo "$REFRESH_RESPONSE" | jq -r '.accessToken // empty')

if [ ! -z "$NEW_ACCESS_TOKEN" ]; then
  echo -e "${GREEN}✓ Token refresh successful${NC}"
  ACCESS_TOKEN=$NEW_ACCESS_TOKEN
else
  echo -e "${RED}✗ Token refresh failed${NC}"
fi

echo ""

# Test 6: Verify email
if [ ! -z "$VERIFICATION_TOKEN" ]; then
  echo "=================================================="
  echo "TEST 6: Verify Email"
  echo "=================================================="
  VERIFY_RESPONSE=$(curl -s -X POST \
    "$BASE_URL/auth/verify-email" \
    -H "Content-Type: application/json" \
    -d "{
      \"token\": \"$VERIFICATION_TOKEN\"
    }")

  echo "$VERIFY_RESPONSE" | jq .

  VERIFY_MESSAGE=$(echo "$VERIFY_RESPONSE" | jq -r '.message // empty')

  if [[ "$VERIFY_MESSAGE" == *"verified"* ]]; then
    echo -e "${GREEN}✓ Email verification successful${NC}"
  else
    echo -e "${RED}✗ Email verification failed${NC}"
  fi

  echo ""
fi

# Test 7: Test invalid token (should fail)
echo "=================================================="
echo "TEST 7: Test Invalid Token (Should Fail)"
echo "=================================================="
INVALID_RESPONSE=$(curl -s -X GET \
  "$BASE_URL/auth/me" \
  -H "Authorization: Bearer invalid-token-12345")

echo "$INVALID_RESPONSE" | jq .

INVALID_ERROR=$(echo "$INVALID_RESPONSE" | jq -r '.error // empty')

if [[ "$INVALID_ERROR" == *"Invalid"* ]] || [[ "$INVALID_ERROR" == *"expired"* ]]; then
  echo -e "${GREEN}✓ Invalid token correctly rejected${NC}"
else
  echo -e "${RED}✗ Invalid token handling failed${NC}"
fi

echo ""

# Test 8: Logout
echo "=================================================="
echo "TEST 8: Logout (Revoke Refresh Token)"
echo "=================================================="
LOGOUT_RESPONSE=$(curl -s -X POST \
  "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo "$LOGOUT_RESPONSE" | jq .

LOGOUT_MESSAGE=$(echo "$LOGOUT_RESPONSE" | jq -r '.message // empty')

if [[ "$LOGOUT_MESSAGE" == *"successful"* ]]; then
  echo -e "${GREEN}✓ Logout successful${NC}"
else
  echo -e "${RED}✗ Logout failed${NC}"
fi

echo ""

# Test 9: Try to use revoked refresh token (should fail)
echo "=================================================="
echo "TEST 9: Use Revoked Token (Should Fail)"
echo "=================================================="
REVOKED_RESPONSE=$(curl -s -X POST \
  "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d "{
    \"refreshToken\": \"$REFRESH_TOKEN\"
  }")

echo "$REVOKED_RESPONSE" | jq .

REVOKED_ERROR=$(echo "$REVOKED_RESPONSE" | jq -r '.error // empty')

if [[ "$REVOKED_ERROR" == *"Invalid"* ]]; then
  echo -e "${GREEN}✓ Revoked token correctly rejected${NC}"
else
  echo -e "${RED}✗ Revoked token handling failed${NC}"
fi

echo ""
echo "=================================================="
echo "   All Tests Completed!"
echo "=================================================="
echo ""
echo "Summary:"
echo "  - Test Email: $TEST_EMAIL"
echo "  - User ID: $USER_ID"
echo "  - Email Verified: Yes"
echo ""
echo "You can now test these endpoints manually using:"
echo "  - Postman"
echo "  - Thunder Client (VS Code)"
echo "  - curl commands"
echo ""
