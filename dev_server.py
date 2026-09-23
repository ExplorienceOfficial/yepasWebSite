"""YEPAS statik arayüzü ve yalnızca yerel API için küçük geliştirme sunucusu."""

from __future__ import annotations

import argparse
import http.client
import pathlib
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


ROOT = pathlib.Path(__file__).resolve().parent / "out"
HOP_BY_HOP = {"connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
              "te", "trailers", "transfer-encoding", "upgrade"}


class YepasHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        self._handle()

    def do_POST(self):
        self._handle()

    def do_PUT(self):
        self._handle()

    def do_OPTIONS(self):
        self._handle()

    def do_HEAD(self):
        self._handle()

    def _handle(self):
        if not self.path.startswith("/api/"):
            return super().do_GET() if self.command == "GET" else super().do_HEAD()

        length = int(self.headers.get("Content-Length", "0"))
        body = self.rfile.read(length) if length else None
        headers = {key: value for key, value in self.headers.items()
                   if key.lower() not in HOP_BY_HOP and key.lower() not in {"host", "origin"}}
        headers["Host"] = "localhost:5057"
        headers["Origin"] = "http://localhost:5057"

        connection = http.client.HTTPConnection("127.0.0.1", 5057, timeout=30)
        try:
            connection.request(self.command, self.path, body=body, headers=headers)
            response = connection.getresponse()
            payload = response.read()
            self.send_response(response.status, response.reason)
            for key, value in response.getheaders():
                if key.lower() not in HOP_BY_HOP and key.lower() != "access-control-allow-origin":
                    self.send_header(key, value)
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(payload)
        except OSError:
            self.send_error(502, "Yerel API hizmetine erişilemiyor")
        finally:
            connection.close()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bind", required=True)
    parser.add_argument("--port", type=int, default=3000)
    args = parser.parse_args()
    ThreadingHTTPServer((args.bind, args.port), YepasHandler).serve_forever()


if __name__ == "__main__":
    main()
