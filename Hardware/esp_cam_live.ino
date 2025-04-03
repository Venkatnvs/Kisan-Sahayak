#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include "ArduinoJson.h"
#include "esp_camera.h"
#include "base64.h"
#include "esp_http_server.h"

const char* ssid = "Project";
const char* password = "12345678";
const char* serverUrl = "http://192.168.177.37:8000/api/core/field-data/";

WebServer server(80);
String receivedData;

// JPEG HTTP Stream settings
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

httpd_handle_t stream_httpd = NULL;

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

// Stream handler function - handles the actual video streaming
static esp_err_t stream_handler(httpd_req_t *req) {
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;
    size_t _jpg_buf_len = 0;
    uint8_t * _jpg_buf = NULL;
    char * part_buf[64];

    res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
    if(res != ESP_OK){
        return res;
    }

    while(true){
        fb = esp_camera_fb_get();
        if (!fb) {
            Serial.println("Camera capture failed");
            res = ESP_FAIL;
        } else {
            _jpg_buf_len = fb->len;
            _jpg_buf = fb->buf;
            
            if(res == ESP_OK){
                size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, _jpg_buf_len);
                res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
            }
            if(res == ESP_OK){
                res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
            }
            if(res == ESP_OK){
                res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
            }
            
            esp_camera_fb_return(fb);
            if(res != ESP_OK){
                break;
            }
            // Small delay to control frame rate
            delay(50);
        }
    }
    return res;
}

// Function to start streaming server on a different port
void startStreamServer(){
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 81; // Use a different port than your main WebServer
    config.max_uri_handlers = 16;

    httpd_uri_t stream_uri = {
        .uri       = "/",  // Root path for the streaming server
        .method    = HTTP_GET,
        .handler   = stream_handler,
        .user_ctx  = NULL
    };

    if (httpd_start(&stream_httpd, &config) == ESP_OK) {
        httpd_register_uri_handler(stream_httpd, &stream_uri);
        Serial.println("Stream server started on port 81");
    } else {
        Serial.println("Failed to start stream server");
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
    Serial.print("IP Address: ");
    Serial.println(WiFi.localIP());
    
    startCamera();
    
    // Start the original WebServer for data capture
    server.on("/capture", HTTP_POST, handleData);
    server.begin();
    Serial.println("Web server started on port 80");
    
    // Start a separate streaming server
    startStreamServer();
    Serial.println("Access the stream at http://" + WiFi.localIP().toString() + ":81");
}

void loop() {
    server.handleClient();
    // No need to handle the stream server here as it runs in its own task
}