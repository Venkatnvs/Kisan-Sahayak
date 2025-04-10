#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"
#include "ArduinoJson.h"
#include <Wire.h>
#include <Adafruit_PWMServoDriver.h>
#include <DHT.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

const char* ssid = "Projects";
const char* password = "12345678@";
unsigned long lastWifiCheckTime = 0;
const unsigned long wifiCheckInterval = 30000;


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

// Function declarations
void streamCallback(FirebaseStream data);
void streamTimeoutCallback(bool timeout);
void connectWiFi();
void checkWiFiConnection();
void sendDataToESP32CAM();
void readSensors();
void sendSensorData();
void processCommand(String command);
void processGPS();
void sendGPSData();
void connectToFirebase();
void setServoAngle(uint8_t channel, int angle);
void processServoCommand(String command);
void moveForward();
void moveBackward();
void turnLeft();
void turnRight();
void stopCar();
void setMotor(int a, int b, int c, int d);
void upActuator();
void downActuator();
void stopActuator();

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

// --- System Status ---
bool wifiConnected = false;
unsigned long lastSensorReadTime = 0;
const unsigned long sensorReadInterval = 5000;

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
    Serial.begin(115200);
    Serial.println("System initializing...");
    
    // Connect to WiFi
    connectWiFi();

    connectToFirebase();

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
        Serial.println("ERROR: Servo driver not detected!");
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
    Serial.println("AGRI_BOT system ready");
}

void loop() {
    // Check and maintain WiFi connection
    if (millis() - lastWifiCheckTime > wifiCheckInterval) {
        checkWiFiConnection();
        lastWifiCheckTime = millis();
    }
    
    // Process GPS data
    processGPS();
    
    // Automatically read sensors periodically
    if (millis() - lastSensorReadTime > sensorReadInterval) {
        readSensors();
        lastSensorReadTime = millis();
    }
}

void processCommand(String command) {
    if (command == "f") {
        moveForward();
        Serial.println("Moving forward");
    }
    else if (command == "b") {
        moveBackward();
        Serial.println("Moving backward");
    }
    else if (command == "l") {
        turnLeft();
        Serial.println("Turning left");
    }
    else if (command == "r") {
        turnRight();
        Serial.println("Turning right");
    }
    else if (command == "s") {
        stopCar();
        Serial.println("Stopped");
    }
    else if (command == "u") {
        upActuator();
        Serial.println("Actuator moving up");
    }
    else if (command == "d") {
        downActuator();
        Serial.println("Actuator moving down");
    }
    else if (command == "t") {
        stopActuator();
        Serial.println("Actuator stopped");
    }
    else if (command.startsWith("servo")) {
        if (!pcaInitialized) {
            Serial.println("ERROR: Servo driver not available");
        } else {
            processServoCommand(command);
        }
    }
    else if (command == "sensor") {
        sendSensorData();
    }
    else if (command == "gps") {
        sendGPSData();
    }
    else if (command == "send") {
        sendDataToESP32CAM();
    }
    else if (command == "reset") {
        Serial.println("Resetting system...");
        ESP.restart();
    }
    else {
        Serial.println("Unknown command: ");
        Serial.println(command);
        stopCar();
        stopActuator();
    }
}

// --- WiFi Connection Management ---
void connectWiFi() {
    Serial.println("Connecting to WiFi...");
    
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
        Serial.println("WiFi connected: ");
        Serial.println(WiFi.localIP().toString());
    } else {
        wifiConnected = false;
        Serial.println("\nFailed to connect to WiFi");
        Serial.println("WiFi connection failed");
    }
}

void checkWiFiConnection() {
    if (WiFi.status() != WL_CONNECTED) {
        wifiConnected = false;
        Serial.println("WiFi disconnected. Reconnecting...");
        WiFi.disconnect();
        delay(1000);
        connectWiFi();
    }
}

