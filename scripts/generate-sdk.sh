#!/usr/bin/env bash
# Regenerate SDK from server's OpenAPI spec
set -e

# cd to project root.
cd "$(dirname "$0")"/..

MAX_RETRIES=10
URL="http://localhost:3000/openapi.json"

# Start the server in the background.
echo "Starting server..."
npm run dev:server &
server_pid=$!

# Function to clean up server process on exit.
kill_server() {
  if [ -n "$server_pid" ]; then
    echo "Stopping server, ignore the error:"
    kill "$server_pid" 2>/dev/null || true
  fi
}
trap kill_server EXIT

# Wait for the server to be ready.
echo "Waiting for server to be ready..."
ntries=0
while ! curl -s "$URL" > /dev/null; do
  sleep 1
  ntries=$((ntries+1))
  if [ $ntries -ge $MAX_RETRIES ]; then
    echo "Timeout waiting for server to start at $URL"
    exit 1
  fi
  echo "Waiting for server... ($ntries/$MAX_RETRIES)"
done
echo "Server is ready!"

# Generate the SDK
echo "Generating SDK..."
mkdir -p pkgs/sdk

# Generate the SDK using typescript (experimental) (seems to be 2nd version of typescript-fetch).
npx @openapitools/openapi-generator-cli generate \
  -i "$URL" \
  -g typescript \
  -o pkgs/sdk \
  --skip-validate-spec \
  --additional-properties=disallowAdditionalPropertiesIfNotPresent=false,platform=browser,npmName=sdk,npmVersion=0.0.0

echo "SDK generation complete!"
exit 0
