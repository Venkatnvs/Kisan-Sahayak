#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include <HTTPClient.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include "esp_camera.h"
#include "base64.h"
#include <Preferences.h>
#include <WiFiClientSecure.h>
#include <WebSocketsClient.h>
#include <SocketIOclient.h>
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Firebase configuration
#define DATABASE_URL "https://big-agri-bot-default-rtdb.asia-southeast1.firebasedatabase.app/"
#define API_KEY "AIzaSyBstENJ1VGB9kcDHX3h1kWbiWCL7is6XRc"

// Define Firebase objects
FirebaseData fbdoStream, fbdo, fbdoSensorData;
FirebaseAuth auth;
FirebaseConfig config;

// Firebase real-time database paths
#define RTDB_PATH "/esp32_old/triggers"
String mainPath = RTDB_PATH;
String commandPath;
String SensorDataPath;

String receivedData;
String encodedBuffer;

// Function declarations
void streamCallback(FirebaseStream data);
void streamTimeoutCallback(bool timeout);
void startCamera();
String getCamFrame();
void sendDataToServer();
void handleData();
void handleRoot();
void handleSave();
void handleReset();
void mainConfigServer();
void socketIOEvent(socketIOmessageType_t type, uint8_t* payload, size_t length);
void adjustNetworkParameters();
void loadConfig();
void connectToFirebase();

// WiFi & HTTP settings for station mode (data capture and Socket.IO transmission)
String storedSSID;
String storedPassword;
String storedServerUrl;
String storedApiKey;

// For configuration portal
bool configMode = false;
WebServer server(80);
Preferences preferences;

// Socket.IO Client
SocketIOclient socketIO;
WiFiClientSecure secureClient;

// Timing and frame settings for Socket.IO
int frameRate = 10;  // Frame rate for Socket.IO transmission.
unsigned long lastFrameSent = 0;
unsigned long lastMetadataSent = 0;
unsigned long metadataInterval = 10000;  // Send metadata every 10 seconds
const size_t MAX_BASE64_SIZE = 200000;

void startCamera() {
  camera_config_t config;
  // Using LEDC timer/channel for XCLK
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  // Data pins – adjust pins as per your wiring
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
  // Lower clock frequency may help if JPEG is not supported.
  config.xclk_freq_hz = 12000000;
  // Here we use raw format: RGB565 (instead of PIXFORMAT_JPEG)
  config.pixel_format = PIXFORMAT_RGB565;
  // Choose a low resolution (e.g. HQVGA); if you have problems try an even lower resolution
  config.frame_size = FRAMESIZE_QVGA;
  config.jpeg_quality = 12;  // Still required field though not used
  config.fb_count = 1;
  
  esp_err_t err = esp_camera_init(&config);
  if(err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
  } else {
    sensor_t * s = esp_camera_sensor_get();
    if(s) {
      s->set_framesize(s, FRAMESIZE_QVGA);
      s->set_quality(s, 10);
      s->set_colorbar(s, 0);
      s->set_brightness(s, 2);
      s->set_contrast(s, 2);
      s->set_saturation(s, 1);
      s->set_sharpness(s, 1);
      s->set_denoise(s, 0);
      s->set_gainceiling(s, GAINCEILING_8X);
      s->set_whitebal(s, 1);
      s->set_exposure_ctrl(s, 1);
      s->set_awb_gain(s, 1);
      s->set_aec2(s, 1);
    }
  }
}

String getCamFrame() {
  camera_fb_t *fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return "";
  }
  if(fb) {
    uint8_t *jpg_buf2 = NULL;
    size_t jpg_len2 = 0;
    bool conversionResult2 = frame2jpg(fb, 75, &jpg_buf2, &jpg_len2);
    esp_camera_fb_return(fb);
    if(!conversionResult2) {
      Serial.println("JPEG compression failed");
      delay(30);
      return "";
    }
    encodedBuffer = base64::encode(jpg_buf2, jpg_len2);
    free(jpg_buf2);
    return encodedBuffer;
  }
  return "";
}

void sendDataToServer() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin("https://kisan-sahayak.onrender.com/api/core/field-data/");
    http.addHeader("Content-Type", "application/json");
    receivedData.trim();
    StaticJsonDocument<512> jsonDoc;
    DeserializationError error = deserializeJson(jsonDoc, receivedData);
    if (error) {
      Serial.print("deserializeJson() failed: ");
      Serial.println(error.c_str());
      Serial.println("Received Data After trim():");
      Serial.println(receivedData);
      return;
    }
    // Capture raw image (base64 encoded)
    String base64Image = getCamFrame();
    jsonDoc["img"] = base64Image;
    
    String jsonString;
    serializeJson(jsonDoc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    if (httpResponseCode > 0) {
      String response = http.getString();
      Serial.println("Server Response: " );
      Serial.println(response);
    } else {
      Serial.print("Error on HTTP request: ");
      Serial.println(httpResponseCode);
      Serial.println("Error sending POST request to server");
    }
    http.end();
  } else {
    Serial.println("WiFi Disconnected");
  }
}

