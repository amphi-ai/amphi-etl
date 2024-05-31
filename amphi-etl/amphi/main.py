import subprocess
import sys
import argparse
import os

def main():
    parser = argparse.ArgumentParser(description='Amphi ETL Command Line Interface')
    parser.add_argument('command', choices=['start'], help='Command to start Amphi ETL')
    parser.add_argument('-w', '--workspace', default='.', help='Workspace directory for Amphi ETL')
    parser.add_argument('-p', '--port', type=int, default=8888, help='Port for Amphi ETL')
    parser.add_argument('-i', '--ip', default='localhost', help='IP address for Amphi ETL')

    args = parser.parse_args()

    # Debugging logs
    print(f"Received command: {args.command}")
    print(f"Workspace directory: {args.workspace}")
    print(f"Port: {args.port}")
    print(f"IP: {args.ip}")
    print(f"Python executable: {sys.executable}")
    print(f"Environment PATH: {os.environ.get('PATH')}")

    if args.command == 'start':
        jupyter_command = [
            sys.executable, '-m', 'jupyter', 'lab', 
            f'--notebook-dir={args.workspace}', f'--port={args.port}', f'--ip={args.ip}'
        ]
        print(f"Running JupyterLab command: {' '.join(jupyter_command)}")
        try:
            subprocess.check_call(jupyter_command)
        except subprocess.CalledProcessError as e:
            print(f"Failed to start Amphi: {e}")

if __name__ == '__main__':
    main()
