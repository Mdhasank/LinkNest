#!/bin/bash

cd /home/ec2-user/my-python-app || exit 1

nohup python3 app.py > app.log 2>&1 &

echo "Application started"
