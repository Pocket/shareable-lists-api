#!/bin/bash
set -e
apt-get update && apt-get install -y sudo

# Add host entries to match local docker development names.

echo "Adding service hosts records"


declare -a arr=("mysql" "localstack")

for i in "${arr[@]}"; do
    echo 127.0.0.1 "$i" | sudo tee -a /etc/hosts
done