#!/bin/bash
# Test LM Studio chat completions endpoint

curl -X POST http://localhost:1234/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zai-org/glm-4.6v-flash",
    "messages": [
      {
        "role": "user",
        "content": "Summarize: The quick brown fox jumps over the lazy dog."
      }
    ],
    "temperature": 0.7,
    "stream": false
  }'
