#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Auto-update site to GitHub
"""
import subprocess
import sys
import os

def run_command(cmd):
    """Run a command and return the result"""
    try:
        result = subprocess.run(cmd, shell=True, check=True, capture_output=True, text=True, encoding='utf-8')
        print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error: {e.stderr}", file=sys.stderr)
        return False

print("=" * 50)
print("Updating website on GitHub Pages")
print("=" * 50)
print()

print("Step 1: Adding all changes...")
if not run_command("git add ."):
    print("Failed to add changes")
    sys.exit(1)

print("\nStep 2: Creating commit...")
if not run_command('git commit -m "Update website"'):
    print("Failed to create commit (maybe no changes?)")
    # Continue anyway

print("\nStep 3: Pushing to GitHub...")
if not run_command("git push origin main"):
    print("Failed to push to GitHub")
    sys.exit(1)

print("\n" + "=" * 50)
print("Done! Site will update in 1-2 minutes")
print("=" * 50)
print("\nSite URL: https://Logos-big.github.io/cp-portfolio-calipso-design/")
print()

