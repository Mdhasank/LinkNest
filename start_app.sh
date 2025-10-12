#!/bin/bash

cd /home/ec2-user/my-python-app || exit 1

# Install dependencies
echo "Installing Python dependencies..."
pip3 install -r requirements.txt

# Start the app
echo "Starting the application..."
nohup python3 app.py > app.log 2>&1 &

echo "Application started"
