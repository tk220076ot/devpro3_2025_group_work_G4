import serial

port = "/dev/ttyUSB0"  # Arduinoが接続されているポート
baudrate = 9600

ser = serial.Serial(port, baudrate, timeout=2)

try:
    while True:
        line = ser.readline().decode('utf-8').strip()
        if line:
            print("受信:", line)
except KeyboardInterrupt:
    print("終了")
finally:
    ser.close()