void handleData() {
  if (Firebase.RTDB.getString(&fbdoSensorData, SensorDataPath.c_str())) {
    receivedData = fbdoSensorData.stringData();
    Serial.println("Data retrieved from Firebase:");
    Serial.println(receivedData);
    sendDataToServer();
  } else {
    Serial.println("Failed to retrieve data from Firebase:");
    Serial.println(fbdoSensorData.errorReason().c_str());
  }
}

void handleRoot() {
  // This is the configuration page if no credentials are set or you want to reconfigure.
  String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>ESP32-CAM Config</title><style>";
  html += "body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background:#f5f5f5; color:#333; }";
  html += ".container { max-width:500px; margin:0 auto; background:white; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); }";
  html += "label { display:block; margin-bottom:5px; font-weight:bold; }";
  html += "input[type='text'], input[type='password'] { width:100%; padding:10px; margin-bottom:20px; border:1px solid #ddd; border-radius:4px; }";
  html += "input[type='submit'] { background:#0066cc; color:white; border:none; padding:12px 20px; border-radius:4px; cursor:pointer; width:100%; font-size:16px; }";
  html += "input[type='submit']:hover { background:#0055aa; }";
  html += ".reset-link { display:block; text-align:center; margin-top:20px; color:#cc0000; text-decoration:none; }";
  html += ".status { text-align:center; margin-top:20px; padding:10px; border-radius:4px; }";
  html += ".connected { background:#d4edda; color:#155724; }";
  html += ".disconnected { background:#f8d7da; color:#721c24; }";
  html += "</style></head><body><div class='container'>";
  html += "<h1>ESP32-CAM Configuration</h1>";
  if(WiFi.status() == WL_CONNECTED)
    html += "<div class='status connected'>Connected to WiFi: " + WiFi.SSID() + "<br>IP: " + WiFi.localIP().toString() + "</div>";
  else
    html += "<div class='status disconnected'>Not connected to WiFi</div>";
  html += "<form action='/save' method='POST'>";
  html += "<label for='ssid'>WiFi SSID:</label>";
  html += "<input type='text' id='ssid' name='ssid' value='" + storedSSID + "' required>";
  html += "<label for='password'>WiFi Password:</label>";
  html += "<input type='password' id='password' name='password' value='" + storedPassword + "'>";
  html += "<label for='serverUrl'>Server URL:</label>";
  html += "<input type='text' id='serverUrl' name='serverUrl' value='" + storedServerUrl + "' required>";
  html += "<label for='apiKey'>API Key:</label>";
  html += "<input type='text' id='apiKey' name='apiKey' value='" + storedApiKey + "' required>";
  html += "<input type='submit' value='Save Configuration'>";
  html += "</form>";
  html += "<a href='/reset' class='reset-link'>Reset All Configuration</a><br><br>";
  html += "<a href='/stream'>View Stream</a>";
  html += "</div></body></html>";
  server.send(200, "text/html", html);
}

