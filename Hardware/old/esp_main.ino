#include <WiFi.h>
#include <HTTPClient.h>
#include "ArduinoJson.h"
#include "BluetoothSerial.h"
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <DHT.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

const char* ssid = "Project";
const char* password = "12345678";
const char* esp32CamUrl = "http://192.168.177.179/capture";  
unsigned long lastWifiCheckTime = 0;
const unsigned long wifiCheckInterval = 30000; 

// --- Motor Driver Pins ---
#define IN1 13
#define IN2 12
#define IN3 14
#define IN4 27
#define ENA 15

// --- Linear Actuator Pins ---
#define IN5 26
#define IN6 25

// --- PCA9685 Configuration ---
Adafruit_PWMServoDriver pca9685 = Adafruit_PWMServoDriver(0x40);
#define SERVO1_CHANNEL 0  
#define SERVO2_CHANNEL 1  
#define SERVO3_CHANNEL 2  
#define SERVO_MIN 150  
#define SERVO_MAX 600 
bool pcaInitialized = false;

#define DHTPIN 4  
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);
bool dhtInitialized = false;

#define SOIL_MOISTURE_PIN 34  

static const int RXPin = 16, TXPin = 17;  
static const uint32_t GPSBaud = 9600;
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);
unsigned long lastGpsValidTime = 0;
const unsigned long gpsTimeout = 10000; 

BluetoothSerial SerialBT;  
bool btConnected = false;

// --- System Status ---
bool wifiConnected = false;
unsigned long lastSensorReadTime = 0;
const unsigned long sensorReadInterval = 5000;

void setup() {
    Serial.begin(115200);
    Serial.println("System initializing...");
    
    // Initialize Bluetooth
    if (!SerialBT.begin("AGRI_BOT")) {
        Serial.println("ERROR: Bluetooth initialization failed!");
    } else {
        Serial.println("Bluetooth initialized successfully (AGRI_BOT)");
        btConnected = true;
    }
    
    // Connect to WiFi
    connectWiFi();

    // Motor & Actuator Pins
    pinMode(IN1, OUTPUT); pinMode(IN2, OUTPUT);
    pinMode(IN3, OUTPUT); pinMode(IN4, OUTPUT);
    pinMode(ENA, OUTPUT);
    pinMode(IN5, OUTPUT); pinMode(IN6, OUTPUT);
    stopCar();
    stopActuator();
    Serial.println("Motor and actuator pins initialized");

    // PCA9685 Setup
    Wire.begin();
    if (!pca9685.begin()) {
        Serial.println("ERROR: PCA9685 servo driver not detected!");
        sendBTMessage("ERROR: Servo driver not detected!");
    } else {
        pca9685.setPWMFreq(50);
        pcaInitialized = true;
        Serial.println("PCA9685 servo driver initialized");
    }

    // DHT11 Sensor Setup
    dht.begin();
    dhtInitialized = true;
    Serial.println("DHT11 sensor initialized");

    // GPS Setup
    gpsSerial.begin(GPSBaud, SERIAL_8N1, RXPin, TXPin);
    Serial.println("GPS module initialized");
    
    Serial.println("System initialization complete");
    sendBTMessage("AGRI_BOT system ready");
}

void loop() {
    // Check and maintain WiFi connection
    if (millis() - lastWifiCheckTime > wifiCheckInterval) {
        checkWiFiConnection();
        lastWifiCheckTime = millis();
    }
    
    // Process Bluetooth commands
    processBluetoothCommands();
    
    // Process GPS data
    processGPS();
    
    // Automatically read sensors periodically
    if (millis() - lastSensorReadTime > sensorReadInterval) {
        readSensors();
        lastSensorReadTime = millis();
    }
}

