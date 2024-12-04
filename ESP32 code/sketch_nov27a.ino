#include <SparkFun_SGP30_Arduino_Library.h>
#include <DHT.h>
#include <DHT_U.h>
#include <Wire.h>
#include <PubSubClient.h>
#include <WiFi.h>
#define RELAY_PIN 4
char ssid[] = "Galaxy A70CE26";
char pass[] = "paqi7077";
#define channelID 2677105
const char mqttUserName[] = "ERsQDhEwGTsKIhsDJignFDY"; 
const char clientID[] = "ERsQDhEwGTsKIhsDJignFDY";
const char mqttPass[] = "tV0R78Yuyc67Q5QDtB+SBbQj";

// Secure MQTT CA Certificate
const char* thingspeak_ca_cert = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIDxTCCAq2gAwIBAgIQAqxcJmoLQJuPC3nyrkYldzANBgkqhkiG9w0BAQUFADBs\n" \
"MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3\n" \
"d3cuZGlnaWNlcnQuY29tMSswKQYDVQQDEyJEaWdpQ2VydCBIaWdoIEFzc3VyYW5j\n" \
"ZSBFViBSb290IENBMB4XDTA2MTExMDAwMDAwMFoXDTMxMTExMDAwMDAwMFowbDEL\n" \
"MAkGA1UEBhMCVVMxFTATBgNVBAoTDERpZ2lDZXJ0IEluYzEZMBcGA1UECxMQd3d3\n" \
"LmRpZ2ljZXJ0LmNvbTErMCkGA1UEAxMiRGlnaUNlcnQgSGlnaCBBc3N1cmFuY2Ug\n" \
"RVYgUm9vdCBDQTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMbM5XPm\n" \
"+9S75S0tMqbf5YE/yc0lSbZxKsPVlDRnogocsF9ppkCxxLeyj9CYpKlBWTrT3JTW\n" \
"PNt0OKRKzE0lgvdKpVMSOO7zSW1xkX5jtqumX8OkhPhPYlG++MXs2ziS4wblCJEM\n" \
"xChBVfvLWokVfnHoNb9Ncgk9vjo4UFt3MRuNs8ckRZqnrG0AFFoEt7oT61EKmEFB\n" \
"Ik5lYYeBQVCmeVyJ3hlKV9Uu5l0cUyx+mM0aBhakaHPQNAQTXKFx01p8VdteZOE3\n" \
"hzBWBOURtCmAEvF5OYiiAhF8J2a3iLd48soKqDirCmTCv2ZdlYTBoSUeh10aUAsg\n" \
"EsxBu24LUTi4S8sCAwEAAaNjMGEwDgYDVR0PAQH/BAQDAgGGMA8GA1UdEwEB/wQF\n" \
"MAMBAf8wHQYDVR0OBBYEFLE+w2kD+L9HAdSYJhoIAu9jZCvDMB8GA1UdIwQYMBaA\n" \
"FLE+w2kD+L9HAdSYJhoIAu9jZCvDMA0GCSqGSIb3DQEBBQUAA4IBAQAcGgaX3Nec\n" \
"nzyIZgYIVyHbIUf4KmeqvxgydkAQV8GK83rZEWWONfqe/EW1ntlMMUu4kehDLI6z\n" \
"eM7b41N5cdblIZQB2lWHmiRk9opmzN6cN82oNLFpmyPInngiK3BD41VHMWEZ71jF\n" \
"hS9OMPagMRYjyOfiZRYzy78aG6A9+MpeizGLYAiJLQwGXFK3xPkKmNEVX58Svnw2\n" \
"Yzi9RKR/5CYrCsSXaQ3pjOLAEFe4yHYSkVXySGnYvCoCWw9E1CAx2/S6cCZdkGCe\n" \
"vEsXCS+0yx5DaMkHJ8HSXPfqIbloEpw8nL+e/IBcm2PN7EeqJSdnoDfzAIJ9VNep\n" \
"+OkuE6N36B9K\n" \
"-----END CERTIFICATE-----\n";

#ifdef USESECUREMQTT
  #include <WiFiClientSecure.h>
  #define mqttPort 8883
  WiFiClientSecure client; 
#else
  #define mqttPort 1883
  WiFiClient client;
#endif

const char* server = "mqtt3.thingspeak.com";
int status = WL_IDLE_STATUS; 
long lastPublishMillis = 0;
int connectionDelay = 5;
int updateInterval = 10000; // Set interval for sensor reads and publishing
PubSubClient mqttClient(client);

void mqttSubscriptionCallback(char* topic, byte* payload, unsigned int length) {
  // Print the details of the message that was received to the serial monitor.
  Serial.print("Message arrived [");
  Serial.print(topic);
  Serial.print("] ");
  for (int i = 0; i < length; i++) {
    Serial.print((char)payload[i]);
  }
  Serial.println();
}

void mqttSubscribe(long subChannelID){
  String myTopic = "channels/" + String(subChannelID) + "/subscribe";
  mqttClient.subscribe(myTopic.c_str());
}

// Publish messages to a ThingSpeak channel.
void mqttPublish(long pubChannelID, String message) {
   String topicString ="channels/" + String(pubChannelID) + "/publish";
   if (mqttClient.publish(topicString.c_str(), message.c_str())) {
       Serial.println("Published: " + message);
   } else {
       Serial.println("Publish failed.");
   }
}