void sendDataToESP32CAM() {
    if (!wifiConnected) {
        Serial.println("ERROR: WiFi not connected. Cannot send data.");
        return;
    }
    
    Serial.println("Preparing to send data to ESP32-CAM...");
    
    float temperature = 0;
    float humidity = 0;
    int soilMoisture = 0;
    bool sensorReadSuccess = true;
    
    if (dhtInitialized) {
        temperature = dht.readTemperature();
        humidity = dht.readHumidity();
        
        if (isnan(temperature) || isnan(humidity)) {
            Serial.println("WARNING: Failed to read from DHT sensor");
            sensorReadSuccess = false;
            temperature = 0;
            humidity = 0;
        }
    } else {
        Serial.println("WARNING: DHT sensor not initialized");
        sensorReadSuccess = false;
    }
    
    soilMoisture = analogRead(SOIL_MOISTURE_PIN);
    if (soilMoisture == 0) {
        Serial.println("WARNING: Soil moisture reading seems invalid");
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
        Serial.println("WARNING: GPS data not available, using default coordinates");
    }

    // Build the JSON using ArduinoJson
    StaticJsonDocument<512> jsonDoc;
    jsonDoc["main_field"] = 2;
    jsonDoc["temperature"] = temperature;
    jsonDoc["humidity"] = humidity;
    jsonDoc["soil_moisture"] = soilMoisturePercent;
    jsonDoc["description"] = sensorReadSuccess ? "Data from AGRI_BOT sensors" : "Partial sensor data";

    JsonObject location = jsonDoc.createNestedObject("location");
    location["lat"] = gpsValid ? latitude : 0.0;
    location["lng"] = gpsValid ? longitude : 0.0;
    location["valid"] = gpsValid;

    // Serialize the ArduinoJson document into a String (if needed for debugging)
    String jsonString;
    serializeJson(jsonDoc, jsonString);
    Serial.println(jsonString); // Debugging output

    // Create a FirebaseJson object and set its data from the string
    FirebaseJson fbJson;
    fbJson.setJsonData(jsonString);

    // Use the FirebaseJson object with the set() function
    if (Firebase.RTDB.set(&fbdoSensorData, SensorDataPath.c_str(), &fbJson)) {
        Serial.println("Data sent to Firebase successfully");
    } else {
        Serial.println("Failed to send data to Firebase");
        Serial.println(fbdoSensorData.errorReason().c_str());
    }

}

void readSensors() {
    if (dhtInitialized) {
        float temperature = dht.readTemperature();
        float humidity = dht.readHumidity();
        
        if (!isnan(temperature) && !isnan(humidity)) {
            // Readings successful, but we don't need to do anything here
            // This is just to refresh the sensor readings periodically
        }
    }
    
    int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
    // Similarly, just reading the sensor to keep values updated
}

void sendSensorData() {
    if (!dhtInitialized) {
        Serial.println("ERROR: DHT sensor not initialized");
        return;
    }
    
    float temperature = dht.readTemperature();
    float humidity = dht.readHumidity();
    
    if (isnan(temperature) || isnan(humidity)) {
        Serial.println("ERROR: Failed to read from DHT sensor");
    } else {
        String tempHumidity = "Temp: " + String(temperature, 1) + "°C, Humidity: " + String(humidity, 1) + "%";
        Serial.println(tempHumidity);
    }
    
    int soilMoisture = analogRead(SOIL_MOISTURE_PIN);
    int soilMoisturePercent = map(soilMoisture, 0, 4095, 100, 0);
    Serial.println("Soil Moisture: " + String(soilMoisturePercent) + "% (Raw: " + String(soilMoisture) + ")");
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
        
        Serial.println(gpsData);
    } else {
        Serial.println("GPS Signal Not Found or Timed Out");
        Serial.println("Chars processed: " + String(gps.charsProcessed()));
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
        Serial.println("ERROR: Servo driver not initialized");
        return;
    }
    
    // Constrain the angle to valid range
    angle = constrain(angle, 0, 180);
    
    int pulse = map(angle, 0, 180, SERVO_MIN, SERVO_MAX);
    try {
        pca9685.setPWM(channel, 0, pulse);
        Serial.println("Servo " + String(channel + 1) + " set to " + String(angle) + "°");
    } catch (...) {
        Serial.println("ERROR: Failed to set servo angle");
    }
}

void processServoCommand(String command) {
    int servoNum, angle;
    if (sscanf(command.c_str(), "servo %d %d", &servoNum, &angle) == 2) { 
        if (servoNum >= 1 && servoNum <= 3) {
            setServoAngle(servoNum - 1, angle);
        } else {
            Serial.println("ERROR: Invalid servo number (must be 1-3)");
        }
    } else {
        Serial.println("ERROR: Invalid servo command format");
        Serial.println("Use: servo [1-3] [0-180]");
    }
}


void streamCallback(FirebaseStream data)
{
  Serial.println("Stream event received!");
  if (data.dataType() == "string")
  {
    String action = data.stringData();
    Serial.printf("Action received: %s\n", action.c_str());
    processCommand(action);
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