// --- WiFi Connection Management ---
void connectWiFi() {
    Serial.println("Connecting to WiFi...");
    sendBTMessage("Connecting to WiFi...");
    
    WiFi.begin(ssid, password);
    
    // Wait up to 20 seconds for connection
    unsigned long startAttemptTime = millis();
    while (WiFi.status() != WL_CONNECTED && millis() - startAttemptTime < 20000) {
        delay(500);
        Serial.print(".");
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        wifiConnected = true;
        Serial.println("\nConnected to WiFi");
        Serial.print("IP address: ");
        Serial.println(WiFi.localIP());
        sendBTMessage("WiFi connected: " + WiFi.localIP().toString());
    } else {
        wifiConnected = false;
        Serial.println("\nFailed to connect to WiFi");
        sendBTMessage("WiFi connection failed");
    }
}

void checkWiFiConnection() {
    if (WiFi.status() != WL_CONNECTED) {
        wifiConnected = false;
        Serial.println("WiFi connection lost. Reconnecting...");
        sendBTMessage("WiFi disconnected. Reconnecting...");
        WiFi.disconnect();
        delay(1000);
        connectWiFi();
    }
}

// --- Bluetooth Message Handling ---
void sendBTMessage(String message) {
    if (btConnected) {
        SerialBT.println(message);
    }
    // Always log to serial for debugging
    Serial.println("BT: " + message);
}

void processBluetoothCommands() {
    if (SerialBT.available()) {
        String command = SerialBT.readStringUntil('\n');
        command.trim();
        Serial.println("Received command: " + command);

        // Movement Commands
        if (command == "f") {
            moveForward();
            sendBTMessage("Moving forward");
        }
        else if (command == "b") {
            moveBackward();
            sendBTMessage("Moving backward");
        }
        else if (command == "l") {
            turnLeft();
            sendBTMessage("Turning left");
        }
        else if (command == "r") {
            turnRight();
            sendBTMessage("Turning right");
        }
        else if (command == "s") {
            stopCar();
            sendBTMessage("Stopped");
        }
        
        // Actuator Commands
        else if (command == "u") {
            upActuator();
            sendBTMessage("Actuator moving up");
        }
        else if (command == "d") {
            downActuator();
            sendBTMessage("Actuator moving down");
        }
        else if (command == "t") {
            stopActuator();
            sendBTMessage("Actuator stopped");
        }
        
        // Servo Control
        else if (command.startsWith("servo")) {
            if (!pcaInitialized) {
                sendBTMessage("ERROR: Servo driver not available");
            } else {
                processServoCommand(command);
            }
        }
        
        // Sensor Data Commands
        else if (command == "sensor") {
            sendSensorData();
        }
        else if (command == "gps") {
            sendGPSData();
        }
        else if (command == "send") {
            sendDataToESP32CAM();
        }
        else if (command == "status") {
            sendSystemStatus();
        }
        else if (command == "help") {
            sendHelpMenu();
        }
        else if (command == "reset") {
            sendBTMessage("Resetting system...");
            ESP.restart();
        }
        else {
            sendBTMessage("Unknown command: " + command);
            stopCar();
            stopActuator();
        }
    }
}

// --- Send System Status ---
void sendSystemStatus() {
    String status = "System Status:";
    
    // WiFi Status
    status += "\nWiFi: " + String(wifiConnected ? "Connected" : "Disconnected");
    if (wifiConnected) {
        status += " (" + WiFi.localIP().toString() + ")";
    }
    
    // Hardware Status
    status += "\nServos: " + String(pcaInitialized ? "OK" : "ERROR");
    status += "\nDHT Sensor: " + String(dhtInitialized ? "OK" : "ERROR");
    
    // GPS Status
    if (gps.location.isValid() && millis() - lastGpsValidTime < gpsTimeout) {
        status += "\nGPS: Valid Fix";
    } else {
        status += "\nGPS: No Fix";
    }
    
    
    sendBTMessage(status);
}

// --- Help Menu ---
void sendHelpMenu() {
    String helpMenu = "AGRI_BOT Commands:";
    helpMenu += "\nMovement: f (forward), b (back), l (left), r (right), s (stop)";
    helpMenu += "\nActuator: u (up), d (down), t (stop)";
    helpMenu += "\nServo: servo [1-3] [0-180]";
    helpMenu += "\nData: sensor, gps, send, status";
    helpMenu += "\nSystem: help, reset";
    
    sendBTMessage(helpMenu);
}

