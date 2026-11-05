"""Ayin otter on a Raspberry Pi: a camera the server can ask for one photo, plus three buttons.

    GET  http://<pi>:<port>/capture   -> one JPEG, taken right then (nothing is saved)
    Done / Help / Show me buttons     -> POST <server>/api/buttons {"button": "..."}

The server and the phone or tablet at the station do everything else, so a student who can't
speak can still press a button and get the same help as tapping the screen.

Settings come from the environment (see .env.example). Uses only the Python standard library
plus picamera2 and gpiozero, which come with Raspberry Pi OS.
"""

import io
import json
import logging
import os
import signal
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from gpiozero import Button
from picamera2 import Picamera2

log = logging.getLogger("ayin-otter")

SERVER_URL = os.environ["AYIN_SERVER_URL"].rstrip("/")  # e.g. http://192.168.1.20:3000
DEVICE_TOKEN = os.environ.get("AYIN_DEVICE_TOKEN", "")
CAMERA_PORT = int(os.environ.get("AYIN_CAMERA_PORT", "8080"))
BUTTON_PINS = {  # GPIO (BCM) pin for each button; the other leg of each button goes to ground
    "done": int(os.environ.get("AYIN_PIN_DONE", "17")),
    "help": int(os.environ.get("AYIN_PIN_HELP", "27")),
    "show-me": int(os.environ.get("AYIN_PIN_SHOW_ME", "22")),
}


def start_camera() -> Picamera2:
    """Camera Module 3 Wide, set up for still photos at a size Claude reads well."""
    camera = Picamera2()
    camera.configure(camera.create_still_configuration(main={"size": (1536, 1152)}))
    camera.start()
    return camera


def take_photo(camera: Picamera2) -> bytes:
    """One JPEG in memory. It is sent to the server and never written to disk."""
    buffer = io.BytesIO()
    camera.capture_file(buffer, format="jpeg")
    return buffer.getvalue()


def report_press(button: str) -> None:
    """Tell the server a button was pressed. The screen at the station acts on it."""
    request = urllib.request.Request(
        f"{SERVER_URL}/api/buttons",
        data=json.dumps({"button": button}).encode(),
        headers={"Content-Type": "application/json", "x-device-token": DEVICE_TOKEN},
        method="POST",
    )
    try:
        urllib.request.urlopen(request, timeout=5).close()
        log.info("pressed %s", button)
    except OSError as error:
        log.warning("couldn't reach the server for %s: %s", button, error)


def serve_camera(camera: Picamera2) -> ThreadingHTTPServer:
    class CaptureHandler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            if self.path != "/capture":
                self.send_error(404)
                return
            photo = take_photo(camera)
            self.send_response(200)
            self.send_header("Content-Type", "image/jpeg")
            self.send_header("Cache-Control", "no-store")
            self.send_header("Content-Length", str(len(photo)))
            self.end_headers()
            self.wfile.write(photo)

        def log_message(self, *_args) -> None:  # keep the log to what matters
            pass

    return ThreadingHTTPServer(("0.0.0.0", CAMERA_PORT), CaptureHandler)


def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    camera = start_camera()

    # Keep references so the buttons stay alive while the server runs.
    buttons = []
    for name, pin in BUTTON_PINS.items():
        button = Button(pin, bounce_time=0.05)
        button.when_pressed = lambda name=name: report_press(name)
        buttons.append(button)

    server = serve_camera(camera)
    signal.signal(signal.SIGTERM, lambda *_: server.shutdown())
    log.info("otter ready: camera on port %d, buttons on pins %s", CAMERA_PORT, BUTTON_PINS)
    try:
        server.serve_forever()
    finally:
        camera.stop()


if __name__ == "__main__":
    main()
