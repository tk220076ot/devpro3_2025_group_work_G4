import sys
import RPi.GPIO as GPIO
import dht11_takemoto as dht11
import time
import datetime
import socket
import json
import serial.tools.list_ports

# ====== 設定 ======
GPIO.setwarnings(True)
GPIO.setmode(GPIO.BCM)
dht11_instance = dht11.DHT11(pin=26)

WAIT_INTERVAL = 10
WAIT_INTERVAL_RETRY = 10

SERVER = '10.192.138.204'
WAITING_PORT = 8765
DEFAULT_LOCATION = "lab-B"
METHOD = "arduino"  # "gpio" or "arduino"
SERIAL_PORT = "/dev/ttyUSB0"
BAUD_RATE = 9600

# ====== ポート確認 ======
def list_serial_ports():
    ports = serial.tools.list_ports.comports()
    print("=== 接続候補ポート一覧 ===")
    for port in ports:
        print(f"ポート: {port.device}, 説明: {port.description}")
    if not ports:
        print("ポートが見つかりませんでした。USBが接続されているか確認してください。")

# ====== Arduino検出 ======
def detect_arduino_port():
    ports = serial.tools.list_ports.comports()
    for port in ports:
        keywords = ["Arduino", "CH340", "USB Serial", "CP210", "CP2102"]
        if any(k in port.description for k in keywords):
            print(f"[INFO] Arduino detected on: {port.device} ({port.description})")
            return port.device
    raise Exception("Arduinoが見つかりませんでした。USB接続を確認してください。")

# ====== Arduinoからの読み取り ======
def read_from_arduino():
    import serial
    port = detect_arduino_port()
    with serial.Serial(port, BAUD_RATE, timeout=15) as ser:
        print(f"[INFO] 接続ポート: {port}, Arduinoからの送信待機中...")
        while True:
            line = ser.readline().decode('utf-8').strip()
            if "," in line:
                parts = line.split(",")
                if len(parts) == 2:
                    temp_str, hum_str = parts
                    return float(temp_str), float(hum_str)
                else:
                    print("[WARN] 分割数が不正、再待機...")
            else:
                print("[WARN] カンマなし、再待機...")

# ====== GPIOからの読み取り ======
def read_from_gpio():
    try:
        tempe, hum, check = dht11_instance.read()
        print('Last valid input: ' + str(datetime.datetime.now()))
        print('Temperature: %-3.1f C' % tempe)
        print('Humidity: %-3.1f %%' % hum)
        return float(tempe), float(hum)
    except dht11.DHT11CRCError as e:
        print("DHT11CRCError:", e)
        raise
    except dht11.DHT11MissingDataError as e:
        print("DHT11MissingDataError:", e)
        raise

# ====== Arduinoテストモード ======
def read_and_log(port, baudrate=9600, interval=10):
    import serial
    import datetime
    import time

    ser = serial.Serial(port, baudrate, timeout=2)
    prev_time = None

    try:
        while True:
            line = ser.readline().decode('utf-8').strip()
            if not line:
                continue

            now_str = datetime.datetime.now().strftime("%H:%M:%S")
            try:
                temp_str, hum_str = line.split(",")
                temp = float(temp_str)
                hum = float(hum_str)
            except Exception:
                print(f"[{now_str}] パース失敗: {line}")
                continue

            if prev_time is None:
                print(f"[{now_str}] temp={temp:.2f}, hum={hum:.2f} → 初回受信")
            else:
                interval_sec = time.time() - prev_time
                print(f"[{now_str}] temp={temp:.2f}, hum={hum:.2f} → 間隔: {interval_sec:.2f}秒")

            prev_time = time.time()
            time.sleep(interval)
    except KeyboardInterrupt:
        print("終了")
    finally:
        ser.close()

def test_arduino_read():
    port = detect_arduino_port()
    print(f"[TEST] Arduinoポート: {port}")
    read_and_log(port)


# ====== DHTデータ取得関数 ======
def get_dht_data():
    if METHOD == "arduino":
        return read_from_arduino()
    else:
        return read_from_gpio()

# ====== ソケット送信メイン関数 ======
def client_data(hostname_v1=SERVER, waiting_port_v1=WAITING_PORT, location_v=DEFAULT_LOCATION):
    node_s = hostname_v1
    port_s = waiting_port_v1
    prev_temp = None
    prev_hum = None

    while True:
        socket_r_s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        socket_r_s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        print("node_s:", node_s,  " port_s:", str(port_s))
        socket_r_s.connect((node_s, port_s))
        print('Connecting to the server. ' + 'node: ' + node_s + '  ' + 'port: ' + str(port_s))
        try:
            tempe, humid = get_dht_data()
            now = datetime.datetime.now()
            now_time_str = now.strftime("%H:%M:%S")
            now_date_str = now.strftime("%Y-%m-%d")

            flag_list = []
            if prev_temp is not None and abs(tempe - prev_temp) >= 5.0:
                flag_list.append("TEMP")
            if prev_hum is not None and abs(humid - prev_hum) >= 10.0:
                flag_list.append("HUM")
            flag_str = ",".join(flag_list)

            data_s_list = [{
                "Date": now_date_str,
                "Time": now_time_str,
                "Temperature": tempe,
                "Humidity": humid,
                "Location": location_v,
                "Method": METHOD
            }]
            
            print("Temperature: %f  Humidity: %f" % (tempe, humid), now_date_str, now_time_str, "Flag:", flag_str)
            data_s_json = json.dumps(data_s_list)
            data_s = data_s_json.encode('utf-8')
            socket_r_s.send(data_s)
            socket_r_s.close()

            prev_temp = tempe
            prev_hum = humid

        except Exception as e:
            print(f"Data acquisition error: {e}")
            time.sleep(WAIT_INTERVAL_RETRY)
        except KeyboardInterrupt:
            print("Ctrl-C is hit!")
            break

        next_time = time.time() + WAIT_INTERVAL
        while time.time() < next_time:
            time.sleep(0.1)

# ====== 実行ブロック ======
if __name__ == '__main__':
    print("Start if __name__ == '__main__'")
    sys_argc = len(sys.argv)
    count = 1
    hostname_v = SERVER
    waiting_port_v = WAITING_PORT
    location_v = DEFAULT_LOCATION
    run_test_arduino = False

    while count < sys_argc:
        option_key = sys.argv[count]
        if option_key == "-h":
            count += 1
            hostname_v = sys.argv[count]
        elif option_key == "-p":
            count += 1
            waiting_port_v = int(sys.argv[count])
        elif option_key in ("-l", "--location"):
            count += 1
            location_v = sys.argv[count]
        elif option_key == "--method":
            count += 1
            METHOD = sys.argv[count]
        elif option_key == "--list-ports":
            list_serial_ports()
            sys.exit(0)
        elif option_key == "--test-arduino":
            run_test_arduino = True
        count += 1

    print("host:", hostname_v)
    print("port:", waiting_port_v)
    print("location:", location_v)
    print("method:", METHOD)

    if run_test_arduino:
        test_arduino_read()
    else:
        client_data(hostname_v, waiting_port_v, location_v)