void connectWifi() {
  Serial.print("Connecting to Wi-Fi...");
  WiFi.begin(ssid, pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("Connected to Wi-Fi.");
}

// Connect to MQTT server.
void mqttConnect() {
  while (!mqttClient.connected()) {
    // Connect to the MQTT broker.
    if (mqttClient.connect(clientID, mqttUserName, mqttPass)) {
      Serial.print("MQTT to ");
      Serial.print(server);
      Serial.print(" at port ");
      Serial.print(mqttPort);
      Serial.println(" successful.");
    } else {
      Serial.print("MQTT connection failed, rc = ");
      Serial.print(mqttClient.state());
      Serial.println(" Will try again in a few seconds");
      delay(connectionDelay * 1000);
    }
  }
}

// Global constants
#define DHTPIN 27
#define LIGHT_SENSOR_PIN 34
#define SOIL_MOISTURE_RESISTIVE 32
#define SOIL_MOISTURE_CAPACITIVE 33
#define DHTTYPE DHT22

// Define DHT and SGP30 sensors
DHT dht(DHTPIN, DHTTYPE);
SGP30 sgp30sensor;

int dryValue_resistive = 4095;
int dryValue_capacitive = 2500;
int wetValue_resistive = 1500;
int wetValue_capacitive = 400;

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
   digitalWrite(RELAY_PIN, HIGH);
  dht.begin();
  Wire.begin();
  mqttClient.setServer(server, mqttPort);
  mqttClient.setCallback(mqttSubscriptionCallback);
  mqttClient.setBufferSize(4096);
  
  #ifdef USESECUREMQTT
    client.setCACert(thingspeak_ca_cert);
  #endif

  while (sgp30sensor.begin() == false) {
      Serial.println("No SGP30 Detected. Check connections.");
      delay(1000);
  }
  sgp30sensor.initAirQuality();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWifi();
  }

  // Connect if MQTT client is not connected and resubscribe to channel updates.
  if (!mqttClient.connected()) {
    mqttConnect(); 
    mqttSubscribe(channelID);
  }

  mqttClient.loop();
  delay(1000);

  // Read data and store it to variables
  int hum = dht.readHumidity();
  int temp = dht.readTemperature();
  sgp30sensor.measureAirQuality();
  int co2 = sgp30sensor.CO2;
  int tvoc = sgp30sensor.TVOC;
  int analogValue = analogRead(LIGHT_SENSOR_PIN);
  int soil_moisture_resistive_value = analogRead(SOIL_MOISTURE_RESISTIVE);
  int moisture = 100 - (soil_moisture_resistive_value - wetValue_resistive) * 100 / (dryValue_resistive - wetValue_resistive);
  int soil_moisture_capacitive_value = analogRead(SOIL_MOISTURE_CAPACITIVE);
  int moisture2 = 100 - (soil_moisture_capacitive_value - wetValue_capacitive) * 100 / (dryValue_capacitive - wetValue_capacitive);

  // Print sensor values to Serial Monitor
  Serial.print("\nHumidity: "); Serial.print(hum);
  Serial.print(" %, Temp: "); Serial.print(temp); Serial.println(" Celsius");
  Serial.print("CO2: "); Serial.print(co2); Serial.print(" ppm\tTVOC: "); Serial.print(tvoc); Serial.println(" ppb");
  Serial.print("Analog Value = "); Serial.print(analogValue);
  Serial.print(" => ");
  
  // Light sensor testing
  if (analogValue < 40) Serial.println("Dark");
  else if (analogValue < 800) Serial.println("Dim");
  else if (analogValue < 2000) Serial.println("Light");
  else if (analogValue < 3200) Serial.println("Bright");
  else Serial.println("Very bright");

  // Moisture testing
  Serial.print("Moisture (Resistive sensor) = "); Serial.print(moisture); Serial.println("%");
  Serial.print("Moisture (Capacitive sensor) = "); Serial.print(moisture2); Serial.println("%");

  // Combine all the sensor values into one string
  String message = "field1=" + String(hum) + 
                   "&field2=" + String(temp) + 
                   "&field3=" + String(co2) + 
                   "&field4=" + String(tvoc) + 
                   "&field5=" + String(analogValue) + 
                   "&field6=" + String(moisture) + 
                   "&field7=" + String(moisture2);

  // Publish all sensor data in one message
  mqttPublish(channelID, message);
  delay(2000);
  if(moisture2<0){
    Serial.println("Capacitve soil moisure sensor failed.");
    if(moisture<=5){
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("Resistive soil moisure sensor failed.");
      Serial.println("Turning solenoid valve OFF...");
    }
    else if(moisture<=35){
      digitalWrite(RELAY_PIN, LOW);
      Serial.println("Turning solenoid valve ON...");
    }
    else{
      digitalWrite(RELAY_PIN, HIGH);
      Serial.println("Turning solenoid valve OFF...");
    }
  }
  else if(moisture2<=40){
    digitalWrite(RELAY_PIN, LOW);
    Serial.println("Turning solenoid valve ON...");
  }
  else{
    digitalWrite(RELAY_PIN, HIGH);
    Serial.println("Turning solenoid valve OFF...");
  }
  delay(5000); // Optional: short delay for loop iteration
}