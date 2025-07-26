#include "DHT.h"

#define DHTPIN 3          // Grove D3 → Arduino ピン 3 にDHT11
#define DHTTYPE DHT11

#define LEDPIN 4          // Grove D4 → Arduino ピン 4 にLED

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  pinMode(LEDPIN, OUTPUT);   // LEDピンを出力に設定
  Serial.begin(9600);
  dht.begin();
}

void loop() {
  digitalWrite(LEDPIN, HIGH);  // LED ON（読み取り開始の目印）

  float h = dht.readHumidity();
  float t = dht.readTemperature();

  if (!isnan(h) && !isnan(t)) {
    Serial.print(t);
    Serial.print(",");
    Serial.println(h);
  } else {
    Serial.println("nan,nan");  // 読み取り失敗時の出力
  }

  delay(200);                // LEDを0.2秒点灯
  digitalWrite(LEDPIN, LOW); // LED OFF

  delay(9800);               // 残り9.8秒待機 → 合計10秒周期
}