void handleSave() {
  if(server.hasArg("ssid") && server.hasArg("password") && server.hasArg("serverUrl") && server.hasArg("apiKey")) {
    storedSSID = server.arg("ssid");
    storedPassword = server.arg("password");
    storedServerUrl = server.arg("serverUrl");
    storedApiKey = server.arg("apiKey");

    preferences.begin("config", false);
    preferences.putString("ssid", storedSSID);
    preferences.putString("password", storedPassword);
    preferences.putString("serverUrl", storedServerUrl);
    preferences.putString("apiKey", storedApiKey);
    preferences.end();

    String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<title>Configuration Saved</title><style>body { font-family:Arial, sans-serif; text-align:center; padding:20px; background:#f5f5f5; }";
    html += ".container { max-width:500px; margin:0 auto; background:white; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); }";
    html += "h1 { color:#28a745; }</style>";
    html += "<script>setTimeout(function(){ window.location.href = '/'; },5000);</script>";
    html += "</head><body><div class='container'><h1>Configuration Saved!</h1><p>Your settings have been saved. The device will restart shortly.</p></div></body></html>";
    server.send(200, "text/html", html);
    delay(2000);
    ESP.restart();
  } else {
    String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<title>Error</title><style>body { font-family:Arial, sans-serif; text-align:center; padding:20px; background:#f5f5f5; }";
    html += ".container { max-width:500px; margin:0 auto; background:white; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); }";
    html += "h1 { color:#dc3545; }</style></head><body><div class='container'><h1>Error</h1><p>Missing required parameters.</p>";
    html += "<a href='/'>Go Back</a></div></body></html>";
    server.send(400, "text/html", html);
  }
}

void handleReset() {
  preferences.begin("config", false);
  preferences.clear();
  preferences.end();
  String html = "<!DOCTYPE html><html><head><meta charset='utf-8'><meta name='viewport' content='width=device-width, initial-scale=1'>";
  html += "<title>Configuration Reset</title><style>body { font-family:Arial, sans-serif; text-align:center; padding:20px; background:#f5f5f5; }";
  html += ".container { max-width:500px; margin:0 auto; background:white; padding:30px; border-radius:10px; box-shadow:0 2px 10px rgba(0,0,0,0.1); }";
  html += "h1 { color:#dc3545; }</style></head><body><div class='container'><h1>Configuration Reset!</h1>";
  html += "<p>All settings have been cleared. The device will restart shortly.</p></div></body></html>";
  server.send(200, "text/html", html);
  delay(2000);
  ESP.restart();
}

void mainConfigServer() {
  server.on("/", HTTP_GET, handleRoot);
  server.on("/save", HTTP_POST, handleSave);
  server.on("/reset", HTTP_GET, handleReset);
  server.begin();
  Serial.println("Web server started");
}

void socketIOEvent(socketIOmessageType_t type, uint8_t* payload, size_t length) {
  switch(type) {
    case sIOtype_DISCONNECT:
      Serial.println("[SIO] Disconnected!");
      break;
    case sIOtype_CONNECT:
      Serial.printf("[SIO] Connected: %s\n", payload);
      socketIO.send(sIOtype_CONNECT, "/");
      break;
    case sIOtype_EVENT:
      Serial.println("[SIO] Event received");
      break;
    case sIOtype_ERROR:
      Serial.printf("[SIO] Error: %s\n", payload);
      break;
    default:
      break;
  }
}

void adjustNetworkParameters() {
  int rssi = WiFi.RSSI();
  static unsigned long lastAdjustTime = 0;
  unsigned long currentTime = millis();
  if (currentTime - lastAdjustTime < 10000) return;
  lastAdjustTime = currentTime;
  
  if (rssi < -85) {
    frameRate = 5;
    Serial.println("Very poor connection. Frame rate: 5fps");
  } else if (rssi < -75) {
    frameRate = 8;
    Serial.println("Poor connection. Frame rate: 8fps");
  } else {
    frameRate = 10;
    Serial.println("Good connection. Frame rate: 10fps");
  }
}

void loadConfig() {
  preferences.begin("config", true);
  storedSSID = preferences.getString("ssid", "");
  storedPassword = preferences.getString("password", "");
  storedServerUrl = preferences.getString("serverUrl", "");
  storedApiKey = preferences.getString("apiKey", "");
  preferences.end();
}

void connectToFirebase() {
  // Configure Firebase
  config.api_key = API_KEY;
  config.database_url = DATABASE_URL;
  config.token_status_callback = tokenStatusCallback;
  config.max_token_generation_retry = 3;

  Firebase.reconnectNetwork(true);
  fbdo.setBSSLBufferSize(4096, 1024);
  fbdo.setResponseSize(2048);

  auth.user.email = "venkatnvs2005@gmail.com";
  auth.user.password = "venkat123";
  Firebase.begin(&config, &auth);

  // Wait for Firebase to be ready
  int retryCount = 0;
  while (!Firebase.ready() && retryCount < 5)
  {
    delay(500);
    retryCount++;
    Serial.print(".");
  }
  Serial.println("\nFirebase ready!");

  // Set up Firebase paths
  commandPath = mainPath;
  commandPath+= "/command";

  SensorDataPath = mainPath;
  SensorDataPath += "/sensor_data";

  // Start Firebase streaming for manual commands
  if (!Firebase.RTDB.beginStream(&fbdoStream, commandPath))
  {
    Serial.printf("Stream failed: %s\n", fbdoStream.errorReason().c_str());
  }
  else
  {
    Firebase.RTDB.setStreamCallback(&fbdoStream, streamCallback, streamTimeoutCallback);
  }
}

void setup() {
  // Disable brownout detector if necessary
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  
  Serial.begin(115200);
  loadConfig();
  
  // If no WiFi credentials saved, start configuration portal in AP mode.
  if (storedSSID == "") {
    Serial.println("No WiFi credentials found, starting configuration portal.");
    configMode = true;
    WiFi.mode(WIFI_AP);
    WiFi.softAP("ESP32-CAM-Config");
    mainConfigServer();
    return;
  } else {
    // Attempt to connect to WiFi in STA mode.
    WiFi.mode(WIFI_STA);
    WiFi.begin(storedSSID.c_str(), storedPassword.c_str());
    Serial.print("Connecting to WiFi");
    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 15000) {
      Serial.print(".");
      delay(500);
    }
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nFailed to connect. Starting configuration portal.");
      configMode = true;
      WiFi.mode(WIFI_AP);
      WiFi.softAP("ESP32-CAM-Config");
      mainConfigServer();
      return;
    } else {
      Serial.println();
      Serial.print("Connected! IP address: ");
      Serial.println(WiFi.localIP());
      mainConfigServer();
      connectToFirebase();
    }
  }
  
  startCamera();
  
  // ----- Initialize Socket.IO Client -----
  // Determine host/port from storedServerUrl
  String sUrl = storedServerUrl;
  bool useSSL = false;
  uint16_t port = 80;
  if (sUrl.startsWith("https://")) {
    useSSL = true;
    sUrl.replace("https://", "");
    port = 443;
  } else if (sUrl.startsWith("http://")) {
    sUrl.replace("http://", "");
    port = 80;
  }
  String host = sUrl;
  String path = "/socket.io/?EIO=4";
  int slashIndex = sUrl.indexOf('/');
  if (slashIndex != -1)
    host = sUrl.substring(0, slashIndex);
  int colonIndex = host.indexOf(':');
  if (colonIndex != -1) {
    port = host.substring(colonIndex + 1).toInt();
    host = host.substring(0, colonIndex);
  }
  
  socketIO.setExtraHeaders("X-Network-Priority: low-latency");
  socketIO.onEvent(socketIOEvent);
  if (useSSL) {
    secureClient.setInsecure();
    socketIO.beginSSL(host.c_str(), port, path.c_str(), "");
  } else {
    Serial.printf("Connecting to %s:%d%s\n", host.c_str(), port, path.c_str());
    socketIO.begin(host.c_str(), port, path.c_str());
  }
  lastFrameSent = millis();
}

