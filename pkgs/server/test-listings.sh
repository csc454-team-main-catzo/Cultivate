#!/usr/bin/env bash
# ---------------------------------------------------------------
# Smoke tests for Listing CRUD + query edge cases
# Usage:  chmod +x test-listings.sh && ./test-listings.sh
# Expects the server running on http://localhost:3000
# ---------------------------------------------------------------
set -euo pipefail

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "    PASS: $name (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    echo "    FAIL: $name — expected $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

assert_eq() {
  local name="$1" expected="$2" actual="$3"
  if [ "$actual" = "$expected" ]; then
    echo "    PASS: $name"
    PASS=$((PASS + 1))
  else
    echo "    FAIL: $name — expected '$expected', got '$actual'"
    FAIL=$((FAIL + 1))
  fi
}

# helper: extract JSON field via python3
jq_py() {
  python3 -c "import sys,json; data=json.load(sys.stdin); print($1)" 2>/dev/null || echo ""
}

echo ""
echo "============================================================"
echo "          Listing CRUD & Query Edge-Case Tests"
echo "============================================================"
echo ""

# ==================================================================
#  0. HEALTH CHECK
# ==================================================================
echo "--- Health Check ---"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" --max-time 3 "$BASE_URL/" 2>/dev/null || echo "000")
if [ "$STATUS" = "000" ]; then
  echo "    Server not reachable at $BASE_URL — is it running?"
  echo "     Run:  cd pkgs/server && npm run dev"
  exit 1
fi
check "GET / (server alive)" "200" "$STATUS"

# ==================================================================
#  1. AUTH EDGE CASES
# ==================================================================
echo ""
echo "--- Auth Edge Cases ---"

# No auth header
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" \
  -d '{"type":"demand","title":"T","item":"I","description":"D","price":1,"qty":1,"latLng":[40,-74]}')
check "POST /listings (no auth)" "401" "$STATUS"

# Missing Bearer prefix
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: justAtoken" \
  -d '{"type":"demand","title":"T","item":"I","description":"D","price":1,"qty":1,"latLng":[40,-74]}')
check "POST /listings (no Bearer prefix)" "401" "$STATUS"

# Empty Bearer token
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer " \
  -d '{"type":"demand","title":"T","item":"I","description":"D","price":1,"qty":1,"latLng":[40,-74]}')
check "POST /listings (empty Bearer)" "401" "$STATUS"

# Invalid ObjectId as token
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer not-a-valid-id" \
  -d '{"type":"demand","title":"T","item":"I","description":"D","price":1,"qty":1,"latLng":[40,-74]}')
check "POST /listings (invalid token)" "401" "$STATUS"

# Valid ObjectId but user doesn't exist
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 000000000000000000000000" \
  -d '{"type":"demand","title":"T","item":"I","description":"D","price":1,"qty":1,"latLng":[40,-74]}')
check "POST /listings (nonexistent user)" "401" "$STATUS"

# ==================================================================
#  2. CREATE TEST USERS
# ==================================================================
echo ""
echo "--- Creating Test Users ---"

RESTAURANT_RESP=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Restaurant\",\"email\":\"restaurant-$(date +%s)@test.com\"}")
RESTAURANT_ID=$(echo "$RESTAURANT_RESP" | jq_py "data['_id']")
echo "  Restaurant: $RESTAURANT_ID"

FARMER_RESP=$(curl -s -X POST "$BASE_URL/users" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Test Farmer\",\"email\":\"farmer-$(date +%s)@test.com\"}")
FARMER_ID=$(echo "$FARMER_RESP" | jq_py "data['_id']")
echo "  Farmer:     $FARMER_ID"

if [ -z "$RESTAURANT_ID" ] || [ -z "$FARMER_ID" ]; then
  echo "    Could not create test users — aborting"
  exit 1
fi

# ==================================================================
#  3. VALIDATION EDGE CASES (POST)
# ==================================================================
echo ""
echo "--- Validation Edge Cases ---"

AUTH="Authorization: Bearer $RESTAURANT_ID"

# Missing required fields (only title)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"title":"Incomplete"}')
check "POST missing required fields" "400" "$STATUS"

# Empty title
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"demand","title":"","item":"Corn","description":"D","price":1,"qty":1,"latLng":[40,-74]}')
check "POST empty title" "400" "$STATUS"

# Invalid type value
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"invalid","title":"T","item":"Corn","description":"D","price":1,"qty":1,"latLng":[40,-74]}')
check "POST invalid type" "400" "$STATUS"

