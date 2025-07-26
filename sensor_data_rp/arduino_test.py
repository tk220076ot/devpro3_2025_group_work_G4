import serial
import time
from datetime import datetime

def detect_arduino_port():
    import serial.tools.list_ports
    ports = serial.tools.list_ports.comports()
    for port in ports:
        if any(k in port.description for k in ["Arduino", "CH340", "USB Serial", "CP210"]):
            return port.device
    raise Exception("Arduinoポートが見つかりませんでした。")

def read_and_log():
    port = detect_arduino_port()
    baudrate = 9600
    last_time = None

    with serial.Serial(port, baudrate, timeout=20) as ser:
        print(f"[INFO] Arduino ({port}) 接続中... 10秒ごとの送信タイミングを確認します。\n")
        while True:
            line = ser.readline().decode('utf-8').strip()
            now = datetime.now()
            if line:
                if "," in line:
                    try:
                        temp, hum = map(float, line.split(","))
                        if last_time:
                            interval = (now - last_time).total_seconds()
                            print(f"[{now.strftime('%H:%M:%S')}] temp={temp:.1f}, hum={hum:.1f} → 間隔: {interval:.2f}秒")
                        else:
                            print(f"[{now.strftime('%H:%M:%S')}] temp={temp:.1f}, hum={hum:.1f} → 初回受信")
                        last_time = now
                    except ValueError:
                        print(f"[{now.strftime('%H:%M:%S')}] データ変換エラー: '{line}'")
                else:
                    print(f"[{now.strftime('%H:%M:%S')}] カンマ無し: '{line}'")

if __name__ == "__main__":
    try:
        read_and_log()
    except KeyboardInterrupt:
        print("終了します。")
