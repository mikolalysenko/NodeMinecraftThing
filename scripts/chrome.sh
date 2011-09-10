#!/bin/sh
scripts/start_local.sh
sleep 2
google-chrome --ignore-gpu-blacklist http://localhost:8000/

