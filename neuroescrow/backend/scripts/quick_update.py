"""
Quick Hermes Update - One Command
Updates Hermes with fresh context from repomix (incremental)
"""
import os
import sys
import subprocess
from pathlib import Path
from dotenv import load_dotenv

# Load environment
root_dir = Path(__file__).parent.parent.parent.parent
env_path = root_dir / '.env.local'

if env_path.exists():
    load_dotenv(env_path)
else:
    print("❌ .env.local not found!")
    sys.exit(1)

# Set normalized env vars
os.environ['ASTRA_DB_TOKEN'] = os.getenv('ASTRA_DB_APPLICATION_TOKEN', '')
os.environ['ASTRA_DB_ENDPOINT'] = os.getenv('ASTRA_DB_API_ENDPOINT', '')

def run_command(cmd, cwd):
    """Run command and return success"""
    try:
        subprocess.run(cmd, cwd=cwd, check=True, shell=True)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Command failed: {e}")
        return False

def main():
    print("🤖 Quick Hermes Update")
    print("=" * 50)
    
    neuroescrow_dir = root_dir / 'neuroescrow'
    backend_dir = neuroescrow_dir / 'backend'
    
    # Step 1: Generate fresh repomix
    print("\n📦 Step 1: Generating fresh repomix context...")
    if not run_command('npx repomix', neuroescrow_dir):
        return 1
    print("   ✅ repomix-output.md updated")
    
    # Step 2: Incremental indexing
    print("\n🔍 Step 2: Updating changed files in AstraDB...")
    if not run_command('python scripts/index_incremental.py', backend_dir):
        return 1
    print("   ✅ Hermes context updated")
    
    print("\n🎉 Done! Hermes now has fresh context.")
    print("   Test: curl https://YOUR_WORKER.workers.dev/health")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