# qty = 0
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"demand","title":"T","item":"Corn","description":"D","price":1,"qty":0,"latLng":[40,-74]}')
check "POST qty=0" "400" "$STATUS"

# Negative price
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"demand","title":"T","item":"Corn","description":"D","price":-5,"qty":1,"latLng":[40,-74]}')
check "POST negative price" "400" "$STATUS"

# latLng out of range (lat > 90)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"demand","title":"T","item":"Corn","description":"D","price":1,"qty":1,"latLng":[999,0]}')
check "POST latLng lat out of range" "400" "$STATUS"

# latLng out of range (lng > 180)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"demand","title":"T","item":"Corn","description":"D","price":1,"qty":1,"latLng":[40,999]}')
check "POST latLng lng out of range" "400" "$STATUS"

# latLng wrong length (3 elements)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"demand","title":"T","item":"Corn","description":"D","price":1,"qty":1,"latLng":[40,-74,100]}')
check "POST latLng wrong length" "400" "$STATUS"

# price = 0 should be valid (free produce)
RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"demand","title":"Free Compost","item":"Compost","description":"Free compost available","price":0,"qty":5,"latLng":[40.7,-74.0]}')
STATUS=$(echo "$RESP" | tail -1)
check "POST price=0 (valid)" "201" "$STATUS"

# ==================================================================
#  4. CREATE — DEMAND LISTINGS (Restaurant)
# ==================================================================
echo ""
echo "--- Create Demand Listings (Restaurant) ---"

DEMAND1_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"demand","title":"Need Tomatoes","item":"Tomato","description":"50 lbs organic tomatoes","price":2.50,"qty":50,"latLng":[40.7128,-74.006]}')
DEMAND1_BODY=$(echo "$DEMAND1_RESP" | sed '$d')
DEMAND1_STATUS=$(echo "$DEMAND1_RESP" | tail -1)
check "POST demand listing 1" "201" "$DEMAND1_STATUS"

DEMAND1_ID=$(echo "$DEMAND1_BODY" | jq_py "data['_id']")
echo "  Demand 1 ID: $DEMAND1_ID"

# Verify fields
assert_eq "demand1 type" "demand" "$(echo "$DEMAND1_BODY" | jq_py "data['type']")"
assert_eq "demand1 status default" "open" "$(echo "$DEMAND1_BODY" | jq_py "data['status']")"
assert_eq "demand1 parentId null" "None" "$(echo "$DEMAND1_BODY" | jq_py "data['parentId']")"
assert_eq "demand1 createdBy populated" "Test Restaurant" "$(echo "$DEMAND1_BODY" | jq_py "data['createdBy']['name']")"

# Second demand (different item)
DEMAND2_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$AUTH" \
  -d '{"type":"demand","title":"Need Corn","item":"Corn","description":"100 ears of corn","price":1.00,"qty":100,"latLng":[40.7128,-74.006]}')
DEMAND2_BODY=$(echo "$DEMAND2_RESP" | sed '$d')
DEMAND2_STATUS=$(echo "$DEMAND2_RESP" | tail -1)
check "POST demand listing 2" "201" "$DEMAND2_STATUS"
DEMAND2_ID=$(echo "$DEMAND2_BODY" | jq_py "data['_id']")
echo "  Demand 2 ID: $DEMAND2_ID"

# ==================================================================
#  5. CREATE — SUPPLY LISTINGS (Farmer)
# ==================================================================
echo ""
echo "--- Create Supply Listings (Farmer) ---"

FARMER_AUTH="Authorization: Bearer $FARMER_ID"

# Independent supply (no parent)
SUPPLY1_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$FARMER_AUTH" \
  -d '{"type":"supply","title":"Fresh Tomatoes Available","item":"Tomato","description":"Organic vine tomatoes","price":2.00,"qty":30,"latLng":[40.7580,-73.9855]}')
SUPPLY1_BODY=$(echo "$SUPPLY1_RESP" | sed '$d')
SUPPLY1_STATUS=$(echo "$SUPPLY1_RESP" | tail -1)
check "POST supply listing (independent)" "201" "$SUPPLY1_STATUS"

SUPPLY1_ID=$(echo "$SUPPLY1_BODY" | jq_py "data['_id']")
assert_eq "supply1 type" "supply" "$(echo "$SUPPLY1_BODY" | jq_py "data['type']")"
assert_eq "supply1 parentId null" "None" "$(echo "$SUPPLY1_BODY" | jq_py "data['parentId']")"

