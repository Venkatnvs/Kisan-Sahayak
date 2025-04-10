#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include "ArduinoJson.h"
#include "esp_camera.h"
#include "base64.h"

const char* ssid = "Project";
const char* password = "12345678";
const char* serverUrl = "http://192.168.177.37:8000/api/core/field-data/";

WebServer server(80);
String receivedData;

void startCamera() {
    camera_config_t config;
    config.ledc_channel = LEDC_CHANNEL_0;
    config.ledc_timer = LEDC_TIMER_0;
    config.pin_d0 = 5;
    config.pin_d1 = 18;
    config.pin_d2 = 19;
    config.pin_d3 = 21;
    config.pin_d4 = 36;
    config.pin_d5 = 39;
    config.pin_d6 = 34;
    config.pin_d7 = 35;
    config.pin_xclk = 0;
    config.pin_pclk = 22;
    config.pin_vsync = 25;
    config.pin_href = 23;
    config.pin_sscb_sda = 26;
    config.pin_sscb_scl = 27;
    config.pin_pwdn = 32;
    config.pin_reset = -1;
    config.xclk_freq_hz = 20000000;
    config.pixel_format = PIXFORMAT_JPEG;

    if(psramFound()){
        config.frame_size = FRAMESIZE_VGA;
        config.jpeg_quality = 10;
        config.fb_count = 2;
    } else {
        config.frame_size = FRAMESIZE_CIF;
        config.jpeg_quality = 10;
        config.fb_count = 1;
    }

    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        Serial.printf("Camera init failed with error 0x%x", err);
    }
}

String captureImage() {
    camera_fb_t * fb = esp_camera_fb_get();
    if (!fb) {
        Serial.println("Camera capture failed");
        return "";
    }

    String base64Image = base64::encode(fb->buf, fb->len);
    esp_camera_fb_return(fb);
    return base64Image;
}

void handleData() {
    if (server.hasArg("plain")) {
        receivedData = server.arg("plain");
        Serial.println("Received Data: " + receivedData);
        sendDataToServer();
        server.send(200, "application/json", "{\"status\":\"Data Received\"}");
    } else {
        server.send(400, "application/json", "{\"error\":\"Invalid Request\"}");
    }
}

void sendDataToServer() {
    if (WiFi.status() == WL_CONNECTED) {
        HTTPClient http;
        http.begin(serverUrl);
        http.addHeader("Content-Type", "application/json");

        StaticJsonDocument<500> jsonDoc;
        DeserializationError error = deserializeJson(jsonDoc, receivedData);

        if (error) {
            Serial.println("JSON Parse Error");
            return;
        }

        String base64Image = captureImage();
        jsonDoc["img"] = base64Image;

        String jsonString;
        serializeJson(jsonDoc, jsonString);

        int httpResponseCode = http.POST(jsonString);

        if (httpResponseCode > 0) {
            String response = http.getString();
            Serial.println("Server Response: " + response);
        } else {
            Serial.println("Error sending POST request to server");
        }

        http.end();
    } else {
        Serial.println("WiFi Disconnected");
    }
}

void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);

    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    Serial.println("Connected to WiFi");

    startCamera();

    server.on("/capture", HTTP_POST, handleData);
    server.begin();
}

void loop() {
    server.handleClient();
}