void sendDataToESP32CAM() {
    if (!wifiConnected) {
        sendBTMessage("ERROR: WiFi not connected. Cannot send data.");
        return;
    }
    
    sendBTMessage("Preparing to send data to ESP32-CAM...");
    
    float temperature = 0;
    float humidity = 0;
    int soilMoisture = 0;
    bool sensorReadSuccess = true;
    
    if (dhtInitialized) {
        temperature = dht.readTemperature();
        humidity = dht.readHumidity();
        
        if (isnan(temperature) || isnan(humidity)) {
            sendBTMessage("WARNING: Failed to read from DHT sensor");
            sensorReadSuccess = false;
            temperature = 0;
            humidity = 0;
        }
    } else {
        sendBTMessage("WARNING: DHT sensor not initialized");
        sensorReadSuccess = false;
    }
    
    soilMoisture = analogRead(SOIL_MOISTURE_PIN);
    if (soilMoisture == 0) {
        sendBTMessage("WARNING: Soil moisture reading seems invalid");
    }
    int soilMoisturePercent = map(soilMoisture, 0, 4095, 100, 0);
    
    double latitude = 0.0;
    double longitude = 0.0;
    bool gpsValid = false;
    
    if (gps.location.isValid() && millis() - lastGpsValidTime < gpsTimeout) {
        latitude = gps.location.lat();
        longitude = gps.location.lng();
        gpsValid = true;
    } else {
        sendBTMessage("WARNING: GPS data not available, using default coordinates");
    }
    
    try {
        HTTPClient http;
        http.begin(esp32CamUrl);
        http.addHeader("Content-Type", "application/json");
        http.setTimeout(10000);

        StaticJsonDocument<256> jsonDoc;
        jsonDoc["main_field"] = 2;
        jsonDoc["temperature"] = temperature;
        jsonDoc["humidity"] = humidity;
        jsonDoc["soil_moisture"] = soilMoisturePercent;
        jsonDoc["description"] = sensorReadSuccess ? "Data from AGRI_BOT sensors" : "Partial sensor data";
        
        JsonObject location = jsonDoc.createNestedObject("location");
        location["lat"] = gpsValid ? latitude : 0.0;
        location["lng"] = gpsValid ? longitude : 0.0;
        location["valid"] = gpsValid;

        String jsonString;
        serializeJson(jsonDoc, jsonString);
        
        sendBTMessage("Sending data to ESP32-CAM...");
        int httpResponseCode = http.POST(jsonString);
        
        if (httpResponseCode > 0) {
            String response = http.getString();
            Serial.println("Response from ESP32-CAM: " + response);
            sendBTMessage("SUCCESS: Data sent to ESP32-CAM [" + String(httpResponseCode) + "]");
            sendBTMessage("Response: " + response);
        } else {
            Serial.println("Error sending POST request to ESP32-CAM");
            sendBTMessage("ERROR: Failed to send data. Code: " + String(httpResponseCode));
            String errorMsg = http.errorToString(httpResponseCode);
            sendBTMessage("Error: " + errorMsg);
        }

        http.end();
    } catch (const std::exception& e) {
        sendBTMessage("EXCEPTION: HTTP request failed");
        Serial.println("Exception during HTTP request");
    }
}

void readSensors() {
    if (dhtInitialized) {
        float temperature = dht.readTemperature();
        float humidity = dht.readHumidity();
        
        if (!isnan(temperature) && !isnan(humidity)) {
        }
    }
    
    int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
    
}

void sendSensorData() {
    if (!dhtInitialized) {
        sendBTMessage("ERROR: DHT sensor not initialized");
        return;
    }
    
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    if (isnan(temperature) || isnan(humidity)) {
        sendBTMessage("ERROR: Failed to read from DHT sensor");
    } else {
        String tempHumidity = "Temp: " + String(temperature, 1) + "°C, Humidity: " + String(humidity, 1) + "%";
        sendBTMessage(tempHumidity);
    }
    
    int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
    int soilMoisturePercent = map(soilMoisture, 0, 4095, 0, 100);
    sendBTMessage("Soil Moisture: " + String(soilMoisturePercent) + "% (Raw: " + String(soilMoisture) + ")");
}

