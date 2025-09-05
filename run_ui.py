import argparse
import os
import socketserver
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler


class UiRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, directory: str | None = None, api_prefix_override: str | None = None, **kwargs):
        self._api_prefix_override = api_prefix_override
        super().__init__(*args, directory=directory, **kwargs)

    def send_head(self):
        # Use parent implementation to get the file path and open file
        path = self.translate_path(self.path)
        # Only intercept index.html for optional apiPrefix override
        if self._api_prefix_override and os.path.basename(path) in ("index.html", "index.htm"):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                content = content.replace(
                    "const apiPrefix = '/v1';",
                    f"const apiPrefix = '{self._api_prefix_override}';",
                )
                data = content.encode("utf-8")
                self.send_response(200)
                self.send_header("Content-type", "text/html; charset=utf-8")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)
                return None  # signal we've handled response
            except FileNotFoundError:
                pass
        return super().send_head()


def main():
    parser = argparse.ArgumentParser(description="Serve the BreezyVoice web UI locally.")
    parser.add_argument("--port", type=int, default=8000, help="Port to serve on (default: 8000)")
    parser.add_argument(
        "--dir", dest="directory", default="web", help="Directory to serve (default: web)"
    )
    parser.add_argument(
        "--api-prefix",
        dest="api_prefix",
        default=None,
        help="Override JS apiPrefix at runtime (e.g., https://host/path/v1)",
    )
    parser.add_argument(
        "--open", dest="do_open", action="store_true", help="Open browser after starting server"
    )
    args = parser.parse_args()

    if not os.path.isdir(args.directory):
        print(f"Directory not found: {args.directory}", file=sys.stderr)
        sys.exit(1)

    handler_factory = lambda *h_args, **h_kwargs: UiRequestHandler(
        *h_args,
        directory=os.path.abspath(args.directory),
        api_prefix_override=args.api_prefix,
        **h_kwargs,
    )

    with socketserver.TCPServer(("0.0.0.0", args.port), handler_factory) as httpd:
        url = f"http://localhost:{args.port}/"
        print(f"Serving {os.path.abspath(args.directory)} at {url}")
        if args.api_prefix:
            print(f"Overriding apiPrefix to: {args.api_prefix}")
        if args.do_open:
            try:
                webbrowser.open(url)
            except Exception:
                pass
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            pass


if __name__ == "__main__":
    main()


