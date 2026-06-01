from selenium import webdriver
from selenium.webdriver.chrome.options import Options
import time

print("Starting browser test...")
chrome_options = Options()
chrome_options.add_argument("--headless")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")

try:
    driver = webdriver.Chrome(options=chrome_options)
    driver.get("http://localhost:5000/")
    time.sleep(3)
    
    print("Console logs:")
    logs = driver.get_log('browser')
    if not logs:
        print("No browser console logs found.")
    for entry in logs:
        print(entry)
    driver.quit()
except Exception as e:
    print(f"Error occurred: {e}")
