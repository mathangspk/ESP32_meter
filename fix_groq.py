import re
with open("/home/tma_agi/esp32_loss_power_deploy/assistant-bot/src/groq.ts", "r") as f:
    content = f.read()
content = re.sub(
    r'(role: "system",\n)\s*("You classify)',
    r'\1        content:\n        \2',
    content
)
with open("/home/tma_agi/esp32_loss_power_deploy/assistant-bot/src/groq.ts", "w") as f:
    f.write(content)
print("Fixed")
