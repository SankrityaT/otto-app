# Otter device

The otter is a desk buddy that sits at a work station. It is Ayin's camera and, on the Raspberry Pi version, three big buttons. The phone or tablet next to it shows the steps and speaks them.

The server doesn't care which camera a photo comes from. In the app, open **Me → Connect your otter** and tap **Find my otter**: Ayin searches the Wi-Fi for it (each otter answers `/hello` and the name `ayin-otter.local`), shows a live photo through it, and tests its buttons. Staff can still type an address, or set `AYIN_CAMERA_URL` in `web/.env.local`. The server then takes its photo from `<AYIN_CAMERA_URL>/capture` and gives exactly the same answer it would give for a phone photo.

## Plug in your own hardware

Ayin is a layer other hardware can plug into. The otter is one example, not the only one: a document camera, a webcam on a stand, a big accessibility switch or the future Ayin lamp can all work with the same app. A device needs to do one or both of these:

| To be Ayin's… | The device | Ayin then |
| --- | --- | --- |
| **Eyes** | Serves `GET /capture` (one JPEG, taken right then) and `GET /hello` (`{"ayin":"otter","buttons":false}`) on the local Wi-Fi | Finds it by itself, asks it for a photo only when a step is checked or the student asks, and answers exactly as for a phone photo |
| **Buttons** | Sends `POST <server>/api/buttons` with `{"button":"done"}`, `"help"` or `"show-me"` (plus the `x-device-token` header if the server sets `AYIN_DEVICE_TOKEN`) | Acts within a second, exactly as if the student had tapped that button on screen |

Both devices below are under 120 lines each and are good starting points.

| Folder | Hardware | Status |
| --- | --- | --- |
| [`xiao/`](xiao/) | Seeed XIAO ESP32-S3 Sense + OV5640 camera | Working prototype (camera only) |
| [`pi/`](pi/) | Raspberry Pi 4 + Camera Module 3 Wide + 3 buttons | Written, **not yet run on a Pi** |

## XIAO camera (what we have today)

1. Copy `xiao/ayin_camera/secrets.example.h` to `secrets.h` and add your Wi-Fi.
2. In the Arduino IDE, pick the board **XIAO_ESP32S3** with **OPI PSRAM**, then upload `ayin_camera.ino`.
3. The serial monitor prints `Ayin camera ready at http://<ip>/capture`. Put `http://<ip>` in `AYIN_CAMERA_URL`.

The OV5640 runs hot, so the sketch puts the sensor on standby after 15 seconds without a photo request.

## Raspberry Pi otter (the real build)

**Buttons, for students who don't speak.** Done, Help and Show me do exactly what the on-screen buttons do. When one is pressed, the Pi tells the server, and the screen at the station acts on it within a second.

| Button | GPIO (BCM) | Other leg |
| --- | --- | --- |
| Done | 17 | Ground |
| Help | 27 | Ground |
| Show me | 22 | Ground |

Setup on Raspberry Pi OS (picamera2 and gpiozero come preinstalled):

```bash
git clone https://github.com/SankrityaT/ayin-app.git ~/ayin-app
cd ~/ayin-app/device/pi
cp .env.example .env        # set AYIN_SERVER_URL to the computer running the web app
set -a; . ./.env; set +a
sudo hostnamectl set-hostname ayin-otter   # so the app can find it as ayin-otter.local
python3 ayin_otter.py        # or install ayin-otter.service to start on boot
```

Then set `AYIN_CAMERA_URL=http://<pi-address>:8080` in `web/.env.local`. If you set `AYIN_DEVICE_TOKEN` on the server, set the same value on the Pi.
