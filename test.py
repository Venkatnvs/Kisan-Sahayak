import requests
import json
import base64

reqUrl = "http://127.0.0.1:8000/api/core/field-data/"

def get_img_base64(img_path):
    with open(img_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode("utf-8")

# Open the image file in binary mode
img_path = "D:/Reactjs/AgriBot/6bc046e7-107.jpg"
json_data = {
    "main_field": 2,
    "temperature": 20,
    "humidity": 20,
    "soil_moisture": 10,
    "description": "",
    "location": json.dumps({"lat": 0, "lng": 0}),
    'img': get_img_base64(img_path),
}

headers = {"Accept": "*/*", "User-Agent": "Thunder Client"}

# Send POST request with form-data (not JSON)
response = requests.post(reqUrl, data=json_data, headers=headers)

print(response.text)  # Print API response
