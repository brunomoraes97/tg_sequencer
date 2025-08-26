#!/usr/bin/env python3
"""
Script para rodar a aplicação localmente
"""
import os
import sys
import subprocess

def main():
    if len(sys.argv) > 1 and sys.argv[1] == "worker":
        # Rodar worker
        print("Iniciando worker...")
        os.chdir("app")
        subprocess.run([sys.executable, "-m", "worker"])
    else:
        # Rodar API
        print("Iniciando API...")
        os.chdir("app")
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"
        ])

if __name__ == "__main__":
    main()