# Supply responding to demand 1
SUPPLY2_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$FARMER_AUTH" \
  -d "{\"type\":\"supply\",\"title\":\"Tomatoes for your order\",\"item\":\"Tomato\",\"description\":\"Can fulfill 40 lbs\",\"price\":2.25,\"qty\":40,\"latLng\":[40.73,-73.99],\"parentId\":\"$DEMAND1_ID\"}")
SUPPLY2_BODY=$(echo "$SUPPLY2_RESP" | sed '$d')
SUPPLY2_STATUS=$(echo "$SUPPLY2_RESP" | tail -1)
check "POST supply listing (response to demand)" "201" "$SUPPLY2_STATUS"

SUPPLY2_ID=$(echo "$SUPPLY2_BODY" | jq_py "data['_id']")
assert_eq "supply2 parentId set" "$DEMAND1_ID" "$(echo "$SUPPLY2_BODY" | jq_py "data['parentId']")"
assert_eq "supply2 createdBy" "Test Farmer" "$(echo "$SUPPLY2_BODY" | jq_py "data['createdBy']['name']")"

# Another supply responding to demand 1 (same farmer, different qty/price)
SUPPLY3_RESP=$(curl -s -w "\n%{http_code}" \
  -X POST "$BASE_URL/listings" \
  -H "Content-Type: application/json" -H "$FARMER_AUTH" \
  -d "{\"type\":\"supply\",\"title\":\"More tomatoes\",\"item\":\"Tomato\",\"description\":\"Extra batch\",\"price\":2.10,\"qty\":20,\"latLng\":[40.73,-73.99],\"parentId\":\"$DEMAND1_ID\"}")
SUPPLY3_STATUS=$(echo "$SUPPLY3_RESP" | tail -1)
check "POST supply listing (2nd response to same demand)" "201" "$SUPPLY3_STATUS"

# ==================================================================
#  6. READ — GET /listings (list all)
# ==================================================================
echo ""
echo "--- GET /listings (list all) ---"

ALL_RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/listings")
ALL_BODY=$(echo "$ALL_RESP" | sed '$d')
ALL_STATUS=$(echo "$ALL_RESP" | tail -1)
check "GET /listings" "200" "$ALL_STATUS"

ALL_COUNT=$(echo "$ALL_BODY" | jq_py "len(data)")
echo "  Total listings: $ALL_COUNT"
if [ "$ALL_COUNT" -ge 6 ]; then
  echo "    PASS: At least 6 listings returned"
  PASS=$((PASS + 1))
else
  echo "    FAIL: Expected >= 6 listings, got $ALL_COUNT"
  FAIL=$((FAIL + 1))
fi

# ==================================================================
#  7. QUERY — Filter by type
# ==================================================================
echo ""
echo "--- Query: Filter by type ---"

# Only demands
DEMAND_RESP=$(curl -s "$BASE_URL/listings?type=demand")
DEMAND_COUNT=$(echo "$DEMAND_RESP" | jq_py "len(data)")
DEMAND_ALL_CORRECT=$(echo "$DEMAND_RESP" | jq_py "all(d['type']=='demand' for d in data)")
assert_eq "?type=demand count >= 3" "True" "$(echo "$DEMAND_RESP" | jq_py "len(data) >= 3")"
assert_eq "?type=demand all are demand" "True" "$DEMAND_ALL_CORRECT"

# Only supplies
SUPPLY_RESP=$(curl -s "$BASE_URL/listings?type=supply")
SUPPLY_COUNT=$(echo "$SUPPLY_RESP" | jq_py "len(data)")
SUPPLY_ALL_CORRECT=$(echo "$SUPPLY_RESP" | jq_py "all(d['type']=='supply' for d in data)")
assert_eq "?type=supply count >= 3" "True" "$(echo "$SUPPLY_RESP" | jq_py "len(data) >= 3")"
assert_eq "?type=supply all are supply" "True" "$SUPPLY_ALL_CORRECT"

# Invalid type filter — should return all (no filter applied)
INVALID_TYPE_RESP=$(curl -s "$BASE_URL/listings?type=bogus")
INVALID_TYPE_COUNT=$(echo "$INVALID_TYPE_RESP" | jq_py "len(data)")
assert_eq "?type=bogus returns all" "True" "$(python3 -c "print($INVALID_TYPE_COUNT >= $DEMAND_COUNT + $SUPPLY_COUNT)" 2>/dev/null)"

