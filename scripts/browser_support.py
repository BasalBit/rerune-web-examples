"""Serve the built apps for deterministic browser tests."""
from contextlib import contextmanager
from pathlib import Path
import os
import socket
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent.parent
ARTIFACTS = ROOT / '.artifacts'
(ARTIFACTS / 'tmp').mkdir(parents=True, exist_ok=True)
os.environ['TMPDIR'] = str(ARTIFACTS / 'tmp')


@contextmanager
def serve_apps():
    servers = []
    try:
        for app, port, output in [
            ('react-web-vite', 5173, 'dist'),
            ('angular-ngx-translate', 4201, 'dist/browser'),
            ('angular-transloco', 4202, 'dist/browser'),
        ]:
            directory = ROOT / 'examples' / app / output
            assert (directory / 'index.html').exists(), f'Build {app} first'
            with socket.socket() as probe:
                assert probe.connect_ex(('127.0.0.1', port)) != 0, f'Port {port} is occupied'
            log = (ARTIFACTS / f'server-{port}.log').open('w')
            process = subprocess.Popen([sys.executable, '-B', '-m', 'http.server', str(port),
                                        '--bind', '127.0.0.1', '--directory', str(directory)],
                                       stdout=log, stderr=log)
            servers.append((process, log))
            for _ in range(100):
                assert process.poll() is None, f'{app} server failed'
                with socket.socket() as probe:
                    if probe.connect_ex(('127.0.0.1', port)) == 0:
                        break
                time.sleep(0.05)
            else:
                raise RuntimeError(f'{app} server timed out')
        yield
    finally:
        for process, log in reversed(servers):
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()
            log.close()
