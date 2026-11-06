// Otto otter camera: Seeed XIAO ESP32-S3 Sense with an OV5640 camera.
//
// The board joins Wi-Fi and serves one photo at http://<board>/capture. The Otto server
// asks for a photo only when a student taps Done, Help or Show me (AYIN_CAMERA_URL in
// web/.env.local), so the camera rests the rest of the time.
//
// Arduino board: "XIAO_ESP32S3", PSRAM: "OPI PSRAM".
// Wi-Fi details go in secrets.h (copy secrets.example.h). secrets.h is never committed.

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include "esp_camera.h"
#include "secrets.h"

// Camera pins on the XIAO ESP32-S3 Sense expansion board.
#define PWDN_GPIO_NUM  -1
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM  10
#define SIOD_GPIO_NUM  40
#define SIOC_GPIO_NUM  39
#define Y9_GPIO_NUM    48
#define Y8_GPIO_NUM    11
#define Y7_GPIO_NUM    12
#define Y6_GPIO_NUM    14
#define Y5_GPIO_NUM    16
#define Y4_GPIO_NUM    18
#define Y3_GPIO_NUM    17
#define Y2_GPIO_NUM    15
#define VSYNC_GPIO_NUM 38
#define HREF_GPIO_NUM  47
#define PCLK_GPIO_NUM  13

// The OV5640 runs hot, so the sensor goes into standby when nobody has asked for a photo.
const unsigned long REST_AFTER_MS = 15000;

WebServer server(80);
bool resting = false;
unsigned long lastPhotoAt = 0;

void setResting(bool rest) {
  sensor_t *s = esp_camera_sensor_get();
  s->set_reg(s, 0x3008, 0xff, rest ? 0x42 : 0x02);  // OV5640 software standby on or off
  resting = rest;
}

bool startCamera() {
  camera_config_t c = {};
  c.ledc_channel = LEDC_CHANNEL_0;
  c.ledc_timer = LEDC_TIMER_0;
  c.pin_d0 = Y2_GPIO_NUM; c.pin_d1 = Y3_GPIO_NUM; c.pin_d2 = Y4_GPIO_NUM; c.pin_d3 = Y5_GPIO_NUM;
  c.pin_d4 = Y6_GPIO_NUM; c.pin_d5 = Y7_GPIO_NUM; c.pin_d6 = Y8_GPIO_NUM; c.pin_d7 = Y9_GPIO_NUM;
  c.pin_xclk = XCLK_GPIO_NUM; c.pin_pclk = PCLK_GPIO_NUM; c.pin_vsync = VSYNC_GPIO_NUM;
  c.pin_href = HREF_GPIO_NUM; c.pin_sccb_sda = SIOD_GPIO_NUM; c.pin_sccb_scl = SIOC_GPIO_NUM;
  c.pin_pwdn = PWDN_GPIO_NUM; c.pin_reset = RESET_GPIO_NUM;
  c.xclk_freq_hz = 16000000;
  c.pixel_format = PIXFORMAT_JPEG;
  c.frame_size = FRAMESIZE_UXGA;  // 1600 x 1200: enough to read small parts and labels
  c.jpeg_quality = 12;
  c.fb_count = 2;
  c.fb_location = CAMERA_FB_IN_PSRAM;
  c.grab_mode = CAMERA_GRAB_LATEST;  // always hand over the newest frame

  if (esp_camera_init(&c) != ESP_OK) {
    Serial.println("Camera didn't start. Check the ribbon cable and its latch.");
    return false;
  }
  sensor_t *s = esp_camera_sensor_get();
  s->set_vflip(s, 1);  // the OV5640 comes up upside down on this board
  return true;
}

void handleCapture() {
  lastPhotoAt = millis();
  if (resting) {
    setResting(false);
    delay(300);  // let the exposure settle, then skip the stale frames
    for (int i = 0; i < 2; i++) {
      camera_fb_t *old = esp_camera_fb_get();
      if (old) esp_camera_fb_return(old);
    }
  }
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    server.send(503, "text/plain", "No photo yet. Try again.");
    return;
  }
  server.sendHeader("Cache-Control", "no-store");
  server.setContentLength(fb->len);
  server.send(200, "image/jpeg", "");
  server.client().write(fb->buf, fb->len);
  esp_camera_fb_return(fb);
}

void setup() {
  Serial.begin(115200);
  setCpuFrequencyMhz(160);  // cooler than 240 MHz, and fast enough for one photo at a time
  startCamera();

  WiFi.mode(WIFI_STA);
  WiFi.setSleep(false);  // Wi-Fi power saving made each photo take several seconds
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  while (WiFi.status() != WL_CONNECTED) delay(500);
  Serial.printf("Otto camera ready at http://%s/capture\n", WiFi.localIP().toString().c_str());

  // Let the app find this otter by itself: by name (ayin-otter.local) and by asking "/hello".
  MDNS.begin("ayin-otter");
  server.on("/hello", []() { server.send(200, "application/json", "{\"ayin\":\"otter\",\"buttons\":false}"); });
  server.on("/capture", handleCapture);
  server.begin();
}

void loop() {
  server.handleClient();
  if (!resting && millis() - lastPhotoAt > REST_AFTER_MS) setResting(true);
}