// --- GPS Data Processing ---
void processGPS() {
    while (gpsSerial.available() > 0) {
        char c = gpsSerial.read();
        if (gps.encode(c)) {
            if (gps.location.isValid()) {
                lastGpsValidTime = millis();
            }
        }
    }
    
    // Check for GPS timeout
    if (millis() > 5000 && gps.charsProcessed() < 10) {
        Serial.println("WARNING: No GPS data received. Check wiring.");
    }
}

// --- Send GPS Data via Bluetooth ---
void sendGPSData() {
    if (gps.location.isValid() && millis() - lastGpsValidTime < gpsTimeout) {
        String gpsData = "GPS: " + String(gps.location.lat(), 6) + ", " + String(gps.location.lng(), 6);
        
        if (gps.date.isValid() && gps.time.isValid()) {
            char dateTime[30];
            sprintf(dateTime, " (%04d-%02d-%02d %02d:%02d:%02d)", 
                gps.date.year(), gps.date.month(), gps.date.day(),
                gps.time.hour(), gps.time.minute(), gps.time.second());
            gpsData += String(dateTime);
        }
        
        if (gps.altitude.isValid()) {
            gpsData += " Alt: " + String(gps.altitude.meters()) + "m";
        }
        
        if (gps.satellites.isValid()) {
            gpsData += " Sats: " + String(gps.satellites.value());
        }
        
        sendBTMessage(gpsData);
    } else {
        sendBTMessage("GPS Signal Not Found or Timed Out");
        sendBTMessage("Chars processed: " + String(gps.charsProcessed()));
    }
}

// --- Motor Control ---
void moveForward() { setMotor(HIGH, LOW, HIGH, LOW); }
void moveBackward() { setMotor(LOW, HIGH, LOW, HIGH); }
void turnLeft() { setMotor(HIGH, LOW, LOW, HIGH); }
void turnRight() { setMotor(LOW, HIGH, HIGH, LOW); }
void stopCar() { setMotor(LOW, LOW, LOW, LOW); }

void setMotor(int a, int b, int c, int d) {
    digitalWrite(IN1, a); digitalWrite(IN2, b);
    digitalWrite(IN3, c); digitalWrite(IN4, d);
    analogWrite(ENA, 255);
}

// --- Linear Actuator Control ---
void upActuator() { digitalWrite(IN5, HIGH); digitalWrite(IN6, LOW); }
void downActuator() { digitalWrite(IN5, LOW); digitalWrite(IN6, HIGH); }
void stopActuator() { digitalWrite(IN5, LOW); digitalWrite(IN6, LOW); }

// --- Servo Control via PCA9685 ---
void setServoAngle(uint8_t channel, int angle) {
    if (!pcaInitialized) {
        sendBTMessage("ERROR: Servo driver not initialized");
        return;
    }
    
    // Constrain the angle to valid range
    angle = constrain(angle, 0, 180);
    
    int pulse = map(angle, 0, 180, SERVO_MIN, SERVO_MAX);
    try {
        pca9685.setPWM(channel, 0, pulse);
        sendBTMessage("Servo " + String(channel + 1) + " set to " + String(angle) + "°");
    } catch (...) {
        sendBTMessage("ERROR: Failed to set servo angle");
    }
}

// --- Process Bluetooth Servo Commands ---
void processServoCommand(String command) {
    int servoNum, angle;
    if (sscanf(command.c_str(), "servo %d %d", &servoNum, &angle) == 2) {
        if (servoNum >= 1 && servoNum <= 3) {
            setServoAngle(servoNum - 1, angle);
        } else {
            sendBTMessage("ERROR: Invalid servo number (must be 1-3)");
        }
    } else {
        sendBTMessage("ERROR: Invalid servo command format");
        sendBTMessage("Use: servo [1-3] [0-180]");
    }
}