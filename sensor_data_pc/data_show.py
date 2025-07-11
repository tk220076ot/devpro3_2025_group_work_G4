from flask import Flask, render_template, jsonify
import csv
import os
import pandas as pd

app = Flask(__name__)

@app.route("/")
def index():
    df = pd.read_csv("sensor_data_pc/data.csv")
    df.columns = ["date", "time", "temp", "humid", "region"]
    stats = {
        "temp_max": df["temp"].max(),
        "temp_median": df["temp"].median(),
        "temp_mode": df["temp"].mode().iloc[0],
        "humid_max": df["humid"].max(),
        "humid_median": df["humid"].median(),
        "humid_mode": df["humid"].mode().iloc[0],
    }
    regions = sorted(df["region"].dropna().unique())
    return render_template("file_show.html", stats=stats, regions=regions)

@app.route("/data.json")
def data():
    df = pd.read_csv("sensor_data_pc/data.csv")
    df.columns = ["date", "time", "temp", "humid", "region"]
    return jsonify(df.to_dict(orient="records"))

@app.route("/", methods=["GET"])
def index1():
    return render_template("file_show.html")

@app.route("/data.json", methods=["GET"])
def get_json_data():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    file_path = os.path.join(base_dir, "data.csv")
    data_list = []
    try:
        with open(file_path, encoding='utf-8', newline="") as f:
            csv_data = csv.reader(f)
            for row in csv_data:
                data_list.append({
                    "date": row[0],
                    "time": row[1],
                    "temp": row[2],
                    "humid":row[3],
                    "region":row[4]
                })
    except FileNotFoundError:
        return jsonify({"error": f"File '{file_path}' not found."}), 404
    return jsonify(data_list)

if __name__ == "__main__":
    app.run(host = '0.0.0.0', port=5000, debug=True)