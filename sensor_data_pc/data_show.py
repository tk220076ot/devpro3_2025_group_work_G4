from flask import Flask, render_template, jsonify
import pandas as pd
import os

app = Flask(__name__)

# ====== CSVロード ======
def load_csv():
    path = os.path.join(os.path.dirname(__file__), "data.csv")
    return pd.read_csv(path, names=["date", "time", "temp", "humid", "location"])

# ====== HTML表示 ======
@app.route("/")
def index():
    df = load_csv()
    stats = {
        "temp_max": df["temp"].max(),
        "temp_median": df["temp"].median(),
        "temp_mean": round(df["temp"].mean(), 2),
        "temp_mode": df["temp"].mode().iloc[0],
        "humid_max": df["humid"].max(),
        "humid_median": df["humid"].median(),
        "humid_mean": round(df["humid"].mean(), 2),
        "humid_mode": df["humid"].mode().iloc[0],
    }
    locations = sorted(df["location"].dropna().unique())
    return render_template("file_show.html", stats=stats, locations=locations)

# ====== JSONデータAPI ======
@app.route("/data.json")
def get_json_data():
    return jsonify(load_csv().to_dict(orient="records"))

# ====== 実行 ======
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
