#!/usr/bin/env bash
# ---------------------------------------------------------------
# Smoke tests for bounty routes
# Usage:  chmod +x test-bounties.sh && ./test-bounties.sh
# Expects the server to be running on http://localhost:3000
# ---------------------------------------------------------------
set -euo pipefail

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "   PASS: $name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "   FAIL: $name — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

echo ""
echo "========== Bounty Route Smoke Tests =========="
echo ""

# ------------------------------------------------------------------
# 1. GET /bounties — public, should return 200 even with no data
# ------------------------------------------------------------------
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/bounties")
check "GET /bounties (public, empty list)" "200" "$STATUS"

# ------------------------------------------------------------------
# 2. POST /bounties — no auth → 401
# ------------------------------------------------------------------
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/bounties" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test","item":"Tomato","description":"Need tomatoes","qty":10,"latLng":[40.7,-74.0]}')
check "POST /bounties (no auth)" "401" "$STATUS"

# ------------------------------------------------------------------
# 3. POST /bounties — bad token → 401
# ------------------------------------------------------------------
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/bounties" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalidtoken123" \
  -d '{"title":"Test","item":"Tomato","description":"Need tomatoes","qty":10,"latLng":[40.7,-74.0]}')
check "POST /bounties (bad token)" "401" "$STATUS"

# ------------------------------------------------------------------
# 4. Create a test user, then create a bounty with that user's ID
# ------------------------------------------------------------------
echo ""
echo "--- Creating test user ---"
UNIQUE_EMAIL="smoketest-$(date +%s)@example.com"
USER_RESP=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Smoke Test Restaurant\",\"email\":\"$UNIQUE_EMAIL\"}")
echo "User response: $USER_RESP"

USER_ID=$(echo "$USER_RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['_id'])" 2>/dev/null || echo "")

if [ -z "$USER_ID" ]; then
  echo "   FAIL: Could not create test user — skipping remaining tests"
  FAIL=$((FAIL + 1))
else
  echo "Created user: $USER_ID"
  echo ""

  # ----------------------------------------------------------------
  # 5. POST /bounties — valid auth + body → 201
  # ----------------------------------------------------------------
  BOUNTY_RESP=$(curl -s -w "\n%{http_code}" \
    -X POST "$BASE_URL/bounties" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_ID" \
    -d '{"title":"Fresh Tomatoes Needed","item":"Tomato","description":"Looking for 50 lbs of organic tomatoes","qty":50,"latLng":[40.7128,-74.006]}')
  BOUNTY_BODY=$(echo "$BOUNTY_RESP" | sed '$d')
  BOUNTY_STATUS=$(echo "$BOUNTY_RESP" | tail -1)
  check "POST /bounties (valid auth + body)" "201" "$BOUNTY_STATUS"

  # Verify createdBy is populated
  CREATED_BY_NAME=$(echo "$BOUNTY_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['createdBy']['name'])" 2>/dev/null || echo "")
  if [ "$CREATED_BY_NAME" = "Smoke Test Restaurant" ]; then
    echo "   PASS: createdBy is populated with user name"
    PASS=$((PASS + 1))
  else
    echo "   FAIL: createdBy not populated — got '$CREATED_BY_NAME'"
    FAIL=$((FAIL + 1))
  fi

  # ----------------------------------------------------------------
  # 6. GET /bounties — should now return at least one bounty
  # ----------------------------------------------------------------
  GET_RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/bounties")
  GET_BODY=$(echo "$GET_RESP" | sed '$d')
  GET_STATUS=$(echo "$GET_RESP" | tail -1)
  check "GET /bounties (has data)" "200" "$GET_STATUS"

  FIRST_TITLE=$(echo "$GET_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)[0]['title'])" 2>/dev/null || echo "")
  if [ "$FIRST_TITLE" = "Fresh Tomatoes Needed" ]; then
    echo "   PASS: GET returns bounty with correct title"
    PASS=$((PASS + 1))
  else
    echo "   FAIL: Unexpected first title — got '$FIRST_TITLE'"
    FAIL=$((FAIL + 1))
  fi

  # ----------------------------------------------------------------
  # 7. POST /bounties — invalid body (missing required field) → 400
  # ----------------------------------------------------------------
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "$BASE_URL/bounties" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $USER_ID" \
    -d '{"title":"Incomplete Bounty"}')
  check "POST /bounties (invalid body)" "400" "$STATUS"
fi

echo ""
echo "=========================================="
echo "Results:  $PASS passed,  $FAIL failed"
echo "=========================================="

exit $FAIL
