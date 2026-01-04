#!/bin/bash
# GM script to generate a new market timestep

echo "Generating new market timestep..."
response=$(curl -s -X POST http://localhost:8000/api/admin/timestep)

if [ $? -eq 0 ]; then
    echo "Success!"
    echo "$response" | python3 -m json.tool 2>/dev/null || echo "$response"
else
    echo "Error: Failed to generate timestep"
    echo "Make sure the backend server is running on http://localhost:8000"
fi
