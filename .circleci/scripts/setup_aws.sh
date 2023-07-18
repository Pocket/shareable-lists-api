#!/bin/bash
set -e

sudo apt-get update && sudo apt-get install -y python3-pip
# using --no-build-isolation flag for now, remove when issue is fixed (AWS CLI)
# https://github.com/aws/aws-cli/issues/8036
pip3 install awscli-local awscli --no-build-isolation

for Script in .docker/localstack/*.sh ; do
    bash "$Script"
done
