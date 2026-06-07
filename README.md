# DrivePK Bolo App V2 - Urgent Server + Parser Fix

Upload these frontend files to the GitHub Pages repo root:

- index.html
- styles.css
- config.js
- app.js
- README.md

Also upload/replace this server file on Bluehost:

- transcribe.php -> /home4/helpninn/public_html/meilibeautyco/transcribe.php

Important: the old transcribe.php was returning Urdu script. This fixed version uses OpenAI audio translation and returns English/Roman-letter transcript, so columns can be parsed correctly.

Test sentence:

Make Toyota, Model Hiace, Year 1986, Price 32 lakh, City Rawalpindi, Color White, Registered in Islamabad, Mileage 300000.

Expected fields:

- Make: Toyota
- Model: Hiace
- Year: 1986
- Price: 3200000
- City: Rawalpindi
- Color: White
- Registered In: Islamabad
- Mileage: 300000
