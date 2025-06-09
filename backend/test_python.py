import os

print("Hello from basic Python script!")
env_var_test = os.environ.get("TEST_VAR", "TEST_VAR_NOT_SET")
print(f"TEST_VAR from environment: {env_var_test}")

# Create a dummy file to show script ran
with open("python_ran.txt", "w") as f:
    f.write("Python script was here.")

print("Basic Python script finished.")
