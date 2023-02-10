#!/bin/bash

set -e
apt-get update && apt-get install -y sudo

dir=$(dirname "$0")

chmod +x "./"
while [[ "$1" ]]; do
   case "$1" in
      --hosts)
          $(sudo)"${dir}"/setup_hosts.sh
          ;;
      --db)
          sudo "${dir}"/setup_db.sh
          ;;
      --aws)
          $(sudo)"${dir}"/setup_aws.sh
          ;;
    esac
    shift
done