# No filter — returns everything
NO_FILTER_COUNT=$(echo "$ALL_BODY" | jq_py "len(data)")
assert_eq "no filter = demand + supply" "True" "$(python3 -c "print($NO_FILTER_COUNT >= $DEMAND_COUNT + $SUPPLY_COUNT)" 2>/dev/null)"

# ==================================================================
#  8. READ — GET /listings/:id (single)
# ==================================================================
echo ""
echo "--- GET /listings/:id ---"

# Valid ID
SINGLE_RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/listings/$DEMAND1_ID")
SINGLE_BODY=$(echo "$SINGLE_RESP" | sed '$d')
SINGLE_STATUS=$(echo "$SINGLE_RESP" | tail -1)
check "GET /listings/:id (existing)" "200" "$SINGLE_STATUS"
assert_eq "single listing title" "Need Tomatoes" "$(echo "$SINGLE_BODY" | jq_py "data['title']")"
assert_eq "single listing createdBy populated" "Test Restaurant" "$(echo "$SINGLE_BODY" | jq_py "data['createdBy']['name']")"

# Non-existent valid ObjectId
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/listings/000000000000000000000000")
check "GET /listings/:id (not found)" "404" "$STATUS"

# ==================================================================
#  9. QUERY — Parent/child (responses) relationship
# ==================================================================
echo ""
echo "--- Query: Parent-Child Responses ---"

# GET demand1 — should have responses populated
PARENT_RESP=$(curl -s "$BASE_URL/listings/$DEMAND1_ID")
RESPONSE_COUNT=$(echo "$PARENT_RESP" | jq_py "len(data.get('responses', []))")
assert_eq "demand1 has 2 responses" "2" "$RESPONSE_COUNT"

# Verify each response is type=supply and has createdBy populated
RESP_TYPES_CORRECT=$(echo "$PARENT_RESP" | jq_py "all(r['type']=='supply' for r in data['responses'])")
assert_eq "all responses are supply type" "True" "$RESP_TYPES_CORRECT"

RESP_CREATORS=$(echo "$PARENT_RESP" | jq_py "all('name' in r['createdBy'] for r in data['responses'])")
assert_eq "response createdBy populated" "True" "$RESP_CREATORS"

# GET demand2 — should have 0 responses
PARENT2_RESP=$(curl -s "$BASE_URL/listings/$DEMAND2_ID")
RESPONSE2_COUNT=$(echo "$PARENT2_RESP" | jq_py "len(data.get('responses', []))")
assert_eq "demand2 has 0 responses" "0" "$RESPONSE2_COUNT"

# GET independent supply — should have 0 responses
SUPPLY_SOLO_RESP=$(curl -s "$BASE_URL/listings/$SUPPLY1_ID")
SUPPLY_SOLO_RESPONSES=$(echo "$SUPPLY_SOLO_RESP" | jq_py "len(data.get('responses', []))")
assert_eq "independent supply has 0 responses" "0" "$SUPPLY_SOLO_RESPONSES"

# ==================================================================
# 10. QUERY — Sorted by createdAt descending
# ==================================================================
echo ""
echo "--- Query: Sort Order ---"

SORTED_CORRECT=$(curl -s "$BASE_URL/listings" | jq_py "
dates = [d['createdAt'] for d in data]
print(dates == sorted(dates, reverse=True))
")
assert_eq "listings sorted by createdAt desc" "True" "$SORTED_CORRECT"

# ==================================================================
# 11. QUERY — createdBy populated on list endpoint
# ==================================================================
echo ""
echo "--- Query: createdBy Always Populated ---"

ALL_POPULATED=$(curl -s "$BASE_URL/listings" | jq_py "
print(all(
  isinstance(d['createdBy'], dict) and 'name' in d['createdBy'] and 'email' in d['createdBy']
  for d in data
))
")
assert_eq "all listings have createdBy populated" "True" "$ALL_POPULATED"

# ==================================================================
# 12. GET /listings — empty result is valid array
# ==================================================================
echo ""
echo "--- Edge Case: Empty Results ---"

# Filter that should return 0 results (type=demand AND supply can't both match)
# We test with a type that doesn't match any — but bogus returns all, so skip that.
# Instead: GET /listings?type=demand when we know all demands, verify it's an array
DEMAND_IS_ARRAY=$(curl -s "$BASE_URL/listings?type=demand" | jq_py "print(isinstance(data, list))")
assert_eq "?type=demand returns array" "True" "$DEMAND_IS_ARRAY"

# ==================================================================
#  SUMMARY
# ==================================================================
echo ""
echo "============================================================"
echo "  Results:  $PASS passed,  $FAIL failed"
echo "============================================================"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