void loop() {
  server.handleClient();
  if (configMode) return;
  unsigned long currentTime = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    static unsigned long lastWifiCheckTime = 0;
    if (currentTime - lastWifiCheckTime > 5000) {
      lastWifiCheckTime = currentTime;
      Serial.println("WiFi disconnected. Retrying...");
      WiFi.disconnect();
      delay(100);
      WiFi.begin(storedSSID.c_str(), storedPassword.c_str());
    }
    delay(100);
    return;
  }
  
  socketIO.loop();
  adjustNetworkParameters();

  int frameInterval = 1000 / frameRate;
  if (currentTime - lastFrameSent < (unsigned long)frameInterval) {
    yield();
    return;
  }

  // Periodically send metadata via Socket.IO
  if (currentTime - lastMetadataSent > metadataInterval) {
    StaticJsonDocument<128> doc;
    doc["api_key"] = storedApiKey;
    String metadata;
    serializeJson(doc, metadata);
    socketIO.sendEVENT("[\"frame_metadata\"," + metadata + "]");
    lastMetadataSent = currentTime;
  }
  
    String encodedBuffer = getCamFrame();
    if (encodedBuffer.length() < MAX_BASE64_SIZE && encodedBuffer.length() > 1) {
        socketIO.sendEVENT("[\"frame_data\", \"" + encodedBuffer + "\"]");
    }
  
  lastFrameSent = currentTime;
  delay(30);
}

void streamCallback(FirebaseStream data)
{
  Serial.println("Stream event received!");
  if (data.dataType() == "string")
  {
    String action = data.stringData();
    Serial.printf("Action received: %s\n", action.c_str());
    if (action == "usend") {
      handleData();
    }
    {
      // Reset the Firebase action trigger
      if (!Firebase.RTDB.setString(&fbdo, commandPath, "none"))
      {
        Serial.printf("Failed to reset trigger: %s\n", fbdo.errorReason().c_str());
      }
    }
  }
}

void streamTimeoutCallback(bool timeout)
{
  if (timeout)
  {
    Serial.println("Stream timeout occurred, reconnecting...");
  }
  else
  {
    Serial.println("Stream disconnected, trying to reconnect...");
  }
  Firebase.RTDB.beginStream(&fbdoStream, commandPath);
}